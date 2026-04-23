import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-panel/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-foreground-strong tracking-tight">
            Rugby Coach
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-muted hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-sm text-muted hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/blog" className="text-sm text-muted hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link
              href="/coach"
              className="rounded-xl border border-border bg-panel-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-panel-3 transition-colors"
            >
              Coach Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-muted-2">
          Rugby Coach — private beta
        </div>
      </footer>
    </div>
  );
}
