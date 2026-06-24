import type {
  PKZone, PKZoneRow, PKZoneCol, PKKick, PKKickOutcome,
  ShootoutState, PKPendingMatch,
} from '../types/penalty';

// ── Target grid ────────────────────────────────────────────────────────────────

const ROWS: PKZoneRow[] = ['T', 'M', 'B'];
const COLS: PKZoneCol[] = ['L', 'C', 'R'];

export const PK_ZONES: PKZone[] = ROWS.flatMap((row) => COLS.map((col) => ({ row, col })));

export function zoneKey(z: PKZone): string {
  return `${z.row}${z.col}`;
}

function randomZone(): PKZone {
  return PK_ZONES[Math.floor(Math.random() * PK_ZONES.length)];
}

// Corner zones are higher-reward / higher-risk targets.
const CORNERS: PKZone[] = [
  { row: 'T', col: 'L' }, { row: 'T', col: 'R' },
  { row: 'B', col: 'L' }, { row: 'B', col: 'R' },
];

// ── Shootout lifecycle ──────────────────────────────────────────────────────────

export function createShootout(
  home: string,
  away: string,
  userSide: 'home' | 'away',
  difficulty: number,
  pending: PKPendingMatch,
): ShootoutState {
  return {
    home, away, userSide,
    phase: userSide === 'home' ? 'user_shoot' : 'user_keep',
    nextSide: 'home',
    round: 1,
    homeScore: 0,
    awayScore: 0,
    kicks: [],
    difficulty,
    finished: false,
    winner: null,
    pending,
  };
}

function takenBySide(kicks: PKKick[], side: 'home' | 'away'): number {
  return kicks.filter((k) => k.side === side).length;
}

/**
 * True when the result can no longer change — covers both early termination in the
 * best-of-5 phase and a decided sudden-death round (equal kicks, different score).
 */
export function isDecided(
  homeScore: number, awayScore: number, homeTaken: number, awayTaken: number,
): boolean {
  const homeRem = Math.max(0, 5 - homeTaken);
  const awayRem = Math.max(0, 5 - awayTaken);
  if (homeTaken <= 5 || awayTaken <= 5) {
    if (homeScore > awayScore + awayRem) return true;
    if (awayScore > homeScore + homeRem) return true;
  }
  if (homeTaken >= 5 && awayTaken >= 5 && homeTaken === awayTaken && homeScore !== awayScore) {
    return true;
  }
  return false;
}

export interface KickInput {
  outcome: PKKickOutcome;
  aim: PKZone | null;
  keeperDir: PKZone | null;
  shooterName: string;
}

/** Pure reducer: record one kick for the side whose turn it is and advance the state. */
export function applyKick(state: ShootoutState, input: KickInput): ShootoutState {
  if (state.finished) return state;

  const side = state.nextSide;
  const scored = input.outcome === 'goal';
  const kick: PKKick = {
    side,
    shooterName: input.shooterName,
    outcome: input.outcome,
    aim: input.aim,
    keeperDir: input.keeperDir,
    round: state.round,
  };

  const kicks = [...state.kicks, kick];
  const homeScore = state.homeScore + (side === 'home' && scored ? 1 : 0);
  const awayScore = state.awayScore + (side === 'away' && scored ? 1 : 0);
  const homeTaken = takenBySide(kicks, 'home');
  const awayTaken = takenBySide(kicks, 'away');

  const finished = isDecided(homeScore, awayScore, homeTaken, awayTaken);
  const nextSide: 'home' | 'away' = side === 'home' ? 'away' : 'home';
  // A round completes once away has matched home's kick count.
  const round = side === 'away' ? state.round + 1 : state.round;

  let phase: ShootoutState['phase'];
  let winner: 'home' | 'away' | null = null;
  if (finished) {
    phase = 'done';
    winner = homeScore >= awayScore ? 'home' : 'away';
  } else {
    phase = nextSide === state.userSide ? 'user_shoot' : 'user_keep';
  }

  return {
    ...state, kicks, homeScore, awayScore,
    nextSide: finished ? state.nextSide : nextSide,
    round: finished ? state.round : round,
    phase, finished, winner,
  };
}

// ── AI ──────────────────────────────────────────────────────────────────────────

/** Where the AI keeper dives when the user shoots. Higher difficulty = better read. */
export function aiKeeperDive(aim: PKZone | null, difficulty: number): PKZone {
  const readChance = 0.18 + 0.55 * difficulty;
  if (aim && Math.random() < readChance) {
    // Read the shot: same column, and same row often (less often at low difficulty).
    const row = Math.random() < 0.45 + 0.4 * difficulty ? aim.row : ROWS[Math.floor(Math.random() * 3)];
    return { row, col: aim.col };
  }
  return randomZone();
}

/** Where the AI shooter aims when the user is the keeper. Sharper at high difficulty. */
export function aiShooterAim(difficulty: number): PKZone {
  if (Math.random() < 0.35 + 0.45 * difficulty) {
    return CORNERS[Math.floor(Math.random() * CORNERS.length)];
  }
  return randomZone();
}

/**
 * Resolve a kick from aim + keeper dive. Used for the headless / placeholder path
 * (Phaser later decides saves by collision and reports the outcome directly).
 *  - off-target miss chance rises slightly for corner attempts
 *  - a save needs the keeper in the same column; same row makes it very likely
 */
export function resolveKick(
  aim: PKZone,
  keeperDir: PKZone,
  shooterSkill: number,   // 0..1 (shooter accuracy)
): PKKickOutcome {
  const isCorner = CORNERS.some((c) => c.row === aim.row && c.col === aim.col);
  const missChance = (isCorner ? 0.10 : 0.04) * (1 - 0.5 * shooterSkill);
  if (Math.random() < missChance) return 'miss';

  if (keeperDir.col === aim.col) {
    const saveChance = keeperDir.row === aim.row ? 0.78 : 0.30;
    if (Math.random() < saveChance) return 'saved';
  }
  return 'goal';
}

/** Auto-resolve one kick for the side on turn (both sides AI). For headless use. */
export function autoResolveKick(state: ShootoutState, shooterName: string): ShootoutState {
  const aim = aiShooterAim(state.difficulty);
  const dive = aiKeeperDive(aim, state.difficulty);
  const outcome = resolveKick(aim, dive, 0.6);
  return applyKick(state, { outcome, aim, keeperDir: dive, shooterName });
}

// ── Power system ──────────────────────────────────────────────────────────────
// A held-charge power meter drives shot quality. Power is a 0..1 value mapped to five
// zones; each zone shifts ball speed, wide-miss risk and how savable the shot is.

export type PowerZone = 'weak' | 'good' | 'perfect' | 'strong' | 'wild';

// Zone boundaries on the [0,1] meter (perfect is a small, satisfying band).
const POWER_BOUNDS = { weak: 0.34, good: 0.60, perfect: 0.70, strong: 0.90 };

export const POWER_ZONE_RANGES: { zone: PowerZone; from: number; to: number }[] = [
  { zone: 'weak', from: 0, to: POWER_BOUNDS.weak },
  { zone: 'good', from: POWER_BOUNDS.weak, to: POWER_BOUNDS.good },
  { zone: 'perfect', from: POWER_BOUNDS.good, to: POWER_BOUNDS.perfect },
  { zone: 'strong', from: POWER_BOUNDS.perfect, to: POWER_BOUNDS.strong },
  { zone: 'wild', from: POWER_BOUNDS.strong, to: 1 },
];

export function powerZone(p: number): PowerZone {
  if (p < POWER_BOUNDS.weak) return 'weak';
  if (p < POWER_BOUNDS.good) return 'good';
  if (p < POWER_BOUNDS.perfect) return 'perfect';
  if (p < POWER_BOUNDS.strong) return 'strong';
  return 'wild';
}

// Charge curve: time held (ms) → power, accelerating so it starts slow and races near
// the top, making the perfect band hard to stop on consistently.
export const POWER_FULL_MS = 1150;
export function powerFromCharge(elapsedMs: number): number {
  const t = Math.min(1, Math.max(0, elapsedMs / POWER_FULL_MS));
  return Math.pow(t, 1.5);
}

interface PowerProfile {
  speed: number;     // 0..1, relative ball velocity (drives keeper reaction window)
  wideMiss: number;  // base chance to sail wide regardless of the keeper
  saveMult: number;  // multiplies the keeper's directional save chance
  reaction: number;  // flat save from an AI keeper reacting to a slow ball (0 = unreactable)
}
const POWER_PROFILES: Record<PowerZone, PowerProfile> = {
  weak:    { speed: 0.35, wideMiss: 0.02, saveMult: 1.45, reaction: 0.28 },
  good:    { speed: 0.62, wideMiss: 0.03, saveMult: 1.00, reaction: 0.07 },
  perfect: { speed: 0.82, wideMiss: 0.015, saveMult: 0.42, reaction: 0.00 },
  strong:  { speed: 1.00, wideMiss: 0.17, saveMult: 0.80, reaction: 0.04 },
  wild:    { speed: 1.00, wideMiss: 1.00, saveMult: 1.00, reaction: 0.00 },
};

export function powerSpeed(zone: PowerZone): number {
  return POWER_PROFILES[zone].speed;
}

export function powerLabel(zone: PowerZone): string {
  switch (zone) {
    case 'perfect': return 'Potencia Perfecta';
    case 'good': return 'Buen Disparo';
    case 'weak': return 'Disparo Débil';
    case 'strong': return 'Demasiada Potencia';
    default: return 'Descontrolado';
  }
}

export interface PoweredKickResult {
  outcome: PKKickOutcome;
  zone: PowerZone;
}

// Keeper save chance from how well the dive covers the aim (before power scaling).
function coverageSave(aim: PKZone, keeperDir: PKZone): number {
  if (keeperDir.col !== aim.col) return 0.03;
  const ri = (r: PKZoneRow) => (r === 'T' ? 0 : r === 'M' ? 1 : 2);
  const d = Math.abs(ri(keeperDir.row) - ri(aim.row));
  return d === 0 ? 0.85 : d === 1 ? 0.34 : 0.12;
}

/**
 * Resolve a powered shot. Outcome blends aim vs keeper coverage with the power zone:
 *  - wild power always sails over the bar (miss)
 *  - higher power = more wide-miss risk but harder to save when on target
 *  - perfect power maximises scoring yet still carries a small save chance
 */
export function resolvePoweredKick(
  aim: PKZone, keeperDir: PKZone, power: number, shooterSkill: number,
  keeperReacts = true,
): PoweredKickResult {
  const zone = powerZone(power);
  const prof = POWER_PROFILES[zone];
  if (zone === 'wild') return { outcome: 'miss', zone };

  const wide = prof.wideMiss * (1 - 0.45 * shooterSkill);
  if (Math.random() < wide) return { outcome: 'miss', zone };

  // Directional save (did the keeper go the right way?) plus, when an AI keeper is in
  // goal, a flat reaction save against slow balls. The user-keeper relies on direction.
  let save = coverageSave(aim, keeperDir) * prof.saveMult;
  if (keeperReacts) save += prof.reaction;
  if (Math.random() < Math.min(0.93, save)) return { outcome: 'saved', zone };

  return { outcome: 'goal', zone };
}

/**
 * Pick a power value for an AI shooter. Stronger teams cluster near good/perfect with
 * little variance; weaker teams spread into weak/strong and occasionally lose control.
 * Never perfectly consistent — even elite teams sometimes err.
 */
export function aiSelectPower(skill: number): number {
  const center = 0.45 + 0.21 * skill;          // weak aim lower, strong near perfect band
  const spread = 0.30 - 0.17 * skill;          // weak = more variance
  let p = center + (Math.random() - 0.5) * 2 * spread;
  if (Math.random() < 0.18 - 0.12 * skill) {   // occasional human error
    p += Math.random() < 0.5 ? -0.26 : 0.30;
  }
  return Math.min(1, Math.max(0, p));
}
