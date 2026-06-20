import { useGameStore } from '../store/gameStore';
import { FORMATIONS } from '../data/formations';

interface Props {
  side: 'home' | 'away';
}

export function TeamHeader({ side }: Props) {
  const teams = useGameStore((s) => s.teams);
  const teamCodes = useGameStore((s) => s.teamCodes);
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const homeFormationId = useGameStore((s) => s.homeFormationId);
  const awayFormationId = useGameStore((s) => s.awayFormationId);
  const setHomeTeam = useGameStore((s) => s.setHomeTeam);
  const setAwayTeam = useGameStore((s) => s.setAwayTeam);
  const setHomeFormation = useGameStore((s) => s.setHomeFormation);
  const setAwayFormation = useGameStore((s) => s.setAwayFormation);

  const code = side === 'home' ? homeCode : awayCode;
  const formationId = side === 'home' ? homeFormationId : awayFormationId;
  const setTeam = side === 'home' ? setHomeTeam : setAwayTeam;
  const setFormation = side === 'home' ? setHomeFormation : setAwayFormation;
  const team = teams[code];

  return (
    <div className={`team-header team-header--${side}`}>
      <div className="team-flag-name">
        <span className="team-flag">{team?.flag}</span>
        <span className="team-name">{team?.name}</span>
      </div>
      <div className="team-controls">
        <select
          className="team-select"
          value={code}
          onChange={(e) => setTeam(e.target.value)}
        >
          {teamCodes.map((c) => (
            <option key={c} value={c}>
              {teams[c]?.flag} {teams[c]?.name} ({c})
            </option>
          ))}
        </select>
        <select
          className="formation-select"
          value={formationId}
          onChange={(e) => setFormation(e.target.value)}
        >
          {FORMATIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
