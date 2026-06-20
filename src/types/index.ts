export type PositionCode = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Player {
  id: number;
  name: string;
  age: number;
  club: string;
  height: number;
  weight: number;
  caps: number;
  goals: number;
  overall: number;
  position: PositionCode;
  team: string;
}

export interface TeamData {
  code: string;
  name: string;
  flag: string;
  players: Player[];
}

export interface FormationSlot {
  role: PositionCode;
  label: string; // e.g. "LB", "CB", "CM", "ST"
  x: number; // 0–100 percentage on pitch
  y: number; // 0–100 percentage on pitch (0=own goal, 100=opponent)
}

export interface Formation {
  id: string;
  name: string;
  slots: FormationSlot[];
}

export interface SquadSlot {
  formation: FormationSlot;
  player: Player | null;
}

export interface TacticalAnalysis {
  avgOverall: number;
  avgDefOverall: number;
  avgMidOverall: number;
  avgFwdOverall: number;
  gkOverall: number;
  avgHeight: number;
  avgDefHeight: number;
  avgFwdHeight: number;
  physicalScore: number;
  aerialScore: number;
  offensiveScore: number;
  defensiveScore: number;
  midScore: number;
  possessionScore: number;
  advantages: string[];
  disadvantages: string[];
}

export interface SimulationResult {
  homeWin: number;
  draw: number;
  awayWin: number;
  predictedScore: { home: number; away: number };
  scorelines: Array<{ home: number; away: number; probability: number }>;
  homeXG: number;
  awayXG: number;
}
