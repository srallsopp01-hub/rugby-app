import { formatTime } from "../helpers";

type CoachReviewNote = {
  id: number;
  timestamp: number;
  text: string;
  rawText?: string;
};

type CoachReviewPanelProps = {
  currentTime: number;
  coachNoteDraft: string;
  coachRawDraft: string;
  showCoachRawInput: boolean;
  coachNotes: CoachReviewNote[];
  onCoachNoteDraftChange: (value: string) => void;
  onCoachRawDraftChange: (value: string) => void;
  onToggleCoachRawInput: () => void;
  onAddCoachNote: () => void;
  onClearDraft: () => void;
  onJumpToTimestamp: (timestamp: number) => void;
  onDeleteCoachNote: (id: number) => void;
};

export default function CoachReviewPanel({
  currentTime,
  coachNoteDraft,
  coachRawDraft,
  showCoachRawInput,
  coachNotes,
  onCoachNoteDraftChange,
  onCoachRawDraftChange,
  onToggleCoachRawInput,
  onAddCoachNote,
  onClearDraft,
  onJumpToTimestamp,
  onDeleteCoachNote,
}: CoachReviewPanelProps) {
  return (
    <>
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
        <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground-strong">
              Coach review capture
            </h2>
            <p className="mt-1 text-sm text-muted">
              Add timestamped coaching thoughts while watching the match. This is
              deliberately separate from player stat tagging.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-sm text-muted">
            Current timestamp:{" "}
            <span className="font-semibold text-foreground">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Coaching note
            </label>
            <textarea
              value={coachNoteDraft}
              onChange={(e) => onCoachNoteDraftChange(e.target.value)}
              className="min-h-28 w-full rounded-xl border border-border bg-panel-2 p-3 text-sm text-foreground"
              placeholder="Example: 12 phase attack lost shape after second carry. Exit option and width both disappeared."
            />
          </div>

          <div>
            <button
              onClick={onToggleCoachRawInput}
              className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground"
            >
              {showCoachRawInput
                ? "Hide raw transcript field"
                : "Add raw transcript field"}
            </button>
          </div>

          {showCoachRawInput && (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Raw transcript / rough voice note
              </label>
              <textarea
                value={coachRawDraft}
                onChange={(e) => onCoachRawDraftChange(e.target.value)}
                className="min-h-24 w-full rounded-xl border border-border bg-panel-2 p-3 text-sm text-foreground"
                placeholder="Optional raw voice-to-text or rough note"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onAddCoachNote}
              className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
            >
              Save coach note at current time
            </button>
            <button
              onClick={onClearDraft}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
            >
              Clear draft
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground-strong">
            Coach notes
          </h2>
          <span className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs text-muted">
            {coachNotes.length} note{coachNotes.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="max-h-[42rem] min-h-24 space-y-3 overflow-y-auto pr-1">
          {coachNotes.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
              No coach notes saved yet
            </div>
          )}

          {coachNotes.map((note, index) => {
            const isLatestNote = index === coachNotes.length - 1;

            return (
              <div
                key={note.id}
                className={`rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 ${
                  isLatestNote ? "ring-1 ring-sky-400/50" : ""
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {isLatestNote && (
                      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-300">
                        Latest note
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onJumpToTimestamp(note.timestamp)}
                  className="text-sm font-medium text-muted underline underline-offset-2"
                  title="Jump to timestamp"
                >
                  {formatTime(note.timestamp)}
                </button>

                <div className="mt-2 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground">
                  {note.text}
                </div>

                {note.rawText && (
                  <div className="mt-2 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted">
                    Raw: {note.rawText}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => onDeleteCoachNote(note.id)}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                  >
                    Delete note
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}