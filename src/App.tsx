import { useGameStore } from './store/gameStore';
import { TeamHeader } from './components/TeamHeader';
import { PitchView } from './components/PitchView';
import { TacticalPanel } from './components/TacticalPanel';
import { MatchSimulator } from './components/MatchSimulator';
import { PlayerModal } from './components/PlayerModal';
import './App.css';

export default function App() {
  const activeModal = useGameStore((s) => s.activeModal);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">⚽ Copa Mundial FIFA 2026 — Análisis Táctico</h1>
      </header>

      <div className="main-layout">
        <aside className="left-panel">
          <TeamHeader side="home" />
          <TacticalPanel side="home" />
        </aside>

        <main className="center-panel">
          <PitchView />
          <MatchSimulator />
        </main>

        <aside className="right-panel">
          <TeamHeader side="away" />
          <TacticalPanel side="away" />
        </aside>
      </div>

      {activeModal && <PlayerModal />}
    </div>
  );
}
