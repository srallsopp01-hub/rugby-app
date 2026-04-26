"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeSchemeToggle from "@/app/components/ThemeSchemeToggle";
import { usePlayer } from "./PlayerContext";

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
    label: "Team Analytics",
    href: "/player/team-analytics",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 12.5h12M4 10V6M8 10V3.5M12 10V5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Compare",
    href: "/player/compare",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M5 3H2.5A.5.5 0 002 3.5v9a.5.5 0 00.5.5H5M11 3h2.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H11M8 2v12M5 6l-2 2 2 2M11 6l2 2-2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
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

const PLAYER_SIDEBAR_EVENT = "player-sidebar-collapsed-changed";

function subscribePlayerCollapsed(cb: () => void) {
  window.addEventListener(PLAYER_SIDEBAR_EVENT, cb);
  return () => window.removeEventListener(PLAYER_SIDEBAR_EVENT, cb);
}

export default function PlayerSidebar() {
  const pathname = usePathname();
  const { currentPlayer } = usePlayer();
  const collapsed = useSyncExternalStore(
    subscribePlayerCollapsed,
    () => localStorage.getItem("player-sidebar-collapsed") === "true",
    () => false
  );

  const toggle = () => {
    localStorage.setItem("player-sidebar-collapsed", String(!collapsed));
    window.dispatchEvent(new Event(PLAYER_SIDEBAR_EVENT));
  };

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside suppressHydrationWarning className={`flex flex-col shrink-0 border-r border-border bg-panel h-full overflow-hidden transition-[width] duration-200 ${collapsed ? "w-[56px]" : "w-[220px]"}`}>
      <div className={`pt-5 pb-4 border-b border-border flex items-center ${collapsed ? "justify-center px-0" : "gap-2.5 px-5"}`}>
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-panel-3 border border-border shrink-0">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.25"/>
            <path d="M2.5 14c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
        </div>
        {!collapsed && (
          <div>
            <span className="text-xs font-semibold tracking-tight text-foreground-strong leading-none block">
              {currentPlayer ? currentPlayer.preferredName || currentPlayer.fullName : "Player"}
            </span>
            <span className="text-[10px] text-muted-2 leading-none mt-0.5 block">
              {currentPlayer ? currentPlayer.primaryPosition || "Your platform" : "Your platform"}
            </span>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
              } ${
                active
                  ? "bg-panel-3 text-foreground-strong"
                  : "text-muted hover:text-foreground hover:bg-panel-2"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full bg-foreground-strong" />
              )}
              <span className={`transition-colors duration-150 shrink-0 ${active ? "text-foreground-strong" : "text-muted"}`}>
                {item.icon}
              </span>
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border">
        <div className={`${collapsed ? "flex justify-center px-0 py-3" : "px-5 py-3"}`}>
          <ThemeSchemeToggle compact={collapsed} />
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`w-full flex items-center py-3 text-muted hover:text-foreground transition-colors duration-150 ${collapsed ? "justify-center px-0" : "gap-2 px-5"}`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`shrink-0 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          >
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
        {!collapsed && (
          <div className="px-5 pb-4">
            <span className="text-xs text-muted-2">Private beta</span>
          </div>
        )}
      </div>
    </aside>
  );
}
