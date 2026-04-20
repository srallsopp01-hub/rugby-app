import { formatTime } from "../helpers";
import type { PendingResolution } from "../types";

type PendingResolutionPanelProps = {
  pendingResolution: PendingResolution | null;
  resolverSelection: string;
  resolverCandidates: string[];
  onResolverSelectionChange: (value: string) => void;
  onConfirm: () => void;
  onReviewLater: () => void;
};

export default function PendingResolutionPanel({
  pendingResolution,
  resolverSelection,
  resolverCandidates,
  onResolverSelectionChange,
  onConfirm,
  onReviewLater,
}: PendingResolutionPanelProps) {
  if (!pendingResolution) return null;

  return (
    <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
            Confirm player
          </div>
          <div className="text-sm text-muted">
            Raw:{" "}
            <strong className="text-foreground">
              {pendingResolution.rawText}
            </strong>
          </div>
          <div className="text-sm text-muted">
            Action:{" "}
            <strong className="text-foreground">
              {pendingResolution.action}
            </strong>
          </div>
          <div className="text-sm text-muted">
            Time:{" "}
            <strong className="text-foreground">
              {formatTime(pendingResolution.timestamp)}
            </strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={resolverSelection}
            onChange={(e) => onResolverSelectionChange(e.target.value)}
            className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
          >
            {resolverCandidates.map((player) => (
              <option key={player} value={player}>
                {player}
              </option>
            ))}
            <option value="">No player</option>
          </select>

          <button
            onClick={onConfirm}
            className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
          >
            Confirm
          </button>

          <button
            onClick={onReviewLater}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
          >
            Review later
          </button>
        </div>
      </div>
    </div>
  );
}