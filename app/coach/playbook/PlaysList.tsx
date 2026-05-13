'use client';

import { useSyncExternalStore, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clapperboard, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '@/app/components/EmptyState';
import { ACTIVE_TEAM_ID_KEY } from '@/lib/teamContext';
import SceneThumbnail from './components/SceneThumbnail';
import {
  getPlays,
  savePlay,
  deletePlay,
  subscribePlaysChanged,
  getActiveTeamId,
} from './lib/playsStore';
import type { Play } from './lib/types';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function PlaysList() {
  const playsJson = useSyncExternalStore(
    subscribePlaysChanged,
    () => {
      const tid = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? '' : '';
      return tid ? JSON.stringify(getPlays(tid)) : '[]';
    },
    () => '[]'
  );

  const plays: Play[] = useMemo(() => {
    try { return JSON.parse(playsJson); } catch { return []; }
  }, [playsJson]);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const startRename = (play: Play) => {
    setMenuOpenId(null);
    setRenamingId(play.id);
    setRenameValue(play.name);
  };

  const commitRename = () => {
    const teamId = getActiveTeamId();
    if (!renamingId || !teamId) { setRenamingId(null); return; }
    const play = plays.find((p) => p.id === renamingId);
    if (play && renameValue.trim()) {
      savePlay(teamId, { ...play, name: renameValue.trim(), updatedAt: new Date().toISOString() });
    }
    setRenamingId(null);
  };

  const handleDelete = (play: Play) => {
    setMenuOpenId(null);
    const teamId = getActiveTeamId();
    if (!teamId) return;
    if (window.confirm(`Delete '${play.name}' permanently? This cannot be undone.`)) {
      deletePlay(teamId, play.id);
    }
  };

  if (!plays.length) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="No plays yet"
        description="Build tactical animations to walk your team through phases of play."
        action={{ label: 'New play', href: '/coach/playbook/new' }}
        size="lg"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {plays.map((play) => (
        <div
          key={play.id}
          className="bg-panel border border-border rounded-xl overflow-hidden flex flex-col hover:border-border-light transition-colors"
        >
          {/* Scene thumbnail */}
          <div className="w-full aspect-[23/14] bg-panel-2 overflow-hidden">
            <SceneThumbnail scene={play.scenes[0]} width="100%" height="100%" />
          </div>

          {/* Card content */}
          <div className="p-4 flex flex-col gap-3">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2">
            {renamingId === play.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="flex-1 bg-panel-2 text-foreground text-sm font-semibold px-2 py-1 rounded border border-border-light outline-none focus:border-accent"
              />
            ) : (
              <span className="text-sm font-semibold text-foreground-strong truncate flex-1">{play.name}</span>
            )}

            {/* Overflow menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpenId(menuOpenId === play.id ? null : play.id)}
                className="p-1 rounded text-muted hover:text-foreground hover:bg-panel-2 transition-colors"
                title="More options"
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpenId === play.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                  <div className="absolute right-0 top-6 z-20 bg-panel border border-border rounded-lg shadow-lg py-1 min-w-[130px]">
                    <button
                      type="button"
                      onClick={() => startRename(play)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-panel-2 transition-colors"
                    >
                      <Pencil size={12} />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(play)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-danger hover:bg-panel-2 transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>{play.scenes.length} {play.scenes.length === 1 ? 'scene' : 'scenes'}</span>
            <span>·</span>
            <span>Updated {relativeTime(play.updatedAt)}</span>
          </div>

          {/* Open link */}
          <Link
            href={`/coach/playbook/${play.id}`}
            className="mt-auto inline-flex items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Open
          </Link>
          </div>{/* end card content */}
        </div>
      ))}
    </div>
  );
}
