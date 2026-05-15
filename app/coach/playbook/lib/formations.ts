import type { FormationPreset } from './types';

// ─── Coordinate reference (landscape) ─────────────────────────────────────────
//   normX: 0 = home dead-ball → 1 = away dead-ball   (112 m)
//   normY: 0 = top touchline  → 1 = bottom touchline (70 m)
//   Home attacks RIGHT (increasing normX).
//
//   Key normX anchors  : home try 0.054  | home22 0.250 | halfway 0.500 | away22 0.750
//   Key normY anchors  : top5m 0.071 | top15m 0.214 | centre 0.500 | bot15m 0.786 | bot5m 0.929
//
//   Jersey numbers: 1 LP  2 H  3 TP  4 L  5 L  6 BF  7 OF  8 N8
//                   9 SH  10 FH  11 LW  12 IC  13 OC  14 RW  15 FB

// ─── Builder helpers ──────────────────────────────────────────────────────────

type AP = { type: 'player'; team: 'home' | 'away'; number: number; normX: number; normY: number; locked: false };

const h = (n: number, x: number, y: number): AP =>
  ({ type: 'player', team: 'home', number: n, normX: x, normY: y, locked: false });

const a = (n: number, x: number, y: number): AP =>
  ({ type: 'player', team: 'away', number: n, normX: x, normY: y, locked: false });

const bot = (actors: AP[]): AP[] =>
  actors.map(p => ({ ...p, normY: +((1 - p.normY).toFixed(3)) }));

const shiftX = (actors: AP[], dx: number): AP[] =>
  actors.map(p => ({ ...p, normX: +(p.normX + dx).toFixed(3) }));

// ─── Lineout constants ────────────────────────────────────────────────────────
// Line of touch at home 22 (normX 0.250). Home attacks right.
// Lineout column runs perpendicular to the touchline (normY direction).
// Spacing 0.040 normY (≈ 2.8 m) so 16px-radius tokens are readable at ~470px pitch height.

const TX   = 0.250;                  // line of touch (home 22 mark)
const HX   = TX - 0.003;            // 0.247 — home row, infield of line of touch
const AX   = TX + 0.003;            // 0.253 — away row

const H_OFF10 = +(TX - 10 / 112).toFixed(3);  // 0.161 — home backs offside (lineout)
const A_OFF10 = +(TX + 10 / 112).toFixed(3);  // 0.339 — away backs offside (lineout)

const LS  = 0.040;                   // lineout column spacing
const LY0 = 0.078;                   // first slot — just outside 5m line (normY 0.071)
// 6 lineout slots: 0.078, 0.118, 0.158, 0.198, 0.238, 0.278
const LY = Array.from({ length: 6 }, (_, i) => +(LY0 + i * LS).toFixed(3));

// Per-formation line-of-touch positions (normX shift from base TX 0.250)
const TX_61   = 0.160;               // 6+1  — inside attacking 22m (~12 m from try line)
const TX_5MAN = 0.500;               // 5-man — halfway (midfield, between 10m lines)
const TX_7MAN = 0.375;               // 7-man — between home 22m and halfway (exit lineout)

const dx_61   = TX_61   - TX;        // −0.090
const dx_5man = TX_5MAN - TX;        // +0.250
const dx_7man = TX_7MAN - TX;        // +0.125

// ─── Shared sub-array builders ────────────────────────────────────────────────

// Place forwards in a lineout column (front = near touchline, last = tail)
function loFwds(jerseys: number[], isHome: boolean): AP[] {
  const x = isHome ? HX : AX;
  const mk = isHome ? h : a;
  return jerseys.map((n, i) => mk(n, x, LY[i]));
}

// Place forwards in the 5m channel (short side, between touchline and 5m line)
function chan5m(jerseys: number[], isHome: boolean): AP[] {
  const x = isHome ? TX - 0.005 : TX + 0.005;
  const mk = isHome ? h : a;
  return jerseys.map((n, i) => mk(n, x, 0.018 + i * 0.018));
}

// Scrum-half receiver at tail of lineout (2m infield of the midpoint)
function loSH(jersey: number, isHome: boolean, numInLine: number): AP {
  const mid = LY0 + ((numInLine - 1) * LS) / 2;
  const normY = +(mid + 2 / 70).toFixed(3);
  const normX = isHome ? TX - 0.002 : TX + 0.002;
  return (isHome ? h : a)(jersey, normX, normY);
}

// Standard backline with 1–2m depth stagger (attack or defence, same positions).
// Home backs (offside normX 0.161): fan from near-touchline to open side.
// Away backs (offside normX 0.339): mirror fan.
// nearTY = 0 for ↑ variants; bot() handles the ↓ mirror.

function homeBackline(nearTY = 0): AP[] {
  if (nearTY !== 0) return bot(homeBackline(0));
  const bx = H_OFF10;    // 0.161
  const ds = 0.009;      // 1m depth stagger per player outward
  return [
    h(11, bx + ds,     0.025),  // blind wing — near touchline, slightly closer to LO
    h(10, bx,          0.240),  // fly-half — 10m back, ~17m from touchline
    h(12, bx - ds,     0.310),  // inside centre
    h(13, bx - 2 * ds, 0.380),  // outside centre
    h(14, bx - 3 * ds, 0.800),  // right wing — wide open side
    h(15, bx - 5 * ds, 0.500),  // fullback — deep
  ];
}

function awayBackline(nearTY = 0): AP[] {
  if (nearTY !== 0) return bot(awayBackline(0));
  const bx = A_OFF10;    // 0.339
  const ds = 0.009;
  return [
    a(11, bx - ds,     0.025),
    a(10, bx,          0.240),
    a(12, bx + ds,     0.310),
    a(13, bx + 2 * ds, 0.380),
    a(14, bx + 3 * ds, 0.800),
    a(15, bx + 5 * ds, 0.500),
  ];
}

// ─── 5-man lineout — ATTACK (top touchline) ───────────────────────────────────
// Home throws: 4,5,6,8 in line.  1,3,7 in 5m channel.  9 receiver at mid-line.
// Away mirrors with 4,5,6,8 in line.
const lo5AtkHomeTop: AP[] = [
  h(2, TX, 0.000),                            // hooker on touchline, throws
  ...loFwds([4, 5, 6, 8], true),              // 4 forwards in column
  ...chan5m([7, 1, 3], true),                 // 5m channel pod
  loSH(9, true, 4),                           // SH receiver ~2m infield of mid-line
  ...homeBackline(),
];

const lo5AtkAwayTop: AP[] = [
  a(2, AX, 0.010),                            // hooker near touchline (not throwing)
  ...loFwds([4, 5, 6, 8], false),
  ...chan5m([7, 1, 3], false),
  loSH(9, false, 4),
  ...awayBackline(),
];

// ─── 6+1 lineout — ATTACK (top touchline) ────────────────────────────────────
// Home throws: 1,4,5,6,8 in line (5 fwds).  #7 = "+1" off the back.  #3 in 5m channel.
// #9 is in the BACKS as first receiver (key 6+1 feature).
// Away mirrors with 5 in line + #7 at tail.
const lo61AtkHomeTop: AP[] = [
  h(2, TX, 0.000),
  ...loFwds([1, 4, 5, 6, 8], true),           // 5 forwards (LY[0]–LY[4])
  h(7, TX - 0.002, LY[4] + 0.029),            // "+1" — 2m off the back of the lineout
  ...chan5m([3], true),                        // 3 in 5m channel
  h(9, H_OFF10 + 0.009, 0.190),               // 9 in backs as first receiver (infield of 10)
  ...homeBackline(),
];

const lo61AtkAwayTop: AP[] = [
  a(2, AX, 0.010),
  ...loFwds([1, 4, 5, 6, 8], false),
  a(7, TX + 0.002, LY[4] + 0.029),            // away +1 mirrors home
  ...chan5m([3], false),
  a(9, A_OFF10 - 0.009, 0.190),               // away 9 in backs
  ...awayBackline(),
];

// ─── 7-man lineout — ATTACK (top touchline) ──────────────────────────────────
// Home throws: 3,4,6,5,7,8 in line (6 fwds).  #1 in 5m channel.  #9 receiver at tail.
const lo7AtkHomeTop: AP[] = [
  h(2, TX, 0.000),
  ...loFwds([3, 4, 6, 5, 7, 8], true),        // 6 forwards (LY[0]–LY[5])
  ...chan5m([1], true),                        // 1 at front of 5m channel
  loSH(9, true, 6),                            // 9 infield of mid 6-man line
  ...homeBackline(),
];

const lo7AtkAwayTop: AP[] = [
  a(2, AX, 0.010),
  ...loFwds([3, 4, 6, 5, 7, 8], false),
  ...chan5m([1], false),
  loSH(9, false, 6),
  ...awayBackline(),
];

// ─── Scrum — ATTACK (home 22, top touchline) ─────────────────────────────────
// Scrum centred near top touchline (normY ≈ 0.246). Home put-in.
// Home front row at normX 0.248, away at 0.252.
// Home hindmost foot (#8) at normX 0.222.  Away #8 at normX 0.278.
// Home backs BEHIND the scrum (lower normX). Away backs 5m past their hindmost foot.

const scrumAtkTop: AP[] = [
  // Home tight 8
  h(1, 0.248, 0.218),   // LP — touchline side
  h(2, 0.248, 0.246),   // Hooker
  h(3, 0.248, 0.274),   // TP — open side
  h(4, 0.236, 0.228),   // Lock — loosehead side
  h(5, 0.236, 0.262),   // Lock — tighthead side
  h(6, 0.228, 0.206),   // BF — blind side (touchline)
  h(7, 0.228, 0.286),   // OF — open side
  h(8, 0.222, 0.246),   // N8 — hindmost foot at 0.222
  // Home backs — behind scrum, open side
  h(9, 0.222, 0.316),   // SH feeds from open side
  h(11, 0.232, 0.124),  // LW blind side
  h(10, 0.177, 0.376),  // FH — 5m behind N8, open side
  h(12, 0.168, 0.447),
  h(13, 0.159, 0.518),
  h(14, 0.150, 0.580),  // RW wide open
  h(15, 0.090, 0.648),  // FB deep
  // Away tight 8
  a(3, 0.252, 0.218),
  a(2, 0.252, 0.246),
  a(1, 0.252, 0.274),
  a(5, 0.264, 0.228),
  a(4, 0.264, 0.262),
  a(6, 0.272, 0.206),
  a(7, 0.272, 0.286),
  a(8, 0.278, 0.246),   // away hindmost foot at 0.278
  // Away backs — 5m past away hindmost foot (0.278 + 0.045 = 0.323)
  a(9, 0.262, 0.320),   // away SH defends at base
  a(11, 0.313, 0.128),
  a(10, 0.323, 0.382),
  a(12, 0.332, 0.449),
  a(13, 0.341, 0.516),
  a(14, 0.350, 0.572),
  a(15, 0.390, 0.648),
];

// ─── Scrum — DEFENCE (away put-in, home 22, top touchline) ───────────────────
// Same scrum pack positions. Away feeds, home defends.
// Home backs offside = 5m behind home #8 (0.222 − 0.045 = 0.177).

const scrumDefTop: AP[] = [
  // Home tight 8 (same positions)
  h(1, 0.248, 0.218),
  h(2, 0.248, 0.246),
  h(3, 0.248, 0.274),
  h(4, 0.236, 0.228),
  h(5, 0.236, 0.262),
  h(6, 0.228, 0.206),
  h(7, 0.228, 0.286),
  h(8, 0.222, 0.246),
  // Home backs — 5m offside (0.177) — CRITICAL
  h(9, 0.222, 0.316),   // home SH at base defending
  h(11, 0.175, 0.124),  // blind wing — must be 5m behind home #8 (0.222 − 0.045 = 0.177)
  h(10, 0.177, 0.376),
  h(12, 0.168, 0.447),
  h(13, 0.159, 0.518),
  h(14, 0.150, 0.580),
  h(15, 0.090, 0.648),
  // Away tight 8
  a(3, 0.252, 0.218),
  a(2, 0.252, 0.246),
  a(1, 0.252, 0.274),
  a(5, 0.264, 0.228),
  a(4, 0.264, 0.262),
  a(6, 0.272, 0.206),
  a(7, 0.272, 0.286),
  a(8, 0.278, 0.246),
  // Away backs — attacking position (no restriction, attacking home goal)
  a(9, 0.262, 0.320),   // away SH feeds
  a(11, 0.268, 0.124),
  a(10, 0.295, 0.382),
  a(12, 0.304, 0.449),
  a(13, 0.313, 0.516),
  a(14, 0.322, 0.572),
  a(15, 0.370, 0.648),
];

// ─── Penalty attack ───────────────────────────────────────────────────────────
// Penalty on away 22 (normX ≈ 0.748), center field. Unchanged from original.
const penaltyAttack: AP[] = [
  h(8, 0.720, 0.490),
  h(7, 0.708, 0.436),
  h(2, 0.708, 0.492),
  h(6, 0.708, 0.548),
  h(1, 0.696, 0.420),
  h(4, 0.696, 0.476),
  h(5, 0.696, 0.532),
  h(3, 0.696, 0.588),
  h(9, 0.732, 0.514),
  h(10, 0.748, 0.500),
  h(12, 0.752, 0.390),
  h(13, 0.752, 0.614),
  h(11, 0.742, 0.220),
  h(14, 0.742, 0.784),
  h(15, 0.726, 0.344),
  a(1, 0.838, 0.420),
  a(2, 0.838, 0.462),
  a(3, 0.838, 0.504),
  a(4, 0.838, 0.546),
  a(5, 0.842, 0.380),
  a(6, 0.842, 0.590),
  a(7, 0.846, 0.434),
  a(8, 0.846, 0.500),
  a(9, 0.854, 0.458),
  a(10, 0.870, 0.404),
  a(12, 0.880, 0.352),
  a(13, 0.890, 0.556),
  a(11, 0.860, 0.182),
  a(14, 0.860, 0.818),
  a(15, 0.908, 0.500),
];

// ─── Open play ────────────────────────────────────────────────────────────────
const openPlay: AP[] = [
  h(8, 0.485, 0.490),
  h(9, 0.474, 0.526),
  h(7, 0.477, 0.436),
  h(6, 0.477, 0.558),
  h(4, 0.465, 0.458),
  h(5, 0.465, 0.534),
  h(1, 0.452, 0.430),
  h(2, 0.452, 0.498),
  h(3, 0.452, 0.566),
  h(10, 0.445, 0.402),
  h(12, 0.415, 0.348),
  h(13, 0.390, 0.642),
  h(11, 0.330, 0.114),
  h(14, 0.340, 0.884),
  h(15, 0.246, 0.498),
  a(1, 0.556, 0.452),
  a(2, 0.556, 0.500),
  a(3, 0.556, 0.548),
  a(4, 0.548, 0.456),
  a(5, 0.548, 0.542),
  a(6, 0.548, 0.412),
  a(7, 0.548, 0.586),
  a(8, 0.542, 0.498),
  a(9, 0.558, 0.408),
  a(10, 0.568, 0.370),
  a(12, 0.580, 0.326),
  a(13, 0.576, 0.660),
  a(11, 0.562, 0.126),
  a(14, 0.578, 0.874),
  a(15, 0.710, 0.498),
];

// ─── Formation presets ────────────────────────────────────────────────────────

export const FORMATIONS: FormationPreset[] = [

  // ── Kickoff ──────────────────────────────────────────────────────────────────
  {
    id: 'kickoff-home',
    name: 'Kickoff',
    description: 'Home kick off from halfway — kick-chase spread, away in reception',
    category: 'kickoff',
    actors: [
      h(10, 0.500, 0.500),
      h(9,  0.470, 0.524),
      h(15, 0.380, 0.500),
      h(11, 0.460, 0.130),
      h(14, 0.460, 0.870),
      h(12, 0.460, 0.360),
      h(13, 0.460, 0.640),
      h(8,  0.440, 0.500),
      h(7,  0.430, 0.420),
      h(6,  0.430, 0.580),
      h(4,  0.420, 0.450),
      h(5,  0.420, 0.550),
      h(1,  0.410, 0.400),
      h(2,  0.410, 0.500),
      h(3,  0.410, 0.600),
      a(15, 0.800, 0.500),
      a(11, 0.660, 0.130),
      a(14, 0.660, 0.870),
      a(12, 0.650, 0.360),
      a(13, 0.650, 0.640),
      a(10, 0.640, 0.500),
      a(9,  0.620, 0.480),
      a(8,  0.600, 0.500),
      a(7,  0.590, 0.420),
      a(6,  0.590, 0.580),
      a(4,  0.575, 0.450),
      a(5,  0.575, 0.550),
      a(1,  0.560, 0.420),
      a(2,  0.560, 0.500),
      a(3,  0.560, 0.580),
    ],
  },

  {
    id: 'kickoff-defence',
    name: 'Kickoff Defence',
    description: 'Home receives — structured catch & maul pods',
    category: 'kickoff',
    actors: [
      h(15, 0.220, 0.500),
      h(11, 0.350, 0.130),
      h(14, 0.350, 0.870),
      h(12, 0.360, 0.360),
      h(13, 0.360, 0.640),
      h(10, 0.370, 0.500),
      h(9,  0.390, 0.480),
      h(8,  0.400, 0.500),
      h(7,  0.420, 0.420),
      h(6,  0.420, 0.580),
      h(4,  0.430, 0.450),
      h(5,  0.430, 0.550),
      h(1,  0.445, 0.410),
      h(2,  0.445, 0.500),
      h(3,  0.445, 0.590),
      a(10, 0.501, 0.500),
      a(9,  0.530, 0.524),
      a(15, 0.620, 0.500),
      a(11, 0.545, 0.130),
      a(14, 0.545, 0.870),
      a(12, 0.545, 0.360),
      a(13, 0.545, 0.640),
      a(8,  0.555, 0.500),
      a(7,  0.565, 0.420),
      a(6,  0.565, 0.580),
      a(4,  0.575, 0.450),
      a(5,  0.575, 0.550),
      a(1,  0.585, 0.420),
      a(2,  0.585, 0.500),
      a(3,  0.585, 0.580),
    ],
  },

  // ── Lineout — 5-man (midfield, between 10m lines) ───────────────────────────
  {
    id: 'lineout-5man-atk-top',
    name: '5-Man Atk ↑',
    description: '5-man attack — top touchline, at halfway. 4,5,6,8 in line; 1,3,7 in 5m channel; backs 10m back',
    category: 'lineout',
    actors: shiftX([...lo5AtkHomeTop, ...lo5AtkAwayTop], dx_5man),
  },
  {
    id: 'lineout-5man-atk-bot',
    name: '5-Man Atk ↓',
    description: '5-man attack — bottom touchline mirror, at halfway',
    category: 'lineout',
    actors: shiftX(bot([...lo5AtkHomeTop, ...lo5AtkAwayTop]), dx_5man),
  },

  // ── Lineout — 6+1 (inside attacking 22m, close to try line) ─────────────────
  {
    id: 'lineout-6plus1-atk-top',
    name: '6+1 Atk ↑',
    description: '6+1 attack — top touchline, inside attacking 22m. 1,4,5,6,8 in line; #7 as +1 off back; #9 in backs as first receiver',
    category: 'lineout',
    actors: shiftX([...lo61AtkHomeTop, ...lo61AtkAwayTop], dx_61),
  },
  {
    id: 'lineout-6plus1-atk-bot',
    name: '6+1 Atk ↓',
    description: '6+1 attack — bottom touchline mirror, inside attacking 22m',
    category: 'lineout',
    actors: shiftX(bot([...lo61AtkHomeTop, ...lo61AtkAwayTop]), dx_61),
  },

  // ── Lineout — 7-man (between home 22m and halfway) ──────────────────────────
  {
    id: 'lineout-7man-atk-top',
    name: '7-Man Atk ↑',
    description: '7-man attack — top touchline, between home 22m and halfway. 3,4,6,5,7,8 in line; #1 in 5m channel; #9 receiver',
    category: 'lineout',
    actors: shiftX([...lo7AtkHomeTop, ...lo7AtkAwayTop], dx_7man),
  },
  {
    id: 'lineout-7man-atk-bot',
    name: '7-Man Atk ↓',
    description: '7-man attack — bottom touchline mirror, between home 22m and halfway',
    category: 'lineout',
    actors: shiftX(bot([...lo7AtkHomeTop, ...lo7AtkAwayTop]), dx_7man),
  },

  // ── Scrum ─────────────────────────────────────────────────────────────────────
  {
    id: 'scrum-atk-top',
    name: 'Scrum Atk ↑',
    description: 'Home put-in near top touchline — backs behind scrum; away backs 5m offside',
    category: 'scrum',
    actors: scrumAtkTop,
  },
  {
    id: 'scrum-atk-bot',
    name: 'Scrum Atk ↓',
    description: 'Home put-in near bottom touchline — mirrored',
    category: 'scrum',
    actors: bot(scrumAtkTop),
  },
  {
    id: 'scrum-def-top',
    name: 'Scrum Def ↑',
    description: 'Away put-in near top touchline — home backs 5m offside; away in attacking shape',
    category: 'scrum',
    actors: scrumDefTop,
  },
  {
    id: 'scrum-def-bot',
    name: 'Scrum Def ↓',
    description: 'Away put-in near bottom touchline — mirrored',
    category: 'scrum',
    actors: bot(scrumDefTop),
  },

  // ── Penalty ───────────────────────────────────────────────────────────────────
  {
    id: 'penalty-attack',
    name: 'Penalty Attack',
    description: 'Home attacking penalty on away 22 — staggered forward pods, backs wide, away 10m back',
    category: 'penalty',
    actors: penaltyAttack,
  },

  // ── Open play ─────────────────────────────────────────────────────────────────
  {
    id: 'open-play',
    name: 'Open Play',
    description: 'Home attacking breakdown near halfway — realistic ruck shape, away defensive line set',
    category: 'open',
    actors: openPlay,
  },
];

export const FORMATION_CATEGORY_LABELS: Record<string, string> = {
  kickoff: 'Kickoff',
  lineout: 'Lineout',
  scrum:   'Scrum',
  penalty: 'Penalty',
  restart: 'Restart',
  open:    'Open Play',
};
