import PlayerSidebar from "./PlayerSidebar";
import { PlayerProvider } from "./PlayerContext";
import { FloatingHelpChat } from "@/app/components/FloatingHelpChat";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlayerProvider>
      <div className="flex h-screen overflow-hidden">
        <PlayerSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
        <FloatingHelpChat />
      </div>
    </PlayerProvider>
  );
}
