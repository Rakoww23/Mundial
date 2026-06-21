import { useGameStore } from './store/gameStore';
import { TeamHeader } from './components/TeamHeader';
import { PitchView } from './components/PitchView';
import { TacticalPanel } from './components/TacticalPanel';
import { MatchSimulator } from './components/MatchSimulator';
import { PlayerModal } from './components/PlayerModal';
import { PenaltyMinigame } from './components/PenaltyMinigame';
import { HomePage } from './pages/HomePage';
import { WorldCupPage } from './pages/WorldCupPage';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileMatchLayout } from './components/MobileMatchLayout';
import { IcoBall } from './components/Icons';
import { useBreakpoint } from './hooks/useBreakpoint';
import './App.css';

export default function App() {
  const appPage = useGameStore((s) => s.appPage);
  const activeModal = useGameStore((s) => s.activeModal);
  const bp = useBreakpoint();
  const isMobileOrTablet = bp !== 'desktop';

  if (appPage === 'home') {
    return (
      <div className="app app--home">
        <HomePage />
        {isMobileOrTablet && <MobileBottomNav />}
        {activeModal && <PlayerModal />}
      </div>
    );
  }

  if (appPage === 'penalty') {
    return (
      <div className="app app--penalty">
        <PenaltyMinigame />
        {isMobileOrTablet && <MobileBottomNav />}
        {activeModal && <PlayerModal />}
      </div>
    );
  }

  if (appPage === 'worldcup') {
    return (
      <div className="app app--worldcup">
        <WorldCupPage />
        {isMobileOrTablet && <MobileBottomNav />}
        {activeModal && <PlayerModal />}
      </div>
    );
  }

  // 'match' page
  if (isMobileOrTablet) {
    return (
      <div className="app app--mobile-match">
        <header className="app-header app-header--compact">
          <IcoBall size={16} className="app-header__icon" />
          <h1 className="app-title app-title--compact">Copa Mundial FIFA 2026</h1>
        </header>
        <MobileMatchLayout />
        <MobileBottomNav />
        {activeModal && <PlayerModal />}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <IcoBall size={18} className="app-header__icon" />
        <h1 className="app-title">Copa Mundial FIFA 2026 — Análisis Táctico</h1>
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
