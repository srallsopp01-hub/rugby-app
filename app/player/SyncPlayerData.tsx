"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { replaceSavedMatches } from "@/app/rugby-tagging/lib/savedMatches";
import {
  getSquadProfile,
  saveSquadProfile,
  type SquadProfile,
} from "@/app/rugby-tagging/lib/squadProfile";
import { PLAYER_IDENTITY_KEY } from "@/app/rugby-tagging/constants";
import { fetchCloudSavedMatches } from "@/lib/savedMatchesCloud";
import { fetchCloudSquadProfile } from "@/lib/squadProfileCloud";
import type { AvailabilityResponse } from "@/app/rugby-tagging/types";

function responseKey(r: AvailabilityResponse): string {
  return `${r.playerId}:${r.fixtureId ?? ""}:${r.trainingSessionId ?? ""}`;
}

function mergeLocalAvailability(
  local: SquadProfile | null,
  cloud: SquadProfile
): SquadProfile {
  const localResponses = local?.availabilityResponses ?? [];
  if (localResponses.length === 0) return cloud;

  const cloudResponses = cloud.availabilityResponses ?? [];
  const cloudMap = new Map(cloudResponses.map((r) => [responseKey(r), r]));

  for (const local of localResponses) {
    const key = responseKey(local);
    const existing = cloudMap.get(key);
    if (!existing || local.updatedAt > existing.updatedAt) {
      cloudMap.set(key, local);
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
        .select("player_squad_id, owner_user_id")
        .eq("member_user_id", user.id)
        .eq("status", "accepted")
        .eq("role", "player")
        .maybeSingle();

      if (membershipError) {
        console.error("[SyncPlayerData] membership lookup failed:", membershipError.message);
        return;
      }
      if (!membership || cancelled) {
        console.warn("[SyncPlayerData] no accepted player membership found for", user.id);
        return;
      }
      console.log("[SyncPlayerData] membership found:", membership);

      const [{ profile, error: profileError }, { records: cloudMatches, error: matchesError }] =
        await Promise.all([fetchCloudSquadProfile(), fetchCloudSavedMatches()]);

      if (cancelled) return;

      if (profileError) {
        console.error("[SyncPlayerData] squad profile fetch failed:", profileError);
      } else {
        console.log("[SyncPlayerData] profile fetched:", profile ? profile.teamName : "null");
      }
      if (matchesError) {
        console.error("[SyncPlayerData] matches fetch failed:", matchesError);
      } else {
        console.log("[SyncPlayerData] matches fetched:", cloudMatches.length);
      }

      if (profile) saveSquadProfile(mergeLocalAvailability(getSquadProfile(), profile));
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
