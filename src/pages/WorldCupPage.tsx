import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { computeStandings } from '../services/worldCupEngine';
import { IcoGlobe, IcoRocket, IcoTrophy, IcoLightning, IcoPlay, IcoX, IcoCheck } from '../components/Icons';
import { TeamFlag } from '../components/TeamFlag';
import type { WCGroup, WCKnockoutMatch, WorldCupState } from '../types';

// ── Team setup ─────────────────────────────────────────────────────────────────

function WCSetup() {
  const teams        = useGameStore((s) => s.teams);
  const startWorldCup = useGameStore((s) => s.startWorldCup);
  const setAppPage   = useGameStore((s) => s.setAppPage);
  const [selected, setSelected] = useState('');
  const [search, setSearch]     = useState('');

  const allCodes = Object.keys(teams).sort((a, b) =>
    teams[a].name.localeCompare(teams[b].name)
  );

  const filteredCodes = search.trim()
    ? allCodes.filter((c) =>
        teams[c].name.toLowerCase().includes(search.toLowerCase()) ||
        c.toLowerCase().includes(search.toLowerCase())
      )
    : allCodes;

  return (
    <div className="wc-setup">
      <div className="wc-setup__header">
        <button className="back-btn" onClick={() => setAppPage('home')}>← Volver</button>
        <div className="wc-setup__hero">
          <IcoGlobe size={32} />
          <h2>Copa Mundial 2026</h2>
          <p>Elige tu selección y guíala hasta la gloria</p>
        </div>
      </div>

      <div className="wc-search-wrap">
        <input
          className="wc-search-input"
          type="text"
          placeholder="Buscar selección..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="wc-search-clear" onClick={() => setSearch('')}>
            <IcoX size={12} />
          </button>
        )}
      </div>

      <div className="wc-team-grid">
        {filteredCodes.map((code) => (
          <button
            key={code}
            className={`wc-team-btn${selected === code ? ' wc-team-btn--selected' : ''}`}
            onClick={() => setSelected(code)}
          >
            <TeamFlag code={code} size={22} />
            <span className="wc-team-name">{teams[code].name}</span>
            {selected === code && <span className="wc-team-check"><IcoCheck size={12} /></span>}
          </button>
        ))}
        {filteredCodes.length === 0 && (
          <p className="wc-no-results">Sin resultados para "{search}"</p>
        )}
      </div>

      {selected && (
        <div className="wc-confirm">
          <div className="wc-confirm__team">
            <TeamFlag code={selected} size={28} />
            <span>{teams[selected].name}</span>
          </div>
          <button className="wc-start-btn" onClick={() => startWorldCup(selected)}>
            <IcoRocket size={16} /> Iniciar Mundial
          </button>
        </div>
      )}
    </div>
  );
}

// ── Group card ─────────────────────────────────────────────────────────────────

function GroupCard({ group, userTeam }: { group: WCGroup; userTeam: string }) {
  const teams      = useGameStore((s) => s.teams);
  const standings  = computeStandings(group);

  return (
    <div className="group-card">
      <div className="group-card__title">
        <span className="group-card__letter">Grupo {group.id}</span>
      </div>
      <div className="standings-list">
        {standings.map((s, i) => {
          const qualifies = i < 2;
          const isUser    = s.code === userTeam;
          const gd        = s.gf - s.ga;
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
              <span className="standings-stat">{s.played}</span>
              <span className="standings-stat standings-stat--gd">{gd > 0 ? `+${gd}` : gd}</span>
              <span className="standings-pts">{s.points}</span>
            </div>
          );
        })}
      </div>
      <div className="group-card__legend">
        <span className="standings-qual-dot standings-qual-dot--on" /> Clasifica
      </div>
    </div>
  );
}

// ── Group stage matchday ───────────────────────────────────────────────────────

function MatchdayFixtures({ matchdayIdx }: { matchdayIdx: number }) {
  const teams               = useGameStore((s) => s.teams);
  const wcState             = useGameStore((s) => s.wcState);
  const simulateWCMatchday  = useGameStore((s) => s.simulateWCMatchday);
  const playWCGroupMatch    = useGameStore((s) => s.playWCGroupMatch);
  const advanceWCMatchday   = useGameStore((s) => s.advanceWCMatchday);
  const buildWCKnockout     = useGameStore((s) => s.buildWCKnockout);

  if (!wcState || wcState.phase !== 'groups') return null;

  const mdKey      = (['md1', 'md2', 'md3'] as const)[matchdayIdx];
  const groupKeys  = Object.keys(wcState.groups).sort();
  const userTeam   = wcState.userTeam;

  const allGroupMatches  = groupKeys.flatMap((gId) => wcState.groups[gId][mdKey]);
  const allPlayed        = allGroupMatches.every((m) => m.homeGoals !== null);
  const nonUserUnplayed  = allGroupMatches.some(
    (m) => m.homeGoals === null && m.home !== userTeam && m.away !== userTeam
  );

  return (
    <div className="matchday-section">
      <div className="matchday-header">
        <div className="matchday-label">
          <span className="matchday-badge">J{matchdayIdx + 1}</span>
          <h3>Jornada {matchdayIdx + 1}</h3>
        </div>
        <div className="matchday-actions">
          {nonUserUnplayed && (
            <button className="wc-action-btn" onClick={simulateWCMatchday}>
              <IcoLightning size={14} /> Auto-simular
            </button>
          )}
          {allPlayed && matchdayIdx < 2 && (
            <button className="wc-action-btn wc-action-btn--advance" onClick={advanceWCMatchday}>
              <IcoPlay size={14} /> Jornada {matchdayIdx + 2}
            </button>
          )}
          {allPlayed && matchdayIdx === 2 && (
            <button className="wc-action-btn wc-action-btn--advance" onClick={buildWCKnockout}>
              <IcoTrophy size={14} /> Ver Eliminatorias
            </button>
          )}
        </div>
      </div>

      <div className="fixtures-grid">
        {groupKeys.map((gId) => {
          const matches = wcState.groups[gId][mdKey];
          return (
            <div key={gId} className="fixture-group">
              <div className="fixture-group__label">Grupo {gId}</div>
              {matches.map((m, idx) => {
                const isUserMatch = m.home === userTeam || m.away === userTeam;
                const played      = m.homeGoals !== null;
                return (
                  <div
                    key={m.id}
                    className={`fixture-row${isUserMatch ? ' fixture-row--user' : ''}${played ? ' fixture-row--played' : ''}`}
                  >
                    <span className="fixture-team fixture-team--home">
                      <TeamFlag code={m.home} size={14} />
                      <span className="fixture-team-name">{teams[m.home]?.name ?? m.home}</span>
                    </span>
                    {played ? (
                      <span className="fixture-score">
                        {m.homeGoals} <span className="fixture-score-sep">–</span> {m.awayGoals}
                      </span>
                    ) : isUserMatch ? (
                      <button
                        className="fixture-play-btn"
                        onClick={() => playWCGroupMatch(gId, mdKey, idx)}
                      >
                        <IcoPlay size={11} /> Jugar
                      </button>
                    ) : (
                      <span className="fixture-vs">vs</span>
                    )}
                    <span className="fixture-team fixture-team--away">
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

// ── Knockout match card ────────────────────────────────────────────────────────

function KnockoutMatchCard({
  match,
  roundKey,
  idx,
}: {
  match: WCKnockoutMatch;
  roundKey: 'r32' | 'r16' | 'qf' | 'sf' | 'final';
  idx: number;
}) {
  const teams              = useGameStore((s) => s.teams);
  const wcState            = useGameStore((s) => s.wcState);
  const playWCKnockoutMatch = useGameStore((s) => s.playWCKnockoutMatch);

  if (!wcState) return null;
  const userTeam   = wcState.userTeam;
  const isUserMatch = match.home === userTeam || match.away === userTeam;
  const played     = match.winner !== null;
  const tbd        = !match.home || !match.away;

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
        {match.homeGoals !== null && (
          <span className="ko-goals">
            {match.homeGoals}
            {match.homePenalties !== null ? <sup className="ko-pen">{match.homePenalties}p</sup> : null}
          </span>
        )}
      </div>
      <div className="ko-sep">
        {played ? '–' : tbd ? '?' : 'vs'}
      </div>
      <div className={`ko-team ko-team--away${awayWon ? ' ko-team--winner' : played ? ' ko-team--loser' : ''}`}>
        {match.awayGoals !== null && (
          <span className="ko-goals">
            {match.awayGoals}
            {match.awayPenalties !== null ? <sup className="ko-pen">{match.awayPenalties}p</sup> : null}
          </span>
        )}
        {match.away ? (
          <>
            <span className="ko-team-name">{teams[match.away]?.name ?? match.away}</span>
            <TeamFlag code={match.away} size={16} />
          </>
        ) : <span className="ko-tbd">Por definir</span>}
      </div>
      {!played && !tbd && isUserMatch && (
        <button className="ko-play-btn" onClick={() => playWCKnockoutMatch(roundKey, idx)}>
          <IcoPlay size={11} /> Jugar
        </button>
      )}
    </div>
  );
}

function KnockoutView() {
  const teams                   = useGameStore((s) => s.teams);
  const wcState                 = useGameStore((s) => s.wcState);
  const simulateWCKnockoutRound = useGameStore((s) => s.simulateWCKnockoutRound);
  const resetWorldCup           = useGameStore((s) => s.resetWorldCup);

  if (!wcState || wcState.phase === 'groups') return null;

  if (wcState.phase === 'finished' && wcState.champion) {
    const isUserChamp = wcState.userTeam === wcState.champion;
    return (
      <div className="wc-finished">
        <div className="wc-trophy-wrap">
          <IcoTrophy size={64} />
        </div>
        <div className="wc-champion-flag">
          <TeamFlag code={wcState.champion} size={48} />
        </div>
        <h2 className="wc-champion-title">Campeón del Mundo</h2>
        <div className="wc-champion-name">{teams[wcState.champion]?.name ?? wcState.champion}</div>
        {isUserChamp && (
          <p className="wc-user-won">Tu selección conquistó el mundo</p>
        )}
        <button className="wc-reset-btn" onClick={resetWorldCup}>↩ Nuevo Mundial</button>
      </div>
    );
  }

  const rounds: { key: 'r32' | 'r16' | 'qf' | 'sf' | 'final'; label: string }[] = [
    { key: 'r32', label: 'Dieciseisavos de Final' },
    { key: 'r16', label: 'Octavos de Final' },
    { key: 'qf',  label: 'Cuartos de Final' },
    { key: 'sf',  label: 'Semifinales' },
    { key: 'final', label: 'Final' },
  ];

  const currentRound = rounds.find(
    (r) => wcState[r.key].length > 0 && wcState[r.key].some((m) => m.winner === null)
  );
  const currentRoundKey = currentRound?.key;

  const canSimulate = currentRoundKey && wcState[currentRoundKey].some(
    (m) =>
      m.winner === null &&
      m.home !== wcState.userTeam &&
      m.away !== wcState.userTeam &&
      m.home &&
      m.away
  );

  return (
    <div className="knockout-view">
      {canSimulate && (
        <div className="ko-actions">
          <button className="wc-action-btn" onClick={simulateWCKnockoutRound}>
            <IcoLightning size={14} /> Auto-simular Otros Partidos
          </button>
        </div>
      )}

      {rounds.map(({ key, label }) => {
        if (wcState[key].length === 0) return null;
        const isCurrent = key === currentRoundKey;
        return (
          <div key={key} className={`ko-round${isCurrent ? ' ko-round--current' : ''}`}>
            <div className="ko-round__header">
              <h3 className="ko-round__title">{label}</h3>
              {isCurrent && <span className="ko-round__live">En curso</span>}
            </div>
            <div className="ko-matches">
              {wcState[key].map((m, i) => (
                <KnockoutMatchCard key={m.id} match={m} roundKey={key} idx={i} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Progress header ────────────────────────────────────────────────────────────

function WCProgressBar({ wcState }: { wcState: WorldCupState }) {
  const steps = ['J1', 'J2', 'J3', 'R32', 'R16', 'QF', 'SF', 'Final'];
  let currentStep = 0;

  if (wcState.phase === 'groups') {
    currentStep = Math.min(wcState.currentMatchday, 2);
  } else if (wcState.phase === 'knockout') {
    const roundKeys = ['r32', 'r16', 'qf', 'sf', 'final'] as const;
    const roundIdx  = roundKeys.findIndex(
      (r) => wcState[r].length > 0 && wcState[r].some((m) => m.winner === null)
    );
    currentStep = 3 + (roundIdx >= 0 ? roundIdx : 4);
  } else {
    currentStep = 7;
  }

  return (
    <div className="wc-progress">
      {steps.map((s, i) => (
        <div key={s} className={`wc-progress__step${i < currentStep ? ' wc-progress__step--done' : ''}${i === currentStep ? ' wc-progress__step--active' : ''}`}>
          <div className="wc-progress__dot" />
          <span className="wc-progress__label">{s}</span>
        </div>
      ))}
    </div>
  );
}

// ── Root page ──────────────────────────────────────────────────────────────────

export function WorldCupPage() {
  const wcState     = useGameStore((s) => s.wcState);
  const setAppPage  = useGameStore((s) => s.setAppPage);
  const resetWorldCup = useGameStore((s) => s.resetWorldCup);
  const teams       = useGameStore((s) => s.teams);

  if (!wcState) return <WCSetup />;

  const { phase, userTeam, currentMatchday, groups } = wcState;
  const groupKeys    = Object.keys(groups).sort();

  return (
    <div className="wc-page">
      <div className="wc-topbar">
        <button className="back-btn" onClick={() => setAppPage('home')}>← Inicio</button>
        <div className="wc-topbar__title">
          <IcoGlobe size={15} />
          <span>Mundial 2026</span>
          <span className="wc-topbar__sep">·</span>
          <TeamFlag code={userTeam} size={16} />
          <span>{teams[userTeam]?.name}</span>
        </div>
        <button className="wc-reset-small" onClick={resetWorldCup} title="Reiniciar">
          <IcoX size={12} />
        </button>
      </div>

      <WCProgressBar wcState={wcState} />

      {phase === 'groups' && (
        <>
          <div className="wc-groups-grid">
            {groupKeys.map((gId) => (
              <GroupCard key={gId} group={groups[gId]} userTeam={userTeam} />
            ))}
          </div>
          <MatchdayFixtures matchdayIdx={Math.min(currentMatchday, 2)} />
        </>
      )}

      {(phase === 'knockout' || phase === 'finished') && <KnockoutView />}
    </div>
  );
}
