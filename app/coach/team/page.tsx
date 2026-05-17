import { getServerTeamContext } from "@/lib/serverTeamContext";
import LockedFeatureTease from "@/app/components/LockedFeatureTease";
import TeamContent from "./TeamContent";

export default async function TeamPage() {
  const ctx = await getServerTeamContext();
  if (ctx?.orgPlan === "solo") {
    return (
      <LockedFeatureTease
        title="Manage your full squad in one place"
        description="Invite players and assistant coaches, track squad membership, and manage availability requests — all from a single squad hub."
        featureBullets={[
          "Invite players by email or shareable link",
          "Add assistant coaches with role-based access",
          "Manage availability requests and responses",
          "Track active and archived squad members",
        ]}
      />
    );
  }
  return <TeamContent />;
}
