type TeamEventsPanelProps = {
  onAddPenaltyConceded: () => void;
  onAddPenaltyFor: () => void;
  onAddTryScored: () => void;
  onAddTryConceded: () => void;
};

// Blur the button right after its click handler runs,
// so spacebar can never re-trigger it.
const runAndBlur = (
  handler: () => void,
  event: React.MouseEvent<HTMLButtonElement>
) => {
  handler();
  event.currentTarget.blur();
};

export default function TeamEventsPanel({
  onAddPenaltyConceded,
  onAddPenaltyFor,
  onAddTryScored,
  onAddTryConceded,
}: TeamEventsPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-panel-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">Team events</h3>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={(e) => runAndBlur(onAddPenaltyFor, e)}
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
        >
          + Penalty For
        </button>

        <button
          type="button"
          onClick={(e) => runAndBlur(onAddPenaltyConceded, e)}
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
        >
          + Penalty Conceded
        </button>

        <button
          type="button"
          onClick={(e) => runAndBlur(onAddTryScored, e)}
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
        >
          + Try Scored
        </button>

        <button
          type="button"
          onClick={(e) => runAndBlur(onAddTryConceded, e)}
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
        >
          + Try Conceded
        </button>
      </div>
    </div>
  );
}