# Playbook

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
  "previousDigest": {
    "openItems": [],
    "resolvedSinceLastRun": [],
    "reminders": []
  }
}
```
