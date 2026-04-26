# Rugby Analysis App — Project Context File

**Last updated:** April 2026 — Player settings page live (Batch W)
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
| `/pricing` | Live | Premium SaaS pricing page with monthly/yearly toggle, early adopter yearly offer, trial messaging, currency selector, plan cards, comparison table, and FAQ |
| `/contact` | Placeholder | Organisation demo / pilot contact placeholder for future CRM or sales form |
| `/about` | Live | Origin story, problem statement, design principles, beta status, CTA |
| `/blog` | Live | Blog index — marquee header, post cards, CTA section |
| `/blog/[slug]` | Live | Blog post — header, article body, JSON-LD, post-article CTA |

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
| `/coach/settings` | Live | Browser-local coach settings, setup shortcuts, raw JSON export, guarded data management |

### Player platform
| Route | Status | Purpose |
|---|---|---|
| `/player` | Live | Player home — recent grade, personal stats, constructive coaching plan and next-week targets |
| `/player/performance` | Live | Season averages, grade profile cards, season bests, trend charts vs team avg |
| `/player/team-analytics` | Live | Read-only team analytics for players — shared stats only, no other-player grades/coaching comments |
| `/player/compare` | Live | Read-only match and player comparison inside the player app — shared stats only except own-player coaching plan |
| `/player/games` | Live | Match history |
| `/player/games/[gameId]` | Live | Game detail: own-player stats/grades, constructive coaching plan, video playlist, set piece |
| `/player/review` | Live | Shared coach clips from film review; unscoped text notes are hidden until notes can be assigned to a player |
| `/player/settings` | Live | Profile, identity switch, theme, local data snapshot, quick nav links |

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
    pricing/page.tsx                  ← Pricing route shell
    pricing/PricingExperience.tsx     ← Client-side pricing UI: billing toggle, currency selector, cards, comparison, FAQ
    pricing/pricingConfig.ts          ← Multi-currency pricing config and Stripe price ID placeholders
    contact/page.tsx                  ← Organisation demo / pilot placeholder page
    blog/blogData.tsx                 ← Blog post data: BlogPost type, JSX content, seed posts array
    blog/page.tsx                     ← Blog index: marquee, hero, post cards, CTA
    blog/[slug]/page.tsx              ← Blog post: header, article body, JSON-LD, generateStaticParams

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
    settings/page.tsx                 ← Coach settings: local storage status, shortcuts, JSON export, guarded resets

  player/
    layout.tsx                        ← Player layout: h-screen, sidebar + scrollable main (wraps PlayerProvider)
    PlayerSidebar.tsx                 ← Player left sidebar; shows player name + position when identity set
    PlayerContext.tsx                 ← Player identity context (localStorage key PLAYER_IDENTITY_KEY)
    PlayerPicker.tsx                  ← Full-screen squad picker shown when no player identity set
    playerCoachingPlan.ts             ← Builds player-only constructive feedback and next-week targets from ReportRow
    page.tsx                          ← Player Home (latest match, season averages, constructive coaching plan)
    performance/page.tsx              ← Season trends, recharts charts, grade progression table
    team-analytics/page.tsx           ← Read-only team analytics shared into the player app
    compare/page.tsx                  ← Read-only match/player comparison for players
    games/page.tsx                    ← All matches player appeared in, sorted newest first
    games/[gameId]/page.tsx           ← Game detail: stats, event timeline, coach notes
    review/page.tsx                   ← Playlist of all tagged moments grouped by match
    settings/page.tsx                 ← Profile card, identity switch, theme, local data snapshot, quick nav links

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

## Player app privacy rule

Player-facing pages may show shared team and teammate stats, but must not show other players' grades, private coach comments, or unscoped coach notes. Grades and coaching plans are only shown for the currently selected player. Match-level free-text coach notes are hidden in the player app until the data model can assign notes to a specific player.

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
- Video-based film review with team-meeting layout
- Persistent clip playlist with flexible start/end ranges
- Basic video annotation layer (arrows, circles, highlights) saved per clip
- Timestamped coaching notes with cleaner structured coaching insight display
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
- **Player identity:** `localStorage` key `rugby-player-selected-id` (SquadPlayer.id, via PlayerContext)
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

### Batch M (April 2026)
- ✅ Player platform fully built out — all 5 pages live with real localStorage data
- ✅ Player identity: localStorage key `rugby-player-selected-id` (SquadPlayer.id); `PlayerContext.tsx` provides `currentPlayer`, `setCurrentPlayer`, `clearCurrentPlayer`; `PlayerPicker.tsx` shown when no player selected
- ✅ Player Home — latest match card (grade, opponent, stats), season averages strip, coach comment (auto-generated from ReportRow), focus area tip derived from lowest-graded stat
- ✅ Games — all saved matches where player appears in roster, sorted newest first, clickable cards with grade badge and stat subrow
- ✅ Game Detail — stat grid (tackle %, carries, involvements, minutes), coach comment, player event timeline, match-level coach notes
- ✅ Performance — plain English trend bullets (vs season average), season KPI cards, recharts bar charts (tackle % + carries per game), grade progression table; locked state < 2 matches
- ✅ Review — playlist of all player events grouped by match, action badges + timestamps; note to reopen in Review for video
- ✅ Account (`/player/settings`) — player profile, "Change player" clears identity, theme toggle
- ✅ PlayerSidebar shows player name + position when selected
- ✅ GradeBadge extracted to shared `app/components/GradeBadge.tsx` (was inline in insights)
- ✅ Hydration fix: both CoachSidebar and PlayerSidebar `collapsed` state now deferred to `useEffect` (was causing SSR mismatch via `localStorage` in lazy useState initialiser)

---

### Batch N (April 2026) — Player platform validation + hydration fixes
- ✅ Inline theme script added to `app/layout.tsx` — reads `rugbycoach-theme-scheme` from localStorage before React hydrates and sets `data-theme-scheme` on `<html>`; eliminates dark→bright flash on reload for users with bright scheme saved
- ✅ `app/layout.tsx` has `suppressHydrationWarning` on `<html>` to silence expected attribute mismatch from the inline script
- ✅ `ThemeSchemeToggle.tsx` updated — state starts as `"dark"`, syncs from localStorage in `useEffect`, `suppressHydrationWarning` on wrapper div
- ✅ `PlayerSidebar.tsx` — `suppressHydrationWarning` added to `<aside>` to suppress collapsed-state width mismatch during hydration

---

### Batch O (April 2026) — Player platform depth + video playlist
- ✅ `PlayerPicker` — shows last game date per player below their name ("No games yet" if none); loaded from saved matches on mount
- ✅ `/player/review` — repurposed for coach notes: shows timestamped film review notes from saved matches grouped by match; "Watch game →" links to game detail; note about clip videos coming with cloud
- ✅ `/player/games/[gameId]` — full video playlist experience: player loads match video file, events become seekable playlist (seeks to timestamp −3s, Prev/Next controls, active event highlighted); event timeline shown as fallback when no video; grade badges on stat cards; set piece section retained
- ✅ `/player/performance` — SaaS analytics redesign: season totals strip (tackles, carries, turnovers, involvements); colour-coded grade cards per metric with threshold context and delta vs previous game; season bests section (best tackle %, most carries, most involvements) linked to game detail; chart headers show season avg; grade-by-game table has Latest badge, game links, and season accuracy footnote

---

### Batch P (April 2026) — Coach → player clip pipeline
- ✅ `SavedMatchRecord` extended with `clips?: ClipAnnotation[]` — optional, backwards-compatible
- ✅ `coach/review/page.tsx` — `saveClipsToStorage` now also calls `upsertSavedMatch` via `getCurrentMatchId()` so clips are persisted to the saved match record whenever they are created or deleted
- ✅ `player/review/page.tsx` — full clip section added above the existing notes section: per-match video loader (blob URL, same UX as games/[gameId]), seekable clip playlist (click to seek to startTime − 3s, auto-scroll), Prev/Next controls, category badges (Attack/Defence/other), active-clip highlight; notes section retained as "Match Notes"; unified empty state

---

### Batch Q (April 2026) — Coach Review meeting-room upgrade
- ✅ Review autosave fixed — `/coach/review` now writes coach notes, clips, annotations, and raw-transcript preference through one shared persistence path to both `STORAGE_KEY` and the current saved match record when available
- ✅ Capture restore/autosave preserves saved `clips` so reopening a saved match in Capture no longer drops Review-created clip data from the active session
- ✅ Clip workflow upgraded — spacebar start/end is scoped to `/coach/review`, clip ranges are editable with start/end fields, and the right-side playlist remains visible with All / Attack / Defence / Set Piece filters
- ✅ `VideoAnnotation` added and `ClipAnnotation.annotations?` introduced as optional/backwards-compatible clip data for arrows, circles, and highlights tied to clips
- ✅ Coach Review layout now feels like a team meeting tool: video and controls on the left, persistent clip playlist on the right, timeline/snapshot retained below the playlist
- ✅ Coaching notes display improved with a structured, rule-based insight panel that groups tackles, missed tackles, carries, turnovers, set piece, and team events before raw transcript noise
- ✅ Verification: focused lint passed for touched files with only existing Capture warnings; `npm run build` passed; `/coach/review` returned 200 locally

---

### Batch R (April 2026) — Coach Settings local data controls
- ✅ `/coach/settings` upgraded from stub to live browser-local settings page
- ✅ Settings now shows saved match count, current match presence, squad/team profile status, correction memory count, onboarding state, selected player identity, and known local data size
- ✅ Quick links added for Team Setup, Onboarding, Saved Matches, and Player Platform
- ✅ Shared `ThemeSchemeToggle` added to Settings
- ✅ Raw JSON export added for known RugbyCoach localStorage keys
- ✅ Guarded data controls added: clear current match, reset correction memory, clear player identity, and factory reset known RugbyCoach local data only
- ✅ Settings storage snapshot uses `useSyncExternalStore` to avoid the new React lint rule against synchronous state writes in effects
- ✅ Verification: focused lint passed for `app/coach/settings/page.tsx`; `npm run build` passed; `/coach/settings` returned 200 locally; full repo lint still fails on pre-existing `react-hooks/set-state-in-effect` errors in other coach/player files

---

### Batch S (April 2026) — Capture quality improvements
- ✅ Try scorer name — clicking "Try Scored" opens inline player picker; squad select dropdown with "Log" / "Skip (no name)"; name included in event text and stored on `playerName` field
- ✅ Penalty conceded name — same inline picker flow for "Penalty Conceded"
- ✅ `TeamEventsPanel` now accepts `squad: SquadPlayer[]` prop and has local `pendingNameFor` state for the picker; `onAddTryScored` and `onAddPenaltyConceded` callbacks updated to `(playerName?: string) => void`
- ✅ `buildTeamEventText()` updated to accept optional `playerName?` — returns `"Try Scored — James Smith"` when name provided
- ✅ Substitution display in transcript — structured row showing `[PlayerOff] off → [Position] ← [PlayerOn] on` using the existing `substitutionPlayerOn/Off/Position` fields; no text input (read-only)
- ✅ Voice confidence badge in PendingResolutionPanel — "Low confidence" amber badge for `confidence: "low"`; "Review" muted badge for `"medium"`; nothing for `"high"` or absent; `confidence?` field added to `PendingResolution` type and wired from `parsed?.confidence` in capture page
- ✅ Live set piece % in Capture — `SetPieceLoggingPanel` now accepts `lineoutPct?` and `scrumPct?` props; shown as `"X% won"` pill badge next to section header; only shown once ≥1 event logged; values sourced from existing `setPieceSummary` useMemo
- ✅ Ctrl+Z / Cmd+Z keyboard shortcut for undo last tag in Capture (existing `undoLast()` function); respects the typing-field guard so it won't fire inside text inputs

---

### Batch T (April 2026) — Lint stability cleanup
- ✅ Full `npm run lint` now exits 0 with no output (was: 11 errors, 13 warnings)
- ✅ All `react-hooks/set-state-in-effect` errors eliminated — 11 setState calls in effects replaced with `useSyncExternalStore` + `useMemo` across 10 files
- ✅ CoachSidebar / PlayerSidebar: collapsed state driven by `useSyncExternalStore` + custom window event; toggle writes to localStorage and dispatches the event
- ✅ ThemeSchemeToggle: scheme state via `useSyncExternalStore`; `applyScheme` only called in `chooseScheme` (layout inline script handles mount)
- ✅ PlayerContext: `currentPlayer` + `ready` both via `useSyncExternalStore`; `setCurrentPlayer`/`clearCurrentPlayer` write localStorage and dispatch `player-identity-changed`
- ✅ PlayerPicker: players from squad profile + lastGameDates derived via `useSyncExternalStore` + `useMemo`
- ✅ insights/page: `mounted` flag replaced with `useSyncExternalStore(() => () => {}, () => true, () => false)`
- ✅ player/page, games, games/[gameId], performance, review: saved matches read as JSON snapshot via `useSyncExternalStore`; all derived values in `useMemo`
- ✅ All unused-var warnings cleared: removed dead imports/functions from capture, stub params from blog/slug and players/[playerId]
- ✅ `react-hooks/exhaustive-deps` warning in capture silenced with eslint-disable for the intentionally omitted `startPushToTalkRecording` dep

---

### Batch U (April 2026) — Constructive coaching plans
- ✅ `playerCoachingPlan.ts` added — `buildPlayerCoachingPlan(row)` derives what went well, a main focus area, and up to 4 next-week targets from a `ReportRow`
- ✅ Player Home (`/player`) upgraded from stub to Live — shows latest match coaching plan below season averages
- ✅ Game Detail (`/player/games/[gameId]`) — per-game coaching plan shown after stats
- ✅ Compare (`/player/compare`) — coaching plan shown only for the currently selected player (own player only; privacy rule enforced)
- ✅ Review (`/player/review`) — unscoped match-level notes removed; clips section retained; page describes why notes are hidden
- ✅ Player privacy rule documented in PROJECT_CONTEXT.md

---

### Batch V (April 2026) — Blog
- ✅ `blogData.tsx` — shared post data: `BlogPost` type, JSX content, two seed posts
- ✅ `/blog` — index listing: marquee ticker header, hero panel, post cards (tag, date, reading time, link), CTA section
- ✅ `/blog/[slug]` — individual post: breadcrumb nav, article header, JSX body, JSON-LD structured data, `generateStaticParams`, post-article CTA
- ✅ Seed post 1: "Why We Built RugbyCoach" — Sunday-evening spreadsheet problem, voice-tagging workflow, beta status
- ✅ Seed post 2: "What Good Coaching Feedback Actually Looks Like" — Specific → Contextual → Forward-looking structure, callout examples, lineout example, data as enabler

---

### Batch W (April 2026) — Player settings page
- ✅ `/player/settings` upgraded from stub to Live — proper polished settings page matching the SaaS design language
- ✅ Profile card — avatar initial circle, full name, "known as", position pills, status badge, voice nicknames
- ✅ Playing As — current player display with "Change player" button (`clearCurrentPlayer()`)
- ✅ Display — colour scheme toggle (`ThemeSchemeToggle`)
- ✅ Local data — `useSyncExternalStore` reads squad profile (team name, player count) and saved matches count; updates reactively on `player-identity-changed` event
- ✅ Navigate — 2-column grid of quick-link cards to Home, Games, Performance, Team Analytics

---

### Batch X (April 2026) — Custom KPIs, Help System, AI Chat, QA Polish
- ✅ **Custom KPI Targets** (`app/coach/team-setup/KpiTargetsSection.tsx`) — new section on Team Setup with two parts: (1) Performance Thresholds: adjust Dominant/Competitive/Below values for 6 built-in KPIs; (2) Manual Tracking KPIs: add/edit/delete coach-defined metrics. Stored as `kpiTargets?: CustomKpiConfig[]` on `SquadProfile`
- ✅ **New types** (`app/rugby-tagging/lib/squadProfile.ts`) — `BuiltinKpiTarget`, `ManualKpi`, `CustomKpiConfig`, `DEFAULT_BUILTIN_TARGETS` (6 presets); `gradeWithCustomThreshold()` added to `helpers.ts`
- ✅ **Insights custom thresholds** — Insights KPI cards read coach-set thresholds; Manual KPIs shown as reference cards in a new "Custom Tracking KPIs" section
- ✅ **PageHelp** (`app/components/PageHelp.tsx`) — `?` button on every page (16 pages); opens a client-side modal with page-specific steps and tips. Content in `app/coach/help-content.ts` and `app/player/help-content.ts`
- ✅ **FloatingHelpChat** (`app/components/FloatingHelpChat.tsx`) — bottom-right persistent chat button on all coach/player pages; slide-up panel with streaming AI responses. API route: `/api/help-chat/route.ts` (gpt-4o-mini, streaming `ReadableStream`)
- ✅ **Trend indicators** on Insights KPI cards — `↑/↓ X% vs prev` via new `TrendArrow.tsx` component; `kpiDeltas` useMemo compares last 2 matches
- ✅ **Key Takeaways box** on Insights Overview — rules-based bullets (colour-coded green/amber) before the KPI grid
- ✅ **Season at a Glance** on Coach Home — 4-stat strip (matches, avg tackle %, tries for/against, try margin) shown when 2+ matches saved
- ✅ **Grade trend + Focus Areas chips** on Player Home — `↑/↓` vs previous match next to GradeBadge; amber chips for Below/Poor metric grades
- ✅ **Visual polish** — `.card-hover` CSS utility in `globals.css`; quick-link descriptions updated to be instructional; button hover lifts throughout

---

## Next — Batch Y (plan carefully before starting)

Options: accounts + auth (Supabase/Clerk), Stripe payments, cloud game storage (DB), mobile support, video annotation.

---

## Longer-term (don't prioritise yet)

- Cloud storage and coach accounts
- Player logins and season dashboards
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
