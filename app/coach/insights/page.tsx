import { getServerTeamContext } from "@/lib/serverTeamContext";
import LockedFeatureTease from "@/app/components/LockedFeatureTease";
import InsightsContent from "./InsightsContent";

export default async function InsightsPage() {
  const ctx = await getServerTeamContext();
  if (ctx?.orgPlan === "solo") {
    return (
      <LockedFeatureTease
        title="Turn match data into coaching decisions"
        description="Visualise your team's performance trends over the season — tackles, lineouts, set piece, tries scored and conceded — at a glance."
        featureBullets={[
          "Season-long KPI trend charts",
          "Player-level performance breakdowns",
          "Set piece and tackle rate analysis",
          "Exportable match report summaries",
        ]}
      />
    );
  }
  return <InsightsContent />;
}
