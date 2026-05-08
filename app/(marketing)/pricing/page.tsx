import type { Metadata } from "next";
import PricingExperience from "./PricingExperience";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for rugby coaches. Start a 14-day free trial — no commitment required.",
  openGraph: {
    title: "Pricing — FYNL Whistle",
    description:
      "Simple, transparent pricing for rugby coaches. Start a 14-day free trial — no commitment required.",
  },
};

export default function PricingPage() {
  return <PricingExperience />;
}
