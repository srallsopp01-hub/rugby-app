import { createClient } from "@/lib/supabase/client";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";

type SavedMatchRow = {
  id: string;
  user_id: string;
  match_id: string;
  match_title: string;
  opponent: string;
  match_date: string;
  payload: SavedMatchRecord;
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
  };
}

export async function fetchCloudSavedMatches(): Promise<SavedMatchRecord[]> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("saved_matches")
      .select("*")
      .eq("user_id", user.id)
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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("saved_matches")
      .upsert(recordToUpsertPayload(record, user.id), {
        onConflict: "user_id,match_id",
      });
  } catch {
    return;
  }
}

export async function deleteCloudSavedMatch(matchId: string): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("saved_matches")
      .delete()
      .eq("user_id", user.id)
      .eq("match_id", matchId);
  } catch {
    return;
  }
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
