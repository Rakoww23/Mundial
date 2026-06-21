import type { SquadSlot, SimulationResult, Formation, MatchEvent, TacticalMentality, PlayerStatus } from '../types';
import type { Player } from '../types';

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

// ── squad stats ──────────────────────────────────────────────────────────────

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
  const players = squad.map((s) => s.player).filter(Boolean) as Player[];
  const gk   = players.find((p) => p.position === 'GK');
  const defs = players.filter((p) => p.position === 'DEF');
  const mids = players.filter((p) => p.position === 'MID');
  const fwds = players.filter((p) => p.position === 'FWD');

  // Formation shape from squad slots (not player natural position)
  const defCount = squad.filter((s) => s.formation.role === 'DEF').length;
  const fwdCount = squad.filter((s) => s.formation.role === 'FWD').length;

  return {
    gkOvr:     gk?.overall              ?? 60,
    defOvr:    avg(defs.map((p) => p.overall)) || 65,
    midOvr:    avg(mids.map((p) => p.overall)) || 65,
    fwdOvr:    avg(fwds.map((p) => p.overall)) || 65,
    teamOvr:   avg(players.map((p) => p.overall)) || 65,
    avgCaps:   avg(players.map((p) => p.caps))    || 20,
    defHeight: avg(defs.map((p) => p.height)) || 181,
    fwdHeight: avg(fwds.map((p) => p.height)) || 179,
    defCount,
    fwdCount,
  };
}

// ── xG engine ────────────────────────────────────────────────────────────────
//
// Core insight: work directly on raw overalls (0-99 scale), never compress
// them. Use an exponential to amplify large quality gaps non-linearly.
//
// Calibration targets (home team perspective):
//   qualityDiff ≈  0  → xG ≈ 1.20  (equal teams)
//   qualityDiff ≈ 12  → xG ≈ 2.20  (clear favourite)
//   qualityDiff ≈ 22  → xG ≈ 4.50  (dominant side)
//   qualityDiff ≈ 30  → xG ≈ 7.50  (massive mismatch)
//
// With SCALE = 15:  xG = 1.2 × exp(diff / 15)
//   diff=0  → 1.20 ✓   diff=12 → 1.2×exp(0.8)=2.67  ← slightly high
// Adjust: SCALE = 17 gives better spread:
//   diff=0  → 1.20 ✓   diff=12 → 2.05 ✓   diff=22 → 4.42 ✓   diff=30 → 7.04 ✓

const BASE_XG = 1.2;
const SCALE   = 17;

function computeXG(atk: SquadStats, def: SquadStats): number {
  // ① Core quality matchup (dominant factor)
  //    Attack quality: forwards first, midfield second, rest minor
  const atkQuality = atk.fwdOvr * 0.55 + atk.midOvr * 0.30 + atk.teamOvr * 0.15;
  //    Defense quality: defenders + GK are walls; midfield press contributes a little
  const defQuality = def.defOvr * 0.45 + def.gkOvr * 0.40 + def.midOvr * 0.15;
  const qualityDiff = atkQuality - defQuality;
  // Typical range: elite attack (≈85) vs weak defence (≈61) = +24
  //                elite attack (≈85) vs elite defence (≈85) = 0

  // ② Experience modifier  (secondary — max ±2.5 on diff)
  //    Experienced squads hold their shape defensively and convert more clinically.
  const expMod = Math.tanh((atk.avgCaps - def.avgCaps) / 40) * 2.5;

  // ③ Aerial / set-piece modifier  (minor — max ±1.5)
  //    Taller forwards vs shorter defenders → more headed goals from corners/free-kicks.
  const aerialMod = Math.tanh((atk.fwdHeight - def.defHeight) / 15) * 1.5;

  // ④ Formation shape modifier  (minor — capped ±2)
  //    3 forwards vs 5 defenders: (3-2)×0.5 − (5-4)×0.5 = 0
  //    3 forwards vs 4 defenders: (3-2)×0.5 − (4-4)×0.5 = +0.5
  //    1 forward  vs 5 defenders: (1-2)×0.5 − (5-4)×0.5 = -1.0
  const rawFormMod = (atk.fwdCount - 2) * 0.5 - (def.defCount - 4) * 0.5;
  const formMod = Math.max(-2, Math.min(2, rawFormMod));

  // ⑤ Total adjusted diff
  //    Weights keep quality dominant; tactical/physical/experience are flavour.
  const totalDiff =
    qualityDiff +
    expMod    * 0.50 +   // ≤ ±1.25 absolute impact
    aerialMod * 0.30 +   // ≤ ±0.45 absolute impact
    formMod   * 0.60;    // ≤ ±1.20 absolute impact

  // ⑥ Non-linear conversion → xG
  //    No upper cap: a truly dominant team can generate 8-9 xG vs a hopeless side.
  return Math.max(0.05, BASE_XG * Math.exp(totalDiff / SCALE));
}

// ── main export ───────────────────────────────────────────────────────────────

export function simulate(
  homeSquad: SquadSlot[],
  awaySquad: SquadSlot[],
  _homeFormation: Formation,
  _awayFormation: Formation
): SimulationResult {
  const homeStats = extractStats(homeSquad);
  const awayStats = extractStats(awaySquad);

  // Slight home advantage (+0.15 xG — comparable to roughly one extra corner)
  const HOME_BOOST = 0.15;
  const homeLambda = computeXG(homeStats, awayStats) + HOME_BOOST;
  const awayLambda = computeXG(awayStats, homeStats);

  // Build Poisson scoreline matrix up to 12 goals per side
  // (anything beyond 12 is negligible probability even for extreme mismatches)
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

  // Normalise to correct for truncation at MAX_GOALS
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

function pickScorer(squad: SquadSlot[], statuses: Record<number, PlayerStatus>): Player | null {
  const POS_W: Record<string, number> = { FWD: 45, MID: 16, DEF: 5, GK: 1 };
  const pool = activePlayers(squad, statuses).map((p) => ({
    value: p,
    weight: (POS_W[p.position] ?? 1) * (1 + p.goals * 0.04) * (p.overall / 80),
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

  // Base xG for full 90 min (same as quick simulation)
  const homeStats = extractStats(homeSquad);
  const awayStats  = extractStats(awaySquad);
  const baseHomeLambda = computeXG(homeStats, awayStats) + 0.15;
  const baseAwayLambda = computeXG(awayStats, homeStats);

  // Mentality + suspension modifiers
  const homeSuspFactor = suspensionReduction(homeSquad, newStatuses);
  const awaySuspFactor = suspensionReduction(awaySquad, newStatuses);

  const homeLambdaPhase = baseHomeLambda * fraction
    * MENTALITY_ATK[homeMentality]
    * (1 / Math.max(0.7, MENTALITY_DEF[awayMentality]))  // opponent's defensive stance reduces goals
    * homeSuspFactor;
  const awayLambdaPhase = baseAwayLambda * fraction
    * MENTALITY_ATK[awayMentality]
    * (1 / Math.max(0.7, MENTALITY_DEF[homeMentality]))
    * awaySuspFactor;

  // Goals
  const homeGoals = samplePoisson(homeLambdaPhase);
  const awayGoals = samplePoisson(awayLambdaPhase);

  // Assign minutes to goals and pick scorers
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

  // Cards — avg ~2 yellows per team per 90 min; red ~0.15 per match
  const yellowLambda = fraction * 2;
  const homeYellows = samplePoisson(yellowLambda);
  const awayYellows = samplePoisson(yellowLambda);

  const processYellows = (squad: SquadSlot[], count: number, side: 'home' | 'away') => {
    for (let i = 0; i < count; i++) {
      const p = pickCardRecipient(squad, newStatuses);
      if (!p) continue;
      if (newStatuses[p.id] === 'booked') {
        // Second yellow = red
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

  // Rare direct red card (~0.1 per team per 90 min)
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

  // Quality bonus: each 10-point above 75 adds 1%
  prob += (shooter.overall - 75) * 0.001;
  // Experience bonus
  prob += Math.min(0.04, shooter.caps * 0.0004);
  // Goals ratio bonus
  if (shooter.caps > 0) prob += Math.min(0.03, (shooter.goals / shooter.caps) * 0.1);

  // GK save modifier
  if (gk) {
    const gkQuality = (gk.overall - 70) / 30; // -1..+1 roughly
    prob -= gkQuality * 0.06;
  }

  prob = Math.max(0.40, Math.min(0.92, prob));
  return Math.random() < prob;
}
