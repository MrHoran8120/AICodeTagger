import { defineConfig } from '@vscode/test-cli';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Use an isolated temp workspace so integration tests never touch this
// project's own files (which also double as a manual-testing scratch area).
const workspaceFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tagger-test-'));

export default defineConfig({
  files: 'out/test/integration/**/*.test.js',
  workspaceFolder,
  mocha: {
    ui: 'bdd',
    timeout: 20000,
    color: true,
  },
});
