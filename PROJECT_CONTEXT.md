# Rugby Analysis App — Project Context File

**Last updated:** April 2026  
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

```
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
      StatsPanel.tsx                ← Stats generation + CSV download
      MatchReportModal.tsx          ← Full report modal
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
```

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
- Download CSV report (includes game flow + coaching comment)
- Correction memory (learned corrections saved to localStorage)

### Team Review
- Separate page, video-based review
- Coaching notes workflow

### Team Analytics
- Separate page, no video
- Team snapshot, unit summary, player report table, game flow summary, coaching comment

### Player Dashboard
- Separate page
- One-match player review (coach-facing only, no player logins yet)

### Saved Matches
- Reopen saved matches into Workspace / Team Review / Team Analytics
- Delete saved matches

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
*(Note: "Steal" and "Penalty" were removed from lineout options in Batch A)*

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

**Problem discovered in testing:** Browser button focus means pressing spacebar after clicking a button re-fires that button's click handler. `preventDefault()` on the window keydown listener is not sufficient because the button activates before the window handler.

**Fix pattern:** Every event-logging button must:
1. Have `type="button"` explicitly set
2. Call `event.currentTarget.blur()` immediately after its click handler runs

**Example (from TeamEventsPanel.tsx):**
```tsx
const runAndBlur = (
  handler: () => void,
  event: React.MouseEvent<HTMLButtonElement>
) => {
  handler();
  event.currentTarget.blur();
};

<button
  type="button"
  onClick={(e) => runAndBlur(onAddPenaltyFor, e)}
>
  + Penalty For
</button>
```

**This fix has been applied to:** TeamEventsPanel.tsx  
**Still needs applying to:** MatchdayRosterPanel.tsx, SetPieceLoggingPanel.tsx, NeedsReviewPanel.tsx (and any other event-logging buttons)

---

## What was completed — Batch A (April 2026)

All changes committed to git.

- ✅ Added "Penalty For" as a Team Event button
- ✅ Removed "Steal" and "Penalty" from lineout result dropdown (now: Won / Lost / Not Straight)
- ✅ Confirmed Download Transcript button already existed and works
- ✅ Fixed spacebar: no longer triggers focused buttons (TeamEventsPanel done, others pending)
- ✅ Transcript panel now sorts events by timestamp (oldest top, latest bottom)
- ✅ "Latest" badge follows highest-timestamp event, not last array item
- ✅ Game Flow already included in CSV download
- ⏳ Lineout Call Summary in report — deferred to Batch B

---

## What's next — immediate (Batch A completion)

Apply the spacebar / blur fix to remaining panels. Need these files:

1. **`MatchdayRosterPanel.tsx`** — Quick Tag buttons (Tackle, Missed Tackle, Carry, Turnover)
2. **`SetPieceLoggingPanel.tsx`** — Add Lineout, Add Scrum buttons
3. **`NeedsReviewPanel.tsx`** — Save and Skip buttons

Pattern to apply is identical to TeamEventsPanel fix above.

---

## What's next — Batch B (report improvements)

1. **Lineout Call Summary** in the forwards section of the full report
   - Summary of lineout calls used, success rate per call, outcomes
   - Needs `notes` field from lineout events (already being logged)
2. **Game Flow section** polish in downloaded report
3. **Download Full Report** improvements (layout, section order)

---

## What's next — Batch C (medium complexity)

1. **Double tackle support** — two players on the same tackle event
2. **Substitutions** — ability to record subs during a match
3. **Bench position selection** — bench players should be able to select what position they came on at (so reports stay accurate)
4. **Split correction memory** — currently one memory store; should split into name corrections and action corrections separately for smarter learning

---

## What's next — Batch D (bigger changes, plan carefully)

1. **Voice transcription during video playback** — biggest workflow blocker. Currently voice works better when video is paused. Investigate mic gain competing with video audio, Web Speech API limits, browser focus issues.
2. **Reducing Needs Review volume** — better name/action matching on first pass
3. **Team management dashboard** — store squad, assign matchday positions via dropdown, paste matchday team sheet

---

## Longer-term (don't prioritise yet)

- Cloud storage
- Coach accounts
- Player logins and season dashboards
- Custom KPI systems
- Onboarding flow (team name, roster, logo, colours, lineout calls)
- Video annotation / telestration
- Cross-match player trends
- Shared team analysis links

---

## How to work with this codebase

- `page.tsx` is large (~2500 lines). Always use **find/replace blocks**, never rewrite the whole file.
- For small component files, full ready-to-paste replacements are fine.
- Always ask for the **current file** before making changes — never guess from memory.
- Test after every change before moving to the next.
- The app is live in private beta — **stability over cleverness**.
- When in doubt, prefer the safe incremental path.

---

## Naming notes

- The team is currently "Easts" in examples and selectors — but this should be treated as a placeholder. All logic should work for any team name.
- "Easts" appears in `SetPieceSide` type and some UI labels. This will be made configurable when onboarding is built.
