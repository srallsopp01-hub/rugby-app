'use client';

import { useEffect, useCallback, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FileQuestion } from 'lucide-react';
import useEditorStore from '../lib/editorStore';
import { getPlay, createPlay, savePlay, getActiveTeamId } from '../lib/playsStore';
import { EmptyState } from '@/app/components/EmptyState';
import TopBar from '../components/TopBar';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import SceneRail from '../components/SceneRail';

const RugbyCanvas = dynamic(() => import('../components/canvas/RugbyCanvas'), { ssr: false });

export default function PlaybookEditor() {
  const params = useParams();
  const playId = params.playId as string;
  const router = useRouter();

  const {
    loadPlay,
    getPlaySnapshot,
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

  const [playNotFound, setPlayNotFound] = useState(false);

  // Load play on mount (or when playId changes due to 'new' → real-id redirect)
  useEffect(() => {
    const teamId = getActiveTeamId();
    if (!teamId) return;

    if (playId === 'new') {
      const play = createPlay(teamId, 'Untitled play');
      router.replace(`/coach/playbook/${play.id}`);
      return;
    }

    const play = getPlay(teamId, playId);
    if (play) {
      loadPlay(play);
    } else {
      setPlayNotFound(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId]);

  // Debounced autosave — runs 800 ms after any editor state change
  useEffect(() => {
    if (playId === 'new') return;
    const teamId = getActiveTeamId();
    if (!teamId) return;

    const timer = setTimeout(() => {
      const existing = getPlay(teamId, playId);
      if (!existing) return;
      savePlay(teamId, {
        ...existing,
        ...getPlaySnapshot(),
        updatedAt: new Date().toISOString(),
      });
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, currentSceneId, projectName, playId]);

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
      if (!isInput && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedActorId) { e.preventDefault(); deleteActor(selectedActorId); }
        else if (selectedArrowId) { e.preventDefault(); deletePlayArrow(selectedArrowId); }
        else if (selectedZoneId) { e.preventDefault(); deleteZone(selectedZoneId); }
      }
      if (e.key === 'Escape') {
        useEditorStore.getState().setSelectedActor(null);
        useEditorStore.getState().setSelectedArrow(null);
        useEditorStore.getState().setSelectedZone(null);
        useEditorStore.getState().setSelectedTool('select');
      }
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

  if (playNotFound) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <EmptyState
          icon={FileQuestion}
          title="Play not found"
          description="This play doesn't exist or belongs to a different team."
          action={{ label: 'Back to Playbook', href: '/coach/playbook' }}
          size="md"
        />
      </div>
    );
  }

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
