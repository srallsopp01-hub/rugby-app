"use client";

import { useEffect } from "react";
import {
  fetchCloudSavedMatches,
  syncAllLocalMatchesToCloud,
} from "@/lib/savedMatchesCloud";
import { replaceSavedMatches, SAVED_MATCHES_KEY } from "@/app/rugby-tagging/lib/savedMatches";
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

    // On team switch: replace local matches with the new team's cloud matches
    // before syncing, so stale matches from the previous team are never pushed
    // up to the new team.
    async function pullThenSync() {
      if (cancelled) return;
      const ctx = await getMyTeamContext();
      if (!ctx || cancelled) return;
      const { records: cloud } = await fetchCloudSavedMatches(ctx.teamId);
      if (cancelled) return;
      replaceSavedMatches(cloud);
      // Remove the old unscoped key so direct localStorage reads in pages
      // can't pick up stale cross-team data.
      try { localStorage.removeItem(SAVED_MATCHES_KEY); } catch { /* non-fatal */ }
      await sync();
    }

    void pullThenSync();

    window.addEventListener(ACTIVE_TEAM_CHANGED_EVENT, pullThenSync);

    return () => {
      cancelled = true;
      window.removeEventListener(ACTIVE_TEAM_CHANGED_EVENT, pullThenSync);
    };
  }, []);

  return null;
}
