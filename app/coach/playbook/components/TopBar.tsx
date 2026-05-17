'use client';

import { useState, useRef, useEffect } from 'react';
import useEditorStore from '../lib/editorStore';

export default function TopBar() {
  const {
    projectName,
    setProjectName,
    undo,
    redo,
    past,
    future,
    scenes,
    currentSceneId,
    isPlaying,
    setIsPlaying,
    setCurrentScene,
    showMovementArrows,
    setShowMovementArrows,
    showPlayerNames,
    setShowPlayerNames,
  } = useEditorStore();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const onDone = () => setIsRecording(false);
    window.addEventListener('mp4-recording-stopped', onDone);
    return () => window.removeEventListener('mp4-recording-stopped', onDone);
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim()) setProjectName(draft.trim());
    else setDraft(projectName);
  };

  const currentSceneIndex = scenes.findIndex((s) => s.id === currentSceneId);
  const canPlay = scenes.length > 1;

  const handlePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // Always start playback from scene 1
      setCurrentScene(scenes[0].id);
      setTimeout(() => setIsPlaying(true), 50);
    }
  };

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-panel border-b border-border shrink-0 z-10">
      {/* Left: project name */}
      <div className="flex items-center gap-3 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setDraft(projectName); setEditing(false); }
            }}
            className="bg-panel-2 text-foreground text-sm font-medium px-2 py-1 rounded border border-border-light outline-none w-48"
          />
        ) : (
          <button
            onClick={() => { setDraft(projectName); setEditing(true); }}
            className="text-sm font-medium text-foreground hover:text-foreground-strong px-1 py-0.5 rounded hover:bg-panel-2 transition-colors truncate max-w-40"
          >
            {projectName}
          </button>
        )}
      </div>

      {/* Center: controls */}
      <div className="flex items-center gap-1">
        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={past.length === 0}
          title="Undo (Ctrl+Z)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm text-muted hover:text-foreground hover:bg-panel-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <UndoIcon />
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          title="Redo (Ctrl+Shift+Z)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm text-muted hover:text-foreground hover:bg-panel-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <RedoIcon />
        </button>

        <div className="w-px h-5 bg-panel-3 mx-1" />

        {/* Movement arrows toggle */}
        <button
          onClick={() => setShowMovementArrows(!showMovementArrows)}
          title={showMovementArrows ? 'Hide movement arrows' : 'Show movement arrows'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
            showMovementArrows
              ? 'text-accent bg-panel border border-accent/30'
              : 'text-muted hover:text-foreground hover:bg-panel-2'
          }`}
        >
          <ArrowIcon />
          Paths
        </button>

        {/* Player names toggle */}
        <button
          onClick={() => setShowPlayerNames(!showPlayerNames)}
          title={showPlayerNames ? 'Hide player names' : 'Show player names'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
            showPlayerNames
              ? 'text-accent bg-panel border border-accent/30'
              : 'text-muted hover:text-foreground hover:bg-panel-2'
          }`}
        >
          <NamesIcon />
          Names
        </button>

        <div className="w-px h-5 bg-panel-3 mx-1" />

        {/* Scene indicator */}
        <span className="text-xs text-muted tabular-nums px-1">
          {currentSceneIndex + 1} / {scenes.length}
        </span>

        {/* Play button */}
        <button
          onClick={handlePlay}
          disabled={!canPlay}
          title={isPlaying ? 'Stop (Space)' : 'Play from start (Space)'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            isPlaying
              ? 'bg-danger hover:bg-danger/80 text-white shadow-lg'
              : 'bg-success hover:bg-success/80 text-white shadow-lg'
          }`}
        >
          {isPlaying ? <StopIcon /> : <PlayIcon />}
          {isPlaying ? 'Stop' : 'Play'}
        </button>
      </div>

      {/* Right: status + export */}
      <div className="flex items-center gap-2">
        <SavedBadge />
        <div className="w-px h-5 bg-panel-3" />
        <div className="relative">
          <button
            onClick={() => setExportOpen((o) => !o)}
            disabled={isRecording}
            title="Export"
            className="px-3 py-1.5 rounded text-sm bg-accent hover:bg-accent/80 text-white border border-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isRecording ? 'Recording…' : 'Export'}
            {!isRecording && <ChevronIcon />}
          </button>
          {exportOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-40 bg-panel border border-border rounded shadow-lg z-50 overflow-hidden"
              onMouseLeave={() => setExportOpen(false)}
            >
              <button
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-panel-2 transition-colors"
                onClick={() => {
                  setExportOpen(false);
                  window.dispatchEvent(
                    new CustomEvent('export-png', {
                      detail: { filename: `${projectName.toLowerCase().replace(/\s+/g, '-')}.png` },
                    })
                  );
                }}
              >
                Export PNG
              </button>
              <button
                disabled={isRecording}
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-panel-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => {
                  setExportOpen(false);
                  setIsRecording(true);
                  window.dispatchEvent(
                    new CustomEvent('export-mp4', {
                      detail: { filename: `${projectName.toLowerCase().replace(/\s+/g, '-')}.webm` },
                    })
                  );
                }}
              >
                Export MP4
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function SavedBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted">
      <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
      Saved
    </div>
  );
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function NamesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
