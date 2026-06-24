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
