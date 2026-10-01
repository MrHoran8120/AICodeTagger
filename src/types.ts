export interface AiLogRow {
  tag: string;
  student_name: string;
  engine: string;
  prompt: string;
  description: string;
  file: string;
  timestamp: string;
}

export interface TagFormResult {
  studentName: string;
  engine: string;
  prompt: string;
  description: string;
}

export type CommentStyle =
  | { kind: 'line'; prefix: string }
  | { kind: 'block'; start: string; end: string };

export const AI_LOG_COLUMNS: (keyof AiLogRow)[] = [
  'tag',
  'student_name',
  'engine',
  'prompt',
  'description',
  'file',
  'timestamp',
];
