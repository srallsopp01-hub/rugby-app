import { formatTime } from "../helpers";
import type { EventItem } from "../types";

type TranscriptPanelProps = {
  events: EventItem[];
  showRawTranscript: boolean;
  transcriptListRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onJumpToTimestamp: (timestamp: number) => void;
  onUpdateEvent: (id: number, text: string) => void;
  onDeleteEvent: (id: number) => void;
  onGenerateStats: () => void;
  onSubmitReport: () => void;
};

export default function TranscriptPanel({
  events,
  showRawTranscript,
  transcriptListRef,
  onJumpToTimestamp,
  onUpdateEvent,
  onDeleteEvent,
  onGenerateStats,
  onSubmitReport,
}: TranscriptPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground-strong">
          Transcript
        </h2>
        <span className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs text-muted">
          {events.length} item{events.length === 1 ? "" : "s"}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted">
        Player tags, set-piece logs, and team events all appear in one timeline.
      </p>

      <div
        ref={transcriptListRef}
        className="mt-4 max-h-[42rem] min-h-24 space-y-2 overflow-y-auto pr-1"
      >
        {events.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
            No transcript items yet
          </div>
        )}

        {events.map((event, index) => {
          const isLatestEvent = index === events.length - 1;

          return (
            <div
              key={event.id}
              className={`rounded-xl border p-3 ${
                event.isPending
                  ? "border-blue-500/20 bg-blue-500/5"
                  : event.category === "set-piece"
                  ? "border-purple-500/20 bg-purple-500/5"
                  : event.category === "team"
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-border bg-panel-2"
              } ${isLatestEvent ? "ring-1 ring-emerald-400/50" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {isLatestEvent && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
                      Latest
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onJumpToTimestamp(event.timestamp)}
                  className="w-14 text-xs font-medium text-muted underline underline-offset-2"
                  title="Jump to timestamp"
                >
                  {formatTime(event.timestamp)}
                </button>

                <input
                  value={event.text}
                  onChange={(e) => onUpdateEvent(event.id, e.target.value)}
                  className={`flex-1 rounded-lg border border-border bg-panel px-2.5 py-2 text-sm ${
                    event.isPending ? "text-muted" : "text-foreground"
                  }`}
                  readOnly={!!event.isPending}
                />

                {!event.isPending && (
                  <button
                    onClick={() => onDeleteEvent(event.id)}
                    className="text-xs font-medium text-muted hover:text-foreground"
                  >
                    delete
                  </button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {event.isPending ? (
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-300">
                    Processing
                  </span>
                ) : event.category === "set-piece" ? (
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] text-purple-300">
                    Set piece
                  </span>
                ) : event.category === "team" ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
                    Team event
                  </span>
                ) : (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
                    Player tag
                  </span>
                )}
              </div>

              {event.isPending && (
                <div className="mt-2 text-xs text-muted">
                  Waiting for transcription...
                </div>
              )}

              {showRawTranscript &&
                !event.isPending &&
                event.rawText &&
                event.rawText !== event.text && (
                  <div className="mt-2 rounded-lg border border-border bg-panel px-2 py-1.5 text-xs text-muted">
                    Raw: {event.rawText}
                  </div>
                )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <button
          onClick={onGenerateStats}
          className="w-full rounded-xl border border-border-light bg-panel-3 py-2.5 text-sm font-medium text-foreground"
        >
          Generate Stats
        </button>

        <button
          onClick={onSubmitReport}
          className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground"
        >
          Submit Report
        </button>
      </div>
    </div>
  );
}