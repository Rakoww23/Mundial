import type { Player } from '../types';

// Row = player's natural position, Col = slot/formation role they're assigned to.
// A GK placed in a FWD slot contributes near-nothing offensively (0.10×).
// A FWD placed as GK is catastrophic defensively (0.10×).
export const OOP_PENALTY: Record<string, Record<string, number>> = {
  GK:  { GK: 1.00, DEF: 0.28, MID: 0.18, FWD: 0.10 },
  DEF: { GK: 0.18, DEF: 1.00, MID: 0.70, FWD: 0.50 },
  MID: { GK: 0.14, DEF: 0.65, MID: 1.00, FWD: 0.70 },
  FWD: { GK: 0.10, DEF: 0.45, MID: 0.65, FWD: 1.00 },
};

export function effectiveOvr(player: Player, slotRole: string): number {
  const factor = OOP_PENALTY[player.position]?.[slotRole] ?? 1.0;
  return player.overall * factor;
}

export function oopSeverity(
  naturalPos: string,
  slotRole: string
): 'none' | 'mild' | 'moderate' | 'extreme' {
  if (naturalPos === slotRole) return 'none';
  const factor = OOP_PENALTY[naturalPos]?.[slotRole] ?? 1.0;
  if (factor >= 0.65) return 'mild';
  if (factor >= 0.35) return 'moderate';
  return 'extreme';
}
