type TeamSnapshotPanelProps = {
  teamName: string;
  tackles: number;
  missed: number;
  tacklePct: number;
  carries: number;
  turnovers: number;
  penaltiesConceded: number;
  scrumSuccessPct: number;
  lineoutSuccessPct: number;
  triesScored: number;
  triesConceded: number;
  canCopySummary: boolean;
  onCopySummary: () => void;
};

export default function TeamSnapshotPanel({
  teamName,
  tackles,
  missed,
  tacklePct,
  carries,
  turnovers,
  penaltiesConceded,
  scrumSuccessPct,
  lineoutSuccessPct,
  triesScored,
  triesConceded,
  canCopySummary,
  onCopySummary,
}: TeamSnapshotPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground-strong">
          Team Snapshot
        </h2>
        <button
          onClick={onCopySummary}
          disabled={!canCopySummary}
          className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground disabled:opacity-50"
        >
          Copy summary
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-border bg-panel-2 p-3">
          <div className="text-muted">Tackles Made</div>
          <div className="mt-1 font-semibold text-foreground">{tackles}</div>
        </div>

        <div className="rounded-xl border border-border bg-panel-2 p-3">
          <div className="text-muted">Missed Tackles</div>
          <div className="mt-1 font-semibold text-foreground">{missed}</div>
        </div>

        <div className="rounded-xl border border-border bg-panel-2 p-3">
          <div className="text-muted">Tackle %</div>
          <div className="mt-1 font-semibold text-foreground">
            {tacklePct.toFixed(0)}%
          </div>
        </div>

        <div className="rounded-xl border border-border bg-panel-2 p-3">
          <div className="text-muted">Total Carries</div>
          <div className="mt-1 font-semibold text-foreground">{carries}</div>
        </div>

        <div className="rounded-xl border border-border bg-panel-2 p-3">
          <div className="text-muted">Turnovers Won</div>
          <div className="mt-1 font-semibold text-foreground">{turnovers}</div>
        </div>

        <div className="rounded-xl border border-border bg-panel-2 p-3">
          <div className="text-muted">Penalties Conceded</div>
          <div className="mt-1 font-semibold text-foreground">
            {penaltiesConceded}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-panel-2 p-3">
          <div className="text-muted">{teamName} Scrum %</div>
          <div className="mt-1 font-semibold text-foreground">
            {scrumSuccessPct.toFixed(0)}%
          </div>
        </div>

        <div className="rounded-xl border border-border bg-panel-2 p-3">
          <div className="text-muted">{teamName} Lineout %</div>
          <div className="mt-1 font-semibold text-foreground">
            {lineoutSuccessPct.toFixed(0)}%
          </div>
        </div>

        <div className="rounded-xl border border-border bg-panel-2 p-3">
          <div className="text-muted">Tries Scored</div>
          <div className="mt-1 font-semibold text-foreground">{triesScored}</div>
        </div>

        <div className="rounded-xl border border-border bg-panel-2 p-3">
          <div className="text-muted">Tries Conceded</div>
          <div className="mt-1 font-semibold text-foreground">
            {triesConceded}
          </div>
        </div>
      </div>
    </div>
  );
}