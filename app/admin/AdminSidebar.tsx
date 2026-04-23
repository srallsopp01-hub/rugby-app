"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Home", href: "/admin", exact: true },
  { label: "Accounts", href: "/admin/accounts", exact: false },
  { label: "Organisations", href: "/admin/organisations", exact: false },
  { label: "Teams", href: "/admin/teams", exact: false },
  { label: "Billing", href: "/admin/billing", exact: false },
  { label: "Usage", href: "/admin/usage", exact: false },
  { label: "Issues", href: "/admin/issues", exact: false },
  { label: "Settings", href: "/admin/settings", exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex flex-col w-[200px] shrink-0 border-r border-border bg-panel h-full">
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-panel-3 border border-border">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M5 8h6M5 5.5h3M5 10.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold tracking-tight text-foreground-strong leading-none block">
              Admin
            </span>
            <span className="text-[10px] text-muted-2 leading-none mt-0.5 block">
              Internal panel
            </span>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-panel-3 text-foreground-strong"
                  : "text-muted hover:text-foreground hover:bg-panel-2"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full bg-foreground-strong" />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <span className="text-xs text-muted-2">Internal only</span>
      </div>
    </aside>
  );
}
