import { useEffect } from 'react';
import type { ArcadeRank } from '../../data/arcadeConfig';
import { ArcadeRankBadge } from './ArcadeRankBadge';

// Full-screen reward moment when the best streak crosses into a new rank. Auto-dismisses
// so it never blocks the flow, but a tap skips it immediately.
export function RankUpOverlay({ rank, onDone }: { rank: ArcadeRank; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(t);
  }, [onDone]);

  const style = { '--rank-c': rank.color, '--rank-glow': rank.glow } as React.CSSProperties;

  return (
    <div className="pk-rankup" style={style} onClick={onDone} role="dialog" aria-label="Nuevo rango">
      <div className="pk-rankup__rays" aria-hidden="true" />
      <div className="pk-rankup__card">
        <p className="pk-rankup__kicker">¡Nuevo Rango!</p>
        <div className="pk-rankup__badge">
          <ArcadeRankBadge rank={rank} size={140} />
        </div>
        <h3 className="pk-rankup__name" style={{ color: rank.color }}>{rank.name}</h3>
        <p className="pk-rankup__hint">Toca para continuar</p>
      </div>
    </div>
  );
}
