"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { replaceSavedMatches } from "@/app/rugby-tagging/lib/savedMatches";
import { saveSquadProfile } from "@/app/rugby-tagging/lib/squadProfile";
import { PLAYER_IDENTITY_KEY } from "@/app/rugby-tagging/constants";
import { fetchCloudSavedMatches } from "@/lib/savedMatchesCloud";
import { fetchCloudSquadProfile } from "@/lib/squadProfileCloud";

export function SyncPlayerData() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Check if this authenticated user is an accepted player member
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

      if (!membership || cancelled) return;

      // Auto-set player identity in localStorage (skips the PlayerPicker)
      if (membership.player_squad_id) {
        const currentId = localStorage.getItem(PLAYER_IDENTITY_KEY);
        if (!currentId) {
          localStorage.setItem(PLAYER_IDENTITY_KEY, membership.player_squad_id);
          window.dispatchEvent(new Event("player-identity-changed"));
        }
      }

      // Fetch coach's squad profile and match data (RLS allows this for accepted members)
      const [{ profile, error: profileError }, { records: cloudMatches, error: matchesError }] =
        await Promise.all([fetchCloudSquadProfile(), fetchCloudSavedMatches()]);

      if (cancelled) return;

      if (profileError) {
        console.error("[SyncPlayerData] squad profile fetch failed:", profileError);
      }
      if (matchesError) {
        console.error("[SyncPlayerData] saved matches fetch failed:", matchesError);
      }

      if (profile) {
        saveSquadProfile(profile);
        window.dispatchEvent(new Event("player-identity-changed"));
      }
      if (cloudMatches.length > 0) replaceSavedMatches(cloudMatches);
    }

    void sync();
    return () => { cancelled = true; };
  }, []);

  return null;
}
