import PlayerSidebar from "./PlayerSidebar";
import { PlayerProvider } from "./PlayerContext";

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
      </div>
    </PlayerProvider>
  );
}
