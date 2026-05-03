"use client";

import { useEffect } from "react";
import { getTeam, saveTeam } from "@/app/rugby-tagging/lib/team";
import { fetchCloudTeam, mergeTeams, upsertCloudTeam } from "@/lib/teamCloud";

export function SyncTeam() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const local = getTeam();
      const { team: cloud } = await fetchCloudTeam();

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
        void upsertCloudTeam(finalTeam);
      }
    }

    void sync();

    function handleVisibility() {
      if (document.visibilityState === "visible") void sync();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
