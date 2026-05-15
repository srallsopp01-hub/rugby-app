import { nanoid } from 'nanoid';
import type { Play } from './types';
import { makeScene } from './editorStore';
import { ACTIVE_TEAM_CHANGED_EVENT, ACTIVE_TEAM_ID_KEY } from '@/lib/teamContext';

export const PLAYS_CHANGED_EVENT = 'playbook-plays-changed';

function storeKey(teamId: string): string {
  return `fynlwhistle-playbook-plays-${teamId}`;
}

function emit(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PLAYS_CHANGED_EVENT));
  }
}

export function getPlays(teamId: string): Play[] {
  if (!teamId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storeKey(teamId));
    if (!raw) return [];
    return (JSON.parse(raw) as { plays: Play[] }).plays ?? [];
  } catch {
    return [];
  }
}

export function getPlay(teamId: string, playId: string): Play | undefined {
  return getPlays(teamId).find((p) => p.id === playId);
}

export function savePlay(teamId: string, play: Play): void {
  if (!teamId || typeof window === 'undefined') return;
  const plays = getPlays(teamId);
  const idx = plays.findIndex((p) => p.id === play.id);
  const updated = idx >= 0 ? plays.map((p) => (p.id === play.id ? play : p)) : [...plays, play];
  localStorage.setItem(storeKey(teamId), JSON.stringify({ plays: updated }));
  emit();
}

export function deletePlay(teamId: string, playId: string): void {
  if (!teamId || typeof window === 'undefined') return;
  const plays = getPlays(teamId).filter((p) => p.id !== playId);
  localStorage.setItem(storeKey(teamId), JSON.stringify({ plays }));
  emit();
}

export function createPlay(teamId: string, name: string): Play {
  const now = new Date().toISOString();
  const play: Play = {
    id: nanoid(),
    name,
    teamId,
    createdAt: now,
    updatedAt: now,
    scenes: [makeScene('Scene 1')],
  };
  savePlay(teamId, play);
  return play;
}

// Subscribes to both play writes and active-team changes so callers
// (e.g. the plays index) automatically refresh when the team switches.
export function subscribePlaysChanged(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PLAYS_CHANGED_EVENT, cb);
  window.addEventListener(ACTIVE_TEAM_CHANGED_EVENT, cb);
  return () => {
    window.removeEventListener(PLAYS_CHANGED_EVENT, cb);
    window.removeEventListener(ACTIVE_TEAM_CHANGED_EVENT, cb);
  };
}

// Synchronous helper — reads the active team ID from localStorage.
export function getActiveTeamId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? '';
}
