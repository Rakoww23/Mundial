import { useGameStore } from '../../store/gameStore';
import { IcoLightning, IcoTrophy, IcoStar } from '../Icons';
import { ArcadeRankBadge } from './ArcadeRankBadge';
import { rankForStreak } from '../../data/arcadeConfig';

// Landing for Modo Penales: pick the endless Arcade run (headline) or the classic
// knockout tournament. Both lead to team selection.
export function PenaltyEntry({ onPick }: { onPick: (mode: 'arcade' | 'tournament') => void }) {
  const setAppPage = useGameStore((s) => s.setAppPage);
  const stats = useGameStore((s) => s.arcadeStats);
  const rank = rankForStreak(stats.bestStreak);

  return (
    <div className="wc-setup pk-setup pk-entry">
      <div className="wc-setup__header">
        <button className="back-btn" onClick={() => setAppPage('home')}>← Volver</button>
        <div className="wc-setup__hero pk-setup__hero">
          <IcoLightning size={32} />
          <h2>Modo Penales</h2>
          <p>Duelos desde los once metros. Elige cómo quieres competir.</p>
        </div>
      </div>

      <div className="pk-entry__cards">
        <button className="pk-entry-card pk-entry-card--arcade" onClick={() => onPick('arcade')}>
          <div className="pk-entry-card__badge">
            <ArcadeRankBadge rank={rank} size={64} />
          </div>
          <div className="pk-entry-card__body">
            <span className="pk-entry-card__tag"><IcoLightning size={12} /> Sin fin</span>
            <strong className="pk-entry-card__title">Arcade</strong>
            <p className="pk-entry-card__desc">
              Encadena victorias, sube de nivel y de rango. Una derrota y vuelves a empezar.
            </p>
            {stats.bestStreak > 0 && (
              <span className="pk-entry-card__record">
                <IcoStar size={12} /> Mejor racha: <strong>{stats.bestStreak}</strong> · {rank.name}
              </span>
            )}
          </div>
          <span className="pk-entry-card__arrow">›</span>
        </button>

        <button className="pk-entry-card pk-entry-card--tournament" onClick={() => onPick('tournament')}>
          <div className="pk-entry-card__badge pk-entry-card__badge--cup">
            <IcoTrophy size={40} />
          </div>
          <div className="pk-entry-card__body">
            <span className="pk-entry-card__tag">Clásico</span>
            <strong className="pk-entry-card__title">Torneo</strong>
            <p className="pk-entry-card__desc">
              El camino eliminatorio completo, de Dieciseisavos a la Gran Final.
            </p>
          </div>
          <span className="pk-entry-card__arrow">›</span>
        </button>
      </div>
    </div>
  );
}
