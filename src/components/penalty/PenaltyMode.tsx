import { lazy, Suspense, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PenaltyEntry } from './PenaltyEntry';
import { PenaltySetup } from './PenaltySetup';
import { PenaltyTournamentView } from './PenaltyTournamentView';
import { ArcadeMode } from './ArcadeMode';
import './penalty.css';
import './arcade.css';

// The Phaser shootout (and Phaser itself) only loads when a shootout opens.
const PhaserShootout = lazy(() => import('./PhaserShootout'));

function ShootoutOverlay() {
  const pkShootout = useGameStore((s) => s.pkShootout);
  if (!pkShootout) return null;
  return (
    <Suspense fallback={<div className="pk-shootout pk-shootout--loading">Cargando minijuego…</div>}>
      <PhaserShootout />
    </Suspense>
  );
}

// Router for Modo Penales:
//  - an active arcade run   → ArcadeMode
//  - an active tournament   → PenaltyTournamentView
//  - otherwise              → entry menu → team select for the chosen sub-mode
export function PenaltyMode() {
  const pkState = useGameStore((s) => s.pkState);
  const arcadeRun = useGameStore((s) => s.arcadeRun);
  const [entry, setEntry] = useState<'menu' | 'arcade' | 'tournament'>('menu');

  if (arcadeRun) {
    return (<><ArcadeMode /><ShootoutOverlay /></>);
  }

  if (pkState) {
    return (<><PenaltyTournamentView /><ShootoutOverlay /></>);
  }

  if (entry === 'arcade') return <PenaltySetup mode="arcade" onBack={() => setEntry('menu')} />;
  if (entry === 'tournament') return <PenaltySetup mode="tournament" onBack={() => setEntry('menu')} />;
  return <PenaltyEntry onPick={setEntry} />;
}
