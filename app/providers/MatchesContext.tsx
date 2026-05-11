"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchCloudSavedMatches } from "@/lib/savedMatchesCloud";
import { getMyTeamContext, ACTIVE_TEAM_CHANGED_EVENT } from "@/lib/teamContext";
import { SAVED_MATCHES_CHANGED_EVENT, setMatchesCache, type SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";

type MatchesContextValue = {
  matches: SavedMatchRecord[];
  isLoading: boolean;
  refresh: () => void;
};

const MatchesContext = createContext<MatchesContextValue | null>(null);

export function MatchesProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<SavedMatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    const ctx = await getMyTeamContext();
    if (!ctx) {
      setMatchesCache([]);
      setMatches([]);
      setIsLoading(false);
      return;
    }
    const { records } = await fetchCloudSavedMatches(ctx.teamId);
    setMatchesCache(records);
    setMatches(records);
    setIsLoading(false);
    // Notify useSyncExternalStore subscribers that fresh data is in the cache.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(SAVED_MATCHES_CHANGED_EVENT));
    }
  }, []);

  useEffect(() => {
    void fetchMatches();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchMatches();
    };

    // When upsertSavedMatch/deleteSavedMatch update the cache and fire
    // SAVED_MATCHES_CHANGED_EVENT with a CustomEvent detail, sync React state.
    // Plain Events (dispatched by fetchMatches after a cloud fetch) have no detail
    // and must be ignored here — state is already set via setMatches(records) above.
    const handleSave = (e: Event) => {
      const detail = (e as CustomEvent<SavedMatchRecord[]>).detail;
      if (Array.isArray(detail)) {
        setMatches(detail);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(SAVED_MATCHES_CHANGED_EVENT, handleSave);
    window.addEventListener(ACTIVE_TEAM_CHANGED_EVENT, fetchMatches as EventListener);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(SAVED_MATCHES_CHANGED_EVENT, handleSave);
      window.removeEventListener(ACTIVE_TEAM_CHANGED_EVENT, fetchMatches as EventListener);
    };
  }, [fetchMatches]);

  return (
    <MatchesContext.Provider value={{ matches, isLoading, refresh: fetchMatches }}>
      {children}
    </MatchesContext.Provider>
  );
}

export function useMatches() {
  const ctx = useContext(MatchesContext);
  if (!ctx) throw new Error("useMatches must be used within MatchesProvider");
  return ctx;
}
