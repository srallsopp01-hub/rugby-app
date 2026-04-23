import { useState } from "react";
import { POSITION_OPTIONS } from "../constants";
import type { PlayerAction, RosterRow } from "../types";

type MatchdayRosterPanelProps = {
  rosterRows: RosterRow[];
  playersCount: number;
  selectedPlayer: string;
  showRawTranscript: boolean;
  onUpdateRosterRow: (
    number: number,
    field: "name" | "position" | "minutes",
    value: string
  ) => void;
  onSelectedPlayerChange: (value: string) => void;
  onShowRawTranscriptChange: (checked: boolean) => void;
  onQuickTag: (action: PlayerAction) => void;
  onBringOn: (playerNumber: number, position: string) => void;
};

const runAndBlur = (
  handler: () => void,
  event: React.MouseEvent<HTMLButtonElement>
) => {
  handler();
  event.currentTarget.blur();
};

export default function MatchdayRosterPanel({
  rosterRows,
  playersCount,
  selectedPlayer,
  showRawTranscript,
  onUpdateRosterRow,
  onSelectedPlayerChange,
  onShowRawTranscriptChange,
  onQuickTag,
  onBringOn,
}: MatchdayRosterPanelProps) {
  const [bringOnNumber, setBringOnNumber] = useState<number | null>(null);
  const [bringOnPosition, setBringOnPosition] = useState("");

  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between">
        <h2 className="mb-2 text-lg font-semibold text-foreground-strong">
          Quick player tags
        </h2>
        <span className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs text-muted">
          {playersCount}/23 named
        </span>
      </div>

      <div className="space-y-3">
        <select
          value={selectedPlayer}
          onChange={(e) => onSelectedPlayerChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-panel-2 p-2.5 text-sm text-foreground"
        >
          <option value="">Select player</option>
          {rosterRows
            .filter((row) => row.name.trim())
            .map((row) => (
              <option key={row.number} value={row.name}>
                {row.number} — {row.name}
                {row.position ? ` (${row.position})` : ""}
              </option>
            ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(e) => runAndBlur(() => onQuickTag("tackle"), e)}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            + Tackle
          </button>
          <button
            type="button"
            onClick={(e) => runAndBlur(() => onQuickTag("missed tackle"), e)}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            + Missed Tackle
          </button>
          <button
            type="button"
            onClick={(e) => runAndBlur(() => onQuickTag("carry"), e)}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            + Carry
          </button>
          <button
            type="button"
            onClick={(e) => runAndBlur(() => onQuickTag("turnover"), e)}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            + Turnover
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        <input
          id="show-raw-transcript"
          type="checkbox"
          checked={showRawTranscript}
          onChange={(e) => onShowRawTranscriptChange(e.target.checked)}
        />
        <label htmlFor="show-raw-transcript" className="text-sm text-muted">
          Show raw transcript debug
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Matchday 1–23
        </h3>
        <span className="text-xs text-muted">
          Team sheet editing
        </span>
      </div>

      <div className="mt-3 max-h-[28rem] overflow-y-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-panel-2">
            <tr>
              <th className="p-2 text-left">No.</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Position</th>
              <th className="p-2 text-left">Min</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rosterRows.map((row) => (
              <tr key={row.number} className="border-t border-border">
                <td className="p-2 text-muted">{row.number}</td>
                <td className="p-2">
                  <input
                    value={row.name ?? ""}
                    onChange={(e) =>
                      onUpdateRosterRow(row.number, "name", e.target.value)
                    }
                    className="w-full rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                    placeholder={`Player ${row.number}`}
                  />
                </td>
                <td className="p-2">
                  <select
                    value={row.position ?? ""}
                    onChange={(e) =>
                      onUpdateRosterRow(row.number, "position", e.target.value)
                    }
                    className="w-full rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                  >
                    <option value="">Select position</option>
                    {POSITION_OPTIONS.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={row.minutes === "" ? "" : row.minutes}
                    onChange={(e) =>
                      onUpdateRosterRow(row.number, "minutes", e.target.value)
                    }
                    className="w-20 rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                    placeholder="0"
                  />
                </td>
                <td className="p-2">
                  {row.number >= 16 && row.name.trim() && bringOnNumber !== row.number && (
                    <button
                      type="button"
                      onClick={(e) => {
                        setBringOnNumber(row.number);
                        setBringOnPosition("");
                        e.currentTarget.blur();
                      }}
                      className="whitespace-nowrap rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground"
                    >
                      Bring On
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {bringOnNumber !== null && (() => {
              const row = rosterRows.find((r) => r.number === bringOnNumber);
              if (!row) return null;
              return (
                <tr className="border-t border-border bg-orange-500/5">
                  <td colSpan={5} className="px-3 py-2">
                    <p className="mb-2 text-xs text-muted">
                      {row.name} — coming on at:
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={bringOnPosition}
                        onChange={(e) => setBringOnPosition(e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                        autoFocus
                      >
                        <option value="">Select position</option>
                        {POSITION_OPTIONS.filter((p) => p !== "Bench").map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={(e) => {
                          if (!bringOnPosition) return;
                          onBringOn(bringOnNumber, bringOnPosition);
                          setBringOnNumber(null);
                          setBringOnPosition("");
                          e.currentTarget.blur();
                        }}
                        disabled={!bringOnPosition}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground disabled:opacity-40"
                      >
                        Log Sub
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          setBringOnNumber(null);
                          e.currentTarget.blur();
                        }}
                        className="text-xs text-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}