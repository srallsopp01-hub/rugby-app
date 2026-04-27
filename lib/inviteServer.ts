import { createAdminClient } from "@/lib/supabase/admin";

export async function linkSquadPlayerToUser({
  ownerUserId,
  playerSquadId,
  memberUserId,
}: {
  ownerUserId: string;
  playerSquadId: string;
  memberUserId: string;
}) {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: profileRow } = await admin
    .from("squad_profiles")
    .select("players")
    .eq("user_id", ownerUserId)
    .single();

  if (!profileRow?.players) return;

  const players = (profileRow.players as Array<Record<string, unknown>>).map((player) =>
    player.id === playerSquadId ? { ...player, linkedUserId: memberUserId } : player
  );

  await admin
    .from("squad_profiles")
    .update({ players, updated_at: new Date().toISOString() })
    .eq("user_id", ownerUserId);
}
