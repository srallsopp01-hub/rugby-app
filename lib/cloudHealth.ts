import { createClient } from "@/lib/supabase/client";

export type CloudSchemaHealth = {
  ok: boolean;
  missingTables: string[];
  missingColumns: string[];
  bucketExists: boolean;
};

export async function checkCloudSchema(): Promise<CloudSchemaHealth> {
  const supabase = createClient();
  const missingTables: string[] = [];
  const missingColumns: string[] = [];

  const tables = ["squad_profiles", "saved_matches", "team_members"] as const;
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

  // getBucket() requires service-role key; use list() which works with the anon key + RLS.
  // A non-existent bucket returns { error.message: "Bucket not found" }; an existing
  // bucket (even empty) returns { data: [], error: null }.
  const { error: bucketError } = await supabase.storage.from("match-videos").list("", { limit: 1 });
  const bucketExists = !bucketError || !bucketError.message?.toLowerCase().includes("not found");

  const ok = missingTables.length === 0 && missingColumns.length === 0 && bucketExists;
  return { ok, missingTables, missingColumns, bucketExists };
}
