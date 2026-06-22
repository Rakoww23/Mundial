import type {
  TeamData, Formation, SquadSlot, Player, MatchState, WCPlayerStats, MatchEvent,
} from '../types';
import { computeFatigueRecovery, computeFatigueGain } from '../data/teamTactics';

export function defaultStat(): WCPlayerStats {
  return { yellowCards: 0, redCards: 0, suspended: false, injured: false, fatigue: 0, minutesPlayed: 0, matchesPlayed: 0 };
}

export function getStat(stats: Record<number, WCPlayerStats>, id: number): WCPlayerStats {
  return stats[id] ?? defaultStat();
}

// ── Squad builder that respects suspensions / injuries / fatigue ─────────────────

const FATIGUE_UNFIT = 85;   // cannot start above this

export function buildAvailableSquad(
  team: TeamData,
  formation: Formation,
  stats: Record<number, WCPlayerStats>,
): SquadSlot[] {
  const byPos: Record<string, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of team.players) {
    const st = stats[p.id];
    if (st?.injured || st?.suspended) continue;            // unavailable entirely
    byPos[p.position]?.push(p);
  }
  // Sort: fit players first (under fatigue cap), then by fatigue-adjusted overall
  for (const pos of Object.keys(byPos)) {
    byPos[pos].sort((a, b) => {
      const fa = stats[a.id]?.fatigue ?? 0;
      const fb = stats[b.id]?.fatigue ?? 0;
      const unfitA = fa >= FATIGUE_UNFIT ? 1 : 0;
      const unfitB = fb >= FATIGUE_UNFIT ? 1 : 0;
      if (unfitA !== unfitB) return unfitA - unfitB;
      return (b.overall * (1 - fb / 250)) - (a.overall * (1 - fa / 250));
    });
  }
  const used = new Set<number>();
  return formation.slots.map((slot) => {
    const pool = byPos[slot.role] ?? [];
    let player = pool.find((p) => !used.has(p.id)) ?? null;
    // Fallback: if a role is empty (all suspended/injured), borrow any spare player
    if (!player) {
      const all = team.players.filter((p) => {
        const st = stats[p.id];
        return !st?.injured && !st?.suspended && !used.has(p.id);
      });
      player = all[0] ?? null;
    }
    if (player) used.add(player.id);
    return { formation: slot, player };
  });
}

// ── Persist a match the USER played (full per-player event data available) ───────

export function accruePlayedMatch(
  stats: Record<number, WCPlayerStats>,
  homeSquad: SquadSlot[],
  awaySquad: SquadSlot[],
  homeCode: string,
  awayCode: string,
  ms: MatchState,
  teams: Record<string, TeamData>,
): Record<number, WCPlayerStats> {
  const next: Record<number, WCPlayerStats> = { ...stats };
  const minutes = Math.min(120, Math.max(90, ms.minute));
  const fatigueMap = ms.fatigue ?? {};
  const injuredMap = ms.injured ?? {};

  // count cards from events
  const yellowByPlayer: Record<number, number> = {};
  const redByPlayer: Record<number, boolean> = {};
  for (const ev of ms.events as MatchEvent[]) {
    if (ev.type === 'yellow_card') yellowByPlayer[ev.playerId] = (yellowByPlayer[ev.playerId] ?? 0) + 1;
    if (ev.type === 'red_card') redByPlayer[ev.playerId] = true;
  }

  const teamCodes = [homeCode, awayCode];
  // First clear suspensions for both teams that just sat this match out
  for (const code of teamCodes) {
    for (const p of teams[code]?.players ?? []) {
      const st = next[p.id] ?? defaultStat();
      if (st.suspended) { next[p.id] = { ...st, suspended: false }; }   // served
    }
  }

  const applySquad = (squad: SquadSlot[]) => {
    for (const s of squad) {
      const p = s.player;
      if (!p) continue;
      const prev = next[p.id] ?? defaultStat();
      const playedFat = fatigueMap[p.id];
      const newFatigue = playedFat !== undefined
        ? Math.max(prev.fatigue, playedFat)
        : Math.min(100, prev.fatigue + computeFatigueGain(p.position, p.age, minutes));

      let yellows = prev.yellowCards + (yellowByPlayer[p.id] ?? 0);
      let reds = prev.redCards + (redByPlayer[p.id] ? 1 : 0);
      let suspended = false;
      // Accumulation rule: 2 yellows → suspension (then the count resets)
      if (yellows >= 2) { suspended = true; yellows = 0; }
      if (redByPlayer[p.id]) suspended = true;
      const injured = prev.injured || !!injuredMap[p.id];

      next[p.id] = {
        yellowCards: yellows,
        redCards: reds,
        suspended,
        injured,
        fatigue: newFatigue,
        minutesPlayed: prev.minutesPlayed + minutes,
        matchesPlayed: prev.matchesPlayed + 1,
      };
    }
  };
  applySquad(homeSquad);
  applySquad(awaySquad);
  return next;
}

// ── Lightweight accrual for AI auto-simulated matches ───────────────────────────

export function accrueAutoMatch(
  stats: Record<number, WCPlayerStats>,
  homeCode: string,
  awayCode: string,
  teams: Record<string, TeamData>,
): Record<number, WCPlayerStats> {
  const next: Record<number, WCPlayerStats> = { ...stats };

  for (const code of [homeCode, awayCode]) {
    const team = teams[code];
    if (!team) continue;
    // clear served suspensions
    for (const p of team.players) {
      const st = next[p.id];
      if (st?.suspended) next[p.id] = { ...st, suspended: false };
    }
    // approximate the XI: top 11 available by overall
    const xi = [...team.players]
      .filter((p) => { const st = next[p.id]; return !st?.injured && !st?.suspended; })
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 11);

    for (const p of xi) {
      const prev = next[p.id] ?? defaultStat();
      // ~3.5% chance of a yellow per match for a starter
      let yellows = prev.yellowCards + (Math.random() < 0.18 ? 1 : 0);
      let reds = prev.redCards;
      let suspended = false;
      if (Math.random() < 0.012) { reds += 1; suspended = true; }
      if (yellows >= 2) { suspended = true; yellows = 0; }
      next[p.id] = {
        yellowCards: yellows,
        redCards: reds,
        suspended,
        injured: prev.injured,
        fatigue: Math.min(100, prev.fatigue + computeFatigueGain(p.position, p.age, 90)),
        minutesPlayed: prev.minutesPlayed + 90,
        matchesPlayed: prev.matchesPlayed + 1,
      };
    }
  }
  return next;
}

// ── Recovery between matchdays / rounds (applies to everyone) ────────────────────

export function applyRecovery(
  stats: Record<number, WCPlayerStats>,
  teams: Record<string, TeamData>,
): Record<number, WCPlayerStats> {
  const next: Record<number, WCPlayerStats> = { ...stats };
  // build id → player for position/age lookup
  const idMap: Record<number, Player> = {};
  for (const code of Object.keys(teams)) for (const p of teams[code].players) idMap[p.id] = p;

  for (const idStr of Object.keys(next)) {
    const id = Number(idStr);
    const st = next[id];
    const p = idMap[id];
    if (!p) continue;
    const recover = computeFatigueRecovery(p.position, p.age);
    next[id] = { ...st, fatigue: Math.max(0, st.fatigue - recover) };
  }
  return next;
}
