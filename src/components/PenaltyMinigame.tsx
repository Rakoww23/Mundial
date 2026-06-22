import { useGameStore } from '../store/gameStore';

function WipScreen() {
  const setAppPage = useGameStore((s) => s.setAppPage);
  return (
    <div className="wip-screen">
      <div className="wip-card">
        <div className="wip-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="56" height="56">
            <circle cx="24" cy="24" r="22" stroke="var(--gold)" strokeWidth="2" opacity=".35"/>
            <path d="M24 8 C24 8 36 16 36 26 C36 33 30.6 38 24 38 C17.4 38 12 33 12 26 C12 16 24 8 24 8Z"
              stroke="var(--gold)" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
            <path d="M18 26 Q21 22 24 26 Q27 30 30 26" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <line x1="24" y1="8" x2="24" y2="12" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="wip-title">Modo Penales</h2>
        <p className="wip-badge">Juego en desarrollo</p>
        <p className="wip-body">
          Este modo está siendo construido. Pronto podrás disputar una tanda de penales interactiva contra la IA.
        </p>
        <button className="wip-back-btn" onClick={() => setAppPage('home')}>
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}

export function PenaltyMinigame() {
  return <WipScreen />;
}
