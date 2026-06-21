import { useGameStore } from '../store/gameStore';

export function HomePage() {
  const setAppPage = useGameStore((s) => s.setAppPage);

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-logo">🏆</div>
        <h1 className="home-title">World Cup Simulator</h1>
        <p className="home-subtitle">El simulador mundialista más avanzado y realista</p>
        <p className="home-edition">Copa Mundial FIFA 2026 · 48 Selecciones · 1248 Jugadores</p>
      </div>

      <div className="home-buttons">
        <button
          className="home-btn home-btn--primary"
          onClick={() => setAppPage('match')}
        >
          <span className="home-btn__icon">⚽</span>
          <span className="home-btn__text">
            <strong>Simular Partido</strong>
            <small>Análisis táctico y simulación minuto a minuto</small>
          </span>
        </button>

        <button
          className="home-btn home-btn--secondary"
          onClick={() => setAppPage('worldcup')}
        >
          <span className="home-btn__icon">🌍</span>
          <span className="home-btn__text">
            <strong>Modo Mundial</strong>
            <small>Juega el torneo completo con tu selección</small>
          </span>
        </button>

        <button
          className="home-btn home-btn--tertiary"
          onClick={() => setAppPage('penalty')}
        >
          <span className="home-btn__icon">🥅</span>
          <span className="home-btn__text">
            <strong>Modo Penales</strong>
            <small>Tanda de penales interactiva</small>
          </span>
        </button>
      </div>

      <div className="home-features">
        <div className="feature-chip">📊 Análisis táctico dinámico</div>
        <div className="feature-chip">🎯 Modelo xG no lineal</div>
        <div className="feature-chip">⏱️ Simulación fase a fase</div>
        <div className="feature-chip">🔄 Tiempo extra y penales</div>
        <div className="feature-chip">🌐 12 grupos · 48 equipos</div>
      </div>
    </div>
  );
}
