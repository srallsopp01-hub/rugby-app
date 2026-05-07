import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";
import CoachSidebar from "./CoachSidebar";
import { SyncSavedMatches } from "./SyncSavedMatches";
import { SyncTeam } from "./SyncTeam";
import { FloatingHelpChat } from "@/app/components/FloatingHelpChat";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const ctx = await getServerTeamContext();
  if (!ctx || ctx.role === "player") {
    redirect("/player");
  }

  const isOrgAdminOnly = ctx.isOrgAdminOnly;
  const isClubAdmin = ctx.isClubAdmin;

  return (
    <div className="flex h-screen overflow-hidden">
      <SyncTeam />
      <SyncSavedMatches />
      <CoachSidebar isOrgAdminOnly={isOrgAdminOnly} isClubAdmin={isClubAdmin} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {isOrgAdminOnly && (
          <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-5 py-2 text-sm font-medium text-amber-300">
            You&apos;re viewing this team as club admin — editing is disabled.
          </div>
        )}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <FloatingHelpChat />
    </div>
  );
}
