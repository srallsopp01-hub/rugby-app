import PlayerSidebar from "./PlayerSidebar";
import { PlayerProvider } from "./PlayerContext";
import { SyncPlayerData } from "./SyncPlayerData";
import { FloatingHelpChat } from "@/app/components/FloatingHelpChat";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
