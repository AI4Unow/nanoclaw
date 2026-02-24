/**
 * Pre-compiles the agent-runner overlay source on the host so containers
 * skip the ~40s tsc cold-start. Compilation is cached by source hash and
 * only re-runs when source files change.
 */
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { CONTAINER_IMAGE } from './config.js';
import { CONTAINER_RUNTIME_BIN } from './container-runtime.js';
import { logger } from './logger.js';

const COMPILE_HASH_FILE = '.compile-hash';

function hashSourceDir(srcDir: string): string {
  const hash = createHash('sha256');
  const files = fs.readdirSync(srcDir)
    .filter((f) => f.endsWith('.ts') && !f.startsWith('.'))
    .sort();
  for (const file of files) {
    hash.update(file);
    hash.update(fs.readFileSync(path.join(srcDir, file)));
  }
  return hash.digest('hex');
}

/**
 * Ensures the overlay source is compiled to distDir.
 * On cache hit: no-op (dist already up to date).
 * On cache miss: runs tsc inside the container image (has the right node_modules).
 * Falls back gracefully — container will compile on startup if this fails.
 */
export function ensureOverlayCompiled(srcDir: string, distDir: string): void {
  if (!fs.existsSync(srcDir)) return;

  const currentHash = hashSourceDir(srcDir);
  // Store hash file next to distDir (not inside it) so the host process can write it
  // even when distDir is owned by the container's root user.
  const hashFile = `${distDir}.hash`;
  const indexJs = path.join(distDir, 'index.js');

  if (fs.existsSync(hashFile) && fs.existsSync(indexJs)) {
    const cachedHash = fs.readFileSync(hashFile, 'utf-8').trim();
    if (cachedHash === currentHash) return; // cache hit
  }

  // Cache miss — compile inside the container image (has the right node_modules).
  // Run as root so it can write to the host-mounted dist dir regardless of ownership.
  fs.mkdirSync(distDir, { recursive: true });
  logger.info({ srcDir }, 'Pre-compiling agent-runner overlay (one-time per source change)');

  try {
    execSync(
      `${CONTAINER_RUNTIME_BIN} run --rm --user root --entrypoint sh` +
      ` -e COMPILE_HASH=${currentHash}` +
      ` -v "${path.resolve(srcDir)}:/app/src:ro"` +
      ` -v "${path.resolve(distDir)}:/tmp/dist"` +
      ` ${CONTAINER_IMAGE}` +
      ` -c "cd /app && npx tsc --outDir /tmp/dist 2>&1"`,
      { stdio: 'pipe' },
    );
    fs.writeFileSync(hashFile, currentHash);
    logger.info({ distDir }, 'Agent-runner overlay compiled and cached');
  } catch (err) {
    logger.warn({ err }, 'Pre-compile failed — container will compile on startup (slower cold start)');
  }
}
