import { gradeClassName } from "../helpers";
import type { ReportRow, UnitSummaryRow } from "../types";

type ReportBuilderPanelProps = {
  show: boolean;
  gameCoachingComment: string;
  gameFlowSummary: string;
  unitSummaryRows: UnitSummaryRow[];
  reportRows: ReportRow[];
  forwardsRows: ReportRow[];
  onClose: () => void;
};

export default function ReportBuilderPanel({
  show,
  gameCoachingComment,
  gameFlowSummary,
  unitSummaryRows,
  reportRows,
  forwardsRows,
  onClose,
}: ReportBuilderPanelProps) {
  if (!show) return null;

  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground-strong">
          Report Builder
        </h2>
        <button
          onClick={onClose}
          className="text-xs font-medium text-muted hover:text-foreground"
        >
          close
        </button>
      </div>

      <div className="rounded-xl border border-border bg-panel-2 p-4 text-sm text-foreground">
        <div className="font-semibold">Game coaching comment</div>
        <p className="mt-2 text-muted">{gameCoachingComment}</p>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-panel-2 p-4 text-sm text-foreground">
        <div className="font-semibold">Game flow summary</div>
        <p className="mt-2 text-muted">{gameFlowSummary}</p>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Unit summary
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-panel-2">
              <tr>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-center">Players</th>
                <th className="p-2 text-center">Avg T/Min</th>
                <th className="p-2 text-center">Avg C/Min</th>
                <th className="p-2 text-center">Avg Inv/Min</th>
              </tr>
            </thead>
            <tbody>
              {unitSummaryRows.map((row) => (
                <tr key={row.unit} className="border-t border-border">
                  <td className="p-2">{row.unit}</td>
                  <td className="p-2 text-center">{row.players}</td>
                  <td className="p-2 text-center">
                    {row.avgTacklesPerMin.toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    {row.avgCarriesPerMin.toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    {row.avgInvolvementsPerMin.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Full team report
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-panel-2">
              <tr>
                <th className="p-2 text-left">No.</th>
                <th className="p-2 text-left">Player</th>
                <th className="p-2 text-left">Pos</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-center">Min</th>
                <th className="p-2 text-center">T</th>
                <th className="p-2 text-center">MT</th>
                <th className="p-2 text-center">Carries</th>
                <th className="p-2 text-center">TO</th>
                <th className="p-2 text-center">Inv</th>
                <th className="p-2 text-center">T%</th>
                <th className="p-2 text-center">T/Min</th>
                <th className="p-2 text-center">C/Min</th>
                <th className="p-2 text-center">Inv/Min</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => (
                <tr key={row.number} className="border-t border-border">
                  <td className="p-2">{row.number}</td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.position}</td>
                  <td className="p-2">{row.unit}</td>
                  <td className="p-2 text-center">{row.minutes}</td>
                  <td className="p-2 text-center">{row.tackles}</td>
                  <td className="p-2 text-center">{row.missed}</td>
                  <td className="p-2 text-center">{row.carries}</td>
                  <td className="p-2 text-center">{row.turnovers}</td>
                  <td className="p-2 text-center">{row.involvements}</td>
                  <td className="p-2 text-center">
                    {row.tacklePct.toFixed(0)}%
                  </td>
                  <td className="p-2 text-center">
                    {row.tacklesPerMin.toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    {row.carriesPerMin.toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    {row.involvementsPerMin.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Forwards analysis
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-panel-2">
              <tr>
                <th className="p-2 text-left">Player</th>
                <th className="p-2 text-left">Pos</th>
                <th className="p-2 text-center">Min</th>
                <th className="p-2 text-center">T</th>
                <th className="p-2 text-center">MT</th>
                <th className="p-2 text-center">T%</th>
                <th className="p-2 text-center">T% Grade</th>
                <th className="p-2 text-center">T/Min</th>
                <th className="p-2 text-center">T/Min Grade</th>
                <th className="p-2 text-center">Carries</th>
                <th className="p-2 text-center">C/Min</th>
                <th className="p-2 text-center">C/Min Grade</th>
                <th className="p-2 text-center">TO</th>
                <th className="p-2 text-center">Inv</th>
                <th className="p-2 text-center">Inv/Min</th>
                <th className="p-2 text-center">Work Rate</th>
                <th className="p-2 text-center">Overall</th>
                <th className="p-2 text-left">Coach comment</th>
              </tr>
            </thead>
            <tbody>
              {forwardsRows.map((row) => (
                <tr key={row.number} className="border-t border-border">
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.position}</td>
                  <td className="p-2 text-center">{row.minutes}</td>
                  <td className="p-2 text-center">{row.tackles}</td>
                  <td className="p-2 text-center">{row.missed}</td>
                  <td className="p-2 text-center">
                    {row.tacklePct.toFixed(0)}%
                  </td>
                  <td
                    className={`p-2 text-center ${gradeClassName(
                      row.tacklePctGrade
                    )}`}
                  >
                    {row.tacklePctGrade}
                  </td>
                  <td className="p-2 text-center">
                    {row.tacklesPerMin.toFixed(2)}
                  </td>
                  <td
                    className={`p-2 text-center ${gradeClassName(
                      row.tacklesPerMinGrade
                    )}`}
                  >
                    {row.tacklesPerMinGrade}
                  </td>
                  <td className="p-2 text-center">{row.carries}</td>
                  <td className="p-2 text-center">
                    {row.carriesPerMin.toFixed(2)}
                  </td>
                  <td
                    className={`p-2 text-center ${gradeClassName(
                      row.carriesPerMinGrade
                    )}`}
                  >
                    {row.carriesPerMinGrade}
                  </td>
                  <td className="p-2 text-center">{row.turnovers}</td>
                  <td className="p-2 text-center">{row.involvements}</td>
                  <td className="p-2 text-center">
                    {row.involvementsPerMin.toFixed(2)}
                  </td>
                  <td
                    className={`p-2 text-center ${gradeClassName(
                      row.workRateGrade
                    )}`}
                  >
                    {row.workRateGrade}
                  </td>
                  <td
                    className={`p-2 text-center ${gradeClassName(
                      row.overallGrade
                    )}`}
                  >
                    {row.overallGrade}
                  </td>
                  <td className="min-w-[18rem] p-2">{row.coachComment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}