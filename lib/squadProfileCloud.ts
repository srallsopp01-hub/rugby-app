import { createClient } from "@/lib/supabase/client";
import type { SquadProfile } from "@/app/rugby-tagging/lib/squadProfile";
import {
  getSquadProfile,
  saveSquadProfile,
} from "@/app/rugby-tagging/lib/squadProfile";
import type { AvailabilityResponse } from "@/app/rugby-tagging/types";
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
  fixtures: SquadProfile["fixtures"] | null;
  training_sessions: SquadProfile["trainingSessions"] | null;
  availability_responses: SquadProfile["availabilityResponses"] | null;
  session_logs: SquadProfile["sessionLogs"] | null;
  ai_chat_history: SquadProfile["aiChatHistory"] | null;
  league_position: number | null;
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
    fixtures: row.fixtures ?? [],
    trainingSessions: row.training_sessions ?? [],
    availabilityResponses: row.availability_responses ?? [],
    sessionLogs: row.session_logs ?? [],
    aiChatHistory: row.ai_chat_history ?? [],
    leaguePosition: row.league_position ?? undefined,
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
    fixtures: profile.fixtures ?? null,
    training_sessions: profile.trainingSessions ?? null,
    availability_responses: profile.availabilityResponses ?? null,
    session_logs: profile.sessionLogs ?? null,
    ai_chat_history: profile.aiChatHistory ?? null,
    league_position: profile.leaguePosition ?? null,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

export async function fetchCloudSquadProfile(): Promise<{
  profile: SquadProfile | null;
  error?: string;
}> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx) return { profile: null };

    const supabase = createClient();
    const { data, error } = await supabase
      .from("squad_profiles")
      .select("*")
      .eq("user_id", ctx.ownerUserId)
      .maybeSingle();

    if (error) return { profile: null, error: error.message };

    return { profile: data ? rowToProfile(data as SquadProfileRow) : null };
  } catch (e) {
    return { profile: null, error: String(e) };
  }
}

export async function upsertCloudSquadProfile(
  profile: SquadProfile
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return { ok: false, error: "No write permission" };

    const supabase = createClient();
    const payload = profileToUpsertPayload(profile, ctx.ownerUserId);
    let { error } = await supabase
      .from("squad_profiles")
      .upsert(payload, { onConflict: "user_id" });

    // Migration not yet applied — retry without the column
    if (error?.message?.includes("ai_chat_history")) {
      const { ai_chat_history: _omit, ...payloadWithoutChat } = payload;
      const { error: retryError } = await supabase
        .from("squad_profiles")
        .upsert(payloadWithoutChat, { onConflict: "user_id" });
      error = retryError;
    }

    if (error) return { ok: false, error: `Squad profile upsert failed: ${error.message}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function upsertPlayerAvailabilityResponse(
  response: AvailabilityResponse
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx) return { ok: false, error: "Not signed in" };

    const supabase = createClient();
    const { error } = await supabase.rpc("upsert_player_availability", {
      p_owner_user_id: ctx.ownerUserId,
      p_response: response,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function syncLocalSquadProfileToCloud(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const local = getSquadProfile();
  const { profile: cloud, error: fetchError } = await fetchCloudSquadProfile();

  if (fetchError) return { ok: false, error: `Fetch squad profile: ${fetchError}` };

  const merged = mergeSquadProfiles(cloud, local);
  if (!merged) return { ok: true };

  saveSquadProfile(merged);

  if (!cloud || merged.updatedAt !== cloud.updatedAt) {
    return upsertCloudSquadProfile(merged);
  }

  return { ok: true };
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
