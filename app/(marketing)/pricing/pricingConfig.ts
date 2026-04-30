export type BillingCycle = "monthly" | "yearly";
export type CurrencyCode = "USD" | "GBP" | "AUD" | "EUR";
export type PlanKey = "teamLaunch" | "club5" | "organisation";

export type PlanPrice = {
  monthly: number;
  yearly: number;
  yearlyPromo: number;
  from?: boolean;
};

export type CurrencyPricing = {
  symbol: string;
  label: CurrencyCode;
  plans: Record<PlanKey, PlanPrice>;
};

export type PlanContent = {
  key: PlanKey;
  name: string;
  eyebrow: string;
  description: string;
  cta: string;
  href: string;
  secondaryCta?: string;
  secondaryHref?: string;
  featured?: boolean;
  features: readonly string[];
};

export const pricing: Record<CurrencyCode, CurrencyPricing> = {
  USD: {
    symbol: "$",
    label: "USD",
    plans: {
      teamLaunch: {
        monthly: 89,
        yearly: 890,
        yearlyPromo: 669,
      },
      club5: {
        monthly: 299,
        yearly: 2990,
        yearlyPromo: 2249,
      },
      organisation: {
        monthly: 1999,
        yearly: 19990,
        yearlyPromo: 14999,
        from: true,
      },
    },
  },
  GBP: {
    symbol: "£",
    label: "GBP",
    plans: {
      teamLaunch: {
        monthly: 69,
        yearly: 690,
        yearlyPromo: 519,
      },
      club5: {
        monthly: 229,
        yearly: 2290,
        yearlyPromo: 1719,
      },
      organisation: {
        monthly: 1499,
        yearly: 14990,
        yearlyPromo: 11249,
        from: true,
      },
    },
  },
  AUD: {
    symbol: "A$",
    label: "AUD",
    plans: {
      teamLaunch: {
        monthly: 139,
        yearly: 1390,
        yearlyPromo: 1049,
      },
      club5: {
        monthly: 459,
        yearly: 4590,
        yearlyPromo: 3449,
      },
      organisation: {
        monthly: 2999,
        yearly: 29990,
        yearlyPromo: 22499,
        from: true,
      },
    },
  },
  EUR: {
    symbol: "€",
    label: "EUR",
    plans: {
      teamLaunch: {
        monthly: 79,
        yearly: 790,
        yearlyPromo: 599,
      },
      club5: {
        monthly: 269,
        yearly: 2690,
        yearlyPromo: 2019,
      },
      organisation: {
        monthly: 1799,
        yearly: 17990,
        yearlyPromo: 13499,
        from: true,
      },
    },
  },
};

// TODO: Replace these placeholders when Stripe Checkout products are created.
export const stripePriceIds: Record<CurrencyCode, Record<string, string>> = {
  USD: {
    teamLaunchMonthly: "price_TODO",
    teamLaunchYearly: "price_TODO",
    club5Monthly: "price_TODO",
    club5Yearly: "price_TODO",
    organisationMonthly: "price_TODO",
    organisationYearly: "price_TODO",
  },
  GBP: {
    teamLaunchMonthly: "price_TODO",
    teamLaunchYearly: "price_TODO",
    club5Monthly: "price_TODO",
    club5Yearly: "price_TODO",
    organisationMonthly: "price_TODO",
    organisationYearly: "price_TODO",
  },
  AUD: {
    teamLaunchMonthly: "price_1TRsWbQL0gCVdJZirakOuwQY",
    teamLaunchYearly: "price_1TRsZDQL0gCVdJZit1TBHsuS",
    club5Monthly: "price_1TRsb9QL0gCVdJZiCwAZYVx2",
    club5Yearly: "price_1TRsbAQL0gCVdJZiMeFb2sv0",
    organisationMonthly: "price_TODO",
    organisationYearly: "price_TODO",
  },
  EUR: {
    teamLaunchMonthly: "price_TODO",
    teamLaunchYearly: "price_TODO",
    club5Monthly: "price_TODO",
    club5Yearly: "price_TODO",
    organisationMonthly: "price_TODO",
    organisationYearly: "price_TODO",
  },
};

export const planContent: readonly PlanContent[] = [
  {
    key: "teamLaunch",
    name: "Team Launch",
    eyebrow: "Best for one team getting started",
    description:
      "For coaches who want one clean place to analyse matches, create clips and share feedback.",
    cta: "Start 14-day free trial",
    href: "/signup?plan=team-launch",
    features: [
      "1 sport",
      "1 team",
      "3 staff seats",
      "Unlimited players/viewers",
      "8 analysed matches per month",
      "12 months video/report storage",
      "Full upload/review flow",
      "AI match summary",
      "Searchable clips",
      "Voice tagging",
      "Annotations",
      "Playlists",
      "Player sharing",
      "Basic downloads/export",
    ],
  },
  {
    key: "club5",
    name: "Club 5",
    eyebrow: "Best for clubs with multiple teams",
    description:
      "For clubs that want every team working from the same coaching system.",
    cta: "Start 14-day free trial",
    href: "/signup?plan=club-5",
    featured: true,
    features: [
      "1 sport",
      "Up to 5 teams",
      "15 staff seats",
      "Unlimited players/viewers",
      "40 analysed matches per month pooled across teams",
      "24 months video/report storage",
      "Everything in Team Launch",
      "Cross-team compare",
      "Pooled club library",
      "Role permissions",
      "Club admin dashboard",
      "Usage analytics",
      "Priority support",
    ],
  },
  {
    key: "organisation",
    name: "Organisation",
    eyebrow: "Best for multi-sport or multi-club programmes",
    description:
      "For larger programmes that need multi-sport setup, admin control and implementation support.",
    cta: "Book a demo",
    href: "/contact?plan=organisation",
    secondaryCta: "Start organisation pilot",
    secondaryHref: "/contact?plan=organisation-pilot",
    features: [
      "Multi-club",
      "Multi-sport",
      "From 25 teams",
      "75 staff seats",
      "Unlimited players/viewers",
      "250 analysed matches per month pooled",
      "Long-term storage",
      "Higher export quotas",
      "Everything in Club 5",
      "SSO",
      "API/export",
      "Custom events/taxonomy",
      "Implementation support",
      "Procurement support",
      "SLA",
      "Dedicated success/support",
      "Advanced admin controls",
    ],
  },
];

export const comparisonRows = [
  ["Teams included", "1 team", "Up to 5 teams", "From 25 teams"],
  ["Sports included", "1 sport", "1 sport", "Multi-sport"],
  ["Staff seats", "3", "15", "75"],
  ["Player/viewer access", "Unlimited", "Unlimited", "Unlimited"],
  ["Analysed matches/month", "8", "40 pooled", "250 pooled"],
  ["Storage", "12 months", "24 months", "Long-term"],
  ["AI match summary", "Included", "Included", "Included"],
  ["Voice tagging", "Included", "Included", "Included"],
  ["Clips/playlists", "Included", "Included", "Included"],
  ["Player sharing", "Included", "Included", "Included"],
  ["Cross-team comparison", "Not included", "Included", "Included"],
  ["Admin dashboard", "Basic", "Club dashboard", "Advanced controls"],
  ["SSO/API", "Not included", "Not included", "Included"],
  ["Dedicated support", "Standard", "Priority", "Dedicated success/support"],
] as const;

export const faqs = [
  {
    question: "Is there a free trial?",
    answer:
      "Yes. You can try the full coaching workflow for 14 days with one analysed full match included.",
  },
  {
    question: "Do players need to pay?",
    answer:
      "No. Player and viewer access is included on every plan, so athletes can review clips and feedback without extra seats.",
  },
  {
    question: "What happens after I hit the match limit?",
    answer:
      "You can keep reviewing existing work, then upgrade or add capacity as your match analysis volume grows.",
  },
  {
    question: "Can I upgrade later?",
    answer:
      "Yes. Teams can start with Team Launch and move to Club 5 or Organisation when more teams need access.",
  },
  {
    question: "Can clubs pay annually by invoice?",
    answer:
      "Yes for larger clubs and organisations. Annual invoice support will be handled through the sales flow.",
  },
  {
    question: "Can pricing show in my local currency?",
    answer:
      "Yes where available. Final checkout and payment currency may still depend on the Stripe setup for your region.",
  },
  {
    question: "Is the early adopter discount permanent?",
    answer:
      "No. The early adopter offer gives 25% off the first year of an annual plan only.",
  },
] as const;
