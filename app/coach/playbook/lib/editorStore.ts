import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Actor, ActorType, Team, Tool, Scene, HistoryEntry, PlayArrow, ArrowDrawType, Zone, ZoneShape, FormationPreset, Play } from './types';

const MAX_HISTORY = 50;

export function makeScene(name: string): Scene {
  return { id: nanoid(), name, actors: [], arrows: [], zones: [], duration: 1500, notes: '' };
}

function deepCloneScenes(scenes: Scene[]): Scene[] {
  return JSON.parse(JSON.stringify(scenes));
}

function snapshot(scenes: Scene[], currentSceneId: string): HistoryEntry {
  return { scenes: deepCloneScenes(scenes), currentSceneId };
}

interface EditorStore {
  projectName: string;
  scenes: Scene[];
  currentSceneId: string;
  selectedActorId: string | null;
  selectedArrowId: string | null;
  selectedZoneId: string | null;
  selectedTool: Tool;
  activeZoneColor: string;
  showPlayerNames: boolean;
  past: HistoryEntry[];
  future: HistoryEntry[];
  isPlaying: boolean;
  showMovementArrows: boolean;
  orientation: 'landscape' | 'portrait';
  pitchScale: number;
  actorScale: number;
  transitionDuration: number;

  setProjectName: (name: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setShowMovementArrows: (show: boolean) => void;
  setShowPlayerNames: (show: boolean) => void;
  setOrientation: (o: 'landscape' | 'portrait') => void;
  setPitchScale: (s: number) => void;
  setActorScale: (s: number) => void;
  setTransitionDuration: (ms: number) => void;
  setActiveZoneColor: (color: string) => void;
  nextScene: () => boolean;

  addScene: () => void;
  duplicateScene: (sceneId: string) => void;
  deleteScene: (sceneId: string) => void;
  setCurrentScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => void;
  moveScene: (sceneId: string, dir: 'left' | 'right') => void;
  updateSceneDuration: (sceneId: string, duration: number) => void;
  updateSceneNotes: (sceneId: string, notes: string) => void;

  addActor: (type: ActorType, team: Team) => void;
  updateActorPosition: (actorId: string, normX: number, normY: number) => void;
  updateActorNumber: (actorId: string, number: number) => void;
  updateActorTeam: (actorId: string, team: Team) => void;
  updateActorName: (actorId: string, name: string) => void;
  deleteActor: (actorId: string) => void;
  toggleActorLock: (actorId: string) => void;
  clearSceneActors: () => void;
  applyFormation: (preset: FormationPreset) => void;

  addPlayArrow: (type: ArrowDrawType, fromX: number, fromY: number, toX: number, toY: number) => void;
  deletePlayArrow: (arrowId: string) => void;
  updateArrowType: (arrowId: string, type: ArrowDrawType) => void;
  updateArrowCp: (arrowId: string, cpX: number, cpY: number) => void;

  addZone: (shape: ZoneShape, normX: number, normY: number, normW: number, normH: number) => void;
  updateZonePosition: (zoneId: string, normX: number, normY: number) => void;
  updateZoneSize: (zoneId: string, normW: number, normH: number) => void;
  updateZoneLabel: (zoneId: string, label: string) => void;
  deleteZone: (zoneId: string) => void;

  setSelectedActor: (actorId: string | null) => void;
  setSelectedArrow: (arrowId: string | null) => void;
  setSelectedZone: (zoneId: string | null) => void;
  setSelectedTool: (tool: Tool) => void;

  undo: () => void;
  redo: () => void;

  loadPlay: (play: Play) => void;
  getPlaySnapshot: () => Pick<Play, 'name' | 'scenes'>;
}

const first = makeScene('Scene 1');

const useEditorStore = create<EditorStore>((set, get) => ({
  projectName: 'My Rugby Play',
  scenes: [first],
  currentSceneId: first.id,
  selectedActorId: null,
  selectedArrowId: null,
  selectedZoneId: null,
  selectedTool: 'select',
  activeZoneColor: 'rgba(59,130,246,0.9)',
  showPlayerNames: false,
  past: [],
  future: [],
  isPlaying: false,
  showMovementArrows: true,
  orientation: 'landscape',
  pitchScale: 0.92,
  actorScale: 1.0,
  transitionDuration: 500,

  setProjectName: (name) => set({ projectName: name }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setShowMovementArrows: (show) => set({ showMovementArrows: show }),
  setShowPlayerNames: (show) => set({ showPlayerNames: show }),
  setOrientation: (o) => set({ orientation: o }),
  setPitchScale: (s) => set({ pitchScale: s }),
  setActorScale: (s) => set({ actorScale: s }),
  setTransitionDuration: (ms) => set({ transitionDuration: ms }),
  setActiveZoneColor: (color) => set({ activeZoneColor: color }),
  nextScene: () => {
    const s = get();
    const idx = s.scenes.findIndex((sc) => sc.id === s.currentSceneId);
    if (idx < s.scenes.length - 1) {
      set({ currentSceneId: s.scenes[idx + 1].id });
      return true;
    }
    set({ isPlaying: false });
    return false;
  },

  addScene: () =>
    set((s) => {
      const scene = makeScene(`Scene ${s.scenes.length + 1}`);
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
        future: [],
        scenes: [...s.scenes, scene],
        currentSceneId: scene.id,
      };
    }),

  duplicateScene: (sceneId) =>
    set((s) => {
      const src = s.scenes.find((sc) => sc.id === sceneId);
      if (!src) return s;
      const idx = s.scenes.indexOf(src);
      const copy: Scene = {
        ...JSON.parse(JSON.stringify(src)),
        id: nanoid(),
        name: `${src.name} (copy)`,
        arrows: src.arrows.map((a) => ({ ...a, id: nanoid() })),
        zones: (src.zones ?? []).map((z) => ({ ...z, id: nanoid() })),
      };
      const next = [...s.scenes];
      next.splice(idx + 1, 0, copy);
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
        future: [],
        scenes: next,
        currentSceneId: copy.id,
      };
    }),

  deleteScene: (sceneId) =>
    set((s) => {
      if (s.scenes.length === 1) return s;
      const next = s.scenes.filter((sc) => sc.id !== sceneId);
      const wasCurrent = s.currentSceneId === sceneId;
      let nextId = s.currentSceneId;
      if (wasCurrent) {
        const idx = s.scenes.findIndex((sc) => sc.id === sceneId);
        nextId = next[Math.max(0, idx - 1)].id;
      }
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
        future: [],
        scenes: next,
        currentSceneId: nextId,
        selectedActorId: null,
      };
    }),

  setCurrentScene: (sceneId) => set({ currentSceneId: sceneId, selectedActorId: null }),

  renameScene: (sceneId, name) =>
    set((s) => ({
      scenes: s.scenes.map((sc) => (sc.id === sceneId ? { ...sc, name } : sc)),
    })),

  updateSceneDuration: (sceneId, duration) =>
    set((s) => ({
      scenes: s.scenes.map((sc) => (sc.id === sceneId ? { ...sc, duration } : sc)),
    })),

  updateSceneNotes: (sceneId, notes) =>
    set((s) => ({
      scenes: s.scenes.map((sc) => (sc.id === sceneId ? { ...sc, notes } : sc)),
    })),

  moveScene: (sceneId, dir) =>
    set((s) => {
      const idx = s.scenes.findIndex((sc) => sc.id === sceneId);
      if (idx === -1) return s;
      const next = [...s.scenes];
      if (dir === 'left' && idx > 0) {
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      } else if (dir === 'right' && idx < next.length - 1) {
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      } else {
        return s;
      }
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
        future: [],
        scenes: next,
      };
    }),

  addActor: (type, team) =>
    set((s) => {
      const scene = s.scenes.find((sc) => sc.id === s.currentSceneId);
      if (!scene) return s;
      const sameKind = scene.actors.filter((a) => a.type === type && a.team === team);
      const nextNum = sameKind.length === 0 ? 1 : Math.max(...sameKind.map((a) => a.number)) + 1;
      const actor: Actor = {
        id: nanoid(), type, team, number: nextNum,
        normX: type === 'player' && team === 'home' ? 0.25 + Math.random() * 0.1
             : type === 'player' && team === 'away' ? 0.65 + Math.random() * 0.1 : 0.5,
        normY: 0.2 + Math.random() * 0.6,
        locked: false,
      };
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
        future: [],
        scenes: s.scenes.map((sc) =>
          sc.id === s.currentSceneId ? { ...sc, actors: [...sc.actors, actor] } : sc
        ),
        selectedActorId: actor.id,
        selectedTool: 'select',
      };
    }),

  applyFormation: (preset) =>
    set((s) => {
      const actors: Actor[] = preset.actors.map((a) => ({ ...a, id: nanoid() }));
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
        future: [],
        scenes: s.scenes.map((sc) =>
          sc.id === s.currentSceneId ? { ...sc, actors } : sc
        ),
        selectedActorId: null,
        selectedTool: 'select',
      };
    }),

  updateActorPosition: (actorId, normX, normY) =>
    set((s) => ({
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, actors: sc.actors.map((a) => (a.id === actorId ? { ...a, normX, normY } : a)) }
          : sc
      ),
    })),

  updateActorNumber: (actorId, number) =>
    set((s) => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
      future: [],
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, actors: sc.actors.map((a) => (a.id === actorId ? { ...a, number } : a)) }
          : sc
      ),
    })),

  updateActorTeam: (actorId, team) =>
    set((s) => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
      future: [],
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, actors: sc.actors.map((a) => (a.id === actorId ? { ...a, team } : a)) }
          : sc
      ),
    })),

  updateActorName: (actorId, name) =>
    set((s) => ({
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, actors: sc.actors.map((a) => (a.id === actorId ? { ...a, name } : a)) }
          : sc
      ),
    })),

  deleteActor: (actorId) =>
    set((s) => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
      future: [],
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, actors: sc.actors.filter((a) => a.id !== actorId) }
          : sc
      ),
      selectedActorId: s.selectedActorId === actorId ? null : s.selectedActorId,
    })),

  toggleActorLock: (actorId) =>
    set((s) => ({
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, actors: sc.actors.map((a) => (a.id === actorId ? { ...a, locked: !a.locked } : a)) }
          : sc
      ),
    })),

  clearSceneActors: () =>
    set((s) => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
      future: [],
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId ? { ...sc, actors: [], arrows: [], zones: [] } : sc
      ),
      selectedActorId: null,
      selectedArrowId: null,
      selectedZoneId: null,
    })),

  addPlayArrow: (type, fromX, fromY, toX, toY) =>
    set((s) => {
      const arrowColors: Record<string, string> = {
        run: 'rgba(255,255,255,0.85)', pass: 'rgba(255,255,255,0.7)', kick: 'rgba(251,191,36,0.9)',
      };
      const arrow: PlayArrow = { id: nanoid(), type, fromX, fromY, toX, toY, color: arrowColors[type] };
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
        future: [],
        scenes: s.scenes.map((sc) =>
          sc.id === s.currentSceneId ? { ...sc, arrows: [...sc.arrows, arrow] } : sc
        ),
        selectedArrowId: arrow.id,
        selectedActorId: null,
        selectedZoneId: null,
        selectedTool: 'select',
      };
    }),

  deletePlayArrow: (arrowId) =>
    set((s) => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
      future: [],
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, arrows: sc.arrows.filter((a) => a.id !== arrowId) }
          : sc
      ),
      selectedArrowId: s.selectedArrowId === arrowId ? null : s.selectedArrowId,
    })),

  updateArrowType: (arrowId, type) => {
    const arrowColors: Record<string, string> = {
      run: 'rgba(255,255,255,0.85)', pass: 'rgba(255,255,255,0.7)', kick: 'rgba(251,191,36,0.9)',
    };
    set((s) => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
      future: [],
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, arrows: sc.arrows.map((a) => (a.id === arrowId ? { ...a, type, color: arrowColors[type] } : a)) }
          : sc
      ),
    }));
  },

  updateArrowCp: (arrowId, cpX, cpY) =>
    set((s) => ({
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, arrows: sc.arrows.map((a) => (a.id === arrowId ? { ...a, cpX, cpY } : a)) }
          : sc
      ),
    })),

  addZone: (shape, normX, normY, normW, normH) =>
    set((s) => {
      const zone: Zone = {
        id: nanoid(), shape, normX, normY, normW, normH,
        color: s.activeZoneColor, opacity: 0.28,
      };
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
        future: [],
        scenes: s.scenes.map((sc) =>
          sc.id === s.currentSceneId ? { ...sc, zones: [...(sc.zones ?? []), zone] } : sc
        ),
        selectedZoneId: zone.id,
        selectedActorId: null,
        selectedArrowId: null,
        selectedTool: 'select',
      };
    }),

  updateZonePosition: (zoneId, normX, normY) =>
    set((s) => ({
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, zones: (sc.zones ?? []).map((z) => (z.id === zoneId ? { ...z, normX, normY } : z)) }
          : sc
      ),
    })),

  updateZoneSize: (zoneId, normW, normH) =>
    set((s) => ({
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, zones: (sc.zones ?? []).map((z) => (z.id === zoneId ? { ...z, normW, normH } : z)) }
          : sc
      ),
    })),

  updateZoneLabel: (zoneId, label) =>
    set((s) => ({
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, zones: (sc.zones ?? []).map((z) => (z.id === zoneId ? { ...z, label } : z)) }
          : sc
      ),
    })),

  deleteZone: (zoneId) =>
    set((s) => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), snapshot(s.scenes, s.currentSceneId)],
      future: [],
      scenes: s.scenes.map((sc) =>
        sc.id === s.currentSceneId
          ? { ...sc, zones: (sc.zones ?? []).filter((z) => z.id !== zoneId) }
          : sc
      ),
      selectedZoneId: s.selectedZoneId === zoneId ? null : s.selectedZoneId,
    })),

  setSelectedActor: (actorId) => set({ selectedActorId: actorId, selectedArrowId: null, selectedZoneId: null }),
  setSelectedArrow: (arrowId) => set({ selectedArrowId: arrowId, selectedActorId: null, selectedZoneId: null }),
  setSelectedZone: (zoneId) => set({ selectedZoneId: zoneId, selectedActorId: null, selectedArrowId: null }),
  setSelectedTool: (tool) => set({ selectedTool: tool, selectedActorId: null, selectedArrowId: null, selectedZoneId: null }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        future: [snapshot(s.scenes, s.currentSceneId), ...s.future],
        scenes: prev.scenes,
        currentSceneId: prev.currentSceneId,
        selectedActorId: null, selectedArrowId: null, selectedZoneId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        past: [...s.past, snapshot(s.scenes, s.currentSceneId)],
        future: s.future.slice(1),
        scenes: next.scenes,
        currentSceneId: next.currentSceneId,
        selectedActorId: null, selectedArrowId: null, selectedZoneId: null,
      };
    }),

  loadPlay: (play) => {
    const scenes: Scene[] = play.scenes.length > 0
      ? play.scenes.map((sc) => ({ notes: '', ...sc, arrows: sc.arrows ?? [], zones: sc.zones ?? [] }))
      : [makeScene('Scene 1')];
    set({
      projectName: play.name,
      scenes,
      currentSceneId: scenes[0].id,
      past: [],
      future: [],
      selectedActorId: null,
      selectedArrowId: null,
      selectedZoneId: null,
    });
  },

  getPlaySnapshot: () => {
    const s = get();
    return { name: s.projectName, scenes: s.scenes };
  },
}));

export default useEditorStore;
