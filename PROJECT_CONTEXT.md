# FYNL Whistle — Project Context File

**Last updated:** 8 May 2026 — Fixed team-setup data-loss race condition: `profile` state now initialises as `null` instead of `createDefaultSquadProfile()`, the loading state is shown until real data arrives, and `persist()` bails out while `isLoading` is true — preventing a hard-refresh from wiping the squad by saving a blank default before the Supabase fetch completes. Previous: Four improvements: (1) Fixed availability race condition. (2) Saved matches sort by `matchDate` descending. (3) Player review page reworked with game selector pills. (4) Team sheet modal load-from-previous and datalist autocomplete.
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

It is currently a **coach-first MVP**, live at [fynlwhistle.com](https://fynlwhistle.com), best used on desktop/laptop, one coach per browser/device.

---

## Tech stack

- Next.js 16 (App Router, Turbopack)
- React + TypeScript
- Tailwind CSS v4 (custom design tokens via CSS variables in `globals.css`)
- **Supabase-first** match and team persistence — no localStorage for data; `TeamContext` and `MatchesContext` providers fetch on mount and keep an in-memory cache for synchronous reads
- Cloudflare R2 for video storage paths
- localStorage only for ephemeral/UI state: in-progress capture session (`STORAGE_KEY`), active match ID pointer, sidebar preferences, colour scheme
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
| `/coach/saved-matches` | Live | Reopen / delete saved matches; sorted by `matchDate` descending (most recent game first) |
| `/coach/settings` | Live | Browser-local coach settings, setup shortcuts, raw JSON export, guarded data management |
| `/coach/organisation` | Live | Club admin only — org name, plan, status, billing date, active team count, coach seat count |

### Player platform
| Route | Status | Purpose |
|---|---|---|
| `/player` | Live | Player dashboard — greeting + unanswered-response badge, inline availability picker with reason input, season stats strip, next game + last grade cards, coach feedback, targets this week, last-game stats table |
| `/player/availability` | Live | Standalone availability picker for upcoming fixtures and training sessions; each button click reads from `getTeam()` cache (not stale React state) so game + training selections both persist |
| `/player/performance` | Live | Season averages, grade profile cards, season bests, trend charts vs team avg |
| `/player/team-analytics` | Live | Read-only team analytics for players — shared stats only, no other-player grades/coaching comments |
| `/player/compare` | Live | Read-only match and player comparison inside the player app — shared stats only except own-player coaching plan |
| `/player/games` | Live | Match history |
| `/player/games/[gameId]` | Live | Game detail: full-screen two-column layout — video player + stats + coaching plan (left, scrollable), involvement playlist sidebar (right, scrollable); Previous/Next clip navigation, current-clip card, active-clip highlight, set piece section |
| `/player/review` | Live | Shared coach clips from film review; game selector pills at top (most recent auto-selected, only selected game shown); per-clip 👍 "Got it" / 🤔 "Question" reactions, optional question text, per-player free-text "Your note" (debounced); marks all clips as seen on open |
| `/player/settings` | Live | Profile, identity switch, theme, local data snapshot, quick nav links |

### Admin panel (internal only — gated by `ADMIN_EMAILS` env var)
| Route | Status | Purpose |
|---|---|---|
| `/admin` | Live | Platform overview: orgs by status, active teams, coach seats, new orgs (30 days) |
| `/admin/accounts` | Live | All registered users — email, org, role, joined date (via Supabase auth admin API) |
| `/admin/organisations` | Live | All orgs table — plan, status, team/seat counts, billing date; click to expand teams; Edit to change plan or override limits |
| `/admin/teams` | Live | All teams — org name, status, member count, created date |
| `/admin/billing` | Live | Orgs by plan, trialing orgs (soonest-expiry first, urgent ≤3 days in red), past-due list |
| `/admin/usage` | Live | Total orgs/teams/members/matches; monthly bar charts for new orgs and saved matches (6 months) |
| `/admin/issues` | Stub | Internal issue tracking (no backing data yet) |
| `/admin/settings` | Stub | Admin settings (no backing data yet) |

Admin login redirects straight to `/admin` (not `/coach`). Non-admin emails are redirected to `/coach` by the layout guard.

---

## Organisation / Team / User Spec

This is the source of truth for the multi-tenant data model. As of Move 2 (Batch BD, May 2026), this is implemented in production.

### Concepts

**Organisation** — the billing entity. One Stripe subscription belongs to exactly one organisation. An organisation has a name, a plan, a billing relationship, and contains one or more teams. Solo coaches have a "ghost organisation" — it exists in the database for billing but the word "organisation" never appears in the Team Launch UI.

**Team** — the actual rugby team. Owns a squad of players, fixtures, training sessions, colours, lineout calls, saved matches, and videos. Every team belongs to exactly one organisation. Replaces the old `squad_profiles` concept, with `organisation_id` added.

**User** — a person with a Supabase auth account (email + password). A user is just an identity. They get capabilities by being a member of one or more teams (via `team_members`) and possibly one or more organisations (via `organisation_members`). Users own no data directly — teams own data, organisations own teams.

### Roles

Five roles total, split across two membership tables.

**Organisation-level (`organisation_members`):**
- **`club_admin`** — owns billing, creates/deletes teams, oversees the org. Read-only access across all teams in the org by default. Can also hold a team-level role concurrently.

**Team-level (`team_members`):**
- **`head_coach`** — full control of a team. Tags, grades, manages squad, invites members, uploads videos. Multiple head coaches per team allowed.
- **`assistant_coach`** — coaching access without admin powers. Can tag, grade, write coach notes, upload videos. Cannot manage squad structure or invite members.
- **`player`** — sees their own data and read-only team analytics. Submits availability. Linked to a `SquadPlayer` record via `linked_user_id`.
- **`player_admin`** — *(deferred — not implemented)*

`coach_label` (free text, e.g. "Forwards", "Backs", "Manager") stays as a cosmetic display label. `role` is the permission boundary.

### Plans

Four plan types in the `plan` enum. `solo` is reserved for future use, unreachable in UI. Existing users backfilled as `team_launch`.

| Plan | Teams | Coach seats | Players (per team) |
|---|---|---|---|
| `solo` (reserved) | 1 | 1 | 30 |
| `team_launch` | 1 | 4 | 50 |
| `club_5` | 5 | 30 | 50 per team |
| `org_custom` | unlimited | unlimited | unlimited |

Plan defaults live in a `PLAN_LIMITS` constant in application code. Per-org overrides via nullable columns (`team_limit`, `seat_limit`, `player_limit`) on the `organisations` table. Move 2 shipped with limits set to NULL — schema in place, enforcement turned on later when ready. Active players only count toward the player limit. Coach seats include `head_coach`, `assistant_coach`, and `club_admin`. Players don't count toward seat limits.

### Tables (current schema after Move 2)

#### `organisations`id                      uuid primary key
name                    text not null
plan                    text check ('solo' | 'team_launch' | 'club_5' | 'org_custom')
status                  text check ('trialing' | 'active' | 'past_due' | 'canceled' | 'archived')
team_limit              integer null
seat_limit              integer null
player_limit            integer null
trial_ends_at           timestamptz null
stripe_customer_id      text null
stripe_subscription_id  text null
current_period_end      timestamptz null
canceled_at             timestamptz null
archived_at             timestamptz null
owner_user_id           uuid → auth.users not null
created_at, updated_at
Indexes on: owner_user_id, status, stripe_customer_id (where not null), stripe_subscription_id (where not null).

#### `organisation_members`id                  uuid primary key
user_id             uuid → auth.users
organisation_id     uuid → organisations
role                text check ('club_admin')   (only value for now)
created_at
Unique constraint on (user_id, organisation_id). Application-level invariant: each org must have at least one club_admin.

#### `teams` (replaces `squad_profiles`)id                      uuid primary key
organisation_id         uuid → organisations not null
name                    text not null
status                  text check ('active' | 'archived')
archived_at             timestamptz null
current_season          text null
created_by_user_id      uuid → auth.users null   (audit only, no longer access path)— All existing squad_profile fields preserved:
primary_colour, secondary_colour, logo_url, players (jsonb),
action_samples (jsonb), correction_memory (jsonb), kpi_targets (jsonb),
fixtures (jsonb), training_sessions (jsonb), availability_responses (jsonb),
session_logs (jsonb), league_position integer— Carried forward from squad_profiles (in active use):
coach_name text not null default ''
profile_id text not null default ''
ai_chat_history jsonbcreated_at, updated_at
Indexes on: organisation_id, status.

#### `team_members` (reshaped)id                  uuid primary key
user_id             uuid → auth.users
team_id             uuid → teams
role                text check ('head_coach' | 'assistant_coach' | 'player')
status              text check ('active' | 'invited' | 'pending' | 'removed')
coach_label         text null     (cosmetic only)
player_squad_id     uuid null     (only when role = 'player')
email               text null     (used for pending invitations)
invited_by_user_id  uuid → auth.users null
invited_at, accepted_at, removed_at, left_team_at
created_at, updated_at
Partial unique index on (user_id, team_id) where user_id is not null.

#### `saved_matches` (reshaped)team_id             uuid → teams not null
season              text null   (copied from teams.current_season)
visibility          text check ('org' | 'team') default 'org'
created_by_user_id  uuid → auth.users null   (renamed from user_id)
-- All existing columns preserved
Unique constraint on (team_id, match_id). Old (user_id, match_id) constraint dropped.

#### `user_profiles` (new)user_id                 uuid primary key → auth.users cascade
has_used_trial          boolean not null default false
last_active_team_id     uuid → teams null on delete set null

#### `stripe_events_processed` (new — for future Stripe webhook)event_id            text primary key
processed_at        timestamptz not null default now()

### RLS principles

Read access to a team's data requires either:
(a) an active `team_members` row for that team (status = 'active'),
(b) an active `club_admin` row in `organisation_members` for the team's organisation, or
(c) being a `linked_user_id` on a SquadPlayer in the team's `players` JSONB array.

Write access requires `team_members` with `role IN ('head_coach', 'assistant_coach')`. Players can only write their own availability responses.

Squad management requires `role = 'head_coach'`. Org-level team management requires `role = 'club_admin'`.

Helper functions: `can_read_team_data(p_team_id uuid)` and `can_manage_team(p_team_id uuid)` — extended from the original `20260501000003_player_read_access` migration to handle the new role enum and org-level access.

### Player data export

Players can export their performance history as a PDF at any time, including from teams they've left (because `linked_user_id` is preserved on inactive SquadPlayers after departure). Live cross-team "career view" deferred to a future batch — data model already supports it.

### Open questions deliberately deferred

These are decisions consciously not made, with the data model designed not to preclude them:
- Live player career view — data model supports it, no UI built. Future batch.
- Per-team merge into Club 5 — viral club adoption case. Manual via admin panel until volume justifies self-serve.
- Per-team add-on pricing — Club 5 capped at 5 teams. Manual until volume justifies self-serve.
- `solo` plan as a free tier — enum reserved, no UI. Decision deferred until conversion data is available.
- Per-match `visibility = 'team'` private mode — column reserved, UI not built.
- Disappeared club admin self-serve recovery — handled manually until volume justifies self-serve.
- First-class `seasons` table — currently a text field. FK migration possible later.
- `player_admin` role — reserved as a concept, not built.

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
    pricing/pricingConfig.ts          ← Multi-currency pricing config and Stripe price ID mapping
    contact/page.tsx                  ← Organisation demo / pilot placeholder page
    blog/blogData.tsx                 ← Blog post data: BlogPost type, JSX content, seed posts array
    blog/page.tsx                     ← Blog index: marquee, hero, post cards, CTA
    blog/[slug]/page.tsx              ← Blog post: header, article body, JSON-LD, generateStaticParams

  components/
    ThemeSchemeToggle.tsx             ← Shared dark / bright scheme toggle

  coach/
    layout.tsx                        ← Coach layout: gate (team_members OR org_members), isOrgAdminOnly banner, sidebar + scrollable main
    CoachSidebar.tsx                  ← Coach left sidebar — team switcher dropdown, accent bar active state, Organisation nav item
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
    organisation/page.tsx             ← Club admin only: org name, plan, status, billing date, team count, seat count; + "New team" button (creates team + head_coach membership)
    organisation/CreateTeamButton.tsx ← Client component for inline team creation form

  player/
    layout.tsx                        ← Player layout: h-screen, sidebar + scrollable main (wraps PlayerProvider)
    PlayerSidebar.tsx                 ← Player left sidebar; shows player name + position when identity set
    PlayerContext.tsx                 ← Player identity context (localStorage key PLAYER_IDENTITY_KEY)
    PlayerPicker.tsx                  ← Full-screen squad picker shown when no player identity set
    playerCoachingPlan.ts             ← Builds player-only constructive feedback and next-week targets from ReportRow
    page.tsx                          ← Player dashboard (greeting, availability picker with inline reason input, season strip, next game, coach feedback, targets, last-game stats)
    availability/page.tsx             ← Standalone availability page (fixtures + training sessions)
    performance/page.tsx              ← Season trends, recharts charts, grade progression table
    team-analytics/page.tsx           ← Read-only team analytics shared into the player app
    compare/page.tsx                  ← Read-only match/player comparison for players
    games/page.tsx                    ← All matches player appeared in, sorted newest first
    games/[gameId]/page.tsx           ← Game detail: full-screen two-column layout (video+stats left, playlist right)
    review/page.tsx                   ← Coach clip playlist with per-clip 👍/🤔 reactions + per-player notes (debounced 600 ms); marks page as seen on mount
    lib/reviewSeen.ts                 ← Per-player last-seen timestamp helpers (`fynlwhistle-player-review-last-seen-{id}`)
    lib/unseenClips.ts                ← `countUnseenClips(matches, player, lastSeenAt)` — drives "new clips" badges
    settings/page.tsx                 ← Profile card, identity switch, theme, local data snapshot, quick nav links

  admin/
    layout.tsx                        ← Admin layout: guards via ADMIN_EMAILS env var
    AdminSidebar.tsx                  ← Admin left sidebar (text-only, accent bar)
    page.tsx                          ← Platform overview stats
    accounts/page.tsx                 ← All users (auth admin API + org/team membership join)
    organisations/page.tsx            ← Org list server component
    organisations/OrgTable.tsx        ← Client table with expand + Edit modal
    organisations/OrgEditModal.tsx    ← Plan + limit override modal
    teams/page.tsx                    ← All teams table
    billing/page.tsx                  ← Subscription overview
    usage/page.tsx                    ← Platform metrics + monthly bar charts

  api/
    stripe/checkout/route.ts          ← Stripe Checkout session endpoint for Team Launch and Club 5 subscriptions
    admin/org/update/route.ts         ← POST: change org plan / override limits (admin only)
    auth/redirect/route.ts            ← GET: returns /admin or /coach based on ADMIN_EMAILS after login
    invite/link-account/route.ts      ← POST: directly link an existing auth account to a squad player slot
    team/create/route.ts              ← POST: create a new team + add creator as head_coach (club_admin only)

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
      savedMatches.ts                 ← localStorage-first match persistence + cloud sync trigger
      squadProfile.ts                 ← Squad Profile localStorage-first persistence (cross-match)
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

Theme CSS variables available as Tailwind classes. Default is the dark scheme; a browser-local bright scheme can be selected via the shared theme toggle and is stored in `localStorage` as `fynlwhistle-theme-scheme`.

| Token | Value | Usage |
|---|---|---|
| `bg-background` | #060709 | Base page background (deep near-black) |
| `bg-background-elevated` | #0b0d13 | Elevated surfaces |
| `bg-panel` | #11141d | Cards and panels |
| `bg-panel-2` | #181d27 | Inset / secondary panels |
| `bg-panel-3` | #232a37 | Active sidebar items, focused inputs |
| `text-foreground` | #e4e7ec | Primary text |
| `text-foreground-strong` | #ffffff | Headings / strong text |
| `text-muted` | #9aa3b2 | Secondary text |
| `text-muted-2` | #6b7484 | Tertiary / labels |
| `border-border` | #262d3a | Default borders |
| `border-border-light` | #3a4557 | Hover/active borders |
| `bg-accent` / `text-accent` | #ed6a1f | Primary CTAs, focus rings, brand glow (same orange in both schemes) |
| `text-success` | #22c55e | Success / positive |
| `text-warning` | #f59e0b | Warning / amber |
| `text-danger` | #ef4444 | Danger / destructive |

Body has a radial + linear gradient applied (faint accent-blue glow at top). Buttons get `translateY(-1px)` on hover. Inputs have 0.18s transitions. Shadow tokens are layered (ambient + contact) for visible card depth.

Dark-only rules at the bottom of `globals.css` (scoped under `[data-theme-scheme="dark"]`):
- `.bg-panel` / `.bg-panel-2` / `.bg-panel-3` get a 1px inset top highlight + `var(--shadow-panel)` so panels read as carved out of the background.
- `button.bg-accent` carries an inset highlight and an orange `rgba(237, 106, 31, 0.45)` glow; hover deepens it, active softens it, `:disabled` removes it.
- `button:focus-visible` shows a 3px accent-coloured focus ring (keyboard only).
- Input/select/textarea focus tints the border to accent and shows a 3px ring at 0.28 opacity.

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
- `fynlwhistle.com` footer label

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
- Final score input (Us / Them) above the Submit Match button — optional, persisted in match payload
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

**RosterRow**: `number`, `name`, `position`, `minutes`, `playerId?` (SquadPlayer.id, resolved at roster entry time)

**SquadProfile** (lib/squadProfile.ts — cross-match, persistent): `id`, `teamName`, `coachName`, `primaryColour`, `secondaryColour`, `logoUrl`, `players[]`, `actionSamples[]`, `correctionMemory[]`, `fixtures?[]`, `trainingSessions?[]`, `availabilityResponses?[]`, `sessionLogs?[]`, `leaguePosition?`

**SavedMatchRecord** (lib/savedMatches.ts — local-first, cloud synced): `id`, `createdAt`, `updatedAt`, `matchTitle`, `opponent`, `matchDate`, `activeMode`, `rosterRows[]`, `selectedPlayer`, `events[]`, `reviewQueue[]`, `coachNotes[]`, `clips?`, `showRawTranscript`, `videoStoragePath?`

**ClipAnnotation** (types.ts): `id`, `startTime`, `endTime`, `label`, `category?`, `comment?`, `annotations?` (telestration), `reactions?` (player 👍/🤔), `playerNotes?` (per-player free-text), `createdAt?` (used for "new clips" detection)

**ClipReaction**: `playerId`, `type` (`"got_it"` | `"question"`), `note?` (optional question text), `createdAt`

**ClipPlayerNote**: `playerId`, `text`, `createdAt`, `updatedAt`

**SquadPlayer**: `id`, `fullName`, `preferredName`, `nicknames[]`, `primaryPosition`, `secondaryPositions[]`, `jerseyNumber`, `voiceSamples[]`, `status`, `email?`, `linkedUserId?`

**CorrectionMemoryEntry**: `rawWhisperText`, `resolvedPlayerName`, `resolvedAction`, `count`

---

## Storage

- **Match session:** `localStorage` key `STORAGE_KEY` (defined in constants.ts)
- **Correction memory (v2):** `localStorage` key `CORRECTION_MEMORY_KEY`
- **Squad Profile (cross-match):** `localStorage` key `SQUAD_PROFILE_KEY` (via lib/squadProfile.ts)
- **Onboarding completion:** `localStorage` key `ONBOARDING_COMPLETE_KEY`
- **Current match ID:** `localStorage` (via savedMatches lib)
- **Saved matches list:** `localStorage` first + Supabase `saved_matches` sync (via savedMatches lib and `lib/savedMatchesCloud.ts`), including optional `video_storage_path`
- **Video:** current-device `sessionStorage` blob URL for immediate playback; authenticated head coaches upload match files directly to Cloudflare R2 with server-issued signed URLs
- **Player identity:** `localStorage` key `rugby-player-selected-id` (SquadPlayer.id, via PlayerContext). Authenticated player members are auto-linked from `team_members.player_squad_id`.
- **Cloud storage:** Supabase auth/database for `squad_profiles`, `saved_matches`, `team_members`, `invite_tokens`; Cloudflare R2 for private match video objects.

---

## Important product rules (never break these)

1. **No hardcoded team logic in core product** — keep everything generalisable for any team
2. **Capture page is tagging only** — do not add analytics or clip review to it
3. **Insights is analytics only** — do not add clip review or tagging to it
4. **Review is teaching/review only** — do not add tagging to it
5. **Player logins are scoped by invite** — authenticated player members load their coach's shared team data and only see their own private grades/coaching plan.
6. **Local-first persistence with cloud sync** — saved match records and squad profiles remain local-first; coach accounts sync metadata to Supabase, and match videos are stored in private Cloudflare R2 objects.
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
- ✅ Coach sidebar: left accent bar on active link, FYNL Whistle logo mark, refined transitions
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
- ✅ Inline theme script added to `app/layout.tsx` — reads `fynlwhistle-theme-scheme` from localStorage before React hydrates and sets `data-theme-scheme` on `<html>`; eliminates dark→bright flash on reload for users with bright scheme saved
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
- ✅ Raw JSON export added for known FYNL Whistle localStorage keys
- ✅ Guarded data controls added: clear current match, reset correction memory, clear player identity, and factory reset known FYNL Whistle local data only
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
- ✅ Seed post 1: "Why We Built FYNL Whistle" — Sunday-evening spreadsheet problem, voice-tagging workflow, beta status
- ✅ Seed post 2: "What Good Coaching Feedback Actually Looks Like" — Specific → Contextual → Forward-looking structure, callout examples, lineout example, data as enabler
- ✅ Post 3 (May 2026): "The One Stat Club Coaches Over-Track (and the One They Under-Track)" — opinion post; penalty count vs turnover differential; tag: Analysis; slug: `the-one-stat-club-coaches-under-track`
- ✅ Post 4 (May 2026): "How to Track Turnovers in Rugby (A Coach's Guide)" — reference post (SEO/search-led); what counts as a turnover, two-field logging method, benchmark table, internal link to post 3; tag: Reference; slug: `how-to-track-turnovers-in-rugby`

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

### Batch Y (April 2026) — Supabase Auth
- ✅ `@supabase/supabase-js` + `@supabase/ssr` installed
- ✅ `lib/supabase/client.ts` (browser) + `lib/supabase/server.ts` (server, async cookies)
- ✅ `proxy.ts` (Next.js 16 replacement for middleware.ts) — session refresh on every request; `/coach/*` → 307 to `/login` if no session; `/api/transcribe` + `/api/help-chat` → 401 if no session
- ✅ `/login` and `/signup` pages — email/password, dark-themed, FYNL Whistle logo; check-email confirmation state on signup
- ✅ `app/(auth)/auth/callback/route.ts` — exchanges email confirmation code for session, redirects to `/coach`
- ✅ `app/coach/layout.tsx` — server-side auth guard (redirect to `/login` if no user)
- ✅ Marketing header `LoginDropdown` — auth-aware: "Sign in" + "Try free" when logged out, "Dashboard" when logged in
- ✅ Pricing CTAs — Team Launch and Club 5 "Start 14-day free trial" now link to `/signup?plan=team-launch` / `/signup?plan=club-5` (was `/coach/onboarding`)
- ✅ API routes (`/api/transcribe`, `/api/help-chat`) — server-side auth guard (401 if no user)
- ✅ Coach Settings — "Sign out" button calls `supabase.auth.signOut()` and redirects to `/login`
- ✅ localStorage data unchanged — existing coach data still works after logging in

**Supabase project:** `lkobjxhmuuisbtsmgwwt.supabase.co`
**Tech note:** Next.js 16 renamed `middleware.ts` → `proxy.ts`; export function `middleware` → `proxy`

---

### Batch Z, Part 1 (April 2026) — Cloud Squad Profile
- ✅ `public.squad_profiles` Supabase table planned for manual SQL setup — one row per coach (`user_id` unique), JSONB profile arrays, RLS own-row select/insert/update policies
- ✅ `lib/squadProfileCloud.ts` — browser Supabase helpers for fetch/upsert plus `mergeSquadProfiles()`; maps DB snake_case rows to `SquadProfile` camelCase and silently no-ops on cloud errors
- ✅ `app/coach/SyncSquadProfile.tsx` — client-only coach layout sync: localStorage read, cloud fetch, newest `updatedAt` wins, tie goes to cloud, winner saved locally and pushed up if cloud is absent/stale
- ✅ `app/coach/layout.tsx` — renders `<SyncSquadProfile />` inside the authenticated coach shell before the sidebar
- ✅ `saveSquadProfile()` now remains localStorage-first and fire-and-forget upserts to Supabase via dynamic import; no call sites changed
- ✅ Verification: `npm run lint` passed with existing warning only; `npm run build` passed

---

### Batch Z, Part 2 (April 2026) — Cloud Data Foundation
- ✅ Tracked Supabase SQL added at `supabase/migrations/20260427000000_cloud_data_foundation.sql` for `squad_profiles`, `saved_matches`, indexes, and RLS own-row policies
- ✅ `lib/savedMatchesCloud.ts` added — browser Supabase helpers for fetch/upsert/delete plus `mergeSavedMatches()` newest-`updatedAt` conflict resolution
- ✅ `app/coach/SyncSavedMatches.tsx` added — authenticated coach shell merges local/cloud saved matches and backfills stale or missing cloud rows
- ✅ `savedMatches.ts` remains localStorage-first and now fire-and-forget upserts/deletes cloud records without blocking the UI
- ✅ Saved Matches delete now removes local data immediately and requests cloud deletion in the background
- ✅ Stale no-account/no-cloud copy updated across coach settings/help, help chat, saved matches, coach home, compare, and marketing/about/blog CTAs
- ✅ Video remained out of scope for Part 2: clips/annotations sync as match metadata; file storage landed in Part 3

---

### Batch Z, Part 3 (April 2026) — Cloud Video, Team Invites, Player Sync
- ✅ Cloud sync helpers added: `syncAllLocalMatchesToCloud()` and `syncLocalSquadProfileToCloud()` power automatic sync and the Coach Settings "Sync Now" panel
- ✅ Supabase Storage migration added for private `match-videos` bucket plus `saved_matches.video_storage_path`; `lib/matchVideoCloud.ts` handles upload progress, signed URLs, and deletion helper
- ✅ Capture video uploads now queue until a match ID exists, then save `videoStoragePath` on the saved match record. Original implementation used Supabase Storage; Batch AO superseded it with Cloudflare R2.
- ✅ Coach Review, Player Review, and Player Game Detail can fall back to signed cloud video URLs when no local blob URL exists
- ✅ Team invite migration added for `team_members` and `invite_tokens` with RLS for coach ownership and accepted-member read access to squad profiles, saved matches, and coach videos
- ✅ Invite flow added: `/api/invite`, `/api/invite/redeem`, `/invite/accept`, token-aware `/login` and `/signup`, and auth callback redemption after email confirmation
- ✅ `/coach/team` added with player/coach invite form, optional coach labels (Head / Forwards / Backs / 2nd team / custom), optional head-coach permissions for invited coaches, squad-player linking, member list, revoke action, editable team name, and Coach sidebar link
- ✅ Invite creation falls back to the legacy `team_members` payload if production Supabase is missing `coach_label` / `can_manage_team`; invite still sends, but labels/head permissions require migrations `20260427000003` and `20260427000004`
- ✅ Player auth identity now syncs through `SyncPlayerData`: accepted player members auto-set `rugby-player-selected-id`, fetch the coach's squad profile and saved matches, and skip manual player picking
- ✅ Cloud write guards added so only head coach/data-owner accounts upsert or delete saved matches and squad profiles; player and assistant accounts read shared data only
- ✅ Server-only `SUPABASE_SERVICE_ROLE_KEY` support added for safely writing `SquadPlayer.linkedUserId` back to the coach-owned squad profile after invite acceptance
- ✅ Verification: `git diff --check`, `npm run lint`, and production `npm run build` passed after wrapping query-param auth pages in Suspense for Next 16

---

### Batch AA (April 2026) — Review set-piece tags
- ✅ Shared `setPieceReview.ts` helper derives read-only review moments from saved scrum and lineout tags
- ✅ Coach Review now shows auto-generated Set-piece tags beside the clip playlist, split by Scrum / Lineout with Own / Opposition checkbox filters
- ✅ Player Review shows the same set-piece tags per match alongside coach clips, using the same filters and seek-to-video behaviour when a video is available
- ✅ Manual clips remain unchanged; set-piece tags are generated from match events and are not persisted as new clips
- ✅ Verification: `git diff --check`, `npm run lint`, and `npm run build` passed

### Batch AB (April 2026) — Video upload finalising state
- ✅ Capture video upload status now distinguishes bytes sent from confirmed cloud storage: 100% displays as "Finalising cloud save..." until the saved match has `videoStoragePath`
- ✅ Direct Supabase Storage uploads now time out while finalising and retry through the Supabase client fallback instead of leaving the UI stuck at 100%
- ✅ Completion signal remains "Synced to cloud"; if both upload paths fail, the capture page shows the returned storage error

---

### Batch AD (April 2026) — Video upload and cross-account streaming fixes

Two implementation bugs that blocked reliable video upload and cross-account playback:

**Bug 1 (upload timeout):** XHR upload timeout was hardcoded to 120 s — any video larger than ~500 MB at typical home internet speeds would always fail silently. Fixed by setting `DIRECT_UPLOAD_TIMEOUT_MS = 0` (unlimited); the browser still fires `error` events on genuine network failures.

**Bug 2 (signed URL expiry with no recovery):** All three playback pages requested signed URLs with a 4-hour expiry and had no `onError` handler. An expired or failed cloud URL would silently break the video element with no recovery path. Fixed by increasing expiry to 24 hours and wiring `onError` refresh on all three `<video>` elements.

- ✅ `lib/matchVideoCloud.ts` — upload timeout set to 0 (unlimited); `SIGNED_URL_EXPIRY_SECONDS = 86400` exported as shared constant; `refreshVideoSignedUrl()` exported for use by all playback pages
- ✅ `app/coach/review/page.tsx` — signed URL expiry updated to 24 hr; `onError` re-fetches a fresh cloud URL when the current one expires; loading hint suppressed while cloud fetch is in flight; "unavailable" vs "not-yet-loaded" states distinguished
- ✅ `app/player/review/page.tsx` — 24 hr expiry; per-match loading spinner while cloud URL is fetching; `onError` re-fetches fresh URL per match
- ✅ `app/player/games/[gameId]/page.tsx` — 24 hr expiry; loading spinner while cloud fetch is in flight; `onError` re-fetches on failure
- ✅ Cross-account video access already correctly enabled by RLS (migration 20260427000002 "Team member can read coach videos" policy) — no schema changes needed
- ✅ Verification: `npm run lint` clean, `npm run build` passed

**Video stack (current):**
- Storage: Cloudflare R2 private bucket, object key `{owner_user_id}/{match_id}/{timestamp}-{uuid}-{filename}`
- Upload: browser XHR direct to an R2 signed PUT URL from `/api/match-video/upload-url`, head-coach only
- Playback: R2 signed GET URLs from `/api/match-video/signed-url`, 24 hr expiry, auto-refresh on error
- Delete: `/api/match-video/delete` removes the R2 object when replacing a video or deleting a saved match
- Access control: Supabase auth/team membership checked by server route before issuing any R2 signed URL. Accepted team members can read videos in their coach owner's folder; only coaches with `can_manage_team` can upload/delete.
- No transcoding — raw video file served via HTTP range requests (adequate for private beta)

**Cloudflare R2 setup required:**
1. Create a private R2 bucket, e.g. `fynl-whistle-match-videos`.
2. Create an R2 API token with object read/write permissions for that bucket.
3. Add Vercel env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
4. Configure bucket CORS to allow the production origin `https://fynlwhistle.com` and local dev origin `http://localhost:3000` with methods `GET`, `PUT`, `HEAD`, `DELETE`; allowed headers should include `content-type`; expose headers should include `etag`, `content-length`, `content-range`, `accept-ranges`.
5. Redeploy after env vars are set. Settings → Cloud sync will warn if R2 env vars are missing.

**Why not Cloudflare Stream:** R2 removes the Supabase free-tier upload cap with the smallest architecture change. Cloudflare Stream adds transcoding/HLS/CDN but requires a deeper migration to video IDs and Stream playback. Revisit when: >50 hrs of stored video, mobile adaptive streaming needed, or raw-file playback becomes unreliable.

---

### Batch AO (April 2026) — Cloudflare R2 match video storage

- ✅ `lib/matchVideoCloud.ts` now uses app server routes for R2 signed upload/playback/delete URLs instead of Supabase Storage.
- ✅ Server-only R2 signer added in `lib/r2.ts`; no R2 credentials are exposed to the browser.
- ✅ New routes: `/api/match-video/upload-url`, `/api/match-video/signed-url`, `/api/match-video/delete`, `/api/match-video/config`.
- ✅ Object keys use `{owner_user_id}/{match_id}/{timestamp}-{uuid}-{sanitized_filename}` and continue to be stored in existing `SavedMatchRecord.videoStoragePath` / `saved_matches.video_storage_path`.
- ✅ Security model: Supabase session + team membership decide access before issuing R2 signed URLs. Players/accepted members can read owner-folder videos; only `can_manage_team` coaches can upload/delete.
- ✅ Local browser video behaviour is unchanged: Capture still uses the selected file's blob URL immediately, then uploads in the background.
- ✅ Saved match deletion and video replacement now request R2 object deletion in the background and log clear delete errors.
- ✅ `lib/cloudHealth.ts` no longer probes Supabase Storage; Settings checks whether R2 env vars are configured.
- ⚠ Existing Supabase Storage video objects are not automatically copied. To preserve old cloud playback, copy objects from Supabase `match-videos` into R2 using the same `videoStoragePath` keys.

---

### Batch AC (April 2026) — Cloud sync error surfacing and schema diagnostics

Root cause of all cross-device sync failures identified and fixed: all 5 Supabase migrations were unapplied in production, and every cloud error was silently swallowed so Settings always showed "Synced" even when nothing reached the database.

- ✅ `lib/savedMatchesCloud.ts` — all functions now return `{ ok, error? }` / `{ records, error? }` / `{ count, errors[] }` instead of void/null; errors are surfaced to callers
- ✅ `lib/squadProfileCloud.ts` — same error-surfacing pattern applied to all functions
- ✅ `lib/teamContext.ts` — no longer permanently caches `null` on a transient JS exception; a failed lookup retries next call
- ✅ `lib/cloudHealth.ts` (new) — probes `squad_profiles`, `saved_matches`, `team_members`, `video_storage_path` column, and video storage readiness; Batch AO updated this to check R2 env configuration instead of the old Supabase Storage bucket.
- ✅ `app/coach/SyncSavedMatches.tsx` — dispatches `rugbycoach-cloud-sync-error` CustomEvent when background sync fails so Settings can surface it without a manual click
- ✅ `app/coach/SyncSquadProfile.tsx` — updated to use new `{ profile }` destructured return from `fetchCloudSquadProfile`
- ✅ `app/player/SyncPlayerData.tsx` — membership and fetch errors now logged to `console.error` with `[SyncPlayerData]` prefix for Vercel/devtools visibility
- ✅ `app/coach/settings/page.tsx` — "Sync Now" shows "Sync failed" with error text when any write fails; amber schema warning panel when tables/columns/bucket are missing; new "Check Cloud" diagnostic button shows live user ID, local match count, and cloud match count; `clearTeamContextCache()` called on sync and sign-out; `useEffect` added for schema check on mount and sync-error event listener
- ✅ `upsertCloudSavedMatch` gracefully retries without `video_storage_path` if migration 001 column is absent (error code `42703`)
- ✅ Production Supabase: all 5 migrations applied manually via SQL editor; `saved_matches`, `squad_profiles`, `team_members`, `invite_tokens` tables live with correct RLS; `match-videos` bucket created
- ✅ Verification: `npm run lint` clean, `npm run build` passed, deployed to Vercel

---

---

### Batch AE (April 2026) — Full codebase audit, cleanup and QA pass

Full audit of all 50 routes, code quality sweep, and safe cleanup pass. Build and lint clean throughout.

**Cleaned up:**
- ✅ Removed 5 orphaned redirect-stub directories (`/game-review`, `/squad`, `/team-dashboard`, `/player-dashboard`, `/saved-matches`) — legacy stubs left over from architecture migration; routes dropped from 50 → 45
- ✅ Fixed duplicate `createClient` import alias in `app/coach/settings/page.tsx`
- ✅ Added `typecheck` script to `package.json` (`tsc --noEmit`)
- ✅ Removed 5 unused default Next.js SVGs from `public/`
- ✅ Verification: `npm run lint` clean, `npm run build` clean (45 routes, 0 TypeScript errors)

**Flagged but not changed (risks for next stage):**
- No `middleware.ts` — auth protection is client-side only; admin and coach routes have no server-side auth guard
- Admin pages render as static (○) — should be dynamic with server-side auth check
- `app/coach/capture/page.tsx` is 3,445 lines — maintenance risk as feature grows
- No automated test suite
- Stripe checkout is wired for USD Team Launch and Club 5; GBP/AUD/EUR price IDs remain `"price_TODO"` until those Stripe prices are created
- Contact form not wired to any backend
- `public/` is now empty — no brand logo or open graph images

**Architectural decisions raised:**
1. **Video file size limit** — resolved in Batch AO by moving new match video upload/playback/delete flows from Supabase Storage to Cloudflare R2 signed URLs. Existing saved match records keep `videoStoragePath`; old Supabase-hosted objects require manual migration to R2 if they need continued cloud playback.
2. **Invite flow redesign** — current email-based invite depends on Resend domain verification and direct delivery. Agreed to redesign as link-based flow: coach generates shareable link → anyone signs up via link → picks their player from squad list or creates one → coach approves. See next steps below.

---

### Batch AF (April 2026) — Rebrand to FYNL Whistle

- ✅ All "RugbyCoach" text replaced with "FYNL Whistle" across all 20 affected files
- ✅ `NEXT_PUBLIC_APP_URL` updated to `https://fynlwhistle.com` — invite links now generate correct public URLs
- ✅ Email sender updated to `FYNL Whistle <noreply@fynlwhistle.com>` (Resend domain verification for fynlwhistle.com still needed)
- ✅ localStorage and CustomEvent keys migrated: `rugbycoach-*` → `fynlwhistle-*` across `ThemeSchemeToggle`, `SyncSavedMatches`, and `settings/page.tsx`
- ✅ "Private beta" labels removed from all layouts, sidebars, marquees, and CTAs; replaced with "Live" / "Now live" / "Free to use"
- ✅ Blog post slug updated: `why-we-built-rugbycoach` → `why-we-built-fynl-whistle`
- ✅ AI system prompts (help-chat route + FloatingHelpChat) updated to reference FYNL Whistle
- ✅ JSON-LD structured data on blog posts updated (author/publisher name)
- ✅ PROJECT_CONTEXT.md updated throughout

**Note:** Existing users will have their theme preference reset (localStorage key changed). Resend email sending requires `fynlwhistle.com` domain verification with SPF/DKIM/DMARC DNS records before invite emails will send reliably.

---

### Batch AG (April 2026) — Link-based invite system, auth hardening, edge guards

- ✅ **Link-based invite system** — replaces email-only invites with shareable join links
  - `/coach/team` — coach generates a join link (no email required); pending approval queue with accept/reject per row
  - `/invite/join` + `JoinForm.tsx` — full unauthenticated join journey: view link → sign up/log in → pick squad player or self-add → pending state
  - `join_token` threaded through login, signup, and auth callback so email-confirm flow lands back on the join page
  - API routes added: `POST/DELETE /api/invite/link`, `GET/POST /api/invite/join`, `POST /api/invite/approve`, `POST /api/invite/reject`
  - `lib/teamMembersCloud.ts` — extended with link invite helpers
  - Supabase migration `20260427000005_link_invites.sql` — `team_invite_links` table with RLS
  - Existing email invite flow (`/api/invite`) retained and updated: now returns `500` when Resend is not configured instead of silently succeeding (prevents false-positive "invite sent" UX)
- ✅ **Auth hardening — player and admin layouts** — `/player/layout.tsx` and `/admin/layout.tsx` now have server-side auth guards that redirect unauthenticated users to `/login`; admin additionally gates on `ADMIN_EMAILS` env var allowlist
- ✅ **Edge auth guard extended** — `proxy.ts` matcher and redirect guard extended to cover `/player/*` and `/admin/*` in addition to `/coach/*`; all three platform areas now protected at both edge and layout level

---

### Batch AH (April 2026) — Invite link anon RLS fix

- ✅ `supabase/migrations/20260429000000_fix_invite_link_anon_rls.sql` — adds two missing anon SELECT policies
- ✅ `team_invite_links` anon SELECT policy — unauthenticated users (new browser, no session) can now look up a link by token; previously RLS blocked the query and the join page always showed "INVALID LINK"
- ✅ `squad_profiles` anon SELECT policy — unauthenticated join page can now display the team name ("Join Northside RFC") instead of falling back to "You've been invited"
- No application code changes — page and API logic was already correct; root cause was the missing `to anon` policy on the table

---

### Batch AI (April 2026) — Email confirmation redirect fix + forgot password

- ✅ **Email confirmation redirect** — root cause identified: Supabase dashboard Site URL was still `localhost:3000` and `https://fynlwhistle.com/auth/callback` was not in the Redirect URLs allowlist, so Supabase ignored the `emailRedirectTo` value and redirected to localhost. Fix: set Site URL to `https://fynlwhistle.com` and add `https://fynlwhistle.com/auth/callback` (+ wildcard variant) to Redirect URLs in Supabase Auth settings. Also confirm `NEXT_PUBLIC_APP_URL=https://fynlwhistle.com` is set in Vercel Production env vars (`.env.local` is local-only).
- ✅ **Forgot password link** — "Forgot password?" link added inline with the Password label on `/login`
- ✅ `app/(auth)/forgot-password/page.tsx` — new page: user enters email, calls `supabase.auth.resetPasswordForEmail()` with `redirectTo: .../auth/callback?next=/reset-password`; shows "Check your email" confirmation state regardless of whether the address exists (avoids enumeration)
- ✅ `app/(auth)/reset-password/page.tsx` — new page: enter + confirm new password, calls `supabase.auth.updateUser({ password })`; guards against no-session state (redirects to `/forgot-password?error=expired`); redirects to `/coach` on success
- ✅ Existing auth callback at `app/(auth)/auth/callback/route.ts` required no changes — already handles `?next=` redirects

**Supabase dashboard actions required (one-time manual steps):**
1. Auth → URL Configuration → Site URL: `https://fynlwhistle.com`
2. Auth → URL Configuration → Redirect URLs: add `https://fynlwhistle.com/auth/callback` and `https://fynlwhistle.com/auth/callback?*`
3. Vercel → Project Settings → Environment Variables: `NEXT_PUBLIC_APP_URL=https://fynlwhistle.com` (Production)

---

### Batch AK (April 2026) — Dark mode premium refresh

- ✅ `app/globals.css` token-only update — no component changes
- ✅ `--foreground-strong` → `#ffffff` (pure white headings, Linear/Vercel feel)
- ✅ `--accent` → `#3b8ef0` (vivid blue, replaces muted cool-grey)
- ✅ `--success / --warning / --danger` brightened (`#4ade80` / `#fbbf24` / `#f87171`) — status colours now pop
- ✅ Panel depth increased: `--background` / `--panel` / `--panel-2` / `--panel-3` darkened and differentiated
- ✅ Border contrast improved (`--border` / `--border-light` sharper)
- ✅ Shadows deepened (`--shadow-soft` / `--shadow-panel` now `rgba(0,0,0,0.45/0.35)`)
- ✅ Focus glow ring upgraded: `box-shadow: 0 0 0 3px rgba(59,142,240,0.18)` on all inputs/selects/textareas
- ✅ Body radial gradient: faint blue accent glow at top instead of white

---

### Batch AJ (April 2026) — Quick UX wins

- ✅ **A: Match switcher on Insights** — `selectedMatchId` state + `<select>` dropdown in page header; only shown when 2+ saved matches exist; switching shows full analytics for the chosen match without leaving the page; `effectiveMatchId = selectedMatchId ?? currentMatchId` falls back to current active match
- ✅ **B: Match + player picker on Players page** — `useSyncExternalStore` for saved matches added to Players page; `selectedMatchId` state drives roster and events via `useMemo`; match `<select>` dropdown shown above player picker when 2+ matches saved; switching match resets player selection to first player in that match
- ✅ **C: Skip button on TeamSheetModal** — `onSkip?: () => void` prop added; "Skip for now" button (muted style, left-aligned) rendered when prop provided; `capture/page.tsx` passes `onSkip={() => setShowTeamSheetModal(false)}`
- ✅ **D: Show/hide password toggle** — `showPassword` state + eye SVG button added to `/login` and `/signup`; `tabIndex={-1}` so it doesn't interrupt keyboard flow
- ✅ **E: Account section on Coach Settings** — logged-in email fetched on mount from `supabase.auth.getUser()`; shown in Account section above sign-out; "Change password" button calls `resetPasswordForEmail()` and shows inline "Check your email" confirmation

---

### Batch AL (April 2026) — PDF match report

- ✅ `@react-pdf/renderer` installed as new dependency
- ✅ `app/rugby-tagging/lib/exports/matchReportPdf.tsx` — A4 portrait PDF document component; sections: FYNL Whistle header + match title/date/opponent, 8-KPI grid (tackle%, tries for/against, penalties, lineout%, scrum%, carries, turnovers), game coaching comment + game flow summary, top performers + needs attention players, full colour-coded player stats table (T/MT/C/TO/Tackle%/Grade/Comment), footer
- ✅ `app/rugby-tagging/lib/exports/downloadPdf.ts` — browser download helper mirroring `downloadWorkbook.ts`
- ✅ `app/coach/insights/page.tsx` — "Export PDF" button added next to existing "Export Report" button in page header; dynamically imports PDF generator so `@react-pdf/renderer` stays out of SSR bundle; shows "Generating…" loading state during export

---

### Batch AM (April 2026) — Stripe checkout foundation

- ✅ `stripe` SDK installed
- ✅ `app/api/stripe/checkout/route.ts` — authenticated Stripe Checkout session endpoint for subscription mode with 14-day trial; returns `401` for logged-out users, validates missing/TODO price IDs, and falls back to request origin if `NEXT_PUBLIC_APP_URL` is missing
- ✅ `app/(marketing)/pricing/PricingExperience.tsx` — Team Launch and Club 5 CTAs now call `/api/stripe/checkout`; unauthenticated users fall back to login; invalid placeholder prices fail safely; Organisation remains a contact/demo CTA
- ✅ `app/(marketing)/pricing/pricingConfig.ts` — test-mode Stripe Price IDs added for Team Launch and Club 5; each Price has manual currency options for USD, AUD, EUR, and GBP:
  - Team Launch monthly: `price_1TRsWbQL0gCVdJZirakOuwQY`
  - Team Launch yearly: `price_1TRsZDQL0gCVdJZit1TBHsuS`
  - Club 5 monthly: `price_1TRsb9QL0gCVdJZiCwAZYVx2`
  - Club 5 yearly: `price_1TRsbAQL0gCVdJZiMeFb2sv0`
- ✅ `app/coach/page.tsx` — `/coach?checkout=success` shows a dismissible trial-started banner and cleans the URL
- ✅ Vercel Production `STRIPE_SECRET_KEY` configured with the matching Stripe test-mode secret key
- ✅ End-to-end test checkout verified in Stripe sandbox: pricing CTA → login/session → Stripe Checkout → trial checkout flow
- ✅ Verification: `npm run lint` clean, `npm run build` clean

**Still required before full production payments:**
- Create live-mode Stripe Prices with the same manual currency options, then replace the four test-mode `price_...` IDs in `pricingConfig.ts`
- Switch Vercel Production `STRIPE_SECRET_KEY` to the matching `sk_live_...` key only when live price IDs are in place
- Optional later batch: add Stripe webhook + subscription table if/when access needs to be gated by active subscription status

---

### Batch AN (April 2026) — Production email reliability

- ✅ `app/api/invite/route.ts` — direct coach invite emails now inspect the Resend SDK `{ error }` response and return `502` if Resend rejects the send, preventing a false-positive "Invite sent" UI state.
- ✅ Sender remains `FYNL Whistle <noreply@fynlwhistle.com>`.
- ✅ DNS inspection confirms `fynlwhistle.com` nameservers are Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
- ✅ DNS inspection confirms existing Resend-style records:
  - `send.fynlwhistle.com` TXT: `v=spf1 include:amazonses.com ~all`
  - `send.fynlwhistle.com` MX: `10 feedback-smtp.ap-northeast-1.amazonses.com`
  - `resend._domainkey.fynlwhistle.com` TXT: DKIM public key present
- ⚠️ DNS inspection found no `_dmarc.fynlwhistle.com` TXT record yet; add `v=DMARC1; p=none;` in Vercel DNS for the first monitoring pass.
- ⚠️ Manual dashboard steps still required:
  - Resend → Domains → verify `fynlwhistle.com` until status is `verified`.
  - Vercel → DNS → add missing `_dmarc` TXT if not already added.
  - Supabase Auth → URL Configuration → confirm Site URL `https://fynlwhistle.com` and redirect URLs `https://fynlwhistle.com/auth/callback` plus `https://fynlwhistle.com/auth/callback?*`.
  - Supabase Auth → SMTP / Custom SMTP → enable Resend SMTP: host `smtp.resend.com`, port `465` SSL/TLS or `587` STARTTLS, username `resend`, password `RESEND_API_KEY`, sender email `noreply@fynlwhistle.com`, sender name `FYNL Whistle`.
  - Vercel Production env vars → confirm `RESEND_API_KEY` and `NEXT_PUBLIC_APP_URL=https://fynlwhistle.com`.
- Production smoke tests to run after manual dashboard/DNS steps:
  - `/coach/team` direct invite email arrives from `FYNL Whistle <noreply@fynlwhistle.com>` and opens `https://fynlwhistle.com/invite/accept?...`.
  - Fresh signup confirmation email arrives through Supabase/Resend SMTP and redirects to production, not localhost.
  - Password reset email arrives and opens `https://fynlwhistle.com/auth/callback?next=/reset-password`.

### Batch AP (May 2026) — Player invite claim + team access admin controls

- ✅ Email player invites now stay player-scoped through signup/login instead of falling back to coach onboarding/dashboard.
- ✅ `/invite/accept` now shows authenticated player invitees a player-claim screen where they can choose their squad profile or create a basic new player profile if missing.
- ✅ Invite redemption is centralized through `lib/inviteServer.ts`; `/api/invite/redeem` accepts optional `playerSquadId` / `displayName`, links existing players, or creates and links a new active player.
- ✅ Player picker layout widened into a full player-app page with responsive grid cards instead of a narrow centered list.
- ✅ Coach Team Access now shows joined/invited/request counts and per-member admin actions: change pending invite email, resend invite, send password reset to joined members, and revoke access.
- ✅ Revoking a player member now also unlinks that user from the squad player record.
- ✅ Verification: `npm run typecheck` passed; `npm run build` passed.

### Batch AR (May 2026) — Dashboard rebuild (fixtures, training, availability, AI chat)

- ✅ Coach dashboard rebuilt with: next fixture card, this week's training sessions, availability response summary, post-session check-in card, and embedded AI coaching chat
- ✅ `Fixture`, `TrainingSession`, `AvailabilityResponse`, `SessionLog` types added to `app/rugby-tagging/types.ts`
- ✅ `SquadProfile` extended with `fixtures?`, `trainingSessions?`, `availabilityResponses?`, `sessionLogs?`, `leaguePosition?`
- ✅ `/coach/team-setup` extended with fixture management (add/edit/delete) and recurring training session management (add by day-of-week, time, location)
- ✅ `/player/availability` added — player availability picker for upcoming fixtures and training sessions
- ✅ `DashboardChat.tsx` — embedded AI assistant chat in coach dashboard using streaming GPT-4o-mini responses with squad context injected
- ✅ `app/api/help-chat/route.ts` — context-aware streaming chat endpoint with full FYNL Whistle system prompt
- ✅ **Cloud sync fix** — `lib/squadProfileCloud.ts` updated to map all new fields (`fixtures`, `training_sessions`, `availability_responses`, `session_logs`, `league_position`) to/from Supabase; these fields were missing from the original sync code so data was only stored in localStorage
- ✅ Migration `supabase/migrations/20260501000000_squad_profile_new_fields.sql` — adds the 5 new columns to `squad_profiles`

**Manual SQL step required:** Run `supabase/migrations/20260501000000_squad_profile_new_fields.sql` in the Supabase SQL editor to add the new columns before the sync will work.

### Batch AQ (May 2026) — Personal player invite copy + role guards

- ✅ Player email invite landing is now personalized with invited player, coach, and team context where available.
- ✅ Wrong-account invite opens now show a clear “this invite is for…” state with a sign-out/continue action instead of letting the coach session muddle the flow.
- ✅ Player invite signup hides the coach name field, locks the invited email, and stores player-safe metadata instead of `coach_name`.
- ✅ Player invite login locks the invited email and points wrong-email users back to the invite flow.
- ✅ Auth callback returns unresolved invite confirmations to `/invite/accept` instead of falling back to `/coach`.
- ✅ Server-side role guards redirect accepted players away from `/coach` to `/player`, and accepted assistant coaches away from `/player` to `/coach`.
- ✅ Verification: `npm run typecheck` passed; `npm run build` passed.

---

### Batch AY (May 2026) — Player page data fix: RLS + playerId on RosterRow

Two-part fix for player pages (Home, Games, Performance) silently showing empty data.

**Fix 1 — Supabase RLS:** `squad_profiles` and `saved_matches` SELECT policies only allowed the coach (owner) to read their own rows. Players querying via `SyncPlayerData` got empty results with no error. Added migration `20260501000003_player_read_access.sql` with a `can_read_team_data()` helper function and new SELECT policies allowing any accepted team member to read their coach's data.

**Fix 2 — playerId on RosterRow:** All player-page match filtering used exact string equality (`r.name === player.fullName`). Any name mismatch (nickname, capitalisation, abbreviation) caused silent zero matches. Added `playerId?: string` to `RosterRow` and `ReportRow`; resolved at roster entry time (team sheet paste and inline name edits in Capture); all player-page filtering now checks ID first with name fallback.

- ✅ `supabase/migrations/20260501000003_player_read_access.sql` — `can_read_team_data()` function + SELECT policies for squad_profiles and saved_matches
- ✅ `app/rugby-tagging/types.ts` — `playerId?` added to `RosterRow` and `ReportRow`
- ✅ `app/rugby-tagging/helpers.ts` — `hydrateRosterRows` preserves playerId; `parseTeamSheetText` accepts `squadPlayers?` and resolves IDs; `buildReportRowsFromMatch` propagates playerId to ReportRow
- ✅ `app/coach/capture/page.tsx` — `updateRosterRow` resolves playerId on name change; `parseTeamSheetText` calls pass squad players
- ✅ `app/player/page.tsx`, `games/page.tsx`, `performance/page.tsx`, `compare/page.tsx`, `games/[gameId]/page.tsx` — ID-first matching with name fallback throughout; game detail page uses roster name for event filtering

**Manual step required:** Run `supabase/migrations/20260501000003_player_read_access.sql` in the Supabase SQL editor.

---

### Batch AZ (May 2026) — Video loading 403 fix + R2 path organisation

**Fix — Video access 403 ("You do not have access to this match video"):**

Root cause: `getServerTeamContext()` resolved `ownerUserId` from the `team_members` table. If the coach also has an accepted membership in another team, `ownerUserId` returned that other team's coach ID — not their own — causing the ownership check to fail for their own videos.

Added `userId: string` to `MyTeamContext` (the authenticated user's own stable auth ID, always `user.id`). Video ownership checks now use this correctly:
- **Upload path** keyed on `ctx.userId` so coach videos always live under the uploader's own ID
- **Signed URL**: grants access if video owner matches `ctx.userId` (direct owner) **or** `ctx.ownerUserId` (team member accessing their coach's video)
- **Delete**: restricted to `ctx.userId` only — team members cannot delete the coach's videos

No DB migration required. Existing video paths (stored as `{coachId}/{matchId}/...`) remain valid — `isValidR2ObjectKey` requires ≥3 segments and the owner is still the first segment.

**Improvement — R2 path organisation:**

New uploads use a human-readable folder derived from the match title, opponent, and date instead of a raw `matchId` UUID. Example: `{userId}/round_2_vs_hunter_wildfires_18_04_2026/{timestamp-uuid}-recording.mp4`. Old paths are fully backward-compatible.

- ✅ `lib/teamContext.ts` — `userId` added to `MyTeamContext` type; both return paths in `getMyTeamContext()` include it
- ✅ `lib/serverTeamContext.ts` — both return paths include `userId: user.id`
- ✅ `app/api/match-video/upload-url/route.ts` — uses `ctx.userId` for path; accepts optional `matchTitle` in body
- ✅ `app/api/match-video/signed-url/route.ts` — checks `videoOwner !== ctx.userId && videoOwner !== ctx.ownerUserId`
- ✅ `app/api/match-video/delete/route.ts` — checks `videoOwner !== ctx.userId`
- ✅ `lib/r2.ts` — `createMatchVideoObjectKey` accepts optional `matchTitle`; falls back to sanitised `matchId`
- ✅ `lib/matchVideoCloud.ts` — `uploadMatchVideoWithResult` / `uploadMatchVideo` forward `matchTitle`
- ✅ `app/coach/capture/page.tsx` — composes `pathTitle` from matchTitle + opponent + matchDate and passes to upload

---

### Batch BA (May 2026) — Player dashboard rebuild + availability reasons

**AvailabilityResponse type extended:**
- `id: string` added (generated with `crypto.randomUUID()` on first write)
- `note?` renamed to `reason?` — free-text field populated only when `response === "unavailable"`
- `app/player/availability/page.tsx` updated to generate and preserve `id` in `upsertResponse`

**Player dashboard — `app/player/page.tsx` rebuilt:**
Full replacement of the minimal match-summary page with a proper six-section dashboard. All sections use `useSyncExternalStore` for storage reads (no `useEffect + setState`). Data sources: `subscribeSquadProfile` + `SQUAD_PROFILE_KEY` for team/availability data; `subscribeSavedMatchesChanged` + `SAVED_MATCHES_KEY` for match stats.

Sections:
1. **Header** — time-of-day greeting, team + position, amber badge counting unanswered events
2. **Availability** — upcoming fixtures + training sessions; fixtures use "Available/Unavailable/Maybe" labels, training uses "Going/Can't make it/Maybe"; tapping the negative option expands an inline reason input (not a modal); after Save the row shows the coloured response + "Change" link; available/maybe responses save immediately
3. **Season at a glance** — 4 metric cards: latest grade, tackle % with trend indicator, carries with season avg, games count
4. **Next game + last grade** — two-column row; left: next fixture from profile (date/opponent/home-away/time/days until); right: grade badge + last opponent + date, linked to `/player/games/[id]`
5. **Coach feedback** — left blue-border accent card; "What went well" + "Focus area" from `buildPlayerCoachingPlan()`
6. **Targets this week** — up to 3 targets from `coachingPlan.nextWeekTargets`; small blue dot + target text
7. **Stats last game** — table of tackles, missed tackles, carries, turnovers won, minutes; trend indicator per stat vs season average (↑ green / ↓ red / → muted)

**Coach dashboard — `app/coach/page.tsx` updated:**
- Next fixture details panel: "Can't make it" now lists each player individually with reason inline (`— "reason text"`)
- Training sessions this week: each row gets a "Details" toggle when any responses exist; breakdown shows Going/Can't make it (with reasons)/Maybe/No reply
- Upcoming fixtures list: same expandable "Details" per row with full player breakdown and reasons for unavailable players
- Two new state vars: `expandedFixtureId: string | null`, `expandedSessionId: string | null`

---

### Batch BB (May 2026) — Player game detail: involvement playlist fix + full-screen layout

**Bug fix — involvement playlist showing 0 events:**
Root cause: event resolution used a different lookup path than `buildBasicStats`. Player events were filtered using exact name matching, but roster entries used `playerName` from voice tags (which may not match `fullName`). Fixed by mirroring the same fuzzy-match and playerId resolution logic used in `buildBasicStats` throughout the event filter.

- ✅ `playerEvents()` function in `games/[gameId]/page.tsx` — resolves event's `playerName` against full roster via `findMatchingPlayer()` and applies ID-first + name-fallback matching to correctly attribute events to the current player
- ✅ Event text fallback — `event.text` used as secondary resolution source when `playerName` is absent or doesn't match

**Layout redesign — full-screen two-column:**
- ✅ Removed `max-w-3xl` single-column constraint from `app/player/games/[gameId]/page.tsx`
- ✅ Page is now `flex flex-col h-full overflow-hidden` — fills the full viewport within the sidebar layout
- ✅ Header (back link + match title + grade) pinned at the top, full width
- ✅ Left column (`flex-1 overflow-y-auto`): video player, stats grid, set piece, coaching plan, footer note — scrolls independently
- ✅ Right column (`w-[360px] border-l overflow-y-auto`): involvement playlist — event list with no max-height cap, scrolls independently; Previous/Next buttons and current-clip card retained
- ✅ The `max-h-[460px]` scroll cap on the event list removed — right column itself is the scroll container

---

### Move 2 (May 2026) — Multi-tenant foundation: Organisation → Team model

Full migration from `squad_profiles` table to new `organisations` + `teams` schema.

- ✅ `supabase/migrations/20260503000000_multi_tenant_foundation.sql` — new `organisations` and `teams` tables replace `squad_profiles`; `teams` stores all JSONB arrays (players, fixtures, training_sessions, availability_responses, session_logs); RLS on all tables; `upsert_player_availability` RPC updated to use `p_team_id`
- ✅ `lib/teamCloud.ts` — new `fetchCloudTeam`, `upsertCloudTeam`, `upsertPlayerAvailabilityResponse`, `syncLocalTeamToCloud`, `mergeTeams`; maps `teams` DB rows to `Team` camelCase type; backwards-compat aliases retained
- ✅ `app/rugby-tagging/lib/team.ts` — `Team` type replaces `SquadProfile`; `getTeam`/`saveTeam`/`saveTeam` write to `TEAM_KEY` (`fynlwhistle-team`); one-time migration from old `SQUAD_PROFILE_KEY` on first read; deprecated aliases exported for gradual callsite migration
- ✅ `lib/teamContext.ts` — `getMyTeamContext` queries `team_members` for `team_id`, `role`, `can_manage_team`, and `created_by_user_id`; in-memory cache (CACHE_VERSION-gated); `clearTeamContextCache()` exported
- ✅ `app/player/SyncPlayerData.tsx` — replaces old squad-profile sync; fetches cloud team via `fetchCloudTeam`, merges local availability responses (newest wins), saves merged team to localStorage

---

### Batch BC (May 2026) — Coach admin permissions via invite link + player availability fix

**Coach admin permissions:**
- ✅ `app/coach/team/page.tsx` — "Grant admin" checkbox on coach invite form; encodes as `|admin` suffix in the invite link `label` field
- ✅ `app/api/invite/join/route.ts` — `parseCoachLabel` now reads three-part label (`name|title|admin`); writes `can_manage_team: true` to `team_members` on join
- ✅ `lib/teamMembersCloud.ts` — `updateMemberPermissions(memberId, canManageTeam)` added for runtime permission changes
- ✅ `app/api/team/member-permissions/route.ts` — new `POST` route; head-coach-only guard; validates member belongs to same team; blocks coaches removing their own permissions

**Player availability bug fix:**
- ✅ `app/player/availability/page.tsx` — fixed root cause of "No upcoming fixtures/training sessions": page was reading from deprecated `SQUAD_PROFILE_KEY` (deleted by migration) instead of `TEAM_KEY`; updated imports to use `TEAM_KEY`, `TEAM_CHANGED_EVENT`, `saveTeam`, and `Team` type directly
- ✅ `app/player/SyncPlayerData.tsx` — added `visibilitychange` listener so players re-sync team data from cloud when they return to the tab (mirrors existing coach behaviour)

---

### Bug fix (May 2026) — Coach dashboard and settings reading from stale localStorage key

- ✅ `app/coach/page.tsx` — dashboard was reading team profile from deprecated `SQUAD_PROFILE_KEY` (deleted by multi-tenant migration); switched to `TEAM_KEY`; updated `subscribeToStorage` to listen to `TEAM_CHANGED_EVENT` so dashboard re-renders once `SyncTeam` async cloud sync completes
- ✅ `app/coach/settings/page.tsx` — same root cause; replaced `SQUAD_PROFILE_KEY` with `TEAM_KEY` in `KNOWN_LOCAL_STORAGE_KEYS` array and `squadProfile` useMemo; Team tile now shows correct team name and player count

---

Batch BD (May 2026) — Move 2: Multi-tenant data model migration

New tables: organisations, organisation_members, user_profiles, stripe_events_processed
squad_profiles dropped; teams is the new primary team table with organisation_id
team_members reshaped: team_id, user_id, role enum, status enum
saved_matches migrated to team_id-based access; user_id renamed to created_by_user_id
All RLS policies rewritten around the new schema
Codebase rename: SquadProfile → Team, squadProfile.ts → team.ts, SQUAD_PROFILE_KEY → TEAM_KEY, SyncSquadProfile → SyncTeam
Three deprecated columns kept on team_members for transition safety: owner_user_id, member_user_id, can_manage_team. Dropped in Move 2.5.
Verified locally and on production; one user, one player, full data preserved.

---

### Bug fix (May 2026) — Set piece stats wrong + "Easts" hardcoded for all clubs

Two related bugs fixed:

1. **Stats bug (critical):** `buildSetPieceSummary` in `helpers.ts` was filtering with `setPieceSide !== undefined`, which included both own-ball and opposition set pieces. When opposition tagged "Won", it inflated the coach's own scrum/lineout success %. Fixed to filter only own-ball events.

2. **Multi-club naming:** `SetPieceSide` type was `"Easts" | "Opposition"` — all clubs saw "Easts" in the set piece dropdown regardless of their team name. Renamed internal value to `"Own" | "Opposition"`. Dropdown now shows the actual team name dynamically via a new `teamName` prop on `SetPieceLoggingPanel`.

- ✅ `app/rugby-tagging/types.ts` — `SetPieceSide`: `"Easts"` → `"Own"`
- ✅ `app/rugby-tagging/helpers.ts` — `buildSetPieceSummary`: fixed filter, backward-compat for old `"Easts"` records
- ✅ `app/rugby-tagging/components/SetPieceLoggingPanel.tsx` — added `teamName` prop, dropdown shows team name for own-ball option
- ✅ `app/coach/capture/page.tsx` — default states, resets, voice parsing, AI text strings, `teamName` prop passed
- ✅ `app/coach/review/page.tsx` — filters already used `"Own"` (no change needed)
- ✅ `supabase/migrations/20260503000002_fix_set_piece_side_own.sql` — converts stored `setPieceSide: "Easts"` → `"Own"` in `saved_matches.payload`

---

### Move 2.5 (May 2026) — Drop deprecated team_members columns

- ✅ `can_manage_team(p_team_id uuid)` RLS function rewritten to use `role = 'head_coach'` only — no longer reads the deprecated column
- ✅ `team_members.owner_user_id`, `member_user_id`, `can_manage_team` dropped (`supabase/migrations/20260505000000_move_2_5_cleanup.sql`)
- ✅ `invite_tokens` RLS policies "Coach can create/update own invite tokens" and "Invitee can mark own token used" rewritten — old versions referenced `owner_user_id`/`member_user_id` and were never updated by Move 2; now use `can_manage_team(tm.team_id)` and `tm.user_id` respectively
- ✅ Orphaned `team_invite_links` rows (null `team_id`, unresolvable via `owner_user_id`) deleted during migration
- ✅ `team_invite_links.team_id` enforced NOT NULL
- ✅ `lib/teamContext.ts`, `lib/serverTeamContext.ts` — SELECT drops `can_manage_team`; `canManageTeam` derived from `role === "head_coach"`
- ✅ `lib/teamMembersCloud.ts` — `TeamMemberRow` type updated; `rowToMember` derives `canManageTeam` from role
- ✅ `app/api/invite/join/route.ts`, `app/api/invite/notify-coach/route.ts` — removed `owner_user_id` and `can_manage_team` from `team_members` INSERT payloads
- ✅ `app/api/invite/resend/route.ts` — removed `can_manage_team` from type/SELECT; `formatCoachRoleLabel` simplified
- ✅ `app/api/team/member-permissions/route.ts` — now updates `role` (`head_coach`/`assistant_coach`) instead of the dropped boolean column
- ✅ `app/invite/join/page.tsx` — membership check migrated to `.eq("team_id", ...).eq("user_id", ...)`; fixed stale `"accepted"` status string → `"active"`

**Shipped:** Migration applied to production, code pushed and deployed to Vercel (commit 31b355a).

---

### Batch BE (May 2026) — Stripe webhook scaffold

- ✅ `app/api/stripe/webhook/route.ts` — POST handler with Stripe signature verification (`stripe.webhooks.constructEvent`)
- ✅ Idempotency via `stripe_events_processed` PK; duplicate events return 200 immediately
- ✅ Switch/dispatch pattern for event routing

---

### Batch BF (May 2026) — `checkout.session.completed` handler

- ✅ Creates new `organisations` row (plan, status=trialing, trial_ends_at, Stripe IDs) on first subscription checkout
- ✅ Creates `organisation_members` row (role=club_admin) for the purchasing user
- ✅ Sets `user_profiles.has_used_trial = true`
- ✅ If a matching org already exists by `stripe_customer_id`, revives/updates it instead of inserting

---

### Batch BG (May 2026) — Subscription lifecycle handlers

- ✅ `customer.subscription.updated` — updates plan (`priceIdToPlan`), status (`stripeToOrgStatus` map), `current_period_end` (item-level, SDK v22), `canceled_at`, `trial_ends_at`
- ✅ `customer.subscription.deleted` — sets status=canceled, canceled_at=now
- ✅ `invoice.payment_failed` — sets status=past_due
- ✅ `invoice.payment_succeeded` — updates `current_period_end`; recovers past_due→active; leaves trialing untouched
- ✅ `customer.subscription.trial_will_end` — log only, no DB write
- All handlers look up org strictly by `stripe_customer_id`; rows with NULL stripe_customer_id are never touched
- `stripeToOrgStatus` map handles all Stripe statuses including unpaid, incomplete, incomplete_expired, paused

---

### Batch BH (May 2026) — Stripe webhook production rollout

- ✅ Created production Stripe webhook endpoint (`we_1TU453QL0gCVdJZiGrFL6B2N`): `https://fynlwhistle.com/api/stripe/webhook`
- ✅ Events: `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_succeeded/failed`, `customer.subscription.trial_will_end`
- ✅ `STRIPE_WEBHOOK_SECRET` set in Vercel Production env vars
- ✅ End-to-end smoke test passed: checkout → org created with `plan=club_5`, `status=trialing`, `trial_ends_at` 14 days out, `stripe_customer_id` populated
- ✅ 5 events logged in `stripe_events_processed` (idempotency confirmed)
- ✅ Test data cleaned up

---

### Batch BI (May 2026) — Coach Review Phase 1: meeting-room polish

Per-clip coaching depth and pro-grade keyboard control on `/coach/review`. No schema changes — everything piggybacks on existing `clips`/`comment`/`annotations` fields.

- ✅ **Per-clip comment field** — every clip card on the right-side playlist now has a coach-comment textarea persisted via the shared review autosave path; comments round-trip through `STORAGE_KEY` and the saved match record
- ✅ **Frame-step** — Arrow Left / Right step the video by 1/30 s when paused (typing-field guard prevents firing inside text inputs)
- ✅ **J / K / L shortcuts** — J rewinds (−2 s paused, −5 s playing); K toggles play/pause; L plays at 1× then doubles playback rate up to 4× on each press
- ✅ **Slow-mo / fast playback toolbar** — playback rate buttons (0.5× / 0.75× / 1× / 2×) on the video controls; current rate persisted in component state and re-applied on play
- ✅ **Fullscreen** — fullscreen toggle on the video container with graceful error logging if the browser denies the request
- ✅ **Autosave badge** — `autosaveStatus` pill in the page header surfaces "Saved locally" / "Saving…" so coaches can see persistence state at a glance
- ✅ **Spacebar scoping** — spacebar starts/ends clips on `/coach/review` only; never triggers when typing or when presentation mode is active

---

### Batch BJ (May 2026) — Coach Review Phase 2: presentation mode + per-player auto-clips

Two team-meeting workflows on top of Phase 1.

- ✅ **Presentation mode** — full-screen meeting playback that walks through `filteredClips` in order; ArrowDown/N goes to next clip, ArrowUp/P goes to previous, Escape exits; auto-advance based on `currentTime` reaching the clip endpoint with `presentationPaused` guard; presentation overlay shows `"Clip N of M"`, label, and comment
- ✅ **Per-player view + auto-clip generation** — selecting a roster player surfaces all their tagged involvements (`playerInvolvements` filtered to their tackles/missed tackles/carries/turnovers); each event has a "Save as clip" button that builds a 10 s window (−3 s before, +7 s after the event) via `buildClipFromEvent`; "Save all" bulk-creates clips for every remaining involvement at once
- ✅ **Per-player clip metadata** — generated clips inherit category from the action (`tackle`/`missed tackle` → Defence; `carry`/`turnover` → Attack) and use `"{Player name} — {Action}"` as the label; `savedFromEventIds` set tracks already-saved events so the "Save as clip" button disables after a save
- ✅ **Clip-filter chips** — All / Attack / Defence / Set Piece / Lineout filter pills above the playlist; presentation mode and per-player view both honour the active filter

---

### Batch BK (May 2026) — Coach Review Phase 3: player reactions, notes, and "new clips" badge

Two-way coaching loop. Players can react to and comment on coach clips, and coaches see all player feedback at a glance. Privacy rule preserved: a player only sees their own reactions/notes; coaches see everyone's.

**Type changes** (`app/rugby-tagging/types.ts`):
- ✅ `ClipReaction` — `playerId`, `type` (`"got_it" | "question"`), `note?`, `createdAt`
- ✅ `ClipPlayerNote` — `playerId`, `text`, `createdAt`, `updatedAt`
- ✅ `ClipAnnotation` extended with `reactions?`, `playerNotes?`, `createdAt?` (used for unseen-clip detection; missing `createdAt` treated as legacy "old" clip)

**Coach side** (`app/coach/review/page.tsx`):
- ✅ `confirmClip` and `buildClipFromEvent` set `createdAt: new Date().toISOString()` on every new clip
- ✅ Clip cards on the right-side playlist now render a player-feedback section: 👍 / 🤔 pills tagged with player name (resolved via `lookupPlayerName(rosterRows, playerId)` with team fallback); question pills show their note text below in muted styling; player notes render as `"Name: text"` lines
- ✅ Header shows an amber `"N questions"` badge with tooltip `title="Players have asked questions on these clips"` — counts clips where at least one reaction has `type === "question"`

**Player side** (`app/player/review/page.tsx`):
- ✅ Clip rows refactored from a single `<button>` to a `<div>` with a clickable header (still seeks the video) and an interactive footer (reactions + notes); footer uses `e.stopPropagation()` so seeks don't fire when clicking pills or typing
- ✅ Two reaction pills per clip: "Got it 👍" (green border when active, `border-success bg-success/10`) and "Question 🤔" (amber, `border-warning bg-warning/10`); clicking the active pill toggles it off; "Question" reveals a small textarea for the optional question text; switching to "Got it" clears any pending question
- ✅ Per-player note textarea ("Your note") at the right of the footer, debounced 600 ms before persisting; empty text removes the note for this player only; notes are scoped per-`playerId` so each player only ever sees their own
- ✅ Persistence helper `updateClipInSavedMatch(matchId, clipId, mutate)` reads via `getSavedMatchById`, applies the mutation, writes via `upsertSavedMatch` so localStorage + cloud sync round-trip in one call
- ✅ `markReviewAsSeen(currentPlayer.id)` fires on `/player/review` mount so unseen-clip badges clear

**"New clips" badge** (new helpers in `app/player/lib/`):
- ✅ `reviewSeen.ts` — `getLastSeenAt(playerId)` / `markReviewAsSeen(playerId)` / `subscribeReviewSeenChanged(cb)` over localStorage key `fynlwhistle-player-review-last-seen-{playerId}`
- ✅ `unseenClips.ts` — `countUnseenClips(matches, currentPlayer, lastSeenAt)` filters matches by roster ID-first / name-fallback (mirrors `/player/games/page.tsx` pattern), counts clips whose `createdAt` is after `lastSeenAt` (or any clip when `lastSeenAt` is null AND `createdAt` is missing)
- ✅ `app/player/page.tsx` — header shows "X new clips from your coach" pill linking to `/player/review` next to the existing unanswered-availability badge
- ✅ `app/player/PlayerSidebar.tsx` — Review nav link gets a numeric warning-coloured badge (`bg-warning text-background-elevated text-[10px] font-semibold rounded-full`); collapses to a small dot when the sidebar is collapsed

**Verification:**
- ✅ Lint clean for all touched files (one pre-existing `react-hooks/set-state-in-effect` error in `app/coach/team/page.tsx` left alone — file untouched in this batch)
- ✅ `npm run build` compiled and TypeScript-checked successfully (no type errors)

**Deferred to a future batch:**
- Coach-reply mechanism for player questions (badge currently surfaces "N questions" with no resolution state)
- Server-side notification beyond localStorage tracking (clearing the browser resets unseen-clip counts — acceptable for v1)

---

### Batch BL (May 2026) — Dark mode premium refresh v2 + unified orange brand

Token-only refresh of the dark scheme to make it feel like Linear / Vercel / Stripe — deeper near-black base, cleaner panel scale, layered shadows, primary buttons that visibly glow. Supersedes the partial Batch AK refresh. **Both schemes now share the orange `#ed6a1f` accent for a single coherent brand identity** (decision made mid-batch after seeing the dark refresh land — see "Accent decision" below). No component files modified.

**`app/globals.css` only:**
- ✅ Backgrounds deepened and re-spaced for clearer panel hierarchy: `--background` `#060709`, `--background-elevated` `#0b0d13`, `--panel` `#11141d`, `--panel-2` `#181d27`, `--panel-3` `#232a37`
- ✅ Body text lifted to `--foreground: #e4e7ec`; `--foreground-strong` stays pure white; muted shades cooled (`#9aa3b2` / `#6b7484`)
- ✅ Borders shifted cooler and slightly tighter (`--border: #262d3a`, `--border-light: #3a4557`)
- ✅ Status colours moved from pastel to Tailwind 500-range for legibility against the deeper base: `--success: #22c55e`, `--warning: #f59e0b`, `--danger: #ef4444`
- ✅ Shadow tokens layered (ambient + contact): `--shadow-soft` and `--shadow-panel` now have two-shadow values for visible card depth
- ✅ Dark `--accent` set to `#ed6a1f` (matches bright scheme — unified brand orange across both modes)
- ✅ Body gradient hardcodes updated to track the new background tokens; accent radial glow now warm orange `rgba(237, 106, 31, 0.1)`

**New dark-scoped rules (appended, scoped under `[data-theme-scheme="dark"]`):**
- ✅ Panel inset top highlight on `.bg-panel` / `.bg-panel-2` / `.bg-panel-3` (1px white at 4% opacity) + `var(--shadow-panel)` underneath — Linear/Vercel-style "carved out of the background" effect
- ✅ `button.bg-accent` glow: inset top highlight + `rgba(237, 106, 31, 0.45)` orange glow, animated; `:not(:disabled):hover` deepens it; `:not(:disabled):active` softens it; `:disabled` kills the glow entirely (component opacity utilities still drive the dim state)
- ✅ `button:focus-visible` ring (3px accent-orange at 0.4 opacity) — buttons previously had no focus ring at all
- ✅ Input/select/textarea focus override tints the border to accent and lifts the ring opacity from 0.18 → 0.28

**Shared focus rule fix (incidental):**
- ✅ Existing input focus rule at lines 125-131 had a hardcoded **blue** ring (`rgba(59, 142, 240, 0.18)`) inherited from a previous scheme. With the unified orange accent, the rgba values were updated to `rgba(237, 106, 31, 0.18)` — corrects a pre-existing inconsistency where bright mode (orange-accent theme) was showing a blue input focus ring. Bright mode now also gets the matching orange ring.

**Accent decision:**
- Initial dark refresh used `#3b8ef0` blue for the accent ("a vivid but not garish blue").
- After seeing the refresh land, decided the strong orange `#ed6a1f` from the bright scheme was preferable — gives a single coherent brand identity across both schemes rather than blue-led-dark + orange-led-bright.
- Trade-off: less differentiation between the two themes, but a much stronger overall brand signal. Orange on near-black reads warm and confident; cards and CTAs feel anchored.

**Implementation notes:**
- Selectors use `button.bg-accent` because every primary CTA in the app already carries the `bg-accent` Tailwind class — token-only path with zero component edits
- Full transition list duplicated inside the dark `button.bg-accent` rule so `box-shadow` animates smoothly without modifying the global `button` transition
- `:not(:disabled)` guards on hover/active prevent disabled CTAs from "flashing to life" on mouseover

**Verification:**
- ✅ Pages walked in dark: `/coach`, `/coach/capture`, `/coach/insights`, `/coach/review`, `/pricing` — panels lift, primary CTAs glow orange, focus rings visible
- ✅ Bright mode toggle confirms structural visuals unchanged (only the input focus ring colour shifts from blue → orange, which fixes the pre-existing inconsistency)
- ✅ Spot-checked `/player`, `/coach/team-setup`, `/coach/settings` for text contrast against the new backgrounds

---

### Move 3 (May 2026) — Club admin access: `/coach/organisation` + team switcher

- `/coach/organisation` route — club_admin read-only: org name, plan, status, billing date, active team count, coach seat count
- Club_admin gate fix in `app/coach/layout.tsx` — accepts `organisation_members` as well as `team_members`
- `isOrgAdminOnly` amber banner in coach layout — displayed when viewing as club admin without a coaching role on the active team
- Team switcher in `CoachSidebar` — fetches all accessible teams, grouped by org, reactive via `ACTIVE_TEAM_CHANGED_EVENT`
- `lib/serverTeamContext.ts` org-admin fallback — returns context with `isOrgAdminOnly: true` when no `team_members` row
- Migration `20260506000000_move_3_org_access.sql` — org RLS policies, extended `can_read_team_data`, `resolve_active_team_id`, `set_active_team_id`

---

### Batch BM (May 2026) — Live Stripe prices + webhook production

- ✅ Live-mode prices created in Stripe for Team Launch and Club 5 (monthly + yearly, multi-currency)
- ✅ `pricingConfig.ts` updated with live price IDs
- ✅ Live webhook endpoint registered: `https://www.fynlwhistle.com/api/stripe/webhook` (note: must use `www` — bare domain returns 307)
- ✅ `STRIPE_SECRET_KEY=sk_live_...` and `STRIPE_WEBHOOK_SECRET=whsec_live_...` set in Vercel Production
- ✅ End-to-end smoke test passed: checkout → org created (`plan=team_launch`, `status=trialing`, `trial_ends_at` 14 days out, live `stripe_customer_id`)
- ✅ Stripe delivery log shows 200s on live endpoint
- ✅ Test data cleaned up; `has_used_trial` reset

**Key gotcha:** Stripe webhook endpoint must be `https://www.fynlwhistle.com/...` not `https://fynlwhistle.com/...` — the bare domain redirects (307) and Stripe does not follow redirects.

---

### Terms of Service + Privacy Policy (May 2026)

- `/terms` and `/privacy` routes live — UK GDPR-compliant, covers all sub-processors
- Footer links added to `app/(marketing)/layout.tsx`; legal disclaimer added to signup form

---

## Next — what's left to do

### Move 3 — ✅ Shipped (May 2026)
- `/coach/organisation` — club_admin read-only: org name, plan, status, billing date, team count, coach seat count
- Club_admin gate fix in `app/coach/layout.tsx` — accepts `organisation_members` as well as `team_members`
- `isOrgAdminOnly` banner in coach layout — amber strip when viewing as club admin
- Team switcher in `CoachSidebar` — fetches all accessible teams, grouped by org, reactive via `ACTIVE_TEAM_CHANGED_EVENT`
- `lib/serverTeamContext.ts` org-admin fallback — returns context with `isOrgAdminOnly: true` when no `team_members` row
- Migration `20260506000000_move_3_org_access.sql` — org RLS policies, extended `can_read_team_data`, `resolve_active_team_id`, `set_active_team_id`

### Pre-launch checklist — do these before sharing with any club

**1. Live Stripe prices** ✅ Done (Batch BM, May 2026)
- Live prices, webhook endpoint (`www.fynlwhistle.com`), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in Vercel — all confirmed working end-to-end

**2. Sentry error monitoring** ✅ Done (May 2026)
- `@sentry/nextjs` v10 installed; EU data region (Frankfurt) — `fynl-whistle.sentry.io`
- `instrumentation-client.ts` (browser), `sentry.server.config.ts` (Node), `sentry.edge.config.ts` (edge), `instrumentation.ts` (server startup + `onRequestError`), `app/global-error.tsx` (unhandled layout errors)
- `next.config.ts` wrapped with `withSentryConfig` — sourcemaps upload on every production build
- Structured logging enabled (`enableLogs: true`); server auto-captures `console.error`/`console.warn` as structured logs
- OpenAI client instrumented with `instrumentOpenAiClient` in both `/api/transcribe` and `/api/help-chat` — Whisper + GPT-4o-mini calls traced in Sentry AI Monitoring
- All 5 env vars set in Vercel Production: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=fynl-whistle`, `SENTRY_PROJECT=fynl-whistle`
- Deployed and live

**3. Email delivery** ✅ Done (May 2026)
- ✅ DNS: SPF (`send.fynlwhistle.com`), DKIM (`resend._domainkey.fynlwhistle.com`), DMARC (`_dmarc.fynlwhistle.com` → `v=DMARC1; p=none;`)
- ✅ `RESEND_API_KEY` active in `.env.local` and Vercel Production
- ✅ `fynlwhistle.com` verified in Resend dashboard
- ✅ Supabase Custom SMTP: `smtp.resend.com:465`, sender `FYNL Whistle <noreply@fynlwhistle.com>`
- All email flows live: signup confirmation, password reset, invite resend, availability reminders

- ✅ **Final score input on match submission** (8 May 2026) — Two numeric inputs (Us / Them) in `TranscriptPanel` above the Submit Match button. `ourScore` / `opponentScore` optional fields added to `SavedMatchRecord`; stored in JSONB payload, no DB migration. Old matches restore with empty inputs.
- ✅ **team-setup page migrated to `useTeam()` hook** (8 May 2026) — Removed manual `TEAM_CHANGED_EVENT` listener; `useTeam()` reactive state drives local profile sync.

**4. Terms of Service + Privacy Policy** ✅ Done (May 2026)
- `/terms` and `/privacy` live — UK GDPR-compliant, covers all sub-processors
- Footer links added to marketing layout; legal disclaimer added to signup form
- GDPR note: if targeting UK/EU clubs, consider switching Supabase project region to EU (can be done in project settings before you have real data)

---
### ✅ READY TO SHARE WITH CLUBS — after the four items above are done

At this point: a club can discover the product, sign up, pay with a real card, receive a confirmation email, log in, and use the full coach app. The backend is complete and resilient.

**Confidence checklist before first outreach:**
- Know how to do a Vercel rollback (Deployments tab → find last working deploy → Redeploy). Practice it once.
- Bookmark Stripe dashboard → Developers → Webhooks → your live endpoint. Failed deliveries show here; one click to retry.
- Sentry is alerting to your email. Test it by deliberately triggering a 404.

---
### Post-launch — internal tooling

**5. Move 4 — Business admin panel** (`/admin/organisations`, `/admin/billing`)
- Internal visibility layer: customer list, MRR, subscription status, plan breakdown
- Data source: `organisations` table — status/plan/current_period_end kept in sync by webhooks
- Scope: read-only internal tool, no customer-facing UI
- Replaces the current admin stubs

**6. Stripe Customer Portal**
- Lets customers manage their own billing (cancel, upgrade, update card) without a custom billing UI
- One serverless function: create a Billing Portal session and redirect
- Until this exists, cancellations and card updates come to you manually — fine at low volume

### Post-launch — product

**7. Coach Review Phase 4 — close the question loop**
- Coach-reply textarea on each player question; mark question as answered
- "N questions" header badge becomes "N unanswered questions" (filters out resolved)
- Notify the player that their question has a reply (in-app first, server-side push later)
- Quick-jump visual scrubber timeline with event markers
- Export clip list as PDF for team presentations

**8. Wire up the contact form** — connect `app/(marketing)/contact/page.tsx` to Resend or CRM

### Around launch — quick marketing and UI wins
These are low-effort, high-signal for early clubs:

- **OG images** — add to `public/` so links shared in WhatsApp/Twitter show a branded preview card instead of a blank
- **Status page** — Instatus free tier, ~10 min setup. Clubs can check themselves if the app is slow rather than messaging you. Link it in the footer.
- **Early adopter framing on pricing page** — make sure the early adopter yearly offer messaging is current and compelling; first clubs respond to feeling like insiders
- **Trial period in Stripe checkout** — consider adding a 14-day free trial to the checkout session to reduce signup friction for the first wave of clubs
- **Simple welcome message** — even a plain-text email you send manually to the first 5–10 signups goes a long way; personal touch matters at this stage
- **Changelog or "what's new"** — a simple Notion page (or a `/updates` route) linked from the sidebar so early users feel the product is moving; clubs that can see active development stay engaged

### Longer-term

- Cloudflare Stream / HLS transcoding (revisit at >50 hrs stored video or mobile adaptive streaming needed)
- Mobile support
- Cross-match player trends backed by cloud data
- Shared team analysis links
- Advanced video annotation / telestration
- Plan limit enforcement (schema ready, code enforcement not yet built)
- Automated test suite (start with data transformation and export utilities)

---

## How we work — coding workflow

1. Paste this file at the start of every new Claude chat
2. Plan in Claude before touching code
3. Apply changes with Claude Code in VS Code — review every diff before accepting
4. Test in the browser after every change (`localhost:3000`)
5. Commit to git after each stable milestone
6. Update this file after major structural changes

### Rules for working with code
- `coach/capture/page.tsx` is large (~3,445 lines) — never rewrite the whole file, always use targeted find/replace
- Always read the current file before making changes — never guess from memory
- Stability over cleverness — app is live at fynlwhistle.com
- Test after every change before moving to the next

---

## Naming notes

- "Easts" appears in some internal variable names — treat as placeholder, will be made configurable during onboarding build
