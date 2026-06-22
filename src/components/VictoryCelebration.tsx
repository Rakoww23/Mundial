import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TeamFlag } from './TeamFlag';
import { IcoTrophy } from './Icons';

const CONFETTI_COLORS = ['#ffd700', '#4caf50', '#2196f3', '#ff5252', '#ff9800', '#ffffff'];

interface Props {
  teamCode: string;
  teamName: string;
  subtitle?: string;
  onContinue: () => void;
}

export function VictoryCelebration({ teamCode, teamName, subtitle, onContinue }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.2,
        duration: 2.6 + Math.random() * 2.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 7,
        rot: Math.random() * 360,
        sway: (Math.random() * 2 - 1) * 60,
      })),
    [],
  );

  const overlay = (
    <div className="victory-overlay" role="dialog" aria-label="Victoria">
      <div className="victory-confetti" aria-hidden="true">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="confetti-piece"
            style={
              {
                left: `${p.left}%`,
                backgroundColor: p.color,
                width: `${p.size}px`,
                height: `${p.size * 1.6}px`,
                '--c-delay': `${p.delay}s`,
                '--c-dur': `${p.duration}s`,
                '--c-rot': `${p.rot}deg`,
                '--c-sway': `${p.sway}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="victory-card">
        <div className="victory-trophy"><IcoTrophy size={40} /></div>
        <div className="victory-flag"><TeamFlag code={teamCode} size={56} /></div>
        <h2 className="victory-title">¡Victoria!</h2>
        <p className="victory-team">{teamName}</p>
        {subtitle && <p className="victory-sub">{subtitle}</p>}
        <button className="victory-continue" onClick={onContinue}>Continuar</button>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
