import type { TeamData, WCKnockoutMatch } from '../types';
import type {
  PKGroup, PKGroupMatch, PKStanding, PKShootoutResult, PenaltyTournamentState, PKRoundKey,
} from '../types/penalty';
import { WC_GROUPS, MD_FIXTURES } from '../data/worldCupGroups';
import { buildR32, buildNextRound } from './worldCupEngine';

export type PKMatchdayKey = 'md1' | 'md2' | 'md3';
export const PK_MD_KEYS: PKMatchdayKey[] = ['md1', 'md2', 'md3'];
export const PK_ROUND_ORDER: PKRoundKey[] = ['r32', 'r16', 'qf', 'sf', 'final'];

// ── Team penalty ratings ──────────────────────────────────────────────────────

function topAverage(values: number[], n: number): number {
  if (values.length === 0) return 70;
  const sorted = [...values].sort((a, b) => b - a).slice(0, n);
  return sorted.reduce((s, v) => s + v, 0) / sorted.length;
}

/** Attacking quality used as the shooter side's conversion driver. */
export function teamShooterRating(team: TeamData): number {
  const outfield = team.players.filter((p) => p.position !== 'GK').map((p) => p.overall);
  return topAverage(outfield, 6);
}

/** Goalkeeping quality used as the defending side's save driver. */
export function teamKeeperRating(team: TeamData): number {
  const gks = team.players.filter((p) => p.position === 'GK').map((p) => p.overall);
  return gks.length ? Math.max(...gks) : 70;
}

/** Probability a single penalty is converted by `atk` side against `gk` keeper. */
function conversionProb(atkRating: number, gkRating: number): number {
  // Base elite conversion ~0.78; modulated by attack vs keeper gap.
  const p = 0.78 + (atkRating - 78) * 0.006 - (gkRating - 78) * 0.005;
  return Math.min(0.92, Math.max(0.55, p));
}

// ── Auto shootout (non-user matches) ──────────────────────────────────────────

/**
 * Simulate a full shootout by RNG, honouring real rules: 5 alternating kicks with
 * early termination when mathematically decided, then sudden death. Weighted by team
 * OVR. Returns penalties converted by each side plus the winner code.
 */
export function simulateAutoShootout(
  homeCode: string,
  awayCode: string,
  teams: Record<string, TeamData>,
): PKShootoutResult {
  const home = teams[homeCode];
  const away = teams[awayCode];
  if (!home || !away) {
    return { homePK: 0, awayPK: 0, winner: home ? homeCode : awayCode };
  }

  const pHome = conversionProb(teamShooterRating(home), teamKeeperRating(away));
  const pAway = conversionProb(teamShooterRating(away), teamKeeperRating(home));

  let homePK = 0;
  let awayPK = 0;
  let homeTaken = 0;
  let awayTaken = 0;

  const remaining = (taken: number) => Math.max(0, 5 - taken);
  // Decided during the best-of-5 phase when a lead can't be overturned.
  const decidedInRegular = () =>
    homeTaken >= 1 && awayTaken >= 1 &&
    (homePK > awayPK + remaining(awayTaken) || awayPK > homePK + remaining(homeTaken));

  // Best of 5, alternating home then away.
  for (let i = 0; i < 5; i++) {
    if (Math.random() < pHome) homePK++;
    homeTaken++;
    if (decidedInRegular()) break;
    if (Math.random() < pAway) awayPK++;
    awayTaken++;
    if (decidedInRegular()) break;
  }

  // Sudden death: equal kicks each, stop when one scores and the other misses.
  let guard = 0;
  while (homePK === awayPK && guard < 50) {
    guard++;
    const h = Math.random() < pHome;
    const a = Math.random() < pAway;
    if (h) homePK++;
    if (a) awayPK++;
  }

  const winner = homePK >= awayPK ? homeCode : awayCode;
  return { homePK, awayPK, winner };
}

// ── Standings (shootout points: 3 win / 0 loss, no draws) ──────────────────────

export function computePKStandings(group: PKGroup): PKStanding[] {
  const map: Record<string, PKStanding> = {};
  for (const t of group.teams) {
    map[t] = { code: t, played: 0, won: 0, lost: 0, pkFor: 0, pkAgainst: 0, points: 0 };
  }

  const all: PKGroupMatch[] = [...group.md1, ...group.md2, ...group.md3];
  for (const m of all) {
    if (m.homePK === null || m.awayPK === null || !m.winner) continue;
    const h = map[m.home];
    const a = map[m.away];
    if (!h || !a) continue;
    h.played++; a.played++;
    h.pkFor += m.homePK; h.pkAgainst += m.awayPK;
    a.pkFor += m.awayPK; a.pkAgainst += m.homePK;
    if (m.winner === m.home) { h.won++; h.points += 3; a.lost++; }
    else { a.won++; a.points += 3; h.lost++; }
  }

  return Object.values(map).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const dx = x.pkFor - x.pkAgainst, dy = y.pkFor - y.pkAgainst;
    if (dy !== dx) return dy - dx;
    if (y.pkFor !== x.pkFor) return y.pkFor - x.pkFor;
    return x.code.localeCompare(y.code);
  });
}

/** Group winners, runners-up and the 8 best third-placed teams. */
export function getPKQualified(groups: Record<string, PKGroup>): {
  winners: string[];
  runnersUp: string[];
  best3rd: string[];
} {
  const groupKeys = Object.keys(WC_GROUPS).sort();
  const winners: string[] = [];
  const runnersUp: string[] = [];
  const thirds: { code: string; pts: number; diff: number; pf: number }[] = [];

  for (const gId of groupKeys) {
    const s = computePKStandings(groups[gId]);
    if (s[0]) winners.push(s[0].code);
    if (s[1]) runnersUp.push(s[1].code);
    if (s[2]) thirds.push({ code: s[2].code, pts: s[2].points, diff: s[2].pkFor - s[2].pkAgainst, pf: s[2].pkFor });
  }

  thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.pf - a.pf;
  });
  const best3rd = thirds.slice(0, 8).map((t) => t.code);
  return { winners, runnersUp, best3rd };
}

// Re-export bracket builders (generic on team codes) so callers import from one place.
export { buildR32, buildNextRound };

// ── Initializer ───────────────────────────────────────────────────────────────

export function initPenaltyTournament(userTeam: string): PenaltyTournamentState {
  const groupKeys = Object.keys(WC_GROUPS).sort();
  const groups: Record<string, PKGroup> = {};

  for (const gId of groupKeys) {
    const teams = WC_GROUPS[gId];
    const makeMatch = (hi: number, ai: number, mdIdx: number, mIdx: number): PKGroupMatch => ({
      id: `pk_${gId}_md${mdIdx + 1}_${mIdx}`,
      home: teams[hi],
      away: teams[ai],
      homePK: null,
      awayPK: null,
      winner: null,
    });

    groups[gId] = {
      id: gId,
      teams,
      md1: MD_FIXTURES[0].map(([h, a], i) => makeMatch(h, a, 0, i)),
      md2: MD_FIXTURES[1].map(([h, a], i) => makeMatch(h, a, 1, i)),
      md3: MD_FIXTURES[2].map(([h, a], i) => makeMatch(h, a, 2, i)),
    };
  }

  return {
    userTeam,
    phase: 'groups',
    currentMatchday: 0,
    groups,
    r32: [], r16: [], qf: [], sf: [], final: [],
    champion: null,
    pendingMatch: null,
    stats: {
      shootoutsPlayed: 0, shootoutsWon: 0, shootoutsLost: 0,
      kicksTaken: 0, kicksScored: 0, kicksFaced: 0, kicksSaved: 0,
    },
  };
}

// ── Locators (shared by store + UI) ──────────────────────────────────────────────

/** Find the user's match in the given matchday, across all groups. */
export function findUserGroupMatch(
  groups: Record<string, PKGroup>, userTeam: string, mdKey: PKMatchdayKey,
): { groupId: string; matchIdx: number; match: PKGroupMatch } | null {
  for (const gId of Object.keys(groups)) {
    const matches = groups[gId][mdKey];
    const idx = matches.findIndex((m) => m.home === userTeam || m.away === userTeam);
    if (idx !== -1) return { groupId: gId, matchIdx: idx, match: matches[idx] };
  }
  return null;
}

/** The first knockout round that still has undecided matches, or null if none. */
export function currentPKRoundKey(state: PenaltyTournamentState): PKRoundKey | null {
  return PK_ROUND_ORDER.find(
    (r) => state[r].length > 0 && state[r].some((m) => m.winner === null),
  ) ?? null;
}

/** Find the user's match within a knockout round (or null if the user isn't in it). */
export function findUserKnockoutMatch(
  matches: WCKnockoutMatch[], userTeam: string,
): { idx: number; match: WCKnockoutMatch } | null {
  const idx = matches.findIndex((m) => m.home === userTeam || m.away === userTeam);
  return idx === -1 ? null : { idx, match: matches[idx] };
}

/** True once every match of the current group matchday has a winner. */
export function isGroupMatchdayComplete(
  groups: Record<string, PKGroup>, mdKey: PKMatchdayKey,
): boolean {
  return Object.values(groups).every((g) => g[mdKey].every((m) => m.winner !== null));
}

/** Did the user reach the knockout bracket? */
export function userQualified(r32: WCKnockoutMatch[], userTeam: string): boolean {
  return r32.some((m) => m.home === userTeam || m.away === userTeam);
}
