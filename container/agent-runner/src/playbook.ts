/**
 * Playbook prompt builder for scheduled tasks.
 * Extracted as a standalone module for testability without Claude SDK imports.
 */
import fs from 'fs';
import path from 'path';

function log(message: string): void {
    console.error(`[agent-runner] ${message}`);
}

/**
 * Build an enriched prompt for scheduled tasks.
 * If the group has a playbook.md, inject it along with any previous state.
 * Falls back to a simple prefix if no playbook exists.
 */
export function buildPlaybookPrompt(taskPrompt: string, groupDir = '/workspace/group'): string {
    const playbookPath = path.join(groupDir, 'playbook.md');
    const statePath = path.join(groupDir, 'state', 'playbook-state.json');

    // No playbook — fall back to the original simple prefix
    if (!fs.existsSync(playbookPath)) {
        return `[SCHEDULED TASK - The following message was sent automatically and is not coming directly from the user or group.]\n\n${taskPrompt}`;
    }

    const playbook = fs.readFileSync(playbookPath, 'utf-8');
    log(`Loaded playbook (${playbook.length} chars) from ${playbookPath}`);

    let previousState = 'No previous state — this is the first run.';
    if (fs.existsSync(statePath)) {
        try {
            previousState = fs.readFileSync(statePath, 'utf-8');
            log(`Loaded previous state (${previousState.length} chars) from ${statePath}`);
        } catch (err) {
            log(`Failed to read playbook state: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    return [
        '[SCHEDULED TASK — autonomous playbook execution]',
        '',
        '## Your Playbook',
        playbook,
        '',
        '## Previous State',
        previousState,
        '',
        '## Current Task',
        taskPrompt,
        '',
        '## Instructions',
        'Follow your playbook phases in order for the current task.',
        'After completing all phases:',
        `1. Write updated state to ${path.join(groupDir, 'state', 'playbook-state.json')} (create the state/ directory if needed)`,
        '2. Send your report/output to the chat',
    ].join('\n');
}
