import { AiLogRow, AI_LOG_COLUMNS } from './types';

const NEWLINE = '\r\n';

/** Quotes a CSV field per RFC 4180: quote on comma/quote/newline, double embedded quotes. */
export function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function csvRow(values: (string | number)[]): string {
  return values.map((v) => csvField(String(v))).join(',');
}

/** Parses a full CSV document into rows of raw string fields, handling quoted commas/newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  let sawAnyField = false;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      sawAnyField = true;
      i++;
    } else if (c === ',') {
      row.push(field);
      field = '';
      sawAnyField = true;
      i++;
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') {
        i++;
      }
      i++;
      row.push(field);
      field = '';
      if (sawAnyField || row.length > 1) {
        rows.push(row);
      }
      row = [];
      sawAnyField = false;
    } else {
      field += c;
      sawAnyField = true;
      i++;
    }
  }

  if (sawAnyField || field.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function rowsToLog(rows: string[][]): AiLogRow[] {
  if (rows.length === 0) {
    return [];
  }
  const header = rows[0];
  const indexOf = (col: string) => header.indexOf(col);
  const result: AiLogRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length === 1 && cells[0] === '') {
      continue;
    }
    const get = (col: string) => {
      const idx = indexOf(col);
      return idx >= 0 && idx < cells.length ? cells[idx] : '';
    };
    result.push({
      tag: get('tag'),
      student_name: get('student_name'),
      engine: get('engine'),
      prompt: get('prompt'),
      description: get('description'),
      file: get('file'),
      timestamp: get('timestamp'),
    });
  }
  return result;
}

/** Parses the raw text content of ai-log.csv into typed rows. Returns [] for empty/missing content. */
export function parseLog(text: string): AiLogRow[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  return rowsToLog(parseCsv(text));
}

export function serializeLog(rows: AiLogRow[]): string {
  const lines = [csvRow(AI_LOG_COLUMNS)];
  for (const row of rows) {
    lines.push(csvRow(AI_LOG_COLUMNS.map((col) => row[col])));
  }
  return lines.join(NEWLINE) + NEWLINE;
}

export function appendRowText(existingText: string, row: AiLogRow): string {
  const rows = parseLog(existingText);
  rows.push(row);
  return serializeLog(rows);
}

export function updateRowText(existingText: string, tag: string, updated: AiLogRow): string {
  const rows = parseLog(existingText);
  const idx = rows.findIndex((r) => r.tag === tag);
  if (idx === -1) {
    throw new Error(`No ai-log.csv row found for ${tag}`);
  }
  rows[idx] = updated;
  return serializeLog(rows);
}

export function removeRowText(existingText: string, tag: string): string {
  const rows = parseLog(existingText).filter((r) => r.tag !== tag);
  return serializeLog(rows);
}
