import type { CSSProperties } from 'react';
import type { ArcadeRank } from '../../data/arcadeConfig';

interface Props {
  rank: ArcadeRank;
  size?: number;
  className?: string;
}

// A hexagonal crest whose finish escalates by tier (glow → shimmer → energy ring →
// lightning + fire). Pure SVG + CSS so it stays crisp at any size and animates cheaply.
// The rank colours flow in through CSS custom properties so one component covers all 8.
export function ArcadeRankBadge({ rank, size = 72, className }: Props) {
  const gid = `rankgrad-${rank.id}`;
  const rimId = `rankrim-${rank.id}`;

  const style = {
    width: size,
    height: size,
    '--rank-c': rank.color,
    '--rank-c2': rank.color2,
    '--rank-glow': rank.glow,
  } as CSSProperties;

  return (
    <div
      className={`pk-rank-badge pk-rank-badge--t${rank.tier}${className ? ` ${className}` : ''}`}
      style={style}
      aria-label={`Rango ${rank.name}`}
    >
      <span className="pk-rank-badge__aura" aria-hidden="true" />
      <span className="pk-rank-badge__ring" aria-hidden="true" />
      <svg viewBox="0 0 100 100" width={size} height={size} className="pk-rank-badge__svg">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor={rank.color} />
            <stop offset="1" stopColor={rank.color2} />
          </linearGradient>
          <linearGradient id={rimId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="0.5" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.42)" />
          </linearGradient>
        </defs>
        {/* metallic rim */}
        <polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" fill={`url(#${rimId})`} />
        {/* coloured crest */}
        <polygon points="50,10 84,30 84,70 50,90 16,70 16,30" fill={`url(#${gid})`} />
        <polygon points="50,10 84,30 84,70 50,90 16,70 16,30" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.4" />
        {/* star emblem */}
        <path
          className="pk-rank-badge__star"
          d="M50 28 L57.5 45 L76 45 L61 56 L66.5 74 L50 63 L33.5 74 L39 56 L24 45 L42.5 45 Z"
          fill="rgba(255,255,255,0.94)"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.6"
        />
      </svg>
      <span className="pk-rank-badge__shine" aria-hidden="true" />
      {rank.tier >= 8 && <span className="pk-rank-badge__bolts" aria-hidden="true" />}
    </div>
  );
}
