import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Player } from '../types';

function overallColor(ovr: number): string {
  if (ovr >= 85) return '#ffd700';
  if (ovr >= 75) return '#4caf50';
  if (ovr >= 65) return '#2196f3';
  if (ovr >= 55) return '#ff9800';
  return '#9e9e9e';
}

function positionLabel(pos: string): string {
  switch (pos) {
    case 'GK': return 'Portero';
    case 'DEF': return 'Defensa';
    case 'MID': return 'Mediocampista';
    case 'FWD': return 'Delantero';
    default: return pos;
  }
}

function playerStrengths(p: Player): string[] {
  const s: string[] = [];
  if (p.overall >= 85) s.push('Jugador de clase mundial');
  if (p.height >= 190) s.push('Excelente poder aéreo');
  if (p.caps >= 100) s.push('Gran experiencia internacional');
  if (p.goals >= 20 && p.position === 'FWD') s.push('Goleador prolífico');
  if (p.goals >= 10 && p.position === 'MID') s.push('Mediocampista con llegada al gol');
  if (p.goals >= 5 && p.position === 'DEF') s.push('Defensa con peligro a balón parado');
  if (p.weight <= 70 && p.height <= 175) s.push('Ágil y rápido');
  if (p.age <= 23) s.push('Joven con gran proyección');
  if (p.age >= 32 && p.caps >= 80) s.push('Veterano y referente del grupo');
  return s;
}

function playerWeaknesses(p: Player): string[] {
  const w: string[] = [];
  if (p.overall < 65) w.push('Nivel limitado en comparación con titulares de elite');
  if (p.height < 172 && p.position === 'DEF') w.push('Puede estar en desventaja en duelos aéreos');
  if (p.caps < 10) w.push('Poca experiencia con la selección');
  if (p.age >= 35) w.push('Posible declive físico en partidos exigentes');
  if (p.goals === 0 && p.position === 'FWD' && p.caps > 15) w.push('Bajo rendimiento goleador');
  return w;
}

export function PlayerModal() {
  const modal = useGameStore((s) => s.activeModal);
  const homeSquad = useGameStore((s) => s.homeSquad);
  const awaySquad = useGameStore((s) => s.awaySquad);
  const teams = useGameStore((s) => s.teams);
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const swapPlayer = useGameStore((s) => s.swapPlayer);
  const closeModal = useGameStore((s) => s.closeModal);
  const [tab, setTab] = useState<'info' | 'bench'>('info');

  if (!modal) return null;

  const { side, slotIndex } = modal;
  const squad = side === 'home' ? homeSquad : awaySquad;
  const teamCode = side === 'home' ? homeCode : awayCode;
  const team = teams[teamCode];
  const slot = squad[slotIndex];
  const current = slot?.player;

  if (!current || !team) return null;

  const strengths = playerStrengths(current);
  const weaknesses = playerWeaknesses(current);

  // Bench: all players not in starting XI
  const startingIds = new Set(squad.map((s) => s.player?.id).filter(Boolean));
  const bench = team.players.filter((p) => !startingIds.has(p.id));

  const color = overallColor(current.overall);

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={closeModal}>✕</button>

        <div className="modal__header" style={{ borderColor: color }}>
          <div className="modal__ovr-badge" style={{ backgroundColor: color }}>
            {current.overall}
          </div>
          <div className="modal__player-info">
            <h2 className="modal__player-name">{current.name}</h2>
            <div className="modal__player-meta">
              <span className="modal__pos-tag" style={{ borderColor: color }}>{positionLabel(current.position)}</span>
              <span>{team.flag} {team.name}</span>
            </div>
          </div>
        </div>

        <div className="modal__tabs">
          <button
            className={`modal__tab ${tab === 'info' ? 'modal__tab--active' : ''}`}
            onClick={() => setTab('info')}
          >
            Datos
          </button>
          <button
            className={`modal__tab ${tab === 'bench' ? 'modal__tab--active' : ''}`}
            onClick={() => setTab('bench')}
          >
            Banquillo ({bench.length})
          </button>
        </div>

        {tab === 'info' && (
          <div className="modal__body">
            <div className="modal__stats-grid">
              <div className="modal__stat">
                <span className="modal__stat-label">Edad</span>
                <span className="modal__stat-value">{current.age} años</span>
              </div>
              <div className="modal__stat">
                <span className="modal__stat-label">Club</span>
                <span className="modal__stat-value">{current.club}</span>
              </div>
              <div className="modal__stat">
                <span className="modal__stat-label">Estatura</span>
                <span className="modal__stat-value">{current.height} cm</span>
              </div>
              <div className="modal__stat">
                <span className="modal__stat-label">Peso</span>
                <span className="modal__stat-value">{current.weight} kg</span>
              </div>
              <div className="modal__stat">
                <span className="modal__stat-label">Partidos Selección</span>
                <span className="modal__stat-value">{current.caps}</span>
              </div>
              <div className="modal__stat">
                <span className="modal__stat-label">Goles Selección</span>
                <span className="modal__stat-value">{current.goals}</span>
              </div>
            </div>

            {strengths.length > 0 && (
              <div className="modal__section">
                <h4 className="modal__section-title modal__section-title--green">💪 Fortalezas</h4>
                <ul className="modal__list modal__list--green">
                  {strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div className="modal__section">
                <h4 className="modal__section-title modal__section-title--red">⚠️ Debilidades</h4>
                <ul className="modal__list modal__list--red">
                  {weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'bench' && (
          <div className="modal__bench">
            <p className="modal__bench-hint">Haz clic en un jugador para sustituir a <strong>{current.name}</strong></p>
            <div className="bench-list">
              {bench.map((p) => (
                <div
                  key={p.id}
                  className="bench-item"
                  onClick={() => swapPlayer(side, slotIndex, p)}
                >
                  <span className="bench-item__pos">{positionLabel(p.position)}</span>
                  <span className="bench-item__name">{p.name}</span>
                  <div className="bench-item__right">
                    <span className="bench-item__club">{p.club}</span>
                    <span
                      className="bench-item__ovr"
                      style={{ color: overallColor(p.overall) }}
                    >
                      {p.overall}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
