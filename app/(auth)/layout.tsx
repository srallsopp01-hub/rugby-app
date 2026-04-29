import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="group mb-10 flex items-center gap-3">
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
      {children}
    </div>
  );
}
