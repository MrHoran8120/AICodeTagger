import * as vscode from 'vscode';
import { findTagMarkers, pairTagBlocks } from './tagging';

export function createAiTagDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    light: {
      backgroundColor: 'rgba(255, 196, 0, 0.15)',
    },
    dark: {
      backgroundColor: 'rgba(255, 196, 0, 0.10)',
    },
  });
}

export function updateAiTagDecorations(
  editor: vscode.TextEditor,
  decorationType: vscode.TextEditorDecorationType
): void {
  const { blocks } = pairTagBlocks(findTagMarkers(editor.document.getText()));
  const ranges = blocks.map((b) => new vscode.Range(b.startLine, 0, b.endLine, 0));
  editor.setDecorations(decorationType, ranges);
}
