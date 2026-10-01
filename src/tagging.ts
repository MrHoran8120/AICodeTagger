const START_PATTERN = /AI-START\s+(AI-\d+)/;
const END_PATTERN = /AI-END\s+(AI-\d+)/;

export interface TagMarker {
  tag: string;
  line: number;
  kind: 'start' | 'end';
}

export interface TaggedBlock {
  tag: string;
  startLine: number;
  endLine: number;
}

/** Scans document text line by line for AI-START/AI-END markers. Pure, no vscode dependency. */
export function findTagMarkers(text: string): TagMarker[] {
  const markers: TagMarker[] = [];
  const lines = text.split(/\r\n|\r|\n/);
  for (let i = 0; i < lines.length; i++) {
    const startMatch = START_PATTERN.exec(lines[i]);
    if (startMatch) {
      markers.push({ tag: startMatch[1], line: i, kind: 'start' });
      continue;
    }
    const endMatch = END_PATTERN.exec(lines[i]);
    if (endMatch) {
      markers.push({ tag: endMatch[1], line: i, kind: 'end' });
    }
  }
  return markers;
}

/**
 * Pairs start/end markers into blocks by tag. Tags with a start but no end (or vice versa),
 * or more than one of either, are returned separately as problems rather than silently dropped.
 */
export function pairTagBlocks(markers: TagMarker[]): {
  blocks: TaggedBlock[];
  unpairedStarts: TagMarker[];
  unpairedEnds: TagMarker[];
  duplicates: TagMarker[];
} {
  const starts = new Map<string, TagMarker[]>();
  const ends = new Map<string, TagMarker[]>();
  for (const m of markers) {
    const map = m.kind === 'start' ? starts : ends;
    const list = map.get(m.tag) ?? [];
    list.push(m);
    map.set(m.tag, list);
  }

  const blocks: TaggedBlock[] = [];
  const unpairedStarts: TagMarker[] = [];
  const unpairedEnds: TagMarker[] = [];
  const duplicates: TagMarker[] = [];

  const allTags = new Set([...starts.keys(), ...ends.keys()]);
  for (const tag of allTags) {
    const s = starts.get(tag) ?? [];
    const e = ends.get(tag) ?? [];
    if (s.length > 1) {
      duplicates.push(...s.slice(1));
    }
    if (e.length > 1) {
      duplicates.push(...e.slice(1));
    }
    if (s.length === 0) {
      unpairedEnds.push(...e);
    } else if (e.length === 0) {
      unpairedStarts.push(...s);
    } else {
      blocks.push({ tag, startLine: s[0].line, endLine: e[0].line });
    }
  }

  return { blocks, unpairedStarts, unpairedEnds, duplicates };
}

/** Finds the tagged block (if any) in text that contains the given 0-based line. */
export function findBlockAtLine(text: string, line: number): TaggedBlock | undefined {
  const { blocks } = pairTagBlocks(findTagMarkers(text));
  return blocks.find((b) => line >= b.startLine && line <= b.endLine);
}

/** Finds existing tagged blocks (from paired markers) that overlap the given 0-based line range, inclusive. */
export function findOverlappingBlocks(
  text: string,
  rangeStartLine: number,
  rangeEndLine: number
): TaggedBlock[] {
  const { blocks } = pairTagBlocks(findTagMarkers(text));
  return blocks.filter((b) => rangeStartLine <= b.endLine && rangeEndLine >= b.startLine);
}
