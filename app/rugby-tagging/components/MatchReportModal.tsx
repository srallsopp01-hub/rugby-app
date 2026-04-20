import type { ReportRow, UnitSummaryRow } from "../types";

type MatchReportModalProps = {
  show: boolean;
  matchTitle: string;
  opponent: string;
  matchDate: string;
  gameCoachingComment: string;
  gameFlowSummary: string;
  unitSummaryRows: UnitSummaryRow[];
  reportRows: ReportRow[];
  forwardsRows: ReportRow[];
  onClose: () => void;
  onOpenPlayer: (playerName: string) => void;
};

export default function MatchReportModal({
  show,
  matchTitle,
  opponent,
  matchDate,
  gameCoachingComment,
  gameFlowSummary,
  unitSummaryRows,
  reportRows,
  onClose,
  onOpenPlayer,
}: MatchReportModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 px-4 py-6">
      <div className="mx-auto flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground-strong">
              Match Report
            </h2>
            <p className="mt-1 text-sm text-muted">
              Full post-tagging analysis workspace.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="rounded-2xl border border-border bg-panel-2 p-5">
            <h3 className="text-xl font-semibold text-foreground-strong">
              {matchTitle || "Match report"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {[opponent ? `vs ${opponent}` : "", matchDate].filter(Boolean).join(" • ")}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-border bg-panel-2 p-5">
              <h3 className="text-lg font-semibold text-foreground-strong">
                Game coaching comment
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                {gameCoachingComment || "No coaching summary yet."}
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-panel-2 p-5">
              <h3 className="text-lg font-semibold text-foreground-strong">
                Game flow summary
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                {gameFlowSummary || "No game flow summary yet."}
              </p>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-panel-2 p-5">
            <h3 className="text-lg font-semibold text-foreground-strong">
              Unit summary
            </h3>

            {unitSummaryRows.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No unit summary yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="p-2">Unit</th>
                      <th className="p-2">Players</th>
                      <th className="p-2">Avg Tackles/Min</th>
                      <th className="p-2">Avg Carries/Min</th>
                      <th className="p-2">Avg Inv/Min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitSummaryRows.map((row) => (
                      <tr key={row.unit} className="border-b border-border/60">
                        <td className="p-2 font-medium text-foreground">{row.unit}</td>
                        <td className="p-2 text-muted">{row.players}</td>
                        <td className="p-2 text-muted">{row.avgTacklesPerMin.toFixed(2)}</td>
                        <td className="p-2 text-muted">{row.avgCarriesPerMin.toFixed(2)}</td>
                        <td className="p-2 text-muted">
                          {row.avgInvolvementsPerMin.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-panel-2 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground-strong">
                Player report
              </h3>
              <span className="text-xs text-muted">
                Click a player name to open their breakdown
              </span>
            </div>

            {reportRows.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No player report yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="p-2">No.</th>
                      <th className="p-2">Player</th>
                      <th className="p-2">Position</th>
                      <th className="p-2">Minutes</th>
                      <th className="p-2">T</th>
                      <th className="p-2">MT</th>
                      <th className="p-2">C</th>
                      <th className="p-2">TO</th>
                      <th className="p-2">Inv</th>
                      <th className="p-2">Tackle %</th>
                      <th className="p-2">Overall</th>
                      <th className="p-2">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row) => (
                      <tr
                        key={row.name}
                        className="border-b border-border/60"
                      >
                        <td className="p-2 text-muted">{row.number}</td>
                        <td className="p-2">
                          <button
                            onClick={() => onOpenPlayer(row.name)}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {row.name}
                          </button>
                        </td>
                        <td className="p-2 text-muted">{row.position}</td>
                        <td className="p-2 text-muted">{row.minutes}</td>
                        <td className="p-2 text-muted">{row.tackles}</td>
                        <td className="p-2 text-muted">{row.missed}</td>
                        <td className="p-2 text-muted">{row.carries}</td>
                        <td className="p-2 text-muted">{row.turnovers}</td>
                        <td className="p-2 text-muted">{row.involvements}</td>
                        <td className="p-2 text-muted">{row.tacklePct.toFixed(0)}%</td>
                        <td className="p-2 font-medium text-foreground">{row.overallGrade}</td>
                        <td className="p-2 text-muted">{row.coachComment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}