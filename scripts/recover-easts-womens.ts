/**
 * scripts/recover-easts-womens.ts
 *
 * One-off recovery: rebuilds `teams.players` for a wiped team by aggregating
 * `saved_matches.payload.rosterRows` and re-linking to existing player accounts
 * in `team_members`. The BEFORE-UPDATE snapshot trigger on `public.teams`
 * (migration 20260511000000_team_snapshots.sql) records the prior state when
 * --commit writes the row.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/recover-easts-womens.ts                                 # dry-run
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/recover-easts-womens.ts --team-name "Easts Womens 1st Grade" --commit
 *
 * Required environment:
 *   SUPABASE_URL                 — project URL
 *   SUPABASE_SERVICE_ROLE_KEY    — service role (bypasses RLS, reads auth.users)
 *
 * Apply Phase 0 first:
 *   - migration `20260511000000_team_snapshots.sql` must be live
 *   - the bug-fix code in lib/teamCloud.ts + app/coach/page.tsx must be deployed
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RosterRow } from "@/app/rugby-tagging/types";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/team";

type Args = { teamName: string; commit: boolean };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let teamName = "Easts Womens 1st Grade";
  let commit = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--team-name") teamName = argv[++i] ?? teamName;
    else if (a === "--commit") commit = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write(
        "Usage: tsx scripts/recover-easts-womens.ts [--team-name <name>] [--commit]\n"
      );
      process.exit(0);
    }
  }
  return { teamName, commit };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    process.stderr.write(`Missing env ${name}\n`);
    process.exit(1);
  }
  return v;
}

function normalizeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['\-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function splitFirstLast(s: string): { first: string; last: string } {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: "", last: parts[0] };
  return { first: parts[0], last: parts[parts.length - 1] };
}

function conservativeMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const sa = splitFirstLast(a);
  const sb = splitFirstLast(b);
  const lastA = normalizeName(sa.last);
  const lastB = normalizeName(sb.last);
  if (!lastA || !lastB || lastA !== lastB) return false;

  const firstA = normalizeName(sa.first);
  const firstB = normalizeName(sb.first);
  if (!firstA || !firstB) return false;
  if (firstA === firstB) return true;
  if (firstA.length === 1 && firstB.startsWith(firstA)) return true;
  if (firstB.length === 1 && firstA.startsWith(firstB)) return true;
  return false;
}

type TeamMemberPlayerRow = {
  id: string;
  user_id: string | null;
  role: string;
  status: string;
  email: string | null;
  player_squad_id: string | null;
  requested_name: string | null;
  requested_position: string | null;
};

type SavedMatchRow = {
  id: string;
  match_date: string | null;
  payload: { rosterRows?: RosterRow[] } | null;
};

type Aggregated = {
  normKey: string;
  displayName: string;
  jerseyNumber: number | null;
  positionMinutes: Map<string, number>;
  rosterPlayerIds: Set<string>;
  matchCount: number;
};

function createPlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pickPrimaryPosition(positionMinutes: Map<string, number>): {
  primary: string;
  secondaries: string[];
} {
  const entries = [...positionMinutes.entries()].filter(([p]) => p.trim().length > 0);
  if (entries.length === 0) return { primary: "", secondaries: [] };
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const primary = entries[0][0];
  const secondaries = entries.slice(1).map(([p]) => p);
  return { primary, secondaries };
}

async function findTeamId(
  supabase: SupabaseClient,
  teamName: string
): Promise<{ id: string; organisation_id: string }> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, organisation_id, name")
    .ilike("name", teamName);
  if (error) throw new Error(`Lookup team failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(`No team found matching name "${teamName}"`);
  }
  if (data.length > 1) {
    throw new Error(
      `Ambiguous team name "${teamName}" — matched ${data.length} rows: ${data
        .map((r) => `${r.id} (${r.name})`)
        .join(", ")}`
    );
  }
  return { id: data[0].id as string, organisation_id: data[0].organisation_id as string };
}

async function fetchSavedMatches(
  supabase: SupabaseClient,
  teamId: string
): Promise<SavedMatchRow[]> {
  const { data, error } = await supabase
    .from("saved_matches")
    .select("id, match_date, payload")
    .eq("team_id", teamId)
    .order("match_date", { ascending: false });
  if (error) throw new Error(`Fetch saved_matches failed: ${error.message}`);
  return (data ?? []) as SavedMatchRow[];
}

async function fetchPlayerMembers(
  supabase: SupabaseClient,
  teamId: string
): Promise<TeamMemberPlayerRow[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("id, user_id, role, status, email, player_squad_id, requested_name, requested_position")
    .eq("team_id", teamId)
    .eq("role", "player")
    .in("status", ["active", "invited", "pending"]);
  if (error) throw new Error(`Fetch team_members failed: ${error.message}`);
  return (data ?? []) as TeamMemberPlayerRow[];
}

async function resolveCoachName(
  supabase: SupabaseClient,
  teamId: string
): Promise<string> {
  const { data: heads, error } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("role", "head_coach")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error || !heads || heads.length === 0) return "";
  const userId = heads[0].user_id as string | null;
  if (!userId) return "";

  const { data: user, error: userErr } = await supabase.auth.admin.getUserById(userId);
  if (userErr || !user?.user) return "";

  const meta = (user.user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof meta.full_name === "string" ? meta.full_name : "";
  const name = typeof meta.name === "string" ? meta.name : "";
  return fullName || name || user.user.email || "";
}

function aggregateMatches(matches: SavedMatchRow[]): Aggregated[] {
  const byKey = new Map<string, Aggregated>();
  for (const m of matches) {
    const rows = m.payload?.rosterRows ?? [];
    for (const r of rows) {
      const name = (r.name ?? "").trim();
      if (!name) continue;
      const key = normalizeName(name);
      if (!key) continue;
      let agg = byKey.get(key);
      if (!agg) {
        // newest-first iteration order means first sighting = most recent match
        agg = {
          normKey: key,
          displayName: name,
          jerseyNumber: typeof r.number === "number" ? r.number : null,
          positionMinutes: new Map(),
          rosterPlayerIds: new Set(),
          matchCount: 0,
        };
        byKey.set(key, agg);
      }
      agg.matchCount += 1;
      if (r.position && r.position.trim().length > 0) {
        const pos = r.position.trim();
        const mins =
          typeof r.minutes === "number" && Number.isFinite(r.minutes) ? r.minutes : 1;
        agg.positionMinutes.set(pos, (agg.positionMinutes.get(pos) ?? 0) + mins);
      }
      if (r.playerId) agg.rosterPlayerIds.add(r.playerId);
    }
  }
  return [...byKey.values()];
}

type ReconstructResult = {
  players: SquadPlayer[];
  pendingMemberIdAssignments: Array<{ memberId: string; playerSquadId: string }>;
  linkedCount: number;
  unlinkedCount: number;
  accountOnlyAddedCount: number;
  warnings: string[];
};

function reconstruct(
  aggregated: Aggregated[],
  members: TeamMemberPlayerRow[]
): ReconstructResult {
  const warnings: string[] = [];
  const pendingMemberIdAssignments: Array<{ memberId: string; playerSquadId: string }> = [];

  const memberByPlayerSquadId = new Map<string, TeamMemberPlayerRow>();
  for (const m of members) {
    if (m.player_squad_id) memberByPlayerSquadId.set(m.player_squad_id, m);
  }
  const consumedMemberIds = new Set<string>();
  const players: SquadPlayer[] = [];
  let linkedCount = 0;
  let unlinkedCount = 0;

  for (const agg of aggregated) {
    const { primary, secondaries } = pickPrimaryPosition(agg.positionMinutes);

    // 1. If any rosterRow on this player carried a playerId that matches a
    //    member's player_squad_id, trust that link first.
    let matched: TeamMemberPlayerRow | undefined;
    for (const pid of agg.rosterPlayerIds) {
      const m = memberByPlayerSquadId.get(pid);
      if (m && !consumedMemberIds.has(m.id)) {
        matched = m;
        break;
      }
    }

    // 2. Otherwise, conservative name match against member.requested_name.
    if (!matched) {
      const candidates = members.filter(
        (m) => !consumedMemberIds.has(m.id) && m.requested_name && m.requested_name.trim().length > 0
      );
      const hits = candidates.filter((m) =>
        conservativeMatch(agg.displayName, m.requested_name as string)
      );
      if (hits.length === 1) {
        matched = hits[0];
      } else if (hits.length > 1) {
        warnings.push(
          `Ambiguous: roster name "${agg.displayName}" matched ${hits.length} member rows (${hits
            .map((h) => h.requested_name)
            .join(", ")}). Left unlinked.`
        );
      }
    }

    let id: string;
    let email: string | undefined;
    let linkedUserId: string | undefined;

    if (matched) {
      consumedMemberIds.add(matched.id);
      linkedCount += 1;
      email = matched.email ?? undefined;
      linkedUserId = matched.user_id ?? undefined;
      if (matched.player_squad_id) {
        id = matched.player_squad_id;
      } else {
        id = createPlayerId();
        pendingMemberIdAssignments.push({ memberId: matched.id, playerSquadId: id });
      }
    } else {
      unlinkedCount += 1;
      // Fall back to the first rosterRow.playerId we saw, if any, so historical
      // saved_matches still resolve the player by id.
      const firstRosterId = [...agg.rosterPlayerIds][0];
      id = firstRosterId ?? createPlayerId();
    }

    players.push({
      id,
      fullName: agg.displayName,
      preferredName: agg.displayName,
      nicknames: [],
      primaryPosition: primary,
      secondaryPositions: secondaries,
      jerseyNumber: agg.jerseyNumber,
      voiceSamples: [],
      status: "active",
      ...(email ? { email } : {}),
      ...(linkedUserId ? { linkedUserId } : {}),
    });
  }

  // 3. Account-only: members not consumed above (signed up but no match history).
  let accountOnlyAddedCount = 0;
  for (const m of members) {
    if (consumedMemberIds.has(m.id)) continue;
    if (m.status === "removed") continue;

    let id: string;
    if (m.player_squad_id) {
      id = m.player_squad_id;
    } else {
      id = createPlayerId();
      pendingMemberIdAssignments.push({ memberId: m.id, playerSquadId: id });
    }

    const fallbackName =
      (m.requested_name && m.requested_name.trim()) ||
      (m.email ? m.email.split("@")[0] : "") ||
      "Unknown player";

    players.push({
      id,
      fullName: fallbackName,
      preferredName: fallbackName,
      nicknames: [],
      primaryPosition: m.requested_position ?? "",
      secondaryPositions: [],
      jerseyNumber: null,
      voiceSamples: [],
      status: "active",
      ...(m.email ? { email: m.email } : {}),
      ...(m.user_id ? { linkedUserId: m.user_id } : {}),
    });
    accountOnlyAddedCount += 1;
  }

  // Stable sort by jersey number (nulls last), then name.
  players.sort((a, b) => {
    const ja = a.jerseyNumber ?? 999;
    const jb = b.jerseyNumber ?? 999;
    if (ja !== jb) return ja - jb;
    return a.fullName.localeCompare(b.fullName);
  });

  return {
    players,
    pendingMemberIdAssignments,
    linkedCount,
    unlinkedCount,
    accountOnlyAddedCount,
    warnings,
  };
}

async function applyChanges(
  supabase: SupabaseClient,
  teamId: string,
  teamName: string,
  coachName: string,
  players: SquadPlayer[],
  pendingMemberIdAssignments: Array<{ memberId: string; playerSquadId: string }>
): Promise<void> {
  const now = new Date().toISOString();

  // Update teams row. The BEFORE UPDATE trigger records the prior state.
  const { error: teamErr } = await supabase
    .from("teams")
    .update({
      name: teamName,
      coach_name: coachName,
      players,
      updated_at: now,
    })
    .eq("id", teamId);
  if (teamErr) throw new Error(`Team update failed: ${teamErr.message}`);

  // Assign newly-minted player_squad_ids only where the column is still NULL.
  for (const a of pendingMemberIdAssignments) {
    const { error } = await supabase
      .from("team_members")
      .update({ player_squad_id: a.playerSquadId })
      .eq("id", a.memberId)
      .is("player_squad_id", null);
    if (error) {
      throw new Error(
        `team_members update failed for ${a.memberId}: ${error.message}`
      );
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const team = await findTeamId(supabase, args.teamName);
  const [matches, members, coachName] = await Promise.all([
    fetchSavedMatches(supabase, team.id),
    fetchPlayerMembers(supabase, team.id),
    resolveCoachName(supabase, team.id),
  ]);

  const aggregated = aggregateMatches(matches);
  const result = reconstruct(aggregated, members);

  const summary = {
    teamId: team.id,
    organisationId: team.organisation_id,
    teamName: args.teamName,
    coachName,
    matchesScanned: matches.length,
    uniqueRosterPlayers: aggregated.length,
    activePlayerMembers: members.length,
    autoLinked: result.linkedCount,
    unlinkedRosterPlayers: result.unlinkedCount,
    accountOnlyAdded: result.accountOnlyAddedCount,
    pendingPlayerSquadIdAssignments: result.pendingMemberIdAssignments.length,
    finalPlayerCount: result.players.length,
    commit: args.commit,
  };

  process.stdout.write("Summary:\n");
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n\n");

  if (result.warnings.length > 0) {
    process.stdout.write("Warnings:\n");
    for (const w of result.warnings) process.stdout.write(`  - ${w}\n`);
    process.stdout.write("\n");
  }

  process.stdout.write("Reconstructed players:\n");
  process.stdout.write(JSON.stringify(result.players, null, 2) + "\n");

  if (!args.commit) {
    process.stdout.write("\n(dry-run — pass --commit to write to Supabase)\n");
    return;
  }

  process.stdout.write("\nCommitting...\n");
  await applyChanges(
    supabase,
    team.id,
    args.teamName,
    coachName,
    result.players,
    result.pendingMemberIdAssignments
  );
  process.stdout.write("Done.\n");
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
