export default function GameDetailPage({
  params,
}: {
  params: { gameId: string };
}) {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
          In development
        </div>
        <h1 className="text-2xl font-semibold text-foreground-strong">Game</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Individual match view — your stats, minutes played, and coach notes from this game.
        </p>
        <p className="mt-1.5 text-xs text-muted-2 font-mono">ID: {params.gameId}</p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-panel p-6 text-sm text-muted">
        Planned for an upcoming release. Will show per-game stats, clip highlights, and attached coach feedback.
      </div>
    </div>
  );
}
