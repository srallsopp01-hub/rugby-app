import CoachSidebar from "./CoachSidebar";
import { FloatingHelpChat } from "@/app/components/FloatingHelpChat";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <CoachSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <FloatingHelpChat />
    </div>
  );
}
