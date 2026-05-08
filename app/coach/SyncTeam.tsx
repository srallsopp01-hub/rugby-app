"use client";

import { useEffect } from "react";
import { createDefaultTeam, getTeam, saveTeam } from "@/app/rugby-tagging/lib/team";
import { TEAM_KEY } from "@/app/rugby-tagging/constants";
import { SAVED_MATCHES_KEY } from "@/app/rugby-tagging/lib/savedMatches";
import { fetchCloudTeam, mergeTeams, upsertCloudTeam } from "@/lib/teamCloud";
import {
  getMyTeamContext,
  ACTIVE_TEAM_CHANGED_EVENT,
  ACTIVE_TEAM_ID_KEY,
} from "@/lib/teamContext";

// One-time migration: clears all localStorage keys that may contain stale
// cross-team data from before the per-team scoped key architecture was introduced.
// Runs once per browser; cloud data repopulates via pullThenSync after clearing.
const MIGRATION_FLAG = "fynlwhistle-storage-scoped-v1";
function runOneTimeMigration() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
  try {
    const prefixes = [
      TEAM_KEY,
      SAVED_MATCHES_KEY,
      "rugby-voice-tagging-mvp-v2",
      "rugby-tagging-current-match-id",
      "rugby-voice-tagging-corrections-v2",
    ];
    Object.keys(localStorage).forEach((k) => {
      if (prefixes.some((p) => k === p || k.startsWith(p + "-"))) {
        localStorage.removeItem(k);
      }
    });
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch { /* non-fatal */ }
}

export function SyncTeam() {
  useEffect(() => {
    runOneTimeMigration();
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
      // Remove the old unscoped key so migration or direct reads can't pick up
      // stale or corrupted cross-team data from a previous session.
      try { localStorage.removeItem(TEAM_KEY); } catch { /* non-fatal */ }
      await sync();
    }

    void pullThenSync();

    function handleVisibility() {
      if (document.visibilityState !== "visible") return;
      // If local team data belongs to a different team than what's active,
      // pull from cloud first so we never push stale cross-team data.
      const local = getTeam();
      const activeTeamId = localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? "";
      if (local?.id && activeTeamId && local.id !== activeTeamId) {
        void pullThenSync();
      } else {
        void sync();
      }
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
