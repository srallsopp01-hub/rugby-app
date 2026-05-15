import type { Scene } from '../lib/types';

const W = 92;
const H = 58;
const LINES = [6 / 112, 28 / 112, 56 / 112, 84 / 112, 106 / 112];

export default function SceneThumbnail({
  scene,
  width = W,
  height = H,
}: {
  scene: Scene;
  width?: number | string;
  height?: number | string;
}) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      {/* Pitch */}
      <rect width={W} height={H} fill="#1e4d2b" />
      {/* In-goal areas */}
      <rect x={0} y={0} width={(6 / 112) * W} height={H} fill="#183d22" />
      <rect x={(106 / 112) * W} y={0} width={(6 / 112) * W} height={H} fill="#183d22" />
      {/* Lines */}
      {LINES.map((frac, i) => (
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
