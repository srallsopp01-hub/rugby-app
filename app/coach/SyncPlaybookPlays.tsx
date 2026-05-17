"use client";

import { useEffect } from "react";
import { fetchCloudPlays, upsertCloudPlay } from "@/lib/playbookPlaysCloud";
import { ACTIVE_TEAM_CHANGED_EVENT, ACTIVE_TEAM_ID_KEY } from "@/lib/teamContext";
import { PLAYS_CHANGED_EVENT } from "@/app/coach/playbook/lib/playsStore";
import type { Play } from "@/app/coach/playbook/lib/types";

const STORE_KEY = (teamId: string) => `fynlwhistle-playbook-plays-${teamId}`;

function getLocalPlays(teamId: string): Play[] {
  try {
    const raw = localStorage.getItem(STORE_KEY(teamId));
    if (!raw) return [];
    return (JSON.parse(raw) as { plays: Play[] }).plays ?? [];
  } catch {
    return [];
  }
}

async function syncPlays() {
  const teamId = localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? "";
  if (!teamId) return;

  const { plays: cloudPlays } = await fetchCloudPlays(teamId);
  const localPlays = getLocalPlays(teamId);

  // Merge: newest updatedAt wins, tie goes to cloud
  const merged = new Map<string, Play>();
  for (const cp of cloudPlays) {
    merged.set(cp.id, cp);
  }
  for (const lp of localPlays) {
    const existing = merged.get(lp.id);
    if (!existing || lp.updatedAt > existing.updatedAt) {
      merged.set(lp.id, lp);
    }
  }

  const mergedPlays = Array.from(merged.values());
  localStorage.setItem(STORE_KEY(teamId), JSON.stringify({ plays: mergedPlays }));

  // Push-up: upsert any local play not in cloud (or newer than cloud version)
  const cloudIds = new Set(cloudPlays.map((cp) => cp.id));
  const cloudById = new Map(cloudPlays.map((cp) => [cp.id, cp]));
  for (const lp of localPlays) {
    if (!cloudIds.has(lp.id) || lp.updatedAt > (cloudById.get(lp.id)?.updatedAt ?? "")) {
      void upsertCloudPlay(lp, teamId);
    }
  }

  window.dispatchEvent(new Event(PLAYS_CHANGED_EVENT));
}

export default function SyncPlaybookPlays() {
  useEffect(() => {
    void syncPlays();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void syncPlays();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(ACTIVE_TEAM_CHANGED_EVENT, syncPlays);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(ACTIVE_TEAM_CHANGED_EVENT, syncPlays);
    };
  }, []);

  return null;
}
