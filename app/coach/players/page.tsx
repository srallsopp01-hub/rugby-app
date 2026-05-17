import { getServerTeamContext } from "@/lib/serverTeamContext";
import LockedFeatureTease from "@/app/components/LockedFeatureTease";
import PlayersContent from "./PlayersContent";

export default async function PlayersPage() {
  const ctx = await getServerTeamContext();
  if (ctx?.orgPlan === "solo") {
    return (
      <LockedFeatureTease
        title="Know your squad inside out"
        description="Track every player's match stats, availability history, and performance trends over the season — from first XV to the whole squad."
        featureBullets={[
          "Individual tackle, lineout, and carry stats",
          "Season performance grading per player",
          "Availability and injury tracking",
          "Compare players side by side",
        ]}
      />
    );
  }
  return <PlayersContent />;
}
