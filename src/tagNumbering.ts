import { AiLogRow } from './types';

const TAG_PATTERN = /^AI-(\d+)$/;

function highestTagNumber(tags: Iterable<string>): number {
  let max = 1000;
  for (const tag of tags) {
    const m = TAG_PATTERN.exec(tag.trim());
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) {
        max = n;
      }
    }
  }
  return max;
}

/** Computes the next tag number from ai-log.csv rows. Starts at 1001 when there are none. */
export function getNextTagNumber(rows: AiLogRow[], extraTags: Iterable<string> = []): number {
  const fromRows = highestTagNumber(rows.map((r) => r.tag));
  const fromExtra = highestTagNumber(extraTags);
  return Math.max(fromRows, fromExtra) + 1;
}
