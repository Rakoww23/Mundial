import type {
  TeamData, SquadSlot, Player, Formation,
  WCGroup, WCGroupMatch, WCGroupStanding, WCKnockoutMatch, WorldCupState,
} from '../types';
import { WC_GROUPS, MD_FIXTURES } from '../data/worldCupGroups';
import { simulate } from './simulationEngine';
import { FORMATIONS } from '../data/formations';

// ── helpers ───────────────────────────────────────────────────────────────────

function samplePoisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

const DEFAULT_FORMATION: Formation = FORMATIONS[0];

function buildSquad(team: TeamData): SquadSlot[] {
  const byPos: Record<string, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of team.players) byPos[p.position]?.push(p);
  for (const pos of Object.keys(byPos)) byPos[pos].sort((a, b) => b.overall - a.overall);
  const used = new Set<number>();
  return DEFAULT_FORMATION.slots.map((slot) => {
    const pool = byPos[slot.role] ?? [];
    const player = pool.find((p) => !used.has(p.id)) ?? null;
    if (player) used.add(player.id);
    return { formation: slot, player };
  });
}

// ── Group match simulation ────────────────────────────────────────────────────

export function simulateGroupMatch(
  homeCode: string,
  awayCode: string,
  teams: Record<string, TeamData>,
): { homeGoals: number; awayGoals: number } {
  const home = teams[homeCode];
  const away = teams[awayCode];
  if (!home || !away) return { homeGoals: 0, awayGoals: 0 };

  const homeSquad = buildSquad(home);
  const awaySquad = buildSquad(away);
  const result = simulate(homeSquad, awaySquad, DEFAULT_FORMATION, DEFAULT_FORMATION);

  return {
    homeGoals: samplePoisson(result.homeXG),
    awayGoals: samplePoisson(result.awayXG),
  };
}

// ── Knockout match simulation (with ET + pens) ────────────────────────────────

export function simulateKnockoutMatch(
  homeCode: string,
  awayCode: string,
  teams: Record<string, TeamData>,
): { homeGoals: number; awayGoals: number; homePenalties: number | null; awayPenalties: number | null } {
  const home = teams[homeCode];
  const away = teams[awayCode];
  if (!home || !away) return { homeGoals: 0, awayGoals: 0, homePenalties: null, awayPenalties: null };

  const homeSquad = buildSquad(home);
  const awaySquad = buildSquad(away);
  const result = simulate(homeSquad, awaySquad, DEFAULT_FORMATION, DEFAULT_FORMATION);

  let homeGoals = samplePoisson(result.homeXG);
  let awayGoals = samplePoisson(result.awayXG);

  // Extra time if tied
  if (homeGoals === awayGoals) {
    const etHome = samplePoisson(result.homeXG * 0.33);
    const etAway = samplePoisson(result.awayXG * 0.33);
    homeGoals += etHome;
    awayGoals += etAway;
  }

  // Penalties if still tied
  if (homeGoals === awayGoals) {
    let hp = 0, ap = 0;
    for (let round = 1; round <= 5; round++) {
      if (Math.random() < 0.76) hp++;
      if (Math.random() < 0.76) ap++;
    }
    // Sudden death until different
    let round = 6;
    while (hp === ap && round <= 15) {
      if (Math.random() < 0.76) hp++;
      if (Math.random() < 0.76) ap++;
      round++;
    }
    return { homeGoals, awayGoals, homePenalties: hp, awayPenalties: ap };
  }

  return { homeGoals, awayGoals, homePenalties: null, awayPenalties: null };
}

// ── Standings ─────────────────────────────────────────────────────────────────

export function computeStandings(group: WCGroup): WCGroupStanding[] {
  const map: Record<string, WCGroupStanding> = {};
  for (const t of group.teams) {
    map[t] = { code: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
  }

  const allMatches: WCGroupMatch[] = [...group.md1, ...group.md2, ...group.md3];
  for (const m of allMatches) {
    if (m.homeGoals === null || m.awayGoals === null) continue;
    const h = map[m.home];
    const a = map[m.away];
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += m.homeGoals; h.ga += m.awayGoals;
    a.gf += m.awayGoals; a.ga += m.homeGoals;
    if (m.homeGoals > m.awayGoals) { h.won++; h.points += 3; a.lost++; }
    else if (m.homeGoals < m.awayGoals) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; h.points++; a.drawn++; a.points++; }
  }

  return Object.values(map).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.gf - a.ga, gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.code.localeCompare(b.code);
  });
}

// ── Build R32 bracket from qualified teams ────────────────────────────────────

export function getQualified(groups: Record<string, WCGroup>): {
  winners: string[];
  runnersUp: string[];
  best3rd: string[];
} {
  const groupKeys = Object.keys(WC_GROUPS).sort();
  const winners: string[] = [];
  const runnersUp: string[] = [];
  const thirds: { code: string; gd: number; gf: number; pts: number }[] = [];

  for (const gId of groupKeys) {
    const standings = computeStandings(groups[gId]);
    if (standings[0]) winners.push(standings[0].code);
    if (standings[1]) runnersUp.push(standings[1].code);
    if (standings[2]) thirds.push({
      code: standings[2].code,
      pts: standings[2].points,
      gd: standings[2].gf - standings[2].ga,
      gf: standings[2].gf,
    });
  }

  thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
  const best3rd = thirds.slice(0, 8).map((t) => t.code);

  return { winners, runnersUp, best3rd };
}

function ko(id: string, home: string | null, away: string | null): WCKnockoutMatch {
  return { id, home, away, homeGoals: null, awayGoals: null, homePenalties: null, awayPenalties: null, winner: null };
}

export function buildR32(
  winners: string[],
  runnersUp: string[],
  best3rd: string[],
): WCKnockoutMatch[] {
  // 12 winners (indices 0-11 = groups A-L)
  // 12 runners-up
  // 8 best 3rd place
  const W = winners;   // W[0]=A1, W[1]=B1, ...
  const R = runnersUp; // R[0]=A2, ...
  const T = best3rd;   // T[0..7] = best 3rd place teams

  return [
    ko('r32_0',  W[0],  R[5]),  // A1 vs F2
    ko('r32_1',  W[1],  R[6]),  // B1 vs G2
    ko('r32_2',  W[2],  R[7]),  // C1 vs H2
    ko('r32_3',  W[3],  R[8]),  // D1 vs I2
    ko('r32_4',  W[4],  R[9]),  // E1 vs J2
    ko('r32_5',  W[5],  R[10]), // F1 vs K2
    ko('r32_6',  W[6],  R[11]), // G1 vs L2
    ko('r32_7',  W[7],  R[0]),  // H1 vs A2
    ko('r32_8',  W[8],  R[1]),  // I1 vs B2
    ko('r32_9',  W[9],  R[2]),  // J1 vs C2
    ko('r32_10', W[10], R[3]),  // K1 vs D2
    ko('r32_11', W[11], R[4]),  // L1 vs E2
    ko('r32_12', T[0] ?? null,  T[7] ?? null),
    ko('r32_13', T[1] ?? null,  T[6] ?? null),
    ko('r32_14', T[2] ?? null,  T[5] ?? null),
    ko('r32_15', T[3] ?? null,  T[4] ?? null),
  ];
}

export function buildNextRound(
  prevRound: WCKnockoutMatch[],
  roundPrefix: string,
): WCKnockoutMatch[] {
  const next: WCKnockoutMatch[] = [];
  for (let i = 0; i < prevRound.length; i += 2) {
    const a = prevRound[i];
    const b = prevRound[i + 1];
    next.push(ko(`${roundPrefix}_${i / 2}`, a.winner, b?.winner ?? null));
  }
  return next;
}

// ── World Cup state initializer ───────────────────────────────────────────────

export function initWorldCup(userTeam: string): WorldCupState {
  const groupKeys = Object.keys(WC_GROUPS).sort();
  const groups: Record<string, WCGroup> = {};

  for (const gId of groupKeys) {
    const teams = WC_GROUPS[gId];
    const makeMatch = (hi: number, ai: number, mdIdx: number, mIdx: number): WCGroupMatch => ({
      id: `${gId}_md${mdIdx + 1}_${mIdx}`,
      home: teams[hi],
      away: teams[ai],
      homeGoals: null,
      awayGoals: null,
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
  };
}
