import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { IcoGoal, IcoRocket, IcoX, IcoCheck } from '../Icons';
import { TeamFlag } from '../TeamFlag';

export function PenaltySetup() {
  const teams = useGameStore((s) => s.teams);
  const startPenaltyTournament = useGameStore((s) => s.startPenaltyTournament);
  const setAppPage = useGameStore((s) => s.setAppPage);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');

  const allCodes = Object.keys(teams).sort((a, b) => teams[a].name.localeCompare(teams[b].name));
  const filteredCodes = search.trim()
    ? allCodes.filter((c) =>
        teams[c].name.toLowerCase().includes(search.toLowerCase()) ||
        c.toLowerCase().includes(search.toLowerCase()))
    : allCodes;

  return (
    <div className="wc-setup pk-setup">
      <div className="wc-setup__header">
        <button className="back-btn" onClick={() => setAppPage('home')}>← Volver</button>
        <div className="wc-setup__hero pk-setup__hero">
          <IcoGoal size={32} />
          <h2>Mundial de Penales</h2>
          <p>Cada partido se decide en los once metros. Elige tu selección y llévala a la gloria.</p>
        </div>
      </div>

      <div className="wc-search-wrap">
        <input
          className="wc-search-input"
          type="text"
          placeholder="Buscar selección..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="wc-search-clear" onClick={() => setSearch('')}>
            <IcoX size={12} />
          </button>
        )}
      </div>

      <div className="wc-team-grid">
        {filteredCodes.map((code) => (
          <button
            key={code}
            className={`wc-team-btn${selected === code ? ' wc-team-btn--selected' : ''}`}
            onClick={() => setSelected(code)}
          >
            <TeamFlag code={code} size={22} />
            <span className="wc-team-name">{teams[code].name}</span>
            {selected === code && <span className="wc-team-check"><IcoCheck size={12} /></span>}
          </button>
        ))}
        {filteredCodes.length === 0 && (
          <p className="wc-no-results">Sin resultados para "{search}"</p>
        )}
      </div>

      {selected && (
        <div className="wc-confirm">
          <div className="wc-confirm__team">
            <TeamFlag code={selected} size={28} />
            <span>{teams[selected].name}</span>
          </div>
          <button className="wc-start-btn" onClick={() => startPenaltyTournament(selected)}>
            <IcoRocket size={16} /> Iniciar Competición
          </button>
        </div>
      )}
    </div>
  );
}
