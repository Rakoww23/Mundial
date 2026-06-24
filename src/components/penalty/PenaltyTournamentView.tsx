import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { currentPKRoundKey } from '../../services/penaltyTournamentEngine';
import { IcoGoal, IcoTrophy, IcoStar, IcoX, IcoTarget } from '../Icons';
import { TeamFlag } from '../TeamFlag';
import type { PenaltyTournamentState, PKRoundKey, PKLastResult } from '../../types/penalty';
import type { WCKnockoutMatch } from '../../types';

const ROUND_DEFS: { key: PKRoundKey; label: string; short: string }[] = [
  { key: 'r32', label: 'Dieciseisavos', short: '16avos' },
  { key: 'r16', label: 'Octavos', short: 'Octavos' },
  { key: 'qf', label: 'Cuartos', short: 'Cuartos' },
  { key: 'sf', label: 'Semifinal', short: 'Semis' },
  { key: 'final', label: 'Final', short: 'Final' },
];

// ── Bracket ──────────────────────────────────────────────────────────────────────

function BracketTeam({ code, isUser, won, played, pk }: {
  code: string | null; isUser: boolean; won: boolean; played: boolean; pk: number | null;
}) {
  return (
    <div className={['pk-br-team', isUser ? 'pk-br-team--user' : '', won ? 'pk-br-team--won' : (played ? 'pk-br-team--lost' : '')].filter(Boolean).join(' ')}>
      {code ? <TeamFlag code={code} size={13} /> : <span className="pk-br-tbd-dot" />}
      <span className="pk-br-code">{code ?? '—'}</span>
      {pk !== null && <span className="pk-br-pk">{pk}</span>}
    </div>
  );
}

function BracketMatch({ m, userTeam, isCurrent, cellRef }: {
  m: WCKnockoutMatch; userTeam: string; isCurrent: boolean;
  cellRef?: (el: HTMLDivElement | null) => void;
}) {
  const played = m.winner !== null;
  return (
    <div ref={cellRef} className={`pk-br-match${isCurrent ? ' pk-br-match--current' : ''}`}>
      <BracketTeam code={m.home} isUser={m.home === userTeam} won={m.winner === m.home} played={played} pk={m.homePenalties} />
      <BracketTeam code={m.away} isUser={m.away === userTeam} won={m.winner === m.away} played={played} pk={m.awayPenalties} />
    </div>
  );
}

function PKBracket({ pk, currentRound }: { pk: PenaltyTournamentState; currentRound: PKRoundKey | null }) {
  const userTeam = pk.userTeam;
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentCellRef = useRef<HTMLDivElement | null>(null);

  // Keep the user's live match in view as the bracket grows.
  useEffect(() => {
    currentCellRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentRound, pk.r16.length, pk.qf.length, pk.sf.length, pk.final.length]);

  const userInMatch = (m: WCKnockoutMatch) => m.home === userTeam || m.away === userTeam;

  return (
    <div className="pk-bracket-scroll" ref={scrollRef}>
      <div className="pk-bracket">
        {ROUND_DEFS.map(({ key, label }) => {
          const matches = pk[key];
          if (matches.length === 0) return null;
          const isCurrentRound = key === currentRound;
          return (
            <div key={key} className="pk-br-col">
              <div className="pk-br-col__head">{label}</div>
              <div className="pk-br-col__matches">
                {matches.map((m) => {
                  const isCurrent = isCurrentRound && userInMatch(m) && m.winner === null;
                  return (
                    <BracketMatch
                      key={m.id} m={m} userTeam={userTeam} isCurrent={isCurrent}
                      cellRef={isCurrent ? (el) => { currentCellRef.current = el; } : undefined}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {pk.third.length > 0 && (
        <div className="pk-third-wrap">
          <div className="pk-br-col__head pk-br-col__head--third">Tercer puesto</div>
          <BracketMatch
            m={pk.third[0]} userTeam={userTeam}
            isCurrent={pk.third[0].winner === null && userInMatch(pk.third[0])}
            cellRef={pk.third[0].winner === null && userInMatch(pk.third[0]) ? (el) => { currentCellRef.current = el; } : undefined}
          />
        </div>
      )}
    </div>
  );
}

// ── Next-match CTA (always visible, no scrolling needed) ──────────────────────────

function NextMatchBar({ pk }: { pk: PenaltyTournamentState }) {
  const teams = useGameStore((s) => s.teams);
  const pkStartUserShootout = useGameStore((s) => s.pkStartUserShootout);
  const userTeam = pk.userTeam;

  // Find the user's pending match (third place first, then the active round).
  let opponent: string | null = null;
  let roundLabel = '';
  if (pk.third.length && pk.third[0].winner === null && (pk.third[0].home === userTeam || pk.third[0].away === userTeam)) {
    opponent = pk.third[0].home === userTeam ? pk.third[0].away : pk.third[0].home;
    roundLabel = 'Tercer puesto';
  } else {
    const rk = currentPKRoundKey(pk);
    if (rk) {
      const m = pk[rk].find((x) => (x.home === userTeam || x.away === userTeam) && x.winner === null);
      if (m) {
        opponent = m.home === userTeam ? m.away : m.home;
        roundLabel = ROUND_DEFS.find((r) => r.key === rk)?.label ?? '';
      }
    }
  }
  if (!opponent) return null;

  return (
    <div className="pk-next-bar">
      <div className="pk-next-bar__info">
        <span className="pk-next-bar__round">{roundLabel}</span>
        <div className="pk-next-bar__teams">
          <span className="pk-next-bar__team"><TeamFlag code={userTeam} size={20} /> {teams[userTeam]?.name}</span>
          <span className="pk-next-bar__vs">vs</span>
          <span className="pk-next-bar__team">{teams[opponent]?.name} <TeamFlag code={opponent} size={20} /></span>
        </div>
      </div>
      <button className="pk-jugar-btn" onClick={pkStartUserShootout}>
        <IcoGoal size={18} /> Jugar
      </button>
    </div>
  );
}

// ── Transition screen (after a shootout) ──────────────────────────────────────────

function TransitionScreen({ pk, last }: { pk: PenaltyTournamentState; last: PKLastResult }) {
  const teams = useGameStore((s) => s.teams);
  const pkStartUserShootout = useGameStore((s) => s.pkStartUserShootout);
  const pkDismissResult = useGameStore((s) => s.pkDismissResult);
  const advance = last.context === 'advance';

  return (
    <div className="pk-transition">
      <div className="pk-transition__card">
        <div className={`pk-transition__badge${advance ? ' pk-transition__badge--win' : ' pk-transition__badge--info'}`}>
          {advance ? '¡Tanda ganada!' : 'Semifinal perdida'}
        </div>
        <div className="pk-transition__score">
          <TeamFlag code={pk.userTeam} size={26} />
          <span className="pk-transition__nums">{last.userPK} – {last.rivalPK}</span>
          <TeamFlag code={last.rival} size={26} />
        </div>
        <p className="pk-transition__line">
          {advance
            ? <>Eliminaste a <strong>{teams[last.rival]?.name ?? last.rival}</strong></>
            : <>Caíste ante <strong>{teams[last.rival]?.name ?? last.rival}</strong>. Jugarás por el tercer puesto.</>}
        </p>
        {last.nextOpponent && (
          <div className="pk-transition__next">
            <span className="pk-transition__next-lbl">Próximo rival</span>
            <span className="pk-transition__next-team">
              <TeamFlag code={last.nextOpponent} size={22} /> {teams[last.nextOpponent]?.name ?? last.nextOpponent}
            </span>
          </div>
        )}
        <div className="pk-transition__actions">
          <button className="pk-jugar-btn pk-jugar-btn--lg" onClick={pkStartUserShootout}>
            <IcoGoal size={18} /> Jugar
          </button>
          <button className="pk-ctrl-btn" onClick={pkDismissResult}>
            <IcoTarget size={13} /> Ver Llaves
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Terminal screens ──────────────────────────────────────────────────────────────

function PlacementScreen({ pk, last }: { pk: PenaltyTournamentState; last: PKLastResult | null }) {
  const teams = useGameStore((s) => s.teams);
  const reset = useGameStore((s) => s.resetPenaltyTournament);
  const res = pk.userResult;

  const title = res === 'champion' ? 'Campeón del Mundo'
    : res === 'runnerup' ? 'Subcampeón'
    : res === 'third' ? 'Tercer Puesto'
    : 'Cuarto Puesto';
  const isChamp = res === 'champion';

  return (
    <div className="wc-page pk-page">
      <div className="wc-finished pk-finished">
        <div className="wc-trophy-wrap" style={{ color: isChamp ? 'var(--gold)' : 'var(--tx-2)' }}>
          {isChamp ? <IcoTrophy size={64} /> : <IcoStar size={56} />}
        </div>
        <div className="wc-champion-flag"><TeamFlag code={pk.userTeam} size={48} /></div>
        <h2 className="wc-champion-title">{title}</h2>
        <div className="wc-champion-name">{teams[pk.userTeam]?.name ?? pk.userTeam}</div>
        {isChamp && <p className="wc-user-won">Tu selección conquistó el mundo desde los once metros</p>}
        {last && <p className="pk-finished__score">Última tanda: {last.userPK} – {last.rivalPK} vs {teams[last.rival]?.name ?? last.rival}</p>}
        <PKStats pk={pk} />
        <button className="wc-reset-btn" onClick={reset}>↩ Nueva Competición</button>
      </div>
    </div>
  );
}

function EliminatedScreen({ pk, last }: { pk: PenaltyTournamentState; last: PKLastResult | null }) {
  const teams = useGameStore((s) => s.teams);
  const reset = useGameStore((s) => s.resetPenaltyTournament);
  const roundLabel = ROUND_DEFS.find((r) => r.key === pk.eliminatedRound)?.label ?? '';

  return (
    <div className="wc-page pk-page">
      <div className="wc-finished pk-finished pk-eliminated">
        <div className="pk-eliminated__icon"><IcoTarget size={56} /></div>
        <div className="wc-champion-flag"><TeamFlag code={pk.userTeam} size={44} /></div>
        <h2 className="wc-champion-title">Eliminado</h2>
        <div className="wc-champion-name">{teams[pk.userTeam]?.name ?? pk.userTeam}</div>
        <p className="pk-eliminated__sub">
          {roundLabel ? `Tu camino termina en ${roundLabel}.` : 'Tu camino termina aquí.'} Las tandas no perdonan.
        </p>
        {last && <p className="pk-finished__score">{last.userPK} – {last.rivalPK} vs {teams[last.rival]?.name ?? last.rival}</p>}
        <PKStats pk={pk} />
        <button className="wc-reset-btn" onClick={reset}>↩ Nueva Competición</button>
      </div>
    </div>
  );
}

function PKStats({ pk }: { pk: PenaltyTournamentState }) {
  const { stats } = pk;
  const savePct = stats.kicksFaced > 0 ? Math.round((stats.kicksSaved / stats.kicksFaced) * 100) : 0;
  return (
    <div className="pk-stats">
      <div className="pk-stat"><span className="pk-stat__val">{stats.shootoutsWon}</span><span className="pk-stat__lbl">Tandas ganadas</span></div>
      <div className="pk-stat"><span className="pk-stat__val">{stats.kicksScored}</span><span className="pk-stat__lbl">Goles</span></div>
      <div className="pk-stat"><span className="pk-stat__val">{savePct}%</span><span className="pk-stat__lbl">Atajadas</span></div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────────

export function PenaltyTournamentView() {
  const pk = useGameStore((s) => s.pkState);
  const teams = useGameStore((s) => s.teams);
  const setAppPage = useGameStore((s) => s.setAppPage);
  const reset = useGameStore((s) => s.resetPenaltyTournament);
  const last = useGameStore((s) => s.pkLastResult);

  if (!pk) return null;

  if (pk.phase === 'finished') return <PlacementScreen pk={pk} last={last} />;
  if (pk.phase === 'eliminated') return <EliminatedScreen pk={pk} last={last} />;

  const currentRound = currentPKRoundKey(pk);
  const showTransition = last && (last.context === 'advance' || last.context === 'thirdplace');

  return (
    <div className="wc-page pk-page">
      <div className="wc-topbar">
        <button className="back-btn" onClick={() => setAppPage('home')}>← Inicio</button>
        <div className="wc-topbar__title">
          <IcoStar size={15} />
          <span>Penales 2026</span>
          <span className="wc-topbar__sep">·</span>
          <TeamFlag code={pk.userTeam} size={16} />
          <span>{teams[pk.userTeam]?.name}</span>
        </div>
        <button className="wc-reset-small" onClick={reset} title="Reiniciar">
          <IcoX size={12} />
        </button>
      </div>

      {!showTransition && <NextMatchBar pk={pk} />}
      <PKBracket pk={pk} currentRound={currentRound} />

      {showTransition && <TransitionScreen pk={pk} last={last!} />}
    </div>
  );
}
