import type {
  LineoutResult,
  ScrumResult,
  SetPieceSide,
} from "../types";

type SetPieceLoggingPanelProps = {
  lineoutSide: SetPieceSide;
  lineoutResult: LineoutResult;
  lineoutNotes: string;
  scrumSide: SetPieceSide;
  scrumResult: ScrumResult;
  onLineoutSideChange: (value: SetPieceSide) => void;
  onLineoutResultChange: (value: LineoutResult) => void;
  onLineoutNotesChange: (value: string) => void;
  onAddLineout: () => void;
  onScrumSideChange: (value: SetPieceSide) => void;
  onScrumResultChange: (value: ScrumResult) => void;
  onAddScrum: () => void;
};

export default function SetPieceLoggingPanel({
  lineoutSide,
  lineoutResult,
  lineoutNotes,
  scrumSide,
  scrumResult,
  onLineoutSideChange,
  onLineoutResultChange,
  onLineoutNotesChange,
  onAddLineout,
  onScrumSideChange,
  onScrumResultChange,
  onAddScrum,
}: SetPieceLoggingPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
      <div className="rounded-2xl border border-border bg-panel-2 p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Log lineout
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            value={lineoutSide}
            onChange={(e) => onLineoutSideChange(e.target.value as SetPieceSide)}
            className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
          >
            <option value="Easts">Easts</option>
            <option value="Opposition">Opposition</option>
          </select>

          <select
            value={lineoutResult}
            onChange={(e) =>
              onLineoutResultChange(e.target.value as LineoutResult)
            }
            className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
          >
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
            <option value="Penalty">Penalty</option>
            <option value="Not Straight">Not Straight</option>
            <option value="Steal">Steal</option>
          </select>

          <input
            value={lineoutNotes}
            onChange={(e) => onLineoutNotesChange(e.target.value)}
            className="sm:col-span-2 rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
            placeholder="Lineout call / notes"
          />
        </div>

        <button
          onClick={onAddLineout}
          className="mt-3 rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
        >
          Add lineout
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-panel-2 p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Log scrum
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            value={scrumSide}
            onChange={(e) => onScrumSideChange(e.target.value as SetPieceSide)}
            className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
          >
            <option value="Easts">Easts</option>
            <option value="Opposition">Opposition</option>
          </select>

          <select
            value={scrumResult}
            onChange={(e) => onScrumResultChange(e.target.value as ScrumResult)}
            className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
          >
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
            <option value="Penalty For">Penalty For</option>
            <option value="Penalty Against">Penalty Against</option>
            <option value="Free Kick">Free Kick</option>
          </select>
        </div>

        <button
          onClick={onAddScrum}
          className="mt-3 rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
        >
          Add scrum
        </button>
      </div>
    </div>
  );
}