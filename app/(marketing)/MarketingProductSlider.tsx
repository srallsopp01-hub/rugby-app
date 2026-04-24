"use client";

import { useState } from "react";

type SlideVisual =
  | "home"
  | "capture"
  | "insights"
  | "players"
  | "review"
  | "setup"
  | "saved"
  | "compare";

type ProductSlide = {
  step: string;
  label: string;
  route: string;
  headline: string;
  body: string;
  points: string[];
  visual: SlideVisual;
};

const slides: ProductSlide[] = [
  {
    step: "01",
    label: "Coach Home",
    route: "/coach",
    headline: "Start the next coaching action.",
    body: "Open the active match, check report confidence, or jump straight into the next screen.",
    points: ["Next-action dashboard", "Match confidence cues", "Quick coach navigation"],
    visual: "home",
  },
  {
    step: "02",
    label: "Capture",
    route: "/coach/capture",
    headline: "Tag the match without looking down.",
    body: "Capture is the core workspace: video, voice tagging, quick actions, set pieces, milestones, and transcript in one flow.",
    points: ["Voice tag while video plays", "Quick tags and set pieces", "Transcript and report handoff"],
    visual: "capture",
  },
  {
    step: "03",
    label: "Insights",
    route: "/coach/insights",
    headline: "Turn tags into coach-ready analysis.",
    body: "Tackle rates, carries, set piece outcomes, player output, unit summaries, and report export.",
    points: ["Team analytics", "Player grades", "Five-sheet report export"],
    visual: "insights",
  },
  {
    step: "04",
    label: "Players",
    route: "/coach/players",
    headline: "Coach the player, not just the match.",
    body: "Open a player profile, review match output, and use trends to frame better one-to-one conversations.",
    points: ["Player directory", "Individual drilldowns", "Trend snapshots"],
    visual: "players",
  },
  {
    step: "05",
    label: "Review",
    route: "/coach/review",
    headline: "Build the film-room teaching session.",
    body: "Add timestamped notes, mark coaching moments, and keep the timeline tied to the same match context.",
    points: ["Film review", "Coach notes", "Timeline jump points"],
    visual: "review",
  },
  {
    step: "06",
    label: "Team Setup",
    route: "/coach/team-setup",
    headline: "Prepare the squad language.",
    body: "Names, nicknames, positions, voice samples, and lineout calls live before the next match starts.",
    points: ["Squad profile", "Voice recognition details", "Lineout calls"],
    visual: "setup",
  },
  {
    step: "07",
    label: "Saved",
    route: "/coach/saved-matches",
    headline: "Every local match stays reachable.",
    body: "Reopen saved matches into Capture, Insights, Review, or Compare with readiness cues.",
    points: ["Saved match library", "Local browser context", "Report readiness labels"],
    visual: "saved",
  },
  {
    step: "08",
    label: "Compare",
    route: "/coach/compare",
    headline: "Find what changed between matches.",
    body: "Compare saved match and player output side by side so coaching decisions have context.",
    points: ["Match comparison", "Player comparison", "Confidence summaries"],
    visual: "compare",
  },
];

function MiniBrowser({
  route,
  children,
  pill = "Private beta",
}: {
  route: string;
  children: React.ReactNode;
  pill?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-background-elevated shadow-[0_24px_56px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-panel px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full border border-border bg-panel-3" />
        <span className="h-2.5 w-2.5 rounded-full border border-border bg-panel-3" />
        <span className="h-2.5 w-2.5 rounded-full border border-border bg-panel-3" />
        <span className="ml-3 font-mono text-[10px] text-muted-2">{route}</span>
        <span className="ml-auto rounded bg-success/15 px-2 py-1 text-[10px] font-bold uppercase text-success">
          {pill}
        </span>
      </div>
      {children}
    </div>
  );
}

function Annotation({
  className,
  label,
  number,
}: {
  className: string;
  label: string;
  number: string;
}) {
  return (
    <div className={`absolute z-20 flex items-center gap-2 ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-danger text-xs font-black text-white shadow-[0_0_0_5px_rgba(177,110,110,0.22)]">
        {number}
      </span>
      <span className="rounded bg-foreground-strong px-2.5 py-1.5 text-[10px] font-black uppercase text-background shadow-[var(--shadow-panel)]">
        {label}
      </span>
    </div>
  );
}

function VideoPane() {
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-[#0f1416]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_48%,rgba(126,163,126,0.25),transparent_46%),linear-gradient(135deg,#1a2e23_0%,#0f1416_100%)]" />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.28) 1px, transparent 1px)",
          backgroundSize: "58px 58px",
        }}
      />
      <div className="absolute left-3 top-3 rounded bg-black/60 px-2.5 py-1.5 text-[10px] font-black uppercase text-white">
        EAS 14 - 10 OPP
      </div>
      <div className="absolute right-3 top-3 rounded bg-black/60 px-2.5 py-1.5 font-mono text-[10px] text-white">
        Q2 24:17
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 to-transparent p-3">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
          <span className="ml-0.5 h-0 w-0 border-y-[4px] border-l-[7px] border-y-transparent border-l-background" />
        </span>
        <span className="h-1 flex-1 rounded bg-white/20">
          <span className="block h-full w-[45%] rounded bg-white" />
        </span>
        <span className="font-mono text-[10px] text-white/75">24:17</span>
      </div>
    </div>
  );
}

function CaptureVisual() {
  return (
    <div className="relative">
      <MiniBrowser route="/coach/capture" pill="Live">
        <div className="grid gap-4 p-4 lg:grid-cols-[1.3fr_0.8fr]">
          <div className="space-y-3">
            <VideoPane />
            <div className="grid grid-cols-4 gap-2">
              {["Tackle", "Carry", "Turnover", "Missed"].map((chip, index) => (
                <div
                  key={chip}
                  className={`rounded-md border px-2 py-2 text-center text-[10px] font-black uppercase ${
                    index === 0
                      ? "border-danger bg-danger text-white"
                      : "border-border bg-panel text-foreground"
                  }`}
                >
                  {chip}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border-light bg-panel-2 px-3 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-danger" />
              <span className="min-w-0 flex-1 text-xs text-foreground">
                Listening: <b>&quot;Murphy and Walsh tackle&quot;</b>
              </span>
              <span className="rounded border border-border bg-panel-3 px-2 py-1 font-mono text-[10px] text-muted-2">
                SPACE
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-panel p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-foreground-strong">
                Transcript
              </span>
              <span className="text-[10px] text-success">Live</span>
            </div>
            {[
              ["24:17", "Murphy + Walsh tackle"],
              ["23:44", "O'Connell carry"],
              ["22:58", "Lineout won - front"],
              ["21:12", "Penalty conceded"],
            ].map(([time, text]) => (
              <div key={time} className="border-t border-border py-2 text-xs">
                <div className="font-mono text-[10px] text-muted-2">{time}</div>
                <div className="mt-1 text-foreground">{text}</div>
              </div>
            ))}
          </div>
        </div>
      </MiniBrowser>
      <Annotation className="left-2 top-20" label="Video timeline" number="1" />
      <Annotation className="bottom-24 left-6" label="Quick tags" number="2" />
      <Annotation className="bottom-8 left-20" label="Voice tag" number="3" />
      <Annotation className="right-2 top-24 flex-row-reverse" label="Transcript" number="4" />
      <Annotation className="right-6 bottom-10 flex-row-reverse" label="Report flow" number="5" />
    </div>
  );
}

function SimpleVisual({ type }: { type: SlideVisual }) {
  if (type === "home") {
    return (
      <MiniBrowser route="/coach" pill="Ready">
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="font-mono text-[10px] font-bold uppercase text-muted-2">
              Next action
            </div>
            <div className="mt-2 text-xl font-black text-foreground-strong">
              Continue active match
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["Capture", "Insights", "Review"].map((item) => (
                <div key={item} className="rounded-lg border border-border bg-panel-2 p-3 text-xs font-bold">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {["Last saved", "Players", "Notes", "Report"].map((item, index) => (
              <div key={item} className="rounded-lg border border-border bg-panel-2 p-3">
                <div className="text-[10px] uppercase text-muted-2">{item}</div>
                <div className="mt-2 text-lg font-black text-foreground-strong">
                  {["2h", "18", "7", "Ready"][index]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </MiniBrowser>
    );
  }

  if (type === "insights") {
    return (
      <MiniBrowser route="/coach/insights" pill="Report ready">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="text-xs font-black uppercase text-foreground-strong">
              Team analytics
            </div>
            {[
              ["Tackle %", "87%"],
              ["Carry count", "48"],
              ["Lineout", "78%"],
              ["Scrum", "92%"],
            ].map(([label, value]) => (
              <div key={label} className="mt-4 grid grid-cols-[78px_1fr_42px] items-center gap-3 text-xs">
                <span className="text-muted">{label}</span>
                <span className="h-2 rounded bg-panel-2">
                  <span className="block h-full rounded bg-success" style={{ width: value }} />
                </span>
                <span className="text-right font-mono text-foreground-strong">{value}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="text-xs font-black uppercase text-foreground-strong">
              Player grades
            </div>
            {["Murphy 8.2", "Walsh 7.8", "Byrne 7.4", "O'Connell 7.1"].map((row) => (
              <div key={row} className="mt-3 rounded border border-border bg-panel-2 px-3 py-2 text-xs text-foreground">
                {row}
              </div>
            ))}
          </div>
        </div>
      </MiniBrowser>
    );
  }

  if (type === "players") {
    return (
      <MiniBrowser route="/coach/players/murphy" pill="Match grade">
        <div className="p-5">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-panel p-4">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-panel-3 text-2xl font-black text-foreground-strong">
              07
            </div>
            <div>
              <div className="text-xl font-black uppercase text-foreground-strong">
                J. Murphy
              </div>
              <div className="mt-1 font-mono text-xs text-muted">Openside - R11</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-4xl font-black text-danger">8.2</div>
              <div className="font-mono text-[10px] uppercase text-muted-2">Grade</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {["14 tackles", "2 missed", "11 carries", "3 turnovers"].map((stat) => (
              <div key={stat} className="rounded-lg border border-border bg-panel-2 p-3 text-xs font-bold text-foreground">
                {stat}
              </div>
            ))}
          </div>
          <svg className="mt-5 h-28 w-full" viewBox="0 0 440 100" aria-hidden="true">
            <path d="M0 68 L44 60 L88 56 L132 66 L176 48 L220 40 L264 54 L308 34 L352 28 L396 38 L440 22" fill="none" stroke="var(--danger)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </MiniBrowser>
    );
  }

  if (type === "review") {
    return (
      <MiniBrowser route="/coach/review" pill="Reviewing">
        <div className="space-y-4 p-5">
          <VideoPane />
          <div className="rounded-lg border border-border bg-panel p-4">
            <div className="mb-3 text-xs font-black uppercase text-foreground-strong">
              Match timeline
            </div>
            <div className="relative h-10 rounded-md border border-border bg-panel-2">
              {[12, 24, 31, 38, 45, 56, 64, 72, 84].map((left, index) => (
                <span
                  key={left}
                  className={`absolute top-[-3px] h-12 w-1 rounded ${
                    index % 3 === 0 ? "bg-success" : index % 3 === 1 ? "bg-danger" : "bg-warning"
                  }`}
                  style={{ left: `${left}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </MiniBrowser>
    );
  }

  if (type === "setup") {
    return (
      <MiniBrowser route="/coach/team-setup" pill="23 selected">
        <div className="space-y-3 p-5">
          {[
            ["07", "J. Murphy", "Openside - Murf"],
            ["04", "R. O'Connell", "Lock - ROC"],
            ["10", "T. Walsh", "Fly-half"],
            ["17", "S. McCarthy", "Loosehead"],
          ].map(([number, name, detail]) => (
            <div key={number} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg border border-border bg-panel p-3">
              <span className="grid h-9 w-9 place-items-center rounded bg-panel-3 font-black text-foreground-strong">{number}</span>
              <span>
                <span className="block text-sm font-bold text-foreground-strong">{name}</span>
                <span className="font-mono text-[10px] text-muted-2">{detail}</span>
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
            </div>
          ))}
        </div>
      </MiniBrowser>
    );
  }

  if (type === "saved") {
    return (
      <MiniBrowser route="/coach/saved-matches" pill="Local">
        <div className="space-y-3 p-5">
          {[
            ["12 Apr", "Easts v Old Belvedere", "Ready"],
            ["05 Apr", "Easts v Trinity", "Needs review"],
            ["29 Mar", "Easts v Clontarf", "Ready"],
          ].map(([date, match, state]) => (
            <div key={match} className="grid grid-cols-[58px_1fr_auto] items-center gap-3 rounded-lg border border-border bg-panel p-3">
              <span className="font-mono text-[11px] uppercase text-muted-2">{date}</span>
              <span className="text-sm font-bold text-foreground-strong">{match}</span>
              <span className="rounded border border-border bg-panel-2 px-2 py-1 text-[10px] text-muted">{state}</span>
            </div>
          ))}
        </div>
      </MiniBrowser>
    );
  }

  return (
    <MiniBrowser route="/coach/compare" pill="Compare">
      <div className="grid gap-4 p-5 md:grid-cols-2">
        {["Round 10", "Round 11"].map((round, index) => (
          <div key={round} className="rounded-xl border border-border bg-panel p-4">
            <div className="font-mono text-[10px] uppercase text-muted-2">{round}</div>
            <div className="mt-2 text-2xl font-black text-foreground-strong">
              {index === 0 ? "31 - 14" : "24 - 17"}
            </div>
            <div className="mt-4 space-y-2 text-xs">
              {["Tackle %", "Lineout", "Carries"].map((label, itemIndex) => (
                <div key={label} className="flex justify-between rounded border border-border bg-panel-2 px-3 py-2">
                  <span>{label}</span>
                  <span className="font-mono text-foreground-strong">
                    {index === 0 ? ["82%", "70%", "41"][itemIndex] : ["87%", "78%", "48"][itemIndex]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MiniBrowser>
  );
}

function SlideVisual({ visual }: { visual: SlideVisual }) {
  if (visual === "capture") return <CaptureVisual />;
  return <SimpleVisual type={visual} />;
}

export default function MarketingProductSlider() {
  const [activeIndex, setActiveIndex] = useState(1);
  const activeSlide = slides[activeIndex];

  function showSlide(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  return (
    <section
      className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") showSlide(activeIndex - 1);
        if (event.key === "ArrowRight") showSlide(activeIndex + 1);
      }}
    >
      <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-4 font-mono text-xs font-bold uppercase text-muted-2">
            01 / A tour of the app
          </p>
          <h2 className="max-w-4xl text-4xl font-black uppercase leading-none text-foreground-strong sm:text-6xl lg:text-7xl">
            Every page has a job.
            <br />
            <span className="text-transparent [-webkit-text-stroke:1.25px_var(--border-light)]">
              Capture is the engine.
            </span>
          </h2>
        </div>
        <div className="flex flex-col gap-4 lg:items-end">
          <p className="max-w-md text-sm leading-6 text-muted">
            Move through the coach workflow. Capture gets the deepest treatment
            because it is where the match becomes usable data.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => showSlide(activeIndex - 1)}
              className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-panel text-lg font-black text-foreground-strong hover:bg-panel-2"
              aria-label="Previous app page"
            >
              {"<"}
            </button>
            <button
              type="button"
              onClick={() => showSlide(activeIndex + 1)}
              className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-panel text-lg font-black text-foreground-strong hover:bg-panel-2"
              aria-label="Next app page"
            >
              {">"}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-panel p-1">
        <div className="flex min-w-max">
          {slides.map((slide, index) => (
            <button
              key={slide.route}
              type="button"
              onClick={() => showSlide(index)}
              className={`relative min-w-[150px] border-r border-border px-4 py-4 text-left transition last:border-r-0 ${
                index === activeIndex
                  ? "bg-panel-3 text-foreground-strong"
                  : "text-muted hover:bg-panel-2 hover:text-foreground"
              }`}
            >
              <span className="block font-mono text-[10px] font-bold uppercase text-muted-2">
                {slide.step} / {slide.route}
              </span>
              <span className="mt-1 block text-xs font-black uppercase">
                {slide.label}
              </span>
              {index === activeIndex ? (
                <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-danger" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-panel">
        <div
          key={activeSlide.route}
          className="marketing-slide-enter grid min-h-[620px] lg:grid-cols-[0.72fr_1.28fr]"
        >
          <div className="flex flex-col justify-center border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="font-mono text-xs font-bold uppercase text-danger">
              {activeSlide.step} / {activeSlide.label}
            </div>
            <div className="mt-3 rounded border border-border bg-panel-2 px-3 py-1.5 font-mono text-[11px] text-muted-2 w-fit">
              {activeSlide.route}
            </div>
            <h3 className="mt-8 text-4xl font-black uppercase leading-none text-foreground-strong lg:text-5xl">
              {activeSlide.headline}
            </h3>
            <p className="mt-5 text-sm leading-6 text-muted">{activeSlide.body}</p>
            <div className="mt-8 space-y-3">
              {activeSlide.points.map((point, index) => (
                <div
                  key={point}
                  className="flex gap-3 rounded-lg border border-border bg-panel-2 p-3"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-danger text-[11px] font-black text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {point}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center bg-background-elevated p-4 sm:p-8 lg:p-10">
            <div className="w-full max-w-3xl">
              <SlideVisual visual={activeSlide.visual} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.route}
            type="button"
            onClick={() => showSlide(index)}
            className={`h-1.5 rounded-full transition-all ${
              index === activeIndex ? "w-12 bg-danger" : "w-7 bg-panel-3"
            }`}
            aria-label={`Show ${slide.label}`}
          />
        ))}
      </div>
    </section>
  );
}
