import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const BASELINE_FILENAME = '.nanoclaw-agent-runner-baseline.json';
const BASELINE_VERSION = 1;

interface AgentRunnerBaseline {
  version: number;
  files: Record<string, string>;
}

export interface AgentRunnerSyncStats {
  copied: number;
  updated: number;
  preserved: number;
  managed: number;
}

function hashFile(filePath: string): string {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function listFilesRecursive(rootDir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string, relativeDir: string): void {
    if (!fs.existsSync(currentDir)) return;

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const relativePath = relativeDir
        ? `${relativeDir}/${entry.name}`
        : entry.name;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, relativePath);
        continue;
      }

      if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  walk(rootDir, '');
  return files.sort();
}

function loadBaseline(destinationDir: string): AgentRunnerBaseline | null {
  const baselinePath = path.join(destinationDir, BASELINE_FILENAME);
  if (!fs.existsSync(baselinePath)) return null;

  try {
    const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf-8')) as AgentRunnerBaseline;
    if (
      parsed &&
      parsed.version === BASELINE_VERSION &&
      parsed.files &&
      typeof parsed.files === 'object'
    ) {
      return parsed;
    }
  } catch {
    // Treat malformed baseline as missing and rebuild it.
  }

  return null;
}

function writeBaseline(destinationDir: string, files: Record<string, string>): void {
  const baselinePath = path.join(destinationDir, BASELINE_FILENAME);
  const baseline: AgentRunnerBaseline = {
    version: BASELINE_VERSION,
    files,
  };
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
}

function resolveFilePath(rootDir: string, relativePath: string): string {
  return path.join(rootDir, ...relativePath.split('/'));
}

export function syncAgentRunnerSource(
  sourceDir: string,
  destinationDir: string,
): AgentRunnerSyncStats {
  const stats: AgentRunnerSyncStats = {
    copied: 0,
    updated: 0,
    preserved: 0,
    managed: 0,
  };

  if (!fs.existsSync(sourceDir)) return stats;

  fs.mkdirSync(destinationDir, { recursive: true });

  const baseline = loadBaseline(destinationDir);
  const nextManagedFiles: Record<string, string> = {};
  const sourceFiles = listFilesRecursive(sourceDir);

  for (const relativePath of sourceFiles) {
    const sourcePath = resolveFilePath(sourceDir, relativePath);
    const destinationPath = resolveFilePath(destinationDir, relativePath);
    const sourceHash = hashFile(sourcePath);
    const previousManagedHash = baseline?.files?.[relativePath];

    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
      stats.copied += 1;
      stats.managed += 1;
      nextManagedFiles[relativePath] = sourceHash;
      continue;
    }

    const destinationHash = hashFile(destinationPath);

    if (previousManagedHash) {
      // File was managed previously.
      if (destinationHash === previousManagedHash && sourceHash !== previousManagedHash) {
        // Local file unchanged since last sync and upstream changed -> update.
        fs.copyFileSync(sourcePath, destinationPath);
        stats.updated += 1;
        stats.managed += 1;
        nextManagedFiles[relativePath] = sourceHash;
        continue;
      }

      if (destinationHash === previousManagedHash || destinationHash === sourceHash) {
        // Either unchanged or manually updated to match source.
        stats.managed += 1;
        nextManagedFiles[relativePath] = sourceHash;
        continue;
      }

      // Managed file diverged locally -> preserve customization.
      stats.preserved += 1;
      continue;
    }

    // Initial migration (no baseline for this file):
    // only adopt files that already match source.
    if (destinationHash === sourceHash) {
      stats.managed += 1;
      nextManagedFiles[relativePath] = sourceHash;
      continue;
    }

    stats.preserved += 1;
  }

  writeBaseline(destinationDir, nextManagedFiles);
  return stats;
}
