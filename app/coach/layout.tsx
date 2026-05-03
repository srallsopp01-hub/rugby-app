import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || membership.role === "player") {
    redirect("/player");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SyncTeam />
      <SyncSavedMatches />
      <CoachSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <FloatingHelpChat />
    </div>
  );
}
