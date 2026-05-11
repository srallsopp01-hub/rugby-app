"use client";

import Link from "next/link";
import { useSyncExternalStore, useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeSchemeToggle from "@/app/components/ThemeSchemeToggle";
import { FynlMark, FynlLockup } from "@/app/components/FynlLogo";
import { createClient } from "@/lib/supabase/client";
import {
  ACTIVE_TEAM_ID_KEY,
  ACTIVE_TEAM_CHANGED_EVENT,
  setActiveTeam,
} from "@/lib/teamContext";

const navItems = [
  {
    label: "Dashboard",
    href: "/coach",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 6.5L8 2l6 4.5V14a.5.5 0 01-.5.5h-4V10h-3v4.5h-4A.5.5 0 012 14V6.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Team Setup",
    href: "/coach/team-setup",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M1.5 13.5c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <path d="M11 2.5l.9 1.8 2 .3-1.45 1.41.34 2-.79-.42" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Capture",
    href: "/coach/capture",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Insights",
    href: "/coach/insights",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 12l3.5-4 3 2.5L12 5l2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Review",
    href: "/coach/review",
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
    label: "Players",
    href: "/coach/players",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="5.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M1.5 13c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <circle cx="11.5" cy="5" r="1.75" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M13.5 13c0-1.66-1.12-3.07-2.67-3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Compare",
    href: "/coach/compare",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M5 3H2.5A.5.5 0 002 3.5v9a.5.5 0 00.5.5H5M11 3h2.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H11M8 2v12M5 6l-2 2 2 2M11 6l2 2-2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Saved Matches",
    href: "/coach/saved-matches",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M5 8h6M5 5.5h6M5 10.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Team",
    href: "/coach/team",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2" stroke="currentColor" strokeWidth="1.25"/>
        <circle cx="11" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <path d="M11 9.5c1.4.3 2.5 1.5 2.5 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Organisation",
    href: "/coach/organisation",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="7" width="12" height="7" rx="1" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <path d="M8 10v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/coach/settings",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
];

type TeamOption = { id: string; name: string; orgName: string };

const COACH_SIDEBAR_EVENT = "coach-sidebar-collapsed-changed";

function subscribeCoachCollapsed(cb: () => void) {
  window.addEventListener(COACH_SIDEBAR_EVENT, cb);
  return () => window.removeEventListener(COACH_SIDEBAR_EVENT, cb);
}

function subscribeTeamChanged(cb: () => void) {
  window.addEventListener(ACTIVE_TEAM_CHANGED_EVENT, cb);
  return () => window.removeEventListener(ACTIVE_TEAM_CHANGED_EVENT, cb);
}

function TeamSwitcherDropdown({
  teams,
  activeTeamId,
  loading,
  onSelect,
}: {
  teams: TeamOption[];
  activeTeamId: string;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const label = loading ? "Loading…" : (activeTeam?.name ?? "Select team");

  // Group by org name
  const grouped: Record<string, TeamOption[]> = {};
  for (const t of teams) {
    const key = t.orgName || "Teams";
    (grouped[key] ??= []).push(t);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-panel-2 transition-colors duration-150"
      >
        <span className="truncate font-medium text-foreground-strong text-xs">{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-panel shadow-[var(--shadow-soft)] overflow-hidden">
          {Object.entries(grouped).map(([orgName, orgTeams]) => (
            <div key={orgName}>
              {Object.keys(grouped).length > 1 && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-2">
                  {orgName}
                </div>
              )}
              {orgTeams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelect(t.id);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors duration-100 ${
                    t.id === activeTeamId
                      ? "text-foreground-strong bg-panel-3 font-medium"
                      : "text-muted hover:text-foreground hover:bg-panel-2"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          ))}
          {teams.length === 0 && !loading && (
            <div className="px-3 py-2 text-sm text-muted-2">No teams found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CoachSidebar({
  isOrgAdminOnly = false,
  isClubAdmin = false,
}: {
  isOrgAdminOnly?: boolean;
  isClubAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const collapsed = useSyncExternalStore(
    subscribeCoachCollapsed,
    () => localStorage.getItem("coach-sidebar-collapsed") === "true",
    () => false
  );

  const activeTeamId = useSyncExternalStore(
    subscribeTeamChanged,
    () => localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? "",
    () => ""
  );

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tms } = await supabase
        .from("team_members")
        .select("team_id, teams!inner(id, name)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .in("role", ["head_coach", "assistant_coach"]);

      const seen = new Set<string>();
      const result: TeamOption[] = [];

      for (const row of tms ?? []) {
        const t = (row as any).teams;
        if (t?.id && !seen.has(t.id)) {
          seen.add(t.id);
          result.push({ id: t.id, name: t.name, orgName: "" });
        }
      }

      setTeams(result);
      setLoadingTeams(false);
    }
    load();
  }, []);

  const toggle = () => {
    localStorage.setItem("coach-sidebar-collapsed", String(!collapsed));
    window.dispatchEvent(new Event(COACH_SIDEBAR_EVENT));
  };

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleTeamSelect(teamId: string) {
    await setActiveTeam(teamId);
    router.push("/coach");
    router.refresh();
  }

  return (
    <aside
      className={`flex flex-col shrink-0 border-r border-border bg-panel h-full overflow-hidden transition-[width] duration-200 ${
        collapsed ? "w-[56px]" : "w-[220px]"
      }`}
    >
      {/* Logo / product name */}
      <div
        className={`pt-5 pb-4 border-b border-border flex items-center ${
          collapsed ? "justify-center px-0" : "px-4"
        }`}
      >
        {collapsed ? (
          <FynlMark size={28} />
        ) : (
          <FynlLockup size={28} />
        )}
      </div>

      {/* Team switcher */}
      <div className={`border-b border-border ${collapsed ? "px-2 py-2" : "px-2 py-2"}`}>
        {collapsed ? (
          <button
            type="button"
            title="Switch team"
            className="w-full flex justify-center py-2 text-muted hover:text-foreground transition-colors duration-150"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M2 4l2-2M2 4l2 2M12 10H2M12 10l-2-2M12 10l-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <TeamSwitcherDropdown
            teams={teams}
            activeTeamId={activeTeamId}
            loading={loadingTeams}
            onSelect={handleTeamSelect}
          />
        )}
      </div>

      <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
        {navItems.filter((item) => item.href !== "/coach/organisation" || isClubAdmin).map((item) => {
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
              <span
                className={`transition-colors duration-150 shrink-0 ${
                  active ? "text-foreground-strong" : "text-muted"
                }`}
              >
                {item.icon}
              </span>
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Toggle + footer */}
      <div className="border-t border-border">
        <div className={`${collapsed ? "flex justify-center px-0 py-3" : "px-5 py-3"}`}>
          <ThemeSchemeToggle compact={collapsed} />
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`w-full flex items-center py-3 text-muted hover:text-foreground transition-colors duration-150 ${
            collapsed ? "justify-center px-0" : "gap-2 px-5"
          }`}
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
            <span className="text-xs text-muted-2">fynlwhistle.com</span>
          </div>
        )}
      </div>
    </aside>
  );
}
