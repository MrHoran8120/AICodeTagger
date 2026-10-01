import { CommentStyle } from './types';

const LINE_LANGUAGES: Record<string, string> = {
  javascript: '//',
  javascriptreact: '//',
  typescript: '//',
  typescriptreact: '//',
  java: '//',
  c: '//',
  cpp: '//',
  csharp: '//',
  php: '//',
  go: '//',
  swift: '//',
  kotlin: '//',
  rust: '//',
  python: '#',
  ruby: '#',
  shellscript: '#',
  sql: '--',
};

const BLOCK_LANGUAGES: Record<string, { start: string; end: string }> = {
  html: { start: '<!--', end: '-->' },
  xml: { start: '<!--', end: '-->' },
  css: { start: '/*', end: '*/' },
};

/**
 * Looks up the comment wrapper for a VS Code languageId, per the spec's table.
 * Returns undefined for unsupported file types (JSON, plain text, Markdown, etc.)
 */
export function getCommentStyle(languageId: string): CommentStyle | undefined {
  const linePrefix = LINE_LANGUAGES[languageId];
  if (linePrefix) {
    return { kind: 'line', prefix: linePrefix };
  }
  const block = BLOCK_LANGUAGES[languageId];
  if (block) {
    return { kind: 'block', start: block.start, end: block.end };
  }
  return undefined;
}

export function formatStartComment(style: CommentStyle, tag: string): string {
  return style.kind === 'line'
    ? `${style.prefix} AI-START ${tag}`
    : `${style.start} AI-START ${tag} ${style.end}`;
}

export function formatEndComment(style: CommentStyle, tag: string): string {
  return style.kind === 'line'
    ? `${style.prefix} AI-END ${tag}`
    : `${style.start} AI-END ${tag} ${style.end}`;
}
