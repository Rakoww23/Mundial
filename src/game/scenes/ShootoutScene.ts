import Phaser from 'phaser';
import { makeTextures, TEX } from '../textures';
import { aiKeeperDive, aiShooterAim, resolveKick } from '../../services/penaltyShootoutEngine';
import type { PKZone, PKZoneRow, PKZoneCol, PKKickOutcome } from '../../types/penalty';

// ── Logical layout (Scale.FIT handles the rest) ──────────────────────────────────
export const GAME_W = 900;
export const GAME_H = 506;

const GOAL = { left: 232, right: 668, top: 72, bottom: 252 };
const SPOT = { x: 450, y: 432 };

const COL_X: Record<PKZoneCol, number> = {
  L: GOAL.left + (GOAL.right - GOAL.left) * (1 / 6),
  C: (GOAL.left + GOAL.right) / 2,
  R: GOAL.left + (GOAL.right - GOAL.left) * (5 / 6),
};
const ROW_Y: Record<PKZoneRow, number> = {
  T: GOAL.top + (GOAL.bottom - GOAL.top) * (1 / 6),
  M: (GOAL.top + GOAL.bottom) / 2,
  B: GOAL.top + (GOAL.bottom - GOAL.top) * (5 / 6),
};

function zoneCenter(z: PKZone): { x: number; y: number } {
  return { x: COL_X[z.col], y: ROW_Y[z.row] };
}

function zoneAt(x: number, y: number): PKZone {
  const col: PKZoneCol = x < GOAL.left + (GOAL.right - GOAL.left) / 3 ? 'L'
    : x < GOAL.left + (2 * (GOAL.right - GOAL.left)) / 3 ? 'C' : 'R';
  const row: PKZoneRow = y < GOAL.top + (GOAL.bottom - GOAL.top) / 3 ? 'T'
    : y < GOAL.top + (2 * (GOAL.bottom - GOAL.top)) / 3 ? 'M' : 'B';
  return { row, col };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface ShootResolve {
  outcome: PKKickOutcome;
  aim: PKZone;
  keeperDir: PKZone;
}

export interface ArmShootOpts {
  difficulty: number;
  onResolved: (r: ShootResolve) => void;
}

export interface ArmKeepOpts {
  difficulty: number;
  shooterSkill: number;   // 0..1, rival team quality (precision / fewer misses)
  onResolved: (r: ShootResolve) => void;
}

type SceneState = 'idle' | 'aiming' | 'flying' | 'keeping' | 'resolved';

export class ShootoutScene extends Phaser.Scene {
  onReadyCb?: () => void;

  private state: SceneState = 'idle';
  private ball!: Phaser.GameObjects.Image;
  private keeper!: Phaser.GameObjects.Image;
  private reticle!: Phaser.GameObjects.Image;
  private instr!: Phaser.GameObjects.Text;
  private flash!: Phaser.GameObjects.Text;

  private mode: 'shoot' | 'keep' = 'shoot';
  private difficulty = 0.4;
  private shooterSkill = 0.6;
  private onResolved?: (r: ShootResolve) => void;
  private aimZone: PKZone = { row: 'M', col: 'C' };
  private keeperZone: PKZone = { row: 'M', col: 'C' };
  private dived = false;
  private resolvedOnce = false;
  private ballTween?: Phaser.Tweens.Tween;
  private keeperTween?: Phaser.Tweens.Tween;
  private moveHandler?: (e: PointerEvent) => void;
  private downHandler?: (e: PointerEvent) => void;

  constructor() {
    super('Shootout');
  }

  create() {
    makeTextures(this);
    this.drawPitch();
    this.drawGoal();

    this.keeper = this.add.image((GOAL.left + GOAL.right) / 2, GOAL.bottom - 18, TEX.keeper)
      .setDepth(5);
    this.ball = this.add.image(SPOT.x, SPOT.y, TEX.ball).setDepth(6);
    this.reticle = this.add.image(SPOT.x, ROW_Y.M, TEX.reticle).setDepth(7).setVisible(false);

    this.instr = this.add.text(GAME_W / 2, GAME_H - 28, '', {
      fontFamily: 'Barlow, sans-serif', fontSize: '18px', color: '#f0ecf8', fontStyle: '600',
    }).setOrigin(0.5).setDepth(8);

    this.flash = this.add.text(GAME_W / 2, 150, '', {
      fontFamily: 'Barlow Condensed, Impact, sans-serif', fontSize: '64px', color: '#ffffff', fontStyle: '800',
    }).setOrigin(0.5).setDepth(9).setAlpha(0);

    // Native canvas listeners (robust across Phaser versions / scaling).
    const canvas = this.game.canvas;
    canvas.style.touchAction = 'none';
    this.moveHandler = (e: PointerEvent) => {
      if (this.mode !== 'shoot') return;
      const p = this.toGameCoords(e);
      this.onAim(p.x, p.y);
    };
    this.downHandler = (e: PointerEvent) => {
      e.preventDefault();
      const p = this.toGameCoords(e);
      if (this.mode === 'shoot') {
        this.onAim(p.x, p.y);
        this.fire();
      } else {
        this.dive(p.x, p.y);
      }
    };
    canvas.addEventListener('pointermove', this.moveHandler);
    canvas.addEventListener('pointerdown', this.downHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardownInput, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardownInput, this);

    this.onReadyCb?.();
  }

  private toGameCoords(e: PointerEvent): { x: number; y: number } {
    const rect = this.game.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * GAME_W;
    const y = ((e.clientY - rect.top) / rect.height) * GAME_H;
    return { x, y };
  }

  private teardownInput() {
    const canvas = this.game?.canvas;
    if (!canvas) return;
    if (this.moveHandler) canvas.removeEventListener('pointermove', this.moveHandler);
    if (this.downHandler) canvas.removeEventListener('pointerdown', this.downHandler);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  armShoot(opts: ArmShootOpts) {
    this.difficulty = opts.difficulty;
    this.onResolved = opts.onResolved;
    this.resolvedOnce = false;
    this.ballTween?.stop();
    this.keeperTween?.stop();

    this.ball.setPosition(SPOT.x, SPOT.y).setScale(1).setVisible(true);
    this.keeper.setPosition((GOAL.left + GOAL.right) / 2, GOAL.bottom - 18).setScale(1);
    this.flash.setAlpha(0);
    this.reticle.setVisible(true).setPosition(COL_X.C, ROW_Y.M);
    this.instr.setText('Mueve el cursor y haz clic para disparar');
    this.mode = 'shoot';
    this.state = 'aiming';
  }

  // Arm a kick where the user is the keeper: the AI shooter aims, a brief tell flashes,
  // the user clicks a zone to dive, and the save is decided on a wall-clock timer.
  armKeep(opts: ArmKeepOpts) {
    this.difficulty = opts.difficulty;
    this.shooterSkill = opts.shooterSkill;
    this.onResolved = opts.onResolved;
    this.resolvedOnce = false;
    this.dived = false;
    this.mode = 'keep';
    this.ballTween?.stop();
    this.keeperTween?.stop();

    this.ball.setPosition(SPOT.x, SPOT.y).setScale(1).setVisible(true);
    this.keeper.setPosition((GOAL.left + GOAL.right) / 2, GOAL.bottom - 18).setScale(1);
    this.flash.setAlpha(0);
    this.reticle.setVisible(false);
    this.instr.setText('¡Atájala! Haz clic hacia dónde lanzarte');
    this.state = 'keeping';

    // AI shooter picks its target; a brief gold tell hints the direction.
    this.aimZone = aiShooterAim(this.shooterSkill);
    const aimPt = zoneCenter(this.aimZone);
    const tellMs = lerp(620, 260, this.difficulty);   // harder = shorter tell
    this.reticle.setPosition(aimPt.x, aimPt.y).setVisible(true).setAlpha(0.95);

    window.setTimeout(() => {
      this.reticle.setVisible(false);
      // ball flies to the AI target (cosmetic)
      this.ballTween = this.tweens.add({
        targets: this.ball, x: aimPt.x, y: aimPt.y, scale: 0.62,
        duration: 560, ease: 'Quad.easeIn',
      });
    }, tellMs);

    // Resolve after the tell + flight, regardless of render-loop throttling.
    window.setTimeout(() => this.resolveKeep(), tellMs + 720);
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  private onAim(x: number, y: number) {
    if (this.state !== 'aiming') return;
    const cx = Phaser.Math.Clamp(x, GOAL.left + 22, GOAL.right - 22);
    const cy = Phaser.Math.Clamp(y, GOAL.top + 18, GOAL.bottom - 18);
    this.reticle.setPosition(cx, cy);
  }

  private fire() {
    if (this.state !== 'aiming') return;
    this.state = 'flying';
    this.reticle.setVisible(false);
    this.instr.setText('');

    const target = { x: this.reticle.x, y: this.reticle.y };
    this.aimZone = zoneAt(target.x, target.y);
    this.keeperZone = aiKeeperDive(this.aimZone, this.difficulty);

    // The outcome is decided analytically (consistent with the auto-sim and independent
    // of the render loop), while the tweens below are purely cosmetic.
    const outcome: PKKickOutcome = resolveKick(this.aimZone, this.keeperZone, 0.72);
    const kp = zoneCenter(this.keeperZone);

    const flightMs = 620;
    const reaction = lerp(220, 70, this.difficulty);
    const moveMs = lerp(360, 230, this.difficulty);

    this.keeperTween = this.tweens.add({
      targets: this.keeper, x: kp.x, y: kp.y + 6,
      delay: reaction, duration: moveMs, ease: 'Quad.easeOut',
    });

    let ballTarget: { x: number; y: number };
    if (outcome === 'miss') {
      ballTarget = { x: target.x < (GOAL.left + GOAL.right) / 2 ? GOAL.left - 26 : GOAL.right + 26, y: target.y - 30 };
    } else if (outcome === 'saved') {
      ballTarget = { x: kp.x, y: kp.y };   // ball meets the keeper's gloves
    } else {
      ballTarget = target;
    }
    this.ballTween = this.tweens.add({
      targets: this.ball, x: ballTarget.x, y: ballTarget.y, scale: 0.62,
      duration: flightMs, ease: 'Quad.easeIn',
    });

    // Resolve on a wall-clock timer so the shootout never stalls (e.g. if the tab is
    // backgrounded and the render loop is throttled).
    window.setTimeout(() => this.resolve(outcome), flightMs + 140);
  }

  // User dives toward the clicked zone (keeper mode).
  private dive(x: number, y: number) {
    if (this.state !== 'keeping' || this.dived) return;
    this.dived = true;
    const cx = Phaser.Math.Clamp(x, GOAL.left + 22, GOAL.right - 22);
    const cy = Phaser.Math.Clamp(y, GOAL.top + 18, GOAL.bottom - 18);
    this.keeperZone = zoneAt(cx, cy);
    const kp = zoneCenter(this.keeperZone);
    this.keeperTween = this.tweens.add({
      targets: this.keeper, x: kp.x, y: kp.y + 6, duration: 240, ease: 'Quad.easeOut',
    });
    this.instr.setText('');
  }

  // ── Resolution ──────────────────────────────────────────────────────────────

  private resolveKeep() {
    if (this.resolvedOnce) return;
    const missChance = lerp(0.20, 0.04, this.shooterSkill);
    let outcome: PKKickOutcome;
    if (Math.random() < missChance) {
      outcome = 'miss';                      // rival blazed it wide
    } else if (!this.dived) {
      this.keeperZone = { row: 'M', col: 'C' };
      outcome = this.aimZone.col === 'C' && this.aimZone.row === 'M' ? 'saved' : 'goal';
    } else if (this.keeperZone.col !== this.aimZone.col) {
      outcome = 'goal';
    } else {
      const ri = (r: PKZoneRow) => (r === 'T' ? 0 : r === 'M' ? 1 : 2);
      const d = Math.abs(ri(this.keeperZone.row) - ri(this.aimZone.row));
      outcome = d === 0 ? 'saved' : d === 1 ? (Math.random() < 0.5 ? 'saved' : 'goal') : 'goal';
    }
    this.resolve(outcome);
  }

  private resolve(outcome: PKKickOutcome) {
    if (this.resolvedOnce) return;
    this.resolvedOnce = true;
    this.state = 'resolved';

    const keep = this.mode === 'keep';
    const label = outcome === 'saved' ? '¡ATAJADA!'
      : outcome === 'miss' ? (keep ? '¡FALLÓ!' : '¡FUERA!')
      : keep ? 'GOL RIVAL' : '¡GOL!';
    // For the keeper, a save is the good outcome (green); for the shooter, a goal is.
    const good = keep ? outcome === 'saved' || outcome === 'miss' : outcome === 'goal';
    const color = good ? '#8BF542' : outcome === 'saved' ? '#3B82F6' : '#D87828';
    this.flash.setText(label).setColor(color).setAlpha(1).setScale(0.7);
    this.tweens.add({ targets: this.flash, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });

    window.setTimeout(() => {
      this.onResolved?.({ outcome, aim: this.aimZone, keeperDir: this.keeperZone });
    }, 850);
  }

  // ── Static art ────────────────────────────────────────────────────────────────

  private drawPitch() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x0e3a1e, 1).fillRect(0, 0, GAME_W, GAME_H);
    // mown stripes
    for (let i = 0; i < 10; i++) {
      g.fillStyle(i % 2 === 0 ? 0x114a26 : 0x0e3f20, 1);
      g.fillRect(0, 250 + i * 26, GAME_W, 26);
    }
    // penalty arc + spot
    g.lineStyle(3, 0xffffff, 0.25);
    g.strokeCircle(SPOT.x, SPOT.y, 70);
    g.fillStyle(0xffffff, 0.5).fillCircle(SPOT.x, SPOT.y, 4);
  }

  private drawGoal() {
    const g = this.add.graphics().setDepth(1);
    // net
    g.fillStyle(0x000000, 0.18).fillRect(GOAL.left, GOAL.top, GOAL.right - GOAL.left, GOAL.bottom - GOAL.top);
    g.lineStyle(1, 0xffffff, 0.16);
    for (let x = GOAL.left; x <= GOAL.right; x += 18) { g.beginPath(); g.moveTo(x, GOAL.top); g.lineTo(x, GOAL.bottom); g.strokePath(); }
    for (let y = GOAL.top; y <= GOAL.bottom; y += 18) { g.beginPath(); g.moveTo(GOAL.left, y); g.lineTo(GOAL.right, y); g.strokePath(); }
    // posts + crossbar
    g.fillStyle(0xffffff, 1);
    g.fillRect(GOAL.left - 8, GOAL.top - 8, 8, GOAL.bottom - GOAL.top + 8);
    g.fillRect(GOAL.right, GOAL.top - 8, 8, GOAL.bottom - GOAL.top + 8);
    g.fillRect(GOAL.left - 8, GOAL.top - 8, GOAL.right - GOAL.left + 16, 8);
  }
}
