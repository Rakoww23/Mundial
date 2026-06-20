const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'Lista jugadores mundial.txt');
const outputFile = path.join(__dirname, 'src', 'data', 'players.json');

const positionMap = {
  'Porteros': 'GK',
  'Defensas': 'DEF',
  'Mediocampistas': 'MID',
  'Delanteros': 'FWD',
};

const flagMap = {
  'ALG': '🇩🇿', 'ARG': '🇦🇷', 'AUS': '🇦🇺', 'AUT': '🇦🇹',
  'BEL': '🇧🇪', 'BIH': '🇧🇦', 'BRA': '🇧🇷', 'CPV': '🇨🇻',
  'CAN': '🇨🇦', 'COL': '🇨🇴', 'COD': '🇨🇩', 'CIV': '🇨🇮',
  'CRO': '🇭🇷', 'CUW': '🇨🇼', 'CZE': '🇨🇿', 'ECU': '🇪🇨',
  'EGY': '🇪🇬', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FRA': '🇫🇷', 'GER': '🇩🇪',
  'GHA': '🇬🇭', 'HAI': '🇭🇹', 'IRN': '🇮🇷', 'IRQ': '🇮🇶',
  'JPN': '🇯🇵', 'JOR': '🇯🇴', 'KOR': '🇰🇷', 'MEX': '🇲🇽',
  'MAR': '🇲🇦', 'NED': '🇳🇱', 'NZL': '🇳🇿', 'NOR': '🇳🇴',
  'PAN': '🇵🇦', 'PAR': '🇵🇾', 'POR': '🇵🇹', 'QAT': '🇶🇦',
  'KSA': '🇸🇦', 'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'SEN': '🇸🇳', 'RSA': '🇿🇦',
  'ESP': '🇪🇸', 'SWE': '🇸🇪', 'SUI': '🇨🇭', 'TUN': '🇹🇳',
  'TUR': '🇹🇷', 'URU': '🇺🇾', 'USA': '🇺🇸', 'UZB': '🇺🇿',
};

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

const teams = {};
let currentTeam = null;
let currentCode = null;
let currentPosition = null;
let playerId = 0;

for (const rawLine of lines) {
  const line = rawLine.replace(/\r$/, '');

  // Team header: "  ALGERIA (ALG)"
  const teamMatch = line.match(/^\s{2}([A-ZÁÉÍÓÚÜÑÇÔÊ\s''-]+)\s+\(([A-Z]{2,3})\)\s*$/u);
  if (teamMatch && !line.includes('#')) {
    const name = teamMatch[1].trim();
    const code = teamMatch[2].trim();
    currentTeam = code;
    currentCode = code;
    currentPosition = null;
    teams[code] = {
      code,
      name,
      flag: flagMap[code] || '🏳️',
      players: [],
    };
    continue;
  }

  // Position section
  const posMatch = line.match(/^\s+(Porteros|Defensas|Mediocampistas|Delanteros)\s*:/);
  if (posMatch) {
    currentPosition = positionMap[posMatch[1]];
    continue;
  }

  // Player line
  const playerMatch = line.match(/^\s+-\s+(.+?)\s+\|\s+Edad:\s+(\d+)\s+\|\s+Club:\s+(.+?)\s+\|\s+Estatura:\s+(\d+)\s+cm\s+\|\s+Peso \(estimado\):\s+(\d+)\s+kg\s+\|\s+Partidos con la selección:\s+(\d+)\s+\|\s+Goles con la selección:\s+(\d+)\s+\|\s+Media General:\s+(\d+)/);
  if (playerMatch && currentTeam && currentPosition) {
    const player = {
      id: playerId++,
      name: playerMatch[1].trim(),
      age: parseInt(playerMatch[2]),
      club: playerMatch[3].trim(),
      height: parseInt(playerMatch[4]),
      weight: parseInt(playerMatch[5]),
      caps: parseInt(playerMatch[6]),
      goals: parseInt(playerMatch[7]),
      overall: parseInt(playerMatch[8]),
      position: currentPosition,
      team: currentTeam,
    };
    teams[currentTeam].players.push(player);
  }
}

// Ensure output dir exists
const outDir = path.dirname(outputFile);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(outputFile, JSON.stringify(teams, null, 2), 'utf8');

const teamCount = Object.keys(teams).length;
const playerCount = Object.values(teams).reduce((s, t) => s + t.players.length, 0);
console.log(`Parsed ${teamCount} teams, ${playerCount} players -> ${outputFile}`);
