import { useGameStore } from '../store/gameStore';
import type { AppPage } from '../types';

const NAV_ITEMS: { page: AppPage; icon: string; label: string }[] = [
  { page: 'home', icon: '🏠', label: 'Inicio' },
  { page: 'match', icon: '⚽', label: 'Partido' },
  { page: 'worldcup', icon: '🏆', label: 'Mundial' },
  { page: 'penalty', icon: '🥅', label: 'Penales' },
];

export function MobileBottomNav() {
  const appPage = useGameStore((s) => s.appPage);
  const setAppPage = useGameStore((s) => s.setAppPage);

  return (
    <nav className="mobile-bottom-nav">
      {NAV_ITEMS.map(({ page, icon, label }) => (
        <button
          key={page}
          className={`mobile-nav-item${appPage === page ? ' mobile-nav-item--active' : ''}`}
          onClick={() => setAppPage(page)}
        >
          <span className="mobile-nav-icon">{icon}</span>
          <span className="mobile-nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
