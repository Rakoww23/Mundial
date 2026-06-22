import { create } from 'zustand';
import type {
  Player, TeamData, Formation, SquadSlot, SimulationResult, TacticalAnalysis,
  MatchState, MatchEvent, MatchType, MatchPhase, MatchSpeed, TacticalMentality, PlayerStatus,
  AppPage, MatchMode, CustomMatchStart,
  WorldCupState, WCPendingMatch,
} from '../types';
import { FORMATIONS, DEFAULT_FORMATION_ID } from '../data/formations';
import playersData from '../data/players.json';
import { analyzeSquad } from '../services/tacticalEngine';
import { simulate, simulatePhase, buildPenaltyOrder, simulatePenaltyKick } from '../services/simulationEngine';
import {
  initWorldCup, simulateGroupMatch, simulateKnockoutMatch,
  getQualified, buildR32, buildNextRound,
} from '../services/worldCupEngine';
import {
  stepMinute, decideRivalMentality, pickAiSubOut, pickBenchReplacement,
} from '../services/liveMatchEngine';
import { getTeamTactics } from '../data/teamTactics';
import {
  buildAvailableSquad, accruePlayedMatch, accrueAutoMatch, applyRecovery,
} from '../services/wcStats';

const ALL_TEAMS: Record<string, TeamData> = playersData as Record<string, TeamData>;

function getFormation(id: string): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];
}

function buildSquad(team: TeamData, formation: Formation): SquadSlot[] {
  const byPos: Record<string, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of team.players) byPos[p.position]?.push(p);
  for (const pos of Object.keys(byPos)) byPos[pos].sort((a, b) => b.overall - a.overall);
  const used = new Set<number>();
  return formation.slots.map((slot) => {
    const pool = byPos[slot.role] ?? [];
    const player = pool.find((p) => !used.has(p.id)) ?? null;
    if (player) used.add(player.id);
    return { formation: slot, player };
  });
}

type WCMatchdayKey = 'md1' | 'md2' | 'md3';
const MD_KEYS: WCMatchdayKey[] = ['md1', 'md2', 'md3'];

// ── Live match helpers ──────────────────────────────────────────────────────────

function checkLiveEnd(s: MatchState): MatchState {
  const target = s.inExtraTime ? 120 : 90;
  if (s.minute < target) return s;
  if (!s.inExtraTime) {
    // end of regulation
    if (s.type === 'group' || s.homeScore !== s.awayScore) {
      return { ...s, phase: 'finished', running: false };
    }
    return { ...s, inExtraTime: true };   // knockout draw → extra time, keep ticking
  }
  // end of extra time
  if (s.homeScore !== s.awayScore) return { ...s, phase: 'finished', running: false };
  return { ...s, phase: 'penalties', running: false };
}

// Applies at most one rival substitution (forced for injuries, fatigue-driven otherwise).
function applyRivalSub(
  side: 'home' | 'away',
  squad: SquadSlot[],
  team: TeamData,
  state: MatchState,
): { squad: SquadSlot[]; state: MatchState } {
  const subsUsed = side === 'home' ? (state.homeSubsUsed ?? 0) : (state.awaySubsUsed ?? 0);
  if (subsUsed >= 4) return { squad, state };

  const fatigue  = state.fatigue ?? {};
  const injured  = state.injured ?? {};
  const statuses = state.playerStatuses;
  const onPitchIds = new Set(squad.map((s) => s.player?.id).filter(Boolean) as number[]);

  let outIdx = -1;
  // Forced: an injured starter still listed
  squad.forEach((s, i) => {
    if (outIdx === -1 && s.player && injured[s.player.id]) outIdx = i;
  });
  const chasing = side === 'home' ? state.homeScore < state.awayScore : state.awayScore < state.homeScore;
  if (outIdx === -1) {
    const candidate = pickAiSubOut(squad, fatigue, statuses, injured, chasing);
    if (candidate !== null && Math.random() < 0.10) outIdx = candidate;
  }
  if (outIdx === -1) return { squad, state };

  const role = squad[outIdx].formation.role;
  const bench = team.players.filter((p) => !onPitchIds.has(p.id));
  const inPlayer = pickBenchReplacement(bench, role, fatigue, statuses, injured);
  if (!inPlayer) return { squad, state };

  const outPlayer = squad[outIdx].player!;
  const newSquad = squad.map((s, i) => (i === outIdx ? { ...s, player: inPlayer } : s));
  const ev: MatchEvent = {
    minute: state.minute, type: 'substitution', side,
    playerId: outPlayer.id, playerName: outPlayer.name,
    detail: inPlayer.name, secondName: inPlayer.name,
  };
  const newState: MatchState = {
    ...state,
    events: [...state.events, ev],
    homeSubsUsed: side === 'home' ? subsUsed + 1 : state.homeSubsUsed,
    awaySubsUsed: side === 'away' ? subsUsed + 1 : state.awaySubsUsed,
  };
  return { squad: newSquad, state: newState };
}

interface MatchSimSnapshot {
  homeCode: string;
  awayCode: string;
  homeFormationId: string;
  awayFormationId: string;
  homeSquad: SquadSlot[];
  awaySquad: SquadSlot[];
  homeAnalysis: TacticalAnalysis | null;
  awayAnalysis: TacticalAnalysis | null;
  simResult: SimulationResult | null;
}

interface GameState {
  // ── Team / formation state ──────────────────────────────────────────────────
  teams: Record<string, TeamData>;
  teamCodes: string[];
  homeCode: string;
  awayCode: string;
  homeFormationId: string;
  awayFormationId: string;
  homeSquad: SquadSlot[];
  awaySquad: SquadSlot[];
  homeAnalysis: TacticalAnalysis | null;
  awayAnalysis: TacticalAnalysis | null;
  simResult: SimulationResult | null;
  activeModal: { side: 'home' | 'away'; slotIndex: number } | null;
  // Snapshot of standalone match simulator state — saved when WC captures the match screen
  matchSimSnapshot: MatchSimSnapshot | null;

  // ── Match simulation state ──────────────────────────────────────────────────
  matchState: MatchState | null;
  pendingMatchType: MatchType;

  // ── App navigation ──────────────────────────────────────────────────────────
  appPage: AppPage;
  matchMode: MatchMode;
  customStart: CustomMatchStart | null;

  // ── World Cup state ─────────────────────────────────────────────────────────
  wcState: WorldCupState | null;

  // ── Team actions ────────────────────────────────────────────────────────────
  setHomeTeam: (code: string) => void;
  setAwayTeam: (code: string) => void;
  setHomeFormation: (id: string) => void;
  setAwayFormation: (id: string) => void;
  swapPlayer: (side: 'home' | 'away', slotIndex: number, player: Player) => void;
  runSimulation: () => void;
  openModal: (side: 'home' | 'away', slotIndex: number) => void;
  closeModal: () => void;

  // ── Match actions ───────────────────────────────────────────────────────────
  setPendingMatchType: (t: MatchType) => void;
  startRealisticMatch: () => void;
  advancePhase: () => void;
  setMentality: (side: 'home' | 'away', m: TacticalMentality) => void;
  setPlayerStatus: (playerId: number, status: PlayerStatus) => void;
  takePenalty: () => void;
  resetMatch: () => void;

  // ── Live (real-time WC) match actions ────────────────────────────────────────
  startLiveMatch: () => void;
  liveTick: () => void;
  toggleLivePause: () => void;
  setLiveSpeed: (s: MatchSpeed) => void;
  makeLiveSub: (side: 'home' | 'away', slotIndex: number, inPlayerId: number) => void;
  skipLiveToEnd: () => void;

  // ── Navigation actions ──────────────────────────────────────────────────────
  setAppPage: (page: AppPage) => void;
  setMatchMode: (mode: MatchMode) => void;
  resetLineup: (side: 'home' | 'away') => void;
  setCustomStart: (cfg: CustomMatchStart) => void;
  startCustomMatch: () => void;

  // ── World Cup actions ───────────────────────────────────────────────────────
  startWorldCup: (userTeam: string) => void;
  simulateWCMatchday: () => void;
  playWCGroupMatch: (groupId: string, matchdayKey: WCMatchdayKey, matchIdx: number) => void;
  applyWCGroupResult: () => void;
  advanceWCMatchday: () => void;
  buildWCKnockout: () => void;
  simulateWCKnockoutRound: () => void;
  playWCKnockoutMatch: (roundKey: 'r32' | 'r16' | 'qf' | 'sf' | 'final', matchIdx: number) => void;
  applyWCKnockoutResult: () => void;
  advanceWCKnockoutRound: () => void;
  resetWorldCup: () => void;
}

const initialHome = 'ESP';
const initialAway = 'BRA';
const initHomeFormation = getFormation(DEFAULT_FORMATION_ID);
const initAwayFormation = getFormation(DEFAULT_FORMATION_ID);
const initHomeTeam = ALL_TEAMS[initialHome];
const initAwayTeam = ALL_TEAMS[initialAway];
const initHomeSquad = buildSquad(initHomeTeam, initHomeFormation);
const initAwaySquad = buildSquad(initAwayTeam, initAwayFormation);

export const useGameStore = create<GameState>((set, get) => ({
  // ── Initial state ───────────────────────────────────────────────────────────
  teams: ALL_TEAMS,
  teamCodes: Object.keys(ALL_TEAMS).sort(),
  homeCode: initialHome,
  awayCode: initialAway,
  homeFormationId: DEFAULT_FORMATION_ID,
  awayFormationId: DEFAULT_FORMATION_ID,
  homeSquad: initHomeSquad,
  awaySquad: initAwaySquad,
  homeAnalysis: analyzeSquad(initHomeSquad, initAwaySquad, initHomeFormation, initAwayFormation),
  awayAnalysis: analyzeSquad(initAwaySquad, initHomeSquad, initAwayFormation, initHomeFormation),
  simResult: null,
  activeModal: null,
  matchSimSnapshot: null,
  matchState: null,
  pendingMatchType: 'group',
  appPage: 'home',
  matchMode: 'quick',
  customStart: null,
  wcState: null,

  // ── Team actions ────────────────────────────────────────────────────────────
  setHomeTeam: (code) => {
    const team = ALL_TEAMS[code];
    if (!team) return;
    const formation = getFormation(get().homeFormationId);
    const squad = buildSquad(team, formation);
    const awayFormation = getFormation(get().awayFormationId);
    set({
      homeCode: code, homeSquad: squad,
      homeAnalysis: analyzeSquad(squad, get().awaySquad, formation, awayFormation),
      awayAnalysis: analyzeSquad(get().awaySquad, squad, awayFormation, formation),
      simResult: null,
    });
  },

  setAwayTeam: (code) => {
    const team = ALL_TEAMS[code];
    if (!team) return;
    const formation = getFormation(get().awayFormationId);
    const squad = buildSquad(team, formation);
    const homeFormation = getFormation(get().homeFormationId);
    set({
      awayCode: code, awaySquad: squad,
      awayAnalysis: analyzeSquad(squad, get().homeSquad, formation, homeFormation),
      homeAnalysis: analyzeSquad(get().homeSquad, squad, homeFormation, formation),
      simResult: null,
    });
  },

  setHomeFormation: (id) => {
    const team = ALL_TEAMS[get().homeCode];
    const formation = getFormation(id);
    const squad = buildSquad(team, formation);
    const awayFormation = getFormation(get().awayFormationId);
    set({
      homeFormationId: id, homeSquad: squad,
      homeAnalysis: analyzeSquad(squad, get().awaySquad, formation, awayFormation),
      awayAnalysis: analyzeSquad(get().awaySquad, squad, awayFormation, formation),
      simResult: null,
    });
  },

  setAwayFormation: (id) => {
    const team = ALL_TEAMS[get().awayCode];
    const formation = getFormation(id);
    const squad = buildSquad(team, formation);
    const homeFormation = getFormation(get().homeFormationId);
    set({
      awayFormationId: id, awaySquad: squad,
      awayAnalysis: analyzeSquad(squad, get().homeSquad, formation, homeFormation),
      homeAnalysis: analyzeSquad(get().homeSquad, squad, homeFormation, formation),
      simResult: null,
    });
  },

  swapPlayer: (side, slotIndex, player) => {
    const { homeSquad, awaySquad, homeFormationId, awayFormationId } = get();
    const homeFormation = getFormation(homeFormationId);
    const awayFormation = getFormation(awayFormationId);
    if (side === 'home') {
      const newSquad = homeSquad.map((s, i) => {
        if (i === slotIndex) return { ...s, player };
        if (s.player?.id === player.id) return { ...s, player: homeSquad[slotIndex].player };
        return s;
      });
      set({
        homeSquad: newSquad,
        homeAnalysis: analyzeSquad(newSquad, awaySquad, homeFormation, awayFormation),
        awayAnalysis: analyzeSquad(awaySquad, newSquad, awayFormation, homeFormation),
        simResult: null, activeModal: null,
      });
    } else {
      const newSquad = awaySquad.map((s, i) => {
        if (i === slotIndex) return { ...s, player };
        if (s.player?.id === player.id) return { ...s, player: awaySquad[slotIndex].player };
        return s;
      });
      set({
        awaySquad: newSquad,
        awayAnalysis: analyzeSquad(newSquad, homeSquad, awayFormation, homeFormation),
        homeAnalysis: analyzeSquad(homeSquad, newSquad, homeFormation, awayFormation),
        simResult: null, activeModal: null,
      });
    }
  },

  runSimulation: () => {
    const { homeSquad, awaySquad, homeFormationId, awayFormationId } = get();
    const result = simulate(homeSquad, awaySquad, getFormation(homeFormationId), getFormation(awayFormationId));
    set({ simResult: result });
  },

  openModal: (side, slotIndex) => set({ activeModal: { side, slotIndex } }),
  closeModal: () => set({ activeModal: null }),
  setPendingMatchType: (t) => set({ pendingMatchType: t }),

  // ── Match simulation actions ─────────────────────────────────────────────────

  startRealisticMatch: () => {
    const { homeSquad, awaySquad, pendingMatchType } = get();
    const { events, newStatuses } = simulatePhase(homeSquad, awaySquad, 'balanced', 'balanced', 0, 22, {});
    const homeScore = events.filter((e) => e.type === 'goal' && e.side === 'home').length;
    const awayScore = events.filter((e) => e.type === 'goal' && e.side === 'away').length;
    set({
      simResult: null,
      matchState: {
        type: pendingMatchType, phase: 'pause_22', minute: 22,
        homeScore, awayScore, events, playerStatuses: newStatuses,
        homeMentality: 'balanced', awayMentality: 'balanced',
        penalties: [], homePenaltyScore: 0, awayPenaltyScore: 0,
        penaltyRound: 1, penaltySideNext: 'home',
        homePenaltyOrder: buildPenaltyOrder(homeSquad),
        awayPenaltyOrder: buildPenaltyOrder(awaySquad),
        homePenaltyIndex: 0, awayPenaltyIndex: 0,
      },
    });
  },

  advancePhase: () => {
    const { matchState, homeSquad, awaySquad } = get();
    if (!matchState) return;

    const PHASE_MAP: Record<MatchPhase, { from: number; to: number; next: MatchPhase } | null> = {
      setup: null, pause_22: { from: 22, to: 45, next: 'pause_45' },
      pause_45: { from: 45, to: 67, next: 'pause_67' },
      pause_67: { from: 67, to: 90, next: 'full_time' },
      full_time: { from: 90, to: 105, next: 'et1_pause' },
      et1_pause: { from: 105, to: 120, next: 'et2_pause' },
      et2_pause: null, penalties: null, finished: null, live: null,
    };

    if (matchState.phase === 'et2_pause') {
      const nextPh: MatchPhase = matchState.homeScore === matchState.awayScore ? 'penalties' : 'finished';
      set({ matchState: { ...matchState, phase: nextPh } });
      return;
    }

    if (matchState.phase === 'full_time') {
      if (matchState.type === 'group' || matchState.homeScore !== matchState.awayScore) {
        set({ matchState: { ...matchState, phase: 'finished' } });
        return;
      }
    }

    const phaseInfo = PHASE_MAP[matchState.phase];
    if (!phaseInfo) return;

    const { events, newStatuses } = simulatePhase(
      homeSquad, awaySquad,
      matchState.homeMentality, matchState.awayMentality,
      phaseInfo.from, phaseInfo.to, matchState.playerStatuses,
    );

    const newHomeScore = matchState.homeScore + events.filter((e) => e.type === 'goal' && e.side === 'home').length;
    const newAwayScore = matchState.awayScore + events.filter((e) => e.type === 'goal' && e.side === 'away').length;

    let nextPhase: MatchPhase = phaseInfo.next;
    if (phaseInfo.next === 'full_time' && matchState.type === 'group') nextPhase = 'finished';

    set({
      matchState: {
        ...matchState, phase: nextPhase, minute: phaseInfo.to,
        homeScore: newHomeScore, awayScore: newAwayScore,
        events: [...matchState.events, ...events], playerStatuses: newStatuses,
      },
    });
  },

  setMentality: (side, m) => {
    const { matchState } = get();
    if (!matchState) return;
    set({
      matchState: {
        ...matchState,
        homeMentality: side === 'home' ? m : matchState.homeMentality,
        awayMentality: side === 'away' ? m : matchState.awayMentality,
      },
    });
  },

  setPlayerStatus: (playerId, status) => {
    const { matchState } = get();
    if (!matchState) return;
    set({ matchState: { ...matchState, playerStatuses: { ...matchState.playerStatuses, [playerId]: status } } });
  },

  takePenalty: () => {
    const { matchState, homeSquad, awaySquad } = get();
    if (!matchState || matchState.phase !== 'penalties') return;

    const { penaltySideNext, homePenaltyOrder, awayPenaltyOrder, homePenaltyIndex, awayPenaltyIndex, penaltyRound } = matchState;
    let shooterId: number;
    let squad: SquadSlot[];
    let rivalSquad: SquadSlot[];
    let newHomeIdx = homePenaltyIndex;
    let newAwayIdx = awayPenaltyIndex;

    if (penaltySideNext === 'home') {
      shooterId = homePenaltyOrder[homePenaltyIndex % homePenaltyOrder.length];
      squad = homeSquad; rivalSquad = awaySquad; newHomeIdx = homePenaltyIndex + 1;
    } else {
      shooterId = awayPenaltyOrder[awayPenaltyIndex % awayPenaltyOrder.length];
      squad = awaySquad; rivalSquad = homeSquad; newAwayIdx = awayPenaltyIndex + 1;
    }

    const allPlayers = squad.map((s) => s.player).filter(Boolean) as Player[];
    const shooterData = allPlayers.find((p) => p.id === shooterId);
    const scored = simulatePenaltyKick(shooterId, squad, rivalSquad);
    const attempt = { side: penaltySideNext, playerId: shooterId, playerName: shooterData?.name ?? 'Jugador', scored, round: penaltyRound };

    const newHomePScore = matchState.homePenaltyScore + (penaltySideNext === 'home' && scored ? 1 : 0);
    const newAwayPScore = matchState.awayPenaltyScore + (penaltySideNext === 'away' && scored ? 1 : 0);
    const newPenalties = [...matchState.penalties, attempt];
    const nextSide: 'home' | 'away' = penaltySideNext === 'home' ? 'away' : 'home';

    const homeKicks = newPenalties.filter((p) => p.side === 'home').length;
    const awayKicks = newPenalties.filter((p) => p.side === 'away').length;
    const isFinished = (() => {
      if (homeKicks < 5 || awayKicks < 5) return false;
      if (homeKicks !== awayKicks) return false;
      return newHomePScore !== newAwayPScore;
    })();

    const newRound = nextSide === 'home' ? penaltyRound + 1 : penaltyRound;
    set({
      matchState: {
        ...matchState, penalties: newPenalties,
        homePenaltyScore: newHomePScore, awayPenaltyScore: newAwayPScore,
        penaltySideNext: nextSide, homePenaltyIndex: newHomeIdx, awayPenaltyIndex: newAwayIdx,
        penaltyRound: newRound, phase: isFinished ? 'finished' : 'penalties',
      },
    });
  },

  resetMatch: () => set({ matchState: null, simResult: null }),

  // ── Live (real-time WC) match actions ────────────────────────────────────────

  startLiveMatch: () => {
    const { homeSquad, awaySquad, homeCode, awayCode, pendingMatchType, wcState } = get();
    const stats = wcState?.wcPlayerStats ?? {};
    const homeTac = getTeamTactics(homeCode);
    const awayTac = getTeamTactics(awayCode);
    const fatigue: Record<number, number> = {};
    for (const s of homeSquad) if (s.player) fatigue[s.player.id] = stats[s.player.id]?.fatigue ?? 0;
    for (const s of awaySquad) if (s.player) fatigue[s.player.id] = stats[s.player.id]?.fatigue ?? 0;

    set({
      simResult: null,
      matchState: {
        type: pendingMatchType, phase: 'live', minute: 0,
        homeScore: 0, awayScore: 0, events: [], playerStatuses: {},
        homeMentality: homeTac.mentality, awayMentality: awayTac.mentality,
        penalties: [], homePenaltyScore: 0, awayPenaltyScore: 0,
        penaltyRound: 1, penaltySideNext: 'home',
        homePenaltyOrder: buildPenaltyOrder(homeSquad),
        awayPenaltyOrder: buildPenaltyOrder(awaySquad),
        homePenaltyIndex: 0, awayPenaltyIndex: 0,
        live: true, running: true, speed: 3, inExtraTime: false,
        homeSubsUsed: 0, awaySubsUsed: 0,
        fatigue, injured: {}, fatigueWarned: {},
      },
    });
  },

  liveTick: () => {
    const { matchState, homeSquad, awaySquad, homeCode, awayCode, wcState, teams } = get();
    if (!matchState || !matchState.live || !matchState.running || matchState.phase !== 'live') return;

    const minute = matchState.minute + 1;
    const res = stepMinute(minute, matchState, homeSquad, awaySquad, homeCode, awayCode);
    let s: MatchState = {
      ...matchState, minute,
      homeScore: matchState.homeScore + res.homeGoals,
      awayScore: matchState.awayScore + res.awayGoals,
      events: [...matchState.events, ...res.events],
      playerStatuses: res.statuses, fatigue: res.fatigue,
      injured: res.injured, fatigueWarned: res.fatigueWarned,
    };

    const userTeam = wcState?.userTeam;
    const rivalSide: 'home' | 'away' = homeCode === userTeam ? 'away' : 'home';

    const newMent = decideRivalMentality(s, rivalSide, minute);
    if (newMent) s = rivalSide === 'home' ? { ...s, homeMentality: newMent } : { ...s, awayMentality: newMent };

    let newHome = homeSquad, newAway = awaySquad;
    const rivalTeam = teams[rivalSide === 'home' ? homeCode : awayCode];
    if (rivalTeam) {
      const rivalSquad = rivalSide === 'home' ? homeSquad : awaySquad;
      const r = applyRivalSub(rivalSide, rivalSquad, rivalTeam, s);
      s = r.state;
      if (rivalSide === 'home') newHome = r.squad; else newAway = r.squad;
    }

    s = checkLiveEnd(s);
    set({ matchState: s, homeSquad: newHome, awaySquad: newAway });
  },

  toggleLivePause: () => {
    const { matchState } = get();
    if (!matchState?.live || matchState.phase !== 'live') return;
    set({ matchState: { ...matchState, running: !matchState.running } });
  },

  setLiveSpeed: (sp) => {
    const { matchState } = get();
    if (!matchState?.live) return;
    set({ matchState: { ...matchState, speed: sp } });
  },

  makeLiveSub: (side, slotIndex, inPlayerId) => {
    const { matchState, homeSquad, awaySquad, homeCode, awayCode, teams, wcState } = get();
    if (!matchState?.live || matchState.phase !== 'live') return;
    if (matchState.running) return;                       // only while paused
    const userTeam = wcState?.userTeam;
    const userSide: 'home' | 'away' = homeCode === userTeam ? 'home' : 'away';
    if (side !== userSide) return;                        // only your own team
    const subsUsed = side === 'home' ? (matchState.homeSubsUsed ?? 0) : (matchState.awaySubsUsed ?? 0);
    if (subsUsed >= 4) return;

    const squad = side === 'home' ? homeSquad : awaySquad;
    const out = squad[slotIndex]?.player;
    if (!out) return;
    const team = teams[side === 'home' ? homeCode : awayCode];
    const inPlayer = team?.players.find((p) => p.id === inPlayerId);
    if (!inPlayer) return;

    const newSquad = squad.map((sl, i) => (i === slotIndex ? { ...sl, player: inPlayer } : sl));
    const ev: MatchEvent = {
      minute: matchState.minute, type: 'substitution', side,
      playerId: out.id, playerName: out.name, detail: inPlayer.name, secondName: inPlayer.name,
    };
    const newMatchState: MatchState = {
      ...matchState,
      events: [...matchState.events, ev],
      homeSubsUsed: side === 'home' ? subsUsed + 1 : matchState.homeSubsUsed,
      awaySubsUsed: side === 'away' ? subsUsed + 1 : matchState.awaySubsUsed,
    };
    if (side === 'home') set({ homeSquad: newSquad, matchState: newMatchState });
    else set({ awaySquad: newSquad, matchState: newMatchState });
  },

  skipLiveToEnd: () => {
    const { matchState, homeSquad, awaySquad, homeCode, awayCode, wcState, teams } = get();
    if (!matchState?.live) return;
    let s: MatchState = { ...matchState, running: false };
    let nh = homeSquad, na = awaySquad;
    const userTeam = wcState?.userTeam;
    const rivalSide: 'home' | 'away' = homeCode === userTeam ? 'away' : 'home';
    const rivalTeam = teams[rivalSide === 'home' ? homeCode : awayCode];

    let guard = 0;
    while (s.phase === 'live' && guard < 240) {
      guard++;
      const minute = s.minute + 1;
      const res = stepMinute(minute, s, nh, na, homeCode, awayCode);
      s = {
        ...s, minute,
        homeScore: s.homeScore + res.homeGoals, awayScore: s.awayScore + res.awayGoals,
        events: [...s.events, ...res.events],
        playerStatuses: res.statuses, fatigue: res.fatigue,
        injured: res.injured, fatigueWarned: res.fatigueWarned,
      };
      const nm = decideRivalMentality(s, rivalSide, minute);
      if (nm) s = rivalSide === 'home' ? { ...s, homeMentality: nm } : { ...s, awayMentality: nm };
      if (rivalTeam) {
        const rq = rivalSide === 'home' ? nh : na;
        const r = applyRivalSub(rivalSide, rq, rivalTeam, s);
        s = r.state;
        if (rivalSide === 'home') nh = r.squad; else na = r.squad;
      }
      s = checkLiveEnd(s);
    }

    // auto-resolve a shootout when skipping a tied knockout
    if (s.phase === 'penalties') {
      const ho = buildPenaltyOrder(nh), ao = buildPenaltyOrder(na);
      const pens = [...s.penalties];
      let hp = 0, ap = 0, round = 1;
      const kick = (side: 'home' | 'away', idx: number, ords: number[], sq: SquadSlot[], rival: SquadSlot[]) => {
        const id = ords[idx % ords.length];
        const scored = simulatePenaltyKick(id, sq, rival);
        const pl = sq.map((x) => x.player).find((p) => p?.id === id);
        pens.push({ side, playerId: id, playerName: pl?.name ?? 'Jugador', scored, round });
        return scored;
      };
      for (let i = 0; i < 5; i++) { if (kick('home', i, ho, nh, na)) hp++; if (kick('away', i, ao, na, nh)) ap++; round++; }
      let i = 5;
      while (hp === ap && i < 20) { if (kick('home', i, ho, nh, na)) hp++; if (kick('away', i, ao, na, nh)) ap++; i++; round++; }
      s = { ...s, penalties: pens, homePenaltyScore: hp, awayPenaltyScore: ap, phase: 'finished' };
    }

    set({ matchState: s, homeSquad: nh, awaySquad: na });
  },

  // ── Navigation actions ───────────────────────────────────────────────────────

  setAppPage: (page) => {
    const state = get();
    // If leaving match page while a WC match is pending, restore standalone sim snapshot
    if (state.appPage === 'match' && page !== 'match' && state.wcState?.pendingMatch) {
      const snap = state.matchSimSnapshot;
      const restore = snap ?? {
        homeCode: initialHome, awayCode: initialAway,
        homeFormationId: DEFAULT_FORMATION_ID, awayFormationId: DEFAULT_FORMATION_ID,
        homeSquad: initHomeSquad, awaySquad: initAwaySquad,
        homeAnalysis: analyzeSquad(initHomeSquad, initAwaySquad, initHomeFormation, initAwayFormation),
        awayAnalysis: analyzeSquad(initAwaySquad, initHomeSquad, initAwayFormation, initHomeFormation),
        simResult: null,
      };
      set({
        appPage: page,
        wcState: { ...state.wcState!, pendingMatch: null },
        matchState: null, matchSimSnapshot: null,
        homeCode: restore.homeCode, awayCode: restore.awayCode,
        homeFormationId: restore.homeFormationId, awayFormationId: restore.awayFormationId,
        homeSquad: restore.homeSquad, awaySquad: restore.awaySquad,
        homeAnalysis: restore.homeAnalysis, awayAnalysis: restore.awayAnalysis,
        simResult: restore.simResult,
      });
      return;
    }
    set({ appPage: page });
  },
  setMatchMode: (mode) => set({ matchMode: mode }),
  setCustomStart: (cfg) => set({ customStart: cfg }),

  resetLineup: (side) => {
    const { homeCode, awayCode, homeFormationId, awayFormationId } = get();
    const homeFormation = getFormation(homeFormationId);
    const awayFormation = getFormation(awayFormationId);
    if (side === 'home') {
      const squad = buildSquad(ALL_TEAMS[homeCode], homeFormation);
      set({
        homeSquad: squad,
        homeAnalysis: analyzeSquad(squad, get().awaySquad, homeFormation, awayFormation),
        awayAnalysis: analyzeSquad(get().awaySquad, squad, awayFormation, homeFormation),
        simResult: null,
      });
    } else {
      const squad = buildSquad(ALL_TEAMS[awayCode], awayFormation);
      set({
        awaySquad: squad,
        awayAnalysis: analyzeSquad(squad, get().homeSquad, awayFormation, homeFormation),
        homeAnalysis: analyzeSquad(get().homeSquad, squad, homeFormation, awayFormation),
        simResult: null,
      });
    }
  },

  startCustomMatch: () => {
    const { homeSquad, awaySquad, customStart, pendingMatchType } = get();
    if (!customStart) return;
    const { minute, homeScore, awayScore } = customStart;

    let firstTo: number;
    let firstPhase: MatchPhase;
    if (minute < 22) { firstTo = 22; firstPhase = 'pause_22'; }
    else if (minute < 45) { firstTo = 45; firstPhase = 'pause_45'; }
    else if (minute < 67) { firstTo = 67; firstPhase = 'pause_67'; }
    else { firstTo = 90; firstPhase = pendingMatchType === 'group' ? 'finished' : 'full_time'; }

    const { events, newStatuses } = simulatePhase(
      homeSquad, awaySquad, 'balanced', 'balanced', minute, firstTo, {}
    );
    const newHome = homeScore + events.filter((e) => e.type === 'goal' && e.side === 'home').length;
    const newAway = awayScore + events.filter((e) => e.type === 'goal' && e.side === 'away').length;

    set({
      simResult: null,
      matchState: {
        type: pendingMatchType, phase: firstPhase, minute: firstTo,
        homeScore: newHome, awayScore: newAway, events, playerStatuses: newStatuses,
        homeMentality: 'balanced', awayMentality: 'balanced',
        penalties: [], homePenaltyScore: 0, awayPenaltyScore: 0,
        penaltyRound: 1, penaltySideNext: 'home',
        homePenaltyOrder: buildPenaltyOrder(homeSquad),
        awayPenaltyOrder: buildPenaltyOrder(awaySquad),
        homePenaltyIndex: 0, awayPenaltyIndex: 0,
      },
    });
  },

  // ── World Cup actions ────────────────────────────────────────────────────────

  startWorldCup: (userTeam) => {
    set({ wcState: initWorldCup(userTeam), appPage: 'worldcup' });
  },

  simulateWCMatchday: () => {
    const { wcState, teams } = get();
    if (!wcState || wcState.phase !== 'groups') return;
    const mdKey = MD_KEYS[wcState.currentMatchday];
    const { userTeam } = wcState;

    const newGroups = { ...wcState.groups };
    let newStats = wcState.wcPlayerStats ?? {};
    for (const gId of Object.keys(newGroups)) {
      const group = { ...newGroups[gId] };
      const matches = [...group[mdKey]];
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        if (m.homeGoals !== null) continue;
        if (m.home === userTeam || m.away === userTeam) continue;
        const { homeGoals, awayGoals } = simulateGroupMatch(m.home, m.away, teams);
        matches[i] = { ...m, homeGoals, awayGoals };
        newStats = accrueAutoMatch(newStats, m.home, m.away, teams);
      }
      group[mdKey] = matches;
      newGroups[gId] = group;
    }
    set({ wcState: { ...wcState, groups: newGroups, wcPlayerStats: newStats } });
  },

  playWCGroupMatch: (groupId, matchdayKey, matchIdx) => {
    const { wcState, teams } = get();
    if (!wcState) return;
    const group = wcState.groups[groupId];
    const match = group[matchdayKey][matchIdx];
    const homeTeam = teams[match.home];
    const awayTeam = teams[match.away];
    if (!homeTeam || !awayTeam) return;

    // Save standalone match simulator state before WC overwrites it
    const { homeCode, awayCode, homeFormationId, awayFormationId, homeSquad: prevHome, awaySquad: prevAway, homeAnalysis: prevHA, awayAnalysis: prevAA, simResult: prevSim } = get();
    const snapshot: MatchSimSnapshot = { homeCode, awayCode, homeFormationId, awayFormationId, homeSquad: prevHome, awaySquad: prevAway, homeAnalysis: prevHA, awayAnalysis: prevAA, simResult: prevSim };

    const homeFormation = getFormation(DEFAULT_FORMATION_ID);
    const awayFormation = getFormation(DEFAULT_FORMATION_ID);
    const stats = wcState.wcPlayerStats ?? {};
    const homeSquad = buildAvailableSquad(homeTeam, homeFormation, stats);
    const awaySquad = buildAvailableSquad(awayTeam, awayFormation, stats);

    const pending: WCPendingMatch = {
      homeCode: match.home, awayCode: match.away, isKnockout: false,
      groupId, matchdayKey, matchIdx,
    };

    set({
      matchSimSnapshot: snapshot,
      homeCode: match.home, awayCode: match.away,
      homeFormationId: DEFAULT_FORMATION_ID, awayFormationId: DEFAULT_FORMATION_ID,
      homeSquad, awaySquad,
      homeAnalysis: analyzeSquad(homeSquad, awaySquad, homeFormation, awayFormation),
      awayAnalysis: analyzeSquad(awaySquad, homeSquad, awayFormation, homeFormation),
      simResult: null, matchState: null,
      wcState: { ...wcState, pendingMatch: pending },
      appPage: 'match',
      matchMode: 'realistic',
      pendingMatchType: 'group',
    });
  },

  applyWCGroupResult: () => {
    const { wcState, matchState, matchSimSnapshot, homeSquad, awaySquad, homeCode, awayCode, teams } = get();
    if (!wcState?.pendingMatch || !matchState || wcState.pendingMatch.isKnockout) return;
    const { groupId, matchdayKey, matchIdx } = wcState.pendingMatch;
    if (!groupId || !matchdayKey || matchIdx === undefined) return;

    const homeGoals = matchState.homeScore;
    const awayGoals = matchState.awayScore;

    const newGroups = { ...wcState.groups };
    const group = { ...newGroups[groupId] };
    const matches = [...group[matchdayKey]];
    matches[matchIdx] = { ...matches[matchIdx], homeGoals, awayGoals };
    group[matchdayKey] = matches;
    newGroups[groupId] = group;

    // Persist cards / fatigue / minutes for both squads of the played match
    const newStats = accruePlayedMatch(
      wcState.wcPlayerStats ?? {}, homeSquad, awaySquad, homeCode, awayCode, matchState, teams,
    );

    // Restore standalone match simulator state
    const restore = matchSimSnapshot ?? {
      homeCode: initialHome, awayCode: initialAway,
      homeFormationId: DEFAULT_FORMATION_ID, awayFormationId: DEFAULT_FORMATION_ID,
      homeSquad: initHomeSquad, awaySquad: initAwaySquad,
      homeAnalysis: analyzeSquad(initHomeSquad, initAwaySquad, initHomeFormation, initAwayFormation),
      awayAnalysis: analyzeSquad(initAwaySquad, initHomeSquad, initAwayFormation, initHomeFormation),
      simResult: null,
    };

    set({
      wcState: { ...wcState, groups: newGroups, pendingMatch: null, wcPlayerStats: newStats },
      matchState: null, appPage: 'worldcup', matchSimSnapshot: null,
      homeCode: restore.homeCode, awayCode: restore.awayCode,
      homeFormationId: restore.homeFormationId, awayFormationId: restore.awayFormationId,
      homeSquad: restore.homeSquad, awaySquad: restore.awaySquad,
      homeAnalysis: restore.homeAnalysis, awayAnalysis: restore.awayAnalysis,
      simResult: restore.simResult,
    });
  },

  advanceWCMatchday: () => {
    const { wcState, teams } = get();
    if (!wcState || wcState.phase !== 'groups') return;
    const next = wcState.currentMatchday + 1;
    // players recover some fatigue between matchdays
    const recovered = applyRecovery(wcState.wcPlayerStats ?? {}, teams);
    if (next >= 3) {
      // Group stage done → check if we should build knockout
      set({ wcState: { ...wcState, currentMatchday: 3, wcPlayerStats: recovered } });
    } else {
      set({ wcState: { ...wcState, currentMatchday: next, wcPlayerStats: recovered } });
    }
  },

  buildWCKnockout: () => {
    const { wcState, teams } = get();
    if (!wcState) return;
    const { winners, runnersUp, best3rd } = getQualified(wcState.groups);
    const r32 = buildR32(winners, runnersUp, best3rd);
    const recovered = applyRecovery(wcState.wcPlayerStats ?? {}, teams);
    set({ wcState: { ...wcState, phase: 'knockout', r32, r16: [], qf: [], sf: [], final: [], wcPlayerStats: recovered } });
  },

  simulateWCKnockoutRound: () => {
    const { wcState, teams } = get();
    if (!wcState || wcState.phase !== 'knockout') return;

    const currentRound = (['r32', 'r16', 'qf', 'sf', 'final'] as const).find(
      (r) => wcState[r].length > 0 && wcState[r].some((m) => m.winner === null)
    );
    if (!currentRound) return;

    const { userTeam } = wcState;
    let newStats = wcState.wcPlayerStats ?? {};
    const newMatches = wcState[currentRound].map((m) => {
      if (m.winner !== null) return m;
      if (!m.home || !m.away) return m;
      if (m.home === userTeam || m.away === userTeam) return m; // user plays manually
      const { homeGoals, awayGoals, homePenalties, awayPenalties } = simulateKnockoutMatch(m.home, m.away, teams);
      newStats = accrueAutoMatch(newStats, m.home, m.away, teams);
      let winner: string;
      if (homePenalties !== null && awayPenalties !== null) {
        winner = homePenalties > awayPenalties ? m.home : m.away;
      } else {
        winner = homeGoals >= awayGoals ? m.home : m.away;
      }
      return { ...m, homeGoals, awayGoals, homePenalties, awayPenalties, winner };
    });

    // If all decided, build next round
    const allDone = newMatches.every((m) => m.winner !== null);
    let newState = { ...wcState, [currentRound]: newMatches, wcPlayerStats: newStats };

    if (allDone && currentRound !== 'final') {
      const nextRoundMap: Record<string, string> = { r32: 'r16', r16: 'qf', qf: 'sf', sf: 'final' };
      const nextKey = nextRoundMap[currentRound] as 'r16' | 'qf' | 'sf' | 'final';
      const recovered = applyRecovery(newStats, teams);
      const nextMatches = buildNextRound(newMatches, nextKey);
      newState = { ...newState, [nextKey]: nextMatches, wcPlayerStats: recovered };
    } else if (allDone && currentRound === 'final') {
      const champion = newMatches[0].winner;
      newState = { ...newState, champion, phase: 'finished' };
    }

    set({ wcState: newState });
  },

  playWCKnockoutMatch: (roundKey, matchIdx) => {
    const { wcState, teams } = get();
    if (!wcState) return;
    const match = wcState[roundKey][matchIdx];
    if (!match.home || !match.away) return;

    const homeTeam = teams[match.home];
    const awayTeam = teams[match.away];
    if (!homeTeam || !awayTeam) return;

    // Save standalone match simulator state before WC overwrites it
    const { homeCode, awayCode, homeFormationId, awayFormationId, homeSquad: prevHome, awaySquad: prevAway, homeAnalysis: prevHA, awayAnalysis: prevAA, simResult: prevSim } = get();
    const snapshot: MatchSimSnapshot = { homeCode, awayCode, homeFormationId, awayFormationId, homeSquad: prevHome, awaySquad: prevAway, homeAnalysis: prevHA, awayAnalysis: prevAA, simResult: prevSim };

    const homeFormation = getFormation(DEFAULT_FORMATION_ID);
    const awayFormation = getFormation(DEFAULT_FORMATION_ID);
    const stats = wcState.wcPlayerStats ?? {};
    const homeSquad = buildAvailableSquad(homeTeam, homeFormation, stats);
    const awaySquad = buildAvailableSquad(awayTeam, awayFormation, stats);

    const pending: WCPendingMatch = { homeCode: match.home, awayCode: match.away, isKnockout: true, roundKey, koMatchIdx: matchIdx };

    set({
      matchSimSnapshot: snapshot,
      homeCode: match.home, awayCode: match.away,
      homeFormationId: DEFAULT_FORMATION_ID, awayFormationId: DEFAULT_FORMATION_ID,
      homeSquad, awaySquad,
      homeAnalysis: analyzeSquad(homeSquad, awaySquad, homeFormation, awayFormation),
      awayAnalysis: analyzeSquad(awaySquad, homeSquad, awayFormation, homeFormation),
      simResult: null, matchState: null,
      wcState: { ...wcState, pendingMatch: pending },
      appPage: 'match',
      matchMode: 'realistic',
      pendingMatchType: 'knockout',
    });
  },

  applyWCKnockoutResult: () => {
    const { wcState, matchState, homeSquad, awaySquad, homeCode, awayCode, teams } = get();
    if (!wcState?.pendingMatch || !matchState || !wcState.pendingMatch.isKnockout) return;
    const { roundKey, koMatchIdx } = wcState.pendingMatch;
    if (!roundKey || koMatchIdx === undefined) return;

    const homeGoals = matchState.homeScore;
    const awayGoals = matchState.awayScore;
    const hasPens = matchState.penalties.length > 0;
    const homePenalties = hasPens ? matchState.homePenaltyScore : null;
    const awayPenalties = hasPens ? matchState.awayPenaltyScore : null;

    let winner: string;
    const match = wcState[roundKey][koMatchIdx];
    if (hasPens && homePenalties !== null && awayPenalties !== null) {
      winner = homePenalties > awayPenalties ? match.home! : match.away!;
    } else {
      winner = homeGoals >= awayGoals ? match.home! : match.away!;
    }

    const newMatches = wcState[roundKey].map((m, i) =>
      i === koMatchIdx ? { ...m, homeGoals, awayGoals, homePenalties, awayPenalties, winner } : m
    );

    // Persist cards / fatigue / minutes from the played knockout match
    const playedStats = accruePlayedMatch(
      wcState.wcPlayerStats ?? {}, homeSquad, awaySquad, homeCode, awayCode, matchState, teams,
    );

    // Build next round if all decided
    const allDone = newMatches.every((m) => m.winner !== null);
    let newState = { ...wcState, [roundKey]: newMatches, pendingMatch: null, wcPlayerStats: playedStats };

    if (allDone && roundKey !== 'final') {
      const nextRoundMap: Record<string, string> = { r32: 'r16', r16: 'qf', qf: 'sf', sf: 'final' };
      const nextKey = nextRoundMap[roundKey] as 'r16' | 'qf' | 'sf' | 'final';
      const nextMatches = buildNextRound(newMatches, nextKey);
      newState = { ...newState, [nextKey]: nextMatches, wcPlayerStats: applyRecovery(playedStats, teams) };
    } else if (allDone && roundKey === 'final') {
      newState = { ...newState, champion: winner, phase: 'finished' };
    }

    // Restore standalone match simulator state
    const snap = get().matchSimSnapshot;
    const restore = snap ?? {
      homeCode: initialHome, awayCode: initialAway,
      homeFormationId: DEFAULT_FORMATION_ID, awayFormationId: DEFAULT_FORMATION_ID,
      homeSquad: initHomeSquad, awaySquad: initAwaySquad,
      homeAnalysis: analyzeSquad(initHomeSquad, initAwaySquad, initHomeFormation, initAwayFormation),
      awayAnalysis: analyzeSquad(initAwaySquad, initHomeSquad, initAwayFormation, initHomeFormation),
      simResult: null,
    };

    set({
      wcState: newState, matchState: null, appPage: 'worldcup', matchSimSnapshot: null,
      homeCode: restore.homeCode, awayCode: restore.awayCode,
      homeFormationId: restore.homeFormationId, awayFormationId: restore.awayFormationId,
      homeSquad: restore.homeSquad, awaySquad: restore.awaySquad,
      homeAnalysis: restore.homeAnalysis, awayAnalysis: restore.awayAnalysis,
      simResult: restore.simResult,
    });
  },

  advanceWCKnockoutRound: () => {
    const { wcState } = get();
    if (!wcState) return;
    const rounds = ['r32', 'r16', 'qf', 'sf', 'final'] as const;
    for (const r of rounds) {
      if (wcState[r].length > 0 && wcState[r].some((m) => m.winner === null)) {
        return; // still matches to play in this round
      }
      if (wcState[r].length > 0 && wcState[r].every((m) => m.winner !== null)) {
        if (r === 'final') {
          set({ wcState: { ...wcState, champion: wcState[r][0].winner, phase: 'finished' } });
          return;
        }
        const nextKey = (['r16', 'qf', 'sf', 'final'] as const)[[1,2,3,4][rounds.indexOf(r)]];
        if (nextKey && wcState[nextKey].length === 0) {
          const nextMatches = buildNextRound(wcState[r], nextKey);
          set({ wcState: { ...wcState, [nextKey]: nextMatches } });
        }
        return;
      }
    }
  },

  resetWorldCup: () => set({ wcState: null, appPage: 'home' }),
}));

export { ALL_TEAMS, buildSquad, getFormation };
