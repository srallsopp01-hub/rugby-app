/**
 * scripts/attach-manly-round-2-video.ts
 *
 * **List mode (current state).** The narrower attach lookup
 * (`created_by_user_id` + opponent ILIKE 'manly' + title ILIKE 'round 2')
 * returned no rows, so this script has been flipped to a read-only
 * candidate-listing tool. It prints every saved_matches row that could
 * plausibly be the Easts 2nd Grade Round 2 vs Manly fixture, joined to the
 * team name, so the right row can be picked by eye.
 *
 * Specifically, it lists:
 *   1. All `teams` rows where name ILIKE '%easts%' (so you can see which
 *      team_ids correspond to Easts 1XV / 2XV / etc.)
 *   2. All `saved_matches` rows where EITHER
 *        - team_id is one of those Easts teams, OR
 *        - created_by_user_id = '9f0505f9-…' (the R2 folder owner)
 *      Sorted by match_date desc. Shows whether each row already has a
 *      `video_storage_path` set.
 *
 * Once the correct row is identified, edit this file to restore the attach
 * logic against that specific row id (or filter), then re-run with --commit.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/attach-manly-round-2-video.ts
 *
 * Required environment:
 *   SUPABASE_URL                — project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — service role (bypasses RLS)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Context for the listing (intentionally broad) ────────────────────────────
const TEAM_NAME_PATTERN = "%easts%";
const COACH_USER_ID = "9f0505f9-5d69-437c-a94b-bd8e6da29476"; // R2 folder owner

// Reference: the R2 object we eventually want to attach.
const TARGET_STORAGE_PATH =
  "9f0505f9-5d69-437c-a94b-bd8e6da29476/round_2_vs_manly_09_05_2026/1778473343391-5fa7190d-cd16-4e8c-bde5-a2be19c4d235-easts_2xv_manly.mp4";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    process.stderr.write(`Missing env ${name}\n`);
    process.exit(1);
  }
  return v;
}

type TeamRow = {
  id: string;
  organisation_id: string | null;
  name: string;
  created_by_user_id: string | null;
};

type SavedMatchRow = {
  id: string;
  team_id: string;
  created_by_user_id: string;
  match_id: string;
  match_title: string;
  opponent: string;
  match_date: string;
  video_storage_path: string | null;
  payload: { videoStoragePath?: string | null } | null;
  updated_at: string;
};

async function listEastsTeams(supabase: SupabaseClient): Promise<TeamRow[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, organisation_id, name, created_by_user_id")
    .ilike("name", TEAM_NAME_PATTERN)
    .order("name", { ascending: true });
  if (error) throw new Error(`Team lookup failed: ${error.message}`);
  return (data ?? []) as TeamRow[];
}

async function listCandidateMatches(
  supabase: SupabaseClient,
  teamIds: string[]
): Promise<SavedMatchRow[]> {
  // Build an OR filter: team in eastsTeams OR created_by_user_id = coach.
  // PostgREST `.or()` requires the filters as a comma-separated string.
  const teamFilter = teamIds.length
    ? `team_id.in.(${teamIds.join(",")})`
    : null;
  const coachFilter = `created_by_user_id.eq.${COACH_USER_ID}`;
  const orFilter = teamFilter ? `${teamFilter},${coachFilter}` : coachFilter;

  const { data, error } = await supabase
    .from("saved_matches")
    .select(
      "id, team_id, created_by_user_id, match_id, match_title, opponent, match_date, video_storage_path, payload, updated_at"
    )
    .or(orFilter)
    .order("match_date", { ascending: false });
  if (error) throw new Error(`Saved-matches lookup failed: ${error.message}`);
  return (data ?? []) as SavedMatchRow[];
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatTeamsTable(teams: TeamRow[], teamNameById: Map<string, string>): string {
  if (teams.length === 0) return "  (no teams match)\n";
  const lines: string[] = [];
  for (const t of teams) {
    void teamNameById; // sourced separately below
    lines.push(`  ${shortId(t.id)}  ${t.name}`);
  }
  return lines.join("\n") + "\n";
}

function formatMatchesTable(
  rows: SavedMatchRow[],
  teamNameById: Map<string, string>
): string {
  if (rows.length === 0) return "  (no saved_matches rows match)\n";
  const headers = [
    "row_id  ",
    "team             ",
    "match_date  ",
    "opponent          ",
    "match_title                              ",
    "video",
    "row_id (full)",
  ];
  const lines: string[] = [headers.join(" | ")];
  for (const r of rows) {
    const team = teamNameById.get(r.team_id) ?? `<unknown:${shortId(r.team_id)}>`;
    const payloadVideo = r.payload?.videoStoragePath ?? null;
    const videoFlag =
      r.video_storage_path && payloadVideo
        ? "both"
        : r.video_storage_path
          ? "col"
          : payloadVideo
            ? "json"
            : "none";
    lines.push(
      [
        shortId(r.id).padEnd(8),
        team.slice(0, 17).padEnd(17),
        (r.match_date ?? "").padEnd(11),
        (r.opponent ?? "").slice(0, 17).padEnd(17),
        (r.match_title ?? "").slice(0, 40).padEnd(40),
        videoFlag.padEnd(5),
        r.id,
      ].join(" | ")
    );
  }
  return lines.join("\n") + "\n";
}

async function main(): Promise<void> {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  process.stdout.write(`Target R2 key (for reference, not written):\n  ${TARGET_STORAGE_PATH}\n\n`);
  process.stdout.write(`Coach user_id (R2 folder owner): ${COACH_USER_ID}\n\n`);

  const teams = await listEastsTeams(supabase);
  const teamNameById = new Map<string, string>();
  for (const t of teams) teamNameById.set(t.id, t.name);

  process.stdout.write(`Teams matching name ILIKE '${TEAM_NAME_PATTERN}' (${teams.length}):\n`);
  process.stdout.write(formatTeamsTable(teams, teamNameById));
  process.stdout.write("\n");

  const matches = await listCandidateMatches(
    supabase,
    teams.map((t) => t.id)
  );

  // Backfill team names for any rows whose team isn't an "Easts" team (coach
  // may have saved matches under other teams in the same org).
  const missingTeamIds = [...new Set(matches.map((m) => m.team_id))].filter(
    (id) => !teamNameById.has(id)
  );
  if (missingTeamIds.length > 0) {
    const { data, error } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", missingTeamIds);
    if (error) throw new Error(`Team-name backfill failed: ${error.message}`);
    for (const t of data ?? []) teamNameById.set(t.id as string, t.name as string);
  }

  process.stdout.write(
    `Candidate saved_matches (team in Easts teams OR created_by ${COACH_USER_ID}) — ${matches.length} rows:\n`
  );
  process.stdout.write(formatMatchesTable(matches, teamNameById));

  process.stdout.write(
    "\nNext step: pick the row id for the Round 2 vs Manly fixture, then update this script to attach the video against that specific row id and re-run with --commit.\n"
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
