"use client";

import { useState } from "react";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { Library, Sparkles } from "lucide-react";
import type { MyTeamContext } from "@/lib/teamContext";
import { SourcesPanel } from "./SourcesPanel";

type Tab = "sources" | "library" | "highlights";

export function ClipsPageClient({
  initialContext,
}: {
  initialContext: MyTeamContext;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("sources");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-8 pt-8">
        <PageHeader
          title="Clips"
          subtitle="Build a library of teaching moments from match footage and external video"
        />

        <div className="flex gap-1 border-b border-border -mt-2 mb-6">
          <TabButton active={activeTab === "sources"} onClick={() => setActiveTab("sources")}>
            Sources
          </TabButton>
          <TabButton active={activeTab === "library"} onClick={() => setActiveTab("library")}>
            Library
          </TabButton>
          <TabButton
            active={activeTab === "highlights"}
            onClick={() => setActiveTab("highlights")}
          >
            Highlights
          </TabButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {activeTab === "sources" && <SourcesPanel context={initialContext} />}
        {activeTab === "library" && (
          <EmptyState
            icon={Library}
            title="Library coming soon"
            description="Once you've uploaded source videos, you'll be able to cut clips into a searchable library here."
          />
        )}
        {activeTab === "highlights" && (
          <EmptyState
            icon={Sparkles}
            title="Highlights coming soon"
            description="Stitch together clips into shareable highlight reels for team meetings and player review."
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-accent text-foreground-strong"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
