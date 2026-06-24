import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { teamShooterRating } from '../../services/penaltyTournamentEngine';
import { ShootoutHUD } from './ShootoutHUD';
import { fifaFlagUrl } from '../TeamFlag';
import type { ShootoutScene as ShootoutSceneType } from '../../game/scenes/ShootoutScene';

// Map a rival team's shooter rating (~70-90 OVR) to a 0..1 skill for the keeper duel.
function shooterSkillFor(rating: number): number {
  return Math.min(0.95, Math.max(0.1, (rating - 72) / 16));
}

// ── Keeper flag overlay ───────────────────────────────────────────────────────
// Shows the keeper's team flag as a patch on the goalkeeper sprite.
// Positioned at ~50% x / 50% y of the canvas-wrap, which maps to the keeper's
// chest across phone and desktop layouts thanks to Phaser's Scale.FIT centering.

function KeeperFlagOverlay({ code, visible }: { code: string; visible: boolean }) {
  const url = fifaFlagUrl(code);
  if (!url) return null;

  return (
    <div
      className="pk-keeper-flag"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      <div className="pk-keeper-flag__patch">
        <img
          src={url}
          alt={code}
          className="pk-keeper-flag__img"
          loading="eager"
          draggable={false}
        />
        <div className="pk-keeper-flag__shine" />
      </div>
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

  // Derive which team's flag to show on the keeper.
  // user_shoot → AI keeper in goal → show rival team's flag
  // user_keep  → user is in goal   → show user team's flag
  const keeperCode = shootout
    ? shootout.phase === 'user_shoot'
      ? (shootout.userSide === 'home' ? shootout.away : shootout.home)
      : (shootout.userSide === 'home' ? shootout.home : shootout.away)
    : null;

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

  const flagVisible = !!(shootout && !shootout.finished);

  return (
    <div className="pk-shootout">
      <ShootoutHUD />
      <div className="pk-canvas-wrap">
        <div ref={containerRef} className="pk-canvas" />
        {keeperCode && <KeeperFlagOverlay code={keeperCode} visible={flagVisible} />}
        {!readyToken && <div className="pk-loading">Cargando minijuego…</div>}
      </div>
    </div>
  );
}
