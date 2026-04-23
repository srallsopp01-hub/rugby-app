import Link from "next/link";

const features = [
  {
    title: "Capture",
    description:
      "Tag player events, set pieces, and milestones live during a match. Voice tagging supported.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 1v2.5M10 16.5V19M1 10h2.5M16.5 10H19M3.5 3.5l1.77 1.77M14.73 14.73l1.77 1.77M3.5 16.5l1.77-1.77M14.73 5.27l1.77-1.77" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: "Insights",
    description:
      "Tackle %, carry rates, unit summaries, and full player grades — all from your tagged data.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 15l4.5-5 3.5 3 5.5-7.5 2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Review",
    description:
      "Film review with timestamped coaching notes. Jump to any moment from the transcript timeline.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="3" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 19h6M10 14v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8.5 9.5l4.5-2L8.5 6v3.5z" fill="currentColor"/>
      </svg>
    ),
  },
];

export default function MarketingHomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative mx-auto max-w-5xl px-6 pt-28 pb-24 text-center overflow-hidden">
        {/* Subtle radial glow behind the headline */}
        <div
          className="pointer-events-none absolute inset-0 flex items-start justify-center"
          aria-hidden
        >
          <div
            style={{
              width: 700,
              height: 400,
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(215,219,226,0.07) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel-2 px-4 py-1.5 text-xs text-muted mb-8">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
            Private beta — coaches only
          </div>

          <h1 className="text-5xl font-semibold tracking-tight text-foreground-strong leading-[1.1] md:text-6xl">
            Coach smarter.<br />
            <span className="text-muted">Win more.</span>
          </h1>

          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            AI-assisted match analysis for rugby coaches. Tag events live,
            review film, and get player insights — all in one place.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/coach"
              className="rounded-lg bg-foreground-strong px-8 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
            >
              Start coaching
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-border bg-panel-2 px-8 py-3 text-sm font-medium text-foreground hover:bg-panel-3 hover:border-border-light transition-all duration-150"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-border bg-panel/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted text-center mb-3">
            Platform
          </p>
          <h2 className="text-2xl font-semibold text-foreground-strong text-center mb-12">
            Everything a coach needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-panel p-6 hover:border-border-light hover:bg-panel-2 transition-all duration-200"
              >
                <div className="mb-4 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-panel-2 text-muted group-hover:text-foreground transition-colors duration-200 border border-border">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-foreground-strong mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="rounded-2xl border border-border bg-panel p-12">
          <h2 className="text-3xl font-semibold text-foreground-strong">
            Ready to try it?
          </h2>
          <p className="mt-3 text-sm text-muted">
            Designed for desktop. Works in your browser. No app install needed.
          </p>
          <div className="mt-8">
            <Link
              href="/coach"
              className="inline-block rounded-lg bg-foreground-strong px-8 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
            >
              Open Coach Platform
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
