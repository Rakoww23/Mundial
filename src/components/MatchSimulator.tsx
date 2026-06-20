import { useGameStore } from '../store/gameStore';

export function MatchSimulator() {
  const runSimulation = useGameStore((s) => s.runSimulation);
  const simResult = useGameStore((s) => s.simResult);
  const homeCode = useGameStore((s) => s.homeCode);
  const awayCode = useGameStore((s) => s.awayCode);
  const teams = useGameStore((s) => s.teams);

  const home = teams[homeCode];
  const away = teams[awayCode];

  const maxProb = simResult
    ? Math.max(simResult.homeWin, simResult.draw, simResult.awayWin)
    : 0;

  return (
    <div className="simulator">
      <button className="simulate-btn" onClick={runSimulation}>
        ⚽ Simular Partido
      </button>

      {simResult && (
        <div className="sim-result">
          <div className="sim-result__scoreline">
            <span className="sim-result__team">
              {home?.flag} {home?.name}
            </span>
            <span className="sim-result__score">
              {simResult.predictedScore.home} — {simResult.predictedScore.away}
            </span>
            <span className="sim-result__team">
              {away?.flag} {away?.name}
            </span>
          </div>

          <div className="sim-result__probs">
            <div className={`sim-prob ${simResult.homeWin === maxProb ? 'sim-prob--highlight' : ''}`}>
              <span className="sim-prob__label">{home?.flag} {home?.name}</span>
              <div className="sim-prob__bar-track">
                <div
                  className="sim-prob__bar-fill sim-prob__bar-fill--home"
                  style={{ width: `${simResult.homeWin}%` }}
                />
              </div>
              <span className="sim-prob__value">{simResult.homeWin}%</span>
            </div>
            <div className={`sim-prob ${simResult.draw === maxProb ? 'sim-prob--highlight' : ''}`}>
              <span className="sim-prob__label">Empate</span>
              <div className="sim-prob__bar-track">
                <div
                  className="sim-prob__bar-fill sim-prob__bar-fill--draw"
                  style={{ width: `${simResult.draw}%` }}
                />
              </div>
              <span className="sim-prob__value">{simResult.draw}%</span>
            </div>
            <div className={`sim-prob ${simResult.awayWin === maxProb ? 'sim-prob--highlight' : ''}`}>
              <span className="sim-prob__label">{away?.flag} {away?.name}</span>
              <div className="sim-prob__bar-track">
                <div
                  className="sim-prob__bar-fill sim-prob__bar-fill--away"
                  style={{ width: `${simResult.awayWin}%` }}
                />
              </div>
              <span className="sim-prob__value">{simResult.awayWin}%</span>
            </div>
          </div>

          <div className="sim-result__xg">
            <span className="sim-result__xg-item">
              <span className="xg-flag">{home?.flag}</span>
              <span className="xg-label">xG</span>
              <span className="xg-value xg-value--home">{simResult.homeXG}</span>
            </span>
            <span className="xg-divider">vs</span>
            <span className="sim-result__xg-item">
              <span className="xg-value xg-value--away">{simResult.awayXG}</span>
              <span className="xg-label">xG</span>
              <span className="xg-flag">{away?.flag}</span>
            </span>
          </div>

          <div className="sim-result__scorelines">
            <h4>Marcadores más probables</h4>
            <div className="scoreline-grid">
              {simResult.scorelines.slice(0, 8).map((s, i) => (
                <div key={i} className="scoreline-item">
                  <span className="scoreline-item__score">
                    {s.home} – {s.away}
                  </span>
                  <span className="scoreline-item__pct">
                    {(s.probability * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
