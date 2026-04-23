import type { MilestoneType } from "../types";

const MILESTONES: { label: string; type: MilestoneType }[] = [
  { label: "Kick Off", type: "kick off" },
  { label: "Half Time", type: "half time" },
  { label: "2nd Half KO", type: "second half kick off" },
  { label: "Full Time", type: "full time" },
];

type MatchMilestonesPanelProps = {
  onAddMilestone: (type: MilestoneType) => void;
};

const runAndBlur = (
  handler: () => void,
  event: React.MouseEvent<HTMLButtonElement>
) => {
  handler();
  event.currentTarget.blur();
};

export default function MatchMilestonesPanel({
  onAddMilestone,
}: MatchMilestonesPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-panel-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">Match milestones</h3>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MILESTONES.map(({ label, type }) => (
          <button
            key={type}
            type="button"
            onClick={(e) => runAndBlur(() => onAddMilestone(type), e)}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
