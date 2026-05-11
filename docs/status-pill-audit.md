# Status Pill Audit

Audit conducted May 2026 as part of the StatusPill standardisation project.

## Component

`app/components/StatusPill.tsx` — 4 variants (success / warning / danger / neutral), 2 sizes (sm / md), optional `uppercase` prop.

`app/components/GradeBadge.tsx` — thin wrapper around StatusPill (Dominant→success, Competitive→warning, Below/Poor→danger).

---

## Migrated pills

### app/coach/insights/page.tsx — 1 pill (via StatusPill), GradeBadge ×5 covered by wrapper
| Text | Variant | Size |
|------|---------|------|
| "Ready for report" / "Still building…" | success / warning | md |

### app/coach/saved-matches/page.tsx — 1 pill
| Text | Variant | Size |
|------|---------|------|
| "READY FOR REPORT" / readiness label | success / warning | md + uppercase |

### app/coach/compare/page.tsx — 2 pills
| Text | Variant | Size |
|------|---------|------|
| #number - position | neutral | md |
| unit label | neutral | md |

### app/coach/team-setup/page.tsx — 3 pills + 2 button alignments
| Text | Variant | Size |
|------|---------|------|
| active / injured / (other) player status | success / danger / warning | sm |
| HOME / AWAY fixture | success / neutral | sm + uppercase |
| "Requested ✓" / "Mark requested" (button) | success / neutral | sm (button aligned) |
| Session availability toggle (button) | success / neutral | sm (button aligned) |

### app/coach/team/page.tsx — 2 pills
| Text | Variant | Size |
|------|---------|------|
| Player / Coach role | neutral | sm |
| Head permissions | success | sm |

### app/coach/organisation/page.tsx — 1 pill
| Text | Variant | Size |
|------|---------|------|
| Active / Trialing / Past due / Canceled / Archived | success / warning / danger / neutral / neutral | md |

### app/coach/settings/page.tsx — 1 pill
| Text | Variant | Size |
|------|---------|------|
| Syncing / Synced / Sync failed | warning / success / danger | md |

### app/coach/review/page.tsx — 2 pills
| Text | Variant | Size |
|------|---------|------|
| "X question(s)" | warning | md |
| 🤔 / 👍 reaction indicator | warning / success | sm |

### app/coach/page.tsx (Dashboard) — 7 pills + 1 button alignment
| Text | Variant | Size |
|------|---------|------|
| HOME / AWAY (next fixture header) | success / neutral | sm + uppercase |
| "X not yet responded" | warning | md |
| Session confirm badge (confirmed/total) | success / warning | sm |
| Session availability toggle (button) | success / neutral | sm (button aligned) |
| HOME / AWAY (fixture list, hidden xs) | success / neutral | sm + uppercase |
| "Not sent" / "Pending" / "X/Y available" | neutral / warning / success/warning | sm |
| "Not logged yet" | warning | md |

### app/player/page.tsx — 3 pills + 1 link alignment
| Text | Variant | Size |
|------|---------|------|
| HOME / AWAY fixture | success / neutral | sm + uppercase |
| "X responses needed" | warning | md |
| "X new clips from your coach" (Link) | warning | md (link aligned) |

### app/player/availability/page.tsx — 1 pill
| Text | Variant | Size |
|------|---------|------|
| HOME / AWAY | success / neutral | sm + uppercase |

### app/player/games/page.tsx — 1 pill
| Text | Variant | Size |
|------|---------|------|
| "X games" count | neutral | md |

### app/coach/capture/page.tsx — 4 pills (targeted)
| Text | Variant | Size |
|------|---------|------|
| "Ready to tag" | success | md |
| "Recording" | danger | md |
| "Processing last tag" | neutral | md |
| "Confirm player" | warning | md |

---

## NOT migrated (excluded from this batch)

| Element | Location | Reason |
|---------|----------|--------|
| Delta chips (+2%, -5%) | coach/compare, player/compare | Numeric deltas — DeltaPill concept, separate follow-up |
| Interactive filter chips | coach/review, player/review | Stateful buttons with hover/active |
| Position pills (Prop, Wing) | team-setup, player picker | Category labels — PositionPill follow-up |
| Tab count badges | insights, review | Tab decoration |
| Score display pills ("28 – 24") | saved-matches | tabular-nums bold score formatting |
| AI suggestion chips | coach/page | Interactive prompt suggestions |
| Focus area toggle buttons | coach/page | Interactive border-accent selectors |
| TranscriptPanel event types | rugby-tagging/TranscriptPanel | 7 colours beyond 4-variant system — follow-up EventBadge |
| CoachReviewPanel / NeedsReviewPanel badges | rugby-tagging | Sky/amber hardcoded — rugby-tagging scope separate |
| SetPieceLoggingPanel "% won" | rugby-tagging | Purple — beyond 4 variants |
| Admin OrgTable status | admin/organisations/OrgTable | Admin area, separate scope |
| Progress bars / dots / avatars | various | Not pills |
