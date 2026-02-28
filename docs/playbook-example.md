# Playbook Format

A `playbook.md` file defines autonomous missions for an agent group. Place it at `groups/{name}/playbook.md`. When a scheduled task runs, the playbook and previous state are automatically injected into the agent's prompt.

## Structure

```markdown
# Playbook

## Mission: {Name}

### Phase 1: {Verb}
- Step-by-step instructions for data gathering, research, etc.

### Phase 2: {Verb}
- Analysis, comparison, transformation steps

### Phase 3: {Verb}
- Output format, where to save results, who to notify

## State Schema
Describe what the agent should persist between runs:
- lastRun: ISO timestamp of most recent execution
- runCount: number of completed runs
- {mission-specific fields}
```

## How It Works

1. Agent creates a scheduled task (cron, interval, or one-time)
2. When the task triggers, the agent-runner reads `playbook.md` from the group folder
3. If `state/playbook-state.json` exists, it's included as "Previous State"
4. The agent follows the playbook phases and writes updated state after completion

## Example: Daily News Briefing

```markdown
# Playbook

## Mission: Daily Briefing
Schedule: weekdays at 8am (create via scheduled task)

### Phase 1: Gather
- Search web for latest AI and tech news
- Check Hacker News front page
- Review saved sources from previous runs

### Phase 2: Analyze
- Identify top 3 stories relevant to the team
- Compare with recentStories in state to avoid repeats

### Phase 3: Report
- Send a concise briefing message to the chat
- Include links and one-line summaries for each story

## State Schema
{
  "lastRun": "2026-02-28T01:00:00Z",
  "runCount": 12,
  "recentStories": ["story-slug-1", "story-slug-2"]
}
```

## Notes

- Groups without a `playbook.md` work exactly as before — no behavior change
- The playbook is documentation for the agent, not executable code
- State is optional — simple playbooks can skip it
- Multiple missions can live in one playbook; the scheduled task prompt specifies which to run
