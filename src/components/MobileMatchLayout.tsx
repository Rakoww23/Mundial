import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { TeamHeader } from './TeamHeader';
import { TacticalPanel } from './TacticalPanel';
import { PitchView } from './PitchView';
import { MatchSimulator } from './MatchSimulator';

type TabId = 'pitch' | 'home' | 'away' | 'match';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'pitch', icon: '⚽', label: 'Campo' },
  { id: 'home', icon: '🏠', label: 'Local' },
  { id: 'away', icon: '✈️', label: 'Visit.' },
  { id: 'match', icon: '🎮', label: 'Partido' },
];

export function MobileMatchLayout() {
  const [activeTab, setActiveTab] = useState<TabId>('pitch');
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const teams = useGameStore((s) => s.teams);

  return (
    <div className="mobile-match-layout">
      <div className="mobile-match-scorebar">
        <span className="mobile-scorebar-team">
          {teams[homeCode]?.flag} {teams[homeCode]?.name}
        </span>
        <span className="mobile-scorebar-vs">VS</span>
        <span className="mobile-scorebar-team mobile-scorebar-team--right">
          {teams[awayCode]?.name} {teams[awayCode]?.flag}
        </span>
      </div>

      <div className="mobile-tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`mobile-tab${activeTab === tab.id ? ' mobile-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="mobile-tab__icon">{tab.icon}</span>
            <span className="mobile-tab__label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mobile-tab-content">
        {activeTab === 'pitch' && (
          <div className="mobile-pitch-tab">
            <PitchView />
          </div>
        )}
        {activeTab === 'home' && (
          <div className="mobile-team-panel">
            <TeamHeader side="home" />
            <TacticalPanel side="home" />
          </div>
        )}
        {activeTab === 'away' && (
          <div className="mobile-team-panel">
            <TeamHeader side="away" />
            <TacticalPanel side="away" />
          </div>
        )}
        {activeTab === 'match' && (
          <div className="mobile-simulator-tab">
            <MatchSimulator />
          </div>
        )}
      </div>
    </div>
  );
}
