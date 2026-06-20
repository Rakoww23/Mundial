import type { Player, SquadSlot, TacticalAnalysis, Formation } from '../types';

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
  const players = squad.map((s) => s.player).filter(Boolean) as Player[];
  const gk = players.find((p) => p.position === 'GK');
  const defs = players.filter((p) => p.position === 'DEF');
  const mids = players.filter((p) => p.position === 'MID');
  const fwds = players.filter((p) => p.position === 'FWD');

  const rivalPlayers = rival.map((s) => s.player).filter(Boolean) as Player[];
  const rivalDefs = rivalPlayers.filter((p) => p.position === 'DEF');
  const rivalMids = rivalPlayers.filter((p) => p.position === 'MID');
  const rivalFwds = rivalPlayers.filter((p) => p.position === 'FWD');

  const allOveralls = players.map((p) => p.overall);
  const avgOverall = avg(allOveralls);
  const avgDefOverall = avg(defs.map((p) => p.overall));
  const avgMidOverall = avg(mids.map((p) => p.overall));
  const avgFwdOverall = avg(fwds.map((p) => p.overall));
  const gkOverall = gk?.overall ?? 0;

  const avgHeight = avg(players.map((p) => p.height));
  const avgDefHeight = avg(defs.map((p) => p.height));
  const avgFwdHeight = avg(fwds.map((p) => p.height));

  const physicalScore = clamp(avg(players.map((p) => (p.height - 165) / 0.4 + p.overall * 0.5)));
  const aerialScore = clamp((avgDefHeight - 175) * 3 + avgFwdHeight * 0.3 + gkOverall * 0.1);
  const offensiveScore = clamp(avgFwdOverall * 0.6 + avgMidOverall * 0.25 + avg(fwds.map((p) => p.goals * 0.8)));
  const defensiveScore = clamp(avgDefOverall * 0.6 + gkOverall * 0.25 + avgMidOverall * 0.15);
  const midScore = clamp(avgMidOverall * 0.7 + avg(mids.map((p) => p.caps)) * 0.1);
  const possessionScore = clamp(avgMidOverall * 0.5 + avgOverall * 0.3 + mids.length * 3);

  const rivalAvgOverall = avg(rivalPlayers.map((p) => p.overall));
  const rivalAvgDef = avg(rivalDefs.map((p) => p.overall));
  const rivalAvgMid = avg(rivalMids.map((p) => p.overall));
  const rivalAvgFwd = avg(rivalFwds.map((p) => p.overall));
  const rivalAvgDefHeight = avg(rivalDefs.map((p) => p.height));
  const rivalGkOverall = rivalPlayers.find((p) => p.position === 'GK')?.overall ?? 60;

  const myDefCount = defs.length;
  const myFwdCount = fwds.length;
  const rivalFwdCount = rivalFwds.length;
  const myMidCount = mids.length;
  const rivalMidCount = rivalMids.length;

  const advantages: string[] = [];
  const disadvantages: string[] = [];

  // Overall superiority
  if (avgOverall > rivalAvgOverall + 5) {
    advantages.push(`Media general superior (${avgOverall.toFixed(0)} vs ${rivalAvgOverall.toFixed(0)}): mayor calidad individual en todas las líneas.`);
  } else if (avgOverall < rivalAvgOverall - 5) {
    disadvantages.push(`Media general inferior (${avgOverall.toFixed(0)} vs ${rivalAvgOverall.toFixed(0)}): el rival posee mayor calidad individual en el conjunto.`);
  }

  // GK superiority
  if (gkOverall > rivalGkOverall + 5) {
    advantages.push(`El portero (${gkOverall}) tiene una valoración significativamente mayor que el rival (${rivalGkOverall}), lo que incrementa la seguridad en el arco.`);
  } else if (gkOverall < rivalGkOverall - 5) {
    disadvantages.push(`El portero rival (${rivalGkOverall}) supera al propio (${gkOverall}), reduciendo la probabilidad de mantener el arco en cero.`);
  }

  // Defensive strength vs rival forwards
  if (avgDefOverall > rivalAvgFwd + 4) {
    advantages.push(`La defensa (media ${avgDefOverall.toFixed(0)}) supera a los delanteros rivales (media ${rivalAvgFwd.toFixed(0)}), dificultando la generación ofensiva adversaria.`);
  } else if (avgDefOverall < rivalAvgFwd - 4) {
    disadvantages.push(`Los delanteros rivales (media ${rivalAvgFwd.toFixed(0)}) superan a la defensa propia (media ${avgDefOverall.toFixed(0)}), creando riesgo de conceder goles.`);
  }

  // Forward strength vs rival defense
  if (avgFwdOverall > rivalAvgDef + 4) {
    advantages.push(`Los delanteros (media ${avgFwdOverall.toFixed(0)}) son superiores a la defensa rival (media ${rivalAvgDef.toFixed(0)}), generando mayor potencial goleador.`);
  } else if (avgFwdOverall < rivalAvgDef - 4) {
    disadvantages.push(`La defensa rival (media ${rivalAvgDef.toFixed(0)}) bloquea a los propios delanteros (media ${avgFwdOverall.toFixed(0)}), dificultando la creación de goles.`);
  }

  // Midfield dominance
  if (avgMidOverall > rivalAvgMid + 5) {
    advantages.push(`Dominio del mediocampo (${avgMidOverall.toFixed(0)} vs ${rivalAvgMid.toFixed(0)}): mayor control del balón y dictado del ritmo de juego.`);
  } else if (avgMidOverall < rivalAvgMid - 5) {
    disadvantages.push(`Mediocampo inferior (${avgMidOverall.toFixed(0)} vs ${rivalAvgMid.toFixed(0)}): el rival dominará la posesión y el juego entre líneas.`);
  }

  // Midfield numerical advantage
  if (myMidCount > rivalMidCount + 1) {
    advantages.push(`Superioridad numérica en el mediocampo (${myMidCount} vs ${rivalMidCount}): el ${myFormation.id} cierra espacios y facilita la transición.`);
  }

  // Defensive block vs forward count
  if (myDefCount >= 5 && rivalFwdCount <= 2) {
    advantages.push(`El bloque defensivo de ${myDefCount} jugadores neutraliza los ${rivalFwdCount} delanteros rivales, limitando los espacios en profundidad.`);
  }

  if (myFwdCount <= 1 && rivalFwdCount >= 3) {
    disadvantages.push(`Con solo ${myFwdCount} delantero(s) frente a ${rivalFwdCount} del rival, la generación ofensiva propia queda comprometida.`);
  }

  // Aerial advantage in defense
  if (avgDefHeight > rivalAvgDefHeight + 3) {
    advantages.push(`La defensa es más alta en promedio (${avgDefHeight.toFixed(0)} cm vs ${rivalAvgDefHeight.toFixed(0)} cm), mejorando el rendimiento en los duelos aéreos.`);
  } else if (avgDefHeight < rivalAvgDefHeight - 3) {
    disadvantages.push(`La defensa rival es más alta (${rivalAvgDefHeight.toFixed(0)} cm vs ${avgDefHeight.toFixed(0)} cm), poniendo en desventaja en los balones aéreos.`);
  }

  // High-cap players (experience)
  const highCapPlayers = players.filter((p) => p.caps >= 80);
  if (highCapPlayers.length >= 4) {
    advantages.push(`Gran experiencia internacional: ${highCapPlayers.length} jugadores con 80+ partidos con la selección aportan madurez en momentos decisivos.`);
  }

  // Young squad
  const avgAge = avg(players.map((p) => p.age));
  const rivalAvgAge = avg(rivalPlayers.map((p) => p.age));
  if (avgAge < rivalAvgAge - 3) {
    advantages.push(`Plantilla más joven (${avgAge.toFixed(0)} años de media vs ${rivalAvgAge.toFixed(0)}): mayor intensidad física y explosividad a lo largo del partido.`);
  } else if (avgAge > rivalAvgAge + 3) {
    disadvantages.push(`Plantilla más veterana (${avgAge.toFixed(0)} años de media): posible declive físico en los minutos finales del partido.`);
  }

  // Goal threat (forwards' goals)
  const totalGoals = fwds.reduce((s, p) => s + p.goals, 0);
  const rivalTotalGoals = rivalFwds.reduce((s, p) => s + p.goals, 0);
  if (totalGoals > rivalTotalGoals * 1.4 && totalGoals > 20) {
    advantages.push(`Los delanteros acumulan ${totalGoals} goles con sus selecciones, frente a los ${rivalTotalGoals} rivales: mayor amenaza de gol consolidada.`);
  } else if (rivalTotalGoals > totalGoals * 1.4 && rivalTotalGoals > 20) {
    disadvantages.push(`Los delanteros rivales acumulan ${rivalTotalGoals} goles con sus selecciones vs los propios ${totalGoals}: mayor peligro ofensivo del rival.`);
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
    avgOverall: parseFloat(avgOverall.toFixed(1)),
    avgDefOverall: parseFloat(avgDefOverall.toFixed(1)),
    avgMidOverall: parseFloat(avgMidOverall.toFixed(1)),
    avgFwdOverall: parseFloat(avgFwdOverall.toFixed(1)),
    gkOverall,
    avgHeight: parseFloat(avgHeight.toFixed(1)),
    avgDefHeight: parseFloat(avgDefHeight.toFixed(1)),
    avgFwdHeight: parseFloat(avgFwdHeight.toFixed(1)),
    physicalScore: parseFloat(physicalScore.toFixed(1)),
    aerialScore: parseFloat(aerialScore.toFixed(1)),
    offensiveScore: parseFloat(offensiveScore.toFixed(1)),
    defensiveScore: parseFloat(defensiveScore.toFixed(1)),
    midScore: parseFloat(midScore.toFixed(1)),
    possessionScore: parseFloat(possessionScore.toFixed(1)),
    advantages,
    disadvantages,
  };
}
