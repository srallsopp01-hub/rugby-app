import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CoachSidebar from "./CoachSidebar";
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

  return (
    <div className="flex h-screen overflow-hidden">
      <CoachSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <FloatingHelpChat />
    </div>
  );
}
