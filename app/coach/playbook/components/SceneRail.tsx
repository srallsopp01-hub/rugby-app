'use client';

import { useRef } from 'react';
import useEditorStore from '../lib/editorStore';
import type { Scene } from '../lib/types';

// ─── SVG thumbnail ────────────────────────────────────────────────────────────

function SceneThumbnail({ scene }: { scene: Scene }) {
  const W = 92;
  const H = 58;

  const lines = [6 / 112, 28 / 112, 56 / 112, 84 / 112, 106 / 112];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Pitch */}
      <rect width={W} height={H} fill="#1e4d2b" />
      {/* In-goal areas */}
      <rect x={0} y={0} width={(6 / 112) * W} height={H} fill="#183d22" />
      <rect x={(106 / 112) * W} y={0} width={(6 / 112) * W} height={H} fill="#183d22" />
      {/* Lines */}
      {lines.map((frac, i) => (
        <line key={i} x1={frac * W} y1={0} x2={frac * W} y2={H}
          stroke="rgba(255,255,255,0.45)" strokeWidth={i === 2 ? 1 : 0.7} />
      ))}
      {/* Touchlines */}
      <line x1={0} y1={0} x2={W} y2={0} stroke="rgba(255,255,255,0.45)" strokeWidth={0.7} />
      <line x1={0} y1={H} x2={W} y2={H} stroke="rgba(255,255,255,0.45)" strokeWidth={0.7} />
      {/* Zones */}
      {(scene.zones ?? []).map((zone) => {
        const x = zone.normX * W; const y = zone.normY * H;
        const w = zone.normW * W; const h = zone.normH * H;
        const fill = zone.color.replace(/[\d.]+\)$/, '0.25)');
        if (zone.shape === 'ellipse') {
          return <ellipse key={zone.id} cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2}
            fill={fill} stroke={zone.color} strokeWidth={0.7} />;
        }
        return <rect key={zone.id} x={x} y={y} width={w} height={h}
          fill={fill} stroke={zone.color} strokeWidth={0.7} rx={1} />;
      })}
      {/* Drawn arrows */}
      {(scene.arrows ?? []).map((arrow) => {
        const x1 = arrow.fromX * W; const y1 = arrow.fromY * H;
        const x2 = arrow.toX   * W; const y2 = arrow.toY   * H;
        const color = arrow.type === 'kick' ? '#fbbf24' : 'rgba(255,255,255,0.65)';
        const dash  = arrow.type === 'pass' ? '3 2' : arrow.type === 'kick' ? '5 3' : undefined;
        if (arrow.cpX !== undefined && arrow.cpY !== undefined) {
          const cx = arrow.cpX * W; const cy = arrow.cpY * H;
          return <path key={arrow.id} d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
            stroke={color} strokeWidth={0.9} fill="none" strokeDasharray={dash} />;
        }
        return <line key={arrow.id} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color} strokeWidth={0.9} strokeDasharray={dash} />;
      })}

      {/* Actor dots */}
      {scene.actors.map((actor) => {
        const cx = actor.normX * W;
        const cy = actor.normY * H;
        const fill = actor.team === 'home' ? '#3b82f6' : actor.team === 'away' ? '#ef4444' : '#f59e0b';
        const r = actor.type === 'ball' ? 2 : 3;
        return (
          <circle key={actor.id} cx={cx} cy={cy} r={r} fill={fill} stroke="white" strokeWidth={0.6} />
        );
      })}
    </svg>
  );
}

// ─── Scene card ───────────────────────────────────────────────────────────────

function SceneCard({
  scene,
  index,
  isActive,
  isFirst,
  isLast,
  isPlaying,
}: {
  scene: Scene;
  index: number;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  isPlaying: boolean;
}) {
  const { setCurrentScene, duplicateScene, deleteScene, moveScene, scenes } = useEditorStore();

  return (
    <div
      onClick={() => setCurrentScene(scene.id)}
      className={`relative flex flex-col rounded-xl cursor-pointer select-none shrink-0 transition-all duration-150 group
        ${isActive
          ? 'ring-2 ring-accent bg-panel-2 shadow-lg'
          : 'bg-panel-2/50 hover:bg-panel-2 ring-1 ring-border/40 hover:ring-border-light/60'
        }`}
      style={{ width: 114 }}
    >
      {/* Thumbnail */}
      <div className="p-1.5 pb-0">
        <div className={`rounded-lg overflow-hidden transition-all ${
          isActive ? 'ring-1 ring-accent/20' : ''
        }`}>
          <SceneThumbnail scene={scene} />
        </div>
      </div>

      {/* Label */}
      <div className="px-2.5 py-1.5">
        <p className={`text-xs font-medium truncate ${isActive ? 'text-foreground' : 'text-muted group-hover:text-foreground'}`}>
          {scene.name}
        </p>
        <p className="text-[10px] text-muted-2 mt-0.5">
          {(scene.duration / 1000).toFixed(1)}s · {scene.actors.length} actor{scene.actors.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Scene number badge */}
      <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
        <span className="text-[9px] font-bold text-foreground">{index + 1}</span>
      </div>

      {/* Playing indicator */}
      {isActive && isPlaying && (
        <div className="absolute top-3 right-3 flex items-center gap-0.5">
          <span className="w-1 h-3 bg-success rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-2 bg-success rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-3.5 bg-success rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Hover action buttons */}
      <div className="absolute inset-x-1 -bottom-0.5 translate-y-full pt-1 z-20
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
        <div className="flex gap-0.5 bg-panel-2 border border-border rounded-lg p-1 shadow-xl">
          <ActionBtn
            onClick={(e) => { e.stopPropagation(); moveScene(scene.id, 'left'); }}
            disabled={isFirst}
            title="Move left"
          >←</ActionBtn>
          <ActionBtn
            onClick={(e) => { e.stopPropagation(); duplicateScene(scene.id); }}
            title="Duplicate"
          >⧉</ActionBtn>
          <ActionBtn
            onClick={(e) => { e.stopPropagation(); moveScene(scene.id, 'right'); }}
            disabled={isLast}
            title="Move right"
          >→</ActionBtn>
          <ActionBtn
            onClick={(e) => { e.stopPropagation(); if (scenes.length > 1) deleteScene(scene.id); }}
            disabled={scenes.length === 1}
            title="Delete"
            danger
          >✕</ActionBtn>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-25 disabled:cursor-not-allowed
        ${danger
          ? 'text-danger hover:bg-danger/10'
          : 'text-muted hover:bg-panel-3 hover:text-foreground'
        }`}
    >
      {children}
    </button>
  );
}

// ─── Main rail ────────────────────────────────────────────────────────────────

export default function SceneRail() {
  const { scenes, currentSceneId, addScene, duplicateScene, isPlaying } = useEditorStore();
  const railRef = useRef<HTMLDivElement>(null);

  return (
    <footer className="h-[148px] bg-panel border-t border-border shrink-0 flex items-center">
      {/* Left label */}
      <div className="flex flex-col items-center justify-center w-14 h-full border-r border-border shrink-0 gap-0.5 px-2">
        <span className="text-lg font-bold text-muted">{scenes.length}</span>
        <span className="text-[9px] font-semibold tracking-widest text-muted-2 uppercase">
          scene{scenes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable cards */}
      <div
        ref={railRef}
        className="flex-1 flex items-center gap-2.5 px-3 overflow-x-auto scene-rail-scroll h-full py-3"
      >
        {scenes.map((scene, idx) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={idx}
            isActive={scene.id === currentSceneId}
            isFirst={idx === 0}
            isLast={idx === scenes.length - 1}
            isPlaying={isPlaying}
          />
        ))}

        {/* Add scene button */}
        <button
          onClick={() => {
            // Duplicate current scene so positions carry over
            const currentIdx = scenes.findIndex((s) => s.id === currentSceneId);
            if (currentIdx >= 0) duplicateScene(scenes[currentIdx].id);
          }}
          title="Duplicate current scene as next step"
          className="flex flex-col items-center justify-center gap-1.5 shrink-0 w-24 h-[116px] rounded-xl
            border-2 border-dashed border-border/60 hover:border-accent/70
            text-muted-2 hover:text-accent transition-all group"
        >
          <span className="text-2xl font-light leading-none group-hover:scale-110 transition-transform">+</span>
          <span className="text-[10px] font-medium text-center leading-tight px-2">
            Duplicate &<br />add step
          </span>
        </button>
      </div>

      {/* Right: global hint */}
      <div className="w-24 h-full border-l border-border shrink-0 flex flex-col items-center justify-center gap-1 px-3">
        <p className="text-[10px] text-muted-2 text-center leading-relaxed">
          Hover a card for actions
        </p>
      </div>
    </footer>
  );
}
