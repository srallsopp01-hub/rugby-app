import { nanoid } from 'nanoid';
import type { FormationCategory, CustomFormationPreset } from './types';
import type { Actor } from './types';

const CUSTOM_PRESETS_KEY = 'fynlwhistle-playbook-custom-presets';
const HIDDEN_PRESETS_KEY = 'fynlwhistle-playbook-hidden-presets';
const PRESETS_CHANGED_EVENT = 'fynlwhistle-playbook-presets-changed';

function dispatch() {
  window.dispatchEvent(new CustomEvent(PRESETS_CHANGED_EVENT));
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getCustomPresets(): CustomFormationPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_PRESETS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function getHiddenBuiltinIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_PRESETS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

// ─── Writes ───────────────────────────────────────────────────────────────────

function writeCustomPresets(presets: CustomFormationPreset[]) {
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
  dispatch();
}

function writeHiddenIds(ids: string[]) {
  localStorage.setItem(HIDDEN_PRESETS_KEY, JSON.stringify(ids));
  dispatch();
}

// ─── Custom preset CRUD ───────────────────────────────────────────────────────

export function createCustomPreset(
  name: string,
  category: FormationCategory,
  actors: Omit<Actor, 'id'>[],
  direction?: '↑' | '↓',
): CustomFormationPreset {
  const presets = getCustomPresets();
  const catPresets = presets.filter((p) => p.category === category);
  const maxOrder = catPresets.length > 0 ? Math.max(...catPresets.map((p) => p.order)) : -1;
  const now = new Date().toISOString();
  const preset: CustomFormationPreset = {
    id: nanoid(),
    name,
    description: name,
    category,
    actors,
    isCustom: true,
    direction,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };
  writeCustomPresets([...presets, preset]);
  return preset;
}

export function saveCustomPreset(preset: CustomFormationPreset): void {
  const presets = getCustomPresets();
  const idx = presets.findIndex((p) => p.id === preset.id);
  if (idx === -1) {
    writeCustomPresets([...presets, preset]);
  } else {
    const next = [...presets];
    next[idx] = preset;
    writeCustomPresets(next);
  }
}

export function deleteCustomPreset(id: string): void {
  writeCustomPresets(getCustomPresets().filter((p) => p.id !== id));
}

export function renameCustomPreset(id: string, name: string): void {
  const presets = getCustomPresets().map((p) =>
    p.id === id ? { ...p, name, description: name, updatedAt: new Date().toISOString() } : p
  );
  writeCustomPresets(presets);
}

export function updateCustomPreset(
  id: string,
  patch: { name?: string; category?: FormationCategory; direction?: '↑' | '↓' | undefined },
): void {
  const presets = getCustomPresets();
  const preset = presets.find((p) => p.id === id);
  if (!preset) return;

  const categoryChanged = patch.category && patch.category !== preset.category;
  let newOrder = preset.order;
  if (categoryChanged) {
    const catPresets = presets.filter((p) => p.category === patch.category);
    newOrder = catPresets.length > 0 ? Math.max(...catPresets.map((p) => p.order)) + 1 : 0;
  }

  const updated = {
    ...preset,
    ...patch,
    order: newOrder,
    updatedAt: new Date().toISOString(),
  };
  writeCustomPresets(presets.map((p) => (p.id === id ? updated : p)));
}

export function duplicateCustomPreset(id: string): CustomFormationPreset | null {
  const presets = getCustomPresets();
  const src = presets.find((p) => p.id === id);
  if (!src) return null;
  const catPresets = presets.filter((p) => p.category === src.category);
  const maxOrder = catPresets.length > 0 ? Math.max(...catPresets.map((p) => p.order)) : -1;
  const now = new Date().toISOString();
  const copy: CustomFormationPreset = {
    ...JSON.parse(JSON.stringify(src)),
    id: nanoid(),
    name: `${src.name} (copy)`,
    description: `${src.name} (copy)`,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };
  writeCustomPresets([...presets, copy]);
  return copy;
}

export function reorderCustomPresets(category: FormationCategory, orderedIds: string[]): void {
  const presets = getCustomPresets();
  const next = presets.map((p) => {
    if (p.category !== category) return p;
    const idx = orderedIds.indexOf(p.id);
    return idx === -1 ? p : { ...p, order: idx };
  });
  writeCustomPresets(next);
}

// ─── Built-in visibility ──────────────────────────────────────────────────────

export function hideBuiltinPreset(id: string): void {
  const hidden = getHiddenBuiltinIds();
  if (!hidden.includes(id)) {
    writeHiddenIds([...hidden, id]);
  }
}

export function restoreAllBuiltins(): void {
  writeHiddenIds([]);
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export function subscribePresetsChanged(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(PRESETS_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(PRESETS_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
