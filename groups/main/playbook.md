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

## Mission: Daily Digest

### Phase 1: Gather
- Check recent conversations in `/workspace/group/conversations/` for unresolved items, pending follow-ups, or promises made
- Look for any reminders or todos from previous sessions
- Check calendar (via gogcli if available) for today's and tomorrow's events

### Phase 2: Compile
- Build a list of open items grouped by urgency:
  - 🔴 Overdue or time-sensitive
  - 🟡 Due today or tomorrow
  - 🟢 Upcoming but not urgent
- Compare with `state.previousDigest` to highlight what's new vs carried over
- Skip items that were already resolved

### Phase 3: Report
- Send a morning briefing to the chat:
  - Today's schedule highlights
  - Open action items and follow-ups
  - Any reminders set for today
- Keep it scannable — bullet points, not paragraphs
- If nothing is pending, send a short "all clear" message instead of silence

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
  },
  "previousDigest": {
    "openItems": [],
    "resolvedSinceLastRun": [],
    "reminders": []
  }
}
```
