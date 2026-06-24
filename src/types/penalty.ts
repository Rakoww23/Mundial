// ── Modo Penales (penalty shootout tournament) ────────────────────────────────
// Isolated from the World Cup types. Every match is decided by a shootout; the user
// plays only their own team's shootouts, the rest are auto-simulated.

import type { WCKnockoutMatch } from './index';

export type PKRoundKey = 'r32' | 'r16' | 'qf' | 'sf' | 'final';
export type PKPhase = 'setup' | 'groups' | 'knockout' | 'finished' | 'eliminated';
export type PKUserResult = 'champion' | 'runnerup' | 'third' | 'fourth' | 'eliminated';

/** Result of a single shootout: penalties converted by each side + winner code. */
export interface PKShootoutResult {
  homePK: number;
  awayPK: number;
  winner: string;        // team code
}

/** A group match — always resolved by a shootout, so there are no draws. */
export interface PKGroupMatch {
  id: string;
  home: string;
  away: string;
  homePK: number | null;   // null = not played yet
  awayPK: number | null;
  winner: string | null;
}

export interface PKGroup {
  id: string;
  teams: string[];
  md1: PKGroupMatch[];
  md2: PKGroupMatch[];
  md3: PKGroupMatch[];
}

export interface PKStanding {
  code: string;
  played: number;
  won: number;
  lost: number;
  pkFor: number;      // total penalties converted
  pkAgainst: number;  // total penalties conceded
  points: number;     // 3 per shootout won, 0 per loss
}

/** Reference to the match the user is about to play (always a knockout shootout now). */
export interface PKPendingMatch {
  home: string;
  away: string;
  isKnockout: boolean;
  roundKey?: PKRoundKey;
  koMatchIdx?: number;
  isThird?: boolean;       // the third-place play-off
}

/** Aggregate stats for the user across the tournament (persisted). */
export interface PKUserStats {
  shootoutsPlayed: number;
  shootoutsWon: number;
  shootoutsLost: number;
  kicksTaken: number;
  kicksScored: number;     // as shooter
  kicksFaced: number;      // as keeper
  kicksSaved: number;      // as keeper
}

export interface PenaltyTournamentState {
  userTeam: string;
  phase: PKPhase;
  currentMatchday: number;          // retained for compatibility (groups auto-resolved)
  groups: Record<string, PKGroup>;  // group results stored internally (not playable)
  r32: WCKnockoutMatch[];
  r16: WCKnockoutMatch[];
  qf: WCKnockoutMatch[];
  sf: WCKnockoutMatch[];
  final: WCKnockoutMatch[];
  third: WCKnockoutMatch[];         // third-place play-off (0 or 1 match)
  champion: string | null;
  userResult: PKUserResult | null;  // the user's final placement when finished
  eliminatedRound: PKRoundKey | null;
  pendingMatch: PKPendingMatch | null;
  stats: PKUserStats;
}

/** Transient summary shown on the post-shootout transition screen. */
export interface PKLastResult {
  won: boolean;
  rival: string;
  userPK: number;
  rivalPK: number;
  nextOpponent: string | null;
  context: 'advance' | 'thirdplace' | 'champion' | 'runnerup' | 'third' | 'fourth' | 'eliminated';
}

// ── Interactive shootout (the one the user plays via Phaser) ───────────────────

export type PKKickOutcome = 'goal' | 'miss' | 'saved';

/** A 3x3 target grid on the goal: rows top/mid/bottom × cols left/centre/right. */
export type PKZoneRow = 'T' | 'M' | 'B';
export type PKZoneCol = 'L' | 'C' | 'R';
export interface PKZone { row: PKZoneRow; col: PKZoneCol; }

export interface PKKick {
  side: 'home' | 'away';
  shooterName: string;
  outcome: PKKickOutcome;
  aim: PKZone | null;        // where the ball was aimed
  keeperDir: PKZone | null;  // where the keeper dived
  round: number;
}

export type ShootoutPhase =
  | 'user_shoot'    // user's team takes a kick (user aims)
  | 'user_keep'     // opponent takes a kick (user is the keeper)
  | 'resolving'     // animating the outcome
  | 'done';         // shootout finished

export interface ShootoutState {
  home: string;       // team code
  away: string;
  userSide: 'home' | 'away';
  phase: ShootoutPhase;
  nextSide: 'home' | 'away';
  round: number;
  homeScore: number;
  awayScore: number;
  kicks: PKKick[];
  difficulty: number;   // 0..1, scales AI keeper/shooter quality
  finished: boolean;
  winner: 'home' | 'away' | null;
  // back-reference so the result can be applied to the tournament when finished
  pending: PKPendingMatch;
}
