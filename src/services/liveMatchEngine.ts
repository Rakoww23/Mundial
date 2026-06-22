import type {
  SquadSlot, Player, MatchState, MatchEvent, PlayerStatus, TacticalMentality,
} from '../types';
import { effectiveOvr } from './oopPenalty';
import { getTeamTactics, fatigueOvrPenalty, FATIGUE_PER_MATCH, ageFatigueMultiplier } from '../data/teamTactics';

// ── Tunable mentality coefficients (own semantics for the live engine) ─────────

const MENT_ATK: Record<TacticalMentality, number> = {
  defensive: 0.74, balanced: 1.0, offensive: 1.26, ultraoffensive: 1.55,
};
// How vulnerable a team is at the back → multiplies the OPPONENT's xG
const MENT_VULN: Record<TacticalMentality, number> = {
  defensive: 0.76, balanced: 1.0, offensive: 1.22, ultraoffensive: 1.50,
};
// Physical intensity → fatigue multiplier
const MENT_INTENSITY: Record<TacticalMentality, number> = {
  defensive: 0.88, balanced: 1.0, offensive: 1.12, ultraoffensive: 1.22,
};

const BASE_XG = 1.20;
const SCALE   = 18;
const MAX_LAMBDA = 4.3;   // cap per-90 xG so mismatches stay realistic (no 19-0)

// Fatigue thresholds
export const FATIGUE_WARN   = 80;   // first "consider a sub" warning
export const FATIGUE_INJURY = 93;   // breaks down if kept on the pitch
export const FATIGUE_UNFIT  = 85;   // cannot START a match above this

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

// ── Active player filtering ─────────────────────────────────────────────────────

export function isPlayerActive(
  id: number,
  statuses: Record<number, PlayerStatus>,
  injured: Record<number, boolean>,
): boolean {
  return statuses[id] !== 'suspended' && !injured[id];
}

export function activeStarters(
  squad: SquadSlot[],
  statuses: Record<number, PlayerStatus>,
  injured: Record<number, boolean>,
): { player: Player; role: string }[] {
  return squad
    .filter((s) => s.player && isPlayerActive(s.player.id, statuses, injured))
    .map((s) => ({ player: s.player!, role: s.formation.role }));
}

// ── Team strength (fatigue + tactics aware) ────────────────────────────────────

interface TeamStrength { atk: number; def: number; activeCount: number; }

function teamStrength(
  squad: SquadSlot[],
  fatigue: Record<number, number>,
  statuses: Record<number, PlayerStatus>,
  injured: Record<number, boolean>,
): TeamStrength {
  const eff = (p: Player, role: string) =>
    effectiveOvr(p, role) * (1 - fatigueOvrPenalty(fatigue[p.id] ?? 0));

  const gk: number[] = [], def: number[] = [], mid: number[] = [], fwd: number[] = [];
  let activeCount = 0;
  for (const s of squad) {
    if (!s.player) continue;
    if (!isPlayerActive(s.player.id, statuses, injured)) continue;
    activeCount++;
    const v = eff(s.player, s.formation.role);
    if (s.formation.role === 'GK') gk.push(v);
    else if (s.formation.role === 'DEF') def.push(v);
    else if (s.formation.role === 'MID') mid.push(v);
    else fwd.push(v);
  }

  const all = [...gk, ...def, ...mid, ...fwd];
  // Raw quality on the OVR scale (no tactics here — applied as multipliers later)
  const atk = (avg(fwd) || 60) * 0.55 + (avg(mid) || 62) * 0.30 + (avg(all) || 64) * 0.15;
  const def_ = (avg(def) || 62) * 0.45 + (avg(gk) || 62) * 0.40 + (avg(mid) || 62) * 0.15;

  return { atk, def: def_, activeCount };
}

// ── Per-90 expected goals for both sides given current live state ───────────────

export function computeLiveLambdas(
  ms: MatchState,
  homeSquad: SquadSlot[],
  awaySquad: SquadSlot[],
  homeCode: string,
  awayCode: string,
): { home: number; away: number } {
  const fatigue = ms.fatigue ?? {};
  const injured = ms.injured ?? {};
  const hs = teamStrength(homeSquad, fatigue, ms.playerStatuses, injured);
  const as = teamStrength(awaySquad, fatigue, ms.playerStatuses, injured);
  const homeTac = getTeamTactics(homeCode);
  const awayTac = getTeamTactics(awayCode);

  // man-advantage swing
  const homeManFactor = hs.activeCount >= as.activeCount ? 1 : 0.82;
  const awayManFactor = as.activeCount >= hs.activeCount ? 1 : 0.82;

  // Quality gap from raw OVR; tactics & mentality are gentle multipliers on the result
  let home = BASE_XG * Math.exp((hs.atk - as.def) / SCALE)
    * MENT_ATK[ms.homeMentality] * MENT_VULN[ms.awayMentality]
    * homeTac.atkMod / awayTac.defMod * homeManFactor;
  let away = BASE_XG * Math.exp((as.atk - hs.def) / SCALE)
    * MENT_ATK[ms.awayMentality] * MENT_VULN[ms.homeMentality]
    * awayTac.atkMod / homeTac.defMod * awayManFactor;

  home = Math.min(MAX_LAMBDA, Math.max(0.15, home));
  away = Math.min(MAX_LAMBDA, Math.max(0.15, away));
  return { home, away };
}

// ── Weighted pickers ────────────────────────────────────────────────────────────

function pickFromWeighted<T>(items: { value: T; weight: number }[]): T | null {
  const total = items.reduce((s, x) => s + x.weight, 0);
  if (!total) return null;
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function pickScorer(
  squad: SquadSlot[],
  statuses: Record<number, PlayerStatus>,
  injured: Record<number, boolean>,
  fatigue: Record<number, number>,
): Player | null {
  const ROLE_W: Record<string, number> = { FWD: 45, MID: 18, DEF: 5, GK: 1 };
  const pool = squad
    .filter((s) => s.player && isPlayerActive(s.player.id, statuses, injured))
    .map((s) => ({
      value: s.player!,
      weight: (ROLE_W[s.formation.role] ?? 1)
        * (1 + s.player!.goals * 0.04)
        * (s.player!.overall / 80)
        * (1 - fatigueOvrPenalty(fatigue[s.player!.id] ?? 0) * 0.5),
    }));
  return pickFromWeighted(pool);
}

function pickCardRecipient(
  squad: SquadSlot[],
  statuses: Record<number, PlayerStatus>,
  injured: Record<number, boolean>,
): Player | null {
  const POS_W: Record<string, number> = { MID: 35, DEF: 30, FWD: 20, GK: 3 };
  const pool = squad
    .filter((s) => s.player && isPlayerActive(s.player.id, statuses, injured))
    .map((s) => ({ value: s.player!, weight: POS_W[s.formation.role] ?? 10 }));
  return pickFromWeighted(pool);
}

function pickKeeper(squad: SquadSlot[]): Player | null {
  return squad.find((s) => s.formation.role === 'GK' && s.player)?.player ?? null;
}

function lastName(name: string): string {
  return name.split(' ').slice(-1)[0];
}

// ── One simulated minute ────────────────────────────────────────────────────────

export interface MinuteResult {
  events: MatchEvent[];
  homeGoals: number;
  awayGoals: number;
  statuses: Record<number, PlayerStatus>;
  fatigue: Record<number, number>;
  injured: Record<number, boolean>;
  fatigueWarned: Record<number, boolean>;
}

export function stepMinute(
  minute: number,
  ms: MatchState,
  homeSquad: SquadSlot[],
  awaySquad: SquadSlot[],
  homeCode: string,
  awayCode: string,
): MinuteResult {
  const events: MatchEvent[] = [];
  const statuses = { ...ms.playerStatuses };
  const fatigue = { ...(ms.fatigue ?? {}) };
  const injured = { ...(ms.injured ?? {}) };
  const fatigueWarned = { ...(ms.fatigueWarned ?? {}) };

  const lambdas = computeLiveLambdas(ms, homeSquad, awaySquad, homeCode, awayCode);
  const homeGoalP = 1 - Math.exp(-lambdas.home / 90);
  const awayGoalP = 1 - Math.exp(-lambdas.away / 90);

  let homeGoals = 0, awayGoals = 0;

  // ── Goals ──
  if (Math.random() < homeGoalP) {
    const scorer = pickScorer(homeSquad, statuses, injured, fatigue);
    if (scorer) { homeGoals++; events.push({ minute, type: 'goal', side: 'home', playerId: scorer.id, playerName: scorer.name }); }
  }
  if (Math.random() < awayGoalP) {
    const scorer = pickScorer(awaySquad, statuses, injured, fatigue);
    if (scorer) { awayGoals++; events.push({ minute, type: 'goal', side: 'away', playerId: scorer.id, playerName: scorer.name }); }
  }

  // ── Clear chances / great saves (flavour, no score change) ──
  const chance = (squad: SquadSlot[], rival: SquadSlot[], side: 'home' | 'away', p: number) => {
    if (Math.random() < p) {
      const att = pickScorer(squad, statuses, injured, fatigue);
      if (!att) return;
      if (Math.random() < 0.45) {
        const gk = pickKeeper(rival);
        if (gk) events.push({ minute, type: 'save', side, playerId: gk.id, playerName: gk.name, detail: `parada de ${lastName(gk.name)}` });
      } else {
        events.push({ minute, type: 'chance', side, playerId: att.id, playerName: att.name, detail: `ocasión de ${lastName(att.name)}` });
      }
    }
  };
  // chances are notably rarer than the underlying scoring rate (avoid spam)
  chance(homeSquad, awaySquad, 'home', (homeGoalP) * 0.55);
  chance(awaySquad, homeSquad, 'away', (awayGoalP) * 0.55);

  // ── Cards ──
  const YELLOW_P = (3.4 / 90);   // ~3.4 yellows per team per match
  const processYellow = (squad: SquadSlot[], side: 'home' | 'away') => {
    if (Math.random() < YELLOW_P) {
      const p = pickCardRecipient(squad, statuses, injured);
      if (!p) return;
      if (statuses[p.id] === 'booked') {
        statuses[p.id] = 'suspended';
        injured[p.id] = injured[p.id]; // keep
        events.push({ minute, type: 'red_card', side, playerId: p.id, playerName: p.name, detail: 'doble amarilla' });
      } else {
        statuses[p.id] = 'booked';
        events.push({ minute, type: 'yellow_card', side, playerId: p.id, playerName: p.name });
      }
    }
  };
  processYellow(homeSquad, 'home');
  processYellow(awaySquad, 'away');

  // straight red (rare)
  const RED_P = 0.10 / 90;
  const processRed = (squad: SquadSlot[], side: 'home' | 'away') => {
    if (Math.random() < RED_P) {
      const p = pickCardRecipient(squad, statuses, injured);
      if (p) {
        statuses[p.id] = 'suspended';
        events.push({ minute, type: 'red_card', side, playerId: p.id, playerName: p.name, detail: 'roja directa' });
      }
    }
  };
  processRed(homeSquad, 'home');
  processRed(awaySquad, 'away');

  // ── Fatigue accrual + warnings + breakdown ──
  const accrue = (squad: SquadSlot[], side: 'home' | 'away', ment: TacticalMentality) => {
    for (const s of squad) {
      const p = s.player;
      if (!p || !isPlayerActive(p.id, statuses, injured)) continue;
      const base90 = (FATIGUE_PER_MATCH[s.formation.role] ?? 22) * ageFatigueMultiplier(p.age);
      const inc = (base90 / 90) * MENT_INTENSITY[ment];
      const next = Math.min(100, (fatigue[p.id] ?? 0) + inc);
      fatigue[p.id] = next;

      if (next >= FATIGUE_WARN && !fatigueWarned[p.id]) {
        fatigueWarned[p.id] = true;
        events.push({ minute, type: 'info', side, playerId: p.id, playerName: p.name, detail: `${lastName(p.name)} muy cansado · considera un cambio` });
      }
      if (next >= FATIGUE_INJURY) {
        injured[p.id] = true;
        events.push({ minute, type: 'injury', side, playerId: p.id, playerName: p.name, detail: `${lastName(p.name)} se retira agotado` });
      }
    }
  };
  accrue(homeSquad, 'home', ms.homeMentality);
  accrue(awaySquad, 'away', ms.awayMentality);

  events.sort((a, b) => a.minute - b.minute);
  return { events, homeGoals, awayGoals, statuses, fatigue, injured, fatigueWarned };
}

// ── Rival AI: mentality reaction + fatigue-driven substitutions ─────────────────

export function decideRivalMentality(
  ms: MatchState,
  rivalSide: 'home' | 'away',
  minute: number,
): TacticalMentality | null {
  const diff = rivalSide === 'home'
    ? ms.homeScore - ms.awayScore
    : ms.awayScore - ms.homeScore;
  const current = rivalSide === 'home' ? ms.homeMentality : ms.awayMentality;

  let target: TacticalMentality = 'balanced';
  if (minute >= 60) {
    if (diff <= -2) target = 'ultraoffensive';
    else if (diff === -1) target = 'offensive';
    else if (diff === 1) target = minute >= 80 ? 'defensive' : 'balanced';
    else if (diff >= 2) target = 'defensive';
  } else if (minute >= 35) {
    if (diff <= -2) target = 'offensive';
    else if (diff >= 2) target = 'balanced';
  }
  return target !== current ? target : null;
}

/** Pick a tired/booked starter the AI should replace (returns slot index). */
export function pickAiSubOut(
  squad: SquadSlot[],
  fatigue: Record<number, number>,
  statuses: Record<number, PlayerStatus>,
  injured: Record<number, boolean>,
  chasing: boolean,
): number | null {
  let bestIdx = -1, bestScore = 0;
  squad.forEach((s, i) => {
    const p = s.player;
    if (!p || !isPlayerActive(p.id, statuses, injured)) return;
    const fat = fatigue[p.id] ?? 0;
    let score = fat;
    if (statuses[p.id] === 'booked') score += 25;        // protect a booked player
    if (chasing && s.formation.role === 'DEF') score -= 15; // when chasing, keep attackers
    if (chasing && s.formation.role === 'FWD') score += 10;
    if (score > bestScore && fat >= 55) { bestScore = score; bestIdx = i; }
  });
  return bestIdx >= 0 ? bestIdx : null;
}

/** Best fresh bench player for a given role. */
export function pickBenchReplacement(
  bench: Player[],
  role: string,
  fatigue: Record<number, number>,
  statuses: Record<number, PlayerStatus>,
  injured: Record<number, boolean>,
): Player | null {
  const pool = bench
    .filter((p) => isPlayerActive(p.id, statuses, injured))
    .map((p) => ({
      value: p,
      weight: effectiveOvr(p, role) * (1 - fatigueOvrPenalty(fatigue[p.id] ?? 0)),
    }))
    .filter((x) => x.weight > 0);
  if (!pool.length) return null;
  pool.sort((a, b) => b.weight - a.weight);
  return pool[0].value;
}

export { lastName };
