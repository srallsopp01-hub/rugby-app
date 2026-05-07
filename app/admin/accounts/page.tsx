import { createAdminClient } from "@/lib/supabase/admin";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AccountsPage() {
  const admin = createAdminClient();

  if (!admin) {
    return (
      <div className="p-8 text-sm text-red-400">
        Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.
      </div>
    );
  }

  // Fetch all users via auth admin API
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 500 });
  const users = usersData?.users ?? [];

  const userIds = users.map((u) => u.id);

  const [{ data: orgMembers }, { data: teamMembers }] = await Promise.all([
    admin
      .from("organisation_members")
      .select("user_id, role, created_at, organisations(name)")
      .in("user_id", userIds),
    admin
      .from("team_members")
      .select("user_id, role, status, teams(organisation_id, organisations(name))")
      .in("user_id", userIds)
      .eq("status", "active"),
  ]);

  // Org-level membership takes priority for org name + role
  const orgByUser = (orgMembers ?? []).reduce<Record<string, { orgName: string; role: string }>>(
    (acc, m) => {
      const org = m.organisations as unknown as { name: string } | { name: string }[] | null;
      const orgName = Array.isArray(org) ? (org[0]?.name ?? "—") : (org?.name ?? "—");
      acc[m.user_id] = { orgName, role: m.role };
      return acc;
    },
    {}
  );

  // Team membership: resolve org name via teams → organisations
  const teamInfoByUser = (teamMembers ?? []).reduce<Record<string, { orgName: string; role: string }>>(
    (acc, m) => {
      if (acc[m.user_id]) return acc; // already set
      const team = m.teams as unknown as { organisations: { name: string } | { name: string }[] | null } | null;
      const orgRaw = team?.organisations;
      const orgName = Array.isArray(orgRaw) ? (orgRaw[0]?.name ?? "—") : (orgRaw?.name ?? "—");
      acc[m.user_id] = { orgName, role: m.role };
      return acc;
    },
    {}
  );

  const rows = users.map((u) => {
    const fromOrg = orgByUser[u.id];
    const fromTeam = teamInfoByUser[u.id];
    return {
      id: u.id,
      email: u.email ?? "—",
      createdAt: u.created_at,
      org: fromOrg?.orgName ?? fromTeam?.orgName ?? "—",
      role: fromOrg?.role ?? fromTeam?.role ?? null,
    };
  });

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function roleLabel(role: string | null) {
    if (!role) return "—";
    return role.replace(/_/g, " ");
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground-strong">Accounts</h1>
        <p className="mt-1 text-sm text-muted">{rows.length} registered users</p>
      </div>

      <div className="rounded-2xl border border-border bg-panel overflow-hidden">
        <div className="grid grid-cols-[3fr_2fr_1fr_1fr] gap-4 px-4 py-3 border-b border-border bg-panel-2">
          {["Email", "Organisation", "Role", "Joined"].map((h) => (
            <span key={h} className="text-xs font-medium text-muted">
              {h}
            </span>
          ))}
        </div>

        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[3fr_2fr_1fr_1fr] gap-4 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-panel-2/50 transition-colors"
          >
            <span className="text-sm text-foreground-strong truncate font-mono text-xs">
              {row.email}
            </span>
            <span className="text-sm text-foreground truncate">{row.org}</span>
            <span className="text-xs text-muted capitalize">{roleLabel(row.role)}</span>
            <span className="text-sm text-foreground">{formatDate(row.createdAt)}</span>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted">No accounts found.</div>
        )}
      </div>
    </div>
  );
}
