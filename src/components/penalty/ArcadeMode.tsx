import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { TeamFlag } from '../TeamFlag';
import { IcoGoal, IcoLightning, IcoStar, IcoRefresh, IcoX, IcoTarget } from '../Icons';
import { ArcadeRankBadge } from './ArcadeRankBadge';
import { RankUpOverlay } from './RankUpOverlay';
import { rankForStreak, rankProgress, ARCADE_RANKS } from '../../data/arcadeConfig';
import type { ArcadeRunState, ArcadeStats } from '../../types/arcade';

// ── Progress HUD (streak / best / level / rank) ───────────────────────────────────

function ArcadeHUD({ run, stats }: { run: ArcadeRunState; stats: ArcadeStats }) {
  const { current, next, pct } = rankProgress(stats.bestStreak);
  return (
    <div className="arc-hud">
      <div className="arc-hud__stats">
        <div className="arc-stat arc-stat--streak">
          <span className="arc-stat__val" key={run.streak}>{run.streak}</span>
          <span className="arc-stat__lbl">Racha</span>
        </div>
        <div className="arc-stat">
          <span className="arc-stat__val arc-stat__val--gold">{stats.bestStreak}</span>
          <span className="arc-stat__lbl">Mejor</span>
        </div>
        <div className="arc-stat">
          <span className="arc-stat__val">{run.level + 1}</span>
          <span className="arc-stat__lbl">Nivel</span>
        </div>
      </div>

      <div className="arc-hud__rank">
        <ArcadeRankBadge rank={current} size={46} />
        <div className="arc-hud__rank-info">
          <span className="arc-hud__rank-name" style={{ color: current.color }}>{current.name}</span>
          {next ? (
            <div className="arc-progress" title={`${stats.bestStreak} / ${next.minStreak} para ${next.name}`}>
              <div className="arc-progress__fill" style={{ width: `${Math.round(pct * 100)}%`, background: current.color }} />
            </div>
          ) : (
            <span className="arc-hud__rank-max">Rango máximo</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ready: next opponent + play ───────────────────────────────────────────────────

function ReadyScreen({ run }: { run: ArcadeRunState }) {
  const teams = useGameStore((s) => s.teams);
  const play = useGameStore((s) => s.arcadePlayShootout);

  return (
    <div className="arc-stage">
      <div className="arc-vs">
        <div className="arc-vs__team">
          <TeamFlag code={run.userTeam} size={44} />
          <span className="arc-vs__name">{teams[run.userTeam]?.name ?? run.userTeam}</span>
        </div>
        <span className="arc-vs__sep">VS</span>
        <div className="arc-vs__team">
          <TeamFlag code={run.opponent} size={44} />
          <span className="arc-vs__name">{teams[run.opponent]?.name ?? run.opponent}</span>
        </div>
      </div>
      <button className="arc-play-btn" onClick={play}>
        <IcoGoal size={22} /> {run.streak === 0 ? 'Comenzar' : 'Siguiente Tanda'}
      </button>
      <p className="arc-hint">
        {run.streak === 0
          ? 'Gana tandas seguidas para subir de rango. Una derrota termina la partida.'
          : `Llevas ${run.streak} ${run.streak === 1 ? 'victoria' : 'victorias'}. ¡No falles!`}
      </p>
    </div>
  );
}

// ── Result: won a match, chase the next ───────────────────────────────────────────

function ResultScreen({ run }: { run: ArcadeRunState }) {
  const teams = useGameStore((s) => s.teams);
  const next = useGameStore((s) => s.arcadeNext);
  const last = run.lastResult;
  if (!last) return null;

  return (
    <div className="arc-stage arc-stage--result">
      <div className="arc-result__badge">
        <IcoLightning size={16} /> ¡Tanda ganada!
      </div>
      <div className="arc-result__score">
        <TeamFlag code={run.userTeam} size={26} />
        <span className="arc-result__nums">{last.userPK} – {last.rivalPK}</span>
        <TeamFlag code={last.rival} size={26} />
      </div>
      <div className="arc-result__streak">
        <span className="arc-result__streak-val" key={last.streakAfter}>{last.streakAfter}</span>
        <span className="arc-result__streak-lbl">Racha</span>
      </div>
      <div className="arc-result__next">
        <span className="arc-result__next-lbl">Próximo rival</span>
        <span className="arc-result__next-team">
          <TeamFlag code={run.opponent} size={22} /> {teams[run.opponent]?.name ?? run.opponent}
        </span>
      </div>
      <button className="arc-play-btn" onClick={next}>
        <IcoGoal size={20} /> Continuar
      </button>
    </div>
  );
}

// ── Game over: final summary ──────────────────────────────────────────────────────

function GameOverScreen({ run, stats }: { run: ArcadeRunState; stats: ArcadeStats }) {
  const teams = useGameStore((s) => s.teams);
  const newRun = useGameStore((s) => s.arcadeNewRun);
  const quit = useGameStore((s) => s.arcadeQuit);
  const last = run.lastResult;
  const isRecord = run.streak > run.preRunBest && run.streak > 0;
  const rank = rankForStreak(stats.bestStreak);

  return (
    <div className="arc-gameover">
      <div className="arc-gameover__card">
        <div className="arc-gameover__head">
          <TeamFlag code={run.userTeam} size={30} />
          <h2 className="arc-gameover__title">{isRecord ? '¡Nuevo Récord!' : 'Fin de la Partida'}</h2>
          {last && (
            <p className="arc-gameover__sub">
              Caíste ante <strong>{teams[last.rival]?.name ?? last.rival}</strong> · {last.userPK}–{last.rivalPK}
            </p>
          )}
        </div>

        {isRecord && (
          <div className="arc-gameover__record">
            <IcoStar size={15} /> Superaste tu mejor racha anterior de {run.preRunBest}
          </div>
        )}

        <div className="arc-gameover__rank">
          <ArcadeRankBadge rank={rank} size={72} />
          <span className="arc-gameover__rank-name" style={{ color: rank.color }}>{rank.name}</span>
        </div>

        <div className="arc-summary">
          <div className="arc-summary__cell">
            <span className="arc-summary__val">{run.streak}</span>
            <span className="arc-summary__lbl">Partidos ganados</span>
          </div>
          <div className="arc-summary__cell arc-summary__cell--hero">
            <span className="arc-summary__val">{stats.bestStreak}</span>
            <span className="arc-summary__lbl">Mejor racha</span>
          </div>
          <div className="arc-summary__cell">
            <span className="arc-summary__val">{run.level + 1}</span>
            <span className="arc-summary__lbl">Nivel máximo</span>
          </div>
        </div>

        <div className="arc-gameover__actions">
          <button className="arc-play-btn" onClick={newRun}>
            <IcoRefresh size={18} /> Jugar de Nuevo
          </button>
          <button className="pk-ctrl-btn" onClick={quit}>
            <IcoX size={13} /> Salir
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────────

export function ArcadeMode() {
  const run = useGameStore((s) => s.arcadeRun);
  const stats = useGameStore((s) => s.arcadeStats);
  const quit = useGameStore((s) => s.arcadeQuit);
  const setAppPage = useGameStore((s) => s.setAppPage);

  // Show the rank-up celebration once per promotion.
  const [rankupFor, setRankupFor] = useState<number | null>(null);
  const lr = run?.lastResult;
  useEffect(() => {
    if (run?.status === 'result' && lr?.rankedUp) setRankupFor(lr.streakAfter);
  }, [run?.status, lr?.rankedUp, lr?.streakAfter]);

  if (!run) return null;

  const showRankup = rankupFor !== null && run.status === 'result' && !!lr?.rankedUp && !!lr.newRankId;
  const rankupRank = lr?.newRankId ? ARCADE_RANKS.find((r) => r.id === lr.newRankId) ?? null : null;

  if (run.status === 'gameover') {
    return (
      <div className="wc-page pk-page arc-page">
        <GameOverScreen run={run} stats={stats} />
      </div>
    );
  }

  return (
    <div className="wc-page pk-page arc-page">
      <div className="wc-topbar">
        <button className="back-btn" onClick={() => { quit(); setAppPage('home'); }}>← Salir</button>
        <div className="wc-topbar__title">
          <IcoTarget size={15} />
          <span>Penales Arcade</span>
        </div>
        <span className="wc-topbar__sep" />
      </div>

      <ArcadeHUD run={run} stats={stats} />

      {run.status === 'ready' && <ReadyScreen run={run} />}
      {run.status === 'result' && <ResultScreen run={run} />}

      {showRankup && rankupRank && (
        <RankUpOverlay rank={rankupRank} onDone={() => setRankupFor(null)} />
      )}
    </div>
  );
}
