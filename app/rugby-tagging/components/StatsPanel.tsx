import type { PlayerStats } from "../types";

type StatsPanelProps = {
  stats: Record<string, PlayerStats> | null;
  canDownload: boolean;
  onDownloadCsv: () => void;
};

export default function StatsPanel({
  stats,
  canDownload,
  onDownloadCsv,
}: StatsPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground-strong">Stats</h2>
        <button
          onClick={onDownloadCsv}
          disabled={!canDownload}
          className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground disabled:opacity-50"
        >
          Download Excel CSV
        </button>
      </div>

      {!stats && <p className="text-sm text-muted">No stats generated yet</p>}

      {stats && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-panel-2">
              <tr>
                <th className="p-2 text-left">Player</th>
                <th className="p-2 text-center">Tackles</th>
                <th className="p-2 text-center">Missed</th>
                <th className="p-2 text-center">Carries</th>
                <th className="p-2 text-center">TO</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats).map(([player, stat]) => (
                <tr key={player} className="border-t border-border">
                  <td className="p-2">{player}</td>
                  <td className="p-2 text-center">{stat.tackles}</td>
                  <td className="p-2 text-center">{stat.missed}</td>
                  <td className="p-2 text-center">{stat.carries}</td>
                  <td className="p-2 text-center">{stat.turnovers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}