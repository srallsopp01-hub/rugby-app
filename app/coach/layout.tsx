import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";
import CoachSidebar from "./CoachSidebar";
import { FloatingHelpChat } from "@/app/components/FloatingHelpChat";
import CreateStarterTeamButton from "./CreateStarterTeamButton";
import { TeamProvider } from "@/app/providers/TeamContext";
import { MatchesProvider } from "@/app/providers/MatchesContext";
import { MatchVideoSessionProvider } from "@/app/providers/MatchVideoSessionContext";

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
  const hasNoTeams = ctx.hasNoTeams ?? false;

  return (
    <TeamProvider>
      <MatchVideoSessionProvider>
      <MatchesProvider>
        <div className="flex h-screen overflow-hidden">
          <CoachSidebar isOrgAdminOnly={isOrgAdminOnly} isClubAdmin={isClubAdmin} />
          <div className="flex-1 flex flex-col overflow-hidden">
            {hasNoTeams && isClubAdmin && (
              <div className="shrink-0 bg-blue-500/10 border-b border-blue-500/30 px-5 py-2 text-sm font-medium text-blue-300">
                Welcome! Create your first team in the Organisation page to get started.
              </div>
            )}
            {hasNoTeams && !isClubAdmin && (
              <div className="shrink-0 bg-blue-500/10 border-b border-blue-500/30 px-5 py-3 flex items-center gap-4">
                <span className="text-sm font-medium text-blue-300">
                  Welcome! Set up your coaching team to get started.
                </span>
                <CreateStarterTeamButton />
              </div>
            )}
            {!hasNoTeams && isOrgAdminOnly && (
              <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-5 py-2 text-sm font-medium text-amber-300">
                You&apos;re viewing this team as club admin — editing is disabled.
              </div>
            )}
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
          <FloatingHelpChat />
        </div>
      </MatchesProvider>
      </MatchVideoSessionProvider>
    </TeamProvider>
  );
}
