import { useGameStore } from '../store/gameStore';
import { oopSeverity } from '../services/oopPenalty';
import { IcoCheck, IcoWarning } from './Icons';
import type { TacticalAnalysis } from '../types';

interface Props {
  side: 'home' | 'away';
}

function StatBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? '#4caf50' : pct >= 50 ? '#ff9800' : '#f44336';
  return (
    <div className="stat-bar">
      <div className="stat-bar__label">
        <span>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="stat-bar__track">
        <div className="stat-bar__fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function AnalysisBlock({ analysis }: { analysis: TacticalAnalysis }) {
  return (
    <div className="analysis-block">
      <div className="analysis-stats">
        <StatBar label="Media General" value={analysis.avgOverall} />
        <StatBar label="Portero" value={analysis.gkOverall} />
        <StatBar label="Defensa" value={analysis.avgDefOverall} />
        <StatBar label="Mediocampo" value={analysis.avgMidOverall} />
        <StatBar label="Ataque" value={analysis.avgFwdOverall} />
        <StatBar label="Score Ofensivo" value={analysis.offensiveScore} />
        <StatBar label="Score Defensivo" value={analysis.defensiveScore} />
        <StatBar label="Posesión" value={analysis.possessionScore} />
        <StatBar label="Juego Aéreo" value={analysis.aerialScore} />
      </div>

      <div className="analysis-height-info">
        <span>Altura promedio: {analysis.avgHeight} cm</span>
        <span>Defensa: {analysis.avgDefHeight} cm</span>
        <span>Ataque: {analysis.avgFwdHeight} cm</span>
      </div>

      {analysis.advantages.length > 0 && (
        <div className="analysis-section">
          <h4 className="analysis-title analysis-title--advantage">
            <IcoCheck size={13} /> Ventajas
          </h4>
          <ul className="analysis-list">
            {analysis.advantages.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.disadvantages.length > 0 && (
        <div className="analysis-section">
          <h4 className="analysis-title analysis-title--disadvantage">
            <IcoWarning size={13} /> Desventajas
          </h4>
          <ul className="analysis-list">
            {analysis.disadvantages.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TacticalPanel({ side }: Props) {
  const homeAnalysis = useGameStore((s) => s.homeAnalysis);
  const awayAnalysis = useGameStore((s) => s.awayAnalysis);
  const homeSquad    = useGameStore((s) => s.homeSquad);
  const awaySquad    = useGameStore((s) => s.awaySquad);
  const homeCode     = useGameStore((s) => s.homeCode);
  const openModal    = useGameStore((s) => s.openModal);
  const resetLineup  = useGameStore((s) => s.resetLineup);
  const wcState      = useGameStore((s) => s.wcState);

  const analysis = side === 'home' ? homeAnalysis : awayAnalysis;
  const squad    = side === 'home' ? homeSquad : awaySquad;

  // In a WC match, only allow editing the user's own team
  const isWcMatch  = !!wcState?.pendingMatch;
  const userSide   = isWcMatch ? (wcState!.userTeam === homeCode ? 'home' : 'away') : null;
  const isRivalPanel = isWcMatch && side !== userSide;

  return (
    <div className="tactical-panel">
      <h3 className="tactical-panel__title">Análisis Táctico</h3>

      {analysis && <AnalysisBlock analysis={analysis} />}

      <div className="squad-list-header">
        <h3 className="tactical-panel__title">Once Titular</h3>
        {!isRivalPanel && (
          <button
            className="reset-lineup-btn reset-lineup-btn--inline"
            onClick={() => resetLineup(side)}
            title="Restaurar alineación original"
          >
            ↺ Restablecer
          </button>
        )}
        {isRivalPanel && (
          <span className="rival-locked-label">Solo lectura</span>
        )}
      </div>
      <div className={`squad-list${isRivalPanel ? ' squad-list--locked' : ''}`}>
        {squad.map((slot, i) => {
          const severity = slot.player
            ? oopSeverity(slot.player.position, slot.formation.role)
            : 'none';
          return (
            <div
              key={i}
              className={`squad-list__item${severity !== 'none' ? ` squad-list__item--oop-${severity}` : ''}${isRivalPanel ? ' squad-list__item--rival' : ''}`}
              onClick={isRivalPanel ? undefined : () => openModal(side, i)}
              style={isRivalPanel ? { cursor: 'default' } : undefined}
            >
              <span className="squad-list__pos">{slot.formation.label}</span>
              <span className="squad-list__name">
                {slot.player ? slot.player.name : '—'}
              </span>
              {severity !== 'none' && !isRivalPanel && (
                <span
                  className={`oop-badge oop-badge--${severity}`}
                  title={`Fuera de posición: ${slot.player?.position} jugando ${slot.formation.role}`}
                >
                  {severity === 'extreme' ? '⚠' : severity === 'moderate' ? '!' : '~'}
                </span>
              )}
              <span className="squad-list__ovr">
                {slot.player ? slot.player.overall : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
