# Rugby Analysis App — Project Context File

**Last updated:** April 2026 — after Phase 10 (aesthetic and layout polish) complete  
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

- Next.js 16 (App Router, Turbopack)
- React + TypeScript
- Tailwind CSS v4 (custom design tokens via CSS variables in `globals.css`)
- localStorage for match persistence (no backend/cloud yet)
- Anthropic API for voice transcription (`/api/transcribe`)
- ExcelJS for `.xlsx` report generation

---

## Platform structure — 4 layers

The app is split into four clearly separated layers with independent layouts and sidebars.

| Layer | Routes | Layout file |
|---|---|---|
| Public marketing | `/` `/pricing` `/about` `/blog` `/blog/[slug]` | `app/(marketing)/layout.tsx` |
| Coach platform | `/coach/*` | `app/coach/layout.tsx` |
| Player platform | `/player/*` | `app/player/layout.tsx` |
| Admin panel | `/admin/*` | `app/admin/layout.tsx` |

---

## App structure — current screens

### Public marketing
| Route | Status | Purpose |
|---|---|---|
| `/` | Live | Marketing homepage — hero, feature highlights, CTA |
| `/pricing` | Stub | Pricing tiers |
| `/about` | Stub | Founder / product story |
| `/blog` | Stub | Blog index |
| `/blog/[slug]` | Stub | Blog post |

### Coach platform
| Route | Status | Purpose |
|---|---|---|
| `/coach` | Live | Coach home — quick nav card grid to main features |
| `/coach/team-setup` | Live | Squad, names, positions, voice samples, lineout calls |
| `/coach/capture` | Live | Live match tagging workspace (~2600 lines) |
| `/coach/insights` | Live | Team analytics, player output, set piece, export |
| `/coach/review` | Live | Film review, coach notes, timestamped timeline |
| `/coach/players` | Live | Player directory and coach-facing player analysis |
| `/coach/players/[playerId]` | Live | Individual player drilldown |
| `/coach/compare` | Stub (in dev) | Side-by-side player/match comparison |
| `/coach/saved-matches` | Live | Reopen / delete saved matches |
| `/coach/settings` | Stub (in dev) | Account, preferences, permissions |

### Player platform
| Route | Status | Purpose |
|---|---|---|
| `/player` | Stub (in dev) | Player home — recent grades, coach feedback |
| `/player/performance` | Stub (in dev) | Personal analytics and season trends |
| `/player/games` | Stub (in dev) | Match history |
| `/player/games/[gameId]` | Stub (in dev) | Individual game view |
| `/player/review` | Stub (in dev) | Clip playlist and coach annotations |
| `/player/settings` | Stub (in dev) | Account and preferences |

### Admin panel (internal only)
| Route | Status | Purpose |
|---|---|---|
| `/admin` | Stub | Admin home |
| `/admin/accounts` | Stub | User account management |
| `/admin/organisations` | Stub | Organisation management |
| `/admin/teams` | Stub | Team management |
| `/admin/billing` | Stub | Billing and subscriptions |
| `/admin/usage` | Stub | Platform usage metrics |
| `/admin/issues` | Stub | Internal issue tracking |
| `/admin/settings` | Stub | Admin settings |

---

## Key files

```
app/
  layout.tsx                          ← Root layout (Geist fonts, globals.css)
  globals.css                         ← Design tokens (dark theme CSS variables, Tailwind v4)

  (marketing)/
    layout.tsx                        ← Marketing header + footer
    page.tsx                          ← Marketing homepage

  coach/
    layout.tsx                        ← Coach layout: h-screen, sidebar + scrollable main
    CoachSidebar.tsx                  ← Coach left sidebar (accent bar active state, logo mark)
    page.tsx                          ← Coach home (quick nav cards)
    capture/page.tsx                  ← Full Workspace (~2600 lines) — DO NOT rewrite wholesale
    insights/page.tsx                 ← Team analytics page
    review/page.tsx                   ← Film review page
    team-setup/page.tsx               ← Team/squad setup page
    players/page.tsx                  ← Player directory
    players/[playerId]/page.tsx       ← Individual player drilldown
    saved-matches/page.tsx            ← Saved match management
    compare/page.tsx                  ← Stub
    settings/page.tsx                 ← Stub

  player/
    layout.tsx                        ← Player layout: h-screen, sidebar + scrollable main
    PlayerSidebar.tsx                 ← Player left sidebar (same pattern as coach)
    page.tsx + all sub-pages          ← Stubs with "In development" badge

  admin/
    layout.tsx                        ← Admin layout: h-screen, sidebar + scrollable main
    AdminSidebar.tsx                  ← Admin left sidebar (text-only, accent bar)
    page.tsx + all sub-pages          ← Internal stubs

  rugby-tagging/
    components/
      TeamEventsPanel.tsx             ← Penalty For/Conceded, Try Scored/Conceded
      MatchMilestonesPanel.tsx        ← Kick Off, Half Time, Second Half KO, Full Time
      TeamSheetModal.tsx              ← First-load team sheet entry
      MatchdayRosterPanel.tsx         ← Quick tag buttons + roster table
      TranscriptPanel.tsx             ← Event timeline (right sidebar)
      NeedsReviewPanel.tsx            ← Corrections queue
      SetPieceLoggingPanel.tsx        ← Lineout + scrum logging
      CoachReviewPanel.tsx            ← Coach notes (Game Review mode)
      TeamSnapshotPanel.tsx           ← Live team stats summary
      StatsPanel.tsx                  ← Live stats table (no download button)
      MatchReportModal.tsx            ← Full report modal (Lineout Call Summary included)
      PlayerDrilldownModal.tsx        ← Player breakdown modal
      GameReviewTimelinePanel.tsx     ← Timeline for Game Review mode
      PendingResolutionPanel.tsx      ← Player confirmation prompt after voice tag
      AppTopNav.tsx                   ← Legacy top nav (used in old routes only)
    helpers.ts                        ← All utility functions
    types.ts                          ← All TypeScript types
    constants.ts                      ← Storage keys, defaults
    lib/
      matchVideoSession.ts            ← Video blob session management
      savedMatches.ts                 ← localStorage match persistence
      squadProfile.ts                 ← Squad Profile localStorage persistence (cross-match)
    squad/
      page.tsx                        ← Squad Profile management UI (/squad route, legacy)
    exports/
      teamAnalyticsExport.ts          ← .xlsx workbook builder (5 sheets)
      downloadWorkbook.ts             ← Blob download helper
```

---

## Design tokens (globals.css)

Dark theme CSS variables available as Tailwind classes:

| Token | Value | Usage |
|---|---|---|
| `bg-background` | #0b0c0f | Base page background |
| `bg-background-elevated` | #111317 | Elevated surfaces |
| `bg-panel` | #17191d | Cards and panels |
| `bg-panel-2` | #1d2025 | Inset / secondary panels |
| `bg-panel-3` | #23272d | Active sidebar items |
| `text-foreground` | #d7dbe2 | Primary text |
| `text-foreground-strong` | #f1f4f8 | Headings / strong text |
| `text-muted` | #98a0ab | Secondary text |
| `text-muted-2` | #7e8793 | Tertiary / labels |
| `border-border` | #373c44 | Default borders |
| `border-border-light` | #505762 | Hover/active borders |
| `text-success` | #7ea37e | Muted green |
| `text-warning` | #b79a63 | Muted gold |
| `text-danger` | #b16e6e | Muted red |

Body has a radial + linear gradient applied. Buttons get `translateY(-1px)` on hover. Inputs have 0.18s transitions.

---

## Layout pattern (coach / player / admin)

All three platform layouts use the same structure:

```tsx
<div className="flex h-screen overflow-hidden">   // locks to viewport
  <Sidebar />
  <main className="flex-1 overflow-auto">          // only this scrolls
    {children}
  </main>
</div>
```

Sidebar pattern:
- 220px wide (coach/player) or 200px (admin)
- Left accent bar (`w-[3px] rounded-r-full bg-foreground-strong`) on active link
- Logo mark + platform name + sub-label in header
- `transition-all duration-150` on nav links
- "Private beta" footer label

---

## Current working features (coach/capture)

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
- Match milestone buttons (Kick Off, Half Time, Second Half KO, Full Time) — log at current timestamp
- Bench bring-on flow — bench player selects position coming on at, logs substitution event, updates roster position
- Submit report flow → Save Match and Open Next Screen modal
- Saved match flow (save/restore via localStorage)
- First-load Help modal + Help button
- Download transcript (.txt)
- Download coach notes (.txt)
- Correction memory (learned corrections saved to localStorage)

### Coach Insights (/coach/insights)
- Team analytics: tackle %, carry count, lineout %, scrum %
- Headline insights, game coaching comment, game flow summary
- Player report table (all players, all stats)
- Forward pack snapshot
- Unit summary
- Export: Download Full Report (.xlsx, 5 sheets)

### Coach Review (/coach/review)
- Video-based film review
- Timestamped coaching notes
- Team snapshot sidebar
- Game Review Timeline Panel

### Saved Matches (/coach/saved-matches)
- Reopen saved matches into Capture / Insights / Review
- Delete saved matches

---

## Download strategy

| What | Where | Format |
|---|---|---|
| Transcript | Capture | .txt |
| Coach notes | Capture (Game Review mode) | .txt |
| Match Report | Insights | .xlsx (5 sheets) |

All previous CSV downloads have been removed. One polished report.

---

## Data model summary

**Events** (`EventItem[]`) — core data structure. Each event has:
- `id`, `timestamp`, `text`, `rawText?`, `isPending?`
- `category`: `"player"` | `"set-piece"` | `"team"` | `"milestone"` | `"substitution"`
- Player events: `playerName?`, `playerAction?`, `secondPlayerName?`
- Set piece events: `setPieceType`, `setPieceSide`, `lineoutResult?`, `scrumResult?`, `notes?`
- Team events: `teamEventType`

**TeamEventType** (types.ts): `"penalty for"` | `"penalty conceded"` | `"try scored"` | `"try conceded"`

**MilestoneType** (types.ts): `"kick off"` | `"half time"` | `"second half kick off"` | `"full time"`

**RosterRow**: `number`, `name`, `position`, `minutes`

**SquadProfile** (lib/squadProfile.ts — cross-match, persistent): `id`, `teamName`, `coachName`, `primaryColour`, `secondaryColour`, `logoUrl`, `players[]`, `actionSamples[]`, `correctionMemory[]`

**SquadPlayer**: `id`, `fullName`, `preferredName`, `nicknames[]`, `primaryPosition`, `secondaryPositions[]`, `jerseyNumber`, `voiceSamples[]`, `status`

**CorrectionMemoryEntry**: `rawWhisperText`, `resolvedPlayerName`, `resolvedAction`, `count`

---

## Storage

- **Match session:** `localStorage` key `STORAGE_KEY` (defined in constants.ts)
- **Correction memory (v2):** `localStorage` key `CORRECTION_MEMORY_KEY`
- **Squad Profile (cross-match):** `localStorage` key `SQUAD_PROFILE_KEY` (via lib/squadProfile.ts)
- **Current match ID:** `localStorage` (via savedMatches lib)
- **Saved matches list:** `localStorage` (via savedMatches lib)
- **Video:** `sessionStorage` blob URL (not persisted across sessions)
- **No cloud storage yet**

---

## Important product rules (never break these)

1. **No hardcoded team logic in core product** — keep everything generalisable for any team
2. **Capture page is tagging only** — do not add analytics or clip review to it
3. **Insights is analytics only** — do not add clip review or tagging to it
4. **Review is teaching/review only** — do not add tagging to it
5. **No player logins yet** — player platform is UI scaffold only; coach-facing analysis only
6. **No cloud storage yet** — all persistence is browser localStorage
7. **Desktop-first** — not optimised for mobile
8. **Spacebar = voice recording only** — must never trigger a focused button
9. **Transcript always sorted by timestamp** — oldest at top, newest at bottom
10. **"Latest" badge follows highest timestamp**, not last array item
11. **Screens stay separate** — platform layers are independent, with their own layouts

---

## Spacebar / button focus fix pattern

**Fix pattern:** Every event-logging button must:
1. Have `type="button"` explicitly set
2. Call `event.currentTarget.blur()` immediately after its click handler runs via a `runAndBlur` helper

**Applied to:**
- ✅ `TeamEventsPanel.tsx`
- ✅ `MatchdayRosterPanel.tsx`
- ✅ `SetPieceLoggingPanel.tsx`
- ✅ `NeedsReviewPanel.tsx`
- ✅ `MatchMilestonesPanel.tsx`

If new event-logging buttons are added anywhere, apply this same pattern immediately.

---

## Voice matching pipeline — current state

1. Learned correction memory (per-session, v2 format) — fires first, bypasses everything else
2. Squad resolution of GPT's `parsed.player` — preferred name, nickname, surname
3. Token scan of rawText against squad — squad candidates built
4. `tokenResolvedName` promoted if unique token match and no parsed player
5. `parsedPlayerIsValid` = resolved OR token-resolved OR exact roster match
6. Auto-match: `hasKnownAction && parsedPlayerIsValid && highEnoughConfidence`
7. Pending Resolution: `hasKnownAction && mergedCandidates.length > 0` (squad candidates first)
8. Needs Review: everything else

Double-tackle support: when `squadCandidates.length >= 2` and action is tackle, second player pre-filled in `PendingResolutionPanel`.

---

## What was completed

### Batch A (April 2026)
- ✅ Added "Penalty For" as a Team Event button
- ✅ Removed "Steal" and "Penalty" from lineout result dropdown
- ✅ Spacebar fix applied to all event-logging panels
- ✅ Transcript sorted by timestamp; "Latest" badge follows highest timestamp

### Batch B (April 2026)
- ✅ Lineout Call Summary added to Match Report modal
- ✅ Lineout Calls sheet added to .xlsx download (Sheet 3)
- ✅ Download strategy simplified — one report, one transcript download
- ✅ Dead code removed

### Batch C (April 2026)
- ✅ Match milestone buttons (Kick Off, Half Time, Second Half KO, Full Time)
- ✅ Bench bring-on flow with substitution logging
- ✅ Squad Profile lib created (`lib/squadProfile.ts`)
- ✅ `/squad` page — team details, add/edit/remove players
- ✅ `resolvePlayerName()` — resolves against fullName, preferredName, nicknames, surname
- ✅ Token scanning of rawText against squad
- ✅ Correction memory split to v2 (player + action stored separately)
- ✅ Double-tackle support — second player tracked, text and export updated

### Route architecture migration — Phases 1–9 (April 2026)
- ✅ Phase 1: Repo scaffold (App Router folders, routing plan)
- ✅ Phase 2: globals.css dark theme tokens, root layout
- ✅ Phase 3: `/team-dashboard` → `/coach/insights`
- ✅ Phase 4: `/game-review` → `/coach/review`
- ✅ Phase 5: `/player-dashboard` → `/coach/players`
- ✅ Phase 6: `/saved-matches` → `/coach/saved-matches`
- ✅ Phase 7: Workspace → `/coach/capture`
- ✅ Phase 8: Public marketing homepage at `/`
- ✅ Phase 9: `/player` and `/admin` layout scaffolds with sidebars
- Old redirect stubs remain at legacy routes for now

### Phase 10 — Aesthetic and layout polish (April 2026)
- ✅ Layout fix: coach/player/admin use `h-screen overflow-hidden`, sidebar stays fixed
- ✅ Coach sidebar: left accent bar on active link, RugbyCoach logo mark, refined transitions
- ✅ Player/Admin sidebars: same accent bar + logo mark treatment applied
- ✅ Marketing layout: logo mark in header, tighter button styling
- ✅ Marketing homepage: radial hero glow, contrast headline, status dot badge, feature cards with icons and hover, CTA in panel card
- ✅ Coach Home: quick nav card grid to Capture / Insights / Review / Players
- ✅ All stub pages: consistent "In development" amber badge + dashed-border placeholder + purposeful description

---

## Next — Batch D (bigger changes, plan carefully)

1. **Voice transcription during video playback** — biggest workflow blocker; recording and playback currently conflict
2. **Reducing Needs Review volume** — better name/action matching on first pass
3. **Collapsible sidebar** — the design spec calls for it; coach/player sidebars are always 220px wide currently
4. **Team Setup page** — `/coach/team-setup` needs full squad management UI (squad is currently at legacy `/squad` route)

---

## Longer-term (don't prioritise yet)

- Cloud storage and coach accounts
- Player logins and season dashboards
- Custom KPI systems
- Onboarding flow
- Video annotation / telestration
- Cross-match player trends
- Shared team analysis links
- Mobile support

---

## How we work — coding workflow

1. Paste this file at the start of every new Claude chat
2. Plan in Claude before touching code
3. Apply changes with Claude Code in VS Code — review every diff before accepting
4. Test in the browser after every change (`localhost:3000`)
5. Commit to git after each stable milestone
6. Update this file after major structural changes

### Rules for working with code
- `coach/capture/page.tsx` is large (~2600 lines) — never rewrite the whole file, always use targeted find/replace
- Always read the current file before making changes — never guess from memory
- Stability over cleverness — app is live in private beta
- Test after every change before moving to the next

---

## Naming notes

- "Easts" appears in some internal variable names — treat as placeholder, will be made configurable during onboarding build
