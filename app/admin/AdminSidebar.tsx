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
      <div className="px-5 py-5 border-b border-border">
        <span className="text-xs font-semibold tracking-widest uppercase text-muted">
          Admin
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-panel-3 text-foreground-strong"
                  : "text-muted hover:text-foreground hover:bg-panel-2"
              }`}
            >
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
