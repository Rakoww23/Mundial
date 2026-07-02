import type { ArcadeStats, ArcadeRunState } from '../types/arcade';
import { EMPTY_ARCADE_STATS } from '../types/arcade';

// Isolated localStorage persistence for the arcade mode. Stats and the active run are
// stored under separate keys so lifetime records survive even if a run is abandoned.

const STATS_KEY = 'mundial_pk_arcade_stats_v1';
const RUN_KEY = 'mundial_pk_arcade_run_v1';

export function loadArcadeStats(): ArcadeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...EMPTY_ARCADE_STATS };
    const parsed = JSON.parse(raw) as Partial<ArcadeStats>;
    return { ...EMPTY_ARCADE_STATS, ...parsed };
  } catch {
    return { ...EMPTY_ARCADE_STATS };
  }
}

export function saveArcadeStats(stats: ArcadeStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // storage unavailable — degrade to in-memory only
  }
}

export function loadArcadeRun(): ArcadeRunState | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ArcadeRunState;
    if (!parsed || typeof parsed.userTeam !== 'string' || typeof parsed.streak !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveArcadeRun(run: ArcadeRunState | null): void {
  try {
    if (run === null) localStorage.removeItem(RUN_KEY);
    else localStorage.setItem(RUN_KEY, JSON.stringify(run));
  } catch {
    // storage unavailable — degrade to in-memory only
  }
}
