import { useGameStore } from '../../store/gameStore';
import {
  computePKStandings, currentPKRoundKey, PK_MD_KEYS,
} from '../../services/penaltyTournamentEngine';
import { IcoGoal, IcoTrophy, IcoLightning, IcoPlay, IcoX, IcoTarget, IcoStar } from '../Icons';
import { TeamFlag } from '../TeamFlag';
import type { PKGroup, PenaltyTournamentState, PKRoundKey } from '../../types/penalty';
import type { WCKnockoutMatch } from '../../types';

// ── Group standings card ─────────────────────────────────────────────────────────

function PKGroupCard({ group, userTeam }: { group: PKGroup; userTeam: string }) {
  const teams = useGameStore((s) => s.teams);
  const standings = computePKStandings(group);

  return (
    <div className="group-card">
      <div className="group-card__title">
        <span className="group-card__letter">Grupo {group.id}</span>
      </div>
      <div className="standings-list">
        {standings.map((s, i) => {
          const qualifies = i < 2;
          const isUser = s.code === userTeam;
          const diff = s.pkFor - s.pkAgainst;
          return (
            <div
              key={s.code}
              className={[
                'standings-row',
                isUser ? 'standings-row--user' : '',
                qualifies ? 'standings-row--qualified' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="standings-pos">{i + 1}</span>
              <span className={`standings-qual-dot${qualifies ? ' standings-qual-dot--on' : ''}`} />
              <TeamFlag code={s.code} size={14} />
              <span className="standings-name">{teams[s.code]?.name ?? s.code}</span>
              <span className="standings-stat">{s.won}-{s.lost}</span>
              <span className="standings-stat standings-stat--gd">{diff > 0 ? `+${diff}` : diff}</span>
              <span className="standings-pts">{s.points}</span>
            </div>
          );
        })}
      </div>
      <div className="group-card__legend">
        <span className="standings-qual-dot standings-qual-dot--on" /> Clasifica · 2 mejores + 8 mejores terceros
      </div>
    </div>
  );
}

// ── Group matchday fixtures ──────────────────────────────────────────────────────

function PKMatchday({ pk }: { pk: PenaltyTournamentState }) {
  const teams = useGameStore((s) => s.teams);
  const pkAutoSimOthers = useGameStore((s) => s.pkAutoSimOthers);
  const pkPlayUserMatch = useGameStore((s) => s.pkPlayUserMatch);
  const pkAdvance = useGameStore((s) => s.pkAdvance);

  const mdIdx = Math.min(pk.currentMatchday, 2);
  const mdKey = PK_MD_KEYS[mdIdx];
  const groupKeys = Object.keys(pk.groups).sort();
  const userTeam = pk.userTeam;

  const all = groupKeys.flatMap((gId) => pk.groups[gId][mdKey]);
  const allPlayed = all.every((m) => m.winner !== null);
  const nonUserUnplayed = all.some((m) => m.winner === null && m.home !== userTeam && m.away !== userTeam);

  return (
    <div className="matchday-section">
      <div className="matchday-header">
        <div className="matchday-label">
          <span className="matchday-badge">J{mdIdx + 1}</span>
          <h3>Jornada {mdIdx + 1}</h3>
        </div>
        <div className="matchday-actions">
          {nonUserUnplayed && (
            <button className="wc-action-btn" onClick={pkAutoSimOthers}>
              <IcoLightning size={14} /> Auto-simular
            </button>
          )}
          {allPlayed && mdIdx < 2 && (
            <button className="wc-action-btn wc-action-btn--advance" onClick={pkAdvance}>
              <IcoPlay size={14} /> Jornada {mdIdx + 2}
            </button>
          )}
          {allPlayed && mdIdx === 2 && (
            <button className="wc-action-btn wc-action-btn--advance" onClick={pkAdvance}>
              <IcoTrophy size={14} /> Ver Eliminatorias
            </button>
          )}
        </div>
      </div>

      <div className="fixtures-grid">
        {groupKeys.map((gId) => {
          const matches = pk.groups[gId][mdKey];
          return (
            <div key={gId} className="fixture-group">
              <div className="fixture-group__label">Grupo {gId}</div>
              {matches.map((m) => {
                const isUserMatch = m.home === userTeam || m.away === userTeam;
                const played = m.winner !== null;
                return (
                  <div
                    key={m.id}
                    className={`fixture-row${isUserMatch ? ' fixture-row--user' : ''}${played ? ' fixture-row--played' : ''}`}
                  >
                    <span className={`fixture-team fixture-team--home${m.winner === m.home ? ' fixture-team--won' : ''}`}>
                      <TeamFlag code={m.home} size={14} />
                      <span className="fixture-team-name">{teams[m.home]?.name ?? m.home}</span>
                    </span>
                    {played ? (
                      <span className="fixture-score">
                        {m.homePK} <span className="fixture-score-sep">–</span> {m.awayPK}
                        <span className="pk-pens-tag">pen</span>
                      </span>
                    ) : isUserMatch ? (
                      <button className="fixture-play-btn" onClick={pkPlayUserMatch}>
                        <IcoGoal size={11} /> Jugar tanda
                      </button>
                    ) : (
                      <span className="fixture-vs">vs</span>
                    )}
                    <span className={`fixture-team fixture-team--away${m.winner === m.away ? ' fixture-team--won' : ''}`}>
                      <span className="fixture-team-name">{teams[m.away]?.name ?? m.away}</span>
                      <TeamFlag code={m.away} size={14} />
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Knockout ─────────────────────────────────────────────────────────────────────

function PKKnockoutCard({ match, userTeam }: { match: WCKnockoutMatch; userTeam: string }) {
  const teams = useGameStore((s) => s.teams);
  const pkPlayUserMatch = useGameStore((s) => s.pkPlayUserMatch);

  const isUserMatch = match.home === userTeam || match.away === userTeam;
  const played = match.winner !== null;
  const tbd = !match.home || !match.away;
  const homeWon = match.winner === match.home;
  const awayWon = match.winner === match.away;

  return (
    <div className={`ko-match${isUserMatch ? ' ko-match--user' : ''}${played ? ' ko-match--played' : ''}`}>
      <div className={`ko-team${homeWon ? ' ko-team--winner' : played ? ' ko-team--loser' : ''}`}>
        {match.home ? (
          <>
            <TeamFlag code={match.home} size={16} />
            <span className="ko-team-name">{teams[match.home]?.name ?? match.home}</span>
          </>
        ) : <span className="ko-tbd">Por definir</span>}
        {match.homePenalties !== null && <span className="ko-goals">{match.homePenalties}</span>}
      </div>
      <div className="ko-sep">{played ? '–' : tbd ? '?' : 'vs'}</div>
      <div className={`ko-team ko-team--away${awayWon ? ' ko-team--winner' : played ? ' ko-team--loser' : ''}`}>
        {match.awayPenalties !== null && <span className="ko-goals">{match.awayPenalties}</span>}
        {match.away ? (
          <>
            <span className="ko-team-name">{teams[match.away]?.name ?? match.away}</span>
            <TeamFlag code={match.away} size={16} />
          </>
        ) : <span className="ko-tbd">Por definir</span>}
      </div>
      {!played && !tbd && isUserMatch && (
        <button className="ko-play-btn" onClick={pkPlayUserMatch}>
          <IcoGoal size={11} /> Jugar tanda
        </button>
      )}
    </div>
  );
}

const ROUND_LABELS: { key: PKRoundKey; label: string }[] = [
  { key: 'r32', label: 'Dieciseisavos de Final' },
  { key: 'r16', label: 'Octavos de Final' },
  { key: 'qf', label: 'Cuartos de Final' },
  { key: 'sf', label: 'Semifinales' },
  { key: 'final', label: 'Final' },
];

function PKKnockoutView({ pk }: { pk: PenaltyTournamentState }) {
  const pkAutoSimOthers = useGameStore((s) => s.pkAutoSimOthers);
  const pkAdvance = useGameStore((s) => s.pkAdvance);
  const userTeam = pk.userTeam;

  const currentKey = currentPKRoundKey(pk);
  const roundComplete = currentKey ? pk[currentKey].every((m) => m.winner !== null) : false;
  const canSimulate = currentKey && pk[currentKey].some(
    (m) => m.winner === null && m.home && m.away && m.home !== userTeam && m.away !== userTeam,
  );

  return (
    <div className="knockout-view">
      {(canSimulate || roundComplete) && (
        <div className="ko-actions">
          {canSimulate && (
            <button className="wc-action-btn" onClick={pkAutoSimOthers}>
              <IcoLightning size={14} /> Auto-simular Otros Partidos
            </button>
          )}
          {roundComplete && currentKey !== 'final' && (
            <button className="wc-action-btn wc-action-btn--advance" onClick={pkAdvance}>
              <IcoPlay size={14} /> Siguiente Ronda
            </button>
          )}
          {roundComplete && currentKey === 'final' && (
            <button className="wc-action-btn wc-action-btn--advance" onClick={pkAdvance}>
              <IcoTrophy size={14} /> Coronar Campeón
            </button>
          )}
        </div>
      )}

      {ROUND_LABELS.map(({ key, label }) => {
        if (pk[key].length === 0) return null;
        const isCurrent = key === currentKey;
        return (
          <div key={key} className={`ko-round${isCurrent ? ' ko-round--current' : ''}`}>
            <div className="ko-round__header">
              <h3 className="ko-round__title">{label}</h3>
              {isCurrent && <span className="ko-round__live">En curso</span>}
            </div>
            <div className="ko-matches">
              {pk[key].map((m) => (
                <PKKnockoutCard key={m.id} match={m} userTeam={userTeam} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────────

function PKProgress({ pk }: { pk: PenaltyTournamentState }) {
  const steps = ['J1', 'J2', 'J3', 'R32', 'R16', 'QF', 'SF', 'Final'];
  let current = 0;
  if (pk.phase === 'groups') current = Math.min(pk.currentMatchday, 2);
  else if (pk.phase === 'knockout') {
    const key = currentPKRoundKey(pk);
    const idx = key ? ['r32', 'r16', 'qf', 'sf', 'final'].indexOf(key) : 4;
    current = 3 + (idx >= 0 ? idx : 4);
  } else current = 7;

  return (
    <div className="wc-progress">
      {steps.map((s, i) => (
        <div key={s} className={`wc-progress__step${i < current ? ' wc-progress__step--done' : ''}${i === current ? ' wc-progress__step--active' : ''}`}>
          <div className="wc-progress__dot" />
          <span className="wc-progress__label">{s}</span>
        </div>
      ))}
    </div>
  );
}

// ── User stats strip ─────────────────────────────────────────────────────────────

function PKStats({ pk }: { pk: PenaltyTournamentState }) {
  const { stats } = pk;
  return (
    <div className="pk-stats">
      <div className="pk-stat"><span className="pk-stat__val">{stats.shootoutsPlayed}</span><span className="pk-stat__lbl">Tandas</span></div>
      <div className="pk-stat"><span className="pk-stat__val">{stats.shootoutsWon}</span><span className="pk-stat__lbl">Ganadas</span></div>
      <div className="pk-stat"><span className="pk-stat__val">{stats.shootoutsLost}</span><span className="pk-stat__lbl">Perdidas</span></div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────────

export function PenaltyTournamentView() {
  const pk = useGameStore((s) => s.pkState);
  const teams = useGameStore((s) => s.teams);
  const setAppPage = useGameStore((s) => s.setAppPage);
  const resetPenaltyTournament = useGameStore((s) => s.resetPenaltyTournament);

  if (!pk) return null;
  const userTeam = pk.userTeam;

  // Champion screen
  if (pk.phase === 'finished' && pk.champion) {
    const isUserChamp = pk.champion === userTeam;
    return (
      <div className="wc-page pk-page">
        <div className="wc-finished pk-finished">
          <div className="wc-trophy-wrap"><IcoTrophy size={64} /></div>
          <div className="wc-champion-flag"><TeamFlag code={pk.champion} size={48} /></div>
          <h2 className="wc-champion-title">Campeón de Penales</h2>
          <div className="wc-champion-name">{teams[pk.champion]?.name ?? pk.champion}</div>
          {isUserChamp && <p className="wc-user-won">Tu selección dominó desde los once metros</p>}
          <PKStats pk={pk} />
          <button className="wc-reset-btn" onClick={resetPenaltyTournament}>↩ Nueva Competición</button>
        </div>
      </div>
    );
  }

  // Eliminated screen
  if (pk.phase === 'eliminated') {
    return (
      <div className="wc-page pk-page">
        <div className="wc-finished pk-finished pk-eliminated">
          <div className="pk-eliminated__icon"><IcoTarget size={56} /></div>
          <div className="wc-champion-flag"><TeamFlag code={userTeam} size={44} /></div>
          <h2 className="wc-champion-title">Eliminado</h2>
          <div className="wc-champion-name">{teams[userTeam]?.name ?? userTeam}</div>
          <p className="pk-eliminated__sub">Tu camino termina aquí. Las tandas no perdonan.</p>
          <PKStats pk={pk} />
          <button className="wc-reset-btn" onClick={resetPenaltyTournament}>↩ Nueva Competición</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wc-page pk-page">
      <div className="wc-topbar">
        <button className="back-btn" onClick={() => setAppPage('home')}>← Inicio</button>
        <div className="wc-topbar__title">
          <IcoStar size={15} />
          <span>Penales 2026</span>
          <span className="wc-topbar__sep">·</span>
          <TeamFlag code={userTeam} size={16} />
          <span>{teams[userTeam]?.name}</span>
        </div>
        <button className="wc-reset-small" onClick={resetPenaltyTournament} title="Reiniciar">
          <IcoX size={12} />
        </button>
      </div>

      <PKProgress pk={pk} />
      <PKStats pk={pk} />

      {pk.phase === 'groups' && (
        <>
          <div className="wc-groups-grid">
            {Object.keys(pk.groups).sort().map((gId) => (
              <PKGroupCard key={gId} group={pk.groups[gId]} userTeam={userTeam} />
            ))}
          </div>
          <PKMatchday pk={pk} />
        </>
      )}

      {pk.phase === 'knockout' && <PKKnockoutView pk={pk} />}
    </div>
  );
}
