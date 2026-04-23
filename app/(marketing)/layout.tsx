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
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-foreground-strong group-hover:opacity-90 transition-opacity">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <ellipse cx="7" cy="7" rx="5.5" ry="3.5" stroke="#0b0c0f" strokeWidth="1.5"/>
                <path d="M1.5 7h11M7 1.5c-1.5 1.5-2 3.5-2 5.5s.5 4 2 5.5" stroke="#0b0c0f" strokeWidth="1.25" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground-strong tracking-tight">
              RugbyCoach
            </span>
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
              className="rounded-lg border border-border bg-panel-2 px-4 py-1.5 text-sm font-medium text-foreground hover:bg-panel-3 hover:border-border-light transition-all duration-150"
            >
              Coach Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-muted-2">
          RugbyCoach — private beta
        </div>
      </footer>
    </div>
  );
}
