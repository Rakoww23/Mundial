import type { TacticalMentality } from '../types';

export interface TeamTacticProfile {
  mentality: TacticalMentality;
  atkMod: number;  // multiplier on attacking xG
  defMod: number;  // multiplier on defensive solidity (lower = weaker def)
}

const B = (a: number, d: number): TeamTacticProfile => ({ mentality: 'balanced',      atkMod: a, defMod: d });
const O = (a: number, d: number): TeamTacticProfile => ({ mentality: 'offensive',     atkMod: a, defMod: d });
const D = (a: number, d: number): TeamTacticProfile => ({ mentality: 'defensive',     atkMod: a, defMod: d });
const U = (a: number, d: number): TeamTacticProfile => ({ mentality: 'ultraoffensive', atkMod: a, defMod: d });

export const TEAM_TACTICS: Record<string, TeamTacticProfile> = {
  // ── Europe ─────────────────────────────────────────────────────────────────
  ESP: O(1.14, 0.94),   // posesión + presión alta
  FRA: B(1.10, 1.06),   // equilibrio de élite
  GER: B(1.06, 1.05),   // organización alemana
  POR: O(1.15, 0.91),   // ataque total
  ENG: O(1.10, 0.96),   // directo + físico
  NED: O(1.11, 0.95),   // fútbol total
  BEL: B(1.06, 1.02),   // generación dorada tardía
  NOR: O(1.08, 0.94),   // Haaland-style directo
  SUI: D(0.96, 1.10),   // solidez defensiva
  AUT: B(0.97, 1.05),   // organizado
  TUR: B(0.99, 1.01),   // equilibrado moderno
  CRO: B(1.03, 1.05),   // mediocampo técnico
  SCO: D(0.91, 1.07),   // garra + bloque bajo
  CZE: D(0.90, 1.10),   // contraataque
  BIH: D(0.87, 1.08),   // defensivo
  SWE: B(0.99, 1.06),   // organización escandinava

  // ── América ────────────────────────────────────────────────────────────────
  BRA: U(1.20, 0.90),   // jogo bonito
  ARG: O(1.13, 1.01),   // stars + organización
  URU: D(0.97, 1.14),   // garra charrúa
  COL: B(1.05, 1.00),   // técnica + intensidad
  MEX: B(0.96, 1.02),   // toque + presión
  USA: B(0.95, 1.02),   // físico + organizado
  CAN: B(0.94, 1.03),   // intensidad + presión
  ECU: D(0.90, 1.09),   // solidez andina
  PAR: D(0.87, 1.11),   // defensivo
  HAI: B(0.82, 0.97),   // irregular
  PAN: D(0.83, 1.07),   // bloque bajo
  CUW: D(0.80, 1.05),   // defensivo

  // ── África ─────────────────────────────────────────────────────────────────
  MAR: D(0.88, 1.24),   // ultra-sólido
  SEN: B(0.98, 1.04),   // físico + técnica
  CIV: B(0.96, 1.02),   // potencia africana
  GHA: B(0.94, 1.01),   // técnica + velocidad
  ALG: B(0.92, 1.04),   // presión + organización
  TUN: D(0.86, 1.11),   // bloque defensivo
  EGY: D(0.87, 1.09),   // Salah-dependent
  RSA: B(0.84, 1.01),   // equilibrado
  COD: B(0.86, 1.01),   // potencial sin pulir
  CPV: D(0.80, 1.07),   // sorpresa defensiva

  // ── Asia ───────────────────────────────────────────────────────────────────
  JPN: B(0.94, 1.11),   // presión organizada + movilidad
  KOR: B(0.95, 1.07),   // intensidad + disciplina
  IRN: D(0.86, 1.15),   // muy defensivo + contraataque
  AUS: B(0.92, 1.02),   // físico + directo
  KSA: B(0.90, 1.04),   // organizado
  IRQ: B(0.88, 1.04),   // técnico + defensivo
  JOR: D(0.82, 1.07),   // bloque bajo
  UZB: D(0.84, 1.07),   // organizado
  NZL: D(0.80, 1.05),   // limitado
  QAT: B(0.82, 1.02),   // moderno en desarrollo
};

export function getTeamTactics(code: string): TeamTacticProfile {
  return TEAM_TACTICS[code] ?? { mentality: 'balanced', atkMod: 1.0, defMod: 1.0 };
}

// ── Fatigue constants ─────────────────────────────────────────────────────────

// Fatigue gained per full match by position (0–100 scale)
export const FATIGUE_PER_MATCH: Record<string, number> = {
  GK:  12,
  DEF: 20,
  MID: 26,
  FWD: 23,
};

// Age multiplier: older = slower recovery
export function ageFatigueMultiplier(age: number): number {
  if (age <= 24) return 0.85;
  if (age <= 27) return 0.92;
  if (age <= 30) return 1.00;
  if (age <= 33) return 1.12;
  return 1.24;
}

// Recovery per rest day (between matches ~4-6 days in WC)
export const RECOVERY_PER_MATCH: Record<string, number> = {
  GK:  10,
  DEF: 15,
  MID: 18,
  FWD: 16,
};

export function computeFatigueGain(position: string, age: number, minutesPlayed: number): number {
  const base = (FATIGUE_PER_MATCH[position] ?? 22) * (minutesPlayed / 90);
  return base * ageFatigueMultiplier(age);
}

export function computeFatigueRecovery(position: string, age: number): number {
  const base = RECOVERY_PER_MATCH[position] ?? 16;
  return base / ageFatigueMultiplier(age);
}

// Effective OVR penalty from fatigue (0-100 fatigue → 0-15% OVR reduction)
export function fatigueOvrPenalty(fatigue: number): number {
  if (fatigue < 40) return 0;
  if (fatigue < 70) return (fatigue - 40) / 30 * 0.06;  // up to 6% penalty
  return 0.06 + (fatigue - 70) / 30 * 0.09;              // up to 15% penalty
}
