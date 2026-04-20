type TeamEventsPanelProps = {
  onAddPenaltyConceded: () => void;
  onAddTryScored: () => void;
  onAddTryConceded: () => void;
};

export default function TeamEventsPanel({
  onAddPenaltyConceded,
  onAddTryScored,
  onAddTryConceded,
}: TeamEventsPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-panel-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">Team events</h3>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={onAddPenaltyConceded}
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
        >
          + Penalty Conceded
        </button>

        <button
          onClick={onAddTryScored}
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
        >
          + Try Scored
        </button>

        <button
          onClick={onAddTryConceded}
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
        >
          + Try Conceded
        </button>
      </div>
    </div>
  );
}