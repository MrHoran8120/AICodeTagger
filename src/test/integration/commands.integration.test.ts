import * as assert from 'assert';
import * as vscode from 'vscode';

/** Replaces a vscode.window method with one that returns queued values in order, restorable via the returned function. */
function stubSequence(method: 'showInputBox' | 'showQuickPick', values: unknown[]): () => void {
  const original = (vscode.window as any)[method];
  let i = 0;
  (vscode.window as any)[method] = async (..._args: unknown[]) => {
    if (i >= values.length) {
      throw new Error(`${method} called more times (${i + 1}) than stubbed values (${values.length})`);
    }
    return values[i++];
  };
  return () => {
    (vscode.window as any)[method] = original;
  };
}

function stubMessage(
  method: 'showErrorMessage' | 'showInformationMessage' | 'showWarningMessage',
  returnValue: unknown = undefined
): { restore: () => void; messages: string[] } {
  const original = (vscode.window as any)[method];
  const messages: string[] = [];
  (vscode.window as any)[method] = async (msg: string, ..._rest: unknown[]) => {
    messages.push(msg);
    return returnValue;
  };
  return {
    messages,
    restore: () => {
      (vscode.window as any)[method] = original;
    },
  };
}

function folder(): vscode.WorkspaceFolder {
  const f = vscode.workspace.workspaceFolders?.[0];
  if (!f) {
    throw new Error('No workspace folder open for integration tests.');
  }
  return f;
}

async function writeFile(relativePath: string, content: string): Promise<vscode.Uri> {
  const uri = vscode.Uri.joinPath(folder().uri, relativePath);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
  return uri;
}

async function readFile(relativePath: string): Promise<string | undefined> {
  try {
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder().uri, relativePath));
    return Buffer.from(bytes).toString('utf-8');
  } catch {
    return undefined;
  }
}

async function openAndSelect(
  relativePath: string,
  content: string,
  startLine: number,
  endLine: number
): Promise<vscode.TextEditor> {
  const uri = await writeFile(relativePath, content);
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc);
  const endChar = doc.lineAt(endLine).text.length;
  editor.selection = new vscode.Selection(startLine, 0, endLine, endChar);
  return editor;
}

async function cleanWorkspace(): Promise<void> {
  const entries = await vscode.workspace.fs.readDirectory(folder().uri);
  for (const [name] of entries) {
    await vscode.workspace.fs.delete(vscode.Uri.joinPath(folder().uri, name), {
      recursive: true,
      useTrash: false,
    });
  }
}

describe('AI Code Tagger — integration', () => {
  beforeEach(async () => {
    await cleanWorkspace();
  });

  it('tags a selection, wraps it in comments, logs a CSV row, and undoes in one step', async () => {
    const original = 'def add(a, b):\n    return a + b\n';
    const editor = await openAndSelect('sample_tag.py', original, 0, 1);

    const restoreInput = stubSequence('showInputBox', ['Sam Lee', 'Add two numbers', 'Adds a and b']);
    const restoreQuickPick = stubSequence('showQuickPick', ['Claude']);
    const info = stubMessage('showInformationMessage');
    try {
      await vscode.commands.executeCommand('aiTagger.tag');
    } finally {
      restoreInput();
      restoreQuickPick();
      info.restore();
    }

    const taggedText = editor.document.getText();
    assert.match(taggedText, /# AI-START AI-1001\n/);
    assert.match(taggedText, /# AI-END AI-1001/);
    assert.ok(info.messages.some((m) => m.includes('AI-1001')));

    const csv = await readFile('ai-log.csv');
    assert.ok(csv, 'ai-log.csv should have been created');
    assert.match(csv!, /^tag,student_name,engine,prompt,description,file,timestamp/);
    assert.match(
      csv!,
      /AI-1001,Sam Lee,Claude,Add two numbers,Adds a and b,sample_tag\.py,\d{4}-\d{2}-\d{2}T/
    );

    await vscode.commands.executeCommand('undo');
    assert.strictEqual(editor.document.getText(), original);
  });

  it('lets the student type a custom engine via "Other"', async () => {
    const editor = await openAndSelect('sample_other.py', 'x = 1\n', 0, 0);

    const restoreInput = stubSequence('showInputBox', ['Alex', 'GPT-5 Pro', 'Set x to 1', 'Assigns x']);
    const restoreQuickPick = stubSequence('showQuickPick', ['Other']);
    try {
      await vscode.commands.executeCommand('aiTagger.tag');
    } finally {
      restoreInput();
      restoreQuickPick();
    }

    const csv = await readFile('ai-log.csv');
    assert.match(csv!, /AI-\d+,Alex,GPT-5 Pro,/);
    assert.match(editor.document.getText(), /# AI-START AI-\d+/);
  });

  it('increments tag numbers across successive tags', async () => {
    await openAndSelect('sample_seq_a.py', 'a = 1\n', 0, 0);
    const restoreInput1 = stubSequence('showInputBox', ['Sam', 'p', 'd']);
    const restoreQuickPick1 = stubSequence('showQuickPick', ['Claude']);
    await vscode.commands.executeCommand('aiTagger.tag');
    restoreInput1();
    restoreQuickPick1();

    await openAndSelect('sample_seq_b.py', 'b = 2\n', 0, 0);
    const restoreInput2 = stubSequence('showInputBox', ['Sam', 'p', 'd']);
    const restoreQuickPick2 = stubSequence('showQuickPick', ['Claude']);
    await vscode.commands.executeCommand('aiTagger.tag');
    restoreInput2();
    restoreQuickPick2();

    const csv = await readFile('ai-log.csv');
    const tags = [...csv!.matchAll(/AI-\d+/g)].map((m) => m[0]);
    const uniqueSorted = [...new Set(tags)].sort();
    assert.equal(uniqueSorted.length, 2);
    const numbers = uniqueSorted.map((t) => parseInt(t.split('-')[1], 10));
    assert.equal(numbers[1], numbers[0] + 1);
  });

  it('refuses to tag when nothing is selected', async () => {
    const uri = await writeFile('sample_empty_sel.py', 'x = 1\n');
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    const err = stubMessage('showErrorMessage');
    try {
      await vscode.commands.executeCommand('aiTagger.tag');
    } finally {
      err.restore();
    }

    assert.ok(err.messages.some((m) => /select/i.test(m)));
    assert.ok(!doc.getText().includes('AI-START'));
    assert.strictEqual(await readFile('ai-log.csv'), undefined);
  });

  it('refuses to tag an unsupported file type without showing the form', async () => {
    const uri = await writeFile('sample.json', '{\n  "a": 1\n}\n');
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 7);

    let formOpened = false;
    const originalInputBox = vscode.window.showInputBox;
    (vscode.window as any).showInputBox = async () => {
      formOpened = true;
      return undefined;
    };
    const restoreInput = () => {
      (vscode.window as any).showInputBox = originalInputBox;
    };
    const err = stubMessage('showErrorMessage');
    try {
      await vscode.commands.executeCommand('aiTagger.tag');
    } finally {
      restoreInput();
      err.restore();
    }

    assert.strictEqual(formOpened, false, 'the form should not open for an unsupported file type');
    assert.ok(err.messages.some((m) => /not supported/i.test(m)));
  });

  it('refuses to tag a selection that overlaps an existing tag', async () => {
    const content = 'a = 1\nb = 2\nc = 3\nd = 4\n';
    const editor = await openAndSelect('sample_overlap.py', content, 0, 1);

    const restoreInput1 = stubSequence('showInputBox', ['Sam', 'p', 'd']);
    const restoreQuickPick1 = stubSequence('showQuickPick', ['Claude']);
    await vscode.commands.executeCommand('aiTagger.tag');
    restoreInput1();
    restoreQuickPick1();

    // The file now has 2 extra comment lines; re-select across the tagged block.
    editor.selection = new vscode.Selection(0, 0, 2, 5);

    const err = stubMessage('showErrorMessage');
    const restoreInput2 = stubSequence('showInputBox', []);
    try {
      await vscode.commands.executeCommand('aiTagger.tag');
    } finally {
      restoreInput2();
      err.restore();
    }

    assert.ok(err.messages.some((m) => /overlaps/i.test(m)));
  });

  it('Edit AI Tag updates the CSV row without touching the code', async () => {
    const editor = await openAndSelect('sample_edit.py', 'x = 1\n', 0, 0);
    const restoreInput1 = stubSequence('showInputBox', ['Sam', 'original prompt', 'original description']);
    const restoreQuickPick1 = stubSequence('showQuickPick', ['Claude']);
    await vscode.commands.executeCommand('aiTagger.tag');
    restoreInput1();
    restoreQuickPick1();

    const codeBeforeEdit = editor.document.getText();

    editor.selection = new vscode.Selection(1, 0, 1, 0); // inside the tagged block
    const restoreInput2 = stubSequence('showInputBox', ['Sam', 'updated prompt', 'updated description']);
    const restoreQuickPick2 = stubSequence('showQuickPick', ['Claude']);
    const info = stubMessage('showInformationMessage');
    try {
      await vscode.commands.executeCommand('aiTagger.edit');
    } finally {
      restoreInput2();
      restoreQuickPick2();
      info.restore();
    }

    assert.strictEqual(editor.document.getText(), codeBeforeEdit, 'Edit should not change the code');
    const csv = await readFile('ai-log.csv');
    assert.match(csv!, /updated prompt,updated description/);
    assert.ok(!csv!.includes('original prompt'));
  });

  it('Remove AI Tag deletes both comments and the CSV row', async () => {
    const editor = await openAndSelect('sample_remove.py', 'x = 1\n', 0, 0);
    const restoreInput1 = stubSequence('showInputBox', ['Sam', 'p', 'd']);
    const restoreQuickPick1 = stubSequence('showQuickPick', ['Claude']);
    await vscode.commands.executeCommand('aiTagger.tag');
    restoreInput1();
    restoreQuickPick1();

    const taggedTag = /AI-\d+/.exec(editor.document.getText())![0];
    editor.selection = new vscode.Selection(1, 0, 1, 0);

    const warn = stubMessage('showWarningMessage', 'Remove');
    const info = stubMessage('showInformationMessage');
    try {
      await vscode.commands.executeCommand('aiTagger.remove');
    } finally {
      warn.restore();
      info.restore();
    }

    assert.strictEqual(editor.document.getText(), 'x = 1\n');
    const csv = await readFile('ai-log.csv');
    assert.ok(!csv!.includes(taggedTag));
  });

  it('Validate AI Tags reports clean, then reports a broken marker', async () => {
    await openAndSelect('sample_validate.py', 'x = 1\n', 0, 0);
    const restoreInput1 = stubSequence('showInputBox', ['Sam', 'p', 'd']);
    const restoreQuickPick1 = stubSequence('showQuickPick', ['Claude']);
    await vscode.commands.executeCommand('aiTagger.tag');
    restoreInput1();
    restoreQuickPick1();

    const info = stubMessage('showInformationMessage');
    try {
      await vscode.commands.executeCommand('aiTagger.validate');
    } finally {
      info.restore();
    }
    assert.ok(info.messages.some((m) => /all ai tags are valid/i.test(m)));

    // Break it: remove the CSV row but leave the code markers in place.
    const csvUri = vscode.Uri.joinPath(folder().uri, 'ai-log.csv');
    const header = 'tag,student_name,engine,prompt,description,file,timestamp\r\n';
    await vscode.workspace.fs.writeFile(csvUri, Buffer.from(header, 'utf-8'));

    const warn = stubMessage('showWarningMessage');
    try {
      await vscode.commands.executeCommand('aiTagger.validate');
    } finally {
      warn.restore();
    }
    assert.ok(warn.messages.some((m) => /issue/i.test(m)));
  });
});
