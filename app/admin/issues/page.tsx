export default function IssuesPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground-strong">Issues</h1>
        <p className="mt-1.5 text-sm text-muted leading-relaxed">
          Internal issue tracking. Review reported bugs, user-raised problems, and platform incidents flagged during beta.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-panel p-6 text-sm text-muted">
        Issue tracking tools will be available here.
      </div>
    </div>
  );
}
