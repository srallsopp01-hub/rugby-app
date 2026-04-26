import type { PageHelpProps } from "@/app/components/PageHelp";

export const PLAYER_PAGE_HELP: Record<string, PageHelpProps> = {
  "/player": {
    title: "Player Home",
    description: "Your personal performance hub. See your latest match grade, coaching feedback, and areas to focus on.",
    steps: [
      { title: "Select your name", body: "Use the Player Picker at the top of the sidebar to select yourself. Your stats and feedback are tied to your name in the squad." },
      { title: "Check your latest grade", body: "Your grade for the most recent match is shown at the top — Dominant, Competitive, Below, or Poor. The trend arrow shows whether you improved or dropped from last match." },
      { title: "Read your coaching plan", body: "The coaching plan is generated from your metric grades. It's specific to your performance in the latest match." },
      { title: "Check Focus Areas", body: "Chips at the bottom highlight the specific metrics where you are currently below the target threshold." },
    ],
    tips: [
      "Your grade is based on four metrics: tackle %, tackles per minute, carries per minute, and work rate. Improve any of these to lift your grade.",
      "Read the coaching plan carefully — each point is based on your actual stats from the match.",
      "Check your Performance page for a full trend view across multiple matches.",
    ],
  },

  "/player/performance": {
    title: "Performance Trends",
    description: "Track how your key metrics are moving across multiple matches. Spot trends, identify consistency, and measure improvement.",
    steps: [
      { title: "Read the charts", body: "Each chart shows one of your key metrics — tackle %, carries per minute, work rate — across all matches you've featured in." },
      { title: "Compare to team average", body: "The dotted line on each chart shows the team average for that metric. Aim to be consistently above it." },
      { title: "Check Season Bests", body: "The season best panel highlights your highest single-match value for each metric. Use these as personal targets." },
      { title: "Look at your grade trend", body: "The grade chart shows your overall grade across matches. Consistency in the Competitive or Dominant band is the goal." },
    ],
    tips: [
      "One bad match doesn't define a season — look for the overall direction of your trend line.",
      "If your tackle % is strong but carries per minute is weak, you may be doing the defensive work but not getting enough ball in hand.",
      "Share this page with your coach — it gives specific, data-backed talking points for 1-on-1s.",
    ],
  },

  "/player/games": {
    title: "Match History",
    description: "View your complete match history with full stats for every game you've featured in.",
    steps: [
      { title: "Browse your matches", body: "All matches where your name appears are listed here, most recent first." },
      { title: "Click a match for details", body: "Select any match to see your full stat breakdown — tackles, carries, minutes, per-minute rates, and coaching comment." },
      { title: "Review your coaching comment", body: "Each match includes an auto-generated comment from your coach based on your metric grades." },
    ],
    tips: [
      "Look for patterns — do you perform better in certain positions, against certain opponents, or at different points in the season?",
      "If a match grade seems low, check your recorded minutes — grades are per-minute stats and short minutes can affect them.",
    ],
  },

  "/player/compare": {
    title: "Match Comparison",
    description: "Compare your performance in two different matches to see exactly what changed.",
    steps: [
      { title: "Select two matches", body: "Use the dropdowns to choose any two matches from your history." },
      { title: "Compare your metrics", body: "Side-by-side stats show tackle %, carries per minute, tackles per minute, and work rate for both matches." },
      { title: "Identify what changed", body: "Look for the biggest differences — a drop in tackles/min often means less defensive involvement; a drop in carries/min may reflect limited ball in hand." },
    ],
    tips: [
      "Compare a strong match to a weaker one to understand what was different — position, minutes, opponent, or match context.",
      "Bring this comparison to your next 1-on-1 with your coach as a starting point for the conversation.",
    ],
  },

  "/player/team-analytics": {
    title: "Team Analytics",
    description: "See the team-level stats for the current match — how the side performed as a unit.",
    steps: [
      { title: "Check team KPIs", body: "Tackle rate, lineout %, scrum %, and try differential show how the team performed as a unit." },
      { title: "See where you rank", body: "The top performers list shows who led in tackles and carries this match." },
      { title: "View unit performance", body: "Forwards and backs are broken down by unit — see how your unit's tackle rate and carry volume compared to others." },
    ],
    tips: [
      "Team performance gives context to your own stats — a high team tackle rate means you're part of a collective defensive effort.",
      "Use this page to understand the team's strengths and where you can contribute more.",
    ],
  },

  "/player/review": {
    title: "Film Review",
    description: "Watch match clips and read coaching notes linked to your performance.",
    steps: [
      { title: "Select a match", body: "Choose a match from the list to load its review clips." },
      { title: "Watch and learn", body: "Each clip is tagged with context. Watch carefully — your coach has flagged these moments for a reason." },
      { title: "Read the coaching notes", body: "Notes appear alongside each clip. These are specific, actionable observations from your coach." },
    ],
    tips: [
      "Pay attention to clips where you missed a tackle or were caught in poor position — these are learning moments.",
      "If you disagree with a note, bring it up with your coach — it's a conversation starter, not a verdict.",
    ],
  },
};
