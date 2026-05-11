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
  icon: React.ReactNode;
};

// Dot-grid background used behind every illustration
const IllustrationShell = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full h-full flex items-center justify-center relative" style={{ minHeight: 280 }}>
    {/* subtle dot grid */}
    <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
    <div className="relative z-10">{children}</div>
  </div>
);

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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* outer ring */}
          <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" className="text-border" />
          {/* rugby ball */}
          <ellipse cx="80" cy="80" rx="32" ry="20" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent" />
          <line x1="48" y1="80" x2="112" y2="80" stroke="currentColor" strokeWidth="1.5" className="text-accent" strokeDasharray="3 3" />
          <path d="M68 65 Q80 80 68 95" stroke="currentColor" strokeWidth="1.5" className="text-accent" fill="none" />
          <path d="M92 65 Q80 80 92 95" stroke="currentColor" strokeWidth="1.5" className="text-accent" fill="none" />
          {/* pulse rings */}
          <circle cx="80" cy="80" r="48" stroke="currentColor" strokeWidth="1" opacity="0.3" className="text-accent" />
          <circle cx="80" cy="80" r="60" stroke="currentColor" strokeWidth="1" opacity="0.15" className="text-accent" />
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* clipboard body */}
          <rect x="36" y="30" width="88" height="108" rx="6" stroke="currentColor" strokeWidth="2" className="text-border" />
          {/* clip at top */}
          <rect x="56" y="22" width="48" height="16" rx="4" stroke="currentColor" strokeWidth="2" className="text-accent" />
          {/* field lines */}
          <line x1="52" y1="60" x2="108" y2="60" stroke="currentColor" strokeWidth="2" className="text-accent" strokeLinecap="round" />
          <line x1="52" y1="60" x2="108" y2="60" stroke="currentColor" strokeWidth="2" className="text-accent" strokeLinecap="round" />
          <rect x="52" y="58" width="56" height="3" rx="1.5" className="fill-accent" opacity="0.8" />
          {/* placeholder rows */}
          <rect x="52" y="80" width="40" height="2.5" rx="1.25" fill="currentColor" className="text-muted" opacity="0.5" />
          <rect x="52" y="92" width="56" height="2.5" rx="1.25" fill="currentColor" className="text-muted" opacity="0.5" />
          <rect x="52" y="104" width="32" height="2.5" rx="1.25" fill="currentColor" className="text-muted" opacity="0.5" />
          {/* pencil */}
          <g transform="translate(96, 108) rotate(-40)">
            <rect x="-5" y="-20" width="10" height="28" rx="2" stroke="currentColor" strokeWidth="2" className="text-accent" />
            <polygon points="0,-24 -5,-20 5,-20" fill="currentColor" className="text-accent" />
          </g>
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* three player rows */}
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(0, ${i * 34})`}>
              {/* avatar circle */}
              <circle cx="46" cy="61" r="12" stroke="currentColor" strokeWidth="2" className={i === 0 ? "text-accent" : "text-border"} />
              <circle cx="46" cy="57" r="4" fill="currentColor" className={i === 0 ? "text-accent" : "text-muted"} opacity={i === 0 ? 1 : 0.5} />
              <path d="M34 69 Q46 64 58 69" stroke="currentColor" strokeWidth="1.5" fill="none" className={i === 0 ? "text-accent" : "text-muted"} opacity={i === 0 ? 1 : 0.5} />
              {/* name bar */}
              <rect x="68" y="55" width={i === 0 ? 52 : i === 1 ? 40 : 44} height="3" rx="1.5" fill="currentColor" className={i === 0 ? "text-accent" : "text-muted"} opacity={i === 0 ? 0.9 : 0.4} />
              {/* position tag */}
              <rect x="68" y="64" width="22" height="3" rx="1.5" fill="currentColor" className="text-muted" opacity="0.3" />
            </g>
          ))}
          {/* jersey number badge on first row */}
          <circle cx="46" cy="35" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent" />
          <text x="46" y="39" textAnchor="middle" fontSize="7" fill="currentColor" className="text-accent" fontWeight="bold">7</text>
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* video frame */}
          <rect x="24" y="44" width="112" height="72" rx="8" stroke="currentColor" strokeWidth="2" className="text-border" />
          {/* film strip notches */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={32 + i * 16} y="44" width="8" height="8" rx="1" fill="currentColor" className="text-border" opacity="0.6" />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={32 + i * 16} y="108" width="8" height="8" rx="1" fill="currentColor" className="text-border" opacity="0.6" />
          ))}
          {/* upload arrow */}
          <line x1="80" y1="92" x2="80" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-accent" />
          <polyline points="68,76 80,64 92,76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" className="text-accent" />
          {/* progress bar */}
          <rect x="44" y="96" width="72" height="4" rx="2" fill="currentColor" className="text-border" opacity="0.4" />
          <rect x="44" y="96" width="44" height="4" rx="2" className="fill-accent" />
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* timeline line */}
          <line x1="28" y1="80" x2="132" y2="80" stroke="currentColor" strokeWidth="2" className="text-border" strokeLinecap="round" />
          {/* milestones */}
          {[
            { x: 28, label: "KO", active: true },
            { x: 66, label: "HT", active: true },
            { x: 100, label: "KO", active: false },
            { x: 132, label: "FT", active: false },
          ].map(({ x, label, active }) => (
            <g key={x}>
              <circle cx={x} cy="80" r="8" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={active ? "text-accent" : "text-border"} />
              {active && <circle cx={x} cy="80" r="3" fill="white" />}
              <text x={x} y="100" textAnchor="middle" fontSize="8" fill="currentColor" className={active ? "text-accent" : "text-muted"} fontWeight="600">{label}</text>
              <line x1={x} y1="68" x2={x} y2="60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" className={active ? "text-accent" : "text-border"} />
            </g>
          ))}
          {/* stopwatch */}
          <circle cx="100" cy="42" r="14" stroke="currentColor" strokeWidth="1.5" className="text-border" />
          <line x1="100" y1="42" x2="100" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent" />
          <line x1="100" y1="42" x2="106" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent" />
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* microphone body */}
          <rect x="68" y="28" width="24" height="44" rx="12" stroke="currentColor" strokeWidth="2.5" className="text-accent" />
          {/* mic stand arc */}
          <path d="M52 68 Q52 96 80 96 Q108 96 108 68" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" className="text-accent" />
          <line x1="80" y1="96" x2="80" y2="116" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-accent" />
          <line x1="64" y1="116" x2="96" y2="116" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-accent" />
          {/* sound waves */}
          {[1, 2, 3].map((i) => (
            <g key={i}>
              <path d={`M${80 - 16 - i * 10} ${50 - i * 4} Q${80 - 20 - i * 8} 50 ${80 - 16 - i * 10} ${50 + i * 4}`}
                stroke="currentColor" strokeWidth="1.5" fill="none" className="text-accent" opacity={1 - i * 0.25} />
              <path d={`M${80 + 16 + i * 10} ${50 - i * 4} Q${80 + 20 + i * 8} 50 ${80 + 16 + i * 10} ${50 + i * 4}`}
                stroke="currentColor" strokeWidth="1.5" fill="none" className="text-accent" opacity={1 - i * 0.25} />
            </g>
          ))}
          {/* spacebar key */}
          <rect x="44" y="122" width="72" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-border" />
          <rect x="56" y="126" width="48" height="6" rx="2" fill="currentColor" className="text-border" opacity="0.4" />
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* player avatar */}
          <circle cx="56" cy="60" r="14" stroke="currentColor" strokeWidth="2" className="text-border" />
          <circle cx="56" cy="56" r="5" fill="currentColor" className="text-muted" opacity="0.6" />
          <path d="M42 72 Q56 66 70 72" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-muted" opacity="0.6" />
          {/* arrow pointing right */}
          <line x1="76" y1="60" x2="94" y2="60" stroke="currentColor" strokeWidth="2" className="text-accent" strokeLinecap="round" />
          <polyline points="88,54 94,60 88,66" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
          {/* action buttons */}
          {[
            { y: 44, label: "Tackle", active: true },
            { y: 64, label: "Carry", active: false },
            { y: 84, label: "Turnover", active: false },
          ].map(({ y, label, active }) => (
            <g key={label}>
              <rect x="100" y={y} width="44" height="14" rx="4"
                fill={active ? "currentColor" : "none"}
                stroke="currentColor" strokeWidth="1.5"
                className={active ? "text-accent" : "text-border"} />
              <text x="122" y={y + 10} textAnchor="middle" fontSize="7.5"
                fill={active ? "white" : "currentColor"}
                className={active ? "" : "text-muted"}
                fontWeight="600">{label}</text>
            </g>
          ))}
          {/* lightning bolt for quick */}
          <polygon points="56,88 50,104 57,100 52,116 68,98 60,102" fill="currentColor" className="text-accent" opacity="0.8" />
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* scoreboard frame */}
          <rect x="24" y="40" width="112" height="60" rx="8" stroke="currentColor" strokeWidth="2" className="text-border" />
          {/* score numbers */}
          <text x="60" y="82" textAnchor="middle" fontSize="28" fontWeight="700" fill="currentColor" className="text-accent">3</text>
          <text x="80" y="82" textAnchor="middle" fontSize="20" fontWeight="400" fill="currentColor" className="text-muted">–</text>
          <text x="100" y="82" textAnchor="middle" fontSize="28" fontWeight="700" fill="currentColor" className="text-border">1</text>
          {/* label */}
          <text x="80" y="56" textAnchor="middle" fontSize="8" fill="currentColor" className="text-muted" fontWeight="600" letterSpacing="1">SCORE</text>
          {/* rugby posts below */}
          <line x1="72" y1="116" x2="72" y2="136" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-border" />
          <line x1="88" y1="116" x2="88" y2="136" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-border" />
          <line x1="80" y1="114" x2="80" y2="122" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-border" />
          <line x1="65" y1="116" x2="95" y2="116" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-border" />
          {/* TRY tag */}
          <rect x="28" y="108" width="28" height="12" rx="3" className="fill-accent" />
          <text x="42" y="118" textAnchor="middle" fontSize="7" fill="white" fontWeight="700">TRY</text>
          {/* PEN tag */}
          <rect x="104" y="108" width="28" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
          <text x="118" y="118" textAnchor="middle" fontSize="7" fill="currentColor" className="text-muted" fontWeight="600">PEN</text>
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* lineout players (two lines facing each other) */}
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              {/* left team */}
              <circle cx="56" cy={44 + i * 22} r="9" stroke="currentColor" strokeWidth="2" className="text-accent" />
              {/* right team */}
              <circle cx="104" cy={44 + i * 22} r="9" stroke="currentColor" strokeWidth="2" className="text-border" />
            </g>
          ))}
          {/* ball being thrown */}
          <ellipse cx="80" cy="56" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" />
          {/* throw arc */}
          <path d="M62 56 Q80 44 98 56" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" fill="none" className="text-accent" />
          {/* success badge */}
          <circle cx="80" cy="130" r="14" className="fill-accent" />
          <polyline points="72,130 78,136 90,122" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* gap line */}
          <line x1="80" y1="38" x2="80" y2="122" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" className="text-border" opacity="0.5" />
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* player going off (left, faded) */}
          <circle cx="44" cy="60" r="14" stroke="currentColor" strokeWidth="2" className="text-border" opacity="0.5" />
          <circle cx="44" cy="55" r="5" fill="currentColor" className="text-muted" opacity="0.4" />
          <path d="M30 72 Q44 67 58 72" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-muted" opacity="0.4" />
          {/* arrow down-left (off) */}
          <line x1="44" y1="80" x2="44" y2="100" stroke="currentColor" strokeWidth="2" className="text-border" opacity="0.5" strokeLinecap="round" />
          <polyline points="36,92 44,100 52,92" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-border" opacity="0.5" />
          {/* player coming on (right, vivid) */}
          <circle cx="116" cy="60" r="14" stroke="currentColor" strokeWidth="2" className="text-accent" />
          <circle cx="116" cy="55" r="5" fill="currentColor" className="text-accent" />
          <path d="M102 72 Q116 67 130 72" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-accent" />
          {/* arrow up-right (on) */}
          <line x1="116" y1="100" x2="116" y2="80" stroke="currentColor" strokeWidth="2" className="text-accent" strokeLinecap="round" />
          <polyline points="108,88 116,80 124,88" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
          {/* swap arrows in center */}
          <path d="M66 54 Q80 44 94 54" stroke="currentColor" strokeWidth="2" fill="none" className="text-accent" strokeLinecap="round" />
          <polyline points="86,48 94,54 88,62" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
          <path d="M94 70 Q80 80 66 70" stroke="currentColor" strokeWidth="2" fill="none" className="text-border" strokeLinecap="round" opacity="0.5" />
          <polyline points="74,76 66,70 72,62" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-border" opacity="0.5" />
          {/* bench label */}
          <rect x="60" y="108" width="40" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" opacity="0.4" />
          <text x="80" y="120" textAnchor="middle" fontSize="8" fill="currentColor" className="text-muted" fontWeight="600">BENCH</text>
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* queue rows */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="32" y={44 + i * 28} width="96" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" className={i === 0 ? "text-accent" : "text-border"} opacity={i === 0 ? 1 : 0.5} />
              {/* warning dot */}
              <circle cx="48" cy={54 + i * 28} r="5" fill={i === 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className={i === 0 ? "text-accent" : "text-border"} opacity={i === 0 ? 1 : 0.5} />
              {i === 0 && <text x="48" y="58" textAnchor="middle" fontSize="7" fill="white" fontWeight="800">!</text>}
              {/* text placeholder */}
              <rect x="60" y={50 + i * 28} width={i === 0 ? 44 : i === 1 ? 36 : 40} height="3" rx="1.5" fill="currentColor" className={i === 0 ? "text-accent" : "text-muted"} opacity={i === 0 ? 0.8 : 0.35} />
              <rect x="60" y={56 + i * 28} width="24" height="2.5" rx="1.25" fill="currentColor" className="text-muted" opacity="0.25" />
            </g>
          ))}
          {/* edit icon on first row */}
          <g transform="translate(114, 54)">
            <path d="M-4 4 L4 -4 L8 0 L0 8 Z" stroke="currentColor" strokeWidth="1.5" className="text-accent" fill="none" />
            <line x1="-4" y1="4" x2="-8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent" />
          </g>
          {/* badge count */}
          <circle cx="128" cy="40" r="12" className="fill-accent" />
          <text x="128" y="44" textAnchor="middle" fontSize="10" fill="white" fontWeight="700">3</text>
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* question bubble */}
          <rect x="32" y="28" width="96" height="52" rx="10" stroke="currentColor" strokeWidth="2" className="text-border" />
          <path d="M60 80 L56 92 L72 80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-border" />
          <text x="80" y="60" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor" className="text-accent">?</text>
          {/* two choice buttons */}
          <rect x="28" y="100" width="44" height="24" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
          <text x="50" y="116" textAnchor="middle" fontSize="8" fill="currentColor" className="text-muted" fontWeight="600">Smith</text>
          <rect x="88" y="100" width="44" height="24" rx="6" className="fill-accent" />
          <text x="110" y="116" textAnchor="middle" fontSize="8" fill="white" fontWeight="700">Jones</text>
          {/* checkmark on chosen */}
          <polyline points="100,112 106,118 120,104" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* arrow from bubble to buttons */}
          <line x1="80" y1="80" x2="80" y2="98" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" className="text-border" />
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* cycle arrows (learn loop) */}
          <path d="M80 36 A44 44 0 1 1 36 80" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" className="text-accent" />
          <polyline points="36,64 36,80 52,80" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
          {/* match count indicators */}
          {[1, 2, 3].map((m) => {
            const angle = (m - 1) * 120 - 90;
            const rad = (angle * Math.PI) / 180;
            const cx = 80 + 44 * Math.cos(rad);
            const cy = 80 + 44 * Math.sin(rad);
            return (
              <circle key={m} cx={cx} cy={cy} r="10"
                fill={m <= 2 ? "currentColor" : "none"}
                stroke="currentColor" strokeWidth="2"
                className={m <= 2 ? "text-accent" : "text-border"} />
            );
          })}
          {/* sparkles inside */}
          <text x="80" y="84" textAnchor="middle" fontSize="18" className="text-accent" fill="currentColor">✦</text>
          {/* match labels */}
          <text x="80" y="136" textAnchor="middle" fontSize="8" fill="currentColor" className="text-muted" fontWeight="500">learns with every match</text>
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* score row */}
          <rect x="28" y="40" width="104" height="36" rx="8" stroke="currentColor" strokeWidth="1.5" className="text-border" />
          <text x="60" y="64" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor" className="text-accent">24</text>
          <text x="80" y="64" textAnchor="middle" fontSize="16" fill="currentColor" className="text-muted">–</text>
          <text x="100" y="64" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor" className="text-border">18</text>
          {/* submit button */}
          <rect x="40" y="92" width="80" height="32" rx="8" className="fill-accent" />
          <text x="80" y="112" textAnchor="middle" fontSize="11" fill="white" fontWeight="700">Submit Match</text>
          {/* big checkmark underneath */}
          <circle cx="80" cy="142" r="10" className="fill-accent" opacity="0.2" />
          <polyline points="73,142 78,148 90,134" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
        </svg>
      </IllustrationShell>
    ),
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
    icon: (
      <IllustrationShell>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* three destination cards */}
          {/* Insights */}
          <rect x="20" y="52" width="36" height="56" rx="6" stroke="currentColor" strokeWidth="1.5" className="text-accent" />
          <rect x="28" y="84" width="6" height="16" rx="2" className="fill-accent" opacity="0.8" />
          <rect x="36" y="76" width="6" height="24" rx="2" className="fill-accent" />
          <rect x="44" y="80" width="6" height="20" rx="2" className="fill-accent" opacity="0.6" />
          <text x="38" y="68" textAnchor="middle" fontSize="6.5" fill="currentColor" className="text-accent" fontWeight="600">INSIGHTS</text>
          {/* Review */}
          <rect x="62" y="40" width="36" height="56" rx="6" stroke="currentColor" strokeWidth="1.5" className="text-border" />
          <polygon points="80,56 80,84 96,70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-border" />
          <text x="80" y="108" textAnchor="middle" fontSize="6.5" fill="currentColor" className="text-muted" fontWeight="600">REVIEW</text>
          {/* Saved */}
          <rect x="104" y="52" width="36" height="56" rx="6" stroke="currentColor" strokeWidth="1.5" className="text-border" />
          <rect x="112" y="64" width="20" height="3" rx="1.5" fill="currentColor" className="text-muted" opacity="0.5" />
          <rect x="112" y="72" width="20" height="3" rx="1.5" fill="currentColor" className="text-muted" opacity="0.5" />
          <rect x="112" y="80" width="14" height="3" rx="1.5" fill="currentColor" className="text-muted" opacity="0.5" />
          <text x="122" y="118" textAnchor="middle" fontSize="6.5" fill="currentColor" className="text-muted" fontWeight="600">SAVED</text>
          {/* arrow from left edge */}
          <line x1="20" y1="130" x2="140" y2="130" stroke="currentColor" strokeWidth="1.5" className="text-border" opacity="0.3" strokeDasharray="3 3" />
          <circle cx="20" cy="130" r="4" className="fill-accent" />
          <polyline points="132,124 140,130 132,136" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
        </svg>
      </IllustrationShell>
    ),
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
              {slide.icon}
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
