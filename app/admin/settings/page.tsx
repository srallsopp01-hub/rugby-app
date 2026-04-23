export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground-strong">Settings</h1>
        <p className="mt-1.5 text-sm text-muted leading-relaxed">
          Admin platform settings. Configure feature flags, default plan configurations, and system-level preferences.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-panel p-6 text-sm text-muted">
        Admin settings will be available here.
      </div>
    </div>
  );
}
