import type { Player, SquadSlot, TacticalAnalysis, Formation } from '../types';
import { OOP_PENALTY, effectiveOvr } from './oopPenalty';

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

export function analyzeSquad(
  squad: SquadSlot[],
  rival: SquadSlot[],
  myFormation: Formation,
  rivalFormation: Formation
): TacticalAnalysis {
  // Group by slot role — the position a player is ASSIGNED to, not their natural position
  const gkSlots  = squad.filter(s => s.formation.role === 'GK');
  const defSlots = squad.filter(s => s.formation.role === 'DEF');
  const midSlots = squad.filter(s => s.formation.role === 'MID');
  const fwdSlots = squad.filter(s => s.formation.role === 'FWD');

  // Effective overalls penalise out-of-position players
  const gkOvrs  = gkSlots .map(s => s.player ? effectiveOvr(s.player, 'GK')  : 60);
  const defOvrs = defSlots.map(s => s.player ? effectiveOvr(s.player, 'DEF') : 65);
  const midOvrs = midSlots.map(s => s.player ? effectiveOvr(s.player, 'MID') : 65);
  const fwdOvrs = fwdSlots.map(s => s.player ? effectiveOvr(s.player, 'FWD') : 65);

  const gkOverall     = gkOvrs[0]     ?? 60;
  const avgDefOverall = avg(defOvrs)  || 65;
  const avgMidOverall = avg(midOvrs)  || 65;
  const avgFwdOverall = avg(fwdOvrs)  || 65;
  const avgOverall    = avg([gkOverall, ...defOvrs, ...midOvrs, ...fwdOvrs].filter(v => v > 0)) || 65;

  // Physical attributes (height, age, caps) use natural player stats — not position-dependent
  const allPlayers  = squad.map(s => s.player).filter(Boolean) as Player[];
  const defPlayers  = defSlots.map(s => s.player).filter(Boolean) as Player[];
  const midPlayers  = midSlots.map(s => s.player).filter(Boolean) as Player[];
  const fwdPlayers  = fwdSlots.map(s => s.player).filter(Boolean) as Player[];

  const avgHeight    = avg(allPlayers.map(p => p.height));
  const avgDefHeight = avg(defPlayers.map(p => p.height));
  const avgFwdHeight = avg(fwdPlayers.map(p => p.height));

  // Rival analysis — also slot-based
  const rivalGkSlots  = rival.filter(s => s.formation.role === 'GK');
  const rivalDefSlots = rival.filter(s => s.formation.role === 'DEF');
  const rivalMidSlots = rival.filter(s => s.formation.role === 'MID');
  const rivalFwdSlots = rival.filter(s => s.formation.role === 'FWD');

  const rivalGkOverall  = rivalGkSlots[0]?.player  ? effectiveOvr(rivalGkSlots[0].player,  'GK')  : 60;
  const rivalAvgDef     = avg(rivalDefSlots.map(s => s.player ? effectiveOvr(s.player, 'DEF') : 0)) || 65;
  const rivalAvgMid     = avg(rivalMidSlots.map(s => s.player ? effectiveOvr(s.player, 'MID') : 0)) || 65;
  const rivalAvgFwd     = avg(rivalFwdSlots.map(s => s.player ? effectiveOvr(s.player, 'FWD') : 0)) || 65;
  const rivalAvgOverall = avg([
    rivalGkOverall,
    ...rivalDefSlots.map(s => s.player ? effectiveOvr(s.player, 'DEF') : 0),
    ...rivalMidSlots.map(s => s.player ? effectiveOvr(s.player, 'MID') : 0),
    ...rivalFwdSlots.map(s => s.player ? effectiveOvr(s.player, 'FWD') : 0),
  ].filter(v => v > 0)) || 65;

  const rivalPlayers    = rival.map(s => s.player).filter(Boolean) as Player[];
  const rivalDefPlayers = rivalDefSlots.map(s => s.player).filter(Boolean) as Player[];
  const rivalAvgDefHeight = avg(rivalDefPlayers.map(p => p.height));

  const myDefCount    = defSlots.length;
  const myFwdCount    = fwdSlots.length;
  const myMidCount    = midSlots.length;
  const rivalFwdCount = rivalFwdSlots.length;
  const rivalMidCount = rivalMidSlots.length;

  // Tactical scores
  const physicalScore   = clamp(avg(allPlayers.map(p => (p.height - 165) / 0.4 + p.overall * 0.5)));
  const aerialScore     = clamp((avgDefHeight - 175) * 3 + avgFwdHeight * 0.3 + gkOverall * 0.1);
  const fwdGoalContrib  = avg(fwdSlots.map(s => {
    if (!s.player) return 0;
    const oopF = OOP_PENALTY[s.player.position]?.['FWD'] ?? 1;
    return s.player.goals * oopF;
  }));
  const offensiveScore  = clamp(avgFwdOverall * 0.6 + avgMidOverall * 0.25 + fwdGoalContrib * 0.8);
  const defensiveScore  = clamp(avgDefOverall * 0.6 + gkOverall * 0.25 + avgMidOverall * 0.15);
  const midScore        = clamp(avgMidOverall * 0.7 + avg(midPlayers.map(p => p.caps)) * 0.1);
  const possessionScore = clamp(avgMidOverall * 0.5 + avgOverall * 0.3 + midSlots.length * 3);

  const advantages: string[] = [];
  const disadvantages: string[] = [];

  // OOP warnings — show before anything else
  const oopExtreme = squad.filter(s => {
    if (!s.player) return false;
    return (OOP_PENALTY[s.player.position]?.[s.formation.role] ?? 1) < 0.30;
  });
  const oopModerate = squad.filter(s => {
    if (!s.player) return false;
    const f = OOP_PENALTY[s.player.position]?.[s.formation.role] ?? 1;
    return f >= 0.30 && f < 0.65;
  });

  if (oopExtreme.length > 0) {
    const names = oopExtreme
      .map(s => `${s.player!.name.split(' ').slice(-1)[0]} (${s.player!.position}→${s.formation.role})`)
      .join(', ');
    disadvantages.push(`Posiciones inapropiadas extremas: ${names}. Rendimiento reducido al mínimo — afecta gravemente los resultados.`);
  }
  if (oopModerate.length > 0) {
    const names = oopModerate
      .map(s => `${s.player!.name.split(' ').slice(-1)[0]} (${s.player!.position}→${s.formation.role})`)
      .join(', ');
    disadvantages.push(`Jugadores fuera de posición: ${names} — rendimiento significativamente reducido.`);
  }

  // Overall superiority
  if (avgOverall > rivalAvgOverall + 5) {
    advantages.push(`Media general efectiva superior (${avgOverall.toFixed(0)} vs ${rivalAvgOverall.toFixed(0)}): mayor calidad individual en todas las líneas.`);
  } else if (avgOverall < rivalAvgOverall - 5) {
    disadvantages.push(`Media general efectiva inferior (${avgOverall.toFixed(0)} vs ${rivalAvgOverall.toFixed(0)}): el rival posee mayor calidad individual en el conjunto.`);
  }

  // GK
  if (gkOverall > rivalGkOverall + 5) {
    advantages.push(`El portero (${gkOverall.toFixed(0)}) tiene una valoración significativamente mayor que el rival (${rivalGkOverall.toFixed(0)}), incrementando la seguridad en el arco.`);
  } else if (gkOverall < rivalGkOverall - 5) {
    disadvantages.push(`El portero rival (${rivalGkOverall.toFixed(0)}) supera al propio (${gkOverall.toFixed(0)}), reduciendo la probabilidad de mantener el arco en cero.`);
  }

  // Def vs rival FWD
  if (avgDefOverall > rivalAvgFwd + 4) {
    advantages.push(`La defensa (media ${avgDefOverall.toFixed(0)}) supera a los delanteros rivales (media ${rivalAvgFwd.toFixed(0)}), dificultando la generación ofensiva adversaria.`);
  } else if (avgDefOverall < rivalAvgFwd - 4) {
    disadvantages.push(`Los delanteros rivales (media ${rivalAvgFwd.toFixed(0)}) superan a la defensa propia (media ${avgDefOverall.toFixed(0)}), creando riesgo de conceder goles.`);
  }

  // FWD vs rival DEF
  if (avgFwdOverall > rivalAvgDef + 4) {
    advantages.push(`Los delanteros (media ${avgFwdOverall.toFixed(0)}) son superiores a la defensa rival (media ${rivalAvgDef.toFixed(0)}), generando mayor potencial goleador.`);
  } else if (avgFwdOverall < rivalAvgDef - 4) {
    disadvantages.push(`La defensa rival (media ${rivalAvgDef.toFixed(0)}) bloquea a los propios delanteros (media ${avgFwdOverall.toFixed(0)}), dificultando la creación de goles.`);
  }

  // Midfield
  if (avgMidOverall > rivalAvgMid + 5) {
    advantages.push(`Dominio del mediocampo (${avgMidOverall.toFixed(0)} vs ${rivalAvgMid.toFixed(0)}): mayor control del balón y dictado del ritmo de juego.`);
  } else if (avgMidOverall < rivalAvgMid - 5) {
    disadvantages.push(`Mediocampo inferior (${avgMidOverall.toFixed(0)} vs ${rivalAvgMid.toFixed(0)}): el rival dominará la posesión y el juego entre líneas.`);
  }

  if (myMidCount > rivalMidCount + 1) {
    advantages.push(`Superioridad numérica en el mediocampo (${myMidCount} vs ${rivalMidCount}): el ${myFormation.id} cierra espacios y facilita la transición.`);
  }

  if (myDefCount >= 5 && rivalFwdCount <= 2) {
    advantages.push(`El bloque defensivo de ${myDefCount} jugadores neutraliza los ${rivalFwdCount} delanteros rivales, limitando los espacios en profundidad.`);
  }

  if (myFwdCount <= 1 && rivalFwdCount >= 3) {
    disadvantages.push(`Con solo ${myFwdCount} delantero(s) frente a ${rivalFwdCount} del rival, la generación ofensiva propia queda comprometida.`);
  }

  if (avgDefHeight > rivalAvgDefHeight + 3) {
    advantages.push(`La defensa es más alta en promedio (${avgDefHeight.toFixed(0)} cm vs ${rivalAvgDefHeight.toFixed(0)} cm), mejorando el rendimiento en los duelos aéreos.`);
  } else if (avgDefHeight < rivalAvgDefHeight - 3) {
    disadvantages.push(`La defensa rival es más alta (${rivalAvgDefHeight.toFixed(0)} cm vs ${avgDefHeight.toFixed(0)} cm), poniendo en desventaja en los balones aéreos.`);
  }

  const highCapPlayers = allPlayers.filter(p => p.caps >= 80);
  if (highCapPlayers.length >= 4) {
    advantages.push(`Gran experiencia internacional: ${highCapPlayers.length} jugadores con 80+ partidos con la selección aportan madurez en momentos decisivos.`);
  }

  const avgAge = avg(allPlayers.map(p => p.age));
  const rivalAvgAge = avg(rivalPlayers.map(p => p.age));
  if (avgAge < rivalAvgAge - 3) {
    advantages.push(`Plantilla más joven (${avgAge.toFixed(0)} años de media vs ${rivalAvgAge.toFixed(0)}): mayor intensidad física y explosividad a lo largo del partido.`);
  } else if (avgAge > rivalAvgAge + 3) {
    disadvantages.push(`Plantilla más veterana (${avgAge.toFixed(0)} años de media): posible declive físico en los minutos finales del partido.`);
  }

  // Goal threat weighted by OOP penalty
  const totalGoals = fwdSlots.reduce((sum, s) => {
    if (!s.player) return sum;
    const oopF = OOP_PENALTY[s.player.position]?.['FWD'] ?? 1;
    return sum + s.player.goals * oopF;
  }, 0);
  const rivalTotalGoals = rivalFwdSlots.reduce((sum, s) => {
    if (!s.player) return sum;
    const oopF = OOP_PENALTY[s.player.position]?.['FWD'] ?? 1;
    return sum + s.player.goals * oopF;
  }, 0);

  if (totalGoals > rivalTotalGoals * 1.4 && totalGoals > 20) {
    advantages.push(`Los delanteros acumulan ${totalGoals.toFixed(0)} goles efectivos con sus selecciones, frente a los ${rivalTotalGoals.toFixed(0)} rivales: mayor amenaza de gol consolidada.`);
  } else if (rivalTotalGoals > totalGoals * 1.4 && rivalTotalGoals > 20) {
    disadvantages.push(`Los delanteros rivales acumulan ${rivalTotalGoals.toFixed(0)} goles efectivos vs los propios ${totalGoals.toFixed(0)}: mayor peligro ofensivo del rival.`);
  }

  // Formation-specific insight
  const formationParts = myFormation.id.split('-').map(Number);
  const rivalParts = rivalFormation.id.split('-').map(Number);
  if (formationParts[0] >= 5) {
    advantages.push(`El sistema ${myFormation.id} es inherentemente defensivo, creando superioridad numérica ante los ${rivalFwdCount} delanteros rivales.`);
  }
  if (formationParts[formationParts.length - 1] >= 3 && rivalParts[0] >= 5) {
    advantages.push(`Con ${formationParts[formationParts.length - 1]} delanteros frente a una defensa de ${rivalParts[0]}, se generan espacios en las bandas para correr a la espalda.`);
  }

  return {
    avgOverall:    parseFloat(avgOverall.toFixed(1)),
    avgDefOverall: parseFloat(avgDefOverall.toFixed(1)),
    avgMidOverall: parseFloat(avgMidOverall.toFixed(1)),
    avgFwdOverall: parseFloat(avgFwdOverall.toFixed(1)),
    gkOverall:     parseFloat(gkOverall.toFixed(1)),
    avgHeight:     parseFloat(avgHeight.toFixed(1)),
    avgDefHeight:  parseFloat(avgDefHeight.toFixed(1)),
    avgFwdHeight:  parseFloat(avgFwdHeight.toFixed(1)),
    physicalScore:   parseFloat(physicalScore.toFixed(1)),
    aerialScore:     parseFloat(aerialScore.toFixed(1)),
    offensiveScore:  parseFloat(offensiveScore.toFixed(1)),
    defensiveScore:  parseFloat(defensiveScore.toFixed(1)),
    midScore:        parseFloat(midScore.toFixed(1)),
    possessionScore: parseFloat(possessionScore.toFixed(1)),
    advantages,
    disadvantages,
  };
}
