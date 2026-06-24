import type { PKRoundKey } from '../types/penalty';

// Difficulty rises as the tournament progresses. The number is a 0..1 scalar used by
// the shootout AI: higher = sharper keeper (faster reaction, better guessing) and a
// more accurate AI shooter when the user is in goal.

export const GROUP_DIFFICULTY = 0.30;

export const ROUND_DIFFICULTY: Record<PKRoundKey, number> = {
  r32: 0.42,
  r16: 0.54,
  qf: 0.66,
  sf: 0.80,
  final: 0.92,
};

export function difficultyForGroup(): number {
  return GROUP_DIFFICULTY;
}

export function difficultyForRound(round: PKRoundKey): number {
  return ROUND_DIFFICULTY[round] ?? 0.5;
}
