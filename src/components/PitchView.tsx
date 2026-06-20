import { useGameStore } from '../store/gameStore';
import type { SquadSlot } from '../types';

function overallColor(ovr: number): string {
  if (ovr >= 85) return '#ffd700';
  if (ovr >= 75) return '#4caf50';
  if (ovr >= 65) return '#2196f3';
  if (ovr >= 55) return '#ff9800';
  return '#9e9e9e';
}

interface MarkerProps {
  slot: SquadSlot;
  index: number;
  side: 'home' | 'away';
  flipped?: boolean;
}

function PlayerMarker({ slot, index, side, flipped }: MarkerProps) {
  const openModal = useGameStore((s) => s.openModal);
  const p = slot.player;

  const xPct = slot.formation.x;
  const yPct = flipped ? 100 - slot.formation.y : slot.formation.y;

  const label = slot.formation.label;
  const color = p ? overallColor(p.overall) : '#555';

  const shortName = p
    ? p.name.split(' ').slice(-1)[0].substring(0, 8)
    : '???';

  return (
    <div
      className={`player-marker player-marker--${side}`}
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
      onClick={() => openModal(side, index)}
      title={p ? `${p.name} (${p.overall})` : label}
    >
      <div className="player-marker__circle" style={{ borderColor: color }}>
        <span className="player-marker__label">{label}</span>
      </div>
      <div className="player-marker__name">{shortName}</div>
      {p && <div className="player-marker__ovr" style={{ color }}>{p.overall}</div>}
    </div>
  );
}

export function PitchView() {
  const homeSquad = useGameStore((s) => s.homeSquad);
  const awaySquad = useGameStore((s) => s.awaySquad);
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const teams = useGameStore((s) => s.teams);

  return (
    <div className="pitch-wrapper">
      <div className="pitch-match-header">
        <span className="pitch-team-name">{teams[homeCode]?.flag} {teams[homeCode]?.name}</span>
        <span className="pitch-vs">VS</span>
        <span className="pitch-team-name">{teams[awayCode]?.flag} {teams[awayCode]?.name}</span>
      </div>
      <div className="pitch">
        {/* Pitch markings */}
        <div className="pitch-center-circle" />
        <div className="pitch-center-line" />
        <div className="pitch-penalty-home" />
        <div className="pitch-penalty-away" />
        <div className="pitch-goal-home" />
        <div className="pitch-goal-away" />

        {/* Home team (top half) */}
        {homeSquad.map((slot, i) => (
          <PlayerMarker key={`home-${i}`} slot={slot} index={i} side="home" flipped={false} />
        ))}

        {/* Away team (bottom half, flipped) */}
        {awaySquad.map((slot, i) => (
          <PlayerMarker key={`away-${i}`} slot={slot} index={i} side="away" flipped={true} />
        ))}
      </div>
    </div>
  );
}
