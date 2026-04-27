"use client";

import { useEffect } from "react";
import {
  getSavedMatches,
  replaceSavedMatches,
} from "@/app/rugby-tagging/lib/savedMatches";
import {
  fetchCloudSavedMatches,
  mergeSavedMatches,
  upsertCloudSavedMatch,
} from "@/lib/savedMatchesCloud";

export function SyncSavedMatches() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const local = getSavedMatches();
      const cloud = await fetchCloudSavedMatches();

      if (cancelled) return;

      const merged = mergeSavedMatches(cloud, local);
      replaceSavedMatches(merged);

      const cloudIds = new Set(cloud.map((match) => match.id));
      const cloudUpdated = new Map(
        cloud.map((match) => [match.id, match.updatedAt])
      );

      await Promise.all(
        merged
          .filter(
            (match) =>
              !cloudIds.has(match.id) ||
              cloudUpdated.get(match.id) !== match.updatedAt
          )
          .map((match) => upsertCloudSavedMatch(match))
      );
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
