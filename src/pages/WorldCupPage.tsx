import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { computeStandings } from '../services/worldCupEngine';
import type { WCGroup, WCGroupStanding, WCKnockoutMatch } from '../types';

// ── Team setup ─────────────────────────────────────────────────────────────────

function WCSetup() {
  const teams = useGameStore((s) => s.teams);
  const startWorldCup = useGameStore((s) => s.startWorldCup);
  const setAppPage = useGameStore((s) => s.setAppPage);
  const [selected, setSelected] = useState('');

  const teamCodes = Object.keys(teams).sort((a, b) =>
    teams[a].name.localeCompare(teams[b].name)
  );

  return (
    <div className="wc-setup">
      <div className="wc-setup__header">
        <button className="back-btn" onClick={() => setAppPage('home')}>← Volver</button>
        <h2>Elige tu Selección</h2>
        <p>Guía a tu nación hasta la gloria en el Mundial 2026</p>
      </div>

      <div className="wc-team-grid">
        {teamCodes.map((code) => {
          const team = teams[code];
          return (
            <button
              key={code}
              className={`wc-team-btn ${selected === code ? 'wc-team-btn--selected' : ''}`}
              onClick={() => setSelected(code)}
            >
              <span className="wc-team-flag">{team.flag}</span>
              <span className="wc-team-name">{team.name}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="wc-confirm">
          <div className="wc-confirm__team">
            {teams[selected].flag} {teams[selected].name}
          </div>
          <button className="wc-start-btn" onClick={() => startWorldCup(selected)}>
            🚀 Iniciar Mundial con {teams[selected].name}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Group card ─────────────────────────────────────────────────────────────────

function GroupCard({ group, userTeam }: { group: WCGroup; userTeam: string }) {
  const teams = useGameStore((s) => s.teams);
  const standings = computeStandings(group);

  return (
    <div className="group-card">
      <div className="group-card__title">Grupo {group.id}</div>
      <table className="standings-table">
        <thead>
          <tr>
            <th>Equipo</th>
            <th>PJ</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.code}
              className={[
                s.code === userTeam ? 'standings-row--user' : '',
                i < 2 ? 'standings-row--qualified' : '',
              ].join(' ')}
            >
              <td className="standings-team">
                <span>{teams[s.code]?.flag}</span>
                <span className="standings-name">{teams[s.code]?.name ?? s.code}</span>
              </td>
              <td>{s.played}</td>
              <td>{s.gf - s.ga > 0 ? `+${s.gf - s.ga}` : s.gf - s.ga}</td>
              <td className="standings-pts">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Group stage matchday ───────────────────────────────────────────────────────

function MatchdayFixtures({ matchdayIdx }: { matchdayIdx: number }) {
  const teams = useGameStore((s) => s.teams);
  const wcState = useGameStore((s) => s.wcState);
  const simulateWCMatchday = useGameStore((s) => s.simulateWCMatchday);
  const playWCGroupMatch = useGameStore((s) => s.playWCGroupMatch);
  const advanceWCMatchday = useGameStore((s) => s.advanceWCMatchday);
  const buildWCKnockout = useGameStore((s) => s.buildWCKnockout);

  if (!wcState || wcState.phase !== 'groups') return null;

  const mdKey = (['md1', 'md2', 'md3'] as const)[matchdayIdx];
  const groupKeys = Object.keys(wcState.groups).sort();
  const userTeam = wcState.userTeam;

  const allGroupMatches = groupKeys.flatMap((gId) => wcState.groups[gId][mdKey]);
  const allPlayed = allGroupMatches.every((m) => m.homeGoals !== null);
  const userMatch = allGroupMatches.find((m) => m.home === userTeam || m.away === userTeam);
  const userMatchPlayed = userMatch ? userMatch.homeGoals !== null : true;
  const nonUserUnplayed = allGroupMatches.some((m) => m.homeGoals === null && m.home !== userTeam && m.away !== userTeam);

  return (
    <div className="matchday-section">
      <div className="matchday-header">
        <h3>Jornada {matchdayIdx + 1}</h3>
        <div className="matchday-actions">
          {nonUserUnplayed && (
            <button className="wc-action-btn" onClick={simulateWCMatchday}>
              ⚡ Auto-simular Otros Partidos
            </button>
          )}
          {allPlayed && matchdayIdx < 2 && (
            <button className="wc-action-btn wc-action-btn--advance" onClick={advanceWCMatchday}>
              ▶ Jornada {matchdayIdx + 2}
            </button>
          )}
          {allPlayed && matchdayIdx === 2 && (
            <button className="wc-action-btn wc-action-btn--advance" onClick={buildWCKnockout}>
              🏆 Ver Clasificados y Fase Eliminatoria
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
                const played = m.homeGoals !== null;
                return (
                  <div key={m.id} className={`fixture-row ${isUserMatch ? 'fixture-row--user' : ''}`}>
                    <span className="fixture-team fixture-team--home">
                      {teams[m.home]?.flag} {teams[m.home]?.name ?? m.home}
                    </span>
                    {played ? (
                      <span className="fixture-score">{m.homeGoals} – {m.awayGoals}</span>
                    ) : isUserMatch ? (
                      <button
                        className="fixture-play-btn"
                        onClick={() => playWCGroupMatch(gId, mdKey, idx)}
                      >
                        ▶ Jugar
                      </button>
                    ) : (
                      <span className="fixture-vs">vs</span>
                    )}
                    <span className="fixture-team fixture-team--away">
                      {teams[m.away]?.name ?? m.away} {teams[m.away]?.flag}
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

// ── Knockout bracket ───────────────────────────────────────────────────────────

function KnockoutMatchCard({
  match,
  roundKey,
  idx,
}: {
  match: WCKnockoutMatch;
  roundKey: 'r32' | 'r16' | 'qf' | 'sf' | 'final';
  idx: number;
}) {
  const teams = useGameStore((s) => s.teams);
  const wcState = useGameStore((s) => s.wcState);
  const playWCKnockoutMatch = useGameStore((s) => s.playWCKnockoutMatch);

  if (!wcState) return null;
  const userTeam = wcState.userTeam;

  const isUserMatch = match.home === userTeam || match.away === userTeam;
  const played = match.winner !== null;
  const tbd = !match.home || !match.away;

  return (
    <div className={`ko-match ${isUserMatch ? 'ko-match--user' : ''} ${played ? 'ko-match--played' : ''}`}>
      <div className={`ko-team ${match.winner === match.home ? 'ko-team--winner' : ''}`}>
        {match.home ? <>{teams[match.home]?.flag} {teams[match.home]?.name ?? match.home}</> : '—'}
        {match.homeGoals !== null && <span className="ko-goals">{match.homeGoals}{match.homePenalties !== null ? ` (${match.homePenalties}p)` : ''}</span>}
      </div>
      <div className="ko-sep">vs</div>
      <div className={`ko-team ${match.winner === match.away ? 'ko-team--winner' : ''}`}>
        {match.away ? <>{teams[match.away]?.flag} {teams[match.away]?.name ?? match.away}</> : '—'}
        {match.awayGoals !== null && <span className="ko-goals">{match.awayGoals}{match.awayPenalties !== null ? ` (${match.awayPenalties}p)` : ''}</span>}
      </div>
      {!played && !tbd && isUserMatch && (
        <button className="ko-play-btn" onClick={() => playWCKnockoutMatch(roundKey, idx)}>
          ▶ Jugar
        </button>
      )}
    </div>
  );
}

function KnockoutView() {
  const teams = useGameStore((s) => s.teams);
  const wcState = useGameStore((s) => s.wcState);
  const simulateWCKnockoutRound = useGameStore((s) => s.simulateWCKnockoutRound);
  const resetWorldCup = useGameStore((s) => s.resetWorldCup);

  if (!wcState || wcState.phase === 'groups') return null;

  if (wcState.phase === 'finished' && wcState.champion) {
    return (
      <div className="wc-finished">
        <div className="wc-trophy">🏆</div>
        <h2>¡Campeón del Mundo!</h2>
        <div className="wc-champion">
          {teams[wcState.champion]?.flag} {teams[wcState.champion]?.name ?? wcState.champion}
        </div>
        {wcState.userTeam === wcState.champion && (
          <p className="wc-user-won">¡Lo lograste! Tu selección es campeona del mundo</p>
        )}
        <button className="wc-reset-btn" onClick={resetWorldCup}>↩ Nuevo Mundial</button>
      </div>
    );
  }

  const rounds: { key: 'r32' | 'r16' | 'qf' | 'sf' | 'final'; label: string }[] = [
    { key: 'r32', label: 'Dieciseisavos' },
    { key: 'r16', label: 'Octavos' },
    { key: 'qf', label: 'Cuartos' },
    { key: 'sf', label: 'Semifinal' },
    { key: 'final', label: 'Final' },
  ];

  const currentRound = rounds.find((r) => wcState[r.key].length > 0 && wcState[r.key].some((m) => m.winner === null));
  const currentRoundKey = currentRound?.key;

  const canSimulate = currentRoundKey && wcState[currentRoundKey].some(
    (m) => m.winner === null && m.home !== wcState.userTeam && m.away !== wcState.userTeam && m.home && m.away
  );

  return (
    <div className="knockout-view">
      <div className="ko-actions">
        {canSimulate && (
          <button className="wc-action-btn" onClick={simulateWCKnockoutRound}>
            ⚡ Auto-simular Otros Partidos
          </button>
        )}
      </div>

      {rounds.map(({ key, label }) => {
        if (wcState[key].length === 0) return null;
        return (
          <div key={key} className="ko-round">
            <h3 className="ko-round__title">{label}</h3>
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

// ── Root page ──────────────────────────────────────────────────────────────────

export function WorldCupPage() {
  const wcState = useGameStore((s) => s.wcState);
  const setAppPage = useGameStore((s) => s.setAppPage);
  const resetWorldCup = useGameStore((s) => s.resetWorldCup);
  const teams = useGameStore((s) => s.teams);

  // No WC state yet → setup screen
  if (!wcState) return <WCSetup />;

  const { phase, userTeam, currentMatchday, groups } = wcState;
  const groupKeys = Object.keys(groups).sort();
  const userTeamData = teams[userTeam];

  return (
    <div className="wc-page">
      <div className="wc-topbar">
        <button className="back-btn" onClick={() => setAppPage('home')}>← Inicio</button>
        <div className="wc-topbar__title">
          🌍 Mundial 2026 — {userTeamData?.flag} {userTeamData?.name}
        </div>
        <button className="wc-reset-small" onClick={resetWorldCup}>✕ Reiniciar</button>
      </div>

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
