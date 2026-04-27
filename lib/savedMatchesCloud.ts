import { createClient } from "@/lib/supabase/client";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import {
  getSavedMatches,
  replaceSavedMatches,
} from "@/app/rugby-tagging/lib/savedMatches";
import { getMyTeamContext } from "@/lib/teamContext";

type SavedMatchRow = {
  id: string;
  user_id: string;
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
  userId: string
): Omit<SavedMatchRow, "id"> {
  return {
    user_id: userId,
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

export async function fetchCloudSavedMatches(): Promise<SavedMatchRecord[]> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx) return [];

    const supabase = createClient();
    const { data, error } = await supabase
      .from("saved_matches")
      .select("*")
      .eq("user_id", ctx.ownerUserId)
      .order("updated_at", { ascending: false });

    if (error || !data) return [];

    return (data as SavedMatchRow[]).map(rowToRecord);
  } catch {
    return [];
  }
}

export async function upsertCloudSavedMatch(
  record: SavedMatchRecord
): Promise<void> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return;

    const supabase = createClient();
    await supabase
      .from("saved_matches")
      .upsert(recordToUpsertPayload(record, ctx.ownerUserId), {
        onConflict: "user_id,match_id",
      });
  } catch {
    return;
  }
}

export async function deleteCloudSavedMatch(matchId: string): Promise<void> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return;

    const supabase = createClient();
    await supabase
      .from("saved_matches")
      .delete()
      .eq("user_id", ctx.ownerUserId)
      .eq("match_id", matchId);
  } catch {
    return;
  }
}

export async function syncAllLocalMatchesToCloud(): Promise<{ count: number }> {
  const local = getSavedMatches();
  const cloud = await fetchCloudSavedMatches();
  const merged = mergeSavedMatches(cloud, local);
  replaceSavedMatches(merged);

  const cloudIds = new Set(cloud.map((m) => m.id));
  const cloudUpdated = new Map(cloud.map((m) => [m.id, m.updatedAt]));

  const toSync = merged.filter(
    (m) => !cloudIds.has(m.id) || cloudUpdated.get(m.id) !== m.updatedAt
  );

  await Promise.all(toSync.map((m) => upsertCloudSavedMatch(m)));
  return { count: merged.length };
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
