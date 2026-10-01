import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTags } from '../validate';
import { AiLogRow } from '../types';

function row(tag: string, file = 'src/a.py'): AiLogRow {
  return {
    tag,
    student_name: 'Sam',
    engine: 'Claude',
    prompt: 'p',
    description: 'd',
    file,
    timestamp: '2026-10-05T10:42:11',
  };
}

const CLEAN_FILE = {
  file: 'src/a.py',
  text: '# AI-START AI-1001\ncode\n# AI-END AI-1001\n',
};

test('reports no problems when code and CSV agree', () => {
  const problems = validateTags([CLEAN_FILE], [row('AI-1001')]);
  assert.deepEqual(problems, []);
});

test('reports a start with no matching end', () => {
  const file = { file: 'src/a.py', text: '# AI-START AI-1001\ncode\n' };
  const problems = validateTags([file], []);
  assert.ok(problems.some((p) => p.includes('START but no matching END')));
});

test('reports an end with no matching start', () => {
  const file = { file: 'src/a.py', text: 'code\n# AI-END AI-1001\n' };
  const problems = validateTags([file], []);
  assert.ok(problems.some((p) => p.includes('END but no matching START')));
});

test('reports a tag in code missing from ai-log.csv', () => {
  const problems = validateTags([CLEAN_FILE], []);
  assert.ok(problems.some((p) => p.includes('AI-1001 is tagged in code but has no row')));
});

test('reports a CSV row with no matching tag in code', () => {
  const problems = validateTags([], [row('AI-1001')]);
  assert.ok(problems.some((p) => p.includes('AI-1001 has a row in ai-log.csv but was not found in code')));
});

test('handles an empty workspace and empty CSV with no problems', () => {
  assert.deepEqual(validateTags([], []), []);
});
