export type PlayerAction = "tackle" | "missed tackle" | "carry" | "turnover";
export type SetPieceType = "lineout" | "scrum";
export type SetPieceSide = "Easts" | "Opposition";
export type LineoutResult = "Won" | "Lost" | "Penalty" | "Not Straight" | "Steal";
export type ScrumResult = "Won" | "Lost" | "Penalty For" | "Penalty Against" | "Free Kick";
export type TeamEventType = "penalty for" | "penalty conceded" | "try scored" | "try conceded";
export type MilestoneType = "kick off" | "half time" | "second half kick off" | "full time";

export type EventCategory = "player" | "set-piece" | "team" | "milestone" | "substitution";

export type EventItem = {
  id: number;
  timestamp: number;
  text: string;
  rawText?: string;
  isPending?: boolean;
  category?: EventCategory;
  playerName?: string;
  secondPlayerName?: string;
  playerAction?: PlayerAction;
  setPieceType?: SetPieceType;
  setPieceSide?: SetPieceSide;
  lineoutResult?: LineoutResult;
  scrumResult?: ScrumResult;
  notes?: string;
  teamEventType?: TeamEventType;
  milestoneType?: MilestoneType;
  substitutionPlayerOn?: string;
  substitutionPlayerOff?: string;
  substitutionPosition?: string;
};

export type PlayerStats = {
  tackles: number;
  missed: number;
  carries: number;
  turnovers: number;
};

export type ParsedTag = {
  normalized_text: string;
  player: string | null;
  action: "tackle" | "missed tackle" | "carry" | "turnover" | "unknown";
  confidence: "high" | "medium" | "low";
  should_keep: boolean;
  candidate_players: string[];
};

export type VoiceResponse = {
  text?: string;
  rawText?: string;
  error?: string;
  parsed?: ParsedTag | null;
};

export type PendingResolution = {
  rawText: string;
  guessedText: string;
  timestamp: number;
  action: PlayerAction;
  pendingEventId?: number;
};

export type ReviewItem = {
  id: number;
  rawText: string;
  guessedText: string;
  timestamp: number;
  selectedPlayer: string;
  secondPlayerName?: string;
  selectedAction: "" | PlayerAction;
};

export type RosterRow = {
  number: number;
  name: string;
  position: string;
  minutes: number | "";
};

export type Grade = "Dominant" | "Competitive" | "Below" | "Poor";

export type ReportRow = {
  number: number;
  name: string;
  position: string;
  unit: string;
  minutes: number;
  tackles: number;
  missed: number;
  carries: number;
  turnovers: number;
  involvements: number;
  tacklePct: number;
  tacklesPerMin: number;
  carriesPerMin: number;
  involvementsPerMin: number;
  tacklePctGrade: Grade;
  tacklesPerMinGrade: Grade;
  carriesPerMinGrade: Grade;
  workRateGrade: Grade;
  overallGrade: Grade;
  coachComment: string;
};

export type UnitSummaryRow = {
  unit: string;
  players: number;
  avgTacklesPerMin: number;
  avgCarriesPerMin: number;
  avgInvolvementsPerMin: number;
};

export type VideoAnnotation = {
  id: number;
  type: "arrow" | "circle" | "highlight";
  timestamp: number;
  points: { x: number; y: number }[];
  color?: string;
};

export type ClipAnnotation = {
  id: number;
  startTime: number;
  endTime: number;
  label: string;
  category?: string;
  annotations?: VideoAnnotation[];
};
