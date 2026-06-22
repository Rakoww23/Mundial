import { useGameStore } from '../store/gameStore';
import { TeamFlag } from './TeamFlag';
import type { SquadSlot } from '../types';

function overallColor(ovr: number): string {
  if (ovr >= 85) return '#ffd700';
  if (ovr >= 75) return '#4caf50';
  if (ovr >= 65) return '#2196f3';
  if (ovr >= 55) return '#ff9800';
  return '#9e9e9e';
}

const MIN_DIST = 9;
const MAX_ITER = 30;

interface Bounds { minX: number; maxX: number; minY: number; maxY: number; }

function deCollide(
  positions: { x: number; y: number }[],
  bounds: Bounds = { minX: 3, maxX: 97, minY: 3, maxY: 97 },
): { x: number; y: number }[] {
  const pos = positions.map((p) => ({ ...p }));
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let moved = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MIN_DIST && dist > 0.001) {
          const push = (MIN_DIST - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          pos[i].x -= nx * push * 0.5;
          pos[i].y -= ny * push * 0.5;
          pos[j].x += nx * push * 0.5;
          pos[j].y += ny * push * 0.5;
          pos[i].x = Math.max(bounds.minX, Math.min(bounds.maxX, pos[i].x));
          pos[i].y = Math.max(bounds.minY, Math.min(bounds.maxY, pos[i].y));
          pos[j].x = Math.max(bounds.minX, Math.min(bounds.maxX, pos[j].x));
          pos[j].y = Math.max(bounds.minY, Math.min(bounds.maxY, pos[j].y));
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return pos;
}

interface MarkerProps {
  slot: SquadSlot;
  index: number;
  side: 'home' | 'away';
  x: number;
  y: number;
}

function PlayerMarker({ slot, index, side, x, y }: MarkerProps) {
  const openModal  = useGameStore((s) => s.openModal);
  const matchState = useGameStore((s) => s.matchState);
  const wcState    = useGameStore((s) => s.wcState);
  const homeCode   = useGameStore((s) => s.homeCode);
  const p = slot.player;

  const isWcMatch     = !!wcState?.pendingMatch;
  const userSide      = isWcMatch ? (wcState!.userTeam === homeCode ? 'home' : 'away') : null;
  const isRivalMarker = isWcMatch && side !== userSide;

  const label = slot.formation.label;
  const color = p ? overallColor(p.overall) : '#555';
  const shortName = p ? p.name.split(' ').slice(-1)[0].substring(0, 8) : '???';

  const suspended = p && matchState?.playerStatuses[p.id] === 'suspended';
  const booked    = p && matchState?.playerStatuses[p.id] === 'booked';

  return (
    <div
      // Use player ID as key anchor so CSS transitions animate position when formation changes
      className={`player-marker player-marker--${side}${suspended ? ' player-marker--suspended' : ''}${isRivalMarker ? ' player-marker--rival' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={isRivalMarker ? undefined : () => openModal(side, index)}
      title={p ? `${p.name} (${p.overall})` : label}
    >
      <div className="player-marker__circle" style={{ borderColor: suspended ? '#555' : color }}>
        <span className="player-marker__label">{label}</span>
        {booked    && <span className="player-marker__card player-marker__card--yellow" />}
        {suspended && <span className="player-marker__card player-marker__card--red" />}
      </div>
      <div className="player-marker__name" style={{ opacity: suspended ? 0.35 : 1 }}>{shortName}</div>
      {p && <div className="player-marker__ovr" style={{ color: suspended ? '#555' : color }}>{p.overall}</div>}
    </div>
  );
}

export function PitchView() {
  const homeSquad = useGameStore((s) => s.homeSquad);
  const awaySquad = useGameStore((s) => s.awaySquad);
  const homeCode  = useGameStore((s) => s.homeCode);
  const awayCode  = useGameStore((s) => s.awayCode);
  const teams     = useGameStore((s) => s.teams);

  const SPAN = 72;
  const homeRaw = homeSquad.map((s) => ({
    x: s.formation.x,
    y: 3 + (s.formation.y - 8) * 45 / SPAN,
  }));
  const awayRaw = awaySquad.map((s) => {
    const mirroredY = 100 - s.formation.y;
    return { x: s.formation.x, y: 52 + (mirroredY - 20) * 45 / SPAN };
  });

  const homeBounds: Bounds = { minX: 3, maxX: 97, minY: 2, maxY: 49 };
  const awayBounds: Bounds = { minX: 3, maxX: 97, minY: 51, maxY: 98 };
  const homePos = deCollide(homeRaw, homeBounds);
  const awayPos = deCollide(awayRaw, awayBounds);

  return (
    <div className="pitch-wrapper" data-tut="sim-pitch">
      <div className="pitch-match-header">
        <span className="pitch-team-name">
          <TeamFlag code={homeCode} size={16} style={{ marginRight: 6 }} />
          {teams[homeCode]?.name}
        </span>
        <span className="pitch-vs">VS</span>
        <span className="pitch-team-name">
          {teams[awayCode]?.name}
          <TeamFlag code={awayCode} size={16} style={{ marginLeft: 6 }} />
        </span>
      </div>
      <div className="pitch">
        <div className="pitch-center-circle" />
        <div className="pitch-center-line" />
        <div className="pitch-penalty-home" />
        <div className="pitch-penalty-away" />
        <div className="pitch-goal-home" />
        <div className="pitch-goal-away" />

        {homeSquad.map((slot, i) => (
          <PlayerMarker
            key={`home-${slot.player?.id ?? i}`}
            slot={slot} index={i} side="home"
            x={homePos[i].x} y={homePos[i].y}
          />
        ))}
        {awaySquad.map((slot, i) => (
          <PlayerMarker
            key={`away-${slot.player?.id ?? i}`}
            slot={slot} index={i} side="away"
            x={awayPos[i].x} y={awayPos[i].y}
          />
        ))}
      </div>
    </div>
  );
}
