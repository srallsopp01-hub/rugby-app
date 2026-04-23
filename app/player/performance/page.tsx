export default function PerformancePage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
          In development
        </div>
        <h1 className="text-2xl font-semibold text-foreground-strong">Performance</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Personal analytics and season-level progress tracking. Visualise your tackle
          rate, carry output, and overall grade across multiple matches.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-panel p-6 text-sm text-muted">
        Planned for an upcoming release. Will include season trend charts, position benchmarks, and key stat summaries.
      </div>
    </div>
  );
}
