import type { TeamData } from '../types';
import type { ArcadeRunState, ArcadeStats, ArcadeLastResult } from '../types/arcade';
import { arcadeDifficulty, levelForStreak, rankForStreak } from '../data/arcadeConfig';

export { arcadeDifficulty };

/** Pick a random opponent, avoiding the user and (when possible) the last rival. */
export function pickOpponent(
  userTeam: string, teams: Record<string, TeamData>, exclude?: string,
): string {
  let pool = Object.keys(teams).filter((c) => c !== userTeam && c !== exclude);
  if (pool.length === 0) pool = Object.keys(teams).filter((c) => c !== userTeam);
  if (pool.length === 0) return userTeam;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Begin a fresh endless run at level 0 against a random opponent. */
export function startArcadeRun(
  userTeam: string, teams: Record<string, TeamData>, preRunBest: number,
): ArcadeRunState {
  return {
    userTeam,
    streak: 0,
    level: 0,
    opponent: pickOpponent(userTeam, teams),
    status: 'ready',
    preRunBest,
    runKicksScored: 0,
    runSaves: 0,
    lastResult: null,
    startedAt: Date.now(),
  };
}

export interface ArcadeAdvance {
  run: ArcadeRunState;
  stats: ArcadeStats;
}

/**
 * Resolve a finished arcade shootout. A win extends the streak, bumps the level,
 * updates lifetime stats and queues the next opponent; a loss ends the run.
 */
export function advanceArcade(
  run: ArcadeRunState,
  stats: ArcadeStats,
  won: boolean,
  userPK: number,
  rivalPK: number,
  kick: { scored: number; saved: number },
  teams: Record<string, TeamData>,
): ArcadeAdvance {
  const rival = run.opponent;
  const runKicksScored = run.runKicksScored + kick.scored;
  const runSaves = run.runSaves + kick.saved;

  if (won) {
    const streakAfter = run.streak + 1;
    const level = levelForStreak(streakAfter);
    const rankedUp = rankForStreak(streakAfter).tier > rankForStreak(run.streak).tier;

    const newStats: ArcadeStats = {
      ...stats,
      bestStreak: Math.max(stats.bestStreak, streakAfter),
      matchesWon: stats.matchesWon + 1,
      totalKicksScored: stats.totalKicksScored + kick.scored,
      totalSaves: stats.totalSaves + kick.saved,
      maxLevel: Math.max(stats.maxLevel, level),
    };
    const lastResult: ArcadeLastResult = {
      won: true, rival, userPK, rivalPK, streakAfter,
      rankedUp, newRankId: rankedUp ? rankForStreak(streakAfter).id : null,
    };
    const newRun: ArcadeRunState = {
      ...run,
      streak: streakAfter,
      level,
      opponent: pickOpponent(run.userTeam, teams, rival),
      status: 'result',
      runKicksScored,
      runSaves,
      lastResult,
    };
    return { run: newRun, stats: newStats };
  }

  // Loss — the run is over.
  const newStats: ArcadeStats = {
    ...stats,
    runs: stats.runs + 1,
    matchesLost: stats.matchesLost + 1,
    totalKicksScored: stats.totalKicksScored + kick.scored,
    totalSaves: stats.totalSaves + kick.saved,
  };
  const lastResult: ArcadeLastResult = {
    won: false, rival, userPK, rivalPK, streakAfter: run.streak,
    rankedUp: false, newRankId: null,
  };
  const newRun: ArcadeRunState = {
    ...run, status: 'gameover', runKicksScored, runSaves, lastResult,
  };
  return { run: newRun, stats: newStats };
}
