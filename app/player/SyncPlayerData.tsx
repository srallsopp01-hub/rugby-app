"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { replaceSavedMatches } from "@/app/rugby-tagging/lib/savedMatches";
import { getTeam, saveTeam, type Team } from "@/app/rugby-tagging/lib/team";
import { PLAYER_IDENTITY_KEY } from "@/app/rugby-tagging/constants";
import { fetchCloudSavedMatches } from "@/lib/savedMatchesCloud";
import { fetchCloudTeam } from "@/lib/teamCloud";
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

export function SyncPlayerData() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      console.log("[SyncPlayerData] signed in as", user.id);

      const { data: membership, error: membershipError } = await supabase
        .from("team_members")
        .select("player_squad_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .eq("role", "player")
        .maybeSingle();

      if (membershipError) {
        console.error("[SyncPlayerData] membership lookup failed:", membershipError.message);
        return;
      }
      if (!membership || cancelled) {
        console.warn("[SyncPlayerData] no active player membership found for", user.id);
        return;
      }
      console.log("[SyncPlayerData] membership found:", membership);

      const [{ team, error: teamError }, { records: cloudMatches, error: matchesError }] =
        await Promise.all([fetchCloudTeam(), fetchCloudSavedMatches()]);

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

      if (membership.player_squad_id) {
        const currentId = localStorage.getItem(PLAYER_IDENTITY_KEY);
        if (!currentId) {
          localStorage.setItem(PLAYER_IDENTITY_KEY, membership.player_squad_id);
        }
      }
      window.dispatchEvent(new Event("player-identity-changed"));
    }

    void sync();
    return () => { cancelled = true; };
  }, []);

  return null;
}
