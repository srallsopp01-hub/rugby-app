import { getServerTeamContext } from "@/lib/serverTeamContext";
import LockedFeatureTease from "@/app/components/LockedFeatureTease";
import CompareContent from "./CompareContent";

export default async function ComparePage() {
  const ctx = await getServerTeamContext();
  if (ctx?.orgPlan === "solo") {
    return (
      <LockedFeatureTease
        title="Compare player and match performance"
        description="Put any two players or matches side by side and instantly see where the gaps are. Build selections based on data, not gut feel."
        featureBullets={[
          "Head-to-head player stat comparison",
          "Match-by-match performance deltas",
          "Visualise form streaks and dips",
          "Filter by position, phase, or event type",
        ]}
      />
    );
  }
  return <CompareContent />;
}
