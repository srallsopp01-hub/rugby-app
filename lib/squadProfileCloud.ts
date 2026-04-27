import { createClient } from "@/lib/supabase/client";
import type { SquadProfile } from "@/app/rugby-tagging/lib/squadProfile";
import {
  getSquadProfile,
  saveSquadProfile,
} from "@/app/rugby-tagging/lib/squadProfile";
import { getMyTeamContext } from "@/lib/teamContext";

type SquadProfileRow = {
  id: string;
  user_id: string;
  profile_id: string;
  team_name: string;
  coach_name: string;
  primary_colour: string;
  secondary_colour: string;
  logo_url: string;
  players: SquadProfile["players"];
  action_samples: SquadProfile["actionSamples"];
  correction_memory: SquadProfile["correctionMemory"];
  kpi_targets: SquadProfile["kpiTargets"] | null;
  created_at: string;
  updated_at: string;
};

function rowToProfile(row: SquadProfileRow): SquadProfile {
  return {
    id: row.profile_id,
    teamName: row.team_name,
    coachName: row.coach_name,
    primaryColour: row.primary_colour,
    secondaryColour: row.secondary_colour,
    logoUrl: row.logo_url,
    players: row.players ?? [],
    actionSamples: row.action_samples ?? [],
    correctionMemory: row.correction_memory ?? [],
    kpiTargets: row.kpi_targets ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function profileToUpsertPayload(
  profile: SquadProfile,
  userId: string
): Omit<SquadProfileRow, "id"> {
  return {
    user_id: userId,
    profile_id: profile.id,
    team_name: profile.teamName,
    coach_name: profile.coachName,
    primary_colour: profile.primaryColour,
    secondary_colour: profile.secondaryColour,
    logo_url: profile.logoUrl,
    players: profile.players,
    action_samples: profile.actionSamples,
    correction_memory: profile.correctionMemory,
    kpi_targets: profile.kpiTargets ?? null,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

export async function fetchCloudSquadProfile(): Promise<SquadProfile | null> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx) return null;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("squad_profiles")
      .select("*")
      .eq("user_id", ctx.ownerUserId)
      .maybeSingle();

    if (error) return null;

    return data ? rowToProfile(data as SquadProfileRow) : null;
  } catch {
    return null;
  }
}

export async function upsertCloudSquadProfile(
  profile: SquadProfile
): Promise<void> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("squad_profiles")
      .upsert(profileToUpsertPayload(profile, ctx.ownerUserId), {
        onConflict: "user_id",
      });

    if (error) return;
  } catch {
    return;
  }
}

export async function syncLocalSquadProfileToCloud(): Promise<void> {
  const local = getSquadProfile();
  const cloud = await fetchCloudSquadProfile();
  const merged = mergeSquadProfiles(cloud, local);
  if (!merged) return;
  saveSquadProfile(merged);
  if (!cloud || merged.updatedAt !== cloud.updatedAt) {
    await upsertCloudSquadProfile(merged);
  }
}

export function mergeSquadProfiles(
  cloud: SquadProfile | null,
  local: SquadProfile | null
): SquadProfile | null {
  if (!cloud && !local) return null;
  if (!cloud) return local;
  if (!local) return cloud;

  const cloudTime = new Date(cloud.updatedAt).getTime();
  const localTime = new Date(local.updatedAt).getTime();

  return localTime > cloudTime ? local : cloud;
}
