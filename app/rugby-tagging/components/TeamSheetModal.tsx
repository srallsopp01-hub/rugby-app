import { POSITION_OPTIONS } from "../constants";
import type { RosterRow } from "../types";
import type { SquadPlayer } from "../lib/team";
import type { SavedMatchRecord } from "../lib/savedMatches";

type TeamSheetModalProps = {
  show: boolean;
  teamSheetPaste: string;
  rosterRows: RosterRow[];
  onTeamSheetPasteChange: (value: string) => void;
  onUpdateRosterRow: (
    number: number,
    field: "name" | "position" | "minutes",
    value: string
  ) => void;
  onApplyPastedTeamSheet: () => void;
  onSubmitTeamSheet: () => void;
  onSkip?: () => void;
  savedMatches?: SavedMatchRecord[];
  onLoadFromMatch?: (rows: RosterRow[]) => void;
  squadPlayers?: SquadPlayer[];
};

function sortPlayersByPosition(players: SquadPlayer[], position: string): SquadPlayer[] {
  if (!position) return [...players];
  return [...players].sort((a, b) => {
    const aScore = a.primaryPosition === position ? 0 : a.secondaryPositions?.includes(position) ? 1 : 2;
    const bScore = b.primaryPosition === position ? 0 : b.secondaryPositions?.includes(position) ? 1 : 2;
    return aScore - bScore;
  });
}

export default function TeamSheetModal({
  show,
  teamSheetPaste,
  rosterRows,
  onTeamSheetPasteChange,
  onUpdateRosterRow,
  onApplyPastedTeamSheet,
  onSubmitTeamSheet,
  onSkip,
  savedMatches,
  onLoadFromMatch,
  squadPlayers,
}: TeamSheetModalProps) {
  if (!show) return null;

  const hasSavedMatches = savedMatches && savedMatches.length > 0 && onLoadFromMatch;
  const hasSquadPlayers = squadPlayers && squadPlayers.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-foreground-strong">
            Enter Team Sheet
          </h2>
          <p className="mt-2 text-sm text-muted">
            Paste your team sheet in full-name positional order. The app will
            assume shirt numbers 1–23 and auto-fill default positions, then
            you can quickly adjust anything before tagging.
          </p>
        </div>

        {hasSavedMatches && (
          <div className="mb-4 rounded-xl border border-border bg-panel-2 px-4 py-3">
            <label className="block text-xs font-medium text-muted mb-1.5">
              Load from previous match
            </label>
            <select
              defaultValue=""
              onChange={(e) => {
                const match = savedMatches.find((m) => m.id === e.target.value);
                if (match?.rosterRows) {
                  onLoadFromMatch(match.rosterRows as RosterRow[]);
                }
                e.target.value = "";
              }}
              className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground"
            >
              <option value="" disabled>Select a previous match…</option>
              {[...savedMatches]
                .sort((a, b) => (b.matchDate || b.updatedAt).localeCompare(a.matchDate || a.updatedAt))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.opponent ? `vs ${m.opponent}` : m.matchTitle || "Untitled match"}
                    {m.matchDate ? ` — ${m.matchDate}` : ""}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Paste team sheet
            </label>
            <textarea
              value={teamSheetPaste}
              onChange={(e) => onTeamSheetPasteChange(e.target.value)}
              className="min-h-72 w-full rounded-xl border border-border bg-panel-2 p-3 text-sm text-foreground"
              placeholder={`Player One
Player Two
Player Three
Player Four
Player Five

Paste full names in positional order.
You can also use:
1, Player One, Prop`}
            />
            <button
              onClick={onApplyPastedTeamSheet}
              className="mt-3 rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
            >
              Apply Paste
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Review and adjust
            </label>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-panel-2">
                  <tr>
                    <th className="p-2 text-left">No.</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterRows.map((row) => {
                    const sorted = hasSquadPlayers
                      ? sortPlayersByPosition(squadPlayers, row.position)
                      : [];
                    const datalistId = `squad-players-${row.number}`;
                    return (
                      <tr key={row.number} className="border-t border-border">
                        <td className="p-2 text-muted">{row.number}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            list={hasSquadPlayers ? datalistId : undefined}
                            value={row.name ?? ""}
                            onChange={(e) =>
                              onUpdateRosterRow(row.number, "name", e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                            placeholder={`Player ${row.number}`}
                          />
                          {hasSquadPlayers && (
                            <datalist id={datalistId}>
                              {sorted.map((p) => (
                                <option
                                  key={p.id}
                                  value={p.preferredName || p.fullName}
                                />
                              ))}
                            </datalist>
                          )}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted hover:text-foreground"
            >
              Skip for now
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onSubmitTeamSheet}
            className="rounded-xl border border-border-light bg-panel-3 px-5 py-2.5 text-sm font-medium text-foreground"
          >
            Submit Team Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
