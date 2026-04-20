import { formatTime } from "../helpers";
import type { EventItem } from "../types";

type GameReviewTimelinePanelProps = {
  events: EventItem[];
  showRawTranscript: boolean;
  onShowRawTranscriptChange: (value: boolean) => void;
  onJumpToTimestamp: (timestamp: number) => void;
};

export default function GameReviewTimelinePanel({
  events,
  showRawTranscript,
  onShowRawTranscriptChange,
  onJumpToTimestamp,
}: GameReviewTimelinePanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground-strong">
          Stat timeline
        </h2>
        <div className="flex items-center gap-2">
          <input
            id="show-raw-transcript-game-review"
            type="checkbox"
            checked={showRawTranscript}
            onChange={(e) => onShowRawTranscriptChange(e.target.checked)}
          />
          <label
            htmlFor="show-raw-transcript-game-review"
            className="text-sm text-muted"
          >
            Show raw
          </label>
        </div>
      </div>

      <div className="max-h-[32rem] min-h-24 space-y-2 overflow-y-auto pr-1">
        {events.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
            No stat events yet
          </div>
        )}

        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border border-border bg-panel-2 p-3"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => onJumpToTimestamp(event.timestamp)}
                className="w-14 text-xs font-medium text-muted underline underline-offset-2"
                title="Jump to timestamp"
              >
                {formatTime(event.timestamp)}
              </button>
              <div className="flex-1 text-sm text-foreground">{event.text}</div>
            </div>

            {showRawTranscript &&
              event.rawText &&
              event.rawText !== event.text && (
                <div className="mt-2 rounded-lg border border-border bg-panel px-2 py-1.5 text-xs text-muted">
                  Raw: {event.rawText}
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}