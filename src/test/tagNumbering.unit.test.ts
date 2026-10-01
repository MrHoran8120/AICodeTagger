import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextTagNumber } from '../tagNumbering';
import { AiLogRow } from '../types';

function row(tag: string): AiLogRow {
  return {
    tag,
    student_name: '',
    engine: '',
    prompt: '',
    description: '',
    file: '',
    timestamp: '',
  };
}

test('starts at 1001 when there are no rows', () => {
  assert.equal(getNextTagNumber([]), 1001);
});

test('increments from the highest existing tag', () => {
  assert.equal(getNextTagNumber([row('AI-1001'), row('AI-1005')]), 1006);
});

test('is robust to out-of-order rows', () => {
  assert.equal(getNextTagNumber([row('AI-1009'), row('AI-1001'), row('AI-1004')]), 1010);
});

test('ignores malformed tags', () => {
  assert.equal(getNextTagNumber([row('not-a-tag'), row('AI-abc'), row('AI-1002')]), 1003);
});

test('cross-checks against extra tags found live in code', () => {
  assert.equal(getNextTagNumber([row('AI-1001')], ['AI-1007']), 1008);
});
