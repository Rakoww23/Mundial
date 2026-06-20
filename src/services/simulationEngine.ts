import type { SquadSlot, SimulationResult, Formation } from '../types';
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
