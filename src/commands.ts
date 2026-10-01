import * as vscode from 'vscode';
import { AiLogRow } from './types';
import { getCommentStyle, formatStartComment, formatEndComment } from './commentStyles';
import { findOverlappingBlocks, findBlockAtLine, findTagMarkers, pairTagBlocks, TaggedBlock } from './tagging';
import { getNextTagNumber } from './tagNumbering';
import { promptForTagForm } from './form';
import { validateTags, FileText } from './validate';
import { getWorkspaceFolder, relativeToWorkspace, leadingWhitespace, nowIso } from './util';
import { readLogRows, appendLogRow, updateLogRow, removeLogRow } from './csvFile';

export const outputChannel = vscode.window.createOutputChannel('AI Tagger');

const EXCLUDE_GLOB = '**/{node_modules,.git,out,dist,.vscode-test}/**';

function errorMessage(message: string): void {
  vscode.window.showErrorMessage(`AI Tagger: ${message}`);
}

async function pickWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    errorMessage('Open a folder to use this command.');
    return undefined;
  }
  if (folders.length === 1) {
    return folders[0];
  }
  const activeFolder = vscode.window.activeTextEditor
    ? getWorkspaceFolder(vscode.window.activeTextEditor.document)
    : undefined;
  if (activeFolder) {
    return activeFolder;
  }
  const pick = await vscode.window.showQuickPick(
    folders.map((f) => ({ label: f.name, folder: f })),
    { placeHolder: 'Which project?' }
  );
  return pick?.folder;
}

export async function tagAiCode(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    errorMessage('No active editor.');
    return;
  }
  const selection = editor.selection;
  if (selection.isEmpty) {
    errorMessage('Select the AI-generated code first.');
    return;
  }

  const style = getCommentStyle(editor.document.languageId);
  if (!style) {
    errorMessage(`"${editor.document.languageId}" files are not supported for tagging.`);
    return;
  }

  const folder = getWorkspaceFolder(editor.document);
  if (!folder) {
    errorMessage('Save the file inside an open workspace folder before tagging.');
    return;
  }

  const docText = editor.document.getText();
  const overlapping = findOverlappingBlocks(docText, selection.start.line, selection.end.line);
  if (overlapping.length > 0) {
    errorMessage(`Selection overlaps an existing AI tag (${overlapping[0].tag}).`);
    return;
  }

  const config = vscode.workspace.getConfiguration('aiTagger');
  const rows = await readLogRows(folder);
  const codeTagNumbers = findTagMarkers(docText).map((m) => m.tag);
  const nextNumber = getNextTagNumber(rows, codeTagNumbers);
  const tag = `AI-${nextNumber}`;

  const form = await promptForTagForm({
    studentName: config.get<string>('studentName', ''),
    engine: config.get<string>('defaultEngine', ''),
  });
  if (!form) {
    return;
  }

  const indent = leadingWhitespace(editor.document.lineAt(selection.start.line).text);
  const startComment = formatStartComment(style, tag);
  const endComment = formatEndComment(style, tag);
  const endLine = selection.end.line;
  const isLastLine = endLine === editor.document.lineCount - 1;

  await editor.edit((editBuilder) => {
    editBuilder.insert(new vscode.Position(selection.start.line, 0), `${indent}${startComment}\n`);
    if (isLastLine) {
      const lineLength = editor.document.lineAt(endLine).text.length;
      editBuilder.insert(new vscode.Position(endLine, lineLength), `\n${indent}${endComment}`);
    } else {
      editBuilder.insert(new vscode.Position(endLine + 1, 0), `${indent}${endComment}\n`);
    }
  });
  await editor.document.save();

  const row: AiLogRow = {
    tag,
    student_name: form.studentName,
    engine: form.engine,
    prompt: form.prompt,
    description: form.description,
    file: relativeToWorkspace(folder, editor.document.uri),
    timestamp: nowIso(),
  };

  await appendLogRow(folder, row);
  vscode.window.showInformationMessage(`Tagged as ${tag}`);
}

interface ResolvedTag {
  tag: string;
  row: AiLogRow;
  folder: vscode.WorkspaceFolder;
  editor?: vscode.TextEditor;
  block?: TaggedBlock;
}

async function resolveTagForEditOrRemove(): Promise<ResolvedTag | undefined> {
  const editor = vscode.window.activeTextEditor;
  const folder = editor ? getWorkspaceFolder(editor.document) : await pickWorkspaceFolder();
  if (!folder) {
    errorMessage('Open a folder to use this command.');
    return undefined;
  }

  if (editor) {
    const block = findBlockAtLine(editor.document.getText(), editor.selection.active.line);
    if (block) {
      const rows = await readLogRows(folder);
      const row = rows.find((r) => r.tag === block.tag);
      if (!row) {
        errorMessage(`No ai-log.csv row found for ${block.tag}. Try Validate AI Tags.`);
        return undefined;
      }
      return { tag: block.tag, row, folder, editor, block };
    }
  }

  const rows = await readLogRows(folder);
  if (rows.length === 0) {
    errorMessage('No tags found in ai-log.csv.');
    return undefined;
  }
  const pick = await vscode.window.showQuickPick(
    rows.map((r) => ({
      label: r.tag,
      description: `${r.file} — ${r.description}`,
      row: r,
    })),
    { placeHolder: 'Which AI tag?' }
  );
  if (!pick) {
    return undefined;
  }
  return { tag: pick.row.tag, row: pick.row, folder };
}

export async function editAiTag(): Promise<void> {
  const resolved = await resolveTagForEditOrRemove();
  if (!resolved) {
    return;
  }
  const { tag, row, folder } = resolved;

  const form = await promptForTagForm({
    studentName: row.student_name,
    engine: row.engine,
    prompt: row.prompt,
    description: row.description,
  });
  if (!form) {
    return;
  }

  const file = resolved.editor
    ? relativeToWorkspace(folder, resolved.editor.document.uri)
    : row.file;

  const updated: AiLogRow = {
    tag,
    student_name: form.studentName,
    engine: form.engine,
    prompt: form.prompt,
    description: form.description,
    file,
    timestamp: row.timestamp,
  };

  await updateLogRow(folder, tag, updated);
  vscode.window.showInformationMessage(`Updated ${tag}`);
}

/** Full range of a line including its trailing line break, so deleting it leaves no blank line behind. */
function fullLineRangeWithBreak(doc: vscode.TextDocument, lineIndex: number): vscode.Range {
  if (lineIndex + 1 < doc.lineCount) {
    return new vscode.Range(lineIndex, 0, lineIndex + 1, 0);
  }
  if (lineIndex > 0) {
    return new vscode.Range(
      lineIndex - 1,
      doc.lineAt(lineIndex - 1).text.length,
      lineIndex,
      doc.lineAt(lineIndex).text.length
    );
  }
  return doc.lineAt(lineIndex).range;
}

async function findAndOpenBlock(
  folder: vscode.WorkspaceFolder,
  row: AiLogRow
): Promise<{ editor: vscode.TextEditor; block: TaggedBlock } | undefined> {
  const fileUri = vscode.Uri.joinPath(folder.uri, row.file);
  let document: vscode.TextDocument;
  try {
    document = await vscode.workspace.openTextDocument(fileUri);
  } catch {
    errorMessage(`Could not open ${row.file}. Try Validate AI Tags.`);
    return undefined;
  }
  const { blocks } = pairTagBlocks(findTagMarkers(document.getText()));
  const block = blocks.find((b) => b.tag === row.tag);
  if (!block) {
    errorMessage(`Could not find ${row.tag} in ${row.file}. Try Validate AI Tags.`);
    return undefined;
  }
  const editor = await vscode.window.showTextDocument(document);
  return { editor, block };
}

export async function removeAiTag(): Promise<void> {
  const resolved = await resolveTagForEditOrRemove();
  if (!resolved) {
    return;
  }
  const { tag, row, folder } = resolved;

  const confirm = await vscode.window.showWarningMessage(
    `Remove ${tag} and its ai-log.csv entry?`,
    { modal: true },
    'Remove'
  );
  if (confirm !== 'Remove') {
    return;
  }

  let editor = resolved.editor;
  let block = resolved.block;
  if (!editor || !block) {
    const found = await findAndOpenBlock(folder, row);
    if (!found) {
      return;
    }
    editor = found.editor;
    block = found.block;
  }

  await editor.edit((editBuilder) => {
    const doc = editor!.document;
    editBuilder.delete(fullLineRangeWithBreak(doc, block!.endLine));
    editBuilder.delete(fullLineRangeWithBreak(doc, block!.startLine));
  });
  await editor.document.save();

  await removeLogRow(folder, tag);
  vscode.window.showInformationMessage(`Removed ${tag}`);
}

async function collectWorkspaceFiles(folder: vscode.WorkspaceFolder): Promise<FileText[]> {
  const uris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, '**/*'),
    EXCLUDE_GLOB
  );
  const files: FileText[] = [];
  const decoder = new TextDecoder('utf-8');
  for (const uri of uris) {
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const text = decoder.decode(bytes);
      if (text.includes('AI-START') || text.includes('AI-END')) {
        files.push({ file: relativeToWorkspace(folder, uri), text });
      }
    } catch {
      // Skip unreadable/binary files.
    }
  }
  return files;
}

export async function validateAiTags(): Promise<void> {
  const folder = await pickWorkspaceFolder();
  if (!folder) {
    return;
  }

  const files = await collectWorkspaceFiles(folder);
  const rows = await readLogRows(folder);
  const problems = validateTags(files, rows);

  outputChannel.clear();
  if (problems.length === 0) {
    outputChannel.appendLine('All AI tags are valid.');
    vscode.window.showInformationMessage('AI Tagger: all AI tags are valid.');
    return;
  }

  outputChannel.appendLine(`AI Tagger found ${problems.length} issue(s):`);
  for (const p of problems) {
    outputChannel.appendLine(`  - ${p}`);
  }
  outputChannel.show(true);
  vscode.window.showWarningMessage(
    `AI Tagger found ${problems.length} issue(s). See the "AI Tagger" output channel.`
  );
}
