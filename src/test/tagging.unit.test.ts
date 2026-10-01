import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTagMarkers, pairTagBlocks, findOverlappingBlocks, findBlockAtLine } from '../tagging';

const SAMPLE = [
  '# AI-START AI-1001',
  'def rotate_slide(index, direction):',
  '    pass',
  '# AI-END AI-1001',
  '',
  'x = 1',
].join('\n');

test('findTagMarkers finds start and end markers with line numbers', () => {
  const markers = findTagMarkers(SAMPLE);
  assert.deepEqual(markers, [
    { tag: 'AI-1001', line: 0, kind: 'start' },
    { tag: 'AI-1001', line: 3, kind: 'end' },
  ]);
});

test('pairTagBlocks pairs a matched start/end', () => {
  const { blocks, unpairedStarts, unpairedEnds, duplicates } = pairTagBlocks(findTagMarkers(SAMPLE));
  assert.deepEqual(blocks, [{ tag: 'AI-1001', startLine: 0, endLine: 3 }]);
  assert.deepEqual(unpairedStarts, []);
  assert.deepEqual(unpairedEnds, []);
  assert.deepEqual(duplicates, []);
});

test('pairTagBlocks reports a start with no end', () => {
  const text = '# AI-START AI-1001\ncode';
  const { blocks, unpairedStarts } = pairTagBlocks(findTagMarkers(text));
  assert.deepEqual(blocks, []);
  assert.equal(unpairedStarts.length, 1);
  assert.equal(unpairedStarts[0].tag, 'AI-1001');
});

test('pairTagBlocks reports an end with no start', () => {
  const text = 'code\n# AI-END AI-1001';
  const { blocks, unpairedEnds } = pairTagBlocks(findTagMarkers(text));
  assert.deepEqual(blocks, []);
  assert.equal(unpairedEnds.length, 1);
});

test('pairTagBlocks reports duplicate markers', () => {
  const text = [
    '# AI-START AI-1001',
    '# AI-START AI-1001',
    '# AI-END AI-1001',
  ].join('\n');
  const { duplicates, blocks } = pairTagBlocks(findTagMarkers(text));
  assert.equal(duplicates.length, 1);
  assert.equal(blocks.length, 1);
});

test('findOverlappingBlocks detects a selection overlapping an existing block', () => {
  const overlap = findOverlappingBlocks(SAMPLE, 1, 2);
  assert.equal(overlap.length, 1);
  assert.equal(overlap[0].tag, 'AI-1001');
});

test('findOverlappingBlocks returns [] for a selection outside any block', () => {
  assert.deepEqual(findOverlappingBlocks(SAMPLE, 4, 5), []);
});

test('findBlockAtLine finds the enclosing block for a cursor line', () => {
  const block = findBlockAtLine(SAMPLE, 2);
  assert.ok(block);
  assert.equal(block!.tag, 'AI-1001');
  assert.equal(findBlockAtLine(SAMPLE, 5), undefined);
});
