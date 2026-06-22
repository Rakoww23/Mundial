import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { IcoCheck, IcoWarning, IcoStar } from './Icons';
import { TeamFlag } from './TeamFlag';
import type { Player } from '../types';

// ── Count-up hook ─────────────────────────────────────────────────────────────

const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useCountUp(target: number, delay: number = 0, duration: number = 520): number {
  const [value, setValue] = useState(REDUCED ? target : 0);

  useEffect(() => {
    if (REDUCED) { setValue(target); return; }
    setValue(0);
    let timer: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;
    const TICK = 16;
    const steps = Math.ceil(duration / TICK);
    let step = 0;

    timer = setTimeout(() => {
      interval = setInterval(() => {
        step++;
        const t = Math.min(step / steps, 1);
        // cubic ease-out: 1-(1-t)^3
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(eased * target));
        if (t >= 1) clearInterval(interval);
      }, TICK);
    }, delay);

    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [target, delay, duration]);

  return value;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function overallColor(ovr: number): string {
  if (ovr >= 85) return '#ffd700';
  if (ovr >= 75) return '#4caf50';
  if (ovr >= 65) return '#2196f3';
  if (ovr >= 55) return '#ff9800';
  return '#9e9e9e';
}

function positionLabel(pos: string): string {
  switch (pos) {
    case 'GK':  return 'Portero';
    case 'DEF': return 'Defensa';
    case 'MID': return 'Mediocampista';
    case 'FWD': return 'Delantero';
    default:    return pos;
  }
}

function playerStrengths(p: Player): string[] {
  const s: string[] = [];
  if (p.overall >= 85)                          s.push('Jugador de clase mundial');
  if (p.height >= 190)                          s.push('Excelente poder aéreo');
  if (p.caps >= 100)                            s.push('Gran experiencia internacional');
  if (p.goals >= 20 && p.position === 'FWD')   s.push('Goleador prolífico');
  if (p.goals >= 10 && p.position === 'MID')   s.push('Mediocampista con llegada al gol');
  if (p.goals >= 5  && p.position === 'DEF')   s.push('Defensa con peligro a balón parado');
  if (p.weight <= 70 && p.height <= 175)        s.push('Ágil y rápido');
  if (p.age <= 23)                              s.push('Joven con gran proyección');
  if (p.age >= 32 && p.caps >= 80)             s.push('Veterano y referente del grupo');
  return s;
}

function playerWeaknesses(p: Player): string[] {
  const w: string[] = [];
  if (p.overall < 65)                                     w.push('Nivel limitado vs titulares de elite');
  if (p.height < 172 && p.position === 'DEF')             w.push('En desventaja en duelos aéreos');
  if (p.caps < 10)                                         w.push('Poca experiencia con la selección');
  if (p.age >= 35)                                         w.push('Posible declive físico en partidos exigentes');
  if (p.goals === 0 && p.position === 'FWD' && p.caps > 15) w.push('Bajo rendimiento goleador');
  return w;
}

// ── Animated stat bar ─────────────────────────────────────────────────────────

interface StatBarProps {
  label: string;
  displayValue: string;
  pct: number;
  color: string;
  delay: number;
}

function StatBar({ label, displayValue, pct, color, delay }: StatBarProps) {
  // Extract leading number and trailing suffix ("83 partidos" → 83, " partidos")
  const match   = displayValue.match(/^(\d+)(.*)/);
  const rawNum  = match ? parseInt(match[1], 10) : null;
  const suffix  = match ? match[2] : '';
  const counted = useCountUp(rawNum ?? 0, delay);
  const animated = rawNum !== null ? `${counted}${suffix}` : displayValue;

  return (
    <div className="stat-bar">
      <div className="stat-bar__row">
        <span className="stat-bar__label">{label}</span>
        <span className="stat-bar__value" style={{ color }}>{animated}</span>
      </div>
      <div className="stat-bar__track">
        <div
          className="stat-bar__fill"
          style={
            {
              '--bar-pct': `${Math.min(pct, 100)}%`,
              '--bar-color': color,
              '--bar-delay': `${delay}ms`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlayerModal() {
  const modal       = useGameStore((s) => s.activeModal);
  const homeSquad   = useGameStore((s) => s.homeSquad);
  const awaySquad   = useGameStore((s) => s.awaySquad);
  const teams       = useGameStore((s) => s.teams);
  const homeCode    = useGameStore((s) => s.homeCode);
  const awayCode    = useGameStore((s) => s.awayCode);
  const swapPlayer  = useGameStore((s) => s.swapPlayer);
  const closeModal  = useGameStore((s) => s.closeModal);

  const [tab, setTab]         = useState<'info' | 'bench'>('info');
  const [isClosing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      closeModal();
    }, 210);
  }, [closeModal]);

  if (!modal) return null;

  const { side, slotIndex } = modal;
  const squad    = side === 'home' ? homeSquad : awaySquad;
  const teamCode = side === 'home' ? homeCode  : awayCode;
  const team     = teams[teamCode];
  const slot     = squad[slotIndex];
  const current  = slot?.player;

  if (!current || !team) return null;

  const sortedPlayers = [...team.players].sort((a, b) => b.overall - a.overall);
  const starIds       = new Set(sortedPlayers.slice(0, 3).map((p) => p.id));
  const isStar        = starIds.has(current.id);
  const starRank      = sortedPlayers.findIndex((p) => p.id === current.id) + 1;

  const strengths  = playerStrengths(current);
  const weaknesses = playerWeaknesses(current);

  const startingIds = new Set(squad.map((s) => s.player?.id).filter(Boolean));
  const bench       = team.players.filter((p) => !startingIds.has(p.id));
  const color       = isStar ? 'var(--gold)' : overallColor(current.overall);

  // stat bars
  const ovrPct       = current.overall;
  const capsPct      = Math.min((current.caps / 150) * 100, 100);
  const goalsPct     = Math.min((current.goals / 80) * 100, 100);
  const heightPct    = Math.min(((current.height - 165) / 40) * 100, 100);
  const agePct       = Math.max(0, 100 - Math.abs(current.age - 27) * 5);

  const statBars: StatBarProps[] = [
    {
      label: 'Media General',
      displayValue: `${current.overall}`,
      pct: ovrPct,
      color: overallColor(current.overall),
      delay: 80,
    },
    {
      label: 'Experiencia Internacional',
      displayValue: `${current.caps} partidos`,
      pct: capsPct,
      color: '#2196f3',
      delay: 140,
    },
    {
      label: 'Capacidad Ofensiva',
      displayValue: `${current.goals} goles`,
      pct: goalsPct,
      color: '#ff9800',
      delay: 200,
    },
    {
      label: 'Perfil Físico',
      displayValue: `${current.height} cm`,
      pct: heightPct,
      color: '#9c27b0',
      delay: 260,
    },
    {
      label: 'Momento de Carrera',
      displayValue: `${current.age} años`,
      pct: agePct,
      color: current.age <= 27 ? '#4caf50' : '#ff9800',
      delay: 320,
    },
  ];

  return (
    <div
      className={`modal-overlay${isClosing ? ' modal-overlay--closing' : ''}`}
      onClick={handleClose}
    >
      <div
        className={[
          'modal',
          isStar    ? 'modal--star'    : '',
          isClosing ? 'modal--closing' : '',
        ].filter(Boolean).join(' ')}
        style={{ borderColor: isStar ? 'var(--gold)' : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal__close" onClick={handleClose}>✕</button>

        {isStar && (
          <div className="modal__star-banner">
            <IcoStar size={13} />
            <span>Estrella #{starRank} · {team.name}</span>
            <IcoStar size={13} />
          </div>
        )}

        <div
          className={`modal__header${isStar ? ' modal__header--star' : ''}`}
          style={{ borderColor: color }}
        >
          <div className="modal__ovr-badge" style={{ backgroundColor: color }}>
            {current.overall}
          </div>
          <div className="modal__player-info">
            <h2 className="modal__player-name">{current.name}</h2>
            <div className="modal__player-meta">
              <span className="modal__pos-tag" style={{ borderColor: color, color }}>
                {positionLabel(current.position)}
              </span>
              <TeamFlag code={teamCode} size={14} />
              <span>{team.name}</span>
            </div>
          </div>
        </div>

        <div className="modal__tabs">
          <button
            className={`modal__tab${tab === 'info'  ? ' modal__tab--active' : ''}`}
            onClick={() => setTab('info')}
          >
            Ficha
          </button>
          <button
            className={`modal__tab${tab === 'bench' ? ' modal__tab--active' : ''}`}
            onClick={() => setTab('bench')}
          >
            Banquillo ({bench.length})
          </button>
        </div>

        {tab === 'info' && (
          <div className="modal__body">

            {/* Club row */}
            <div className="modal__club-row">
              <span className="modal__club-label">Club</span>
              <span className="modal__club-value">{current.club}</span>
            </div>

            {/* Animated stat bars */}
            <div className="modal__stat-bars">
              {statBars.map((bar) => (
                <StatBar key={bar.label} {...bar} />
              ))}
            </div>

            {strengths.length > 0 && (
              <div className="modal__section">
                <h4 className="modal__section-title modal__section-title--green">
                  <IcoCheck size={14} /> Fortalezas
                </h4>
                <ul className="modal__list modal__list--green">
                  {strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div className="modal__section">
                <h4 className="modal__section-title modal__section-title--red">
                  <IcoWarning size={14} /> Debilidades
                </h4>
                <ul className="modal__list modal__list--red">
                  {weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'bench' && (
          <div className="modal__bench">
            <p className="modal__bench-hint">
              Clic para sustituir a <strong>{current.name}</strong>
            </p>
            <div className="bench-list">
              {bench.map((p) => (
                <div
                  key={p.id}
                  className="bench-item"
                  onClick={() => swapPlayer(side, slotIndex, p)}
                >
                  <span className="bench-item__pos">{positionLabel(p.position)}</span>
                  <span className="bench-item__name">
                    {starIds.has(p.id) && (
                      <span className="bench-star-icon"><IcoStar size={11} /></span>
                    )}
                    {p.name}
                  </span>
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
