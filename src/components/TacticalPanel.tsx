import { useGameStore } from '../store/gameStore';
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
          <h4 className="analysis-title analysis-title--advantage">✅ Ventajas</h4>
          <ul className="analysis-list">
            {analysis.advantages.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.disadvantages.length > 0 && (
        <div className="analysis-section">
          <h4 className="analysis-title analysis-title--disadvantage">⚠️ Desventajas</h4>
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
  const homeSquad = useGameStore((s) => s.homeSquad);
  const awaySquad = useGameStore((s) => s.awaySquad);
  const openModal = useGameStore((s) => s.openModal);

  const analysis = side === 'home' ? homeAnalysis : awayAnalysis;
  const squad = side === 'home' ? homeSquad : awaySquad;

  return (
    <div className="tactical-panel">
      <h3 className="tactical-panel__title">Análisis Táctico</h3>

      {analysis && <AnalysisBlock analysis={analysis} />}

      <h3 className="tactical-panel__title" style={{ marginTop: '16px' }}>Once Titular</h3>
      <div className="squad-list">
        {squad.map((slot, i) => (
          <div
            key={i}
            className="squad-list__item"
            onClick={() => openModal(side, i)}
          >
            <span className="squad-list__pos">{slot.formation.label}</span>
            <span className="squad-list__name">
              {slot.player ? slot.player.name : '—'}
            </span>
            <span className="squad-list__ovr">
              {slot.player ? slot.player.overall : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
