import * as vscode from 'vscode';
import { TagFormResult } from './types';

const ENGINES = ['ChatGPT', 'Claude', 'Copilot', 'Gemini', 'Other'];

function orderedEngineChoices(defaultEngine: string): string[] {
  if (ENGINES.includes(defaultEngine)) {
    return [defaultEngine, ...ENGINES.filter((e) => e !== defaultEngine)];
  }
  return ENGINES;
}

/**
 * Shows the 4-field tagging form (name, engine, prompt, description).
 * Returns undefined if the student cancels at any step.
 */
export async function promptForTagForm(
  defaults: { studentName: string; engine: string; prompt?: string; description?: string }
): Promise<TagFormResult | undefined> {
  const studentName = await vscode.window.showInputBox({
    title: 'Tag AI Code (1/4)',
    prompt: 'Student name',
    value: defaults.studentName,
    ignoreFocusOut: true,
    validateInput: (v) => (v.trim() ? undefined : 'Required'),
  });
  if (studentName === undefined) {
    return undefined;
  }

  const enginePick = await vscode.window.showQuickPick(orderedEngineChoices(defaults.engine), {
    title: 'Tag AI Code (2/4)',
    placeHolder: 'AI engine',
    ignoreFocusOut: true,
  });
  if (enginePick === undefined) {
    return undefined;
  }

  let engine = enginePick;
  if (enginePick === 'Other') {
    const customEngine = await vscode.window.showInputBox({
      title: 'Tag AI Code (2/4) — Other engine',
      prompt: 'Enter the AI engine name',
      ignoreFocusOut: true,
      validateInput: (v) => (v.trim() ? undefined : 'Required'),
    });
    if (customEngine === undefined) {
      return undefined;
    }
    engine = customEngine;
  }

  const prompt = await vscode.window.showInputBox({
    title: 'Tag AI Code (3/4)',
    prompt: 'Prompt used to generate this code',
    value: defaults.prompt ?? '',
    ignoreFocusOut: true,
    validateInput: (v) => (v.trim() ? undefined : 'Required'),
  });
  if (prompt === undefined) {
    return undefined;
  }

  const description = await vscode.window.showInputBox({
    title: 'Tag AI Code (4/4)',
    prompt: 'What does this code do?',
    value: defaults.description ?? '',
    ignoreFocusOut: true,
    validateInput: (v) => (v.trim() ? undefined : 'Required'),
  });
  if (description === undefined) {
    return undefined;
  }

  return { studentName, engine, prompt, description };
}
