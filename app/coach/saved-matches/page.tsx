import { getServerTeamContext } from "@/lib/serverTeamContext";
import LockedFeatureTease from "@/app/components/LockedFeatureTease";
import SavedMatchesContent from "./SavedMatchesContent";

export default async function SavedMatchesPage() {
  const ctx = await getServerTeamContext();
  if (ctx?.orgPlan === "solo") {
    return (
      <LockedFeatureTease
        title="Every match, saved and searchable"
        description="Your complete match archive in one place. Search, filter, and replay any event from any game you've ever captured."
        featureBullets={[
          "Full match event history",
          "Search across all tagged events",
          "Filter by opponent, date, or event type",
          "Reopen any match for review or editing",
        ]}
      />
    );
  }
  return <SavedMatchesContent />;
}
