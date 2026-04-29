import Link from "next/link";
import MarketingProductSlider from "./MarketingProductSlider";

const scoreboardItems = [
  {
    label: "Tag live",
    value: "80",
    unit: "min",
    detail: "Voice-tagged in real time",
  },
  {
    label: "Squad",
    value: "23",
    unit: "",
    detail: "Matchday players tracked",
  },
  {
    label: "Report",
    value: "5",
    unit: "sheets",
    detail: "One-click .xlsx export",
  },
  {
    label: "Review",
    value: "1",
    unit: "timeline",
    detail: "Notes tied to match moments",
  },
  {
    label: "Beta",
    value: "Coach",
    unit: "",
    detail: "Desktop-first",
  },
];

const matrixItems = [
  {
    label: "Voice tagging",
    title: "Hold space. Say it. Done.",
    body: "Built for coaches who need to keep eyes on the pitch, not on a spreadsheet.",
    visual: "wave",
  },
  {
    label: "Set piece",
    title: "Lineouts and scrums logged cleanly.",
    body: "Calls, sides, and outcomes roll into the report without another manual sheet.",
    visual: "calls",
  },
  {
    label: "Milestones",
    title: "Kickoff to full time.",
    body: "Match moments anchor the analysis and keep the timeline readable later.",
    visual: "milestones",
  },
  {
    label: "Correction memory",
    title: "Learns the way your squad is spoken.",
    body: "Coach corrections make future voice tags less brittle during live capture.",
    visual: "corrections",
  },
];

function ProductStack() {
  return (
    <div className="relative min-h-[400px] lg:min-h-[460px]">
      <div className="absolute left-0 top-0 w-[88%] overflow-hidden rounded-xl border border-border-light bg-panel shadow-[0_24px_56px_rgba(0,0,0,0.42)]">
        <div className="relative aspect-video overflow-hidden bg-[#0f1416]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_50%,rgba(126,163,126,0.24),transparent_48%),linear-gradient(135deg,#1a2e23_0%,#0f1416_100%)]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md bg-black/60 px-3 py-2 text-xs font-black uppercase text-white">
            <span>EAS</span>
            <span className="text-base">14</span>
            <span className="font-mono text-muted-2">-</span>
            <span className="text-base">10</span>
            <span>OPP</span>
          </div>
          <div className="absolute right-4 top-4 rounded bg-black/55 px-3 py-1.5 font-mono text-[11px] font-semibold text-white/90">
            Q2 24:17
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/85 to-transparent p-4">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-white">
              <span className="ml-0.5 h-0 w-0 border-y-[4px] border-l-[7px] border-y-transparent border-l-background" />
            </div>
            <div className="h-1 flex-1 rounded-full bg-white/20">
              <div className="h-full w-[42%] rounded-full bg-white" />
            </div>
            <span className="font-mono text-[11px] text-muted">24:17</span>
          </div>
        </div>
      </div>

      <div className="absolute right-0 top-[132px] z-10 w-[58%] rounded-xl border border-border-light bg-panel p-4 shadow-[0_24px_56px_rgba(0,0,0,0.48)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-black uppercase text-foreground-strong">
            Transcript
          </span>
          <span className="rounded bg-success/15 px-2 py-1 text-[10px] font-bold uppercase text-success">
            Live
          </span>
        </div>
        {[
          ["24:17", "Murphy + O'Connell tackle"],
          ["23:44", "Walsh carry"],
          ["22:58", "Lineout won - front"],
          ["21:12", "Penalty conceded"],
          ["17:48", "Try scored - 14-10"],
        ].map(([time, text], index) => (
          <div
            key={time}
            className={`border-t border-border py-2 text-xs ${
              index === 0 ? "bg-danger/10 px-2" : ""
            }`}
          >
            <div className="font-mono text-[10px] text-muted-2">{time}</div>
            <div className="mt-1 text-foreground">{text}</div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 left-[5%] z-20 flex w-[64%] items-center gap-3 rounded-xl border border-border-light bg-panel-2 px-4 py-3 shadow-[0_20px_48px_rgba(0,0,0,0.38)]">
        <span className="h-2.5 w-2.5 rounded-full bg-danger shadow-[0_0_14px_rgba(177,110,110,0.7)]" />
        <div className="min-w-0 flex-1 text-xs text-foreground">
          Listening:{" "}
          <span className="font-semibold text-foreground-strong">
            &quot;Murphy tackle&quot;
          </span>
        </div>
        <span className="rounded border border-border bg-panel-3 px-2 py-1 font-mono text-[10px] font-semibold text-muted-2">
          SPACE
        </span>
      </div>
    </div>
  );
}

function MiniVisual({ type }: { type: string }) {
  if (type === "wave") {
    return (
      <div className="flex h-20 items-center gap-1">
        {[20, 42, 72, 94, 80, 58, 74, 88, 62, 38, 78, 54, 32, 68, 46, 28, 58, 76].map(
          (height, index) => (
            <span
              key={`${height}-${index}`}
              className="flex-1 rounded-sm bg-gradient-to-b from-foreground-strong to-muted-2"
              style={{ height: `${height}%` }}
            />
          ),
        )}
      </div>
    );
  }

  if (type === "calls") {
    return (
      <div className="space-y-2">
        {[
          ["Front 2-man", "86%", "bg-success"],
          ["Back drive", "50%", "bg-warning"],
          ["Short peel", "66%", "bg-success"],
        ].map(([name, rate, color]) => (
          <div
            key={name}
            className="grid grid-cols-[1fr_74px_44px] items-center gap-3 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs"
          >
            <span className="font-semibold text-foreground-strong">{name}</span>
            <span className="h-1.5 rounded bg-panel-3">
              <span
                className={`block h-full rounded ${color}`}
                style={{ width: rate }}
              />
            </span>
            <span className="text-right font-mono font-bold text-foreground-strong">
              {rate}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (type === "milestones") {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {["Kick Off", "Half Time", "2H KO", "Full Time"].map((label) => (
            <span
              key={label}
              className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-[11px] font-bold uppercase text-foreground"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="relative h-1 rounded-full bg-border">
          <span className="absolute -top-1 left-0 h-3 w-3 rounded-full bg-success" />
          <span className="absolute -top-1 left-[42%] h-3 w-3 rounded-full bg-warning" />
          <span className="absolute -top-1 left-[54%] h-3 w-3 rounded-full bg-success" />
          <span className="absolute -top-1 right-0 h-3 w-3 rounded-full bg-danger" />
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-2 font-mono text-[11px]">
        <div className="rounded-md border border-border bg-panel-2 px-3 py-2">
          <span className="text-muted-2">HEARD</span>{" "}
          <span className="text-foreground-strong">&quot;Murf carry&quot;</span>
        </div>
        <div className="text-center text-muted-2">v</div>
      <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2">
        <span className="text-success">RESOLVED</span>{" "}
        <span className="text-foreground-strong">J. Murphy - carry</span>
      </div>
    </div>
  );
}

export default function MarketingHomePage() {
  return (
    <div className="overflow-hidden">
      <section className="border-b border-border bg-foreground-strong text-background">
        <div className="marketing-marquee py-2 text-[11px] font-black uppercase">
          <div className="marketing-marquee-track">
            <span>Now live</span>
            <span>Built for rugby coaches</span>
            <span>Voice tagging during video</span>
            <span>Capture - insights - review</span>
            <span>Now live</span>
            <span>Built for rugby coaches</span>
            <span>Voice tagging during video</span>
            <span>Capture - insights - review</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] sm:p-10 lg:p-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 15% 18%, rgba(126,163,126,0.12), transparent 34%), radial-gradient(circle at 88% 80%, rgba(183,154,99,0.1), transparent 42%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse at center, black 0%, transparent 82%)",
            }}
          />

          <div className="relative mb-9 flex flex-wrap items-center gap-3 font-mono text-[11px] font-semibold uppercase text-muted">
            <span className="text-foreground-strong">S1 E11</span>
            <span>/</span>
            <span>Season 25/26</span>
            <span>/</span>
            <span className="inline-flex items-center gap-2 text-foreground-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              Live
            </span>
          </div>

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-14">
            <div>
              <h1 className="text-[58px] font-black uppercase leading-[0.9] text-foreground-strong sm:text-[82px] lg:text-[112px] xl:text-[128px]">
                Coach
                <br />
                <span className="text-transparent [-webkit-text-stroke:1.5px_var(--border-light)]">
                  Smarter.
                </span>
                <br />
                Win <span className="text-danger">More.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-foreground sm:text-lg">
                Voice-tag the match live, review the film, and ship the Monday
                player report from one coach-first rugby workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/coach"
                  className="inline-flex items-center justify-center rounded-lg bg-foreground-strong px-7 py-4 text-sm font-black uppercase text-background transition hover:opacity-90"
                >
                  Start coaching
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-lg border border-border-light px-7 py-4 text-sm font-black uppercase text-foreground-strong transition hover:bg-panel-2"
                >
                  See pricing
                </Link>
              </div>
            </div>

            <ProductStack />
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-4 max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="grid overflow-hidden rounded-xl border border-border bg-panel shadow-[0_20px_44px_rgba(0,0,0,0.24)] sm:grid-cols-2 lg:grid-cols-5">
          {scoreboardItems.map((item) => (
            <div
              key={item.label}
              className="border-b border-border p-5 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0"
            >
              <div className="mb-3 font-mono text-[10px] font-bold uppercase text-muted-2">
                {item.label}
              </div>
              <div className="text-3xl font-black uppercase leading-none text-foreground-strong">
                {item.value}
                {item.unit ? (
                  <span className="ml-1 text-sm font-bold text-muted">
                    {item.unit}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-xs leading-5 text-muted">{item.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <MarketingProductSlider />

      <section className="border-y border-border bg-panel/50 py-12">
        <div className="marketing-marquee text-[58px] font-black uppercase leading-none text-foreground-strong sm:text-[88px] lg:text-[116px]">
          <div className="marketing-marquee-track marketing-marquee-track-slow">
            <span>Tag</span>
            <span className="text-transparent [-webkit-text-stroke:1.25px_var(--border-light)]">
              Review
            </span>
            <span>Grade</span>
            <span className="text-danger">Ship</span>
            <span>Tag</span>
            <span className="text-transparent [-webkit-text-stroke:1.25px_var(--border-light)]">
              Review
            </span>
            <span>Grade</span>
            <span className="text-danger">Ship</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-12">
        <div className="mb-12 text-center">
          <p className="mb-4 font-mono text-xs font-bold uppercase text-muted-2">
            02 / The platform
          </p>
          <h2 className="text-4xl font-black uppercase leading-none text-foreground-strong sm:text-6xl">
            Built for the sideline,
            <br />
            the film room, the kitchen table.
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {matrixItems.map((item) => (
            <article
              key={item.label}
              className="rounded-xl border border-border bg-panel p-6 transition hover:border-border-light hover:bg-panel-2"
            >
              <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-muted-2">
                <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                {item.label}
              </div>
              <h3 className="text-2xl font-black uppercase leading-none text-foreground-strong">
                {item.title}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                {item.body}
              </p>
              <div className="mt-8 rounded-lg border border-border bg-background-elevated p-4">
                <MiniVisual type={item.visual} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel p-8 sm:p-12 lg:p-16">
        <div className="absolute left-8 top-0 text-[140px] font-black leading-none text-panel-3">
            &quot;
          </div>
          <blockquote className="relative max-w-5xl text-3xl font-black leading-tight text-foreground-strong sm:text-4xl lg:text-5xl">
            First Monday I did not spend the evening rebuilding player grades.
            That is the point: the match is already tagged, reviewed, and ready
            to brief.
          </blockquote>
          <div className="relative mt-8 flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-border bg-panel-2 text-sm font-black text-foreground-strong">
              HC
            </div>
            <div>
              <div className="text-sm font-black uppercase text-foreground-strong">
                Head Coach
              </div>
              <div className="mt-1 text-xs text-muted">Rugby club</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-28 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel-2 px-6 py-16 text-center sm:px-12 lg:px-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 20% 30%, rgba(177,110,110,0.16), transparent 36%), radial-gradient(circle at 80% 70%, rgba(126,163,126,0.1), transparent 40%)",
            }}
          />
          <h2 className="relative text-5xl font-black uppercase leading-none text-foreground-strong sm:text-7xl lg:text-8xl">
            Get your
            <br />
            <span className="text-transparent [-webkit-text-stroke:1.25px_var(--border-light)]">
              Monday
            </span>{" "}
            <span className="text-danger">back.</span>
          </h2>
          <p className="relative mx-auto mt-6 max-w-xl text-base leading-7 text-muted">
            Desktop-first. Runs in your browser. Built around the rugby match
            workflow coaches already live in.
          </p>
          <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/coach"
              className="inline-flex items-center justify-center rounded-lg bg-foreground-strong px-7 py-4 text-sm font-black uppercase text-background transition hover:opacity-90"
            >
              Open coach platform
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-lg border border-border-light px-7 py-4 text-sm font-black uppercase text-foreground-strong transition hover:bg-panel-3"
            >
              Read the story
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
