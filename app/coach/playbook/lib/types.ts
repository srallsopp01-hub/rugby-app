export type ActorType = 'player' | 'ball' | 'cone';
export type Team = 'home' | 'away' | 'neutral';
export type Tool =
  | 'select'
  | 'player-home'
  | 'player-away'
  | 'ball'
  | 'cone'
  | 'arrow-run'
  | 'arrow-pass'
  | 'arrow-kick'
  | 'zone';

export type ArrowDrawType = 'run' | 'pass' | 'kick';
export type ZoneShape = 'rect' | 'ellipse';
export type FormationCategory = 'kickoff' | 'lineout' | 'scrum' | 'penalty' | 'restart' | 'open';

export interface Actor {
  id: string;
  type: ActorType;
  team: Team;
  number: number;
  normX: number; // 0-1, relative to pitch length
  normY: number; // 0-1, relative to pitch width
  locked: boolean;
  name?: string;
}

export interface PlayArrow {
  id: string;
  type: ArrowDrawType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  cpX?: number;
  cpY?: number;
  color: string;
}

export interface Zone {
  id: string;
  shape: ZoneShape;
  normX: number; // top-left corner (rect) or center (ellipse)
  normY: number;
  normW: number;
  normH: number;
  color: string;
  label?: string;
  opacity: number; // 0–1, default 0.28
}

export interface Scene {
  id: string;
  name: string;
  actors: Actor[];
  arrows: PlayArrow[];
  zones: Zone[];
  duration: number; // ms
  notes?: string;
}

export interface HistoryEntry {
  scenes: Scene[];
  currentSceneId: string;
}

export interface PitchLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FormationPreset {
  id: string;
  name: string;
  description: string;
  category: FormationCategory;
  actors: Omit<Actor, 'id'>[];
}

export interface Play {
  id: string;
  name: string;
  teamId: string;             // scopes the play to a team
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
  scenes: Scene[];
}
