import Link from "next/link";

const liveFeatures = [
  "Voice tagging during video",
  "Set piece logging (lineouts & scrums)",
  "Match milestones — Kick Off to Full Time",
  "Player carry, tackle & penalty tracking",
  "Team analytics and player grades",
  ".xlsx report export, match-ready",
  "Film review with timestamped notes",
];

const principles = [
  {
    label: "Voice-native",
    title: "Hold space. Say it. Done.",
    body: "The whole capture interface is a held spacebar. Eyes on the pitch, not on a keyboard.",
    visual: "wave",
  },
  {
    label: "Desktop-first",
    title: "Built for the laptop in the film room.",
    body: "Coaches work wide-screen, with a keyboard. The layout is built around that reality — not squeezed into a phone.",
    visual: "layout",
  },
  {
    label: "Local-first sync",
    title: "Fast in browser, backed by your account.",
    body: "Your squad and saved match records stay instant locally, then sync to your coach account when cloud storage is reachable.",
    visual: "local",
  },
  {
    label: "Coach-first",
    title: "Does this save time on Monday?",
    body: "Every feature gets filtered through one question. If it doesn't save the coach time post-match, it doesn't ship.",
    visual: "check",
  },
];

function PrincipleVisual({ type }: { type: string }) {
  if (type === "wave") {
    return (
      <div className="flex h-16 items-center gap-1">
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

  if (type === "layout") {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-12 w-[28%] rounded border border-border bg-panel-3" />
          <div className="flex-1 rounded border border-border bg-panel-2 p-2">
            <div className="mb-1.5 h-1.5 w-[60%] rounded-full bg-border-light" />
            <div className="h-1.5 w-[80%] rounded-full bg-border" />
            <div className="mt-1.5 h-1.5 w-[45%] rounded-full bg-border" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded border border-border bg-panel-2 p-2">
              <div className="mb-1 h-4 w-4 rounded-sm bg-border-light" />
              <div className="h-1 w-full rounded-full bg-border" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "local") {
    return (
      <div className="space-y-2 font-mono text-[11px]">
        <div className="rounded-md border border-border bg-panel-2 px-3 py-2">
          <span className="text-muted-2">LOCAL</span>{" "}
          <span className="text-foreground-strong">localStorage</span>
        </div>
        <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2">
          <span className="text-success">SYNC</span>{" "}
          <span className="text-foreground-strong">Coach account</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {["Tag live", "Grade players", "Ship Monday report"].map((item, i) => (
        <div
          key={item}
          className="flex items-center gap-3 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs"
        >
          <span className="font-black text-success">✓</span>
          <span
            className={
              i === 2
                ? "font-semibold text-foreground-strong"
                : "text-muted"
            }
          >
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="overflow-hidden">
      <section className="border-b border-border bg-foreground-strong text-background">
        <div className="marketing-marquee py-2 text-[11px] font-black uppercase">
          <div className="marketing-marquee-track">
            <span>Built by a coach</span>
            <span>For coaches</span>
            <span>Private beta</span>
            <span>Voice-first</span>
            <span>Desktop-first</span>
            <span>Built by a coach</span>
            <span>For coaches</span>
            <span>Private beta</span>
            <span>Voice-first</span>
            <span>Desktop-first</span>
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
                "radial-gradient(circle at 10% 20%, rgba(126,163,126,0.14), transparent 38%), radial-gradient(circle at 85% 75%, rgba(177,110,110,0.1), transparent 44%)",
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

          <div className="relative mb-7 flex flex-wrap items-center gap-3 font-mono text-[11px] font-semibold uppercase text-muted">
            <span className="text-foreground-strong">01</span>
            <span>/</span>
            <span>About</span>
            <span>/</span>
            <span className="inline-flex items-center gap-2 text-foreground-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              Private beta
            </span>
          </div>

          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <h1 className="text-[52px] font-black uppercase leading-[0.9] text-foreground-strong sm:text-[72px] lg:text-[96px] xl:text-[112px]">
                Built by
                <br />a coach.
                <br />
                <span className="text-transparent [-webkit-text-stroke:1.5px_var(--border-light)]">
                  For
                </span>{" "}
                <span className="text-danger">coaches.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-foreground sm:text-lg">
                RugbyCoach started as a personal tool: voice-tag the match while
                watching the video, review the film, ship the Monday report. No
                manual spreadsheets. No rebuilt grades from memory.
              </p>
            </div>

            <div className="flex flex-col gap-4 self-end lg:self-center">
              {[
                {
                  label: "Status",
                  value: "Beta",
                  detail: "Live with real clubs, free to use",
                },
                {
                  label: "Runs on",
                  value: "Browser",
                  detail: "No install, coach account sync",
                },
                {
                  label: "Platform",
                  value: "Desktop",
                  detail: "Built for coaches on a laptop",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-panel-2 px-4 py-3"
                >
                  <div className="font-mono text-[10px] font-bold uppercase text-muted-2">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-2xl font-black uppercase leading-none text-foreground-strong">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 text-xs text-muted">{stat.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mb-12">
          <p className="mb-4 font-mono text-xs font-bold uppercase text-muted-2">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              02 / The problem
            </span>
          </p>
          <h2 className="max-w-3xl text-4xl font-black uppercase leading-none text-foreground-strong sm:text-5xl lg:text-6xl">
            Coaches shouldn&apos;t spend Monday rebuilding the match.
          </h2>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5 text-base leading-7 text-foreground">
            <p>
              Every coach knows the pattern. Match finishes. You have rough
              notes — a few lines in the back of a programme, timestamps on your
              phone, things you want to remember but won&apos;t once the debrief
              chaos starts.
            </p>
            <p>
              Sunday or Monday evening: you&apos;re rebuilding the match from
              memory. Rewatching to fill gaps. Manually grading players into a
              spreadsheet you built two seasons ago. Writing the same debrief
              email you always write.
            </p>
            <p>
              It is a lot of hours for analysis that could be instant if the
              data existed in the first place. That&apos;s the gap RugbyCoach
              closes — tag live, review later, report on Monday in minutes.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-panel-2 p-5">
            <div className="mb-4 font-mono text-[10px] font-bold uppercase text-muted-2">
              Before RugbyCoach — Sunday evening
            </div>
            <div className="space-y-2 font-mono text-[11px]">
              {[
                ["Murphy", "Carry ×4, Tackle ×2 (?)", "B", false],
                ["Walsh", "Carries good — need to rewatch", "?", true],
                ["O'Connell", "Strong at lineout + 1 pen", "A", false],
                ["Henderson", "Missed off ball, hard to grade", "C?", true],
                ["Lineout", "Think we won 8 of 12...", "—", true],
              ].map(([player, note, grade, faded]) => (
                <div
                  key={player as string}
                  className="grid grid-cols-[96px_1fr_32px] gap-3 rounded border border-border bg-panel px-3 py-2"
                >
                  <span
                    className={
                      faded
                        ? "line-through text-muted-2"
                        : "font-semibold text-foreground-strong"
                    }
                  >
                    {player}
                  </span>
                  <span className="truncate text-muted">{note}</span>
                  <span
                    className={`text-right font-black ${faded ? "text-muted-2" : "text-warning"}`}
                  >
                    {grade}
                  </span>
                </div>
              ))}
              <div className="mt-4 rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[10px] text-danger">
                ↳ 3 hours to finish this. Report due 08:00.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-panel/50 py-12">
        <div className="marketing-marquee text-[52px] font-black uppercase leading-none text-foreground-strong sm:text-[80px] lg:text-[104px]">
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
            <span className="inline-flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              03 / The build
            </span>
          </p>
          <h2 className="text-4xl font-black uppercase leading-none text-foreground-strong sm:text-6xl">
            Voice-first.
            <br />
            Desktop-first.
            <br />
            <span className="text-transparent [-webkit-text-stroke:1.25px_var(--border-light)]">
              Coach-first.
            </span>
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {principles.map((p) => (
            <article
              key={p.label}
              className="rounded-xl border border-border bg-panel p-6 transition hover:border-border-light hover:bg-panel-2"
            >
              <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-muted-2">
                <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                {p.label}
              </div>
              <h3 className="text-xl font-black uppercase leading-tight text-foreground-strong sm:text-2xl">
                {p.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">{p.body}</p>
              <div className="mt-6 rounded-lg border border-border bg-background-elevated p-4">
                <PrincipleVisual type={p.visual} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 font-mono text-xs font-bold uppercase text-muted-2">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              04 / Private beta
            </span>
          </p>
          <h2 className="mb-6 text-4xl font-black uppercase leading-none text-foreground-strong sm:text-5xl">
            Private beta,
            <br />
            actively used.
          </h2>
          <p className="mb-10 max-w-2xl text-base leading-7 text-foreground">
            RugbyCoach is in active private beta with real clubs and real
            matches. The platform is free to use while in beta. Everything runs
            in your browser with a coach account for squad and match sync.
          </p>

          <div className="rounded-xl border border-border bg-panel p-6">
            <div className="mb-5 font-mono text-[10px] font-bold uppercase text-muted-2">
              Live now
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {liveFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 font-black text-success">✓</span>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <div className="mb-3 font-mono text-[10px] font-bold uppercase text-muted-2">
                What&apos;s next
              </div>
              <p className="text-sm leading-6 text-muted">
                Cloud sync, team accounts, and multi-device access are on the
                roadmap — when the time is right and the core experience is
                proven. For now, the focus is making the in-browser workflow as
                good as it can be.
              </p>
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
                "radial-gradient(circle at 20% 30%, rgba(126,163,126,0.14), transparent 36%), radial-gradient(circle at 80% 70%, rgba(177,110,110,0.1), transparent 40%)",
            }}
          />
          <h2 className="relative text-5xl font-black uppercase leading-none text-foreground-strong sm:text-7xl lg:text-8xl">
            Ready
            <br />
            <span className="text-transparent [-webkit-text-stroke:1.25px_var(--border-light)]">
              to try
            </span>{" "}
            <span className="text-danger">it?</span>
          </h2>
          <p className="relative mx-auto mt-6 max-w-xl text-base leading-7 text-muted">
            Free during private beta. Runs in your browser. Built for the match
            you have this weekend.
          </p>
          <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/coach"
              className="inline-flex items-center justify-center rounded-lg bg-foreground-strong px-7 py-4 text-sm font-black uppercase text-background transition hover:opacity-90"
            >
              Open coach platform
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg border border-border-light px-7 py-4 text-sm font-black uppercase text-foreground-strong transition hover:bg-panel-3"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
