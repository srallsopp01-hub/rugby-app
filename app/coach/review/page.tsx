import { getServerTeamContext } from "@/lib/serverTeamContext";
import LockedFeatureTease from "@/app/components/LockedFeatureTease";
import ReviewContent from "./ReviewContent";

export default async function ReviewPage() {
  const ctx = await getServerTeamContext();
  if (ctx?.orgPlan === "solo") {
    return (
      <LockedFeatureTease
        title="Review every match, moment by moment"
        description="Sync your match video and step through tagged events frame by frame. Spot patterns, clip highlights, and share cut-up footage with your team."
        featureBullets={[
          "Frame-accurate event playback",
          "Tag-to-video sync for every captured moment",
          "Clip and share key sequences",
          "Filter by player, event type, or phase",
        ]}
      />
    );
  }
  return <ReviewContent />;
}
