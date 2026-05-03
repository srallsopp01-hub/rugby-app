import { createClient } from "@/lib/supabase/client";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import {
  getSavedMatches,
  replaceSavedMatches,
} from "@/app/rugby-tagging/lib/savedMatches";
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

export async function fetchCloudSavedMatches(): Promise<{
  records: SavedMatchRecord[];
  error?: string;
}> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx) return { records: [] };

    const supabase = createClient();
    const { data, error } = await supabase
      .from("saved_matches")
      .select("*")
      .eq("team_id", ctx.teamId)
      .order("updated_at", { ascending: false });

    if (error) return { records: [], error: error.message };
    if (!data) return { records: [] };

    return { records: (data as SavedMatchRow[]).map(rowToRecord) };
  } catch (e) {
    return { records: [], error: String(e) };
  }
}

export async function upsertCloudSavedMatch(
  record: SavedMatchRecord
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return { ok: false, error: "No write permission" };

    const supabase = createClient();
    const payload = recordToUpsertPayload(record, ctx.teamId, ctx.userId);

    const { error } = await supabase
      .from("saved_matches")
      .upsert(payload, { onConflict: "team_id,match_id" });

    if (error) return { ok: false, error: `Saved match upsert failed: ${error.message}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function deleteCloudSavedMatch(
  matchId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return { ok: false, error: "No write permission" };

    const supabase = createClient();
    const { error } = await supabase
      .from("saved_matches")
      .delete()
      .eq("team_id", ctx.teamId)
      .eq("match_id", matchId);

    if (error) return { ok: false, error: `Delete failed: ${error.message}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function syncAllLocalMatchesToCloud(): Promise<{
  count: number;
  errors: string[];
}> {
  const local = getSavedMatches();
  const { records: cloud, error: fetchError } = await fetchCloudSavedMatches();

  const errors: string[] = [];
  if (fetchError) errors.push(`Fetch cloud matches: ${fetchError}`);

  const merged = mergeSavedMatches(cloud, local);
  replaceSavedMatches(merged);

  const cloudIds = new Set(cloud.map((m) => m.id));
  const cloudUpdated = new Map(cloud.map((m) => [m.id, m.updatedAt]));

  const toSync = merged.filter(
    (m) => !cloudIds.has(m.id) || cloudUpdated.get(m.id) !== m.updatedAt
  );

  const results = await Promise.all(toSync.map((m) => upsertCloudSavedMatch(m)));
  for (const r of results) {
    if (!r.ok && r.error) errors.push(r.error);
  }

  return { count: merged.length, errors };
}

export function mergeSavedMatches(
  cloud: SavedMatchRecord[],
  local: SavedMatchRecord[]
): SavedMatchRecord[] {
  const byId = new Map<string, SavedMatchRecord>();

  [...cloud, ...local].forEach((record) => {
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, record);
      return;
    }

    const existingTime = new Date(existing.updatedAt).getTime();
    const nextTime = new Date(record.updatedAt).getTime();
    if (nextTime > existingTime) {
      byId.set(record.id, record);
    }
  });

  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
