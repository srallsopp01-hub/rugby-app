'use client';

import { useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import useEditorStore from '../lib/editorStore';
import TopBar from '../components/TopBar';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import SceneRail from '../components/SceneRail';

const RugbyCanvas = dynamic(() => import('../components/canvas/RugbyCanvas'), { ssr: false });

const STORAGE_KEY = 'fynlwhistle-playbook-active';

export default function PlaybookEditor() {
  const {
    loadFromStorage,
    scenes,
    currentSceneId,
    projectName,
    undo,
    redo,
    selectedActorId,
    selectedArrowId,
    selectedZoneId,
    deleteActor,
    deletePlayArrow,
    deleteZone,
    isPlaying,
    nextScene,
    setIsPlaying,
  } = useEditorStore();

  // Load saved state once on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Autosave whenever relevant state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ projectName, scenes, currentSceneId })
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [scenes, currentSceneId, projectName]);

  // Playback timer: advance to next scene after each scene's duration
  useEffect(() => {
    if (!isPlaying) return;
    const currentScene = scenes.find((s) => s.id === currentSceneId);
    const duration = currentScene?.duration ?? 1500;
    const timer = setTimeout(() => {
      const hasNext = nextScene();
      if (!hasNext) setIsPlaying(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [isPlaying, currentSceneId, scenes, nextScene, setIsPlaying]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((meta && e.shiftKey && e.key === 'z') || (meta && e.key === 'y')) {
        e.preventDefault();
        redo();
      }
      // Delete selected actor, arrow, or zone
      if (!isInput && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedActorId) { e.preventDefault(); deleteActor(selectedActorId); }
        else if (selectedArrowId) { e.preventDefault(); deletePlayArrow(selectedArrowId); }
        else if (selectedZoneId) { e.preventDefault(); deleteZone(selectedZoneId); }
      }
      // Escape: deselect + cancel drawing
      if (e.key === 'Escape') {
        useEditorStore.getState().setSelectedActor(null);
        useEditorStore.getState().setSelectedArrow(null);
        useEditorStore.getState().setSelectedZone(null);
        useEditorStore.getState().setSelectedTool('select');
      }
      // Space: toggle play
      if (!isInput && e.key === ' ') {
        e.preventDefault();
        if (scenes.length > 1) setIsPlaying(!isPlaying);
      }
    },
    [undo, redo, selectedActorId, selectedArrowId, selectedZoneId, deleteActor, deletePlayArrow, deleteZone, isPlaying, setIsPlaying, scenes]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden select-none">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="flex-1 overflow-hidden bg-background">
          <RugbyCanvas />
        </main>
        <RightSidebar />
      </div>
      <SceneRail />
    </div>
  );
}
