"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fynlwhistle-capture-walkthrough-progress";
const SEEN_KEY = "fynlwhistle-capture-walkthrough-seen";

type Phase = "Setup" | "Live tagging" | "Set pieces & subs" | "Handling uncertainty" | "After the match";

type Slide = {
  phase: Phase;
  title: string;
  bullets: string[];
  tip?: string;
  imageSrc?: string;
  imageAlt?: string;
};

const SLIDES: Slide[] = [
  {
    phase: "Setup",
    title: "Welcome to Capture",
    bullets: [
      "Capture is where you tag everything that happens in a match — live or after watching the video.",
      "Use voice tagging while the match plays, and the app builds your stats and report automatically.",
      "This walkthrough takes about 4 minutes. You can skip ahead or come back to it any time.",
    ],
    tip: "You don't have to do everything live. Many coaches tag the whole match later from the recording — Capture works the same way.",
    imageSrc: "/walkthrough/capture/01-welcome.png",
    imageAlt: "Capture screen overview",
  },
  {
    phase: "Setup",
    title: "Match details",
    bullets: [
      "Set the match title, opponent, and date before you start tagging.",
      "These appear on every report and exported file, so make them clear (e.g. \"Round 5 vs Hunter Wildfires\").",
      "You can edit these later if you forget — but it's faster to get them right up front.",
    ],
    tip: "Use a consistent format across matches. It makes browsing Saved Matches a lot easier later.",
    imageSrc: "/walkthrough/capture/02-match-details.png",
    imageAlt: "Match details fields",
  },
  {
    phase: "Setup",
    title: "Loading the team sheet",
    bullets: [
      "Click \"Add team sheet\" the first time you open a match. Paste your starting 15 + bench from any source.",
      "Each player needs a name and position. Numbers are optional.",
      "The team sheet is what tells the app who's playing — voice tagging matches voices to these names.",
    ],
    tip: "Set up your full squad in Team Setup first. Then loading a team sheet is just selecting who's playing this week.",
    imageSrc: "/walkthrough/capture/03-team-sheet.png",
    imageAlt: "Team sheet modal",
  },
  {
    phase: "Setup",
    title: "Uploading match video",
    bullets: [
      "Drag a match video file into the upload area, or click to browse.",
      "Video plays back instantly from your device — uploading to the cloud happens in the background.",
      "You can tag a match without video too, but having it makes voice tagging and review much more powerful.",
    ],
    tip: "Most phones export rugby footage as .mp4. Files up to a few GB are fine — uploads continue in the background while you tag.",
    imageSrc: "/walkthrough/capture/04-video-upload.png",
    imageAlt: "Video upload area",
  },
  {
    phase: "Live tagging",
    title: "Match milestones",
    bullets: [
      "Click \"Kick Off\" when the match starts. This anchors all your timestamps.",
      "Use \"Half Time\", \"Second Half KO\", and \"Full Time\" at the right moments — they drive game flow analysis.",
      "Each milestone logs at the current video timestamp, so press them as the moment happens.",
    ],
    tip: "Even if you forget one mid-match, you can still press it later from the right point in the video — the timestamp is what matters.",
    imageSrc: "/walkthrough/capture/05-milestones.png",
    imageAlt: "Match milestone buttons",
  },
  {
    phase: "Live tagging",
    title: "Voice tagging — the spacebar",
    bullets: [
      "Hold spacebar to record. Release to stop. The app transcribes what you said and turns it into a tagged event.",
      "Say things naturally: \"Smith big tackle\", \"Jones turnover\", \"Williams carry\".",
      "The video keeps playing while you record — you don't have to pause.",
    ],
    tip: "Use preferred names or nicknames. The app learns: if you usually call James Smith \"Smithy\", set that as a nickname in Team Setup and it'll resolve correctly every time.",
    imageSrc: "/walkthrough/capture/06-voice-tagging.png",
    imageAlt: "Voice tagging in action",
  },
  {
    phase: "Live tagging",
    title: "Quick player tags",
    bullets: [
      "Don't want to talk? Use the quick tag buttons on the matchday roster: Tackle, Missed Tackle, Carry, Turnover.",
      "Click the player, click the action — it's logged at the current video time.",
      "Useful when you're in a noisy environment or reviewing footage on mute.",
    ],
    tip: "Quick tags and voice tags can be mixed in the same match. Use whichever is fastest in the moment.",
    imageSrc: "/walkthrough/capture/07-quick-tags.png",
    imageAlt: "Quick tag buttons",
  },
  {
    phase: "Live tagging",
    title: "Team events",
    bullets: [
      "Try Scored, Try Conceded, Penalty For, Penalty Conceded — one click each.",
      "Try Scored and Penalty Conceded ask for a player name (you can skip if you don't know).",
      "These drive your discipline stats and try-difference numbers in the report.",
    ],
    tip: "Tag penalties as they happen, not at the end. Trying to remember 12 penalties from memory after the match is brutal.",
    imageSrc: "/walkthrough/capture/08-team-events.png",
    imageAlt: "Team event buttons",
  },
  {
    phase: "Set pieces & subs",
    title: "Logging lineouts and scrums",
    bullets: [
      "Open the Set Piece panel. Pick lineout or scrum, your team or the opposition, and the result (won/lost).",
      "For lineouts, you can also log the call (e.g. \"front\", \"middle\", \"tail\").",
      "The live success % shows up next to the section header once you've logged a few.",
    ],
    tip: "Logging lineout calls takes a few extra seconds but pays off — the report shows which calls work and which don't.",
    imageSrc: "/walkthrough/capture/09-set-piece.png",
    imageAlt: "Set piece logging panel",
  },
  {
    phase: "Set pieces & subs",
    title: "Bench bring-on",
    bullets: [
      "When a sub goes on, click the bench player in the roster.",
      "Pick the position they're coming on at, or the player they're replacing.",
      "The app logs the substitution event and updates minutes for both players.",
    ],
    tip: "Substitutions affect minutes-per-player stats. If they're wrong, you can fix them by editing the substitution event in the transcript panel.",
    imageSrc: "/walkthrough/capture/10-bench.png",
    imageAlt: "Bench bring-on flow",
  },
  {
    phase: "Handling uncertainty",
    title: "The Needs Review queue",
    bullets: [
      "Sometimes voice tagging isn't sure — maybe the audio was unclear or the action wasn't recognised.",
      "These go into the Needs Review queue on the right side of the screen.",
      "Click any item to fix the player, action, or both — or delete it if it was a mis-tag.",
    ],
    tip: "Don't panic if you see a few items here mid-match. Resolve them at half time or full time — your report waits until you're done.",
    imageSrc: "/walkthrough/capture/11-needs-review.png",
    imageAlt: "Needs Review queue",
  },
  {
    phase: "Handling uncertainty",
    title: "Pending Resolution",
    bullets: [
      "If voice tagging recognises the action but isn't sure which player, you'll get a quick prompt with player options.",
      "One click confirms the player and the tag is logged.",
      "Double tackles work here too — pick a second player if it was a combined hit.",
    ],
    tip: "The more you use it, the better it gets. The app remembers your patterns and asks less often.",
    imageSrc: "/walkthrough/capture/12-pending-resolution.png",
    imageAlt: "Pending Resolution prompt",
  },
  {
    phase: "Handling uncertainty",
    title: "How the app learns",
    bullets: [
      "Every time you correct a tag, the app remembers it (correction memory).",
      "Next time the same voice → name pattern comes up, it auto-resolves.",
      "You can reset correction memory in Coach Settings if it ever picks up a wrong pattern.",
    ],
    tip: "First match takes the most corrections. By match three, voice tagging usually feels effortless.",
    imageSrc: "/walkthrough/capture/13-correction-memory.png",
    imageAlt: "Correction memory in action",
  },
  {
    phase: "After the match",
    title: "Final score & submitting",
    bullets: [
      "Enter the final score (Us / Them) above the Submit button. Optional, but a nice finishing touch.",
      "Click \"Submit Match\". The app saves everything and shows a quick summary.",
      "From there you can jump straight into Insights, Review, or just close and come back later.",
    ],
    tip: "The match auto-saves continuously while you tag. Submitting just marks it as complete — nothing is ever lost if your laptop dies mid-match.",
    imageSrc: "/walkthrough/capture/14-submit.png",
    imageAlt: "Final score and submit",
  },
  {
    phase: "After the match",
    title: "What happens next",
    bullets: [
      "Insights — full team analytics, KPI cards, player table, downloadable Excel and PDF reports.",
      "Review — film review with clip tagging for team meetings, and shared playlists for players.",
      "Saved Matches — every match you've tagged, ready to reopen, compare, or share.",
    ],
    tip: "Players logged into your team see their own stats, grades, and any clips you share with them. Worth setting up — it changes how players engage with feedback.",
    imageSrc: "/walkthrough/capture/15-whats-next.png",
    imageAlt: "Next steps after submitting",
  },
];

const PHASES: Phase[] = ["Setup", "Live tagging", "Set pieces & subs", "Handling uncertainty", "After the match"];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CaptureWalkthroughModal({ open, onClose }: Props) {
  const [index, setIndex] = useState(0);

  // Restore progress on open
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed < SLIDES.length) {
          setIndex(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, [open]);

  // Persist progress on slide change
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(index));
    } catch {
      // ignore
    }
  }, [index, open]);

  // Mark as seen when reaching the end
  useEffect(() => {
    if (!open) return;
    if (index === SLIDES.length - 1 && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SEEN_KEY, "true");
      } catch {
        // ignore
      }
    }
  }, [index, open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const slide = SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  const handleClose = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SEEN_KEY, "true");
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const jumpToPhase = (phase: Phase) => {
    const firstIndex = SLIDES.findIndex((s) => s.phase === phase);
    if (firstIndex >= 0) setIndex(firstIndex);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-title"
      onClick={handleClose}
    >
      <div
        className="bg-panel border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div className="text-xs text-muted uppercase tracking-wide font-medium">{slide.phase}</div>
            <h2 id="walkthrough-title" className="text-lg font-semibold text-foreground-strong mt-0.5">
              Capture Walkthrough
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted hover:text-foreground-strong transition-colors p-1"
            aria-label="Close walkthrough"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Phase nav */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border bg-panel-2 overflow-x-auto">
          {PHASES.map((phase) => {
            const isActive = slide.phase === phase;
            return (
              <button
                key={phase}
                type="button"
                onClick={() => jumpToPhase(phase)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground hover:bg-panel-3"
                }`}
              >
                {phase}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Visual */}
            <div className="bg-panel-2 border border-border rounded-xl overflow-hidden flex items-center justify-center min-h-[280px] md:min-h-[360px]">
              {slide.imageSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={slide.imageSrc}
                  alt={slide.imageAlt ?? ""}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="text-muted-2 text-sm">Screenshot coming soon</div>
              )}
            </div>

            {/* Text */}
            <div className="flex flex-col">
              <h3 className="text-2xl font-semibold text-foreground-strong mb-4">{slide.title}</h3>
              <ul className="space-y-3 mb-6">
                {slide.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground leading-relaxed">
                    <span className="text-accent mt-1.5 flex-shrink-0">
                      <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                        <circle cx="3" cy="3" r="3" />
                      </svg>
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {slide.tip && (
                <div className="bg-accent/10 border-l-2 border-accent rounded-r-md px-4 py-3 mt-auto">
                  <div className="text-xs text-accent uppercase tracking-wide font-semibold mb-1">Tip</div>
                  <div className="text-sm text-foreground leading-relaxed">{slide.tip}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-4 bg-panel-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={isFirst}
            className="text-sm font-medium px-4 py-2 rounded-md border border-border text-foreground hover:bg-panel-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-accent" : "w-1.5 bg-border-light hover:bg-muted"
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={handleClose}
              className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Finish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))}
              className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Next →
            </button>
          )}
        </div>

        {/* Slide counter */}
        <div className="text-center text-xs text-muted-2 pb-3 bg-panel-2">
          Slide {index + 1} of {SLIDES.length}
        </div>
      </div>
    </div>
  );
}

// Helper: check if user has seen the walkthrough before
export function hasSeenCaptureWalkthrough(): boolean {
  if (typeof window === "undefined") return true; // SSR-safe default
  try {
    return window.localStorage.getItem(SEEN_KEY) === "true";
  } catch {
    return true;
  }
}
