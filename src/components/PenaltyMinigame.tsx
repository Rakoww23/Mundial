import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { IcoBall, IcoTrophy, IcoGoal, IcoLightning, IcoPlay, IcoCheck, IcoGlove } from './Icons';

type ZoneId = 'TL' | 'TC' | 'TR' | 'ML' | 'MC' | 'MR' | 'BL' | 'BC' | 'BR';

const ZONES: ZoneId[] = ['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR'];

const ZONE_SCORE_BASE: Record<ZoneId, number> = {
  TL: 0.87, TC: 0.62, TR: 0.87,
  ML: 0.74, MC: 0.28, MR: 0.74,
  BL: 0.82, BC: 0.64, BR: 0.82,
};

const AI_SHOT_WEIGHTS: Record<ZoneId, number> = {
  TL: 12, TC: 6, TR: 12,
  ML: 7,  MC: 3, MR: 7,
  BL: 20, BC: 9, BR: 20,
};

// Row/col for same-sector checks
const ZONE_ROW: Record<ZoneId, number> = { TL:0,TC:0,TR:0, ML:1,MC:1,MR:1, BL:2,BC:2,BR:2 };
const ZONE_COL: Record<ZoneId, number> = { TL:0,TC:1,TR:2, ML:0,MC:1,MR:2, BL:0,BC:1,BR:2 };

// SVG zone positions [x, y, width, height]
const ZONE_RECTS: Record<ZoneId, [number, number, number, number]> = {
  TL: [22, 22, 82, 50], TC: [106, 22, 82, 50], TR: [190, 22, 82, 50],
  ML: [22, 74, 82, 50], MC: [106, 74, 82, 50], MR: [190, 74, 82, 50],
  BL: [22, 126, 82, 50], BC: [106, 126, 82, 50], BR: [190, 126, 82, 50],
};

const ZONE_CENTER: Record<ZoneId, [number, number]> = {
  TL: [63, 47], TC: [147, 47], TR: [231, 47],
  ML: [63, 99], MC: [147, 99], MR: [231, 99],
  BL: [63, 151], BC: [147, 151], BR: [231, 151],
};

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickKeeperZone(): ZoneId {
  return weightedPick(ZONES, ZONES.map(() => 1 / ZONES.length * 9));
}

function pickAiShotZone(): ZoneId {
  return weightedPick(ZONES, ZONES.map((z) => AI_SHOT_WEIGHTS[z]));
}

function calcScoreProb(shotZone: ZoneId, keeperZone: ZoneId): number {
  const base = ZONE_SCORE_BASE[shotZone];
  if (shotZone === keeperZone) return base * 0.35;
  if (ZONE_COL[shotZone] === ZONE_COL[keeperZone]) return base * 0.72;
  if (ZONE_ROW[shotZone] === ZONE_ROW[keeperZone]) return base * 0.82;
  return base * 0.97;
}

interface Kick {
  isUserShot: boolean;
  shotZone: ZoneId;
  keeperZone: ZoneId;
  scored: boolean;
}

interface PGState {
  phase: 'shooting' | 'saving' | 'result' | 'done';
  userGoals: number;
  aiGoals: number;
  round: number;
  kicks: Kick[];
  lastKick: Kick | null;
  aiShotZone: ZoneId | null;
}

const MAX_ROUNDS = 5;

function GoalSVG({
  phase,
  onZoneClick,
  selectedZone,
  keeperZone,
  ballZone,
  disabled,
}: {
  phase: PGState['phase'];
  onZoneClick: (z: ZoneId) => void;
  selectedZone: ZoneId | null;
  keeperZone: ZoneId | null;
  ballZone: ZoneId | null;
  disabled: boolean;
}) {
  const isAnimating = phase === 'result';

  return (
    <svg viewBox="0 0 294 178" className="goal-svg">
      {/* Posts */}
      <rect x="20" y="20" width="254" height="158" rx="2" fill="rgba(255,255,255,0.04)" stroke="#fff" strokeWidth="3" />
      {/* Net lines */}
      {[55, 88, 121, 154, 187, 220].map((x) => (
        <line key={`v${x}`} x1={x} y1="20" x2={x} y2="178" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      ))}
      {[50, 80, 110, 140].map((y) => (
        <line key={`h${y}`} x1="20" y1={y} x2="274" y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      ))}

      {/* Clickable zones */}
      {ZONES.map((z) => {
        const [x, y, w, h] = ZONE_RECTS[z];
        const isSelected = selectedZone === z;
        const isKeeper = isAnimating && keeperZone === z;
        const isBall = isAnimating && ballZone === z;
        const cls = [
          'goal-zone',
          !disabled && phase !== 'result' ? 'goal-zone--clickable' : '',
          isSelected ? 'goal-zone--selected' : '',
          isKeeper ? 'goal-zone--keeper' : '',
          isBall ? 'goal-zone--ball' : '',
        ].filter(Boolean).join(' ');

        const [cx, cy] = ZONE_CENTER[z];

        return (
          <g key={z}>
            <rect
              x={x} y={y} width={w} height={h}
              className={cls}
              onClick={() => !disabled && phase !== 'result' && onZoneClick(z)}
            />
            {isBall && (
              <g>
                <circle cx={cx} cy={cy} r="13" fill="white" stroke="#222" strokeWidth="1.5"/>
                <circle cx={cx - 4} cy={cy - 4} r="4" fill="#222" opacity="0.7"/>
                <circle cx={cx + 5} cy={cy + 2} r="3.5" fill="#222" opacity="0.7"/>
                <circle cx={cx - 3} cy={cy + 6} r="3.5" fill="#222" opacity="0.7"/>
              </g>
            )}
            {isKeeper && !isBall && (
              <g>
                <rect x={cx - 12} y={cy - 18} width="24" height="36" rx="4" fill="#1C56CC" opacity="0.9"/>
                <rect x={cx - 8} y={cy - 14} width="16" height="6" rx="2" fill="white" opacity="0.5"/>
              </g>
            )}
          </g>
        );
      })}

      {/* Hints when not animating */}
      {!isAnimating && !disabled && phase !== 'done' && (
        <text x="147" y="200" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.5)">
          {phase === 'shooting' ? 'Haz clic donde quieres disparar' : 'Haz clic donde quieres atajar'}
        </text>
      )}
    </svg>
  );
}

function ScoreboardRow({ label, goals, max }: { label: string; goals: number; max: number }) {
  return (
    <div className="pg-score-row">
      <span className="pg-score-label">{label}</span>
      <div className="pg-score-dots">
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={`pg-dot ${i < goals ? 'pg-dot--scored' : ''}`} />
        ))}
      </div>
      <span className="pg-score-num">{goals}</span>
    </div>
  );
}

export function PenaltyMinigame() {
  const allTeams = useGameStore((s) => s.teams);
  const setAppPage = useGameStore((s) => s.setAppPage);

  const teamCodes = useGameStore((s) => s.teamCodes);
  const defaultHome = useGameStore((s) => s.homeCode);
  const defaultAway = useGameStore((s) => s.awayCode);

  const [homeTeam, setHomeTeam] = useState(defaultHome);
  const [awayTeam, setAwayTeam] = useState(defaultAway);
  const [started, setStarted] = useState(false);

  const [pg, setPg] = useState<PGState>({
    phase: 'shooting',
    userGoals: 0,
    aiGoals: 0,
    round: 1,
    kicks: [],
    lastKick: null,
    aiShotZone: null,
  });

  const home = allTeams[homeTeam];
  const away = allTeams[awayTeam];


  const handleZoneClick = useCallback((zone: ZoneId) => {
    if (pg.phase === 'result' || pg.phase === 'done') return;

    if (pg.phase === 'shooting') {
      const keeperZone = pickKeeperZone();
      const prob = calcScoreProb(zone, keeperZone);
      const scored = Math.random() < prob;
      const kick: Kick = { isUserShot: true, shotZone: zone, keeperZone, scored };
      const newUserGoals = pg.userGoals + (scored ? 1 : 0);

      setPg((prev) => ({
        ...prev,
        phase: 'result',
        userGoals: newUserGoals,
        kicks: [...prev.kicks, kick],
        lastKick: kick,
        aiShotZone: null,
      }));

      setTimeout(() => {
        setPg((prev) => ({ ...prev, phase: 'saving', aiShotZone: pickAiShotZone(), lastKick: null }));
      }, 1800);
    } else if (pg.phase === 'saving' && pg.aiShotZone) {
      const newUserGoals = pg.userGoals;
      const shotZone = pg.aiShotZone;
      const keeperZone = zone;
      const saveProb = shotZone === keeperZone ? 0.72 : ZONE_ROW[shotZone] === ZONE_ROW[keeperZone] ? 0.15 : 0.05;
      const saved = Math.random() < saveProb;
      const aiScored = !saved;
      const kick: Kick = { isUserShot: false, shotZone, keeperZone, scored: aiScored };
      const newAiGoals = pg.aiGoals + (aiScored ? 1 : 0);
      const newKicks = [...pg.kicks, kick];

      const totalRounds = Math.ceil(newKicks.filter((k) => k.isUserShot).length);

      // Check if done after this round
      const userKicks = newKicks.filter((k) => k.isUserShot).length;
      const aiKicks = newKicks.filter((k) => !k.isUserShot).length;
      const isDone = (() => {
        if (userKicks < MAX_ROUNDS || aiKicks < MAX_ROUNDS) return false;
        if (userKicks !== aiKicks) return false;
        return newUserGoals !== newAiGoals;
      })();

      // Check early win (impossible to catch up)
      const remainingRounds = MAX_ROUNDS - totalRounds;
      const userImpossible = pg.userGoals + (pg.lastKick?.scored ? 0 : 0) < newAiGoals && remainingRounds < newAiGoals - pg.userGoals;
      const aiImpossible = newAiGoals < pg.userGoals + (pg.lastKick?.scored ? 1 : 0) && remainingRounds < pg.userGoals - newAiGoals;
      const earlyEnd = userKicks >= MAX_ROUNDS && (userImpossible || aiImpossible);

      setPg((prev) => ({
        ...prev,
        phase: 'result',
        aiGoals: newAiGoals,
        kicks: newKicks,
        lastKick: kick,
      }));

      const nextPhase = (isDone || earlyEnd) ? 'done' : 'shooting';
      const nextRound = totalRounds + 1;

      setTimeout(() => {
        setPg((prev) => ({
          ...prev,
          phase: nextPhase,
          round: nextRound,
          lastKick: null,
          aiShotZone: null,
          userGoals: newUserGoals,
          aiGoals: newAiGoals,
        }));
      }, 1800);
    }
  }, [pg]);

  if (!started) {
    return (
      <div className="pg-setup">
        <button className="back-btn" onClick={() => setAppPage('home')}>← Volver</button>
        <h2 className="pg-setup__title"><IcoGoal size={22} /> Modo Penales</h2>
        <p className="pg-setup__sub">Tanda interactiva de 5 penales. Dispara y ataja.</p>

        <div className="pg-team-select">
          <div className="pg-team-picker">
            <label>Tu equipo (disparas y ataja)</label>
            <select value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)}>
              {teamCodes.map((c) => (
                <option key={c} value={c}>{allTeams[c]?.flag} {allTeams[c]?.name}</option>
              ))}
            </select>
          </div>
          <div className="pg-vs">vs</div>
          <div className="pg-team-picker">
            <label>Rival</label>
            <select value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)}>
              {teamCodes.map((c) => (
                <option key={c} value={c}>{allTeams[c]?.flag} {allTeams[c]?.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="pg-start-btn" onClick={() => setStarted(true)}>
          <IcoPlay size={14} /> Iniciar Tanda
        </button>
      </div>
    );
  }

  const displayRound = Math.min(pg.round, MAX_ROUNDS);
  const isSuddenDeath = pg.round > MAX_ROUNDS;

  const lastScored = pg.lastKick?.scored ?? null;
  const lastIsUser = pg.lastKick?.isUserShot ?? null;

  return (
    <div className="penalty-game">
      <div className="pg-header">
        <button className="back-btn back-btn--sm" onClick={() => setAppPage('home')}>←</button>
        <div className="pg-teams">
          <span>{home?.flag} {home?.name}</span>
          <span className="pg-score-display">{pg.userGoals} – {pg.aiGoals}</span>
          <span>{away?.name} {away?.flag}</span>
        </div>
        <div className="pg-round-info">
          {pg.phase === 'done' ? (
            pg.userGoals > pg.aiGoals
              ? <><IcoTrophy size={14} /> ¡Ganaste!</>
              : pg.userGoals < pg.aiGoals
                ? 'Perdiste'
                : 'Empate'
          ) : isSuddenDeath
            ? <><IcoLightning size={13} /> Muerte súbita — Lanzamiento {pg.round}</>
            : `Tanda ${displayRound}/${MAX_ROUNDS}`}
        </div>
      </div>

      <div className="pg-scoreboard">
        <ScoreboardRow label={`${home?.flag} Tú`} goals={pg.userGoals} max={MAX_ROUNDS} />
        <ScoreboardRow label={`${away?.flag} Rival`} goals={pg.aiGoals} max={MAX_ROUNDS} />
      </div>

      {pg.phase !== 'done' && (
        <div className="pg-instruction">
          {pg.phase === 'shooting' && (
            <span><IcoBall size={14} /> <strong>Tú disparas</strong> — ¿Dónde pones la pelota?</span>
          )}
          {pg.phase === 'saving' && (
            <span><IcoGlove size={14} /> <strong>Tú ataja</strong> — ¿A dónde te lanzas?</span>
          )}
          {pg.phase === 'result' && pg.lastKick && (
            <span className={lastScored ? 'pg-result--goal' : 'pg-result--save'}>
              {lastIsUser
                ? lastScored
                  ? <><IcoBall size={14} /> ¡GOOOOOL!</>
                  : 'Atajado'
                : lastScored
                  ? 'Gol del rival'
                  : <><IcoCheck size={14} /> ¡Atajaste!</>}
            </span>
          )}
        </div>
      )}

      <GoalSVG
        phase={pg.phase}
        onZoneClick={handleZoneClick}
        selectedZone={pg.lastKick?.isUserShot ? pg.lastKick.shotZone : (pg.phase === 'saving' ? null : null)}
        keeperZone={pg.lastKick ? pg.lastKick.keeperZone : null}
        ballZone={pg.lastKick ? pg.lastKick.shotZone : null}
        disabled={pg.phase === 'done'}
      />

      {pg.phase === 'done' && (
        <div className="pg-end">
          <div className="pg-final-result">
            {pg.userGoals > pg.aiGoals
              ? <><IcoTrophy size={16} /> {home?.name} gana la tanda {pg.userGoals}–{pg.aiGoals}</>
              : pg.userGoals < pg.aiGoals
              ? <>{away?.name} gana la tanda {pg.aiGoals}–{pg.userGoals}</>
              : <>Empate en la tanda</>}
          </div>
          <button
            className="pg-restart-btn"
            onClick={() => {
              setStarted(false);
              setPg({ phase: 'shooting', userGoals: 0, aiGoals: 0, round: 1, kicks: [], lastKick: null, aiShotZone: null });
            }}
          >
            ↩ Nueva Tanda
          </button>
        </div>
      )}
    </div>
  );
}
