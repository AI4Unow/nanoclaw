import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { buildPlaybookPrompt } from './playbook.js';

describe('buildPlaybookPrompt', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync('/tmp/playbook-test-');
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('falls back to simple prefix when no playbook.md exists', () => {
        const result = buildPlaybookPrompt('run daily check', tmpDir);
        expect(result).toContain('[SCHEDULED TASK - The following message was sent automatically');
        expect(result).toContain('run daily check');
        expect(result).not.toContain('Your Playbook');
    });

    it('injects playbook content when playbook.md exists', () => {
        fs.writeFileSync(path.join(tmpDir, 'playbook.md'), '# My Playbook\n\n## Phase 1\nDo stuff');
        const result = buildPlaybookPrompt('run mission', tmpDir);
        expect(result).toContain('[SCHEDULED TASK — autonomous playbook execution]');
        expect(result).toContain('## Your Playbook');
        expect(result).toContain('# My Playbook');
        expect(result).toContain('## Phase 1');
        expect(result).toContain('## Current Task');
        expect(result).toContain('run mission');
    });

    it('includes "no previous state" when state file does not exist', () => {
        fs.writeFileSync(path.join(tmpDir, 'playbook.md'), '# Playbook');
        const result = buildPlaybookPrompt('check things', tmpDir);
        expect(result).toContain('No previous state — this is the first run.');
    });

    it('includes previous state when playbook-state.json exists', () => {
        fs.writeFileSync(path.join(tmpDir, 'playbook.md'), '# Playbook');
        fs.mkdirSync(path.join(tmpDir, 'state'), { recursive: true });
        const state = JSON.stringify({ lastRun: '2026-02-28T01:00:00Z', runCount: 5 });
        fs.writeFileSync(path.join(tmpDir, 'state', 'playbook-state.json'), state);

        const result = buildPlaybookPrompt('run again', tmpDir);
        expect(result).toContain('2026-02-28T01:00:00Z');
        expect(result).toContain('"runCount":5');
        expect(result).not.toContain('No previous state');
    });

    it('includes instructions to write updated state', () => {
        fs.writeFileSync(path.join(tmpDir, 'playbook.md'), '# Playbook');
        const result = buildPlaybookPrompt('do work', tmpDir);
        expect(result).toContain('Write updated state to');
        expect(result).toContain('playbook-state.json');
        expect(result).toContain('Send your report/output to the chat');
    });
});
