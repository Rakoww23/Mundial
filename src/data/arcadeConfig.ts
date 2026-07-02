import { POWER_FULL_MS } from '../services/penaltyShootoutEngine';

// ── Arcade balance table ───────────────────────────────────────────────────────
// Single source of truth for the endless-mode difficulty curve and the visual rank
// ladder. Everything here is data so the game can be rebalanced without touching logic.

export interface ArcadeDifficulty {
  level: number;
  difficulty: number;   // 0..1 fed to the shootout AI (keeper read + shooter sharpness)
  powerFullMs: number;  // charge time for the user's power bar (lower = faster = harder)
}

export const ARCADE_TUNING = {
  winsPerLevel: 2,   // internal difficulty level rises every N consecutive wins
  maxLevel: 12,      // difficulty plateaus here; the streak keeps climbing for bragging
  difficulty: { start: 0.20, end: 0.95, curve: 1.20 },  // eased ramp, never reaches "unfair"
  powerMult:  { start: 1.62, end: 0.74 },               // multiplies POWER_FULL_MS base
} as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Internal difficulty level derived from the current win streak. */
export function levelForStreak(streak: number): number {
  return Math.floor(streak / ARCADE_TUNING.winsPerLevel);
}

/** Resolve the difficulty profile for a level. Difficulty caps at maxLevel. */
export function arcadeDifficulty(level: number): ArcadeDifficulty {
  const t = clamp01(Math.min(level, ARCADE_TUNING.maxLevel) / ARCADE_TUNING.maxLevel);
  const d = ARCADE_TUNING.difficulty;
  const difficulty = lerp(d.start, d.end, Math.pow(t, d.curve));
  const mult = lerp(ARCADE_TUNING.powerMult.start, ARCADE_TUNING.powerMult.end, t);
  return { level, difficulty, powerFullMs: Math.round(POWER_FULL_MS * mult) };
}

// ── Visual rank ladder (by best streak) ────────────────────────────────────────
// Eight tiers that evolve from a dull bronze crest to an electric violet emblem. The
// badge component reads `tier` to layer escalating effects (glow → shimmer → lightning).

export interface ArcadeRank {
  id: string;
  name: string;
  minStreak: number;
  tier: number;      // 1..8
  color: string;     // primary emblem colour
  color2: string;    // gradient partner
  glow: string;      // rgba halo
}

export const ARCADE_RANKS: ArcadeRank[] = [
  { id: 'novato',       name: 'Novato',       minStreak: 0,  tier: 1, color: '#9c7b45', color2: '#6b4f27', glow: 'rgba(156,123,69,0.45)' },
  { id: 'aprendiz',     name: 'Aprendiz',     minStreak: 3,  tier: 2, color: '#c3ccd6', color2: '#8b95a2', glow: 'rgba(195,204,214,0.5)' },
  { id: 'contendiente', name: 'Contendiente', minStreak: 6,  tier: 3, color: '#42a5ff', color2: '#1c6fd6', glow: 'rgba(66,165,255,0.55)' },
  { id: 'profesional',  name: 'Profesional',  minStreak: 10, tier: 4, color: '#8BF542', color2: '#3f9e2a', glow: 'rgba(139,245,66,0.55)' },
  { id: 'elite',        name: 'Élite',        minStreak: 15, tier: 5, color: '#E0C062', color2: '#b78d2a', glow: 'rgba(224,192,98,0.6)' },
  { id: 'maestro',      name: 'Maestro',      minStreak: 22, tier: 6, color: '#ff5252', color2: '#c01f1f', glow: 'rgba(255,82,82,0.6)' },
  { id: 'leyenda',      name: 'Leyenda',      minStreak: 32, tier: 7, color: '#b47cf7', color2: '#7c34d6', glow: 'rgba(180,124,247,0.62)' },
  { id: 'inmortal',     name: 'Inmortal',     minStreak: 45, tier: 8, color: '#e879f9', color2: '#8b1fd6', glow: 'rgba(232,121,249,0.72)' },
];

/** The highest rank the streak has reached. */
export function rankForStreak(streak: number): ArcadeRank {
  let r = ARCADE_RANKS[0];
  for (const rank of ARCADE_RANKS) if (streak >= rank.minStreak) r = rank;
  return r;
}

export function nextRank(rank: ArcadeRank): ArcadeRank | null {
  return ARCADE_RANKS.find((r) => r.tier === rank.tier + 1) ?? null;
}

/** Current rank, the next one to chase, and 0..1 progress toward it. */
export function rankProgress(bestStreak: number): { current: ArcadeRank; next: ArcadeRank | null; pct: number } {
  const current = rankForStreak(bestStreak);
  const nxt = nextRank(current);
  if (!nxt) return { current, next: null, pct: 1 };
  const span = nxt.minStreak - current.minStreak;
  const pct = clamp01((bestStreak - current.minStreak) / span);
  return { current, next: nxt, pct };
}
