import * as vscode from 'vscode';
import { tagAiCode, editAiTag, removeAiTag, validateAiTags, outputChannel } from './commands';
import { createAiTagDecorationType, updateAiTagDecorations } from './decorations';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    outputChannel,
    vscode.commands.registerCommand('aiTagger.tag', tagAiCode),
    vscode.commands.registerCommand('aiTagger.edit', editAiTag),
    vscode.commands.registerCommand('aiTagger.remove', removeAiTag),
    vscode.commands.registerCommand('aiTagger.validate', validateAiTags)
  );

  const decorationType = createAiTagDecorationType();
  context.subscriptions.push(decorationType);

  let debounce: ReturnType<typeof setTimeout> | undefined;
  const scheduleUpdate = (editor: vscode.TextEditor | undefined) => {
    if (!editor) {
      return;
    }
    if (debounce) {
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => updateAiTagDecorations(editor, decorationType), 150);
  };

  if (vscode.window.activeTextEditor) {
    updateAiTagDecorations(vscode.window.activeTextEditor, decorationType);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateAiTagDecorations(editor, decorationType);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        scheduleUpdate(editor);
      }
    })
  );
}

export function deactivate(): void {}
