"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "@/app/providers/TeamContext";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/team";

type PlayerContextValue = {
  currentPlayer: SquadPlayer | null;
  setCurrentPlayer: (player: SquadPlayer) => void;
  clearCurrentPlayer: () => void;
  ready: boolean;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { team } = useTeam();
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!team) return;
    const teamId = team.id;

    async function resolvePlayerIdentity() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setReady(true); return; }

      const { data: membership } = await supabase
        .from("team_members")
        .select("player_squad_id")
        .eq("user_id", user.id)
        .eq("team_id", teamId)
        .eq("status", "active")
        .eq("role", "player")
        .maybeSingle();

      if (membership?.player_squad_id) {
        setCurrentPlayerId(membership.player_squad_id);
      }
      setReady(true);
    }

    void resolvePlayerIdentity();
  }, [team?.id]);

  const currentPlayer = currentPlayerId && team
    ? (team.players.find((p) => p.id === currentPlayerId) ?? null)
    : null;

  function setCurrentPlayer(player: SquadPlayer) {
    setCurrentPlayerId(player.id);
  }

  function clearCurrentPlayer() {
    setCurrentPlayerId(null);
  }

  return (
    <PlayerContext.Provider value={{ currentPlayer, setCurrentPlayer, clearCurrentPlayer, ready }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
