import { getMyTeamContext } from "@/lib/teamContext";
import { redirect } from "next/navigation";
import { ClipsPageClient } from "./ClipsPageClient";

export default async function CoachClipsPage() {
  const ctx = await getMyTeamContext();
  if (!ctx) {
    redirect("/login");
  }
  return <ClipsPageClient initialContext={ctx} />;
}
