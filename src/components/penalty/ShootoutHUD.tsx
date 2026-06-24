import { useGameStore } from '../../store/gameStore';
import { TeamFlag } from '../TeamFlag';
import { IcoGoal, IcoGlove, IcoLightning, IcoPlay, IcoX } from '../Icons';
import type { ShootoutState } from '../../types/penalty';

function KickDots({ shootout, side }: { shootout: ShootoutState; side: 'home' | 'away' }) {
  const kicks = shootout.kicks.filter((k) => k.side === side);
  const slots = Math.max(5, kicks.length);
  return (
    <div className="pk-dots">
      {Array.from({ length: slots }).map((_, i) => {
        const k = kicks[i];
        const cls = !k ? 'pk-dot' : k.outcome === 'goal' ? 'pk-dot pk-dot--goal' : 'pk-dot pk-dot--miss';
        return <span key={i} className={cls} />;
      })}
    </div>
  );
}

export function ShootoutHUD() {
  const shootout = useGameStore((s) => s.pkShootout);
  const teams = useGameStore((s) => s.teams);
  const pkFinishShootout = useGameStore((s) => s.pkFinishShootout);
  const pkSimulateUserShootout = useGameStore((s) => s.pkSimulateUserShootout);
  const pkExitShootout = useGameStore((s) => s.pkExitShootout);

  if (!shootout) return null;
  const { home, away, homeScore, awayScore, round, finished, winner, userSide } = shootout;
  const suddenDeath = round > 5;
  const userWon = winner === userSide;

  const turnLabel = finished
    ? null
    : shootout.phase === 'user_shoot'
      ? <><IcoGoal size={14} /> Tú lanzas</>
      : <><IcoGlove size={14} /> Tú atajas</>;

  return (
    <div className="pk-hud">
      <div className="pk-scoreboard">
        <div className="pk-side">
          <TeamFlag code={home} size={20} />
          <span className="pk-side__name">{teams[home]?.name ?? home}</span>
          <KickDots shootout={shootout} side="home" />
        </div>
        <div className="pk-score">
          <span className="pk-score__num">{homeScore}</span>
          <span className="pk-score__sep">–</span>
          <span className="pk-score__num">{awayScore}</span>
        </div>
        <div className="pk-side pk-side--right">
          <KickDots shootout={shootout} side="away" />
          <span className="pk-side__name">{teams[away]?.name ?? away}</span>
          <TeamFlag code={away} size={20} />
        </div>
      </div>

      <div className="pk-status">
        {suddenDeath && !finished && (
          <span className="pk-sudden"><IcoLightning size={13} /> Muerte súbita — Ronda {round}</span>
        )}
        {turnLabel && <span className="pk-turn">{turnLabel}</span>}
      </div>

      {finished ? (
        <div className="pk-result">
          <span className={`pk-result__label${userWon ? ' pk-result__label--win' : ' pk-result__label--lose'}`}>
            {userWon ? '¡Tanda ganada!' : 'Tanda perdida'}
          </span>
          <button className="wc-action-btn wc-action-btn--advance" onClick={pkFinishShootout}>
            <IcoPlay size={14} /> Continuar
          </button>
        </div>
      ) : (
        <div className="pk-controls">
          <button className="pk-ctrl-btn" onClick={pkSimulateUserShootout} title="Simular la tanda automáticamente">
            <IcoLightning size={13} /> Simular
          </button>
          <button className="pk-ctrl-btn pk-ctrl-btn--exit" onClick={pkExitShootout} title="Salir sin jugar">
            <IcoX size={12} /> Salir
          </button>
        </div>
      )}
    </div>
  );
}
