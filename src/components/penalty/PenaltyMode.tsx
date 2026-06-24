import { useGameStore } from '../../store/gameStore';
import { PenaltySetup } from './PenaltySetup';
import { PenaltyTournamentView } from './PenaltyTournamentView';
import './penalty.css';

// Router for Modo Penales: pick a team, then run the shootout-only tournament.
// (Stage 3 adds the live Phaser shootout overlay on top of the tournament view.)
export function PenaltyMode() {
  const pkState = useGameStore((s) => s.pkState);
  if (!pkState) return <PenaltySetup />;
  return <PenaltyTournamentView />;
}
