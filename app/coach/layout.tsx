import CoachSidebar from "./CoachSidebar";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <CoachSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
