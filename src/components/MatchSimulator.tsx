import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { TacticalMentality, MatchEvent, MatchPhase, MatchMode } from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────

const MENTALITY_LABELS: Record<TacticalMentality, string> = {
  defensive: '🛡️ Defensivo',
  balanced: '⚖️ Equilibrado',
  offensive: '⚔️ Ofensivo',
  ultraoffensive: '🔥 Ultra-Ofensivo',
};

function phaseLabel(phase: MatchPhase, minute: number): string {
  if (phase === 'pause_22') return `Minuto ${minute}`;
  if (phase === 'pause_45') return 'Descanso — Minuto 45';
  if (phase === 'pause_67') return `Minuto ${minute}`;
  if (phase === 'full_time') return 'Final del Partido';
  if (phase === 'et1_pause') return 'Final 1.er Tiempo Extra (105\')';
  if (phase === 'et2_pause') return 'Final 2.º Tiempo Extra (120\')';
  if (phase === 'penalties') return 'Tanda de Penales';
  if (phase === 'finished') return 'Partido Finalizado';
  return '';
}

function nextPhaseLabel(phase: MatchPhase): string {
  if (phase === 'pause_22') return 'Continuar (45\')';
  if (phase === 'pause_45') return 'Continuar (67\')';
  if (phase === 'pause_67') return 'Continuar hasta el Final';
  if (phase === 'full_time') return 'Tiempo Extra (90→105\')';
  if (phase === 'et1_pause') return 'Continuar (105→120\')';
  return '';
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'goal') return <span className="ev-icon ev-icon--goal">⚽</span>;
  if (type === 'yellow_card') return <span className="ev-icon ev-icon--yellow">🟨</span>;
  if (type === 'red_card') return <span className="ev-icon ev-icon--red">🟥</span>;
  return null;
}

// ── Mode menu ─────────────────────────────────────────────────────────────────

const MODES: { key: MatchMode; icon: string; title: string; desc: string }[] = [
  { key: 'realistic', icon: '🎮', title: 'Simulación Minuto a Minuto', desc: 'Controla la táctica en cada pausa del partido' },
  { key: 'quick', icon: '⚡', title: 'Predicción Rápida', desc: 'Resultado instantáneo con xG y probabilidades' },
  { key: 'custom', icon: '⏱️', title: 'Simular desde Minuto Específico', desc: 'Empieza desde cualquier marcador y minuto' },
  { key: 'penalty', icon: '🥅', title: 'Modo Penales', desc: 'Tanda de penales simulada automáticamente' },
];

function MatchModeMenu() {
  const matchMode = useGameStore((s) => s.matchMode);
  const setMatchMode = useGameStore((s) => s.setMatchMode);

  return (
    <div className="mode-menu">
      {MODES.map((m) => (
        <button
          key={m.key}
          className={`mode-card ${matchMode === m.key ? 'mode-card--active' : ''}`}
          onClick={() => setMatchMode(m.key)}
        >
          <span className="mode-card__icon">{m.icon}</span>
          <span className="mode-card__title">{m.title}</span>
          <span className="mode-card__desc">{m.desc}</span>
        </button>
      ))}
    </div>
  );
}

// ── Quick Simulation view ─────────────────────────────────────────────────────

function QuickSimView() {
  const runSimulation = useGameStore((s) => s.runSimulation);
  const simResult = useGameStore((s) => s.simResult);
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const teams = useGameStore((s) => s.teams);
  const home = teams[homeCode];
  const away = teams[awayCode];
  const maxProb = simResult ? Math.max(simResult.homeWin, simResult.draw, simResult.awayWin) : 0;

  return (
    <div className="sim-quick">
      <button className="simulate-btn simulate-btn--quick" onClick={runSimulation}>
        ⚡ Simulación Rápida
      </button>

      {simResult && (
        <div className="sim-result">
          <div className="sim-result__scoreline">
            <span className="sim-result__team">{home?.flag} {home?.name}</span>
            <span className="sim-result__score">{simResult.predictedScore.home} — {simResult.predictedScore.away}</span>
            <span className="sim-result__team">{away?.flag} {away?.name}</span>
          </div>
          <div className="sim-result__xg">
            <span className="sim-result__xg-item">
              <span className="xg-flag">{home?.flag}</span>
              <span className="xg-label">xG</span>
              <span className="xg-value xg-value--home">{simResult.homeXG}</span>
            </span>
            <span className="xg-divider">vs</span>
            <span className="sim-result__xg-item">
              <span className="xg-value xg-value--away">{simResult.awayXG}</span>
              <span className="xg-label">xG</span>
              <span className="xg-flag">{away?.flag}</span>
            </span>
          </div>
          <div className="sim-result__probs">
            {[
              { label: `${home?.flag} ${home?.name}`, value: simResult.homeWin, cls: 'home' },
              { label: 'Empate', value: simResult.draw, cls: 'draw' },
              { label: `${away?.flag} ${away?.name}`, value: simResult.awayWin, cls: 'away' },
            ].map(({ label, value, cls }) => (
              <div key={cls} className={`sim-prob ${value === maxProb ? 'sim-prob--highlight' : ''}`}>
                <span className="sim-prob__label">{label}</span>
                <div className="sim-prob__bar-track">
                  <div className={`sim-prob__bar-fill sim-prob__bar-fill--${cls}`} style={{ width: `${value}%` }} />
                </div>
                <span className="sim-prob__value">{value}%</span>
              </div>
            ))}
          </div>
          <div className="sim-result__scorelines">
            <h4>Marcadores más probables</h4>
            <div className="scoreline-grid">
              {simResult.scorelines.slice(0, 8).map((s, i) => (
                <div key={i} className="scoreline-item">
                  <span className="scoreline-item__score">{s.home} – {s.away}</span>
                  <span className="scoreline-item__pct">{(s.probability * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Custom start view ─────────────────────────────────────────────────────────

function CustomStartView() {
  const setCustomStart = useGameStore((s) => s.setCustomStart);
  const startCustomMatch = useGameStore((s) => s.startCustomMatch);
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const teams = useGameStore((s) => s.teams);
  const home = teams[homeCode];
  const away = teams[awayCode];

  const [minute, setMinute] = useState(30);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  const minuteToContext = (min: number) => {
    if (min < 22) return `Minuto ${min} — primer segmento`;
    if (min < 45) return `Minuto ${min} — segunda parte del primer tiempo`;
    if (min < 67) return `Minuto ${min} — inicio del segundo tiempo`;
    if (min < 80) return `Minuto ${min} — segunda mitad`;
    return `Minuto ${min} — tramo final (remontada muy difícil)`;
  };

  const handleStart = () => {
    setCustomStart({ minute, homeScore, awayScore });
    startCustomMatch();
  };

  return (
    <div className="custom-start">
      <h3 className="custom-start__title">⏱️ Simular desde Minuto Específico</h3>
      <p className="custom-start__sub">Configura la situación actual del partido y simula el resto</p>

      <div className="custom-start__match-preview">
        <span className="cs-team">{home?.flag} {home?.name}</span>
        <div className="cs-score-inputs">
          <input
            type="number" min={0} max={20} value={homeScore}
            onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
            className="cs-score-input"
          />
          <span className="cs-dash">–</span>
          <input
            type="number" min={0} max={20} value={awayScore}
            onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
            className="cs-score-input"
          />
        </div>
        <span className="cs-team">{away?.flag} {away?.name}</span>
      </div>

      <div className="custom-start__minute">
        <div className="cs-minute-label">
          <span>Minuto actual: <strong>{minute}'</strong></span>
          <span className="cs-context">{minuteToContext(minute)}</span>
        </div>
        <input
          type="range" min={0} max={89} value={minute}
          onChange={(e) => setMinute(parseInt(e.target.value))}
          className="cs-slider"
        />
        <div className="cs-slider-marks">
          <span>0'</span><span>22'</span><span>45'</span><span>67'</span><span>89'</span>
        </div>
      </div>

      <button className="simulate-btn simulate-btn--realistic" onClick={handleStart}>
        ▶ Simular desde Minuto {minute}
      </button>
    </div>
  );
}

// ── Auto-penalty view (simulated) ────────────────────────────────────────────

function AutoPenaltyView() {
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const teams = useGameStore((s) => s.teams);
  const setAppPage = useGameStore((s) => s.setAppPage);
  const home = teams[homeCode];
  const away = teams[awayCode];

  return (
    <div className="auto-penalty-view">
      <p className="auto-pen__info">
        Para la tanda de penales interactiva (donde tú disparas y atajás), usa el <strong>Modo Penales</strong> independiente.
      </p>
      <button className="simulate-btn simulate-btn--penalty" onClick={() => setAppPage('penalty')}>
        🥅 Ir a Modo Penales Interactivo
      </button>
      <p className="auto-pen__teams">{home?.flag} {home?.name} vs {away?.name} {away?.flag}</p>
    </div>
  );
}

// ── Realistic Match view ──────────────────────────────────────────────────────

function MentalitySelector({ side }: { side: 'home' | 'away' }) {
  const matchState = useGameStore((s) => s.matchState);
  const setMentality = useGameStore((s) => s.setMentality);
  if (!matchState) return null;
  const current = side === 'home' ? matchState.homeMentality : matchState.awayMentality;
  const opts: TacticalMentality[] = ['defensive', 'balanced', 'offensive', 'ultraoffensive'];
  return (
    <div className="mentality-row">
      {opts.map((m) => (
        <button
          key={m}
          className={`mentality-btn ${current === m ? 'mentality-btn--active' : ''}`}
          onClick={() => setMentality(side, m)}
        >
          {MENTALITY_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

function PenaltyShootout() {
  const matchState = useGameStore((s) => s.matchState);
  const takePenalty = useGameStore((s) => s.takePenalty);
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const teams = useGameStore((s) => s.teams);
  if (!matchState) return null;

  const home = teams[homeCode];
  const away = teams[awayCode];
  const { penalties, homePenaltyScore, awayPenaltyScore, penaltySideNext, phase } = matchState;
  const finished = phase === 'finished';
  const homeAttempts = penalties.filter((p) => p.side === 'home');
  const awayAttempts = penalties.filter((p) => p.side === 'away');

  return (
    <div className="penalty-shootout">
      <div className="penalty-scoreboard">
        <div className="penalty-team">
          <span className="penalty-flag">{home?.flag}</span>
          <span className="penalty-team-name">{home?.name}</span>
          <span className="penalty-score">{homePenaltyScore}</span>
        </div>
        <span className="penalty-sep">–</span>
        <div className="penalty-team">
          <span className="penalty-score">{awayPenaltyScore}</span>
          <span className="penalty-team-name">{away?.name}</span>
          <span className="penalty-flag">{away?.flag}</span>
        </div>
      </div>
      <div className="penalty-columns">
        <div className="penalty-col">
          {homeAttempts.map((a, i) => (
            <div key={i} className={`penalty-kick ${a.scored ? 'penalty-kick--scored' : 'penalty-kick--missed'}`}>
              <span className="pk-icon">{a.scored ? '✅' : '❌'}</span>
              <span className="pk-name">{a.playerName.split(' ').slice(-1)[0]}</span>
            </div>
          ))}
        </div>
        <div className="penalty-col penalty-col--away">
          {awayAttempts.map((a, i) => (
            <div key={i} className={`penalty-kick ${a.scored ? 'penalty-kick--scored' : 'penalty-kick--missed'}`}>
              <span className="pk-name">{a.playerName.split(' ').slice(-1)[0]}</span>
              <span className="pk-icon">{a.scored ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>
      </div>
      {!finished && (
        <button className="simulate-btn simulate-btn--penalty" onClick={takePenalty}>
          {penaltySideNext === 'home' ? `${home?.flag} Lanzar Penal` : `${away?.flag} Lanzar Penal`}
        </button>
      )}
      {finished && (
        <div className="penalty-winner">
          🏆 {homePenaltyScore > awayPenaltyScore ? home?.name : away?.name} avanza en los penales
        </div>
      )}
    </div>
  );
}

function RealisticMatchView() {
  const matchState = useGameStore((s) => s.matchState);
  const advancePhase = useGameStore((s) => s.advancePhase);
  const resetMatch = useGameStore((s) => s.resetMatch);
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const teams = useGameStore((s) => s.teams);
  const wcState = useGameStore((s) => s.wcState);
  const applyWCGroupResult = useGameStore((s) => s.applyWCGroupResult);
  const applyWCKnockoutResult = useGameStore((s) => s.applyWCKnockoutResult);
  const setAppPage = useGameStore((s) => s.setAppPage);

  if (!matchState) return null;

  const home = teams[homeCode];
  const away = teams[awayCode];
  const { phase, homeScore, awayScore, events, minute, penalties, homePenaltyScore, awayPenaltyScore } = matchState;

  const isPaused = ['pause_22', 'pause_45', 'pause_67', 'full_time', 'et1_pause', 'et2_pause'].includes(phase);
  const isPenalties = phase === 'penalties';
  const isFinished = phase === 'finished';
  const hasPenalties = penalties.length > 0;
  const showPenaltyShootout = isPenalties || (isFinished && hasPenalties);
  const isDraw = homeScore === awayScore;
  const needsPenalties = phase === 'et2_pause' && isDraw;
  const etWinner = (phase === 'et2_pause' || phase === 'et1_pause') && !isDraw;
  const isMatchDecided = phase === 'full_time' && (matchState.type === 'group' || !isDraw);
  const canContinue = isPaused && !isMatchDecided && !etWinner && !needsPenalties;

  const penaltyWinner = hasPenalties && isFinished
    ? (homePenaltyScore > awayPenaltyScore ? home : away) : null;
  const matchWinner = !hasPenalties && isFinished
    ? (homeScore > awayScore ? home : awayScore > homeScore ? away : null) : null;
  const showResult = isMatchDecided || (etWinner && phase !== 'et1_pause') || (isFinished && !hasPenalties);

  const isWCMatch = !!wcState?.pendingMatch;
  const isWCKnockout = wcState?.pendingMatch?.isKnockout ?? false;

  const handleApplyWCResult = () => {
    if (isWCKnockout) applyWCKnockoutResult();
    else applyWCGroupResult();
  };

  return (
    <div className="realistic-match">
      {isWCMatch && (
        <div className="wc-match-banner">
          🌍 Partido del Mundial — el resultado se registrará en el torneo
        </div>
      )}

      <div className="live-scoreboard">
        <div className="live-score-team">
          <span className="live-flag">{home?.flag}</span>
          <span className="live-name">{home?.name}</span>
        </div>
        <div className="live-score-center">
          <div className="live-goals">{homeScore} – {awayScore}</div>
          <div className="live-phase">{phaseLabel(phase, minute)}</div>
        </div>
        <div className="live-score-team live-score-team--right">
          <span className="live-name">{away?.name}</span>
          <span className="live-flag">{away?.flag}</span>
        </div>
      </div>

      {!isPenalties && (
        <div className="events-log">
          {events.length === 0 ? (
            <p className="events-empty">Sin eventos registrados</p>
          ) : (
            events.map((ev, i) => (
              <div key={i} className={`event-row event-row--${ev.side}`}>
                {ev.side === 'home' && (
                  <><span className="event-time">{ev.minute}'</span><EventIcon type={ev.type} /><span className="event-name">{ev.playerName}</span></>
                )}
                {ev.side === 'away' && (
                  <><span className="event-name event-name--away">{ev.playerName}</span><EventIcon type={ev.type} /><span className="event-time">{ev.minute}'</span></>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showPenaltyShootout && <PenaltyShootout />}

      {isPaused && (
        <div className="tactical-controls">
          <div className="tac-section">
            <div className="tac-section-title">{home?.flag} Mentalidad — {home?.name}</div>
            <MentalitySelector side="home" />
          </div>
          <div className="tac-section">
            <div className="tac-section-title">{away?.flag} Mentalidad — {away?.name}</div>
            <MentalitySelector side="away" />
          </div>
        </div>
      )}

      <div className="match-actions">
        {canContinue && (
          <button className="simulate-btn simulate-btn--continue" onClick={advancePhase}>
            ▶ {nextPhaseLabel(phase)}
          </button>
        )}
        {needsPenalties && (
          <button className="simulate-btn simulate-btn--continue" onClick={advancePhase}>
            ▶ Ir a Penales
          </button>
        )}
        {showResult && (
          <div className="match-result-final">
            {penaltyWinner && `🏆 ${penaltyWinner.name} avanza en los penales`}
            {matchWinner && `🏆 ${matchWinner.name} gana`}
            {!penaltyWinner && !matchWinner && isFinished && '🤝 Empate'}
            {!isFinished && homeScore > awayScore && `🏆 ${home?.name} gana`}
            {!isFinished && awayScore > homeScore && `🏆 ${away?.name} gana`}
          </div>
        )}
        {(isFinished || isMatchDecided) && isWCMatch && (
          <button className="simulate-btn simulate-btn--wc-apply" onClick={handleApplyWCResult}>
            🌍 Registrar Resultado en el Mundial
          </button>
        )}
        {!isWCMatch && (
          <button className="match-reset-btn" onClick={resetMatch}>↩ Nuevo Partido</button>
        )}
        {isWCMatch && (isFinished || isMatchDecided) && (
          <button className="match-reset-btn" onClick={() => setAppPage('worldcup')}>
            ← Volver al Mundial sin registrar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function MatchSimulator() {
  const matchState = useGameStore((s) => s.matchState);
  const startRealisticMatch = useGameStore((s) => s.startRealisticMatch);
  const pendingMatchType = useGameStore((s) => s.pendingMatchType);
  const setPendingMatchType = useGameStore((s) => s.setPendingMatchType);
  const matchMode = useGameStore((s) => s.matchMode);
  const setAppPage = useGameStore((s) => s.setAppPage);

  if (matchState) return <RealisticMatchView />;

  return (
    <div className="simulator">
      <div className="sim-header">
        <button className="back-btn back-btn--sm" onClick={() => setAppPage('home')}>← Inicio</button>
        <h2 className="sim-title">Simular Partido</h2>
      </div>

      <div className="sim-type-row">
        <span className="sim-type-label">Tipo de partido:</span>
        <button
          className={`sim-type-btn ${pendingMatchType === 'group' ? 'sim-type-btn--active' : ''}`}
          onClick={() => setPendingMatchType('group')}
        >
          Fase de Grupos
        </button>
        <button
          className={`sim-type-btn ${pendingMatchType === 'knockout' ? 'sim-type-btn--active' : ''}`}
          onClick={() => setPendingMatchType('knockout')}
        >
          Eliminatoria
        </button>
      </div>

      <MatchModeMenu />

      <div className="sim-mode-content">
        {matchMode === 'realistic' && (
          <button className="simulate-btn simulate-btn--realistic" onClick={startRealisticMatch}>
            🎮 Iniciar Simulación Realista
          </button>
        )}
        {matchMode === 'quick' && <QuickSimView />}
        {matchMode === 'custom' && <CustomStartView />}
        {matchMode === 'penalty' && <AutoPenaltyView />}
      </div>
    </div>
  );
}
