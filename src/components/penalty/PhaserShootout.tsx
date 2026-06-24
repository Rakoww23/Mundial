import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { teamShooterRating } from '../../services/penaltyTournamentEngine';
import { ShootoutHUD } from './ShootoutHUD';
import type { ShootoutScene as ShootoutSceneType } from '../../game/scenes/ShootoutScene';

// Map a rival team's shooter rating (~70-90 OVR) to a 0..1 skill for the keeper duel.
function shooterSkillFor(rating: number): number {
  return Math.min(0.95, Math.max(0.1, (rating - 72) / 16));
}

// ── Turn announcer ────────────────────────────────────────────────────────────
// Shows "¡TU TURNO!" or "TURNO RIVAL" in big text over the canvas each time the
// active phase changes. The key prop restarts the CSS animation on every kick.

function TurnAnnouncer({ phase, kickKey }: { phase: string; kickKey: number }) {
  if (phase !== 'user_shoot' && phase !== 'user_keep') return null;

  const isUser = phase === 'user_shoot';
  return (
    <div
      key={kickKey}
      className={`pk-turn-announce${isUser ? ' pk-turn-announce--user' : ' pk-turn-announce--rival'}`}
      aria-live="assertive"
    >
      <span className="pk-turn-announce__label">
        {isUser ? '¡Tu Turno!' : 'Turno Rival'}
      </span>
    </div>
  );
}

// Lazily hosts the Phaser game. Phaser and the scene are dynamically imported here so
// they only download when a shootout actually opens (kept out of the main bundle).
export default function PhaserShootout() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);
  const sceneRef = useRef<ShootoutSceneType | null>(null);
  // Bumped each time a scene finishes booting, so the kick-driver re-runs against the
  // current scene instance (robust to React StrictMode's mount/unmount/mount cycle).
  const [readyToken, setReadyToken] = useState(0);

  const shootout = useGameStore((s) => s.pkShootout);
  const teams = useGameStore((s) => s.teams);
  const pkApplyKick = useGameStore((s) => s.pkApplyKick);

  // Create the Phaser game once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Phaser = (await import('phaser')).default;
      const mod = await import('../../game/scenes/ShootoutScene');
      if (cancelled || !containerRef.current) return;
      const scene = new mod.ShootoutScene();
      scene.onReadyCb = () => { if (!cancelled) setReadyToken((t) => t + 1); };
      sceneRef.current = scene;
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: mod.GAME_W,
        height: mod.GAME_H,
        backgroundColor: '#0e3a1e',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [scene],
      });
    })();
    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // Drive each kick of the shootout.
  useEffect(() => {
    if (!readyToken || !shootout || shootout.finished) return;
    const scene = sceneRef.current;
    if (!scene) return;

    if (shootout.phase === 'user_shoot') {
      const name = teams[shootout.userSide === 'home' ? shootout.home : shootout.away]?.name ?? 'Tirador';
      scene.armShoot({
        difficulty: shootout.difficulty,
        onResolved: ({ outcome, aim, keeperDir }) =>
          pkApplyKick({ outcome, aim, keeperDir, shooterName: name }),
      });
      return;
    }

    // user_keep — the user is the goalkeeper against an AI shooter whose quality scales
    // with the rival team's rating.
    const oppCode = shootout.userSide === 'home' ? shootout.away : shootout.home;
    const oppTeam = teams[oppCode];
    const oppName = oppTeam?.name ?? 'Rival';
    const skill = oppTeam ? shooterSkillFor(teamShooterRating(oppTeam)) : 0.5;
    scene.armKeep({
      difficulty: shootout.difficulty,
      shooterSkill: skill,
      onResolved: ({ outcome, aim, keeperDir }) =>
        pkApplyKick({ outcome, aim, keeperDir, shooterName: oppName }),
    });
    // Keyed on the kick index + phase so each kick is driven exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToken, shootout?.kicks.length, shootout?.phase, shootout?.finished]);

  const phase = shootout?.phase ?? '';
  const kickKey = shootout?.kicks.length ?? 0;

  return (
    <div className="pk-shootout">
      <ShootoutHUD />
      <div className="pk-canvas-wrap">
        <div ref={containerRef} className="pk-canvas" />
        {!shootout?.finished && readyToken > 0 && (
          <TurnAnnouncer phase={phase} kickKey={kickKey} />
        )}
        {!readyToken && <div className="pk-loading">Cargando minijuego…</div>}
      </div>
    </div>
  );
}
