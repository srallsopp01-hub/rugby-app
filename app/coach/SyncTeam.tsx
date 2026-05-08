"use client";

import { useEffect } from "react";
import { createDefaultTeam, getTeam, saveTeam } from "@/app/rugby-tagging/lib/team";
import { fetchCloudTeam, mergeTeams, upsertCloudTeam } from "@/lib/teamCloud";
import {
  getMyTeamContext,
  ACTIVE_TEAM_CHANGED_EVENT,
} from "@/lib/teamContext";

export function SyncTeam() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const ctx = await getMyTeamContext();
      if (!ctx || cancelled) return;

      const teamId = ctx.teamId;
      const local = getTeam();
      const { team: cloud } = await fetchCloudTeam(teamId);

      if (cancelled) return;

      const merged = mergeTeams(cloud, local);
      if (!merged) return;

      // Availability responses are player-owned — always use the cloud version
      // so coach saves never overwrite what players have submitted.
      const finalTeam = cloud
        ? { ...merged, availabilityResponses: cloud.availabilityResponses ?? [] }
        : merged;

      saveTeam(finalTeam);

      if (!cloud || finalTeam.updatedAt !== cloud.updatedAt) {
        void upsertCloudTeam(finalTeam, teamId);
      }
    }

    // On team switch: pull cloud data for the new team first so stale local data
    // from the previous team is never pushed up to the new team.
    async function pullThenSync() {
      if (cancelled) return;
      const ctx = await getMyTeamContext();
      if (!ctx || cancelled) return;
      const { team: cloud } = await fetchCloudTeam(ctx.teamId);
      if (cancelled) return;
      if (!cloud) {
        // New team with no cloud data — start blank locally, don't push anything yet.
        saveTeam(createDefaultTeam());
        return;
      }
      saveTeam(cloud);
      await sync();
    }

    void pullThenSync();

    function handleVisibility() {
      if (document.visibilityState === "visible") void sync();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(ACTIVE_TEAM_CHANGED_EVENT, pullThenSync);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(ACTIVE_TEAM_CHANGED_EVENT, pullThenSync);
    };
  }, []);

  return null;
}
