import type { PageHelpProps } from "@/app/components/PageHelp";

export const COACH_PAGE_HELP: Record<string, PageHelpProps> = {
  "/coach": {
    title: "Coach Dashboard",
    description: "Your coaching hub — fixtures, training, match insights, and your AI assistant coach in one place.",
    steps: [
      { title: "Add fixtures first", body: "Go to Team Setup to add your upcoming fixtures. Once fixtures exist, the Season at a Glance strip and Next Fixture card appear on this dashboard." },
      { title: "Check your next fixture", body: "The Next Fixture card shows your upcoming game, player availability dots, and a summary of how many players have confirmed. Players set their availability from the Player platform." },
      { title: "Log training sessions", body: "After a training session (today or yesterday), a Post-session check-in card appears. Rate the session, pick focus areas, and note any players — this feeds the AI assistant's context." },
      { title: "Use the AI assistant", body: "The 'Focus for next game' panel gives a rules-based recommendation from your last match data. The AI chat at the bottom lets you ask anything — it has your team context loaded." },
    ],
    tips: [
      "Set up training sessions in Team Setup so they appear in the Training This Week section each week.",
      "The Players to Watch section pulls from your last saved match — run Insights to see the full breakdown.",
      "The AI assistant's recommendations improve the more match and session data you log.",
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
      "Keyboard shortcuts: Space marks clip start/end, K toggles play/pause, J rewinds, L speeds up (to 4x), and ←/→ step one frame when paused. Use the fullscreen button (top-right of the video) for film-room playback.",
    ],
  },

  "/coach/saved-matches": {
    title: "Saved Matches",
    description: "Manage all your stored matches. Open, rename, export, or delete past sessions.",
    steps: [
      { title: "Browse your match history", body: "All saved matches are listed here with title, opponent, and date. Click any to open it in Insights." },
      { title: "Export individual matches", body: "Click the export icon to download a single match as an Excel report." },
      { title: "Delete old matches", body: "Delete matches you no longer need. This removes the local record and asks cloud storage to remove the account copy too." },
    ],
    tips: [
      "Export important matches to Excel before major cleanup.",
      "Cloud sync covers match metadata, tags, and stored video paths when cloud video upload is available.",
      "Give each match a clear title at capture time (e.g. 'Round 5 vs Easts') — it makes them easy to find here.",
    ],
  },

  "/coach/team": {
    title: "Team Access",
    description: "Share your join link so players can claim their squad slot directly — no approval needed.",
    steps: [
      { title: "Copy your join link", body: "Share it in your team WhatsApp group or anywhere players will see it. Anyone who opens it can pick their squad slot and join immediately." },
      { title: "Send a personal link", body: "For a specific player, click 'Send invite to…' next to their squad slot — enter their email and a pre-filled link with their slot locked is copied to your clipboard." },
      { title: "Players join directly", body: "When a player taps the link, they sign up or sign in, pick their slot, and are added automatically. No approval step required." },
      { title: "Pending requests", body: "If a player couldn't find themselves on the squad list, they can notify you. An amber card appears on your home page. Use 'Add to squad' to create their profile and accept them." },
    ],
    tips: [
      "Revoke a member's access from the Team members list at any time. Their squad player slot becomes available again.",
      "Use 'Revoke & regenerate' if you've shared the join link too widely — old links stop working immediately.",
    ],
  },

  "/coach/clips": {
    title: "Clips",
    description: "Upload and manage external source videos for analysis — opposition footage, training clips, and more.",
    steps: [
      {
        title: "Upload a source video",
        body: "Go to the Sources tab and click 'Upload source video'. Give it a title, an optional opponent name, and any context notes. The file is stored securely in the cloud — only your team can access it.",
      },
      {
        title: "Play back a source",
        body: "Click any source card to open the preview modal. Use skip buttons to jump forward and back, and fullscreen for a better view.",
      },
      {
        title: "Delete a source",
        body: "Click Delete on any card, confirm the prompt, and the file is removed from both cloud storage and your team's list.",
      },
      {
        title: "Library and Highlights (coming soon)",
        body: "The Library tab will let you cut specific moments from source videos into a searchable clip library. The Highlights tab will let you stitch clips together into shareable reels for team meetings.",
      },
    ],
    tips: [
      "Source videos are head-coach-only for upload and delete. Assistant coaches and players can view sources but cannot add or remove them.",
      "Each team can store up to 20 source videos, with a 5 GB per-file limit.",
      "Adding a short context note to each source (e.g. 'their lineout plays from R4') makes it much easier to find the right footage when cutting clips later.",
    ],
  },

  "/coach/playbook": {
    title: "Playbook",
    description: "Build tactical animations to walk your squad through phases of play — scene by scene.",
    steps: [
      { title: "Create a play", body: "Click New play to open the editor with a blank scene. Name it by clicking the title in the top bar." },
      { title: "Add actors to the pitch", body: "Select a formation preset from the left sidebar to place all 15 players at once, or drag individual Home, Away, and Ball actors onto the pitch." },
      { title: "Duplicate scenes to build phases", body: "Each phase of play is a scene. Hover a scene card in the footer and click ⧉ to duplicate it (positions carry over), then move actors to show the next movement." },
      { title: "Preview with Play", body: "Click Play (or press Space) in the top bar to animate through all scenes automatically." },
    ],
    tips: [
      "Rename a play by clicking its name in the top bar — changes save automatically.",
      "Use Ctrl+Z / Ctrl+Shift+Z to undo or redo any change on the canvas.",
      "Export as PNG (top-right Export button) to share a static image of the current scene.",
    ],
  },

  "/coach/playbook/[playId]": {
    title: "Playbook Editor",
    description: "Drag actors, draw movement arrows, and animate phases of play for your team's tactical sessions.",
    steps: [
      { title: "Place actors", body: "Pick a formation from the left sidebar to place all 15 home players, or drag Home/Away/Ball actors onto the pitch individually." },
      { title: "Draw movement arrows", body: "Select the Arrow tool (or press A), then click and drag on the pitch to draw a run arrow. Change type (run/pass/kick) in the right sidebar after drawing." },
      { title: "Add the next phase", body: "Hover any scene card in the footer rail and click ⧉ Duplicate. Actors carry over — just reposition them for the next moment." },
      { title: "Animate", body: "Press Space or click Play to step through all scenes. Press Stop to return to editing." },
    ],
    tips: [
      "Keyboard: Space = play/stop, Ctrl+Z = undo, Delete = remove selected actor or arrow.",
      "Duplicate from the current scene rather than adding a blank scene — it saves time repositioning players.",
      "Scene duration (shown in the right sidebar) controls how long each phase displays during playback.",
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
      "Export before clearing local data if you need an offline backup.",
      "If the app feels slow, clearing old matches in Saved Matches (rather than a full reset) is the safer option.",
    ],
  },
};
