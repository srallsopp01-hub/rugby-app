import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CoachSidebar from "./CoachSidebar";
import { SyncSavedMatches } from "./SyncSavedMatches";
import { SyncSquadProfile } from "./SyncSquadProfile";
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
    .eq("member_user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();

  if (membership?.role === "player") {
    redirect("/player");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SyncSquadProfile />
      <SyncSavedMatches />
      <CoachSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <FloatingHelpChat />
    </div>
  );
}
