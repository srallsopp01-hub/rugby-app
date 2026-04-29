import Link from "next/link";
import ThemeSchemeToggle from "@/app/components/ThemeSchemeToggle";
import LoginDropdown from "./LoginDropdown";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="group flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-foreground-strong text-background transition-opacity group-hover:opacity-90">
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <ellipse
                  cx="7"
                  cy="7"
                  rx="5.5"
                  ry="3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M1.5 7h11M7 1.5c-1.5 1.5-2 3.5-2 5.5s.5 4 2 5.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.25"
                />
              </svg>
            </div>
            <div>
              <div className="text-base font-black uppercase text-foreground-strong">
                FYNL Whistle
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-5 sm:gap-7">
            <Link
              href="/pricing"
              className="hidden text-xs font-bold uppercase text-muted transition-colors hover:text-foreground-strong sm:inline"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="hidden text-xs font-bold uppercase text-muted transition-colors hover:text-foreground-strong sm:inline"
            >
              About
            </Link>
            <Link
              href="/blog"
              className="hidden text-xs font-bold uppercase text-muted transition-colors hover:text-foreground-strong md:inline"
            >
              Blog
            </Link>
            <LoginDropdown />
            <ThemeSchemeToggle compact />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-panel py-10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 text-xs text-muted-2 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <div>
            <div className="text-sm font-black uppercase text-foreground-strong">
              FYNL Whistle
            </div>
            <p className="mt-2 max-w-md leading-5">
              Match analysis for coaches who tag, review, grade, and brief the
              team from one desktop-first rugby workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 font-mono uppercase">
            <Link href="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/about" className="transition-colors hover:text-foreground">
              About
            </Link>
            <Link href="/blog" className="transition-colors hover:text-foreground">
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
