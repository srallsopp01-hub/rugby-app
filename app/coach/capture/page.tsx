import { getServerTeamContext } from "@/lib/serverTeamContext";
import LockedFeatureTease from "@/app/components/LockedFeatureTease";
import CaptureContent from "./CaptureContent";

export default async function CapturePage() {
  const ctx = await getServerTeamContext();
  if (ctx?.orgPlan === "solo") {
    return (
      <LockedFeatureTease
        title="Tag every moment of every match"
        description="Capture live match events with voice tagging, transcripts, and instant analysis. Every tag links back to your playbook plays."
        featureBullets={[
          "Voice-to-tag with squad recognition",
          "Link lineouts and scrums to your saved plays",
          "Live team stats as you tag",
          "Auto-generated match reports",
        ]}
      />
    );
  }
  return <CaptureContent />;
}
