import { createClient } from "@/lib/supabase/client";
import type { Team } from "@/app/rugby-tagging/lib/team";
import { getTeam, saveTeam } from "@/app/rugby-tagging/lib/team";
import type { AvailabilityResponse } from "@/app/rugby-tagging/types";
import { getMyTeamContext } from "@/lib/teamContext";

type TeamRow = {
  id: string;
  organisation_id: string;
  name: string;
  coach_name: string;
  profile_id: string;
  primary_colour: string;
  secondary_colour: string;
  logo_url: string;
  players: Team["players"];
  action_samples: Team["actionSamples"];
  correction_memory: Team["correctionMemory"];
  kpi_targets: Team["kpiTargets"] | null;
  fixtures: Team["fixtures"] | null;
  training_sessions: Team["trainingSessions"] | null;
  availability_responses: Team["availabilityResponses"] | null;
  session_logs: Team["sessionLogs"] | null;
  ai_chat_history: Team["aiChatHistory"] | null;
  league_position: number | null;
  created_at: string;
  updated_at: string;
};

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    profileId: row.profile_id ?? "",
    teamName: row.name,
    coachName: row.coach_name ?? "",
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

function teamToUpsertPayload(
  team: Team,
  teamId: string
): Omit<TeamRow, "organisation_id"> & { id: string } {
  return {
    id: teamId,
    name: team.teamName,
    coach_name: team.coachName,
    profile_id: team.profileId,
    primary_colour: team.primaryColour,
    secondary_colour: team.secondaryColour,
    logo_url: team.logoUrl,
    players: team.players,
    action_samples: team.actionSamples,
    correction_memory: team.correctionMemory,
    kpi_targets: team.kpiTargets ?? null,
    fixtures: team.fixtures ?? null,
    training_sessions: team.trainingSessions ?? null,
    availability_responses: team.availabilityResponses ?? null,
    session_logs: team.sessionLogs ?? null,
    ai_chat_history: team.aiChatHistory ?? null,
    league_position: team.leaguePosition ?? null,
    created_at: team.createdAt,
    updated_at: team.updatedAt,
  };
}

export async function fetchCloudTeam(teamId?: string): Promise<{
  team: Team | null;
  error?: string;
}> {
  try {
    const resolvedTeamId = teamId ?? (await getMyTeamContext())?.teamId;
    if (!resolvedTeamId) return { team: null };

    const supabase = createClient();
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("id", resolvedTeamId)
      .maybeSingle();

    if (error) return { team: null, error: error.message };

    return { team: data ? rowToTeam(data as TeamRow) : null };
  } catch (e) {
    return { team: null, error: String(e) };
  }
}

export async function upsertCloudTeam(
  team: Team,
  teamId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getMyTeamContext();
    if (!ctx?.canManageTeam) return { ok: false, error: "No write permission" };

    const resolvedTeamId = teamId ?? ctx.teamId;
    const supabase = createClient();

    // Safety net: never overwrite a populated cloud row with an empty payload.
    // A blank team from onboarding initialisation would otherwise destroy a
    // real team if a merge bug lets it reach this far.
    if (!isTeamPopulated(team)) {
      const { data: existing } = await supabase
        .from("teams")
        .select("name, players, fixtures, training_sessions, kpi_targets, action_samples")
        .eq("id", resolvedTeamId)
        .maybeSingle();

      if (existing) {
        const existingPopulated =
          (existing.name?.trim().length ?? 0) > 0 ||
          (existing.players?.length ?? 0) > 0 ||
          (existing.fixtures?.length ?? 0) > 0 ||
          (existing.training_sessions?.length ?? 0) > 0 ||
          (existing.kpi_targets?.length ?? 0) > 0 ||
          (existing.action_samples?.length ?? 0) > 0;

        if (existingPopulated) {
          const msg = `Refusing to overwrite populated team ${resolvedTeamId} with empty payload`;
          console.error(msg, { team });
          return { ok: false, error: msg };
        }
      }
    }

    const payload = teamToUpsertPayload(team, resolvedTeamId);

    const { error } = await supabase
      .from("teams")
      .update(payload)
      .eq("id", resolvedTeamId);

    if (error) return { ok: false, error: `Team upsert failed: ${error.message}` };
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
      p_team_id: ctx.teamId,
      p_response: response,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function syncLocalTeamToCloud(teamId?: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const local = getTeam();
  const { team: cloud, error: fetchError } = await fetchCloudTeam(teamId);

  if (fetchError) return { ok: false, error: `Fetch team: ${fetchError}` };

  const merged = mergeTeams(cloud, local);
  if (!merged) return { ok: true };

  saveTeam(merged);

  if (!cloud || merged.updatedAt !== cloud.updatedAt) {
    return upsertCloudTeam(merged, teamId);
  }

  return { ok: true };
}

function isTeamPopulated(t: Team): boolean {
  return (
    t.teamName.trim().length > 0 ||
    t.players.length > 0 ||
    (t.fixtures?.length ?? 0) > 0 ||
    (t.trainingSessions?.length ?? 0) > 0 ||
    (t.kpiTargets?.length ?? 0) > 0 ||
    (t.actionSamples?.length ?? 0) > 0
  );
}

export function mergeTeams(
  cloud: Team | null,
  local: Team | null
): Team | null {
  if (!cloud && !local) return null;
  if (!cloud) return local;
  if (!local) return cloud;

  // A freshly-initialised blank team always has a "now" timestamp, so the raw
  // timestamp comparison below would let it overwrite a real team. Anything
  // populated beats anything empty regardless of when it was last touched.
  const cloudPop = isTeamPopulated(cloud);
  const localPop = isTeamPopulated(local);
  if (cloudPop && !localPop) return cloud;
  if (localPop && !cloudPop) return local;

  const cloudTime = new Date(cloud.updatedAt).getTime();
  const localTime = new Date(local.updatedAt).getTime();

  // Tie goes to cloud so the server-assigned UUID id wins over any local squad_... id.
  return localTime > cloudTime ? local : cloud;
}

// ---------------------------------------------------------------------------
// Backwards-compatibility aliases — remove in Move 2.5
// ---------------------------------------------------------------------------

/** @deprecated Use fetchCloudTeam */
export const fetchCloudSquadProfile = async () => {
  const result = await fetchCloudTeam();
  return { profile: result.team, error: result.error };
};

/** @deprecated Use upsertCloudTeam */
export const upsertCloudSquadProfile = upsertCloudTeam;

/** @deprecated Use syncLocalTeamToCloud */
export const syncLocalSquadProfileToCloud = syncLocalTeamToCloud;

/** @deprecated Use mergeTeams */
export const mergeSquadProfiles = mergeTeams;
