import { useGameStore } from '../store/gameStore';
import { IcoBall, IcoGlobe, IcoGoal, IcoChart, IcoTarget, IcoClock, IcoRefresh, IcoUsers } from '../components/Icons';

function TrophySVG() {
  return (
    <svg className="home-trophy-svg" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Handles */}
      <path d="M30 22 H10 C10 50 22 62 36 66" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M90 22 H110 C110 50 98 62 84 66" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Cup body */}
      <path d="M30 12 H90 V62 C90 80 76 92 60 92 C44 92 30 80 30 62 V12 Z" stroke="var(--gold)" strokeWidth="3.5" fill="rgba(200,168,75,0.08)" strokeLinejoin="round"/>
      {/* Stem */}
      <path d="M60 92 V112" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round"/>
      {/* Base plate */}
      <path d="M38 112 H82" stroke="var(--gold)" strokeWidth="5" strokeLinecap="round"/>
      {/* Star inside cup */}
      <path d="M60 32 L63 41 H73 L65 47 L68 56 L60 50 L52 56 L55 47 L47 41 H57 Z" fill="rgba(200,168,75,0.5)" stroke="var(--gold)" strokeWidth="1"/>
    </svg>
  );
}

export function HomePage() {
  const setAppPage = useGameStore((s) => s.setAppPage);

  return (
    <div className="home-page">
      <div className="home-bg-layer" aria-hidden="true">
        <div className="home-bg-field" />
        <div className="home-bg-radial" />
      </div>

      <div className="home-content">
        <div className="home-hero">
          <div className="home-trophy-wrap">
            <TrophySVG />
            <div className="home-trophy-glow" />
          </div>

          <div className="home-branding">
            <div className="home-eyebrow">Copa Mundial FIFA</div>
            <h1 className="home-title">
              <span className="home-title__year">2026</span>
            </h1>
            <p className="home-subtitle">Simulador táctico · 48 selecciones · 1248 jugadores</p>
          </div>
        </div>

        <nav className="home-nav" aria-label="Modos de juego">
          <button className="home-card home-card--primary" onClick={() => setAppPage('match')}>
            <div className="home-card__icon">
              <IcoBall size={32} />
            </div>
            <div className="home-card__body">
              <strong className="home-card__title">Simular Partido</strong>
              <span className="home-card__desc">Análisis táctico y simulación por fases</span>
            </div>
            <div className="home-card__arrow">›</div>
          </button>

          <button className="home-card home-card--secondary" onClick={() => setAppPage('worldcup')}>
            <div className="home-card__icon">
              <IcoGlobe size={32} />
            </div>
            <div className="home-card__body">
              <strong className="home-card__title">Modo Mundial</strong>
              <span className="home-card__desc">Guía tu selección por el torneo completo</span>
            </div>
            <div className="home-card__arrow">›</div>
          </button>

          <button className="home-card home-card--tertiary" onClick={() => setAppPage('penalty')}>
            <div className="home-card__icon">
              <IcoGoal size={32} />
            </div>
            <div className="home-card__body">
              <strong className="home-card__title">Modo Penales</strong>
              <span className="home-card__desc">Tanda de penales interactiva</span>
            </div>
            <div className="home-card__arrow">›</div>
          </button>
        </nav>

        <ul className="home-features" aria-label="Características">
          <li className="feature-chip"><IcoChart size={14} /> Análisis táctico dinámico</li>
          <li className="feature-chip"><IcoTarget size={14} /> Modelo xG no lineal</li>
          <li className="feature-chip"><IcoClock size={14} /> Simulación fase a fase</li>
          <li className="feature-chip"><IcoRefresh size={14} /> Tiempo extra y penales</li>
          <li className="feature-chip"><IcoUsers size={14} /> 12 grupos · 48 equipos</li>
        </ul>
      </div>
    </div>
  );
}
