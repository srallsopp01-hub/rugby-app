import { POSITION_OPTIONS } from "../constants";
import type { RosterRow } from "../types";

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
};

export default function TeamSheetModal({
  show,
  teamSheetPaste,
  rosterRows,
  onTeamSheetPasteChange,
  onUpdateRosterRow,
  onApplyPastedTeamSheet,
  onSubmitTeamSheet,
  onSkip,
}: TeamSheetModalProps) {
  if (!show) return null;

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
                    </tr>
                  ))}
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