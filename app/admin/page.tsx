export default function AdminHomePage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground-strong">Admin Home</h1>
        <p className="mt-1.5 text-sm text-muted leading-relaxed">
          Internal administration panel. Manage accounts, organisations, billing, and platform health.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-panel p-5 text-sm text-muted">
        Select a section from the sidebar to get started.
      </div>
    </div>
  );
}
