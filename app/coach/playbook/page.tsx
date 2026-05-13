import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";

export default function PlaybookPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="Playbook"
        subtitle="Tactical plays and animations"
        primaryAction={
          <Link
            href="/coach/playbook/new"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            New play
          </Link>
        }
      />
      <EmptyState
        icon={Clapperboard}
        title="No plays yet"
        description="Build tactical animations to walk your team through phases of play."
        action={{ label: "New play", href: "/coach/playbook/new" }}
        size="lg"
      />
    </div>
  );
}
