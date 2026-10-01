import * as vscode from 'vscode';
import { AiLogRow } from './types';
import { parseLog, appendRowText, updateRowText, removeRowText } from './csv';

const LOG_FILE_NAME = 'ai-log.csv';
const decoder = new TextDecoder('utf-8');
const encoder = new TextEncoder();

export function getLogUri(folder: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(folder.uri, LOG_FILE_NAME);
}

async function readText(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return decoder.decode(bytes);
  } catch {
    return undefined;
  }
}

/** If ai-log.csv is open with unsaved changes, saves it first so our read/write sees consistent content. */
async function saveIfDirty(uri: vscode.Uri): Promise<void> {
  const open = vscode.workspace.textDocuments.find(
    (d) => d.uri.toString() === uri.toString() && d.isDirty
  );
  if (open) {
    await open.save();
  }
}

export async function readLogRows(folder: vscode.WorkspaceFolder): Promise<AiLogRow[]> {
  const uri = getLogUri(folder);
  const text = await readText(uri);
  return text ? parseLog(text) : [];
}

export async function appendLogRow(folder: vscode.WorkspaceFolder, row: AiLogRow): Promise<void> {
  const uri = getLogUri(folder);
  await saveIfDirty(uri);
  const existing = (await readText(uri)) ?? '';
  const updated = appendRowText(existing, row);
  await vscode.workspace.fs.writeFile(uri, encoder.encode(updated));
}

export async function updateLogRow(
  folder: vscode.WorkspaceFolder,
  tag: string,
  updated: AiLogRow
): Promise<void> {
  const uri = getLogUri(folder);
  await saveIfDirty(uri);
  const existing = (await readText(uri)) ?? '';
  const text = updateRowText(existing, tag, updated);
  await vscode.workspace.fs.writeFile(uri, encoder.encode(text));
}

export async function removeLogRow(folder: vscode.WorkspaceFolder, tag: string): Promise<void> {
  const uri = getLogUri(folder);
  await saveIfDirty(uri);
  const existing = (await readText(uri)) ?? '';
  const text = removeRowText(existing, tag);
  await vscode.workspace.fs.writeFile(uri, encoder.encode(text));
}
