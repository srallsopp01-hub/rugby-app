import { createAdminClient } from "@/lib/supabase/admin";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function TeamsPage() {
  const admin = createAdminClient();

  if (!admin) {
    return (
      <div className="p-8 text-sm text-red-400">
        Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.
      </div>
    );
  }

  const { data: teams } = await admin
    .from("teams")
    .select("id, name, status, organisation_id, created_at")
    .order("created_at", { ascending: false });

  if (!teams || teams.length === 0) {
    return (
      <div className="p-8 max-w-4xl">
        <h1 className="text-2xl font-semibold text-foreground-strong mb-1">Teams</h1>
        <p className="text-sm text-muted">No teams yet.</p>
      </div>
    );
  }

  const orgIds = [...new Set(teams.map((t) => t.organisation_id))];

  const [{ data: orgs }, { data: members }] = await Promise.all([
    admin.from("organisations").select("id, name").in("id", orgIds),
    admin
      .from("team_members")
      .select("team_id, status")
      .in("team_id", teams.map((t) => t.id))
      .eq("status", "active"),
  ]);

  const orgMap = Object.fromEntries((orgs ?? []).map((o) => [o.id, o.name]));
  const memberCount = (members ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.team_id] = (acc[m.team_id] ?? 0) + 1;
    return acc;
  }, {});

  const activeCount = teams.filter((t) => t.status === "active").length;
  const archivedCount = teams.filter((t) => t.status === "archived").length;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground-strong">Teams</h1>
        <p className="mt-1 text-sm text-muted">
          {activeCount} active · {archivedCount} archived
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-panel overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-border bg-panel-2">
          {["Team", "Organisation", "Status", "Active members", "Created"].map((h) => (
            <span key={h} className="text-xs font-medium text-muted">
              {h}
            </span>
          ))}
        </div>

        {teams.map((team) => (
          <div
            key={team.id}
            className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-panel-2/50 transition-colors"
          >
            <span className="text-sm font-medium text-foreground-strong truncate">{team.name}</span>
            <span className="text-sm text-foreground truncate">
              {orgMap[team.organisation_id] ?? "—"}
            </span>
            <span>
              {team.status === "active" ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Active
                </span>
              ) : (
                <span className="text-xs text-muted-2">Archived</span>
              )}
            </span>
            <span className="text-sm text-foreground">{memberCount[team.id] ?? 0}</span>
            <span className="text-sm text-foreground">{formatDate(team.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
