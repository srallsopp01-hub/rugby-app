import { getServerTeamContext } from "@/lib/serverTeamContext";
import LockedFeatureTease from "@/app/components/LockedFeatureTease";
import DashboardContent from "./DashboardContent";

export default async function CoachDashboardPage() {
  const ctx = await getServerTeamContext();
  if (ctx?.orgPlan === "solo") {
    return (
      <LockedFeatureTease
        title="Your coaching command centre"
        description="Get a live view of your season: fixtures, player availability, training sessions, and AI-powered recommendations — all in one place."
        featureBullets={[
          "Season at a glance: record, try difference, league position",
          "Player availability and fixture reminders",
          "Weekly training session check-ins",
          "AI assistant with match-data context",
        ]}
      />
    );
  }
  return <DashboardContent />;
}
