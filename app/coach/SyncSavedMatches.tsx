"use client";

import { useEffect } from "react";
import { syncAllLocalMatchesToCloud } from "@/lib/savedMatchesCloud";
import {
  getMyTeamContext,
  ACTIVE_TEAM_CHANGED_EVENT,
} from "@/lib/teamContext";

export const CLOUD_SYNC_ERROR_EVENT = "fynlwhistle-cloud-sync-error";

export function SyncSavedMatches() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const ctx = await getMyTeamContext();
      if (!ctx || cancelled) return;

      const { errors } = await syncAllLocalMatchesToCloud(ctx.teamId);
      if (cancelled) return;
      if (errors.length > 0) {
        window.dispatchEvent(
          new CustomEvent(CLOUD_SYNC_ERROR_EVENT, { detail: errors })
        );
      }
    }

    void sync();

    function handleTeamChanged() {
      void sync();
    }
    window.addEventListener(ACTIVE_TEAM_CHANGED_EVENT, handleTeamChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(ACTIVE_TEAM_CHANGED_EVENT, handleTeamChanged);
    };
  }, []);

  return null;
}
