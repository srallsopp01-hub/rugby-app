"use client";

import { useState } from "react";
import type { SquadPlayer } from "../lib/squadProfile";

type PendingNameFor = "try-scored" | "penalty-conceded" | null;

type TeamEventsPanelProps = {
  squad: SquadPlayer[];
  onAddPenaltyConceded: (playerName?: string) => void;
  onAddPenaltyFor: () => void;
  onAddTryScored: (playerName?: string) => void;
  onAddTryConceded: () => void;
};

const runAndBlur = (
  handler: () => void,
  event: React.MouseEvent<HTMLButtonElement>
) => {
  handler();
  event.currentTarget.blur();
};

export default function TeamEventsPanel({
  squad,
  onAddPenaltyConceded,
  onAddPenaltyFor,
  onAddTryScored,
  onAddTryConceded,
}: TeamEventsPanelProps) {
  const [pendingNameFor, setPendingNameFor] = useState<PendingNameFor>(null);
  const [selectedName, setSelectedName] = useState("");

  const activePlayers = squad.filter((p) => p.status === "active");

  const openPicker = (type: PendingNameFor) => {
    setPendingNameFor(type);
    setSelectedName(activePlayers[0]?.preferredName || activePlayers[0]?.fullName || "");
  };

  const confirmWithName = () => {
    if (pendingNameFor === "try-scored") onAddTryScored(selectedName || undefined);
    if (pendingNameFor === "penalty-conceded") onAddPenaltyConceded(selectedName || undefined);
    setPendingNameFor(null);
    setSelectedName("");
  };

  const confirmWithoutName = () => {
    if (pendingNameFor === "try-scored") onAddTryScored();
    if (pendingNameFor === "penalty-conceded") onAddPenaltyConceded();
    setPendingNameFor(null);
    setSelectedName("");
  };

  return (
    <div className="rounded-2xl border border-border bg-panel-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">Team events</h3>

      {pendingNameFor ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted">
            {pendingNameFor === "try-scored" ? "Who scored the try?" : "Who conceded the penalty?"}
          </p>

          {activePlayers.length > 0 ? (
            <select
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
              className="w-full rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
            >
              {activePlayers.map((p) => {
                const name = p.preferredName || p.fullName;
                return (
                  <option key={p.id} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          ) : (
            <p className="text-xs text-muted">No squad set up yet.</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmWithName}
              disabled={activePlayers.length === 0}
              className="rounded-xl border border-border-light bg-panel-3 px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
            >
              Log
            </button>
            <button
              type="button"
              onClick={confirmWithoutName}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted"
            >
              Skip (no name)
            </button>
            <button
              type="button"
              onClick={() => setPendingNameFor(null)}
              className="ml-auto rounded-xl border border-border px-3 py-2 text-sm text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={(e) => runAndBlur(onAddPenaltyFor, e)}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            + Penalty For
          </button>

          <button
            type="button"
            onClick={() => openPicker("penalty-conceded")}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            + Penalty Conceded
          </button>

          <button
            type="button"
            onClick={() => openPicker("try-scored")}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            + Try Scored
          </button>

          <button
            type="button"
            onClick={(e) => runAndBlur(onAddTryConceded, e)}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            + Try Conceded
          </button>
        </div>
      )}
    </div>
  );
}
