import { createClient } from "@/lib/supabase/client";
import { getMyTeamContext } from "@/lib/teamContext";
import type { Play } from "@/app/coach/playbook/lib/types";

type PlayRow = {
  id: string;
  team_id: string;
  created_by_user_id: string;
  name: string;
  scenes: Play["scenes"];
  created_at: string;
  updated_at: string;
};

function rowToPlay(row: PlayRow): Play {
  return {
    id: row.id,
    name: row.name,
    teamId: row.team_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scenes: row.scenes,
  };
}

export async function fetchCloudPlays(
  teamId: string
): Promise<{ plays: Play[]; error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("playbook_plays")
      .select("*")
      .eq("team_id", teamId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[playbookPlaysCloud] fetch error:", error.message);
      return { plays: [], error: error.message };
    }
    return { plays: (data as PlayRow[]).map(rowToPlay) };
  } catch (e) {
    console.error("[playbookPlaysCloud] fetch exception:", e);
    return { plays: [], error: String(e) };
  }
}

export async function upsertCloudPlay(
  play: Play,
  teamId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return { ok: false, error: "No write permission" };

    const supabase = createClient();
    const { error } = await supabase.from("playbook_plays").upsert(
      {
        id: play.id,
        team_id: teamId,
        created_by_user_id: ctx.userId,
        name: play.name,
        scenes: play.scenes,
        created_at: play.createdAt,
        updated_at: play.updatedAt,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("[playbookPlaysCloud] upsert error:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error("[playbookPlaysCloud] upsert exception:", e);
    return { ok: false, error: String(e) };
  }
}

export async function deleteCloudPlay(
  playId: string,
  teamId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return { ok: false, error: "No write permission" };

    const supabase = createClient();
    const { error } = await supabase
      .from("playbook_plays")
      .delete()
      .eq("id", playId)
      .eq("team_id", teamId);

    if (error) {
      console.error("[playbookPlaysCloud] delete error:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error("[playbookPlaysCloud] delete exception:", e);
    return { ok: false, error: String(e) };
  }
}
