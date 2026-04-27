"use client";

import { useEffect } from "react";
import { syncAllLocalMatchesToCloud } from "@/lib/savedMatchesCloud";

export function SyncSavedMatches() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      await syncAllLocalMatchesToCloud();
      if (cancelled) return;
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
