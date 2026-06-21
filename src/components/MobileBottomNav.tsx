import { useGameStore } from '../store/gameStore';
import { IcoBall, IcoTrophy, IcoGoal, IcoHome } from './Icons';
import type { AppPage } from '../types';

const NAV_ITEMS: { page: AppPage; icon: React.ReactNode; label: string }[] = [
  { page: 'home',     icon: <IcoHome size={20} />,   label: 'Inicio' },
  { page: 'match',    icon: <IcoBall size={20} />,   label: 'Partido' },
  { page: 'worldcup', icon: <IcoTrophy size={20} />, label: 'Mundial' },
  { page: 'penalty',  icon: <IcoGoal size={20} />,   label: 'Penales' },
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
