import PlayerSidebar from "./PlayerSidebar";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <PlayerSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
