# Playbook

## Mission: Weekly Strategy Briefing

### Phase 1: Gather Intelligence
- Search web for latest AI industry news, agent OS developments, and competitor moves
- Check AI4U memory service for recent customer conversations and feedback patterns
- Review any ongoing project context from `/workspace/group/projects/`

### Phase 2: Analyze & Prioritize
- Identify top 3 actionable opportunities or risks from gathered intelligence
- Compare with `state.previousInsights` to filter out stale or repeated findings
- Evaluate each item against AI4U's current priorities: revenue, reliability, speed, user trust

### Phase 3: Report
- Send a concise strategy briefing to the chat with:
  - 🔥 Top opportunities (with recommended next action for each)
  - ⚠️ Risks or competitive threats
  - 📊 Key metrics or signals to watch
- Keep it under 500 words — executive style, not essay style
- Save current findings to state for dedup next run

## Mission: Cross-Group Health Check

### Phase 1: Inspect
- Query scheduled tasks: `sqlite3 /workspace/project/store/messages.db "SELECT id,group_folder,prompt,schedule_type,status,last_run,last_result FROM scheduled_tasks WHERE status='active' ORDER BY last_run DESC;"`
- Check each registered group's recent activity and any error logs

### Phase 2: Assess
- Flag any tasks that have been failing or haven't run recently
- Check if any group's last_result indicates errors or timeouts
- Compare with `state.previousHealthCheck` for new issues only

### Phase 3: Report
- Send a short health summary to the chat (only if there are issues)
- If everything is healthy, skip the report to avoid noise
- Update state with current health snapshot

## State Schema
```json
{
  "lastRun": "ISO timestamp",
  "runCount": 0,
  "mission": "which mission ran",
  "previousInsights": ["insight-slug-1", "insight-slug-2"],
  "previousHealthCheck": {
    "activeTaskCount": 0,
    "failingTasks": [],
    "lastChecked": "ISO timestamp"
  }
}
```
