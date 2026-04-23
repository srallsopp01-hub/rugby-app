import Link from "next/link";

export default function MarketingHomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="inline-block rounded-full border border-border bg-panel-2 px-4 py-1.5 text-xs text-muted mb-8">
          Private beta — coaches only
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-foreground-strong leading-tight md:text-6xl">
          Coach smarter.<br />Win more.
        </h1>
        <p className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed">
          AI-assisted match analysis for rugby coaches. Tag events live,
          review film, and get player insights — all in one place.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/coach"
            className="rounded-xl bg-foreground px-8 py-3.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
          >
            Start coaching
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-border bg-panel-2 px-8 py-3.5 text-sm font-medium text-foreground hover:bg-panel-3 transition-colors"
          >
            See pricing
          </Link>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-border bg-panel/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold text-foreground-strong text-center mb-12">
            Everything a coach needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Capture",
                description:
                  "Tag player events, set pieces, and milestones live during a match. Voice tagging supported.",
              },
              {
                title: "Insights",
                description:
                  "Tackle %, carry rates, unit summaries, and full player grades — all from your tagged data.",
              },
              {
                title: "Review",
                description:
                  "Film review with timestamped coaching notes. Jump to any moment from the transcript timeline.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-border bg-panel p-6"
              >
                <h3 className="text-base font-semibold text-foreground-strong">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold text-foreground-strong">
          Ready to try it?
        </h2>
        <p className="mt-4 text-muted">
          Designed for desktop. Works in your browser. No app install needed.
        </p>
        <div className="mt-8">
          <Link
            href="/coach"
            className="rounded-xl bg-foreground px-8 py-3.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
          >
            Open Coach Platform
          </Link>
        </div>
      </section>
    </div>
  );
}
