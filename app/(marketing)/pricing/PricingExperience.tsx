"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  comparisonRows,
  faqs,
  planContent,
  pricing,
  stripePriceIds,
  type BillingCycle,
  type CurrencyCode,
  type PlanContent,
  type PlanPrice,
} from "./pricingConfig";

const currencyOptions = Object.keys(pricing) as CurrencyCode[];
const subscribeToLocale = () => () => {};
const getServerCurrencySnapshot = () => "USD" as CurrencyCode;
const euroRegions = new Set([
  "AT",
  "BE",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
]);

function detectCurrencyFromLocale(locale: string): CurrencyCode {
  const region = locale.split("-").pop()?.toUpperCase();

  if (region === "GB") return "GBP";
  if (region === "AU") return "AUD";
  if (region && euroRegions.has(region)) return "EUR";

  return "USD";
}

function getClientCurrencySnapshot() {
  const locale = navigator.languages?.[0] || navigator.language || "en-US";
  return detectCurrencyFromLocale(locale);
}

function formatPrice(currency: CurrencyCode, value: number) {
  const { symbol } = pricing[currency];
  return `${symbol}${value.toLocaleString("en-US")}`;
}

function getVisiblePrice(plan: PlanPrice, cycle: BillingCycle) {
  return cycle === "yearly" ? plan.yearlyPromo : plan.monthlyFounder;
}

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-1 shadow-[var(--shadow-panel)]">
      {(["monthly", "yearly"] as const).map((option) => {
        const isActive = cycle === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase transition sm:px-5 ${
              isActive
                ? "bg-foreground-strong text-background"
                : "text-muted hover:bg-panel-2 hover:text-foreground-strong"
            }`}
          >
            {option === "monthly" ? "Monthly" : "Yearly"}
          </button>
        );
      })}
    </div>
  );
}

function CurrencySelector({
  currency,
  onChange,
}: {
  currency: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-border bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
      Currency
      <select
        value={currency}
        onChange={(event) => onChange(event.target.value as CurrencyCode)}
        className="rounded-lg border-border bg-panel-2 px-3 py-2 text-sm font-semibold text-foreground-strong"
      >
        {currencyOptions.map((option) => (
          <option key={option} value={option}>
            {pricing[option].label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PriceDisplay({
  currency,
  cycle,
  plan,
}: {
  currency: CurrencyCode;
  cycle: BillingCycle;
  plan: PlanPrice;
}) {
  const prefix = plan.from ? "From " : "";
  const period = cycle === "monthly" ? "/month" : "/year";
  const visiblePrice = getVisiblePrice(plan, cycle);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="text-4xl font-black tracking-normal text-foreground-strong sm:text-5xl">
          {prefix}
          {formatPrice(currency, visiblePrice)}
        </span>
        <span className="pb-1 text-sm font-semibold text-muted">{period}</span>
      </div>
      {cycle === "yearly" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md border border-success/35 bg-success/10 px-2.5 py-1 font-bold uppercase text-success">
            25% early adopter saving
          </span>
          <span className="text-muted">
            Normally {prefix.toLowerCase()}
            {formatPrice(currency, plan.yearly)}/year
          </span>
          <span className="text-muted-2">First year only</span>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md border border-success/35 bg-success/10 px-2.5 py-1 font-bold uppercase text-success">
            Founder pricing
          </span>
          <span className="text-muted">
            {prefix.toLowerCase()}{formatPrice(currency, plan.monthly)}/month after 6 months
          </span>
          <span className="text-muted-2">First 20 clubs only</span>
        </div>
      )}
    </div>
  );
}

function PricingCard({
  plan,
  currency,
  cycle,
}: {
  plan: PlanContent;
  currency: CurrencyCode;
  cycle: BillingCycle;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const {
    key: planKey,
    name,
    eyebrow,
    description,
    cta,
    href,
    secondaryCta,
    secondaryHref,
    featured,
    features,
  } = plan;
  const price = pricing[currency].plans[planKey];
  const stripeLookupKey = `${planKey}${cycle === "monthly" ? "Monthly" : "Yearly"}`;
  const stripePriceId = stripePriceIds[currency][stripeLookupKey];

  const isCheckoutPlan = planKey === "teamLaunch" || planKey === "club5";
  const hasValidPriceId = stripePriceId && stripePriceId !== "price_TODO";

  async function handleCheckout() {
    if (!hasValidPriceId) {
      setCheckoutError("Checkout is not available for this plan yet.");
      return;
    }
    setLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: stripePriceId }),
      });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/pricing")}`);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setCheckoutError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      className={`relative flex h-full flex-col rounded-xl border p-6 shadow-[var(--shadow-panel)] ${
        featured
          ? "border-border-light bg-panel-2 ring-1 ring-foreground-strong/20"
          : "border-border bg-panel"
      }`}
    >
      {featured ? (
        <div className="absolute right-5 top-5 rounded-md bg-foreground-strong px-3 py-1 text-[10px] font-black uppercase text-background">
          Most popular
        </div>
      ) : null}

      <div className="pr-28">
        <p className="font-mono text-[11px] font-bold uppercase text-muted-2">
          {eyebrow}
        </p>
        <h3 className="mt-4 text-2xl font-black uppercase text-foreground-strong">
          {name}
        </h3>
      </div>
      <p className="mt-3 min-h-[72px] text-sm leading-6 text-muted">{description}</p>

      <div className="mt-6">
        <PriceDisplay currency={currency} cycle={cycle} plan={price} />
      </div>

      {featured && cycle === "yearly" ? (
        <div className="mt-4 w-fit rounded-md border border-warning/35 bg-warning/10 px-3 py-1.5 text-[11px] font-black uppercase text-warning">
          Best value
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {isCheckoutPlan ? (
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className={`inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-black uppercase transition disabled:opacity-60 ${
              featured
                ? "bg-foreground-strong text-background hover:opacity-90"
                : "border border-border-light bg-panel-3 text-foreground-strong hover:bg-panel-2"
            }`}
          >
            {loading ? "Loading..." : cta}
          </button>
        ) : (
          <Link
            href={href}
            className={`inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-black uppercase transition ${
              featured
                ? "bg-foreground-strong text-background hover:opacity-90"
                : "border border-border-light bg-panel-3 text-foreground-strong hover:bg-panel-2"
            }`}
          >
            {cta}
          </Link>
        )}
        {checkoutError ? (
          <p className="text-center text-xs text-danger">{checkoutError}</p>
        ) : null}
        {secondaryCta && secondaryHref ? (
          <Link
            href={secondaryHref}
            className="inline-flex w-full items-center justify-center rounded-lg border border-border px-5 py-3 text-sm font-black uppercase text-foreground transition hover:border-border-light hover:bg-panel-2"
          >
            {secondaryCta}
          </Link>
        ) : null}
      </div>

      <div className="mt-7 border-t border-border pt-5">
        <ul className="space-y-3 text-sm text-foreground">
          {features.map((feature) => (
            <li key={feature} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="leading-5">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function FeatureComparison() {
  return (
    <section id="compare-plans" className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-12">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs font-bold uppercase text-muted-2">
            Compare plans
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase text-foreground-strong sm:text-4xl">
            Pick the right starting point.
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted">
          Every plan includes the core Capture, Analyse, Coach, Share workflow.
          Larger plans add pooled team capacity and admin control.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-panel shadow-[var(--shadow-panel)]">
        <table className="min-w-[860px] w-full border-collapse text-left text-sm">
          <thead className="bg-panel-2 text-xs font-black uppercase text-muted-2">
            <tr>
              <th className="border-b border-border px-5 py-4">Feature</th>
              <th className="border-b border-border px-5 py-4">Team Launch</th>
              <th className="border-b border-border px-5 py-4">Club 5</th>
              <th className="border-b border-border px-5 py-4">Organisation</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map(([feature, team, club, organisation]) => (
              <tr key={feature} className="border-b border-border last:border-b-0">
                <th className="px-5 py-4 font-semibold text-foreground-strong">
                  {feature}
                </th>
                <td className="px-5 py-4 text-muted">{team}</td>
                <td className="px-5 py-4 text-foreground">{club}</td>
                <td className="px-5 py-4 text-muted">{organisation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PricingFAQ() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="font-mono text-xs font-bold uppercase text-muted-2">FAQ</p>
          <h2 className="mt-3 text-3xl font-black uppercase text-foreground-strong sm:text-4xl">
            Straight answers before you buy.
          </h2>
        </div>
        <div className="grid gap-3">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-xl border border-border bg-panel p-5"
            >
              <h3 className="text-base font-black text-foreground-strong">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{faq.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PricingExperience() {
  const [cycle, setCycle] = useState<BillingCycle>("yearly");
  const detectedCurrency = useSyncExternalStore(
    subscribeToLocale,
    getClientCurrencySnapshot,
    getServerCurrencySnapshot,
  );
  const [manualCurrency, setManualCurrency] = useState<CurrencyCode | null>(null);
  const currency = manualCurrency || detectedCurrency;

  const selectedPricing = useMemo(() => pricing[currency], [currency]);

  return (
    <div className="overflow-hidden">
      <section className="border-b border-border bg-foreground-strong text-background">
        <div className="marketing-marquee py-2 text-[11px] font-black uppercase">
          <div className="marketing-marquee-track">
            <span>14-day free trial</span>
            <span>Unlimited player access</span>
            <span>AI match analysis included</span>
            <span>Early adopter yearly saving</span>
            <span>14-day free trial</span>
            <span>Unlimited player access</span>
            <span>AI match analysis included</span>
            <span>Early adopter yearly saving</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] sm:p-10 lg:p-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 14% 20%, rgba(207,213,221,0.12), transparent 34%), radial-gradient(circle at 86% 70%, rgba(126,163,126,0.1), transparent 38%)",
            }}
          />
          <div className="relative max-w-4xl">
            <p className="font-mono text-xs font-bold uppercase text-muted-2">
              Capture - Analyse - Coach - Share
            </p>
            <h1 className="mt-5 text-5xl font-black uppercase leading-[0.95] text-foreground-strong sm:text-6xl lg:text-7xl">
              Simple pricing for serious coaches.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-foreground sm:text-lg">
              Start with one team, scale to your full club, and give every coach
              and player a clearer way to review performance.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup?plan=team-launch"
                className="inline-flex items-center justify-center rounded-lg bg-foreground-strong px-7 py-4 text-sm font-black uppercase text-background transition hover:opacity-90"
              >
                Start 14-day free trial
              </Link>
              <Link
                href="#compare-plans"
                className="inline-flex items-center justify-center rounded-lg border border-border-light px-7 py-4 text-sm font-black uppercase text-foreground-strong transition hover:bg-panel-2"
              >
                Compare plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-4 max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="grid overflow-hidden rounded-xl border border-border bg-panel shadow-[0_20px_44px_rgba(0,0,0,0.24)] md:grid-cols-3">
          {["14-day free trial", "Unlimited player access", "AI match analysis included"].map(
            (item) => (
              <div
                key={item}
                className="border-b border-border px-5 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <span className="font-mono text-[11px] font-black uppercase text-foreground-strong">
                  {item}
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="rounded-xl border border-border-light bg-panel-2 p-5 shadow-[var(--shadow-panel)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg font-black uppercase text-foreground-strong">
                Early adopter offer: get 25% off your first yearly plan.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Available for the first clubs joining during launch. Discount
                applies to the first year only.
              </p>
            </div>
            <div className="rounded-lg border border-success/35 bg-success/10 px-4 py-3 text-sm font-bold text-success">
              Annual plans only
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-panel p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-xs font-bold uppercase text-muted-2">
                Free trial
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase text-foreground-strong">
                Try the full coaching workflow with one analysed match. No card required.
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Includes access to the review workspace, AI summary, clips and sharing.
              </p>
            </div>
            <Link
              href="/signup?plan=team-launch"
              className="inline-flex items-center justify-center rounded-lg bg-foreground-strong px-6 py-3 text-sm font-black uppercase text-background transition hover:opacity-90"
            >
              Start 14-day free trial
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <BillingToggle cycle={cycle} onChange={setCycle} />
            {cycle === "yearly" ? (
              <span className="rounded-md border border-warning/35 bg-warning/10 px-3 py-2 text-xs font-black uppercase text-warning">
                25% early adopter saving
              </span>
            ) : null}
          </div>
          <CurrencySelector currency={currency} onChange={setManualCurrency} />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {planContent.map((plan) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              currency={selectedPricing.label}
              cycle={cycle}
            />
          ))}
        </div>
      </section>

      <FeatureComparison />
      <PricingFAQ />
    </div>
  );
}
