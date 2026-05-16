'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Stage,
  Layer,
  Rect,
  Line,
  Circle,
  Text,
  Group,
  Ellipse,
  RegularPolygon,
  Arrow,
  Shape,
} from 'react-konva';
import useEditorStore from '../../lib/editorStore';
import type { PitchLayout, Actor } from '../../lib/types';

// Extends Actor with a transient opacity used only during scene transitions
type AnimatedActor = Actor & { _opacity: number };
import type Konva from 'konva';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_ACTOR_R = 16;

const LEN = {
  leftDeadBall:  0,
  leftTryLine:   6 / 112,
  left22:        28 / 112,
  left10m:       46 / 112,
  halfway:       56 / 112,
  right10m:      66 / 112,
  right22:       84 / 112,
  rightTryLine:  106 / 112,
  rightDeadBall: 1,
};

const WID = {
  topTouchline:    0,
  top5m:           5 / 70,
  top15m:          15 / 70,
  center:          0.5,
  bottom15m:       55 / 70,
  bottom5m:        65 / 70,
  bottomTouchline: 1,
};

// ─── Easing ───────────────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function computePitch(stageW: number, stageH: number, scale: number, portrait: boolean, panX = 0, panY = 0): PitchLayout {
  const ratio = portrait ? 70 / 112 : 112 / 70;
  const pad = 44;
  const availW = stageW - pad * 2;
  const availH = stageH - pad * 2;
  let baseW: number, baseH: number;
  if (availW / availH > ratio) {
    baseH = availH; baseW = baseH * ratio;
  } else {
    baseW = availW; baseH = baseW / ratio;
  }
  const width = baseW * scale;
  const height = baseH * scale;
  return { x: (stageW - width) / 2 + panX, y: (stageH - height) / 2 + panY, width, height };
}

function clampPan(px: number, py: number, pitchW: number, pitchH: number) {
  return {
    x: Math.max(-pitchW / 2, Math.min(pitchW / 2, px)),
    y: Math.max(-pitchH / 2, Math.min(pitchH / 2, py)),
  };
}

function toCanvas(normX: number, normY: number, p: PitchLayout, portrait: boolean) {
  if (portrait) return { x: p.x + normY * p.width, y: p.y + normX * p.height };
  return { x: p.x + normX * p.width, y: p.y + normY * p.height };
}

function toNorm(cx: number, cy: number, p: PitchLayout, portrait: boolean) {
  if (portrait) {
    return {
      normX: Math.max(0, Math.min(1, (cy - p.y) / p.height)),
      normY: Math.max(0, Math.min(1, (cx - p.x) / p.width)),
    };
  }
  return {
    normX: Math.max(0, Math.min(1, (cx - p.x) / p.width)),
    normY: Math.max(0, Math.min(1, (cy - p.y) / p.height)),
  };
}

// ─── Pitch background ─────────────────────────────────────────────────────────

function PitchBackground({ pitch: p, portrait }: { pitch: PitchLayout; portrait: boolean }) {
  const { x, y, width: w, height: h } = p;

  const goalLine = (lenFrac: number, color = 'rgba(255,255,255,0.55)', strokeWidth = 1.2, dash?: number[]) => {
    const props = { stroke: color, strokeWidth, dash, listening: false };
    if (portrait) { const py2 = y + lenFrac * h; return { points: [x, py2, x + w, py2], ...props }; }
    const px2 = x + lenFrac * w;
    return { points: [px2, y, px2, y + h], ...props };
  };

  const channelLine = (widFrac: number, color = 'rgba(255,255,255,0.55)', strokeWidth = 1.2, dash?: number[]) => {
    const props = { stroke: color, strokeWidth, dash, listening: false };
    if (portrait) { const px2 = x + widFrac * w; return { points: [px2, y, px2, y + h], ...props }; }
    const py2 = y + widFrac * h;
    return { points: [x, py2, x + w, py2], ...props };
  };

  const ingoalSize = LEN.leftTryLine;
  const ingoalLeft  = portrait ? { x, y, width: w, height: ingoalSize * h } : { x, y, width: ingoalSize * w, height: h };
  const ingoalRight = portrait
    ? { x, y: y + LEN.rightTryLine * h, width: w, height: (1 - LEN.rightTryLine) * h }
    : { x: x + LEN.rightTryLine * w, y, width: (1 - LEN.rightTryLine) * w, height: h };

  const stripes = Array.from({ length: 10 }).map((_, i) =>
    portrait ? { x, y: y + (i / 10) * h, width: w, height: h / 10 } : { x: x + (i / 10) * w, y, width: w / 10, height: h }
  );

  const lineLabels = [
    { lenFrac: LEN.left22, text: '22' }, { lenFrac: LEN.halfway, text: '50' }, { lenFrac: LEN.right22, text: '22' },
  ];

  return (
    <>
      <Rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="#0a1f12" cornerRadius={5} listening={false} />
      <Rect x={x} y={y} width={w} height={h} fill="#1e4d2b" cornerRadius={2} listening={false} />
      {stripes.map((s, i) => <Rect key={i} {...s} fill={i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'transparent'} listening={false} />)}
      <Rect {...ingoalLeft}  fill="#183d22" listening={false} />
      <Rect {...ingoalRight} fill="#183d22" listening={false} />
      <Line {...goalLine(LEN.leftDeadBall,  'rgba(255,255,255,0.35)', 1.5)} />
      <Line {...goalLine(LEN.rightDeadBall, 'rgba(255,255,255,0.35)', 1.5)} />
      <Line {...goalLine(LEN.leftTryLine,   'rgba(255,255,255,0.95)', 2)} />
      <Line {...goalLine(LEN.rightTryLine,  'rgba(255,255,255,0.95)', 2)} />
      <Line {...goalLine(LEN.left22,  'rgba(255,255,255,0.65)', 1.5)} />
      <Line {...goalLine(LEN.right22, 'rgba(255,255,255,0.65)', 1.5)} />
      <Line {...goalLine(LEN.left10m,  'rgba(255,255,255,0.4)', 1, [7, 5])} />
      <Line {...goalLine(LEN.right10m, 'rgba(255,255,255,0.4)', 1, [7, 5])} />
      <Line {...goalLine(LEN.halfway, 'rgba(255,255,255,0.75)', 1.8)} />
      <Line {...channelLine(WID.topTouchline,    'rgba(255,255,255,0.75)', 1.8)} />
      <Line {...channelLine(WID.bottomTouchline, 'rgba(255,255,255,0.75)', 1.8)} />
      <Line {...channelLine(WID.top5m,    'rgba(255,255,255,0.28)', 1, [5, 6])} />
      <Line {...channelLine(WID.bottom5m, 'rgba(255,255,255,0.28)', 1, [5, 6])} />
      <Line {...channelLine(WID.top15m,    'rgba(255,255,255,0.38)', 1.2, [5, 4])} />
      <Line {...channelLine(WID.bottom15m, 'rgba(255,255,255,0.38)', 1.2, [5, 4])} />
      <Circle
        x={x + (portrait ? WID.center * w : LEN.halfway * w)}
        y={y + (portrait ? LEN.halfway * h : WID.center * h)}
        radius={Math.min(w, h) * 0.055}
        stroke="rgba(255,255,255,0.22)" strokeWidth={1} listening={false}
      />
      <GoalPosts pitch={p} side="left"  portrait={portrait} />
      <GoalPosts pitch={p} side="right" portrait={portrait} />
      {lineLabels.map(({ lenFrac, text }) => {
        const lx = portrait ? x + 4 : x + lenFrac * w + 3;
        const ly = portrait ? y + lenFrac * h + 3 : y + 4;
        return <Text key={text + lenFrac} x={lx} y={ly} text={text} fontSize={9} fill="rgba(255,255,255,0.28)" listening={false} />;
      })}
      {!portrait && (
        <>
          <Text x={x + 2} y={y + WID.top5m  * h - 10} text="5m"  fontSize={8} fill="rgba(255,255,255,0.2)" listening={false} />
          <Text x={x + 2} y={y + WID.top15m * h - 10} text="15m" fontSize={8} fill="rgba(255,255,255,0.2)" listening={false} />
        </>
      )}
      {portrait && (
        <>
          <Text x={x + WID.top5m  * w + 2} y={y + 2} text="5m"  fontSize={8} fill="rgba(255,255,255,0.2)" listening={false} />
          <Text x={x + WID.top15m * w + 2} y={y + 2} text="15m" fontSize={8} fill="rgba(255,255,255,0.2)" listening={false} />
        </>
      )}
      <HomeSideLabel pitch={p} portrait={portrait} />
    </>
  );
}

function HomeSideLabel({ pitch: p, portrait }: { pitch: PitchLayout; portrait: boolean }) {
  const { x, y, width: w, height: h } = p;
  if (portrait) {
    return (
      <>
        <Text x={x + w / 2 - 22} y={y + LEN.leftTryLine  * h + 6}  text="HOME" fontSize={10} fontStyle="bold" fill="rgba(59,130,246,0.3)"  letterSpacing={2} listening={false} />
        <Text x={x + w / 2 - 22} y={y + LEN.rightTryLine * h - 18} text="AWAY" fontSize={10} fontStyle="bold" fill="rgba(239,68,68,0.3)"   letterSpacing={2} listening={false} />
      </>
    );
  }
  return (
    <>
      <Text x={x + LEN.leftTryLine  * w + 6}  y={y + h / 2 - 7} text="HOME" fontSize={11} fontStyle="bold" fill="rgba(59,130,246,0.3)"  letterSpacing={3} listening={false} />
      <Text x={x + LEN.rightTryLine * w - 64} y={y + h / 2 - 7} text="AWAY" fontSize={11} fontStyle="bold" fill="rgba(239,68,68,0.3)"   letterSpacing={3} listening={false} />
    </>
  );
}

function GoalPosts({ pitch: p, side, portrait }: { pitch: PitchLayout; side: 'left' | 'right'; portrait: boolean }) {
  const { x, y, width: w, height: h } = p;
  const lenFrac = side === 'left' ? LEN.leftTryLine : LEN.rightTryLine;
  const dir = side === 'left' ? -1 : 1;
  const span = (portrait ? w : h) * 0.11;
  const arm  = (portrait ? h : w) * 0.022;
  const color = 'rgba(255,255,255,0.45)';
  if (portrait) {
    const py2 = y + lenFrac * h; const cx = x + WID.center * w;
    return (
      <>
        <Line points={[cx - span, py2, cx + span, py2]} stroke={color} strokeWidth={2} listening={false} />
        <Line points={[cx - span, py2, cx - span, py2 + dir * arm]} stroke={color} strokeWidth={2} listening={false} />
        <Line points={[cx + span, py2, cx + span, py2 + dir * arm]} stroke={color} strokeWidth={2} listening={false} />
      </>
    );
  }
  const px2 = x + lenFrac * w; const cy = y + WID.center * h;
  return (
    <>
      <Line points={[px2, cy - span, px2, cy + span]} stroke={color} strokeWidth={2} listening={false} />
      <Line points={[px2, cy - span, px2 + dir * arm, cy - span]} stroke={color} strokeWidth={2} listening={false} />
      <Line points={[px2, cy + span, px2 + dir * arm, cy + span]} stroke={color} strokeWidth={2} listening={false} />
    </>
  );
}

// ─── Movement arrows ──────────────────────────────────────────────────────────

interface MovArrow { id: string; fromX: number; fromY: number; toX: number; toY: number; color: string; }

function MovementArrows({ arrows, actorR }: { arrows: MovArrow[]; actorR: number }) {
  return (
    <>
      {arrows.map((a) => {
        const dx = a.toX - a.fromX; const dy = a.toY - a.fromY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) return null;
        const nx = dx / dist; const ny = dy / dist;
        return (
          <Arrow key={a.id}
            points={[a.fromX + nx * (actorR + 3), a.fromY + ny * (actorR + 3), a.toX - nx * (actorR + 7), a.toY - ny * (actorR + 7)]}
            stroke={a.color} strokeWidth={2.5} fill={a.color}
            opacity={0.72} pointerLength={9} pointerWidth={7} listening={false}
          />
        );
      })}
    </>
  );
}

// ─── Ghost actors ─────────────────────────────────────────────────────────────

function GhostActor({ actor, pitch, portrait, actorR }: { actor: Actor; pitch: PitchLayout; portrait: boolean; actorR: number }) {
  const pos = toCanvas(actor.normX, actor.normY, pitch, portrait);
  const color = actor.team === 'home' ? '#3b82f6' : actor.team === 'away' ? '#ef4444' : '#f59e0b';
  return (
    <Group x={pos.x} y={pos.y} opacity={0.22} listening={false}>
      {actor.type === 'player' && (
        <>
          <Circle radius={actorR} fill={color} stroke="white" strokeWidth={1.5} />
          <Text text={String(actor.number)} fontSize={actor.number >= 10 ? actorR * 0.62 : actorR * 0.75}
            fill="white" fontStyle="bold" align="center"
            width={actorR * 2} x={-actorR} y={actor.number >= 10 ? -actorR * 0.44 : -actorR * 0.5} listening={false} />
        </>
      )}
      {actor.type === 'ball' && <Ellipse radiusX={actorR * 0.5} radiusY={actorR * 0.75} fill="#f59e0b" stroke="white" strokeWidth={1.5} rotation={-20} />}
      {actor.type === 'cone' && <RegularPolygon sides={3} radius={actorR * 0.75} fill="#f97316" stroke="white" strokeWidth={1.5} />}
    </Group>
  );
}

// ─── Draggable actor ──────────────────────────────────────────────────────────

function ActorShape({ actor, pitch, portrait, actorR, isSelected, showPlayerNames, opacity, onSelect, onDragEnd }: {
  actor: Actor; pitch: PitchLayout; portrait: boolean; actorR: number;
  isSelected: boolean; showPlayerNames: boolean; opacity?: number; onSelect: () => void; onDragEnd: (normX: number, normY: number) => void;
}) {
  const pos = toCanvas(actor.normX, actor.normY, pitch, portrait);

  const dragBoundFunc = (p: { x: number; y: number }) => ({
    x: Math.max(pitch.x + actorR, Math.min(pitch.x + pitch.width  - actorR, p.x)),
    y: Math.max(pitch.y + actorR, Math.min(pitch.y + pitch.height - actorR, p.y)),
  });

  const shared = {
    x: pos.x, y: pos.y,
    opacity: opacity ?? 1,
    draggable: !actor.locked,
    dragBoundFunc,
    onClick:  (e: Konva.KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; onSelect(); },
    onTap:    (e: Konva.KonvaEventObject<TouchEvent>) => { e.cancelBubble = true; onSelect(); },
    onDragEnd:(e: Konva.KonvaEventObject<DragEvent>)  => {
      const { normX, normY } = toNorm(e.target.x(), e.target.y(), pitch, portrait);
      onDragEnd(normX, normY);
    },
    onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => { const s = e.target.getStage(); if (s && !actor.locked) s.container().style.cursor = 'grab'; },
    onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => { const s = e.target.getStage(); if (s) s.container().style.cursor = 'default'; },
  };

  if (actor.type === 'player') {
    const fill = actor.team === 'home' ? '#3b82f6' : actor.team === 'away' ? '#ef4444' : '#f59e0b';
    return (
      <Group {...shared}>
        {isSelected && <Circle radius={actorR + 6} fill="rgba(250,204,21,0.14)" stroke="#facc15" strokeWidth={2.5} />}
        {actor.locked && <Circle radius={actorR + 3} stroke="rgba(255,255,255,0.25)" strokeWidth={1} dash={[3, 3]} />}
        <Circle radius={actorR} fill={fill} stroke="white" strokeWidth={2.2}
          shadowColor="black" shadowBlur={8} shadowOpacity={0.4} shadowOffsetY={2} />
        <Text text={String(actor.number)}
          fontSize={actor.number >= 10 ? actorR * 0.62 : actorR * 0.75}
          fill="white" fontStyle="bold" align="center"
          width={actorR * 2} x={-actorR}
          y={actor.number >= 10 ? -actorR * 0.44 : -actorR * 0.5}
          listening={false} />
        {showPlayerNames && actor.name && (
          <Text text={actor.name}
            fontSize={9} fill="rgba(255,255,255,0.85)" fontStyle="bold" align="center"
            width={actorR * 4} x={-actorR * 2} y={actorR + 3}
            shadowColor="black" shadowBlur={3} shadowOpacity={0.8}
            listening={false} />
        )}
      </Group>
    );
  }
  if (actor.type === 'ball') {
    return (
      <Group {...shared}>
        {isSelected && <Circle radius={actorR * 0.87} fill="rgba(250,204,21,0.14)" stroke="#facc15" strokeWidth={2.5} />}
        <Ellipse radiusX={actorR * 0.5} radiusY={actorR * 0.75} fill="#f59e0b" stroke="white" strokeWidth={1.8}
          rotation={-20} shadowColor="black" shadowBlur={8} shadowOpacity={0.4} shadowOffsetY={2} />
        <Line points={[-1, -actorR * 0.3, -1, actorR * 0.3]} stroke="rgba(255,255,255,0.55)" strokeWidth={1} rotation={-20} listening={false} />
      </Group>
    );
  }
  return (
    <Group {...shared}>
      {isSelected && <Circle radius={actorR} fill="rgba(250,204,21,0.14)" stroke="#facc15" strokeWidth={2.5} />}
      <RegularPolygon sides={3} radius={actorR * 0.75} fill="#f97316" stroke="white" strokeWidth={1.8}
        shadowColor="black" shadowBlur={8} shadowOpacity={0.4} shadowOffsetY={2} />
    </Group>
  );
}

// ─── Coach-drawn arrow ────────────────────────────────────────────────────────

function DrawnArrow({ arrow, pitch, portrait, isSelected, onSelect, onCpDrag }: {
  arrow: import('../../lib/types').PlayArrow;
  pitch: PitchLayout; portrait: boolean;
  isSelected: boolean; onSelect: () => void;
  onCpDrag: (cpX: number, cpY: number) => void;
}) {
  const from = toCanvas(arrow.fromX, arrow.fromY, pitch, portrait);
  const to   = toCanvas(arrow.toX,   arrow.toY,   pitch, portrait);
  const dx = to.x - from.x; const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 4) return null;

  const hasCp = arrow.cpX !== undefined && arrow.cpY !== undefined;
  const cp = hasCp
    ? toCanvas(arrow.cpX!, arrow.cpY!, pitch, portrait)
    : { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

  const dash   = arrow.type === 'pass' ? [8, 6] : arrow.type === 'kick' ? [14, 7] : undefined;
  const width  = arrow.type === 'run' ? 3 : 2.5;
  const color  = arrow.color;

  // Tangent direction at end of quadratic bezier (for arrowhead angle)
  const endTanX = to.x - cp.x;
  const endTanY = to.y - cp.y;
  const endTanLen = Math.sqrt(endTanX * endTanX + endTanY * endTanY) || 1;
  const endAngle = Math.atan2(endTanY / endTanLen, endTanX / endTanLen);
  const ptrLen = 12;
  const arrowTipX = to.x - (endTanX / endTanLen) * 2;
  const arrowTipY = to.y - (endTanY / endTanLen) * 2;
  const arrowBaseX = arrowTipX - Math.cos(endAngle) * ptrLen;
  const arrowBaseY = arrowTipY - Math.sin(endAngle) * ptrLen;
  const ptrW = 8;
  const perpX = -Math.sin(endAngle) * ptrW / 2;
  const perpY =  Math.cos(endAngle) * ptrW / 2;

  return (
    <Group onClick={(e) => { e.cancelBubble = true; onSelect(); }}
           onTap={(e) => { e.cancelBubble = true; onSelect(); }}>
      {/* Hit-test backdrop */}
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          (ctx as unknown as CanvasRenderingContext2D).moveTo(from.x, from.y);
          (ctx as unknown as CanvasRenderingContext2D).quadraticCurveTo(cp.x, cp.y, to.x, to.y);
          ctx.strokeShape(shape);
        }}
        stroke="transparent" strokeWidth={14} listening={true}
      />
      {/* Selection glow */}
      {isSelected && (
        <Shape
          sceneFunc={(ctx, shape) => {
            ctx.beginPath();
            (ctx as unknown as CanvasRenderingContext2D).moveTo(from.x, from.y);
            (ctx as unknown as CanvasRenderingContext2D).quadraticCurveTo(cp.x, cp.y, to.x, to.y);
            ctx.strokeShape(shape);
          }}
          stroke="rgba(250,204,21,0.35)" strokeWidth={width + 6} listening={false}
        />
      )}
      {/* The curve */}
      <Shape
        sceneFunc={(ctx, shape) => {
          const context = ctx as unknown as CanvasRenderingContext2D;
          context.save();
          if (dash) {
            context.setLineDash(dash);
          }
          ctx.beginPath();
          context.moveTo(from.x, from.y);
          context.quadraticCurveTo(cp.x, cp.y, to.x, to.y);
          ctx.strokeShape(shape);
          context.restore();
        }}
        stroke={color} strokeWidth={width} opacity={isSelected ? 1 : 0.85}
        listening={false}
      />
      {/* Arrowhead triangle */}
      <Shape
        sceneFunc={(ctx) => {
          const context = ctx as unknown as CanvasRenderingContext2D;
          context.beginPath();
          context.moveTo(arrowTipX, arrowTipY);
          context.lineTo(arrowBaseX + perpX, arrowBaseY + perpY);
          context.lineTo(arrowBaseX - perpX, arrowBaseY - perpY);
          context.closePath();
          context.fillStyle = color;
          context.fill();
        }}
        listening={false}
      />

      {/* Bend handle — shown only when selected */}
      {isSelected && (
        <Circle
          x={cp.x} y={cp.y}
          radius={7}
          fill="rgba(250,204,21,0.9)" stroke="white" strokeWidth={1.5}
          draggable
          onDragMove={(e) => {
            const norm = toNorm(e.target.x(), e.target.y(), pitch, portrait);
            onCpDrag(norm.normX, norm.normY);
          }}
          onMouseEnter={(e) => { const s = e.target.getStage(); if (s) s.container().style.cursor = 'crosshair'; }}
          onMouseLeave={(e) => { const s = e.target.getStage(); if (s) s.container().style.cursor = 'default'; }}
        />
      )}
    </Group>
  );
}

// ─── In-progress arrow preview ────────────────────────────────────────────────

function DrawingPreview({ from, to, tool }: { from: { x: number; y: number }; to: { x: number; y: number }; tool: string }) {
  const dash  = tool === 'arrow-pass' ? [8, 6] : tool === 'arrow-kick' ? [14, 7] : undefined;
  const color = tool === 'arrow-kick' ? 'rgba(251,191,36,0.8)' : 'rgba(255,255,255,0.6)';
  const width = tool === 'arrow-run' ? 3 : 2.5;
  return (
    <Arrow
      points={[from.x, from.y, to.x, to.y]}
      stroke={color} strokeWidth={width} fill={color}
      dash={dash} pointerLength={11} pointerWidth={8}
      opacity={0.75} listening={false}
    />
  );
}

// ─── Main canvas component ────────────────────────────────────────────────────

export default function RugbyCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const [drawingFrom, setDrawingFrom] = useState<{ x: number; y: number } | null>(null);
  const [drawingTo,   setDrawingTo]   = useState<{ x: number; y: number } | null>(null);

  const isPanningRef  = useRef(false);
  const panMovedRef   = useRef(false);
  const panStartRef   = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const spaceDownRef  = useRef(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  const {
    scenes, currentSceneId,
    selectedActorId, selectedArrowId, selectedZoneId,
    setSelectedActor, setSelectedArrow, setSelectedZone,
    updateActorPosition,
    addPlayArrow, deletePlayArrow, updateArrowCp,
    addZone, updateZonePosition,
    showMovementArrows, showPlayerNames, orientation, pitchScale, actorScale, transitionDuration,
    selectedTool,
    panX, panY,
  } = useEditorStore();

  const portrait = orientation === 'portrait';
  const actorR = BASE_ACTOR_R * actorScale;

  const currentScene = scenes.find((s) => s.id === currentSceneId);
  const actors = currentScene?.actors ?? [];
  const currentIdx = scenes.findIndex((s) => s.id === currentSceneId);
  const prevScene = currentIdx > 0 ? scenes[currentIdx - 1] : null;

  // ── Smooth animation ──────────────────────────────────────────────────────
  const [displayActors, setDisplayActors] = useState<AnimatedActor[]>(actors.map(a => ({ ...a, _opacity: 1 })));
  const displayActorsRef = useRef<AnimatedActor[]>(actors.map(a => ({ ...a, _opacity: 1 })));
  const prevActorsRef = useRef<Actor[]>(actors);
  const animRef = useRef<number | null>(null);
  const prevSceneIdRef = useRef<string>(currentSceneId);

  const updateDisplay = useCallback((next: AnimatedActor[]) => {
    displayActorsRef.current = next;
    setDisplayActors(next);
  }, []);

  useEffect(() => {
    const sceneChanged = prevSceneIdRef.current !== currentSceneId;
    prevSceneIdRef.current = currentSceneId;
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (!sceneChanged) { updateDisplay(actors.map(a => ({ ...a, _opacity: 1 }))); prevActorsRef.current = actors; return; }
    const fromActors = prevActorsRef.current;
    prevActorsRef.current = actors;
    const leavingActors = fromActors.filter(f => !actors.find(a => a.id === f.id));
    const start = performance.now();
    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / (transitionDuration || 1));
      const t = easeInOutCubic(raw);
      const lerped: AnimatedActor[] = [
        ...actors.map((actor) => {
          const f = fromActors.find(a => a.id === actor.id);
          return f
            ? { ...actor, normX: f.normX + (actor.normX - f.normX) * t, normY: f.normY + (actor.normY - f.normY) * t, _opacity: 1 }
            : { ...actor, _opacity: t };
        }),
        ...(raw < 1 ? leavingActors.map(a => ({ ...a, _opacity: 1 - t })) : []),
      ];
      updateDisplay(lerped);
      if (raw < 1) { animRef.current = requestAnimationFrame(tick); } else { animRef.current = null; }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, actors, transitionDuration]);

  // ── Measure container ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setSize({ width: el.offsetWidth, height: el.offsetHeight }));
    obs.observe(el);
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => obs.disconnect();
  }, []);

  const pitch = size.width > 0 ? computePitch(size.width, size.height, pitchScale, portrait, panX, panY) : null;

  // ── Movement arrows ───────────────────────────────────────────────────────
  const { movementArrows, ghostActors } = useMemo(() => {
    if (!pitch || !prevScene || !showMovementArrows) return { movementArrows: [], ghostActors: [] };
    const arrows: MovArrow[] = [];
    const ghosts: Actor[] = [];
    for (const actor of actors) {
      const prev = prevScene.actors.find((a) => a.id === actor.id);
      if (!prev) continue;
      const moved = Math.abs(actor.normX - prev.normX) > 0.005 || Math.abs(actor.normY - prev.normY) > 0.005;
      if (!moved) continue;
      const from = toCanvas(prev.normX, prev.normY, pitch, portrait);
      const to   = toCanvas(actor.normX, actor.normY, pitch, portrait);
      const color = actor.team === 'home' ? '#93c5fd' : actor.team === 'away' ? '#fca5a5' : '#fcd34d';
      arrows.push({ id: actor.id, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, color });
      ghosts.push(prev);
    }
    return { movementArrows: arrows, ghostActors: ghosts };
  }, [actors, prevScene, pitch, showMovementArrows, portrait]);

  const isArrowTool = selectedTool.startsWith('arrow-');
  const isZoneTool  = selectedTool === 'zone';
  const sceneArrows = currentScene?.arrows ?? [];
  const sceneZones  = currentScene?.zones  ?? [];

  // ── Pointer helpers (shared between mouse and touch) ──────────────────────
  const startDraw = useCallback((x: number, y: number) => {
    if ((!isArrowTool && !isZoneTool) || !pitch) return;
    setDrawingFrom({ x, y });
    setDrawingTo({ x, y });
  }, [isArrowTool, isZoneTool, pitch]);

  const moveDraw = useCallback((x: number, y: number) => {
    if (!drawingFrom) return;
    setDrawingTo({ x, y });
  }, [drawingFrom]);

  const endDraw = useCallback((x: number, y: number) => {
    if (!drawingFrom || !pitch) { setDrawingFrom(null); setDrawingTo(null); return; }
    const dx = x - drawingFrom.x; const dy = y - drawingFrom.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 15) {
      if (isArrowTool) {
        const from = toNorm(drawingFrom.x, drawingFrom.y, pitch, portrait);
        const to   = toNorm(x, y, pitch, portrait);
        addPlayArrow(selectedTool.replace('arrow-', '') as import('../../lib/types').ArrowDrawType, from.normX, from.normY, to.normX, to.normY);
      } else if (isZoneTool) {
        const x1 = Math.min(drawingFrom.x, x); const y1 = Math.min(drawingFrom.y, y);
        const x2 = Math.max(drawingFrom.x, x); const y2 = Math.max(drawingFrom.y, y);
        const tl = toNorm(x1, y1, pitch, portrait);
        const br = toNorm(x2, y2, pitch, portrait);
        addZone('rect', tl.normX, tl.normY, br.normX - tl.normX, br.normY - tl.normY);
      }
    }
    setDrawingFrom(null);
    setDrawingTo(null);
  }, [drawingFrom, pitch, portrait, addPlayArrow, addZone, selectedTool, isArrowTool, isZoneTool]);

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const isBackground = e.target === e.target.getStage();
    const startPan = spaceDownRef.current || (isBackground && !isArrowTool && !isZoneTool);
    if (startPan && pitch) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const { panX: px, panY: py } = useEditorStore.getState();
        isPanningRef.current = true;
        panMovedRef.current  = false;
        panStartRef.current  = { mouseX: pos.x, mouseY: pos.y, panX: px, panY: py };
        if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
        return;
      }
    }
    if (!isArrowTool || !pitch) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) startDraw(pos.x, pos.y);
  }, [isArrowTool, isZoneTool, pitch, startDraw]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanningRef.current && pitch) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const dx = pos.x - panStartRef.current.mouseX;
        const dy = pos.y - panStartRef.current.mouseY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) panMovedRef.current = true;
        const clamped = clampPan(
          panStartRef.current.panX + dx,
          panStartRef.current.panY + dy,
          pitch.width, pitch.height,
        );
        useEditorStore.getState().setPan(clamped.x, clamped.y);
      }
      return;
    }
    if (!drawingFrom || !pitch) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) moveDraw(pos.x, pos.y);
  }, [drawingFrom, pitch, moveDraw]);

  const handleStageMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (containerRef.current) {
        containerRef.current.style.cursor = spaceDownRef.current ? 'grab' : 'default';
      }
      if (!panMovedRef.current) {
        setSelectedActor(null); setSelectedArrow(null); setSelectedZone(null);
      }
      return;
    }
    const pos = e.target.getStage()?.getPointerPosition();
    endDraw(pos?.x ?? drawingFrom?.x ?? 0, pos?.y ?? drawingFrom?.y ?? 0);
  }, [drawingFrom, endDraw, setSelectedActor, setSelectedArrow, setSelectedZone]);

  // ── Touch handlers ────────────────────────────────────────────────────────
  const getTouchPos = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return null;
    const touch = e.evt.touches[0] ?? e.evt.changedTouches[0];
    if (!touch) return null;
    const rect = stage.container().getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const handleStageTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (!isArrowTool || !pitch) return;
    e.evt.preventDefault();
    const pos = getTouchPos(e);
    if (pos) startDraw(pos.x, pos.y);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArrowTool, pitch, startDraw]);

  const handleStageTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (!drawingFrom) return;
    e.evt.preventDefault();
    const pos = getTouchPos(e);
    if (pos) moveDraw(pos.x, pos.y);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawingFrom, moveDraw]);

  const handleStageTouchEnd = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const pos = getTouchPos(e);
    endDraw(pos?.x ?? drawingFrom?.x ?? 0, pos?.y ?? drawingFrom?.y ?? 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawingFrom, endDraw]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isArrowTool || isZoneTool) return;
    if (e.target === e.currentTarget) { setSelectedActor(null); setSelectedArrow(null); setSelectedZone(null); }
  }, [isArrowTool, isZoneTool, setSelectedActor, setSelectedArrow, setSelectedZone]);

  // ── Export PNG ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const filename = (e as CustomEvent<{ filename: string }>).detail?.filename ?? 'rugby-play.png';
      const stage = stageRef.current;
      if (!stage) return;
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
    };
    window.addEventListener('export-png', handler);
    return () => window.removeEventListener('export-png', handler);
  }, []);

  // ── Spacebar hold tracking (for spacebar+drag pan) ───────────────────────
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement;
      return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || (el as HTMLElement)?.isContentEditable;
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        spaceDownRef.current = true;
        setIsSpaceHeld(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        setIsSpaceHeld(false);
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // ── Wheel: zoom (Ctrl/Cmd+scroll or pinch) or pan (2-finger scroll) ──────
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    if (!pitch) return;
    const { pitchScale: s, panX: px, panY: py, setPitchScale: setScale, setPan: setP } = useEditorStore.getState();
    const pointer = stageRef.current?.getPointerPosition();

    if (e.evt.ctrlKey || e.evt.metaKey) {
      // Pinch-to-zoom or Ctrl/Cmd+scroll — anchor zoom to cursor position
      const factor = -e.evt.deltaY > 0 ? 1.08 : 1 / 1.08;
      const newS   = Math.max(1.0, Math.min(3.0, s * factor));
      if (pointer && newS !== s) {
        const newPx = (pointer.x - size.width  / 2) * (1 - newS / s) + px * (newS / s);
        const newPy = (pointer.y - size.height / 2) * (1 - newS / s) + py * (newS / s);
        const clamped = clampPan(newPx, newPy, pitch.width * (newS / s), pitch.height * (newS / s));
        setP(clamped.x, clamped.y);
      }
      setScale(newS);
    } else {
      // Two-finger scroll — pan
      const clamped = clampPan(px - e.evt.deltaX, py - e.evt.deltaY, pitch.width, pitch.height);
      setP(clamped.x, clamped.y);
    }
  }, [pitch, size]);

  const cursor = isPanningRef.current ? 'grabbing'
    : isSpaceHeld ? 'grab'
    : (isArrowTool || isZoneTool) ? 'crosshair'
    : 'default';

  return (
    <div ref={containerRef} className="w-full h-full" style={{ cursor }}>
      {size.width > 0 && pitch && (
        <Stage
          ref={stageRef}
          width={size.width} height={size.height}
          onClick={handleStageClick}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onTouchStart={handleStageTouchStart}
          onTouchMove={handleStageTouchMove}
          onTouchEnd={handleStageTouchEnd}
          onWheel={handleWheel}
          style={{ background: 'var(--color-background)' }}
        >
          <Layer listening={false}>
            <PitchBackground pitch={pitch} portrait={portrait} />
          </Layer>

          {showMovementArrows && (
            <Layer listening={false}>
              {ghostActors.map((a) => (
                <GhostActor key={`ghost-${a.id}`} actor={a} pitch={pitch} portrait={portrait} actorR={actorR} />
              ))}
              <MovementArrows arrows={movementArrows} actorR={actorR} />
            </Layer>
          )}

          {/* Zones layer */}
          <Layer>
            {sceneZones.map((zone) => {
              const tl = toCanvas(zone.normX, zone.normY, pitch, portrait);
              const br = toCanvas(zone.normX + zone.normW, zone.normY + zone.normH, pitch, portrait);
              const zx = Math.min(tl.x, br.x); const zy = Math.min(tl.y, br.y);
              const zw = Math.abs(br.x - tl.x);  const zh = Math.abs(br.y - tl.y);
              const fill = zone.color.replace(/[\d.]+\)$/, `${zone.opacity})`);
              const isSelZone = zone.id === selectedZoneId;
              const cx = zx + zw / 2; const cy = zy + zh / 2;
              return (
                <Group key={zone.id}
                  onClick={(e) => { e.cancelBubble = true; setSelectedZone(zone.id); setSelectedActor(null); setSelectedArrow(null); }}
                  onTap={(e)   => { e.cancelBubble = true; setSelectedZone(zone.id); setSelectedActor(null); setSelectedArrow(null); }}
                  draggable
                  onDragMove={(e) => {
                    const dx = e.target.x(); const dy = e.target.y();
                    const newTl = toNorm(zx + dx, zy + dy, pitch, portrait);
                    updateZonePosition(zone.id, newTl.normX, newTl.normY);
                    e.target.position({ x: 0, y: 0 });
                  }}
                  onMouseEnter={(e) => { const s = e.target.getStage(); if (s) s.container().style.cursor = 'move'; }}
                  onMouseLeave={(e) => { const s = e.target.getStage(); if (s) s.container().style.cursor = cursor; }}
                >
                  {isSelZone && (
                    <Rect x={zx - 3} y={zy - 3} width={zw + 6} height={zh + 6}
                      stroke="rgba(250,204,21,0.45)" strokeWidth={1.5} dash={[4, 3]} fill="transparent" cornerRadius={4} listening={false} />
                  )}
                  {zone.shape === 'rect'
                    ? <Rect x={zx} y={zy} width={zw} height={zh} fill={fill} stroke={zone.color} strokeWidth={isSelZone ? 2 : 1.2} dash={isSelZone ? undefined : [6, 4]} cornerRadius={3} />
                    : <Ellipse x={cx} y={cy} radiusX={zw / 2} radiusY={zh / 2} fill={fill} stroke={zone.color} strokeWidth={isSelZone ? 2 : 1.2} dash={isSelZone ? undefined : [6, 4]} />
                  }
                  {zone.label ? (
                    <Text x={zx + 6} y={zy + 5} text={zone.label}
                      fontSize={11} fill={zone.color} fontStyle="bold" listening={false} />
                  ) : null}
                </Group>
              );
            })}
            {/* Zone drawing preview */}
            {isZoneTool && drawingFrom && drawingTo && (
              <Rect
                x={Math.min(drawingFrom.x, drawingTo.x)} y={Math.min(drawingFrom.y, drawingTo.y)}
                width={Math.abs(drawingTo.x - drawingFrom.x)} height={Math.abs(drawingTo.y - drawingFrom.y)}
                fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.45)"
                strokeWidth={1.5} dash={[6, 4]} cornerRadius={3} listening={false}
              />
            )}
          </Layer>

          <Layer>
            {sceneArrows.map((arrow) => (
              <DrawnArrow
                key={arrow.id}
                arrow={arrow}
                pitch={pitch}
                portrait={portrait}
                isSelected={arrow.id === selectedArrowId}
                onSelect={() => { setSelectedArrow(arrow.id); setSelectedActor(null); }}
                onCpDrag={(cpX, cpY) => updateArrowCp(arrow.id, cpX, cpY)}
              />
            ))}
            {drawingFrom && drawingTo && (
              <DrawingPreview from={drawingFrom} to={drawingTo} tool={selectedTool} />
            )}
          </Layer>

          <Layer>
            {displayActors.map((actor) => (
              <ActorShape
                key={actor.id}
                actor={actor}
                pitch={pitch}
                portrait={portrait}
                actorR={actorR}
                isSelected={actor.id === selectedActorId}
                showPlayerNames={showPlayerNames}
                opacity={(actor as AnimatedActor)._opacity ?? 1}
                onSelect={() => { setSelectedActor(actor.id); setSelectedArrow(null); }}
                onDragEnd={(normX, normY) => updateActorPosition(actor.id, normX, normY)}
              />
            ))}
            {displayActors.length === 0 && sceneArrows.length === 0 && (
              <Text
                x={pitch.x + 20} y={pitch.y + pitch.height / 2 - 10}
                width={pitch.width - 40}
                text="Add players from the left sidebar to start building your play"
                fontSize={12} fill="rgba(255,255,255,0.18)" fontStyle="italic"
                align="center" listening={false}
              />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
