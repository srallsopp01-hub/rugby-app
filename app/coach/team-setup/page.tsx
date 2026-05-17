import { getServerTeamContext } from "@/lib/serverTeamContext";
import LockedFeatureTease from "@/app/components/LockedFeatureTease";
import TeamSetupContent from "./TeamSetupContent";

export default async function TeamSetupPage() {
  const ctx = await getServerTeamContext();
  if (ctx?.orgPlan === "solo") {
    return (
      <LockedFeatureTease
        title="Set up your season in minutes"
        description="Add your fixtures, schedule training sessions, set KPI targets, and configure your full squad — everything your season needs before the first whistle."
        featureBullets={[
          "Fixture list with home/away and opponent details",
          "Recurring training sessions with attendance tracking",
          "KPI targets for tackles, lineouts, and more",
          "Season goals and focus areas",
        ]}
      />
    );
  }
  return <TeamSetupContent />;
}
