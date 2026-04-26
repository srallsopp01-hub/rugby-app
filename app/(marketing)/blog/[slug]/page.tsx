import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "../blogData";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: `${post.title} | RugbyCoach Blog`,
      description: post.description,
      type: "article",
      publishedTime: post.dateISO,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.dateISO,
    author: { "@type": "Organization", name: "RugbyCoach" },
    publisher: { "@type": "Organization", name: "RugbyCoach" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        <header className="border-b border-border bg-panel/50">
          <div className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8 lg:px-12">
            <nav className="mb-6 flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-muted-2">
              <Link href="/blog" className="transition-colors hover:text-foreground">
                Blog
              </Link>
              <span>/</span>
              <span className="inline-flex items-center gap-2 text-foreground-strong">
                <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                {post.tags[0]}
              </span>
            </nav>

            <h1 className="max-w-3xl text-4xl font-black uppercase leading-tight text-foreground-strong sm:text-5xl lg:text-6xl">
              {post.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              {post.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <time
                dateTime={post.dateISO}
                className="font-mono text-[10px] font-bold uppercase text-muted-2"
              >
                {post.date}
              </time>
              <span className="h-3 w-px bg-border" aria-hidden="true" />
              <span className="font-mono text-[10px] font-bold uppercase text-muted-2">
                {post.readingTime}
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 lg:px-12">
          {post.content}
        </div>

        <footer className="border-t border-border bg-panel/50">
          <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-12">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-panel-2 px-6 py-14 text-center sm:px-12">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                aria-hidden="true"
                style={{
                  background:
                    "radial-gradient(circle at 20% 40%, rgba(126,163,126,0.12), transparent 40%), radial-gradient(circle at 80% 60%, rgba(177,110,110,0.08), transparent 42%)",
                }}
              />
              <p className="relative font-mono text-[10px] font-bold uppercase text-muted-2">
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                  Try RugbyCoach
                </span>
              </p>
              <h2 className="relative mt-4 text-3xl font-black uppercase leading-none text-foreground-strong sm:text-5xl">
                Tag. Review.
                <br />
                <span className="text-danger">Ship Monday.</span>
              </h2>
              <p className="relative mx-auto mt-5 max-w-lg text-sm leading-6 text-muted">
                Free during private beta. Runs in your browser. No account, no
                installation — just open and start tagging.
              </p>
              <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/coach"
                  className="inline-flex items-center justify-center rounded-lg bg-foreground-strong px-7 py-4 text-sm font-black uppercase text-background transition hover:opacity-90"
                >
                  Open coach platform
                </Link>
                <Link
                  href="/blog"
                  className="inline-flex items-center justify-center rounded-lg border border-border-light px-7 py-4 text-sm font-black uppercase text-foreground-strong transition hover:bg-panel-3"
                >
                  ← Back to blog
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </article>
    </>
  );
}
