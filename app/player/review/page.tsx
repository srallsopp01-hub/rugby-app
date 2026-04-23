export default function ReviewPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
          In development
        </div>
        <h1 className="text-2xl font-semibold text-foreground-strong">Review</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Clip playlist and coach annotations. Jump straight to the moments that
          matter — your tackles, carries, and key actions tagged in context.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-panel p-6 text-sm text-muted">
        Planned for an upcoming release. Will surface player-specific clip playlists with timestamped coach notes attached.
      </div>
    </div>
  );
}
