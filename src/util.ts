import * as path from 'path';
import * as vscode from 'vscode';

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '');
}

export function getWorkspaceFolder(document: vscode.TextDocument): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.getWorkspaceFolder(document.uri);
}

/** Path of a file relative to its workspace folder root, normalized to forward slashes. */
export function relativeToWorkspace(folder: vscode.WorkspaceFolder, fileUri: vscode.Uri): string {
  return path.relative(folder.uri.fsPath, fileUri.fsPath).split(path.sep).join('/');
}

export function leadingWhitespace(lineText: string): string {
  const m = /^[ \t]*/.exec(lineText);
  return m ? m[0] : '';
}
