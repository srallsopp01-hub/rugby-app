import { createClient } from "@/lib/supabase/client";
import { getMyTeamContext } from "@/lib/teamContext";

export type CloudSchemaHealth = {
  ok: boolean;
  missingTables: string[];
  missingColumns: string[];
  videoStorageConfigured: boolean;
  missingVideoStorageEnv: string[];
  activeTeamId: string | null;
  activeTeamName: string | null;
  activeTeamRole: string | null;
};

export async function checkCloudSchema(): Promise<CloudSchemaHealth> {
  const supabase = createClient();
  const missingTables: string[] = [];
  const missingColumns: string[] = [];

  const tables = ["organisations", "teams", "saved_matches", "team_members"] as const;
  await Promise.all(
    tables.map(async (table) => {
      const { error } = await supabase.from(table).select("id").limit(0);
      if (error?.code === "42P01") missingTables.push(table);
    })
  );

  // Check video_storage_path column exists (migration 001)
  if (!missingTables.includes("saved_matches")) {
    const { error } = await supabase
      .from("saved_matches")
      .select("video_storage_path")
      .limit(0);
    if (error?.code === "42703") missingColumns.push("saved_matches.video_storage_path");
  }

  let videoStorageConfigured = false;
  let missingVideoStorageEnv: string[] = [];
  try {
    const response = await fetch("/api/match-video/config");
    const data = (await response.json()) as {
      configured?: boolean;
      missing?: string[];
    };
    videoStorageConfigured = Boolean(data.configured);
    missingVideoStorageEnv = data.missing ?? [];
  } catch {
    missingVideoStorageEnv = ["R2 config check failed"];
  }

  // Active team diagnostics via the same RPC used by getMyTeamContext.
  let activeTeamId: string | null = null;
  let activeTeamName: string | null = null;
  let activeTeamRole: string | null = null;
  try {
    const ctx = await getMyTeamContext();
    if (ctx) {
      activeTeamId = ctx.teamId;
      activeTeamRole = ctx.role;
      const { data: team } = await supabase
        .from("teams")
        .select("name")
        .eq("id", ctx.teamId)
        .maybeSingle();
      activeTeamName = (team as { name?: string } | null)?.name ?? null;
    }
  } catch {
    // non-fatal — diagnostic only
  }

  const ok = missingTables.length === 0 && missingColumns.length === 0 && videoStorageConfigured;
  return {
    ok,
    missingTables,
    missingColumns,
    videoStorageConfigured,
    missingVideoStorageEnv,
    activeTeamId,
    activeTeamName,
    activeTeamRole,
  };
}
