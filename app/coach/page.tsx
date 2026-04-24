"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shouldStartCoachOnboarding } from "@/app/rugby-tagging/lib/onboarding";

const quickLinks = [
  {
    label: "Capture",
    href: "/coach/capture",
    description: "Tag a live match",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Insights",
    href: "/coach/insights",
    description: "Analyse tagged match data",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M2 12l3.5-4 3 2.5L12 5l2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Review",
    href: "/coach/review",
    description: "Film review with notes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="2.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M5.5 14.5h5M8 11.5v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <path d="M6.5 7L10 5.5 6.5 4v3z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Players",
    href: "/coach/players",
    description: "Individual player output",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="5.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M1.5 13c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <circle cx="11.5" cy="5" r="1.75" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M13.5 13c0-1.66-1.12-3.07-2.67-3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function CoachHomePage() {
  const router = useRouter();

  useEffect(() => {
    if (shouldStartCoachOnboarding()) {
      router.replace("/coach/onboarding");
    }
  }, [router]);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground-strong">
          Coach Home
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Your coaching control centre. Start a match, review data, or check player output.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-border bg-panel p-5 hover:border-border-light hover:bg-panel-2 transition-all duration-150"
          >
            <div className="mb-3 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-panel-2 text-muted group-hover:text-foreground border border-border transition-colors duration-150">
              {link.icon}
            </div>
            <div className="text-sm font-semibold text-foreground-strong">
              {link.label}
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {link.description}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
