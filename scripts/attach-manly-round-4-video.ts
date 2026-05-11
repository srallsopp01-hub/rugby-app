/**
 * scripts/attach-manly-round-4-video.ts
 *
 * Attaches an existing Cloudflare R2 video object key to a saved_matches row
 * in Supabase. Used when a video was uploaded out-of-band (not through the
 * in-app upload flow), so saved_matches.video_storage_path was never written
 * and the in-app player can't resolve a signed URL.
 *
 * Originally written for Round 4 vs Manly; now general-purpose — pass
 * --match-id and --storage-path on the CLI.
 *
 * Updates BOTH sources of truth in a single row update:
 *   - column          saved_matches.video_storage_path
 *   - jsonb field     saved_matches.payload->>'videoStoragePath'
 * (Both are read by lib/savedMatchesCloud.ts:rowToRecord — keeping them in
 * sync prevents UI inconsistency.)
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/attach-manly-round-4-video.ts --list
 *       # print candidate rows, no writes
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/attach-manly-round-4-video.ts \
 *       --match-id <uuid> --storage-path <r2-key>
 *       # dry-run for a specific row
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/attach-manly-round-4-video.ts \
 *       --match-id <uuid> --storage-path <r2-key> --commit
 *       # apply
 *
 *   Add --force to overwrite an existing different videoStoragePath.
 *
 * Required environment:
 *   SUPABASE_URL                — project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — service role (bypasses RLS).
 *                                 Must be the secret key (sb_secret_… or the
 *                                 service_role JWT). The publishable / anon key
 *                                 (sb_publishable_…) will silently return 0 rows
 *                                 because RLS filters everything without an auth
 *                                 context.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isValidR2ObjectKey } from "@/lib/r2";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";

// ── Diagnostic defaults used only by --list ──────────────────────────────────
// These are the original Round 4 vs Manly hints, kept because they're useful
// for spotting related rows for the same coach / date. They have no effect
// on the update path.
const LIST_OWNER_HINT = "9f0505f9-5d69-437c-a94b-bd8e6da29476";
const LIST_NAME_HINT_OR =
  "opponent.ilike.%manly%,match_title.ilike.%manly%,match_title.ilike.%round 4%,match_title.ilike.%round_4%";

type Args = {
  commit: boolean;
  force: boolean;
  list: boolean;
  matchId: string | null;
  storagePath: string | null;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let commit = false;
  let force = false;
  let list = false;
  let matchId: string | null = null;
  let storagePath: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--commit") commit = true;
    else if (a === "--force") force = true;
    else if (a === "--list") list = true;
    else if (a === "--match-id") matchId = argv[++i] ?? null;
    else if (a === "--storage-path") storagePath = argv[++i] ?? null;
    else if (a === "--help" || a === "-h") {
      process.stdout.write(
        "Usage: tsx scripts/attach-manly-round-4-video.ts [--list] [--match-id <uuid> --storage-path <r2-key>] [--commit] [--force]\n"
      );
      process.exit(0);
    } else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      process.exit(1);
    }
  }
  return { commit, force, list, matchId, storagePath };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    process.stderr.write(`Missing env ${name}\n`);
    process.exit(1);
  }
  return v;
}

type SavedMatchRow = {
  id: string;
  team_id: string;
  created_by_user_id: string;
  match_id: string;
  match_title: string;
  opponent: string;
  match_date: string;
  video_storage_path: string | null;
  payload: SavedMatchRecord;
  updated_at: string;
};

const ROW_COLS =
  "id, team_id, created_by_user_id, match_id, match_title, opponent, match_date, video_storage_path, payload, updated_at";

async function findRowById(
  supabase: SupabaseClient,
  matchId: string
): Promise<SavedMatchRow> {
  const { data, error } = await supabase
    .from("saved_matches")
    .select(ROW_COLS)
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(`Lookup by id failed: ${error.message}`);
  if (!data) throw new Error(`No saved_matches row with id=${matchId}.`);
  return data as SavedMatchRow;
}

type CandidateRow = Pick<
  SavedMatchRow,
  | "id"
  | "team_id"
  | "created_by_user_id"
  | "match_id"
  | "match_title"
  | "opponent"
  | "match_date"
  | "video_storage_path"
  | "updated_at"
>;

async function listCandidates(supabase: SupabaseClient): Promise<void> {
  const lenses: Array<{
    label: string;
    run: () => Promise<{
      data: CandidateRow[] | null;
      error: { message: string } | null;
    }>;
  }> = [
    {
      label: "opponent or match_title contains 'manly', 'round 4', or 'round_4'",
      run: async () =>
        await supabase
          .from("saved_matches")
          .select(ROW_COLS)
          .or(LIST_NAME_HINT_OR)
          .order("updated_at", { ascending: false })
          .limit(50),
    },
    {
      label: `created_by_user_id = ${LIST_OWNER_HINT} (the original R2 key owner)`,
      run: async () =>
        await supabase
          .from("saved_matches")
          .select(ROW_COLS)
          .eq("created_by_user_id", LIST_OWNER_HINT)
          .order("updated_at", { ascending: false })
          .limit(50),
    },
  ];

  const seen = new Set<string>();
  for (const lens of lenses) {
    const { data, error } = await lens.run();
    process.stdout.write(`\n# Candidates — ${lens.label}\n`);
    if (error) {
      process.stdout.write(`  (query error: ${error.message})\n`);
      continue;
    }
    const rows = (data ?? []).filter((r) => !seen.has(r.id));
    if (rows.length === 0) {
      process.stdout.write("  (no rows)\n");
      continue;
    }
    for (const r of rows) {
      seen.add(r.id);
      process.stdout.write(
        `  - id=${r.id}\n    team_id=${r.team_id} created_by=${r.created_by_user_id}\n    match_title="${r.match_title}" opponent="${r.opponent}" match_date=${r.match_date}\n    video_storage_path=${r.video_storage_path ?? "<null>"}\n    updated_at=${r.updated_at}\n`
      );
    }
  }

  if (seen.size === 0) {
    process.stdout.write(
      "\nNo candidates found by any lens. If the service-role key is correct, no matching saved_matches rows exist.\n"
    );
  } else {
    process.stdout.write(
      `\nFound ${seen.size} candidate row(s). Pick the right id and re-run:\n  npx tsx scripts/attach-manly-round-4-video.ts --match-id <uuid> --storage-path <r2-key>           # dry-run\n  npx tsx scripts/attach-manly-round-4-video.ts --match-id <uuid> --storage-path <r2-key> --commit  # apply\n`
    );
  }
}

async function applyUpdate(
  supabase: SupabaseClient,
  row: SavedMatchRow,
  storagePath: string
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const newPayload: SavedMatchRecord = {
    ...row.payload,
    videoStoragePath: storagePath,
    updatedAt,
  };
  const { error } = await supabase
    .from("saved_matches")
    .update({
      video_storage_path: storagePath,
      payload: newPayload,
      updated_at: updatedAt,
    })
    .eq("id", row.id);
  if (error) throw new Error(`Update failed: ${error.message}`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (args.list) {
    await listCandidates(supabase);
    return;
  }

  if (!args.matchId || !args.storagePath) {
    process.stderr.write(
      "Update path requires both --match-id <uuid> and --storage-path <r2-key>. Run with --list to find candidate rows, or --help for usage.\n"
    );
    process.exit(1);
  }

  if (!isValidR2ObjectKey(args.storagePath)) {
    process.stderr.write(
      `--storage-path is not a valid R2 object key: ${args.storagePath}\n`
    );
    process.exit(1);
  }

  const row = await findRowById(supabase, args.matchId);
  const currentColumn = row.video_storage_path;
  const currentPayload = row.payload?.videoStoragePath ?? null;

  process.stdout.write("Matched row:\n");
  process.stdout.write(
    JSON.stringify(
      {
        id: row.id,
        team_id: row.team_id,
        created_by_user_id: row.created_by_user_id,
        match_id: row.match_id,
        match_title: row.match_title,
        opponent: row.opponent,
        match_date: row.match_date,
        updated_at: row.updated_at,
      },
      null,
      2
    ) + "\n\n"
  );

  process.stdout.write("Diff:\n");
  process.stdout.write(`  video_storage_path:        ${currentColumn ?? "<null>"}\n`);
  process.stdout.write(`                          → ${args.storagePath}\n`);
  process.stdout.write(`  payload.videoStoragePath: ${currentPayload ?? "<unset>"}\n`);
  process.stdout.write(`                          → ${args.storagePath}\n\n`);

  const alreadyCorrect =
    currentColumn === args.storagePath && currentPayload === args.storagePath;
  if (alreadyCorrect) {
    process.stdout.write("Both fields already equal --storage-path — nothing to do.\n");
    return;
  }

  const conflictingExisting =
    (currentColumn && currentColumn !== args.storagePath) ||
    (currentPayload && currentPayload !== args.storagePath);
  if (conflictingExisting && !args.force) {
    process.stderr.write(
      "Refusing to overwrite an existing different videoStoragePath. Re-run with --force if intentional.\n"
    );
    process.exit(2);
  }

  if (!args.commit) {
    process.stdout.write("(dry-run — pass --commit to write to Supabase)\n");
    return;
  }

  process.stdout.write("Committing...\n");
  await applyUpdate(supabase, row, args.storagePath);
  process.stdout.write("Done.\n");
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
