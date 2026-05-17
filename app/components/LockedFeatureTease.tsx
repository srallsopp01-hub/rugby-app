import Link from "next/link";

type Props = {
  title: string;
  description: string;
  featureBullets: string[];
  screenshotPath?: string;
};

export default function LockedFeatureTease({
  title,
  description,
  featureBullets,
}: Props) {
  return (
    <div className="flex min-h-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-accent/40 bg-panel p-8 shadow-[0_20px_44px_rgba(0,0,0,0.24)]">
        {/* Lock badge */}
        <div className="mb-5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <rect x="1" y="4" width="8" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3 4V3a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Free plan
          </span>
        </div>

        <h1 className="text-xl font-black uppercase leading-tight text-foreground-strong">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>

        <ul className="mt-5 space-y-2.5">
          {featureBullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2.5 text-sm text-foreground">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="mt-0.5 shrink-0 text-accent"
                aria-hidden="true"
              >
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25"/>
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {bullet}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            href="/pricing"
            className="block w-full rounded-xl bg-accent px-5 py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
          >
            Start 14-day free trial
          </Link>
          <p className="text-center text-xs text-muted-2">
            No credit card required to start.
          </p>
        </div>
      </div>
    </div>
  );
}
