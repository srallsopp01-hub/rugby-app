import { createClient } from "@/lib/supabase/client";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import { getMyTeamContext } from "@/lib/teamContext";

type SavedMatchRow = {
  id: string;
  team_id: string;
  created_by_user_id: string;
  match_id: string;
  match_title: string;
  opponent: string;
  match_date: string;
  payload: SavedMatchRecord;
  video_storage_path: string | null;
  created_at: string;
  updated_at: string;
};

function recordToUpsertPayload(
  record: SavedMatchRecord,
  teamId: string,
  createdByUserId: string
): Omit<SavedMatchRow, "id"> {
  return {
    team_id: teamId,
    created_by_user_id: createdByUserId,
    match_id: record.id,
    match_title: record.matchTitle,
    opponent: record.opponent,
    match_date: record.matchDate,
    payload: record,
    video_storage_path: record.videoStoragePath ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function rowToRecord(row: SavedMatchRow): SavedMatchRecord {
  return {
    ...row.payload,
    id: row.match_id,
    matchTitle: row.match_title,
    opponent: row.opponent,
    matchDate: row.match_date,
    createdAt: row.payload?.createdAt || row.created_at,
    updatedAt: row.payload?.updatedAt || row.updated_at,
    videoStoragePath: row.video_storage_path ?? row.payload?.videoStoragePath,
  };
}

export async function fetchCloudSavedMatches(teamId?: string): Promise<{
  records: SavedMatchRecord[];
  error?: string;
}> {
  try {
    const resolvedTeamId = teamId ?? (await getMyTeamContext())?.teamId;
    if (!resolvedTeamId) return { records: [] };

    const supabase = createClient();
    const { data, error } = await supabase
      .from("saved_matches")
      .select("*")
      .eq("team_id", resolvedTeamId)
      .order("updated_at", { ascending: false });

    if (error) return { records: [], error: error.message };
    if (!data) return { records: [] };

    return { records: (data as SavedMatchRow[]).map(rowToRecord) };
  } catch (e) {
    return { records: [], error: String(e) };
  }
}

export async function upsertCloudSavedMatch(
  record: SavedMatchRecord,
  teamId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return { ok: false, error: "No write permission" };

    const resolvedTeamId = teamId ?? ctx.teamId;
    const supabase = createClient();

    // Check if this is a new match (not an update/autosave). Only new matches count against the trial quota.
    const { count: existingCount } = await supabase
      .from("saved_matches")
      .select("id", { count: "exact", head: true })
      .eq("team_id", resolvedTeamId)
      .eq("match_id", record.id);

    if (existingCount === 0) {
      const res = await fetch("/api/matches/quota");
      if (res.ok) {
        const quota = await res.json();
        if (!quota.allowed) {
          return { ok: false, error: "TRIAL_LIMIT_REACHED" };
        }
      }
    }

    const payload = recordToUpsertPayload(record, resolvedTeamId, ctx.userId);

    const { error } = await supabase
      .from("saved_matches")
      .upsert(payload, { onConflict: "team_id,match_id" });

    // Retry without video_storage_path if migration 001 column is absent.
    if (error?.code === "42703" && "video_storage_path" in payload) {
      const { video_storage_path: _, ...payloadWithoutVideo } = payload;
      const { error: retryError } = await supabase
        .from("saved_matches")
        .upsert(payloadWithoutVideo, { onConflict: "team_id,match_id" });
      if (retryError)
        return { ok: false, error: `Saved match upsert failed: ${retryError.message}` };
      return { ok: true };
    }

    if (error) return { ok: false, error: `Saved match upsert failed: ${error.message}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function deleteCloudSavedMatch(
  matchId: string,
  teamId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return { ok: false, error: "No write permission" };

    const resolvedTeamId = teamId ?? ctx.teamId;
    const supabase = createClient();
    const { error } = await supabase
      .from("saved_matches")
      .delete()
      .eq("team_id", resolvedTeamId)
      .eq("match_id", matchId);

    if (error) return { ok: false, error: `Delete failed: ${error.message}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

