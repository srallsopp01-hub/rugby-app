# Rugby Analysis App — Project Context File

**Last updated:** April 2026 — after same-match player comparison on Compare page
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
- localStorage for browser-local colour scheme preference (`dark` / `bright`)
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
| `/` | Live | Bold sport marketing homepage — product-first hero, interactive app-page slider, feature matrix, quote, CTA |
| `/pricing` | Stub | Pricing tiers |
| `/about` | Stub | Founder / product story |
| `/blog` | Stub | Blog index |
| `/blog/[slug]` | Stub | Blog post |

### Coach platform
| Route | Status | Purpose |
|---|---|---|
| `/coach` | Live | Coach home — next-action dashboard, match confidence, quick nav |
| `/coach/onboarding` | Live | First-time coach setup wizard — team details, manual squad entry, voice tagging guidance |
| `/coach/team-setup` | Live | Squad, names, positions, voice samples, lineout calls |
| `/coach/capture` | Live | Live match tagging workspace (~2600 lines) |
| `/coach/insights` | Live | Team analytics, player output, set piece, export, match confidence banner |
| `/coach/review` | Live | Film review, coach notes, timestamped timeline, match context banner |
| `/coach/players` | Live | Player directory and coach-facing player analysis |
| `/coach/players/[playerId]` | Live | Individual player drilldown |
| `/coach/compare` | Live | Side-by-side saved match and player comparison with confidence cues |
| `/coach/saved-matches` | Live | Reopen / delete saved matches, local storage context |
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
    MarketingProductSlider.tsx        ← Client-side homepage app tour slider

  components/
    ThemeSchemeToggle.tsx             ← Shared dark / bright scheme toggle

  coach/
    layout.tsx                        ← Coach layout: h-screen, sidebar + scrollable main
    CoachSidebar.tsx                  ← Coach left sidebar (accent bar active state, logo mark)
    page.tsx                          ← Coach home (quick nav cards)
    OnboardingWizard.tsx              ← First-time setup wizard component
    onboarding/page.tsx               ← Dedicated onboarding route
    capture/page.tsx                  ← Full Workspace (~2600 lines) — DO NOT rewrite wholesale
    insights/page.tsx                 ← Team analytics page
    review/page.tsx                   ← Film review page
    team-setup/page.tsx               ← Team/squad setup page
    players/page.tsx                  ← Player directory
    players/[playerId]/page.tsx       ← Individual player drilldown
    saved-matches/page.tsx            ← Saved match management
    compare/page.tsx                  ← Saved match + player comparison
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
      matchConfidence.ts              ← Read-only saved match labels, counts, report readiness
      onboarding.ts                   ← Onboarding completion helpers
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

Theme CSS variables available as Tailwind classes. Default is the dark scheme; a browser-local bright scheme can be selected via the shared theme toggle and is stored in `localStorage` as `rugbycoach-theme-scheme`.

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

Bright scheme:
- Uses white / off-white surfaces with black text and orange accent (`--accent: #ed6a1f`).
- Applies across marketing, coach, player, and admin through `data-theme-scheme="bright"` on `<html>`.
- Video and product mock areas may stay dark where they represent match footage or film UI.

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
- Video upload and playback with custom controls (Play/Pause button, seek bar, time display)
- Quick skip buttons (-5s / +5s) and playback speed controls (0.5x, 0.75x, 1x, 2x)
- Voice tagging (push-to-talk with spacebar, Whisper API transcription) — works while video plays
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
- Match context banner shows current match, local storage/video scope, note count, resolved event count, report readiness

### Saved Matches (/coach/saved-matches)
- Reopen saved matches into Capture / Insights / Review
- Delete saved matches
- Local storage context panel
- Per-match confidence cues: named players, resolved events, unresolved review items, notes, Ready for report / Needs review

### Coach Compare (/coach/compare)
- Match comparison: two saved localStorage matches side by side
- Player comparison: one player from each selected saved match
- Same-match comparison is blocked/warned against
- KPI cards and delta tables explicitly use resolved tagged events
- Confidence cues show pending events, unresolved review items, and report readiness

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
- **Onboarding completion:** `localStorage` key `ONBOARDING_COMPLETE_KEY`
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

### Batch D (April 2026)
- ✅ Voice tagging during video playback — removed native `<video controls>`, added custom Play/Pause button + seek bar; spacebar no longer pauses video
- ✅ Team Setup page — `/coach/team-setup` was already live (completed in Phase 7 migration); `/squad` redirects to it
- ✅ Collapsible coach sidebar — animates 220px ↔ 56px (icon-only), persists to localStorage, chevron toggle, native title tooltips
- ✅ Needs Review volume — Whisper prompt with player names + action words; expanded GPT action synonyms (jackal→turnover, run→carry, etc.); preferred names + nicknames sent to API

### Batch E (April 2026)
- ✅ Collapsible player sidebar — mirrors CoachSidebar pattern exactly, localStorage key `"player-sidebar-collapsed"`, independent of coach key
- ✅ Clip tagging on Review screen — Mark Start / Mark End flow captures video segments with a label; clips listed with click-to-jump; persisted to localStorage under existing STORAGE_KEY; `ClipAnnotation` type added to types.ts
- ✅ Cross-match player trends in Insights — loads all saved matches via `getSavedMatches()`, computes per-player stats with `buildReportRowsFromMatch()`, shows tackle%/carries/grade per match with trend arrows (↑↓→); gated behind 2+ matches

### Batch F (April 2026)
- ✅ Needs Review reduction — `resolvePlayerName` now has a fuzzy surname fallback (Levenshtein ≤ 1 on surnames ≥ 4 chars); GPT prompt updated so action-clear + player-uncertain gives `confidence: "medium"` and always populates `candidate_players`; routes more tags to PendingResolution instead of Needs Review
- ✅ Clip categories on Review — `category?: string` added to `ClipAnnotation`; pill-button picker (Breakdown, Set Piece, Kick, Defence, Attack, Other) in clip confirm flow; saved clips show a muted category badge in the list
- ✅ Player trends drilldown — clicking a player row in the Insights trends table expands a detail sub-table showing full per-match stats (tackles, missed, carries, turnovers, involvements, grade); one row open at a time

---

### Batch G (April 2026)
- ✅ Dedicated `/coach/onboarding` route added for first-time coach setup
- ✅ `/coach` redirects first-time coaches to onboarding when onboarding is incomplete and no named squad profile exists
- ✅ Onboarding wizard supports team details, manual squad player entry, and voice tagging guidance
- ✅ "Skip for now" marks onboarding complete and returns to `/coach` without creating or overwriting squad profile data
- ✅ Capture roster seeding intentionally left out — `/coach/capture` keeps its existing team-sheet/session flow

---

### Batch H (April 2026)
- ✅ `/coach/compare` is now live as a desktop-first, side-by-side comparison screen
- ✅ Match comparison mode compares two saved localStorage matches using the same shared analytics helpers as Insights/export
- ✅ Player comparison mode compares one player from each selected saved match with KPI deltas
- ✅ Compare is read-only and comparison-only — no tagging, film review, video playback, saved-match editing, backend, or cloud storage

---

### Batch I (April 2026)
- ✅ Coach Home upgraded from simple quick links to a next-action dashboard
- ✅ Coach Home now shows active/latest saved match, saved-match count, last saved time, resolved event count, open review count, and report readiness
- ✅ Compare and Saved Matches added to Coach Home quick links
- ✅ Shared `matchConfidence.ts` helper added for saved match labels, localStorage confidence counts, and Ready for report / Needs review status
- ✅ Insights, Review, Compare, and Saved Matches now show match context/confidence cues
- ✅ Compare prevents same-match comparison and labels stats as based on resolved tagged events
- ✅ Root metadata no longer says Create Next App
- ✅ Scoped Next 16/React lint stability improved: full lint now exits with warnings only

---

### Batch J (April 2026)
- ✅ Marketing homepage polished with a product-first bold sport layout
- ✅ Homepage app tour upgraded to a client-side slider covering Coach Home, Capture, Insights, Players, Review, Team Setup, Saved Matches, and Compare
- ✅ Capture slide highlights specific Capture areas: video timeline, quick tags, voice tagging, transcript, and report flow
- ✅ Whole-product dark / bright colour scheme preference added via shared CSS tokens and `ThemeSchemeToggle`
- ✅ Bright scheme uses white/off-white surfaces with orange and black accents; preference persists in browser localStorage
- ✅ Theme toggle is available from marketing header and coach/player/admin sidebars

---

---

### Batch K (April 2026)
- ✅ Insights page fully redesigned as a 4-tab SaaS analytics dashboard
- ✅ Tab 1 — Overview: season snapshot strip (2+ matches), 8 KPI hero cards, top performers, players needing attention, unit summary, team totals
- ✅ Tab 2 — Game Analysis: headline insights, coaching comment, game flow, set piece CSS bar charts (lineout + scrum), discipline tiles, unit performance table
- ✅ Tab 3 — Players: position filter pills (All / Forwards / Backs), full player table with GradeBadge, player comment cards
- ✅ Tab 4 — Season Trends: locked state < 2 matches; season KPI averages, 3 Recharts bar charts (tackle %, tries, lineout %), player grade progression table
- ✅ Export button moved to persistent page header, always accessible from any tab
- ✅ recharts added as a dependency for multi-match bar charts

---

### Batch L (April 2026)
- ✅ Team Setup multi-select positions — replaced free-text secondary positions input with a proper checkbox dropdown; first selected = primary, rest = secondary; `primaryPosition` and `secondaryPositions[]` on `SquadPlayer` type used directly
- ✅ Jersey number field removed from player entry form; `jerseyNumber` always writes `null` (field remains in type for backwards compat)
- ✅ Player list sorted by position order (front row → backs) using `POSITION_OPTIONS` index; alphabetical tiebreaker
- ✅ "No." column removed from player table; Position column shows primary + secondary positions inline

---

### Batch L addendum (April 2026)
- ✅ Compare page: Player tab now allows same-match selection so two players from the same game can be compared side by side
- ✅ When same match active, right player auto-defaults to the second roster player (not the same as left); a context note confirms single-match scope
- ✅ Match tab retains the existing same-match block and warning unchanged

---

## Next — Batch M (plan carefully before starting)

Idea:
- Validate Batch L in-browser, then decide on next priority area

---

## Longer-term (don't prioritise yet)

- Cloud storage and coach accounts
- Player logins and season dashboards
- Custom KPI systems
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
