import type { EventItem, ReportRow } from "../types";

type PlayerDrilldownModalProps = {
  show: boolean;
  playerName: string;
  playerRow: ReportRow | null;
  playerEvents: EventItem[];
  formatTime: (timestamp: number) => string;
  onClose: () => void;
  onJumpToTimestamp: (timestamp: number) => void;
};

export default function PlayerDrilldownModal({
  show,
  playerName,
  playerRow,
  playerEvents,
  formatTime,
  onClose,
  onJumpToTimestamp,
}: PlayerDrilldownModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground-strong">
              Player breakdown
            </h2>
            <p className="mt-2 text-sm text-muted">
              Individual match review with timestamps and coaching context.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            Close
          </button>
        </div>

        {!playerName || !playerRow ? (
          <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
            No player breakdown is available yet.
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

              <div className="mt-4 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-muted">
                <span className="font-medium text-foreground">Coaching point:</span>{" "}
                {playerRow.coachComment}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
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
      </div>
    </div>
  );
}