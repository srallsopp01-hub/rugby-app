'use client';

import { useState } from 'react';
import { FORMATION_CATEGORY_LABELS } from '../lib/formations';
import type { FormationCategory } from '../lib/types';

const CATEGORY_ORDER: FormationCategory[] = ['kickoff', 'lineout', 'scrum', 'penalty', 'open', 'custom'];

interface Props {
  mode: 'create' | 'rename';
  initialName?: string;
  initialCategory?: FormationCategory;
  initialDirection?: '↑' | '↓';
  onSave: (name: string, category: FormationCategory, direction?: '↑' | '↓') => void;
  onClose: () => void;
}

export default function CreatePresetModal({
  mode,
  initialName = '',
  initialCategory = 'custom',
  initialDirection,
  onSave,
  onClose,
}: Props) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<FormationCategory>(initialCategory);
  const [direction, setDirection] = useState<'↑' | '↓' | undefined>(initialDirection);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, category, direction);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-foreground-strong mb-4">
          {mode === 'create' ? 'Save formation as preset' : 'Rename preset'}
        </h2>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Short lineout 5-man"
              className="w-full px-3 py-2 rounded-lg bg-panel-2 border border-border text-sm text-foreground placeholder:text-muted-2 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FormationCategory)}
              className="w-full px-3 py-2 rounded-lg bg-panel-2 border border-border text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            >
              {CATEGORY_ORDER.map((cat) => (
                <option key={cat} value={cat}>
                  {FORMATION_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Direction (optional) */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Direction <span className="text-muted-2 font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              {(['↑', '↓'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(direction === d ? undefined : d)}
                  className={`flex-1 py-1.5 rounded-lg text-sm border transition-all ${
                    direction === d
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-border bg-panel-2 text-muted hover:text-foreground hover:border-border-light'
                  }`}
                >
                  {d}
                </button>
              ))}
              {direction && (
                <button
                  type="button"
                  onClick={() => setDirection(undefined)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-border bg-panel-2 text-muted-2 hover:text-muted transition-colors"
                  title="Clear direction"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium border border-border text-muted hover:text-foreground hover:bg-panel-2 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mode === 'create' ? 'Save preset' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  );
}
