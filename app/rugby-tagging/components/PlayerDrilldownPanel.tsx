type PlayerDrilldownEvent = {
  id: number;
  timestamp: number;
  text: string;
  playerAction?: string;
};

type PlayerDrilldownRow = {
  number: number;
  name: string;
  position: string;
  minutes: number;
  tackles: number;
  missed: number;
  carries: number;
  turnovers: number;
  involvements: number;
  overallGrade: string;
};

type PlayerDrilldownPanelProps = {
  selectedPlayer: string;
  playerRow: PlayerDrilldownRow | null;
  playerEvents: PlayerDrilldownEvent[];
  onJumpToTimestamp: (timestamp: number) => void;
  formatTime: (timestamp: number) => string;
};

export default function PlayerDrilldownPanel({
  selectedPlayer,
  playerRow,
  playerEvents,
  onJumpToTimestamp,
  formatTime,
}: PlayerDrilldownPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground-strong">
          Player drill-down
        </h2>
        <p className="mt-1 text-sm text-muted">
          Review the selected player’s output and jump straight to their logged involvements.
        </p>
      </div>

      {!selectedPlayer ? (
        <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
          Select a player to view their drill-down.
        </div>
      ) : !playerRow ? (
        <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
          No player summary is available yet for {selectedPlayer}.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-panel-2 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xl font-semibold text-foreground-strong">
                  {playerRow.number}. {playerRow.name}
                </div>
                <div className="mt-1 text-sm text-muted">
                  {playerRow.position || "No position set"} • {playerRow.minutes} mins
                </div>
              </div>

              <div className="rounded-full border border-border bg-panel px-3 py-1.5 text-xs font-medium text-foreground">
                Overall: {playerRow.overallGrade}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-xl border border-border bg-panel px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Tackles
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {playerRow.tackles}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Missed
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {playerRow.missed}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Carries
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {playerRow.carries}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Turnovers
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {playerRow.turnovers}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Involvements
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {playerRow.involvements}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Involvement timeline
              </h3>
              <span className="text-xs text-muted">
                {playerEvents.length} logged event{playerEvents.length === 1 ? "" : "s"}
              </span>
            </div>

            {playerEvents.length === 0 ? (
              <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                No structured involvements logged for this player yet.
              </div>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {playerEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onJumpToTimestamp(event.timestamp)}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-panel-2 px-4 py-3 text-left transition hover:border-border-light hover:bg-panel"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {event.text}
                      </div>
                      {event.playerAction ? (
                        <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-2">
                          {event.playerAction}
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 rounded-lg border border-border bg-panel px-2 py-1 text-xs font-medium text-foreground">
                      {formatTime(event.timestamp)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}