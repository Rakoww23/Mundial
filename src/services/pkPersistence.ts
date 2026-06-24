import type { PenaltyTournamentState } from '../types/penalty';

// Isolated localStorage persistence for the penalty tournament only. Kept separate
// from any global store middleware so the rest of the in-memory store is untouched.

const STORAGE_KEY = 'mundial_pk_tournament_v2';

export function savePKState(state: PenaltyTournamentState | null): void {
  try {
    if (state === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // storage unavailable (private mode / quota) — degrade silently to in-memory only
  }
}

export function loadPKState(): PenaltyTournamentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PenaltyTournamentState;
    // shape guard (covers the v2 knockout-only schema)
    if (!parsed || typeof parsed.userTeam !== 'string' || !parsed.phase) return null;
    if (!Array.isArray(parsed.r32) || !Array.isArray(parsed.third)) return null;
    return parsed;
  } catch {
    return null;
  }
}
