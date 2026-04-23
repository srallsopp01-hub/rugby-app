export default function GameDetailPage({
  params,
}: {
  params: { gameId: string };
}) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground-strong mb-2">
        Game
      </h1>
      <p className="text-muted text-sm">Individual game view — coming soon.</p>
    </div>
  );
}
