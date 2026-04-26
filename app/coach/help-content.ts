import type { PageHelpProps } from "@/app/components/PageHelp";

export const COACH_PAGE_HELP: Record<string, PageHelpProps> = {
  "/coach": {
    title: "Coach Dashboard",
    description: "Your home base. Get a quick read on your squad status and jump to any section of the platform.",
    steps: [
      { title: "Check Season at a Glance", body: "If you have 2+ saved matches, a summary strip shows your season-wide tackle rate, match count, and try differential at a glance." },
      { title: "Use quick links to navigate", body: "Each card links directly to a key section — Capture, Insights, Team Setup, Review, and more. Hover to see a description of what each section does." },
      { title: "Start your workflow here", body: "A typical match day goes: Team Setup → Capture (during the match) → Insights (after) → Review (video). Return here between sessions." },
    ],
    tips: [
      "Set up your squad in Team Setup before your first match so voice recognition works correctly.",
      "Save matches regularly in Capture — data is stored locally and not backed up automatically.",
      "Use Settings > Export after every session to create an Excel backup of your data.",
    ],
  },

  "/coach/team-setup": {
    title: "Team Setup",
    description: "Configure your squad so the app can recognise players by voice, assign them positions, and display their data correctly.",
    steps: [
      { title: "Set team and coach name", body: "Your team name appears throughout the app. The coach name is used in exports and reports." },
      { title: "Add every player in your squad", body: "For each player, enter their full name, preferred name (how they're usually called), nicknames, primary position, and status. The more detail, the better the voice recognition." },
      { title: "Add voice samples", body: "After adding a player, enter how you actually say their name when tagging (e.g. 'Willo' instead of 'James Williams'). These samples train the voice system." },
      { title: "Set KPI Targets", body: "Scroll to KPI Targets to adjust the thresholds for grades (Dominant/Competitive/Below) to match your team's standard. You can also add custom KPIs you want to track manually." },
    ],
    tips: [
      "Add all possible nicknames — the voice system will match any of them.",
      "Keep player status updated (active/injured/unavailable) — injured players are excluded from grade calculations.",
      "Custom KPI targets let you set your own benchmark for what counts as a 'good' tackle rate for your team.",
    ],
  },

  "/coach/capture": {
    title: "Match Capture",
    description: "Tag match events in real time by voice or tap. This is where raw match data is collected — accuracy here drives everything in Insights.",
    steps: [
      { title: "Load your squad and set minutes", body: "Before tagging, ensure your roster is loaded. Set each player's minutes after the match (or as substitutions happen) — grades are per-minute stats." },
      { title: "Tag events by voice", body: "Tap the mic and say '[Player] tackle', '[Player] missed tackle', '[Player] carry', or '[Player] turnover'. The app transcribes and links it to that player." },
      { title: "Tag set pieces and team events", body: "Use the Set Piece buttons to log lineouts, scrums, tries scored/conceded, and penalties. These drive the team KPIs in Insights." },
      { title: "Resolve any pending events", body: "Events with low confidence appear in the Review Queue. Resolve these before saving to ensure accurate stats." },
      { title: "Save the match", body: "Tap 'Save Match' when done. Give it a clear title and opponent name so you can find it easily in Saved Matches." },
    ],
    tips: [
      "Speak clearly and use the player's preferred name or nickname as set in Team Setup.",
      "Tag missed tackles immediately — they're easy to forget and heavily impact the grade.",
      "Log substitutions as they happen and update player minutes in the roster panel.",
      "Set piece tags (lineout won/lost, scrum won/lost) are optional but give you the Lineout % and Scrum % KPIs in Insights.",
    ],
  },

  "/coach/insights": {
    title: "Team Analytics",
    description: "Your full post-match performance report. KPI cards, player grades, set piece breakdown, and season trends — all in one place.",
    steps: [
      { title: "Check the Overview tab first", body: "The top KPI cards show Tackle %, Tries, Penalties, Lineout %, and Scrum % for the current match. Key Takeaways summarises the main positives and areas of concern." },
      { title: "Review Top Performers and Needs Attention", body: "These panels highlight the highest and lowest graded players. Click any player name to go to their full profile." },
      { title: "Drill into Game Analysis", body: "The Game Analysis tab has set piece detail, discipline breakdown, and a coaching comment summary." },
      { title: "Browse Players tab for individual grades", body: "Sort and filter by position group. Click a player to see their full stat breakdown." },
      { title: "Check Season Trends", body: "Once you have 2+ matches, the Trends tab shows how KPIs are moving across the season." },
    ],
    tips: [
      "Trend arrows (↑↓) on KPI cards compare this match to the previous one — watch for meaningful swings of 5%+.",
      "The Key Takeaways box uses your custom KPI targets — adjust these in Team Setup > KPI Targets.",
      "Export to Excel for sharing with management or for offline analysis.",
      "Grades are most meaningful when player minutes are accurately recorded in Capture.",
    ],
  },

  "/coach/players": {
    title: "Player Profiles",
    description: "Browse all players in your squad and view their full match history, grade trends, and per-metric breakdowns.",
    steps: [
      { title: "Select a player", body: "Use the search or scroll the list to find the player you want. Active players are shown at the top." },
      { title: "Review match history", body: "Each row shows the match, grade, tackle %, carries/min, and work rate for that player across all saved matches." },
      { title: "Look at trends over time", body: "The chart shows grade progression across matches. A consistent Competitive or Dominant trend means the player is performing reliably." },
      { title: "Read the coaching comment", body: "Each match row includes an auto-generated coaching comment based on the player's metric grades." },
    ],
    tips: [
      "Filter to a specific position group to compare players who play the same role.",
      "A player with high tackle % but low carries/min may be over-focused on defence — prompt them to get more ball.",
      "Use the player data to have specific, evidence-based conversations in 1-on-1 reviews.",
    ],
  },

  "/coach/compare": {
    title: "Match Comparison",
    description: "Select two saved matches side by side to see how team and player performance has changed.",
    steps: [
      { title: "Select two matches", body: "Use the dropdowns to choose any two saved matches from your history." },
      { title: "Compare team KPIs", body: "Side-by-side KPI cards show how tackle %, lineout %, tries, and penalties changed between matches." },
      { title: "Compare individual players", body: "The player table shows each player's grade and key metrics in both matches, highlighting improvements and regressions." },
    ],
    tips: [
      "Compare consecutive matches to track week-on-week improvement.",
      "Compare a strong match to a weak one to identify what was different — set piece quality, discipline, carry volume.",
    ],
  },

  "/coach/review": {
    title: "Film Review",
    description: "Watch match clips and add coaching notes linked to specific players or moments.",
    steps: [
      { title: "Load a match", body: "Select a saved match from the list. Any tagged review clips will appear in the queue." },
      { title: "Play clips", body: "Click a clip to load it in the video player. Use the annotation notes to record observations." },
      { title: "Add coaching notes", body: "Notes are saved with the match and can be viewed by players in the Player section." },
    ],
    tips: [
      "Use specific, actionable language in notes — 'arrive at the ruck 2 seconds faster' is more useful than 'needs to work harder'.",
      "Link notes to individual players so they see their own feedback in their player profile.",
    ],
  },

  "/coach/saved-matches": {
    title: "Saved Matches",
    description: "Manage all your stored matches. Open, rename, export, or delete past sessions.",
    steps: [
      { title: "Browse your match history", body: "All saved matches are listed here with title, opponent, and date. Click any to open it in Insights." },
      { title: "Export individual matches", body: "Click the export icon to download a single match as an Excel report." },
      { title: "Delete old matches", body: "To free up browser storage, delete matches you no longer need. This cannot be undone." },
    ],
    tips: [
      "Export matches to Excel regularly as a backup — all data is stored locally in your browser.",
      "If you switch devices or clear your browser cache, match data will be lost unless exported.",
      "Give each match a clear title at capture time (e.g. 'Round 5 vs Easts') — it makes them easy to find here.",
    ],
  },

  "/coach/settings": {
    title: "Settings & Data Management",
    description: "Export all your data, manage local storage, and reset the app if needed.",
    steps: [
      { title: "Export all data", body: "Download your full dataset as a single Excel file — includes all matches, player stats, and squad profile." },
      { title: "Check storage usage", body: "The storage panel shows how much browser space is being used by match data." },
      { title: "Factory reset", body: "If you need to start fresh, use the factory reset to clear all local data. This is permanent — export first." },
    ],
    tips: [
      "Export before clearing any data — there is no cloud backup.",
      "If the app feels slow, clearing old matches in Saved Matches (rather than a full reset) is the safer option.",
    ],
  },
};
