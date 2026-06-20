import { create } from 'zustand';
import type { Player, TeamData, Formation, SquadSlot, SimulationResult, TacticalAnalysis } from '../types';
import { FORMATIONS, DEFAULT_FORMATION_ID } from '../data/formations';
import playersData from '../data/players.json';
import { analyzeSquad } from '../services/tacticalEngine';
import { simulate } from '../services/simulationEngine';

const ALL_TEAMS: Record<string, TeamData> = playersData as Record<string, TeamData>;

function getFormation(id: string): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];
}

function buildSquad(team: TeamData, formation: Formation): SquadSlot[] {
  const byPos: Record<string, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of team.players) byPos[p.position]?.push(p);
  // Sort by overall desc
  for (const pos of Object.keys(byPos)) byPos[pos].sort((a, b) => b.overall - a.overall);

  const used = new Set<number>();
  return formation.slots.map((slot) => {
    const pool = byPos[slot.role] ?? [];
    const player = pool.find((p) => !used.has(p.id)) ?? null;
    if (player) used.add(player.id);
    return { formation: slot, player };
  });
}

interface GameState {
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

  setHomeTeam: (code: string) => void;
  setAwayTeam: (code: string) => void;
  setHomeFormation: (id: string) => void;
  setAwayFormation: (id: string) => void;
  swapPlayer: (side: 'home' | 'away', slotIndex: number, player: Player) => void;
  runSimulation: () => void;
  openModal: (side: 'home' | 'away', slotIndex: number) => void;
  closeModal: () => void;
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

  setHomeTeam: (code) => {
    const team = ALL_TEAMS[code];
    if (!team) return;
    const formation = getFormation(get().homeFormationId);
    const squad = buildSquad(team, formation);
    const awayFormation = getFormation(get().awayFormationId);
    set({
      homeCode: code,
      homeSquad: squad,
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
      awayCode: code,
      awaySquad: squad,
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
      homeFormationId: id,
      homeSquad: squad,
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
      awayFormationId: id,
      awaySquad: squad,
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
        simResult: null,
        activeModal: null,
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
        simResult: null,
        activeModal: null,
      });
    }
  },

  runSimulation: () => {
    const { homeSquad, awaySquad, homeFormationId, awayFormationId } = get();
    const homeFormation = getFormation(homeFormationId);
    const awayFormation = getFormation(awayFormationId);
    const result = simulate(homeSquad, awaySquad, homeFormation, awayFormation);
    set({ simResult: result });
  },

  openModal: (side, slotIndex) => set({ activeModal: { side, slotIndex } }),
  closeModal: () => set({ activeModal: null }),
}));

export { ALL_TEAMS, buildSquad, getFormation };
