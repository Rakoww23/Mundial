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
  label: string;
  x: number;
  y: number;
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

// ── Realistic match simulation ────────────────────────────────────────────────

export type MatchType = 'group' | 'knockout';

export type TacticalMentality = 'defensive' | 'balanced' | 'offensive' | 'ultraoffensive';

export type PlayerStatus = 'available' | 'booked' | 'suspended';

export type MatchPhase =
  | 'setup'
  | 'pause_22'
  | 'pause_45'
  | 'pause_67'
  | 'full_time'
  | 'et1_pause'
  | 'et2_pause'
  | 'penalties'
  | 'finished';

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card';
  side: 'home' | 'away';
  playerId: number;
  playerName: string;
}

export interface PenaltyAttempt {
  side: 'home' | 'away';
  playerId: number;
  playerName: string;
  scored: boolean;
  round: number;
}

export interface MatchState {
  type: MatchType;
  phase: MatchPhase;
  minute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  playerStatuses: Record<number, PlayerStatus>;
  homeMentality: TacticalMentality;
  awayMentality: TacticalMentality;
  penalties: PenaltyAttempt[];
  homePenaltyScore: number;
  awayPenaltyScore: number;
  penaltyRound: number;
  penaltySideNext: 'home' | 'away';
  homePenaltyOrder: number[];
  awayPenaltyOrder: number[];
  homePenaltyIndex: number;
  awayPenaltyIndex: number;
}

// ── App navigation ────────────────────────────────────────────────────────────

export type AppPage = 'home' | 'match' | 'worldcup' | 'penalty';
export type MatchMode = 'realistic' | 'quick' | 'custom' | 'penalty';

export interface CustomMatchStart {
  minute: number;
  homeScore: number;
  awayScore: number;
}

// ── World Cup ─────────────────────────────────────────────────────────────────

export interface WCGroupMatch {
  id: string;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface WCGroup {
  id: string;
  teams: string[];
  md1: WCGroupMatch[];
  md2: WCGroupMatch[];
  md3: WCGroupMatch[];
}

export interface WCGroupStanding {
  code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export interface WCKnockoutMatch {
  id: string;
  home: string | null;
  away: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  winner: string | null;
}

export interface WCPendingMatch {
  homeCode: string;
  awayCode: string;
  isKnockout: boolean;
  groupId?: string;
  matchdayKey?: 'md1' | 'md2' | 'md3';
  matchIdx?: number;
  roundKey?: 'r32' | 'r16' | 'qf' | 'sf' | 'final';
  koMatchIdx?: number;
}

export interface WorldCupState {
  userTeam: string;
  phase: 'setup' | 'groups' | 'knockout' | 'finished';
  currentMatchday: number;
  groups: Record<string, WCGroup>;
  r32: WCKnockoutMatch[];
  r16: WCKnockoutMatch[];
  qf: WCKnockoutMatch[];
  sf: WCKnockoutMatch[];
  final: WCKnockoutMatch[];
  champion: string | null;
  pendingMatch: WCPendingMatch | null;
}
