import { useGameStore } from '../store/gameStore';
import type { SquadSlot } from '../types';

function overallColor(ovr: number): string {
  if (ovr >= 85) return '#ffd700';
  if (ovr >= 75) return '#4caf50';
  if (ovr >= 65) return '#2196f3';
  if (ovr >= 55) return '#ff9800';
  return '#9e9e9e';
}

// Resolve overlapping markers: if two markers are within MIN_DIST (in % units),
// push them apart radially until no overlaps remain.
const MIN_DIST = 9; // percent
const MAX_ITER = 30;

function deCollide(positions: { x: number; y: number }[]): { x: number; y: number }[] {
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
          // Clamp to pitch bounds
          pos[i].x = Math.max(3, Math.min(97, pos[i].x));
          pos[i].y = Math.max(3, Math.min(97, pos[i].y));
          pos[j].x = Math.max(3, Math.min(97, pos[j].x));
          pos[j].y = Math.max(3, Math.min(97, pos[j].y));
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
  const openModal = useGameStore((s) => s.openModal);
  const matchState = useGameStore((s) => s.matchState);
  const p = slot.player;

  const label = slot.formation.label;
  const color = p ? overallColor(p.overall) : '#555';
  const shortName = p ? p.name.split(' ').slice(-1)[0].substring(0, 8) : '???';

  const suspended = p && matchState?.playerStatuses[p.id] === 'suspended';
  const booked = p && matchState?.playerStatuses[p.id] === 'booked';

  return (
    <div
      className={`player-marker player-marker--${side}${suspended ? ' player-marker--suspended' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={() => openModal(side, index)}
      title={p ? `${p.name} (${p.overall})` : label}
    >
      <div className="player-marker__circle" style={{ borderColor: suspended ? '#555' : color }}>
        <span className="player-marker__label">{label}</span>
        {booked && <span className="player-marker__card player-marker__card--yellow" />}
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
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const teams = useGameStore((s) => s.teams);

  // Compute raw positions
  const homeRaw = homeSquad.map((s) => ({ x: s.formation.x, y: s.formation.y }));
  const awayRaw = awaySquad.map((s) => ({ x: s.formation.x, y: 100 - s.formation.y }));

  // De-collide each half separately (they never overlap since they're on opposite halves)
  const homePos = deCollide(homeRaw);
  const awayPos = deCollide(awayRaw);

  return (
    <div className="pitch-wrapper">
      <div className="pitch-match-header">
        <span className="pitch-team-name">{teams[homeCode]?.flag} {teams[homeCode]?.name}</span>
        <span className="pitch-vs">VS</span>
        <span className="pitch-team-name">{teams[awayCode]?.flag} {teams[awayCode]?.name}</span>
      </div>
      <div className="pitch">
        <div className="pitch-center-circle" />
        <div className="pitch-center-line" />
        <div className="pitch-penalty-home" />
        <div className="pitch-penalty-away" />
        <div className="pitch-goal-home" />
        <div className="pitch-goal-away" />

        {homeSquad.map((slot, i) => (
          <PlayerMarker key={`home-${i}`} slot={slot} index={i} side="home" x={homePos[i].x} y={homePos[i].y} />
        ))}
        {awaySquad.map((slot, i) => (
          <PlayerMarker key={`away-${i}`} slot={slot} index={i} side="away" x={awayPos[i].x} y={awayPos[i].y} />
        ))}
      </div>
    </div>
  );
}
