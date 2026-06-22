import type { SquadSlot, SimulationResult, Formation, MatchEvent, TacticalMentality, PlayerStatus } from '../types';
import type { Player } from '../types';
import { OOP_PENALTY, effectiveOvr } from './oopPenalty';

// ── helpers ──────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function poissonProb(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

// ── squad stats (slot-role based, with OOP penalties) ────────────────────────

interface SquadStats {
  gkOvr: number;
  defOvr: number;
  midOvr: number;
  fwdOvr: number;
  teamOvr: number;
  avgCaps: number;
  defHeight: number;
  fwdHeight: number;
  defCount: number;
  fwdCount: number;
}

function extractStats(squad: SquadSlot[]): SquadStats {
  const gkSlots  = squad.filter(s => s.formation.role === 'GK');
  const defSlots = squad.filter(s => s.formation.role === 'DEF');
  const midSlots = squad.filter(s => s.formation.role === 'MID');
  const fwdSlots = squad.filter(s => s.formation.role === 'FWD');

  const gkOvrs  = gkSlots .map(s => s.player ? effectiveOvr(s.player, 'GK')  : 60);
  const defOvrs = defSlots.map(s => s.player ? effectiveOvr(s.player, 'DEF') : 65);
  const midOvrs = midSlots.map(s => s.player ? effectiveOvr(s.player, 'MID') : 65);
  const fwdOvrs = fwdSlots.map(s => s.player ? effectiveOvr(s.player, 'FWD') : 65);

  const allPlayers = squad.map(s => s.player).filter(Boolean) as Player[];

  return {
    gkOvr:     avg(gkOvrs)  || 60,
    defOvr:    avg(defOvrs) || 65,
    midOvr:    avg(midOvrs) || 65,
    fwdOvr:    avg(fwdOvrs) || 65,
    teamOvr:   avg([...gkOvrs, ...defOvrs, ...midOvrs, ...fwdOvrs]) || 65,
    avgCaps:   avg(allPlayers.map(p => p.caps)) || 20,
    defHeight: avg(defSlots.map(s => s.player?.height ?? 181)) || 181,
    fwdHeight: avg(fwdSlots.map(s => s.player?.height ?? 179)) || 179,
    defCount:  defSlots.length,
    fwdCount:  fwdSlots.length,
  };
}

// ── xG engine ────────────────────────────────────────────────────────────────

const BASE_XG = 1.2;
const SCALE   = 17;

function computeXG(atk: SquadStats, def: SquadStats): number {
  const atkQuality = atk.fwdOvr * 0.55 + atk.midOvr * 0.30 + atk.teamOvr * 0.15;
  const defQuality = def.defOvr * 0.45 + def.gkOvr * 0.40 + def.midOvr * 0.15;
  const qualityDiff = atkQuality - defQuality;

  const expMod   = Math.tanh((atk.avgCaps - def.avgCaps) / 40) * 2.5;
  const aerialMod = Math.tanh((atk.fwdHeight - def.defHeight) / 15) * 1.5;
  const rawFormMod = (atk.fwdCount - 2) * 0.5 - (def.defCount - 4) * 0.5;
  const formMod = Math.max(-2, Math.min(2, rawFormMod));

  const totalDiff =
    qualityDiff +
    expMod    * 0.50 +
    aerialMod * 0.30 +
    formMod   * 0.60;

  return Math.max(0.05, BASE_XG * Math.exp(totalDiff / SCALE));
}

// ── main simulation export ────────────────────────────────────────────────────

export function simulate(
  homeSquad: SquadSlot[],
  awaySquad: SquadSlot[],
  _homeFormation: Formation,
  _awayFormation: Formation
): SimulationResult {
  const homeStats = extractStats(homeSquad);
  const awayStats = extractStats(awaySquad);

  const HOME_BOOST = 0.15;
  const homeLambda = computeXG(homeStats, awayStats) + HOME_BOOST;
  const awayLambda = computeXG(awayStats, homeStats);

  const MAX_GOALS = 12;
  const matrix: number[][] = [];
  let totalP = 0;

  for (let h = 0; h <= MAX_GOALS; h++) {
    matrix[h] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = poissonProb(homeLambda, h) * poissonProb(awayLambda, a);
      matrix[h][a] = p;
      totalP += p;
    }
  }

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      matrix[h][a] /= totalP;
    }
  }

  let homeWin = 0, draw = 0, awayWin = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      if      (h > a) homeWin += matrix[h][a];
      else if (h === a) draw  += matrix[h][a];
      else             awayWin += matrix[h][a];
    }
  }

  const scorelines: Array<{ home: number; away: number; probability: number }> = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      scorelines.push({ home: h, away: a, probability: matrix[h][a] });
    }
  }
  scorelines.sort((x, y) => y.probability - x.probability);

  return {
    homeWin:        parseFloat((homeWin  * 100).toFixed(1)),
    draw:           parseFloat((draw     * 100).toFixed(1)),
    awayWin:        parseFloat((awayWin  * 100).toFixed(1)),
    predictedScore: { home: scorelines[0].home, away: scorelines[0].away },
    scorelines:     scorelines.slice(0, 8),
    homeXG:         parseFloat(homeLambda.toFixed(2)),
    awayXG:         parseFloat(awayLambda.toFixed(2)),
  };
}

// ── Probable goalscorers ──────────────────────────────────────────────────────

export function computeProbableScorers(
  squad: SquadSlot[],
): Array<{ player: Player; scoringShare: number }> {
  const ROLE_W: Record<string, number> = { FWD: 45, MID: 16, DEF: 5, GK: 1 };
  const entries = squad
    .filter(s => s.player)
    .map(s => {
      const p = s.player!;
      const roleW     = ROLE_W[s.formation.role] ?? 1;
      const oopFactor = OOP_PENALTY[p.position]?.[s.formation.role] ?? 1.0;
      const goalFactor = 1 + Math.min(p.goals * 0.05, 0.6);
      return { player: p, weight: roleW * oopFactor * goalFactor * (p.overall / 80) };
    });

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  if (!totalWeight) return [];

  return entries
    .map(e => ({ player: e.player, scoringShare: (e.weight / totalWeight) * 100 }))
    .sort((a, b) => b.scoringShare - a.scoringShare)
    .slice(0, 5);
}

// ── Projection from a given match state (used by "Desde Minuto Específico") ────

export interface MatchProjection {
  finalHomeWin: number;
  draw: number;
  finalAwayWin: number;
  predictedScore: { home: number; away: number };
  scorelines: Array<{ home: number; away: number; probability: number }>;
  remainingHomeXG: number;
  remainingAwayXG: number;
  minutesLeft: number;
}

// Projects the most likely FINAL outcome given the score at a given minute.
// Pure prediction (no minute-by-minute play) — scales remaining xG by time left,
// so a 2-0 at minute 85 is near-certain while a 0-0 at minute 15 is wide open.
export function projectMatchFromState(
  homeSquad: SquadSlot[],
  awaySquad: SquadSlot[],
  homeFormation: Formation,
  awayFormation: Formation,
  minute: number,
  homeScore: number,
  awayScore: number,
): MatchProjection {
  const base = simulate(homeSquad, awaySquad, homeFormation, awayFormation);
  const minutesLeft = Math.max(0, 90 - minute);
  const frac = minutesLeft / 90;
  const remH = base.homeXG * frac;
  const remA = base.awayXG * frac;

  const MAX_ADD = 8;
  const matrix: number[][] = [];
  let totalP = 0;
  for (let h = 0; h <= MAX_ADD; h++) {
    matrix[h] = [];
    for (let a = 0; a <= MAX_ADD; a++) {
      const p = poissonProb(remH, h) * poissonProb(remA, a);
      matrix[h][a] = p;
      totalP += p;
    }
  }

  let homeWin = 0, draw = 0, awayWin = 0;
  const scorelineMap: Record<string, number> = {};
  for (let h = 0; h <= MAX_ADD; h++) {
    for (let a = 0; a <= MAX_ADD; a++) {
      const prob = matrix[h][a] / totalP;
      const fh = homeScore + h;
      const fa = awayScore + a;
      if (fh > fa) homeWin += prob;
      else if (fh === fa) draw += prob;
      else awayWin += prob;
      const key = `${fh}-${fa}`;
      scorelineMap[key] = (scorelineMap[key] ?? 0) + prob;
    }
  }

  const scorelines = Object.entries(scorelineMap)
    .map(([k, probability]) => {
      const [h, a] = k.split('-').map(Number);
      return { home: h, away: a, probability };
    })
    .sort((x, y) => y.probability - x.probability)
    .slice(0, 8);

  return {
    finalHomeWin: parseFloat((homeWin * 100).toFixed(1)),
    draw:         parseFloat((draw * 100).toFixed(1)),
    finalAwayWin: parseFloat((awayWin * 100).toFixed(1)),
    predictedScore: { home: scorelines[0].home, away: scorelines[0].away },
    scorelines,
    remainingHomeXG: parseFloat(remH.toFixed(2)),
    remainingAwayXG: parseFloat(remA.toFixed(2)),
    minutesLeft,
  };
}

// ── Phased (Realistic) Simulation ────────────────────────────────────────────

const MENTALITY_ATK: Record<TacticalMentality, number> = {
  defensive: 0.72, balanced: 1.0, offensive: 1.28, ultraoffensive: 1.60,
};
const MENTALITY_DEF: Record<TacticalMentality, number> = {
  defensive: 0.62, balanced: 1.0, offensive: 1.35, ultraoffensive: 1.75,
};

function samplePoisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function pickFromWeighted<T>(items: { value: T; weight: number }[]): T | null {
  const total = items.reduce((s, x) => s + x.weight, 0);
  if (!total) return null;
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function activePlayers(squad: SquadSlot[], statuses: Record<number, PlayerStatus>): Player[] {
  return squad.map((s) => s.player).filter((p): p is Player => !!p && statuses[p.id] !== 'suspended');
}

// Pick scorer weighted by slot role (not natural position) + OOP penalty
function pickScorer(squad: SquadSlot[], statuses: Record<number, PlayerStatus>): Player | null {
  const ROLE_W: Record<string, number> = { FWD: 45, MID: 16, DEF: 5, GK: 1 };
  const pool = squad
    .filter(s => s.player && statuses[s.player.id] !== 'suspended')
    .map(s => ({
      value: s.player!,
      weight: (ROLE_W[s.formation.role] ?? 1)
        * (OOP_PENALTY[s.player!.position]?.[s.formation.role] ?? 1)
        * (1 + s.player!.goals * 0.04)
        * (s.player!.overall / 80),
    }));
  return pickFromWeighted(pool);
}

function pickCardRecipient(squad: SquadSlot[], statuses: Record<number, PlayerStatus>): Player | null {
  const POS_W: Record<string, number> = { MID: 35, DEF: 30, FWD: 20, GK: 3 };
  const pool = activePlayers(squad, statuses).map((p) => ({
    value: p,
    weight: POS_W[p.position] ?? 10,
  }));
  return pickFromWeighted(pool);
}

function suspensionReduction(squad: SquadSlot[], statuses: Record<number, PlayerStatus>): number {
  const suspended = squad.filter((s) => s.player && statuses[s.player.id] === 'suspended').length;
  return Math.max(0.4, 1 - suspended * 0.12);
}

export interface PhaseResult {
  events: MatchEvent[];
  newStatuses: Record<number, PlayerStatus>;
}

export function simulatePhase(
  homeSquad: SquadSlot[],
  awaySquad: SquadSlot[],
  homeMentality: TacticalMentality,
  awayMentality: TacticalMentality,
  fromMinute: number,
  toMinute: number,
  statuses: Record<number, PlayerStatus>,
): PhaseResult {
  const events: MatchEvent[] = [];
  const newStatuses = { ...statuses };
  const minutes = toMinute - fromMinute;
  const fraction = minutes / 90;

  const homeStats = extractStats(homeSquad);
  const awayStats  = extractStats(awaySquad);
  const baseHomeLambda = computeXG(homeStats, awayStats) + 0.15;
  const baseAwayLambda = computeXG(awayStats, homeStats);

  const homeSuspFactor = suspensionReduction(homeSquad, newStatuses);
  const awaySuspFactor = suspensionReduction(awaySquad, newStatuses);

  const homeLambdaPhase = baseHomeLambda * fraction
    * MENTALITY_ATK[homeMentality]
    * (1 / Math.max(0.7, MENTALITY_DEF[awayMentality]))
    * homeSuspFactor;
  const awayLambdaPhase = baseAwayLambda * fraction
    * MENTALITY_ATK[awayMentality]
    * (1 / Math.max(0.7, MENTALITY_DEF[homeMentality]))
    * awaySuspFactor;

  const homeGoals = samplePoisson(homeLambdaPhase);
  const awayGoals = samplePoisson(awayLambdaPhase);

  const spreadMinutes = (count: number) => {
    const mins: number[] = [];
    for (let i = 0; i < count; i++) {
      mins.push(fromMinute + 1 + Math.floor(Math.random() * (minutes - 1)));
    }
    return mins.sort((a, b) => a - b);
  };

  for (const min of spreadMinutes(homeGoals)) {
    const scorer = pickScorer(homeSquad, newStatuses);
    if (scorer) events.push({ minute: min, type: 'goal', side: 'home', playerId: scorer.id, playerName: scorer.name });
  }
  for (const min of spreadMinutes(awayGoals)) {
    const scorer = pickScorer(awaySquad, newStatuses);
    if (scorer) events.push({ minute: min, type: 'goal', side: 'away', playerId: scorer.id, playerName: scorer.name });
  }

  const yellowLambda = fraction * 2;
  const homeYellows = samplePoisson(yellowLambda);
  const awayYellows = samplePoisson(yellowLambda);

  const processYellows = (squad: SquadSlot[], count: number, side: 'home' | 'away') => {
    for (let i = 0; i < count; i++) {
      const p = pickCardRecipient(squad, newStatuses);
      if (!p) continue;
      if (newStatuses[p.id] === 'booked') {
        newStatuses[p.id] = 'suspended';
        const min = fromMinute + 1 + Math.floor(Math.random() * (minutes - 1));
        events.push({ minute: min, type: 'red_card', side, playerId: p.id, playerName: p.name });
      } else if (newStatuses[p.id] !== 'suspended') {
        newStatuses[p.id] = 'booked';
        const min = fromMinute + 1 + Math.floor(Math.random() * (minutes - 1));
        events.push({ minute: min, type: 'yellow_card', side, playerId: p.id, playerName: p.name });
      }
    }
  };

  processYellows(homeSquad, homeYellows, 'home');
  processYellows(awaySquad, awayYellows, 'away');

  const processDirectRed = (squad: SquadSlot[], side: 'home' | 'away') => {
    if (Math.random() < fraction * 0.10) {
      const p = pickCardRecipient(squad, newStatuses);
      if (p && newStatuses[p.id] !== 'suspended') {
        newStatuses[p.id] = 'suspended';
        const min = fromMinute + 1 + Math.floor(Math.random() * (minutes - 1));
        events.push({ minute: min, type: 'red_card', side, playerId: p.id, playerName: p.name });
      }
    }
  };
  processDirectRed(homeSquad, 'home');
  processDirectRed(awaySquad, 'away');

  events.sort((a, b) => a.minute - b.minute);
  return { events, newStatuses };
}

// ── Penalty shootout ──────────────────────────────────────────────────────────

export function buildPenaltyOrder(squad: SquadSlot[]): number[] {
  const outfield = squad
    .map((s) => s.player)
    .filter((p): p is Player => !!p && p.position !== 'GK')
    .sort((a, b) => {
      const scoreA = a.overall * 0.5 + a.goals * 1.5 + a.caps * 0.2;
      const scoreB = b.overall * 0.5 + b.goals * 1.5 + b.caps * 0.2;
      return scoreB - scoreA;
    });
  return outfield.slice(0, 11).map((p) => p.id);
}

export function simulatePenaltyKick(
  shooterId: number,
  squad: SquadSlot[],
  rivalSquad: SquadSlot[],
): boolean {
  const shooter = squad.map((s) => s.player).find((p) => p?.id === shooterId);
  const gk = rivalSquad.map((s) => s.player).find((p) => p?.position === 'GK');
  if (!shooter) return false;

  const POS_BASE: Record<string, number> = { FWD: 0.80, MID: 0.76, DEF: 0.70, GK: 0.60 };
  let prob = POS_BASE[shooter.position] ?? 0.75;

  prob += (shooter.overall - 75) * 0.001;
  prob += Math.min(0.04, shooter.caps * 0.0004);
  if (shooter.caps > 0) prob += Math.min(0.03, (shooter.goals / shooter.caps) * 0.1);

  if (gk) {
    const gkQuality = (gk.overall - 70) / 30;
    prob -= gkQuality * 0.06;
  }

  prob = Math.max(0.40, Math.min(0.92, prob));
  return Math.random() < prob;
}
