// ── Modo Penales Arcade (endless streak run) ──────────────────────────────────
// Kept separate from the tournament types. The arcade reuses the interactive
// shootout plumbing but drives its own run/streak/rank progression.

/** Lifetime stats, persisted across runs and app restarts. */
export interface ArcadeStats {
  bestStreak: number;
  runs: number;              // total runs played (a run ends on the first loss)
  matchesWon: number;        // shootouts won across all runs
  matchesLost: number;       // shootouts lost across all runs
  totalKicksScored: number;  // goals scored as shooter
  totalSaves: number;        // penalties stopped as keeper
  maxLevel: number;          // highest internal difficulty level ever reached
}

export const EMPTY_ARCADE_STATS: ArcadeStats = {
  bestStreak: 0, runs: 0, matchesWon: 0, matchesLost: 0,
  totalKicksScored: 0, totalSaves: 0, maxLevel: 0,
};

/** Summary of the shootout just played, drives the result / game-over screens. */
export interface ArcadeLastResult {
  won: boolean;
  rival: string;
  userPK: number;
  rivalPK: number;
  streakAfter: number;
  rankedUp: boolean;
  newRankId: string | null;
}

export type ArcadeStatus = 'ready' | 'result' | 'gameover';

export interface ArcadeRunState {
  userTeam: string;
  streak: number;            // consecutive matches won this run
  level: number;             // internal difficulty level = floor(streak / winsPerLevel)
  opponent: string;          // team code of the current / upcoming opponent
  status: ArcadeStatus;
  preRunBest: number;        // best streak before this run (to detect a new record)
  runKicksScored: number;
  runSaves: number;
  lastResult: ArcadeLastResult | null;
  startedAt: number;
}
