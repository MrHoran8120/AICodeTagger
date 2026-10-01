import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvField, parseCsv, parseLog, serializeLog, appendRowText, updateRowText, removeRowText } from '../csv';
import { AiLogRow } from '../types';

test('csvField leaves plain values untouched', () => {
  assert.equal(csvField('hello'), 'hello');
});

test('csvField quotes commas', () => {
  assert.equal(csvField('a,b'), '"a,b"');
});

test('csvField doubles embedded quotes', () => {
  assert.equal(csvField('say "hi"'), '"say ""hi"""');
});

test('csvField quotes embedded newlines', () => {
  assert.equal(csvField('line1\nline2'), '"line1\nline2"');
});

test('parseCsv round-trips a simple row', () => {
  const rows = parseCsv('a,b,c\n1,2,3\n');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('parseCsv handles quoted fields with commas and embedded quotes', () => {
  const rows = parseCsv('tag,prompt\nAI-1001,"make a ""carousel"", please"\n');
  assert.deepEqual(rows, [
    ['tag', 'prompt'],
    ['AI-1001', 'make a "carousel", please'],
  ]);
});

test('parseCsv handles quoted fields spanning multiple lines', () => {
  const rows = parseCsv('tag,prompt\nAI-1001,"line one\nline two"\n');
  assert.deepEqual(rows, [
    ['tag', 'prompt'],
    ['AI-1001', 'line one\nline two'],
  ]);
});

test('parseLog returns [] for empty content', () => {
  assert.deepEqual(parseLog(''), []);
  assert.deepEqual(parseLog('   '), []);
});

function sampleRow(overrides: Partial<AiLogRow> = {}): AiLogRow {
  return {
    tag: 'AI-1001',
    student_name: 'Sam Lee',
    engine: 'Claude',
    prompt: 'Make an image carousel',
    description: 'Image carousel for the gallery page',
    file: 'src/gallery.js',
    timestamp: '2026-10-05T10:42:11',
    ...overrides,
  };
}

test('serializeLog + parseLog round-trip, including quoting-sensitive fields', () => {
  const rows = [
    sampleRow(),
    sampleRow({ tag: 'AI-1002', prompt: 'Has a comma, a "quote", and\na newline' }),
  ];
  const text = serializeLog(rows);
  const parsed = parseLog(text);
  assert.deepEqual(parsed, rows);
});

test('appendRowText adds a header when the file is empty', () => {
  const text = appendRowText('', sampleRow());
  const parsed = parseLog(text);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].tag, 'AI-1001');
  assert.ok(text.startsWith('tag,student_name,engine,prompt,description,file,timestamp'));
});

test('appendRowText appends without duplicating the header', () => {
  const first = appendRowText('', sampleRow());
  const second = appendRowText(first, sampleRow({ tag: 'AI-1002' }));
  const parsed = parseLog(second);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[1].tag, 'AI-1002');
});

test('updateRowText replaces only the matching row', () => {
  const text = appendRowText(appendRowText('', sampleRow()), sampleRow({ tag: 'AI-1002' }));
  const updated = updateRowText(text, 'AI-1001', sampleRow({ description: 'Updated description' }));
  const parsed = parseLog(updated);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].description, 'Updated description');
  assert.equal(parsed[1].tag, 'AI-1002');
});

test('updateRowText throws for an unknown tag', () => {
  const text = appendRowText('', sampleRow());
  assert.throws(() => updateRowText(text, 'AI-9999', sampleRow()));
});

test('removeRowText removes only the matching row', () => {
  const text = appendRowText(appendRowText('', sampleRow()), sampleRow({ tag: 'AI-1002' }));
  const updated = removeRowText(text, 'AI-1001');
  const parsed = parseLog(updated);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].tag, 'AI-1002');
});
