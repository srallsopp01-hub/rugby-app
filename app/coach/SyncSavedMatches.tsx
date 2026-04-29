"use client";

import { useEffect } from "react";
import { syncAllLocalMatchesToCloud } from "@/lib/savedMatchesCloud";

export const CLOUD_SYNC_ERROR_EVENT = "fynlwhistle-cloud-sync-error";

export function SyncSavedMatches() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const { errors } = await syncAllLocalMatchesToCloud();
      if (cancelled) return;
      if (errors.length > 0) {
        window.dispatchEvent(
          new CustomEvent(CLOUD_SYNC_ERROR_EVENT, { detail: errors })
        );
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
