# Rugby Analysis App — Project Context File

**Last updated:** April 2026 — after Batch B completion  
**Purpose:** Paste this at the start of any new chat with Claude to restore full project context instantly.

---

## What this app is

A rugby match analysis web app built in **Next.js / React / TypeScript**.

It helps coaches:
- Upload and review match video
- Tag player and team events live or via transcript import
- Use voice tagging (push-to-talk via spacebar)
- Review team and player performance
- Generate analysis outputs and downloadable reports

It is currently a **coach-first MVP / early private beta**, best used on desktop/laptop, one coach per browser/device.

---

## Tech stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS (custom design tokens via CSS variables)
- localStorage for match persistence (no backend/cloud yet)
- Anthropic API for voice transcription (`/api/transcribe`)
- ExcelJS for `.xlsx` report generation

---

## App structure — current screens

| Screen | Route | Purpose |
|---|---|---|
| Workspace | `/` (main page.tsx) | Live tagging, video, transcript, roster |
| Team Review | `/game-review` | Video-based team review and coaching notes |
| Team Analytics | `/team-dashboard` | Post-match team and player analysis, no video |
| Player Dashboard | `/player-dashboard` | One-match player review (coach-facing, not player login) |
| Saved Matches | `/saved-matches` | Reopen / delete matches saved in browser |

These screens are **separate and should stay separate**.

---

## Key files
app/
page.tsx                          ← Main Workspace (large file, ~2500 lines)
rugby-tagging/
components/
TeamEventsPanel.tsx           ← Penalty For, Penalty Conceded, Try Scored, Try Conceded
TeamSheetModal.tsx            ← First-load team sheet entry
MatchdayRosterPanel.tsx       ← Quick tag buttons + roster table
TranscriptPanel.tsx           ← Event timeline (right sidebar)
NeedsReviewPanel.tsx          ← Corrections queue
SetPieceLoggingPanel.tsx      ← Lineout + scrum logging
CoachReviewPanel.tsx          ← Coach notes (Game Review mode)
TeamSnapshotPanel.tsx         ← Live team stats summary
StatsPanel.tsx                ← Live stats table (no download button)
MatchReportModal.tsx          ← Full report modal (includes Lineout Call Summary)
PlayerDrilldownModal.tsx      ← Player breakdown modal
GameReviewTimelinePanel.tsx   ← Timeline for Game Review mode
PendingResolutionPanel.tsx    ← Player confirmation prompt after voice tag
AppTopNav.tsx                 ← Top navigation bar
helpers.ts                      ← All utility functions
types.ts                        ← All TypeScript types
constants.ts                    ← Storage keys, defaults
lib/
matchVideoSession.ts          ← Video blob session management
savedMatches.ts               ← localStorage match persistence
exports/
teamAnalyticsExport.ts      ← .xlsx workbook builder (5 sheets)
downloadWorkbook.ts         ← Blob download helper

---

## Current working features

### Workspace
- Match details (title, opponent, date)
- Video upload and playback
- Quick skip buttons (-5s / +5s) and playback speed controls (0.5x, 0.75x, 1x, 2x)
- Voice tagging (push-to-talk with spacebar, Whisper API transcription)
- Transcript panel (right sidebar, sorted by timestamp)
- Transcript import from pasted text or .txt file (with clean/preview flow)
- Needs Review queue (items that failed auto-match)
- Set piece logging (lineout + scrum)
- Team event logging (Penalty For, Penalty Conceded, Try Scored, Try Conceded)
- Quick player tags (Tackle, Missed Tackle, Carry, Turnover)
- Matchday roster panel with player minutes
- Submit report flow → Save Match and Open Next Screen modal
- Saved match flow (save/restore via localStorage)
- First-load Help modal + Help button
- Download transcript (.txt)
- Download coach notes (.txt)
- Correction memory (learned corrections saved to localStorage)

### Team Review
- Separate page, video-based review
- Coaching notes workflow

### Team Analytics
- Separate page, no video
- Team snapshot, unit summary, player report table, game flow summary, coaching comment
- **One download button: "Download Match Report" (.xlsx)**
  - 5 sheets: Grading Reference, Team Stats, Lineout Calls, Forwards, Player Progression

### Match Report Modal (Workspace)
- Accessible from Workspace
- Sections: Game coaching comment, Game flow summary, Unit summary, Lineout call summary, Player report
- Lineout call summary shows: call name, times used, won, lost, win rate (colour coded), timestamps

### Player Dashboard
- Separate page
- One-match player review (coach-facing only, no player logins yet)

### Saved Matches
- Reopen saved matches into Workspace / Team Review / Team Analytics
- Delete saved matches

---

## Download strategy

| What | Where | Format |
|---|---|---|
| Transcript | Workspace | .txt |
| Coach notes | Workspace (Game Review mode) | .txt |
| Match Report | Team Analytics | .xlsx |

All previous CSV downloads have been removed. There is now one polished report.

---

## Data model summary

**Events** (`EventItem[]`) — the core data structure. Each event has:
- `id`, `timestamp`, `text`, `rawText?`, `isPending?`
- `category`: `"player"` | `"set-piece"` | `"team"`
- Player events: `playerName?`, `playerAction?`
- Set piece events: `setPieceType`, `setPieceSide`, `lineoutResult?`, `scrumResult?`, `notes?`
- Team events: `teamEventType`

**TeamEventType** (types.ts): `"penalty for"` | `"penalty conceded"` | `"try scored"` | `"try conceded"`

**LineoutResult** (types.ts): `"Won"` | `"Lost"` | `"Not Straight"`

**ScrumResult** (types.ts): `"Won"` | `"Lost"` | `"Penalty For"` | `"Penalty Against"` | `"Free Kick"`

**RosterRow**: `number`, `name`, `position`, `minutes`

---

## Storage

- **Match session:** `localStorage` key `STORAGE_KEY` (defined in constants.ts)
- **Correction memory:** `localStorage` key `CORRECTION_MEMORY_KEY`
- **Current match ID:** `localStorage` (via savedMatches lib)
- **Saved matches list:** `localStorage` (via savedMatches lib)
- **Video:** `sessionStorage` blob URL (not persisted across sessions)
- **No cloud storage yet**

---

## Important product rules (never break these)

1. **No hardcoded Easts logic in core product** — keep everything generalisable for any team
2. **Screens stay separate** — Workspace, Team Review, Team Analytics, Player Dashboard are separate routes
3. **No player logins yet** — Player Dashboard is coach-facing only
4. **No cloud storage yet** — all persistence is browser localStorage
5. **Desktop-first** — not optimised for mobile
6. **Spacebar = voice recording only** — must never trigger a focused button
7. **Transcript always sorted by timestamp** — oldest at top, newest at bottom
8. **"Latest" badge follows highest timestamp**, not last array item

---

## Spacebar / button focus fix pattern

**Fix pattern:** Every event-logging button must:
1. Have `type="button"` explicitly set
2. Call `event.currentTarget.blur()` immediately after its click handler runs via a `runAndBlur` helper

**This fix has been applied to ALL of these files:**
- ✅ `TeamEventsPanel.tsx`
- ✅ `MatchdayRosterPanel.tsx`
- ✅ `SetPieceLoggingPanel.tsx`
- ✅ `NeedsReviewPanel.tsx`

**If new event-logging buttons are added anywhere**, apply this same pattern immediately.

---

## How we work — coding workflow

### Planning
- Use **Claude.ai chat** to plan changes, understand what needs doing, and get instructions written out clearly before touching any code.

### Applying changes
- Use **Claude Code in VS Code** to apply changes to the actual files.
- Claude Code can find the right place in large files without manual copy/pasting.
- Always **review the diff** Claude Code proposes before accepting it.
- Never accept a change you don't understand.

### After every change
1. Test the change in the browser (localhost:3000)
2. Confirm it works as expected
3. Run `git add . && git commit -m "description of change"`
4. Update PROJECT_CONTEXT.md if anything has changed
5. Start a fresh chat with the updated context pasted in

### Rules for working with code
- `page.tsx` is large (~2500 lines) — never rewrite the whole file, always use targeted find/replace
- Always ask for the current file before making changes — never guess from memory
- Stability over cleverness — this app is live in private beta
- Test after every change before moving to the next

---

## What was completed — Batch A (April 2026)

- ✅ Added "Penalty For" as a Team Event button
- ✅ Removed "Steal" and "Penalty" from lineout result dropdown (now: Won / Lost / Not Straight)
- ✅ Download Transcript button confirmed working
- ✅ Spacebar fix applied to all four event-logging panels
- ✅ Transcript panel sorts events by timestamp
- ✅ "Latest" badge follows highest-timestamp event

---

## What was completed — Batch B (April 2026)

- ✅ Lineout Call Summary added to Match Report modal
- ✅ Lineout Calls sheet added to .xlsx download (Sheet 3)
- ✅ Download strategy simplified — one report, one transcript download
- ✅ CSV download removed from Workspace StatsPanel
- ✅ Text report and player stats CSV removed from Team Analytics
- ✅ StatsPanel cleaned up (no download props)
- ✅ Dead code removed from page.tsx and team-dashboard/page.tsx

---

## What's next — Batch C (medium complexity)

1. **Double tackle support** — two players on the same tackle event
2. **Substitutions** — ability to record subs during a match
3. **Bench position selection** — bench players should select what position they came on at
4. **Split correction memory** — split into name corrections and action corrections separately

---

## What's next — Batch D (bigger changes, plan carefully)

1. **Voice transcription during video playback** — biggest workflow blocker
2. **Reducing Needs Review volume** — better name/action matching on first pass
3. **Team management dashboard** — store squad, assign matchday positions via dropdown

---

## Longer-term (don't prioritise yet)

- Cloud storage
- Coach accounts
- Player logins and season dashboards
- Custom KPI systems
- Onboarding flow
- Video annotation / telestration
- Cross-match player trends
- Shared team analysis links

---

## Naming notes

- "Easts" appears in some internal variable names — treat as placeholder
- Will be made configurable when onboarding is built