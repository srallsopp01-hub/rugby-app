"use client";

import { useEffect } from "react";
import { getTeam, saveTeam } from "@/app/rugby-tagging/lib/team";
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

    void sync();

    function handleVisibility() {
      if (document.visibilityState === "visible") void sync();
    }
    function handleTeamChanged() {
      void sync();
    }

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
