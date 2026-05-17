import { POSITION_OPTIONS } from "../constants";
import { formatMatchDate } from "../helpers";
import type { RosterRow } from "../types";
import type { SquadPlayer } from "../lib/team";
import type { SavedMatchRecord } from "../lib/savedMatches";

type TeamSheetModalProps = {
  show: boolean;
  rosterRows: RosterRow[];
  onUpdateRosterRow: (
    number: number,
    field: "name" | "position" | "minutes",
    value: string
  ) => void;
  onSelectPlayer?: (number: number, playerId: string, playerName: string) => void;
  onSubmitTeamSheet: () => void;
  onSkip?: () => void;
  savedMatches?: SavedMatchRecord[];
  onLoadFromMatch?: (rows: RosterRow[]) => void;
  squadPlayers?: SquadPlayer[];
  // Legacy paste props — kept optional so existing callers don't break
  teamSheetPaste?: string;
  onTeamSheetPasteChange?: (value: string) => void;
  onApplyPastedTeamSheet?: () => void;
};

function groupPlayersByPosition(players: SquadPlayer[], position: string) {
  const byName = (a: SquadPlayer, b: SquadPlayer) =>
    (a.preferredName || a.fullName).localeCompare(b.preferredName || b.fullName);
  if (!position) return { fits: [...players].sort(byName), others: [] };
  const fits: SquadPlayer[] = [];
  const others: SquadPlayer[] = [];
  for (const p of players) {
    if (p.primaryPosition === position || p.secondaryPositions?.includes(position)) {
      fits.push(p);
    } else {
      others.push(p);
    }
  }
  return { fits: fits.sort(byName), others: others.sort(byName) };
}

export default function TeamSheetModal({
  show,
  rosterRows,
  onUpdateRosterRow,
  onSelectPlayer,
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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-foreground-strong">
            Enter Team Sheet
          </h2>
          <p className="mt-2 text-sm text-muted">
            Select players for each shirt number. Players are grouped by position fit.
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
                .sort((a, b) => {
                  const toMs = (s: string) => {
                    const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                    if (m) return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
                    const d = new Date(s);
                    return isNaN(d.getTime()) ? 0 : d.getTime();
                  };
                  return toMs(b.matchDate || b.updatedAt) - toMs(a.matchDate || a.updatedAt);
                })
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.opponent ? `vs ${m.opponent}` : m.matchTitle || "Untitled match"}
                    {m.matchDate ? ` — ${formatMatchDate(m.matchDate)}` : ""}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="max-h-[55vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-panel-2 z-10">
                <tr>
                  <th className="p-2.5 text-left text-xs font-semibold text-muted-2 w-10">No.</th>
                  <th className="p-2.5 text-left text-xs font-semibold text-muted-2">Player</th>
                  <th className="p-2.5 text-left text-xs font-semibold text-muted-2 w-40">Position</th>
                </tr>
              </thead>
              <tbody>
                {rosterRows.map((row) => {
                  const { fits, others } = hasSquadPlayers
                    ? groupPlayersByPosition(squadPlayers, row.position)
                    : { fits: [], others: [] };

                  return (
                    <tr key={row.number} className="border-t border-border hover:bg-panel-2/50 transition-colors">
                      <td className="p-2.5 text-sm font-medium text-muted-2">{row.number}</td>
                      <td className="p-2.5">
                        {hasSquadPlayers ? (
                          <select
                            value={row.playerId ?? ""}
                            onChange={(e) => {
                              if (e.target.value === "") {
                                onUpdateRosterRow(row.number, "name", "");
                              } else {
                                const player = squadPlayers.find(p => p.id === e.target.value);
                                if (player && onSelectPlayer) {
                                  onSelectPlayer(row.number, player.id, player.preferredName || player.fullName);
                                }
                              }
                            }}
                            className="w-full rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                          >
                            <option value="">— Unassigned —</option>
                            {fits.length > 0 && (
                              <optgroup label="Fits position">
                                {fits.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.preferredName || p.fullName}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {others.length > 0 && (
                              <optgroup label="Other players">
                                {others.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.preferredName || p.fullName}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={row.name ?? ""}
                            onChange={(e) => onUpdateRosterRow(row.number, "name", e.target.value)}
                            className="w-full rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                            placeholder={`Player ${row.number}`}
                          />
                        )}
                      </td>
                      <td className="p-2.5">
                        <select
                          value={row.position ?? ""}
                          onChange={(e) => onUpdateRosterRow(row.number, "position", e.target.value)}
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
