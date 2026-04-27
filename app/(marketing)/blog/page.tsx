import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "./blogData";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Coaching insights, analysis tips, and the story behind RugbyCoach.",
  openGraph: {
    title: "Blog | RugbyCoach Analysis",
    description:
      "Coaching insights, analysis tips, and the story behind RugbyCoach.",
    type: "website",
  },
};

export default function BlogPage() {
  return (
    <div className="overflow-hidden">
      <section className="border-b border-border bg-foreground-strong text-background">
        <div className="marketing-marquee py-2 text-[11px] font-black uppercase">
          <div className="marketing-marquee-track">
            <span>Coaching</span>
            <span>Analysis</span>
            <span>Rugby</span>
            <span>Match day</span>
            <span>Feedback</span>
            <span>Coaching</span>
            <span>Analysis</span>
            <span>Rugby</span>
            <span>Match day</span>
            <span>Feedback</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] sm:p-10 lg:p-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 12% 25%, rgba(126,163,126,0.13), transparent 40%), radial-gradient(circle at 88% 70%, rgba(177,110,110,0.09), transparent 45%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse at center, black 0%, transparent 82%)",
            }}
          />
          <div className="relative mb-7 flex flex-wrap items-center gap-3 font-mono text-[11px] font-semibold uppercase text-muted">
            <span className="text-foreground-strong">01</span>
            <span>/</span>
            <span>Blog</span>
          </div>
          <div className="relative">
            <h1 className="text-[52px] font-black uppercase leading-[0.9] text-foreground-strong sm:text-[72px] lg:text-[96px]">
              Coaching.
              <br />
              <span className="text-transparent [-webkit-text-stroke:1.5px_var(--border-light)]">
                Analysis.
              </span>{" "}
              <span className="text-danger">Rugby.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-foreground sm:text-lg">
              Practical coaching advice, match analysis tips, and the story of
              how RugbyCoach was built — written by and for coaches.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-20 sm:px-8 lg:px-12">
        <div className="mb-8">
          <p className="font-mono text-[10px] font-bold uppercase text-muted-2">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              {blogPosts.length} articles
            </span>
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col rounded-xl border border-border bg-panel p-6 transition hover:border-border-light hover:bg-panel-2"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-muted-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                  {post.tags[0]}
                </span>
                <time
                  dateTime={post.dateISO}
                  className="font-mono text-[10px] text-muted-2"
                >
                  {post.date} · {post.readingTime}
                </time>
              </div>

              <h2 className="text-2xl font-black uppercase leading-tight text-foreground-strong">
                {post.title}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted">
                {post.description}
              </p>

              <div className="mt-6 border-t border-border pt-4">
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-2 text-xs font-black uppercase text-foreground-strong transition hover:text-muted"
                >
                  Read article
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-28 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel-2 px-6 py-16 text-center sm:px-12 lg:px-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 20% 30%, rgba(126,163,126,0.12), transparent 36%), radial-gradient(circle at 80% 70%, rgba(177,110,110,0.09), transparent 40%)",
            }}
          />
          <h2 className="relative text-4xl font-black uppercase leading-none text-foreground-strong sm:text-6xl">
            Ready to
            <br />
            <span className="text-transparent [-webkit-text-stroke:1.25px_var(--border-light)]">
              try it
            </span>{" "}
            <span className="text-danger">free?</span>
          </h2>
          <p className="relative mx-auto mt-6 max-w-xl text-base leading-7 text-muted">
            Free during private beta. Runs in your browser with coach account sync.
          </p>
          <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/coach"
              className="inline-flex items-center justify-center rounded-lg bg-foreground-strong px-7 py-4 text-sm font-black uppercase text-background transition hover:opacity-90"
            >
              Open coach platform
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-lg border border-border-light px-7 py-4 text-sm font-black uppercase text-foreground-strong transition hover:bg-panel-3"
            >
              About RugbyCoach
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
