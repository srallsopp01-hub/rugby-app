"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { replaceSavedMatches } from "@/app/rugby-tagging/lib/savedMatches";
import { getTeam, saveTeam, type Team } from "@/app/rugby-tagging/lib/team";
import { PLAYER_IDENTITY_KEY } from "@/app/rugby-tagging/constants";
import { fetchCloudSavedMatches } from "@/lib/savedMatchesCloud";
import { fetchCloudTeam } from "@/lib/teamCloud";
import {
  getMyTeamContext,
  ACTIVE_TEAM_CHANGED_EVENT,
  ACTIVE_TEAM_ID_KEY,
} from "@/lib/teamContext";
import type { AvailabilityResponse } from "@/app/rugby-tagging/types";

function responseKey(r: AvailabilityResponse): string {
  return `${r.playerId}:${r.fixtureId ?? ""}:${r.trainingSessionId ?? ""}`;
}

function mergeLocalAvailability(
  local: Team | null,
  cloud: Team
): Team {
  const localResponses = local?.availabilityResponses ?? [];
  if (localResponses.length === 0) return cloud;

  const cloudResponses = cloud.availabilityResponses ?? [];
  const cloudMap = new Map(cloudResponses.map((r) => [responseKey(r), r]));

  for (const localResp of localResponses) {
    const key = responseKey(localResp);
    const existing = cloudMap.get(key);
    if (!existing || localResp.updatedAt > existing.updatedAt) {
      cloudMap.set(key, localResp);
    }
  }

  return { ...cloud, availabilityResponses: Array.from(cloudMap.values()) };
}

/** Returns the localStorage key for the player's identity, scoped to a team. */
export function namespacedPlayerKey(teamId: string): string {
  return `${PLAYER_IDENTITY_KEY}-${teamId}`;
}

export function SyncPlayerData() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      // Use getMyTeamContext() so team resolution goes through the RPC — consistent
      // with the coach side and correct for multi-team users.
      const ctx = await getMyTeamContext();
      if (!ctx || cancelled) return;

      if (ctx.role !== "player") {
        console.warn("[SyncPlayerData] user is not a player, skipping sync");
        return;
      }

      const teamId = ctx.teamId;
      console.log("[SyncPlayerData] signed in as", ctx.userId, "team", teamId);

      const [{ team, error: teamError }, { records: cloudMatches, error: matchesError }] =
        await Promise.all([
          fetchCloudTeam(teamId),
          fetchCloudSavedMatches(teamId),
        ]);

      if (cancelled) return;

      if (teamError) {
        console.error("[SyncPlayerData] team fetch failed:", teamError);
      } else {
        console.log("[SyncPlayerData] team fetched:", team ? team.teamName : "null");
      }
      if (matchesError) {
        console.error("[SyncPlayerData] matches fetch failed:", matchesError);
      } else {
        console.log("[SyncPlayerData] matches fetched:", cloudMatches.length);
      }

      if (team) saveTeam(mergeLocalAvailability(getTeam(), team));
      if (cloudMatches.length > 0) replaceSavedMatches(cloudMatches);

      // Fetch player_squad_id — not in MyTeamContext because it's player-role-only.
      const supabase = createClient();
      const { data: membership, error: membershipError } = await supabase
        .from("team_members")
        .select("player_squad_id")
        .eq("user_id", ctx.userId)
        .eq("team_id", teamId)
        .eq("status", "active")
        .eq("role", "player")
        .maybeSingle();

      if (cancelled) return;

      if (membershipError) {
        console.error("[SyncPlayerData] membership lookup failed:", membershipError.message);
      }

      if (membership?.player_squad_id) {
        const namespacedKey = namespacedPlayerKey(teamId);
        const currentNamespaced = localStorage.getItem(namespacedKey);

        if (!currentNamespaced) {
          // Migrate from the legacy un-namespaced key on first encounter after 3A.
          const legacy = localStorage.getItem(PLAYER_IDENTITY_KEY);
          const idToSet = legacy ?? membership.player_squad_id;
          localStorage.setItem(namespacedKey, idToSet);
          if (legacy) localStorage.removeItem(PLAYER_IDENTITY_KEY);
        }
      }

      // Write resolved teamId so PlayerContext can read it synchronously.
      localStorage.setItem(ACTIVE_TEAM_ID_KEY, teamId);

      window.dispatchEvent(new Event("player-identity-changed"));
    }

    void sync();

    const handleVisibility = () => {
      if (!document.hidden) void sync();
    };
    const handleTeamChanged = () => {
      void sync();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(ACTIVE_TEAM_CHANGED_EVENT, handleTeamChanged);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(ACTIVE_TEAM_CHANGED_EVENT, handleTeamChanged);
    };
  }, []);

  return null;
}
