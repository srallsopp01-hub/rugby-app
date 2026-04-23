"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Home",
    href: "/player",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 6.5L8 2l6 4.5V14a.5.5 0 01-.5.5h-4V10h-3v4.5h-4A.5.5 0 012 14V6.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Performance",
    href: "/player/performance",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 12l3.5-4 3 2.5L12 5l2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Games",
    href: "/player/games",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M5 8h6M5 5.5h6M5 10.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Review",
    href: "/player/review",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="2.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M5.5 14.5h5M8 11.5v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <path d="M6.5 7L10 5.5 6.5 4v3z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/player/settings",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function PlayerSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex flex-col w-[220px] shrink-0 border-r border-border bg-panel h-full">
      <div className="px-5 py-5 border-b border-border">
        <span className="text-xs font-semibold tracking-widest uppercase text-muted">
          Player
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-panel-3 text-foreground-strong"
                  : "text-muted hover:text-foreground hover:bg-panel-2"
              }`}
            >
              <span className={active ? "text-foreground-strong" : "text-muted"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <span className="text-xs text-muted-2">Private beta</span>
      </div>
    </aside>
  );
}
