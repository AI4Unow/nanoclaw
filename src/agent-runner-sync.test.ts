import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { syncAgentRunnerSource } from './agent-runner-sync.js';

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('syncAgentRunnerSource', () => {
  it('updates managed files when source changes', () => {
    const root = createTempDir('nanoclaw-sync-');
    const sourceDir = path.join(root, 'src');
    const destinationDir = path.join(root, 'dst');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'index.ts'), 'export const v = 1;\n');

    const firstSync = syncAgentRunnerSource(sourceDir, destinationDir);
    expect(firstSync.copied).toBe(1);
    expect(firstSync.updated).toBe(0);

    fs.writeFileSync(path.join(sourceDir, 'index.ts'), 'export const v = 2;\n');

    const secondSync = syncAgentRunnerSource(sourceDir, destinationDir);
    expect(secondSync.copied).toBe(0);
    expect(secondSync.updated).toBe(1);
    expect(fs.readFileSync(path.join(destinationDir, 'index.ts'), 'utf-8')).toBe(
      'export const v = 2;\n',
    );
  });

  it('preserves customized destination files', () => {
    const root = createTempDir('nanoclaw-sync-');
    const sourceDir = path.join(root, 'src');
    const destinationDir = path.join(root, 'dst');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'index.ts'), 'export const v = 1;\n');

    syncAgentRunnerSource(sourceDir, destinationDir);
    fs.writeFileSync(path.join(destinationDir, 'index.ts'), 'export const v = 999;\n');
    fs.writeFileSync(path.join(sourceDir, 'index.ts'), 'export const v = 2;\n');

    const sync = syncAgentRunnerSource(sourceDir, destinationDir);
    expect(sync.updated).toBe(0);
    expect(sync.preserved).toBe(1);
    expect(fs.readFileSync(path.join(destinationDir, 'index.ts'), 'utf-8')).toBe(
      'export const v = 999;\n',
    );
  });
});
