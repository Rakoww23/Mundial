import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { TeamFlag } from './TeamFlag';
import { VictoryCelebration } from './VictoryCelebration';
import {
  IcoGlobe, IcoGoalScored, IcoYellowCard, IcoRedCard, IcoPlay, IcoClock,
  IcoLightning, IcoUsers, IcoWarning, IcoCheck, IcoGlove, IcoLock,
} from './Icons';
import type { MatchEvent, MatchSpeed, TacticalMentality, MatchState } from '../types';

const MENTALITY_LABELS: Record<TacticalMentality, string> = {
  defensive: 'Defensivo', balanced: 'Equilibrado', offensive: 'Ofensivo', ultraoffensive: 'Ultra-Ofensivo',
};

const SPEEDS: { value: MatchSpeed; label: string }[] = [
  { value: 3,  label: 'Normal' },
  { value: 6,  label: 'Rápida' },
  { value: 12, label: 'Muy Rápida' },
];

function clockLabel(ms: MatchState): string {
  if (ms.phase === 'penalties') return 'Penales';
  if (ms.phase === 'finished') return ms.minute >= 120 ? '120\'' : `${Math.min(ms.minute, 90)}'`;
  if (ms.inExtraTime) return `${ms.minute}' · Prórroga`;
  return `${ms.minute}'`;
}

function statusLabel(ms: MatchState): string {
  if (ms.phase === 'penalties') return 'Tanda de penales';
  if (ms.phase === 'finished') return 'Partido finalizado';
  if (!ms.running) return 'En pausa';
  if (ms.inExtraTime) return 'Tiempo extra en juego';
  if (ms.minute < 45) return 'Primer tiempo';
  if (ms.minute < 90) return 'Segundo tiempo';
  return 'Tiempo cumplido';
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  switch (type) {
    case 'goal':         return <span className="lev-ico lev-ico--goal"><IcoGoalScored size={14} /></span>;
    case 'yellow_card':  return <span className="lev-ico lev-ico--yellow"><IcoYellowCard size={12} /></span>;
    case 'red_card':     return <span className="lev-ico lev-ico--red"><IcoRedCard size={12} /></span>;
    case 'substitution': return <span className="lev-ico lev-ico--sub"><IcoUsers size={13} /></span>;
    case 'injury':       return <span className="lev-ico lev-ico--injury"><IcoWarning size={13} /></span>;
    case 'save':         return <span className="lev-ico lev-ico--save"><IcoGlove size={13} /></span>;
    case 'chance':       return <span className="lev-ico lev-ico--chance"><IcoLightning size={12} /></span>;
    default:             return <span className="lev-ico lev-ico--info"><IcoClock size={12} /></span>;
  }
}

function eventText(ev: MatchEvent, homeName: string, awayName: string): string {
  const team = ev.side === 'home' ? homeName : awayName;
  const last = ev.playerName.split(' ').slice(-1)[0];
  switch (ev.type) {
    case 'goal':         return `Gol de ${ev.playerName} (${team})`;
    case 'yellow_card':  return `Amarilla para ${last}${ev.detail ? ` · ${ev.detail}` : ''}`;
    case 'red_card':     return `Roja para ${last}${ev.detail ? ` · ${ev.detail}` : ''}`;
    case 'substitution': return `Cambio en ${team}: entra ${(ev.secondName ?? '').split(' ').slice(-1)[0]} por ${last}`;
    case 'injury':       return ev.detail ?? `${last} se retira lesionado`;
    case 'save':         return ev.detail ? `Gran ${ev.detail}` : 'Gran parada del portero';
    case 'chance':       return ev.detail ? `Clara ${ev.detail}` : `Ocasión para ${team}`;
    default:             return ev.detail ?? '';
  }
}

function fatigueClass(f: number): string {
  if (f >= 85) return 'fat--crit';
  if (f >= 70) return 'fat--high';
  if (f >= 45) return 'fat--mid';
  return 'fat--low';
}

// ── Substitution panel (user side only, while paused) ───────────────────────────

function SubPanel({ side }: { side: 'home' | 'away' }) {
  const matchState = useGameStore((s) => s.matchState);
  const homeSquad  = useGameStore((s) => s.homeSquad);
  const awaySquad  = useGameStore((s) => s.awaySquad);
  const teams      = useGameStore((s) => s.teams);
  const homeCode   = useGameStore((s) => s.homeCode);
  const awayCode   = useGameStore((s) => s.awayCode);
  const makeLiveSub = useGameStore((s) => s.makeLiveSub);
  const [selSlot, setSelSlot] = useState<number | null>(null);

  if (!matchState) return null;
  const squad = side === 'home' ? homeSquad : awaySquad;
  const team  = teams[side === 'home' ? homeCode : awayCode];
  const subsUsed = (side === 'home' ? matchState.homeSubsUsed : matchState.awaySubsUsed) ?? 0;
  const fatigue = matchState.fatigue ?? {};
  const injured = matchState.injured ?? {};
  const statuses = matchState.playerStatuses;
  const subsLeft = 4 - subsUsed;

  const onPitchIds = new Set(squad.map((s) => s.player?.id).filter(Boolean) as number[]);
  const bench = (team?.players ?? []).filter(
    (p) => !onPitchIds.has(p.id) && statuses[p.id] !== 'suspended' && !injured[p.id],
  );

  return (
    <div className="sub-panel">
      <div className="sub-panel__head">
        <span><IcoUsers size={14} /> Cambios</span>
        <span className={`sub-count${subsLeft === 0 ? ' sub-count--none' : ''}`}>{subsUsed}/4 realizados</span>
      </div>

      {subsLeft === 0 ? (
        <p className="sub-panel__note">Has agotado tus 4 cambios.</p>
      ) : selSlot === null ? (
        <>
          <p className="sub-panel__note">Elige el jugador que quieres reemplazar:</p>
          <div className="sub-list">
            {squad.map((s, i) => {
              if (!s.player) return null;
              const f = Math.round(fatigue[s.player.id] ?? 0);
              const inj = injured[s.player.id];
              return (
                <button
                  key={s.player.id}
                  className={`sub-row${inj ? ' sub-row--injured' : ''}`}
                  onClick={() => setSelSlot(i)}
                >
                  <span className="sub-row__pos">{s.formation.label}</span>
                  <span className="sub-row__name">{s.player.name}</span>
                  <span className={`sub-row__fat ${fatigueClass(f)}`}>{f}%</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <p className="sub-panel__note">
            Entra por <strong>{squad[selSlot].player?.name}</strong>:
            <button className="sub-back" onClick={() => setSelSlot(null)}>cancelar</button>
          </p>
          <div className="sub-list">
            {bench.length === 0 && <p className="sub-panel__note">No hay suplentes disponibles.</p>}
            {bench.map((p) => {
              const f = Math.round(fatigue[p.id] ?? 0);
              return (
                <button
                  key={p.id}
                  className="sub-row sub-row--in"
                  onClick={() => { makeLiveSub(side, selSlot, p.id); setSelSlot(null); }}
                >
                  <span className="sub-row__pos">{p.position}</span>
                  <span className="sub-row__name">{p.name}</span>
                  <span className={`sub-row__fat ${fatigueClass(f)}`}>{f}%</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Mentality selector ──────────────────────────────────────────────────────────

function LiveMentality({ side, editable }: { side: 'home' | 'away'; editable: boolean }) {
  const matchState   = useGameStore((s) => s.matchState);
  const setMentality = useGameStore((s) => s.setMentality);
  if (!matchState) return null;
  const current = side === 'home' ? matchState.homeMentality : matchState.awayMentality;
  const opts: TacticalMentality[] = ['defensive', 'balanced', 'offensive', 'ultraoffensive'];

  if (!editable) {
    return (
      <div className="live-ment live-ment--locked">
        <span className="live-ment__lock"><IcoLock size={11} /> Rival</span>
        <span className="live-ment__cur">{MENTALITY_LABELS[current]}</span>
      </div>
    );
  }
  return (
    <div className="live-ment-row">
      {opts.map((m) => (
        <button
          key={m}
          className={`live-ment-btn${current === m ? ' live-ment-btn--active' : ''}`}
          onClick={() => setMentality(side, m)}
        >
          {MENTALITY_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

// ── Penalty shootout (live knockout) ────────────────────────────────────────────

function LivePenalties() {
  const matchState = useGameStore((s) => s.matchState);
  const takePenalty = useGameStore((s) => s.takePenalty);
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const teams = useGameStore((s) => s.teams);
  if (!matchState) return null;

  const { penalties, homePenaltyScore, awayPenaltyScore, penaltySideNext, phase } = matchState;
  const finished = phase === 'finished';
  const home = penalties.filter((p) => p.side === 'home');
  const away = penalties.filter((p) => p.side === 'away');

  return (
    <div className="live-pens">
      <div className="live-pens__score">
        <span className="live-pens__team"><TeamFlag code={homeCode} size={18} /> {homePenaltyScore}</span>
        <span className="live-pens__sep">Penales</span>
        <span className="live-pens__team">{awayPenaltyScore} <TeamFlag code={awayCode} size={18} /></span>
      </div>
      <div className="live-pens__cols">
        <div className="live-pens__col">
          {home.map((a, i) => (
            <span key={i} className={`pk ${a.scored ? 'pk--y' : 'pk--n'}`}>{a.scored ? '●' : '○'}</span>
          ))}
        </div>
        <div className="live-pens__col">
          {away.map((a, i) => (
            <span key={i} className={`pk ${a.scored ? 'pk--y' : 'pk--n'}`}>{a.scored ? '●' : '○'}</span>
          ))}
        </div>
      </div>
      {!finished && (
        <button className="live-btn live-btn--pen" onClick={takePenalty}>
          <IcoPlay size={14} /> Lanzar penal · {penaltySideNext === 'home' ? teams[homeCode]?.name : teams[awayCode]?.name}
        </button>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────────

export function LiveMatchView() {
  const matchState   = useGameStore((s) => s.matchState);
  const liveTick     = useGameStore((s) => s.liveTick);
  const togglePause  = useGameStore((s) => s.toggleLivePause);
  const setSpeed     = useGameStore((s) => s.setLiveSpeed);
  const skipToEnd    = useGameStore((s) => s.skipLiveToEnd);
  const homeCode     = useGameStore((s) => s.homeCode);
  const awayCode     = useGameStore((s) => s.awayCode);
  const teams        = useGameStore((s) => s.teams);
  const wcState      = useGameStore((s) => s.wcState);
  const applyGroup   = useGameStore((s) => s.applyWCGroupResult);
  const applyKO      = useGameStore((s) => s.applyWCKnockoutResult);
  const setAppPage   = useGameStore((s) => s.setAppPage);

  const [celebrated, setCelebrated] = useState(false);

  const running = matchState?.running ?? false;
  const phase   = matchState?.phase;
  const speed   = matchState?.speed ?? 3;

  // Drive the clock
  useEffect(() => {
    if (!matchState?.live || !running || phase !== 'live') return;
    const interval = setInterval(() => liveTick(), 1000 / speed);
    return () => clearInterval(interval);
  }, [matchState?.live, running, phase, speed, liveTick]);

  if (!matchState || !matchState.live) return null;

  const home = teams[homeCode];
  const away = teams[awayCode];
  const userTeam = wcState?.userTeam;
  const userSide: 'home' | 'away' = homeCode === userTeam ? 'home' : 'away';
  const isKnockout = matchState.type === 'knockout';

  const isLive      = phase === 'live';
  const isPenalties = phase === 'penalties';
  const isFinished  = phase === 'finished';
  const paused      = isLive && !running;

  const hasPens = matchState.penalties.length > 0;
  const showPens = isPenalties || (isFinished && hasPens);

  // result
  let winnerCode: string | null = null;
  if (isFinished) {
    if (hasPens) winnerCode = matchState.homePenaltyScore > matchState.awayPenaltyScore ? homeCode : awayCode;
    else if (matchState.homeScore !== matchState.awayScore) winnerCode = matchState.homeScore > matchState.awayScore ? homeCode : awayCode;
  }
  const userWon = isFinished && winnerCode === userTeam;
  const showCelebration = userWon && !celebrated;

  const handleApply = () => { if (isKnockout) applyKO(); else applyGroup(); };

  const events = [...matchState.events].reverse();

  return (
    <div className="live-match">
      <div className="wc-match-banner">
        <IcoGlobe size={14} /> Partido del Mundial — dirígelo en tiempo real
      </div>

      {/* Scoreboard */}
      <div className="live-board">
        <div className="live-board__side">
          <TeamFlag code={homeCode} size={30} />
          <span className="live-board__name">{home?.name}</span>
        </div>
        <div className="live-board__center">
          <div className="live-board__clock">{clockLabel(matchState)}</div>
          <div className="live-board__score">{matchState.homeScore} <span>–</span> {matchState.awayScore}</div>
          <div className={`live-board__status${paused ? ' live-board__status--paused' : ''}`}>{statusLabel(matchState)}</div>
        </div>
        <div className="live-board__side live-board__side--right">
          <span className="live-board__name">{away?.name}</span>
          <TeamFlag code={awayCode} size={30} />
        </div>
      </div>

      {/* Controls */}
      {isLive && (
        <div className="live-controls">
          <div className="live-speed">
            {SPEEDS.map((sp) => (
              <button
                key={sp.value}
                className={`live-speed-btn${speed === sp.value ? ' live-speed-btn--active' : ''}`}
                onClick={() => setSpeed(sp.value)}
                title={`1 s = ${sp.value} min`}
              >
                {sp.label}
              </button>
            ))}
          </div>
          <div className="live-actions-row">
            <button className={`live-btn ${running ? 'live-btn--pause' : 'live-btn--resume'}`} onClick={togglePause}>
              {running ? '❚❚ Pausar' : <><IcoPlay size={14} /> Reanudar</>}
            </button>
            <button className="live-btn live-btn--skip" onClick={skipToEnd}>
              <IcoLightning size={14} /> Saltar Simulación
            </button>
          </div>
        </div>
      )}

      {/* Pause-only management */}
      {paused && (
        <div className="live-manage">
          <p className="live-manage__hint">
            Partido en pausa · ajusta tu estilo o realiza cambios. El rival decide por su cuenta.
          </p>
          <div className="live-tac">
            <div className="live-tac__block">
              <div className="live-tac__title">Estilo — {userSide === 'home' ? home?.name : away?.name}</div>
              <LiveMentality side={userSide} editable />
            </div>
            <div className="live-tac__block">
              <div className="live-tac__title">Estilo — {userSide === 'home' ? away?.name : home?.name}</div>
              <LiveMentality side={userSide === 'home' ? 'away' : 'home'} editable={false} />
            </div>
          </div>
          <SubPanel side={userSide} />
        </div>
      )}

      {showPens && <LivePenalties />}

      {/* Event feed */}
      {!showPens && (
        <div className="live-feed">
          <div className="live-feed__head"><IcoClock size={13} /> Relato del partido</div>
          {events.length === 0 ? (
            <p className="live-feed__empty">El partido está por comenzar…</p>
          ) : (
            <div className="live-feed__list">
              {events.map((ev, i) => (
                <div key={`${ev.minute}-${i}`} className={`live-feed__row live-feed__row--${ev.type}`}>
                  <span className="live-feed__min">{ev.minute}'</span>
                  <EventIcon type={ev.type} />
                  <span className="live-feed__txt">{eventText(ev, home?.name ?? homeCode, away?.name ?? awayCode)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Final actions */}
      {isFinished && (
        <div className="live-final">
          <div className="live-final__result">
            {winnerCode
              ? <><IcoCheck size={15} /> {teams[winnerCode]?.name} {hasPens ? 'avanza en penales' : 'gana el partido'}</>
              : 'Empate'}
          </div>
          <button className="live-btn live-btn--register" onClick={handleApply}>
            <IcoGlobe size={15} /> Registrar en el Mundial
          </button>
          <button className="live-back" onClick={() => setAppPage('worldcup')}>← Volver sin registrar</button>
        </div>
      )}

      {showCelebration && (
        <VictoryCelebration
          teamCode={userTeam!}
          teamName={teams[userTeam!]?.name ?? ''}
          subtitle={hasPens ? 'Triunfo en los penales' : `${matchState.homeScore} – ${matchState.awayScore}`}
          onContinue={() => setCelebrated(true)}
        />
      )}
    </div>
  );
}
