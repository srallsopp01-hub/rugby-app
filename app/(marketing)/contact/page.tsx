import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 lg:px-12 lg:py-20">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-panel p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] sm:p-10 lg:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 18% 18%, rgba(207,213,221,0.12), transparent 34%), radial-gradient(circle at 84% 72%, rgba(126,163,126,0.1), transparent 38%)",
          }}
        />
        <div className="relative grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="font-mono text-xs font-bold uppercase text-muted-2">
              Organisation demos
            </p>
            <h1 className="mt-5 text-5xl font-black uppercase leading-[0.95] text-foreground-strong sm:text-6xl">
              Build the right coaching setup.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-foreground">
              Tell us about your club, sport programme, or organisation. The
              sales flow will connect here when CRM, Auth, and billing are ready.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-border-light px-6 py-3 text-sm font-black uppercase text-foreground-strong transition hover:bg-panel-2"
              >
                Back to pricing
              </Link>
              <Link
                href="/coach/onboarding"
                className="inline-flex items-center justify-center rounded-lg bg-foreground-strong px-6 py-3 text-sm font-black uppercase text-background transition hover:opacity-90"
              >
                Try Team Launch
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-panel-2 p-6">
            <h2 className="text-xl font-black uppercase text-foreground-strong">
              Demo request placeholder
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              This page is intentionally lightweight for now. A future version
              can capture organisation size, sports, teams, procurement needs,
              and preferred demo times.
            </p>
            <div className="mt-6 grid gap-3">
              {[
                "Multi-club and multi-sport setup",
                "Implementation support",
                "Procurement and annual invoice support",
                "SSO, API/export, and advanced admin controls",
              ].map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-lg border border-border bg-panel px-4 py-3 text-sm text-foreground"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-lg border border-dashed border-border-light bg-background-elevated px-4 py-3 text-xs leading-5 text-muted">
              TODO: Connect this route to a real contact form, CRM, email
              notification, or sales scheduling flow.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
