import { useState } from "react";
import { formatTime, getClosestPlayers } from "../helpers";
import type { ReviewItem } from "../types";

type NeedsReviewPanelProps = {
  reviewQueue: ReviewItem[];
  players: string[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onJumpToTimestamp: (timestamp: number) => void;
  onUpdateReviewItem: (id: number, updates: Partial<ReviewItem>) => void;
  onSaveReviewItem: (
    item: ReviewItem,
    options?: { applyToAllMatching?: boolean }
  ) => void;
  onSkipReviewItem: (id: number) => void;
};

const runAndBlur = (
  handler: () => void,
  event: React.MouseEvent<HTMLButtonElement>
) => {
  handler();
  event.currentTarget.blur();
};

export default function NeedsReviewPanel({
  reviewQueue,
  players,
  onJumpToTimestamp,
  onUpdateReviewItem,
  onSaveReviewItem,
  onSkipReviewItem,
}: NeedsReviewPanelProps) {
  const [applyToAllMap, setApplyToAllMap] = useState<Record<number, boolean>>({});

  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground-strong">
          Needs Review
        </h2>
        <span className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs text-muted">
          {reviewQueue.length} item{reviewQueue.length === 1 ? "" : "s"}
        </span>
      </div>

      {reviewQueue.length === 0 && (
        <p className="text-sm text-muted">No review items</p>
      )}

      <div className="space-y-3">
        {reviewQueue.map((item, index) => {
          const closest = getClosestPlayers(item.rawText, players, 3);
          const isNewestReview = index === reviewQueue.length - 1;

          return (
            <div
              key={item.id}
              className={`rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 ${
                isNewestReview ? "ring-1 ring-amber-400/50" : ""
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {isNewestReview && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
                      Newest review
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => runAndBlur(() => onJumpToTimestamp(item.timestamp), e)}
                className="text-sm font-medium text-muted underline underline-offset-2"
                title="Jump to timestamp"
              >
                {formatTime(item.timestamp)}
              </button>

              <div className="mt-2 text-sm text-muted">Raw: {item.rawText}</div>

              {item.guessedText && item.guessedText !== item.rawText && (
                <div className="mt-2 text-sm text-muted">
                  Guess: {item.guessedText}
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={item.selectedPlayer}
                  onChange={(e) =>
                    onUpdateReviewItem(item.id, {
                      selectedPlayer: e.target.value,
                    })
                  }
                  className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
                >
                  <option value="">No player</option>
                  {closest.map((player) => (
                    <option key={player} value={player}>
                      {player}
                    </option>
                  ))}
                  {players
                    .filter((p) => !closest.includes(p))
                    .map((player) => (
                      <option key={player} value={player}>
                        {player}
                      </option>
                    ))}
                </select>

                <select
                  value={item.selectedAction}
                  onChange={(e) =>
                    onUpdateReviewItem(item.id, {
                      selectedAction: e.target.value as ReviewItem["selectedAction"],
                    })
                  }
                  className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
                >
                  <option value="">Select action</option>
                  <option value="tackle">tackle</option>
                  <option value="missed tackle">missed tackle</option>
                  <option value="carry">carry</option>
                  <option value="turnover">turnover</option>
                </select>
              </div>

              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={!!applyToAllMap[item.id]}
                    onChange={(e) =>
                      setApplyToAllMap((prev) => ({
                        ...prev,
                        [item.id]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border bg-panel"
                  />
                  Apply to all matching raw text
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(e) =>
                      runAndBlur(
                        () => onSaveReviewItem(item, {
                          applyToAllMatching: !!applyToAllMap[item.id],
                        }),
                        e
                      )
                    }
                    className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
                  >
                    Save tag
                  </button>
                  <button
                    type="button"
                    onClick={(e) => runAndBlur(() => onSkipReviewItem(item.id), e)}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}