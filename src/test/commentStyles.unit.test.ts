import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCommentStyle, formatStartComment, formatEndComment } from '../commentStyles';

const LINE_LANGUAGES = [
  'javascript', 'typescript', 'java', 'c', 'cpp', 'csharp', 'php', 'go',
  'swift', 'kotlin', 'rust', 'python', 'ruby', 'shellscript', 'sql',
];

for (const lang of LINE_LANGUAGES) {
  test(`${lang} maps to a line comment style`, () => {
    const style = getCommentStyle(lang);
    assert.ok(style);
    assert.equal(style!.kind, 'line');
  });
}

test('python uses # and sql uses --', () => {
  assert.deepEqual(getCommentStyle('python'), { kind: 'line', prefix: '#' });
  assert.deepEqual(getCommentStyle('sql'), { kind: 'line', prefix: '--' });
});

test('html/xml use block comments', () => {
  assert.deepEqual(getCommentStyle('html'), { kind: 'block', start: '<!--', end: '-->' });
  assert.deepEqual(getCommentStyle('xml'), { kind: 'block', start: '<!--', end: '-->' });
});

test('css uses block comments', () => {
  assert.deepEqual(getCommentStyle('css'), { kind: 'block', start: '/*', end: '*/' });
});

test('unsupported languages return undefined', () => {
  assert.equal(getCommentStyle('json'), undefined);
  assert.equal(getCommentStyle('plaintext'), undefined);
  assert.equal(getCommentStyle('markdown'), undefined);
});

test('formatStartComment/formatEndComment for line style', () => {
  const style = getCommentStyle('python')!;
  assert.equal(formatStartComment(style, 'AI-1001'), '# AI-START AI-1001');
  assert.equal(formatEndComment(style, 'AI-1001'), '# AI-END AI-1001');
});

test('formatStartComment/formatEndComment for block style', () => {
  const style = getCommentStyle('html')!;
  assert.equal(formatStartComment(style, 'AI-1001'), '<!-- AI-START AI-1001 -->');
  assert.equal(formatEndComment(style, 'AI-1001'), '<!-- AI-END AI-1001 -->');
});
