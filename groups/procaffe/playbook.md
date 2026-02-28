# Playbook

## Mission: Competitor Watch

### Phase 1: Scan
- Search web for competitor activity: The Coffee House, Highlands Coffee, Newtec, Epicure, Breville HCMC
- Look for: new menu items, pricing changes, promotions, store openings, social media campaigns
- Check competitor social media pages for recent posts and engagement patterns
- Query memory service for previously stored competitor data

### Phase 2: Compare
- Compare findings with `state.lastFindings` to detect changes since last scan
- Flag significant changes: price shifts >10%, new product launches, new locations, viral campaigns
- Identify differentiation opportunities — what are they doing that Procaffe can counter-position against?
- Skip findings that are stale repeats from previous runs

### Phase 3: Report
- If significant changes found: send a concise alert to the chat with:
  - 🆕 New competitor moves (with links if available)
  - 💡 Recommended Procaffe response for each
  - 📊 Quick market sentiment summary
- If no significant changes: skip the report (don't create noise)
- Save current findings to state for next run

## Mission: Content Pipeline Check

### Phase 1: Review
- Check `/workspace/group/projects/` for active content projects
- Look for any pending drafts, content calendars, or campaign briefs
- Review `conversations/` folder for recent content-related discussions

### Phase 2: Assess
- Identify content gaps: are there platform channels without recent posts planned?
- Check if any scheduled content deliverables are overdue
- Review quality gate compliance: brand voice, diacritics, platform format, CTA

### Phase 3: Report
- Send a content pipeline status update:
  - ✅ On track items
  - ⏰ Overdue or at-risk items
  - 💡 Content suggestions based on competitor activity or trending topics
- Keep it actionable — every item should have a clear next step

## State Schema
```json
{
  "lastRun": "ISO timestamp",
  "runCount": 0,
  "mission": "which mission ran",
  "lastFindings": {
    "theCoffeeHouse": { "lastPrice": null, "newProducts": [], "notes": "" },
    "highlands": { "lastPrice": null, "newProducts": [], "notes": "" },
    "newtec": { "lastPrice": null, "newProducts": [], "notes": "" },
    "epicure": { "lastPrice": null, "newProducts": [], "notes": "" }
  },
  "contentPipeline": {
    "pendingDrafts": [],
    "overdueItems": [],
    "lastChecked": "ISO timestamp"
  }
}
```
