import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { FORMATIONS } from '../data/formations';
import { IcoLock, IcoX } from './Icons';
import { TeamFlag } from './TeamFlag';

// ── Custom team selector ───────────────────────────────────────────────────────

interface TeamSelectProps {
  value: string;
  codes: string[];
  teams: Record<string, { name: string }>;
  disabled?: boolean;
  onChange: (code: string) => void;
}

function TeamSelect({ value, codes, teams, disabled, onChange }: TeamSelectProps) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef           = useRef<HTMLDivElement>(null);
  const searchRef         = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

  const filtered = query.trim()
    ? codes.filter((c) =>
        teams[c]?.name.toLowerCase().includes(query.toLowerCase()) ||
        c.toLowerCase().includes(query.toLowerCase())
      )
    : codes;

  function select(code: string) {
    onChange(code);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="ts-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`ts-trigger${open ? ' ts-trigger--open' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <TeamFlag code={value} size={16} />
        <span className="ts-trigger__name">{teams[value]?.name ?? value}</span>
        <span className="ts-trigger__arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="ts-dropdown">
          <div className="ts-search-row">
            <input
              ref={searchRef}
              className="ts-search"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="ts-search-clear" onClick={() => setQuery('')}>
                <IcoX size={11} />
              </button>
            )}
          </div>
          <div className="ts-list">
            {filtered.map((c) => (
              <button
                key={c}
                type="button"
                className={`ts-option${c === value ? ' ts-option--active' : ''}`}
                onClick={() => select(c)}
              >
                <TeamFlag code={c} size={16} />
                <span className="ts-option__name">{teams[c]?.name}</span>
                <span className="ts-option__code">{c}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="ts-empty">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Team header ────────────────────────────────────────────────────────────────

interface Props {
  side: 'home' | 'away';
}

export function TeamHeader({ side }: Props) {
  const teams         = useGameStore((s) => s.teams);
  const teamCodes     = useGameStore((s) => s.teamCodes);
  const homeCode      = useGameStore((s) => s.homeCode);
  const awayCode      = useGameStore((s) => s.awayCode);
  const homeFormationId = useGameStore((s) => s.homeFormationId);
  const awayFormationId = useGameStore((s) => s.awayFormationId);
  const setHomeTeam   = useGameStore((s) => s.setHomeTeam);
  const setAwayTeam   = useGameStore((s) => s.setAwayTeam);
  const setHomeFormation = useGameStore((s) => s.setHomeFormation);
  const setAwayFormation = useGameStore((s) => s.setAwayFormation);
  const wcState       = useGameStore((s) => s.wcState);

  const code        = side === 'home' ? homeCode      : awayCode;
  const formationId = side === 'home' ? homeFormationId : awayFormationId;
  const setTeam     = side === 'home' ? setHomeTeam   : setAwayTeam;
  const setFormation = side === 'home' ? setHomeFormation : setAwayFormation;
  const team        = teams[code];

  const isWcMatch = !!wcState?.pendingMatch;
  const isLocked  = isWcMatch && code !== wcState?.userTeam;

  return (
    <div className={`team-header team-header--${side}${isLocked ? ' team-header--locked' : ''}`}>
      <div className="team-flag-name">
        <TeamFlag code={code} size={22} />
        <span className="team-name">{team?.name}</span>
        {isLocked && <span className="team-locked-badge"><IcoLock size={14} /></span>}
      </div>
      <div className="team-controls">
        <TeamSelect
          value={code}
          codes={teamCodes}
          teams={teams}
          disabled={isLocked}
          onChange={setTeam}
        />
        <select
          className="formation-select"
          value={formationId}
          disabled={isLocked}
          onChange={(e) => setFormation(e.target.value)}
        >
          {FORMATIONS.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
