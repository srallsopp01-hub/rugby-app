import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlayerSidebar from "./PlayerSidebar";
import { PlayerProvider } from "./PlayerContext";
import { SyncPlayerData } from "./SyncPlayerData";
import { FloatingHelpChat } from "@/app/components/FloatingHelpChat";

export default async function PlayerLayout({
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

  if (membership?.role === "assistant_coach") {
    redirect("/coach");
  }

  return (
    <PlayerProvider>
      <SyncPlayerData />
      <div className="flex h-screen overflow-hidden">
        <PlayerSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
        <FloatingHelpChat />
      </div>
    </PlayerProvider>
  );
}
