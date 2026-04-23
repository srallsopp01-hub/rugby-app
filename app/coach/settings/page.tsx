export default function CoachSettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
          In development
        </div>
        <h1 className="text-2xl font-semibold text-foreground-strong">Settings</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Account preferences, team configuration, and platform permissions.
          Manage your profile, notification preferences, and export defaults.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-panel p-6 text-sm text-muted">
        Planned for an upcoming release. Will include account management, team defaults, and data export settings.
      </div>
    </div>
  );
}
