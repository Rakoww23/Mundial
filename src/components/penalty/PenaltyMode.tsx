import { lazy, Suspense } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PenaltySetup } from './PenaltySetup';
import { PenaltyTournamentView } from './PenaltyTournamentView';
import './penalty.css';

// The Phaser shootout (and Phaser itself) only loads when a shootout opens.
const PhaserShootout = lazy(() => import('./PhaserShootout'));

// Router for Modo Penales: pick a team, run the shootout-only tournament, and play
// the user's own shootouts via the lazy-loaded Phaser overlay.
export function PenaltyMode() {
  const pkState = useGameStore((s) => s.pkState);
  const pkShootout = useGameStore((s) => s.pkShootout);

  if (!pkState) return <PenaltySetup />;

  return (
    <>
      <PenaltyTournamentView />
      {pkShootout && (
        <Suspense fallback={<div className="pk-shootout pk-shootout--loading">Cargando minijuego…</div>}>
          <PhaserShootout />
        </Suspense>
      )}
    </>
  );
}
