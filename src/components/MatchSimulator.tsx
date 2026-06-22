import { useState } from 'react';
import { useGameStore, getFormation } from '../store/gameStore';
import { computeProbableScorers, projectMatchFromState } from '../services/simulationEngine';
import type { MatchProjection } from '../services/simulationEngine';
import { IcoLightning, IcoClock, IcoGoalScored, IcoYellowCard, IcoRedCard, IcoGlobe, IcoSwords, IcoStadium, IcoPlay } from './Icons';
import { TeamFlag } from './TeamFlag';
import { LiveMatchView } from './LiveMatchView';
import type { TacticalMentality, MatchEvent, MatchPhase, MatchMode } from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────

const MENTALITY_LABELS: Record<TacticalMentality, string> = {
  defensive: 'Defensivo',
  balanced: 'Equilibrado',
  offensive: 'Ofensivo',
  ultraoffensive: 'Ultra-Ofensivo',
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
  if (type === 'goal') return <span className="ev-icon ev-icon--goal"><IcoGoalScored size={15} /></span>;
  if (type === 'yellow_card') return <span className="ev-icon ev-icon--yellow"><IcoYellowCard size={13} /></span>;
  if (type === 'red_card') return <span className="ev-icon ev-icon--red"><IcoRedCard size={13} /></span>;
  return null;
}

// ── Mode menu (only Quick + Custom) ──────────────────────────────────────────

const MODES: { key: MatchMode; title: string; desc: string }[] = [
  { key: 'quick',  title: 'Predicción Rápida',       desc: 'Resultado instantáneo con xG y probabilidades' },
  { key: 'custom', title: 'Desde Minuto Específico', desc: 'Empieza desde cualquier marcador y minuto' },
];

function MatchModeMenu() {
  const matchMode = useGameStore((s) => s.matchMode);
  const setMatchMode = useGameStore((s) => s.setMatchMode);
  const effectiveMode = matchMode === 'custom' ? 'custom' : 'quick';

  return (
    <div className="mode-menu" data-tut="sim-modes">
      {MODES.map((m) => (
        <button
          key={m.key}
          className={`mode-card ${effectiveMode === m.key ? 'mode-card--active' : ''}`}
          onClick={() => setMatchMode(m.key)}
        >
          <span className="mode-card__icon">
            {m.key === 'quick' ? <IcoLightning size={20} /> : <IcoClock size={20} />}
          </span>
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
  const simResult     = useGameStore((s) => s.simResult);
  const homeCode      = useGameStore((s) => s.homeCode);
  const awayCode      = useGameStore((s) => s.awayCode);
  const homeSquad     = useGameStore((s) => s.homeSquad);
  const awaySquad     = useGameStore((s) => s.awaySquad);
  const teams         = useGameStore((s) => s.teams);
  const home = teams[homeCode];
  const away = teams[awayCode];
  const maxProb = simResult ? Math.max(simResult.homeWin, simResult.draw, simResult.awayWin) : 0;

  const homeScorers = simResult ? computeProbableScorers(homeSquad) : [];
  const awayScorers = simResult ? computeProbableScorers(awaySquad) : [];

  return (
    <div className="sim-quick">
      <button className="simulate-btn simulate-btn--quick" onClick={runSimulation}>
        <IcoLightning size={16} /> Simulación Rápida
      </button>

      {simResult && (
        <div className="sim-result">
          <div className="sim-result__scoreline">
            <span className="sim-result__team">
              <TeamFlag code={homeCode} size={16} style={{ marginRight: 6 }} />
              {home?.name}
            </span>
            <span className="sim-result__score">{simResult.predictedScore.home} — {simResult.predictedScore.away}</span>
            <span className="sim-result__team">
              {away?.name}
              <TeamFlag code={awayCode} size={16} style={{ marginLeft: 6 }} />
            </span>
          </div>
          <div className="sim-result__xg">
            <span className="sim-result__xg-item">
              <TeamFlag code={homeCode} size={14} />
              <span className="xg-label">xG</span>
              <span className="xg-value xg-value--home">{simResult.homeXG}</span>
            </span>
            <span className="xg-divider">vs</span>
            <span className="sim-result__xg-item">
              <span className="xg-value xg-value--away">{simResult.awayXG}</span>
              <span className="xg-label">xG</span>
              <TeamFlag code={awayCode} size={14} />
            </span>
          </div>
          <div className="sim-result__probs">
            {[
              { label: home?.name ?? homeCode, value: simResult.homeWin, cls: 'home', code: homeCode },
              { label: 'Empate', value: simResult.draw, cls: 'draw', code: '' },
              { label: away?.name ?? awayCode, value: simResult.awayWin, cls: 'away', code: awayCode },
            ].map(({ label, value, cls, code: tc }) => (
              <div key={cls} className={`sim-prob ${value === maxProb ? 'sim-prob--highlight' : ''}`}>
                <span className="sim-prob__label">
                  {tc && <TeamFlag code={tc} size={13} style={{ marginRight: 5 }} />}
                  {label}
                </span>
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

          <div className="probable-scorers">
            <h4 className="prob-scorers-title">Probables Goleadores</h4>
            <div className="prob-scorers-cols">
              <div className="prob-scorers-col">
                <div className="prob-scorers-team"><TeamFlag code={homeCode} size={14} style={{ marginRight: 5 }} />{home?.name}</div>
                {homeScorers.map((s, i) => (
                  <div key={i} className="prob-scorer-row">
                    <span className="prob-scorer-rank">{i + 1}</span>
                    <span className="prob-scorer-name">{s.player.name.split(' ').slice(-1)[0]}</span>
                    <div className="prob-scorer-bar-wrap">
                      <div className="prob-scorer-bar" style={{ width: `${Math.min(100, s.scoringShare * 2)}%` }} />
                    </div>
                    <span className="prob-scorer-pct">{s.scoringShare.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <div className="prob-scorers-col prob-scorers-col--away">
                <div className="prob-scorers-team"><TeamFlag code={awayCode} size={14} style={{ marginRight: 5 }} />{away?.name}</div>
                {awayScorers.map((s, i) => (
                  <div key={i} className="prob-scorer-row prob-scorer-row--away">
                    <span className="prob-scorer-pct">{s.scoringShare.toFixed(0)}%</span>
                    <div className="prob-scorer-bar-wrap">
                      <div className="prob-scorer-bar prob-scorer-bar--away" style={{ width: `${Math.min(100, s.scoringShare * 2)}%` }} />
                    </div>
                    <span className="prob-scorer-name">{s.player.name.split(' ').slice(-1)[0]}</span>
                    <span className="prob-scorer-rank">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Custom start view ─────────────────────────────────────────────────────────

function CustomStartView() {
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const homeSquad = useGameStore((s) => s.homeSquad);
  const awaySquad = useGameStore((s) => s.awaySquad);
  const homeFormationId = useGameStore((s) => s.homeFormationId);
  const awayFormationId = useGameStore((s) => s.awayFormationId);
  const teams    = useGameStore((s) => s.teams);
  const home = teams[homeCode];
  const away = teams[awayCode];

  const [minute,    setMinute]    = useState(30);
  const [homeScore, setHomeScore] = useState(2);
  const [awayScore, setAwayScore] = useState(0);
  const [proj, setProj]           = useState<MatchProjection | null>(null);

  const minuteToContext = (min: number) => {
    const left = 90 - min;
    if (min < 22) return `Quedan ~${left} min — partido muy abierto`;
    if (min < 45) return `Quedan ~${left} min — todavía hay mucho por jugar`;
    if (min < 67) return `Quedan ~${left} min — el marcador empieza a pesar`;
    if (min < 80) return `Quedan ~${left} min — margen de remontada reducido`;
    return `Quedan ~${left} min — muy difícil que cambie mucho`;
  };

  const handleProject = () => {
    setProj(projectMatchFromState(
      homeSquad, awaySquad,
      getFormation(homeFormationId), getFormation(awayFormationId),
      minute, homeScore, awayScore,
    ));
  };

  const maxProb = proj ? Math.max(proj.finalHomeWin, proj.draw, proj.finalAwayWin) : 0;
  const homeScorers = proj ? computeProbableScorers(homeSquad) : [];
  const awayScorers = proj ? computeProbableScorers(awaySquad) : [];

  return (
    <div className="custom-start">
      <h3 className="custom-start__title"><IcoClock size={16} /> Predicción desde Minuto Específico</h3>
      <p className="custom-start__sub">Define el marcador y el minuto: proyectaremos el resultado final más probable según el tiempo restante.</p>

      <div className="custom-start__match-preview">
        <span className="cs-team"><TeamFlag code={homeCode} size={16} style={{ marginRight: 6 }} />{home?.name}</span>
        <div className="cs-score-inputs">
          <input
            type="number" min={0} max={20} value={homeScore}
            onChange={(e) => { setHomeScore(Math.max(0, parseInt(e.target.value) || 0)); setProj(null); }}
            className="cs-score-input"
          />
          <span className="cs-dash">–</span>
          <input
            type="number" min={0} max={20} value={awayScore}
            onChange={(e) => { setAwayScore(Math.max(0, parseInt(e.target.value) || 0)); setProj(null); }}
            className="cs-score-input"
          />
        </div>
        <span className="cs-team">{away?.name}<TeamFlag code={awayCode} size={16} style={{ marginLeft: 6 }} /></span>
      </div>

      <div className="custom-start__minute">
        <div className="cs-minute-label">
          <span>Minuto actual: <strong>{minute}'</strong></span>
          <span className="cs-context">{minuteToContext(minute)}</span>
        </div>
        <input
          type="range" min={0} max={89} value={minute}
          onChange={(e) => { setMinute(parseInt(e.target.value)); setProj(null); }}
          className="cs-slider"
        />
        <div className="cs-slider-marks">
          <span>0'</span><span>22'</span><span>45'</span><span>67'</span><span>89'</span>
        </div>
      </div>

      <button className="simulate-btn simulate-btn--quick" onClick={handleProject}>
        <IcoLightning size={16} /> Proyectar Resultado Final
      </button>

      {proj && (
        <div className="sim-result">
          <div className="sim-result__scoreline">
            <span className="sim-result__team">
              <TeamFlag code={homeCode} size={16} style={{ marginRight: 6 }} />{home?.name}
            </span>
            <span className="sim-result__score">{proj.predictedScore.home} — {proj.predictedScore.away}</span>
            <span className="sim-result__team">
              {away?.name}<TeamFlag code={awayCode} size={16} style={{ marginLeft: 6 }} />
            </span>
          </div>
          <p className="cs-proj-note">
            Marcador final más probable partiendo de {homeScore}–{awayScore} al minuto {minute}'
            ({proj.minutesLeft} min restantes)
          </p>

          <div className="sim-result__probs">
            {[
              { label: home?.name ?? homeCode, value: proj.finalHomeWin, cls: 'home', code: homeCode },
              { label: 'Empate', value: proj.draw, cls: 'draw', code: '' },
              { label: away?.name ?? awayCode, value: proj.finalAwayWin, cls: 'away', code: awayCode },
            ].map(({ label, value, cls, code: tc }) => (
              <div key={cls} className={`sim-prob ${value === maxProb ? 'sim-prob--highlight' : ''}`}>
                <span className="sim-prob__label">
                  {tc && <TeamFlag code={tc} size={13} style={{ marginRight: 5 }} />}{label}
                </span>
                <div className="sim-prob__bar-track">
                  <div className={`sim-prob__bar-fill sim-prob__bar-fill--${cls}`} style={{ width: `${value}%` }} />
                </div>
                <span className="sim-prob__value">{value}%</span>
              </div>
            ))}
          </div>

          <div className="sim-result__scorelines">
            <h4>Marcadores finales más probables</h4>
            <div className="scoreline-grid">
              {proj.scorelines.slice(0, 8).map((s, i) => (
                <div key={i} className="scoreline-item">
                  <span className="scoreline-item__score">{s.home} – {s.away}</span>
                  <span className="scoreline-item__pct">{(s.probability * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="probable-scorers">
            <h4 className="prob-scorers-title">Probables Goleadores (resto del partido)</h4>
            <div className="prob-scorers-cols">
              <div className="prob-scorers-col">
                <div className="prob-scorers-team"><TeamFlag code={homeCode} size={14} style={{ marginRight: 5 }} />{home?.name}</div>
                {homeScorers.map((s, i) => (
                  <div key={i} className="prob-scorer-row">
                    <span className="prob-scorer-rank">{i + 1}</span>
                    <span className="prob-scorer-name">{s.player.name.split(' ').slice(-1)[0]}</span>
                    <div className="prob-scorer-bar-wrap">
                      <div className="prob-scorer-bar" style={{ width: `${Math.min(100, s.scoringShare * 2)}%` }} />
                    </div>
                    <span className="prob-scorer-pct">{s.scoringShare.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <div className="prob-scorers-col prob-scorers-col--away">
                <div className="prob-scorers-team"><TeamFlag code={awayCode} size={14} style={{ marginRight: 5 }} />{away?.name}</div>
                {awayScorers.map((s, i) => (
                  <div key={i} className="prob-scorer-row prob-scorer-row--away">
                    <span className="prob-scorer-pct">{s.scoringShare.toFixed(0)}%</span>
                    <div className="prob-scorer-bar-wrap">
                      <div className="prob-scorer-bar prob-scorer-bar--away" style={{ width: `${Math.min(100, s.scoringShare * 2)}%` }} />
                    </div>
                    <span className="prob-scorer-name">{s.player.name.split(' ').slice(-1)[0]}</span>
                    <span className="prob-scorer-rank">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Realistic Match view ──────────────────────────────────────────────────────

function MentalitySelector({ side }: { side: 'home' | 'away' }) {
  const matchState   = useGameStore((s) => s.matchState);
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
  const matchState  = useGameStore((s) => s.matchState);
  const takePenalty = useGameStore((s) => s.takePenalty);
  const homeCode    = useGameStore((s) => s.homeCode);
  const awayCode    = useGameStore((s) => s.awayCode);
  const teams       = useGameStore((s) => s.teams);
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
          <TeamFlag code={homeCode} size={20} />
          <span className="penalty-team-name">{home?.name}</span>
          <span className="penalty-score">{homePenaltyScore}</span>
        </div>
        <span className="penalty-sep">–</span>
        <div className="penalty-team">
          <span className="penalty-score">{awayPenaltyScore}</span>
          <span className="penalty-team-name">{away?.name}</span>
          <TeamFlag code={awayCode} size={20} />
        </div>
      </div>
      <div className="penalty-columns">
        <div className="penalty-col">
          {homeAttempts.map((a, i) => (
            <div key={i} className={`penalty-kick ${a.scored ? 'penalty-kick--scored' : 'penalty-kick--missed'}`}>
              <span className={`pk-icon pk-icon--${a.scored ? 'scored' : 'missed'}`}>{a.scored ? '✓' : '✗'}</span>
              <span className="pk-name">{a.playerName.split(' ').slice(-1)[0]}</span>
            </div>
          ))}
        </div>
        <div className="penalty-col penalty-col--away">
          {awayAttempts.map((a, i) => (
            <div key={i} className={`penalty-kick ${a.scored ? 'penalty-kick--scored' : 'penalty-kick--missed'}`}>
              <span className="pk-name">{a.playerName.split(' ').slice(-1)[0]}</span>
              <span className={`pk-icon pk-icon--${a.scored ? 'scored' : 'missed'}`}>{a.scored ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
      </div>
      {!finished && (
        <button className="simulate-btn simulate-btn--penalty" onClick={takePenalty}>
          {penaltySideNext === 'home'
            ? <><TeamFlag code={homeCode} size={14} style={{ marginRight: 6 }} />Lanzar Penal</>
            : <><TeamFlag code={awayCode} size={14} style={{ marginRight: 6 }} />Lanzar Penal</>}
        </button>
      )}
      {finished && (
        <div className="penalty-winner">
          {homePenaltyScore > awayPenaltyScore ? home?.name : away?.name} avanza en los penales
        </div>
      )}
    </div>
  );
}

function RealisticMatchView() {
  const matchState          = useGameStore((s) => s.matchState);
  const advancePhase        = useGameStore((s) => s.advancePhase);
  const resetMatch          = useGameStore((s) => s.resetMatch);
  const homeCode            = useGameStore((s) => s.homeCode);
  const awayCode            = useGameStore((s) => s.awayCode);
  const teams               = useGameStore((s) => s.teams);
  const wcState             = useGameStore((s) => s.wcState);
  const applyWCGroupResult  = useGameStore((s) => s.applyWCGroupResult);
  const applyWCKnockoutResult = useGameStore((s) => s.applyWCKnockoutResult);
  const setAppPage          = useGameStore((s) => s.setAppPage);

  if (!matchState) return null;

  const home = teams[homeCode];
  const away = teams[awayCode];
  const { phase, homeScore, awayScore, events, minute, penalties, homePenaltyScore, awayPenaltyScore } = matchState;

  const isPaused           = ['pause_22', 'pause_45', 'pause_67', 'full_time', 'et1_pause', 'et2_pause'].includes(phase);
  const isPenalties        = phase === 'penalties';
  const isFinished         = phase === 'finished';
  const hasPenalties       = penalties.length > 0;
  const showPenaltyShootout = isPenalties || (isFinished && hasPenalties);
  const isDraw             = homeScore === awayScore;
  const needsPenalties     = phase === 'et2_pause' && isDraw;
  const etWinner           = (phase === 'et2_pause' || phase === 'et1_pause') && !isDraw;
  const isMatchDecided     = phase === 'full_time' && (matchState.type === 'group' || !isDraw);
  const canContinue        = isPaused && !isMatchDecided && !etWinner && !needsPenalties;

  const penaltyWinner = hasPenalties && isFinished
    ? (homePenaltyScore > awayPenaltyScore ? home : away) : null;
  const matchWinner = !hasPenalties && isFinished
    ? (homeScore > awayScore ? home : awayScore > homeScore ? away : null) : null;
  const showResult = isMatchDecided || (etWinner && phase !== 'et1_pause') || (isFinished && !hasPenalties);

  const isWCMatch   = !!wcState?.pendingMatch;
  const isWCKnockout = wcState?.pendingMatch?.isKnockout ?? false;

  const handleApplyWCResult = () => {
    if (isWCKnockout) applyWCKnockoutResult();
    else applyWCGroupResult();
  };

  return (
    <div className="realistic-match">
      {isWCMatch && (
        <div className="wc-match-banner">
          <IcoGlobe size={14} /> Partido del Mundial — el resultado se registrará en el torneo
        </div>
      )}

      <div className="live-scoreboard">
        <div className="live-score-team">
          <TeamFlag code={homeCode} size={22} />
          <span className="live-name">{home?.name}</span>
        </div>
        <div className="live-score-center">
          <div className="live-goals">{homeScore} – {awayScore}</div>
          <div className="live-phase">{phaseLabel(phase, minute)}</div>
        </div>
        <div className="live-score-team live-score-team--right">
          <span className="live-name">{away?.name}</span>
          <TeamFlag code={awayCode} size={22} />
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
            <div className="tac-section-title">Mentalidad — {home?.name}</div>
            <MentalitySelector side="home" />
          </div>
          <div className="tac-section">
            <div className="tac-section-title">Mentalidad — {away?.name}</div>
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
            {penaltyWinner && `${penaltyWinner.name} avanza en penales`}
            {matchWinner && `${matchWinner.name} gana`}
            {!penaltyWinner && !matchWinner && isFinished && 'Empate'}
            {!isFinished && homeScore > awayScore && `${home?.name} gana`}
            {!isFinished && awayScore > homeScore && `${away?.name} gana`}
          </div>
        )}
        {(isFinished || isMatchDecided) && isWCMatch && (
          <button className="simulate-btn simulate-btn--wc-apply" onClick={handleApplyWCResult}>
            <IcoGlobe size={16} /> Registrar en el Mundial
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

// ── WC pending match bypass screen ────────────────────────────────────────────

function WCMatchStartView() {
  const homeCode          = useGameStore((s) => s.homeCode);
  const awayCode          = useGameStore((s) => s.awayCode);
  const teams             = useGameStore((s) => s.teams);
  const wcState           = useGameStore((s) => s.wcState);
  const startLiveMatch    = useGameStore((s) => s.startLiveMatch);
  const setAppPage        = useGameStore((s) => s.setAppPage);

  const home = teams[homeCode];
  const away = teams[awayCode];
  const isKnockout = wcState?.pendingMatch?.isKnockout ?? false;

  return (
    <div className="simulator">
      <div className="sim-header">
        <button className="back-btn" onClick={() => setAppPage('worldcup')}>
          ← Mundial
        </button>
        <h2 className="sim-title">Partido del Mundial</h2>
      </div>

      <div className="wc-match-start-banner">
        <div className="wc-match-type-label">
          {isKnockout ? <><IcoSwords size={14} /> Partido de Eliminatoria</> : <><IcoStadium size={14} /> Fase de Grupos</>}
        </div>
        <div className="wc-match-teams-preview">
          <div className="wc-match-team-block">
            <TeamFlag code={homeCode} size={40} />
            <span className="wc-match-team-name">{home?.name}</span>
          </div>
          <span className="wc-match-vs">VS</span>
          <div className="wc-match-team-block">
            <TeamFlag code={awayCode} size={40} />
            <span className="wc-match-team-name">{away?.name}</span>
          </div>
        </div>
        <p className="wc-match-note">
          Ajusta tu alineación, formación y estilo antes de comenzar. Una vez en juego, el cronómetro
          avanza en tiempo real y podrás pausar para hacer cambios.
        </p>
      </div>

      <button className="simulate-btn simulate-btn--realistic simulate-btn--wc-start" onClick={startLiveMatch}>
        <IcoPlay size={15} /> Iniciar Partido en Vivo
      </button>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function MatchSimulator() {
  const matchState      = useGameStore((s) => s.matchState);
  const matchMode       = useGameStore((s) => s.matchMode);
  const wcState         = useGameStore((s) => s.wcState);
  const setAppPage      = useGameStore((s) => s.setAppPage);
  const resetLineup     = useGameStore((s) => s.resetLineup);
  const homeCode        = useGameStore((s) => s.homeCode);
  const awayCode        = useGameStore((s) => s.awayCode);
  const pendingMatchType = useGameStore((s) => s.pendingMatchType);
  const setPendingMatchType = useGameStore((s) => s.setPendingMatchType);

  // Live (real-time WC) match takes priority
  if (matchState?.live) return <LiveMatchView />;

  // Active realistic match (standalone Simular Partido)
  if (matchState) return <RealisticMatchView />;

  // WC match: bypass mode menu, show dedicated start screen
  if (wcState?.pendingMatch) return <WCMatchStartView />;

  const effectiveMode = matchMode === 'custom' ? 'custom' : 'quick';

  return (
    <div className="simulator" data-tut="sim-simulator">
      <div className="sim-header">
        <button className="back-btn" onClick={() => setAppPage('home')}>
          ← Inicio
        </button>
        <h2 className="sim-title">Simular Partido</h2>
        <button
          className="reset-lineup-btn"
          data-tut="sim-reset"
          title="Restaurar alineación original de ambos equipos"
          onClick={() => { resetLineup('home'); resetLineup('away'); }}
        >
          ↺ Reiniciar
        </button>
      </div>

      <div className="sim-type-row" data-tut="sim-type">
        <span className="sim-type-label">Tipo de partido:</span>
        <button
          className={`sim-type-btn ${pendingMatchType === 'group' ? 'sim-type-btn--active' : ''}`}
          onClick={() => setPendingMatchType('group')}
        >Fase de Grupos</button>
        <button
          className={`sim-type-btn ${pendingMatchType === 'knockout' ? 'sim-type-btn--active' : ''}`}
          onClick={() => setPendingMatchType('knockout')}
        >Eliminatoria</button>
      </div>

      <MatchModeMenu />

      <div className="sim-mode-content">
        {effectiveMode === 'quick'  && <QuickSimView />}
        {effectiveMode === 'custom' && <CustomStartView />}
      </div>

      <div className="sim-footer-note">
        {homeCode} vs {awayCode} · Equipos seleccionados arriba
      </div>
    </div>
  );
}
