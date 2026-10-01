import { AiLogRow } from './types';
import { findTagMarkers, pairTagBlocks } from './tagging';

export interface FileText {
  file: string;
  text: string;
}

/**
 * Cross-checks AI-START/AI-END markers found across workspace files against ai-log.csv rows.
 * Pure function (no vscode dependency) so it can be unit tested directly.
 */
export function validateTags(files: FileText[], csvRows: AiLogRow[]): string[] {
  const problems: string[] = [];
  const codeTags = new Set<string>();

  for (const { file, text } of files) {
    const { unpairedStarts, unpairedEnds, duplicates, blocks } = pairTagBlocks(
      findTagMarkers(text)
    );
    for (const m of unpairedStarts) {
      problems.push(`${file}:${m.line + 1}: ${m.tag} has a START but no matching END.`);
    }
    for (const m of unpairedEnds) {
      problems.push(`${file}:${m.line + 1}: ${m.tag} has an END but no matching START.`);
    }
    for (const m of duplicates) {
      problems.push(`${file}:${m.line + 1}: ${m.tag} appears more than once (duplicate ${m.kind}).`);
    }
    for (const b of blocks) {
      codeTags.add(b.tag);
    }
  }

  const csvTags = new Set(csvRows.map((r) => r.tag));

  for (const tag of codeTags) {
    if (!csvTags.has(tag)) {
      problems.push(`${tag} is tagged in code but has no row in ai-log.csv.`);
    }
  }
  for (const tag of csvTags) {
    if (!codeTags.has(tag)) {
      problems.push(`${tag} has a row in ai-log.csv but was not found in code.`);
    }
  }

  return problems;
}
