import Phaser from 'phaser';
import { makeTextures, TEX } from '../textures';
import {
  aiKeeperDive, aiShooterAim, aiSelectPower, resolvePoweredKick,
  powerFromCharge, powerZone, powerSpeed, powerLabel,
  POWER_ZONE_RANGES, type PowerZone,
} from '../../services/penaltyShootoutEngine';
import type { PKZone, PKZoneRow, PKZoneCol, PKKickOutcome } from '../../types/penalty';

// ── Logical layout (Scale.FIT handles the rest) ──────────────────────────────────
export const GAME_W = 900;
export const GAME_H = 506;

const GOAL = { left: 232, right: 668, top: 92, bottom: 268 };
const SPOT = { x: 450, y: 440 };
const GROUND_Y = 470;

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

// Power meter geometry + palette.
const BAR = { x: 846, top: 100, bottom: 404, w: 22 };
const BAR_H = BAR.bottom - BAR.top;
const powerY = (p: number) => BAR.bottom - Phaser.Math.Clamp(p, 0, 1) * BAR_H;
const ZONE_COLOR: Record<PowerZone, number> = {
  weak: 0xe8c13a, good: 0x3fb950, perfect: 0x7cff5a, strong: 0xe5484d, wild: 0x7a1414,
};

export interface ShootResolve { outcome: PKKickOutcome; aim: PKZone; keeperDir: PKZone; }
export interface ArmShootOpts { difficulty: number; onResolved: (r: ShootResolve) => void; }
export interface ArmKeepOpts {
  difficulty: number; shooterSkill: number; onResolved: (r: ShootResolve) => void;
}

type SceneState = 'idle' | 'aiming' | 'charging' | 'flying' | 'keeping' | 'resolved';

export class ShootoutScene extends Phaser.Scene {
  onReadyCb?: () => void;

  private state: SceneState = 'idle';
  private mode: 'shoot' | 'keep' = 'shoot';

  // actors
  private ball!: Phaser.GameObjects.Image;
  private ballShadow!: Phaser.GameObjects.Image;
  private keeper!: Phaser.GameObjects.Image;
  private keeperShadow!: Phaser.GameObjects.Image;
  private reticle!: Phaser.GameObjects.Image;
  private instr!: Phaser.GameObjects.Text;
  private flash!: Phaser.GameObjects.Text;
  private powerTag!: Phaser.GameObjects.Text;

  // power meter
  private barTrack!: Phaser.GameObjects.Graphics;
  private barFill!: Phaser.GameObjects.Graphics;
  private barMarker!: Phaser.GameObjects.Image;
  private barHint!: Phaser.GameObjects.Text;

  // particles
  private fxStrike!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fxSave!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fxGoal!: Phaser.GameObjects.Particles.ParticleEmitter;

  // run state
  private difficulty = 0.4;
  private shooterSkill = 0.6;
  private aiPower = 0.6;
  private onResolved?: (r: ShootResolve) => void;
  private aimZone: PKZone = { row: 'M', col: 'C' };
  private keeperZone: PKZone = { row: 'M', col: 'C' };
  private dived = false;
  private resolvedOnce = false;
  private pressTime = 0;
  private ballTween?: Phaser.Tweens.Tween;
  private keeperTween?: Phaser.Tweens.Tween;
  private moveHandler?: (e: PointerEvent) => void;
  private downHandler?: (e: PointerEvent) => void;
  private upHandler?: (e: PointerEvent) => void;

  constructor() { super('Shootout'); }

  create() {
    makeTextures(this);
    this.drawBackdrop();
    this.drawPitch();
    this.drawGoal();

    this.keeperShadow = this.add.image((GOAL.left + GOAL.right) / 2, GOAL.bottom - 4, TEX.shadow)
      .setDepth(3).setScale(0.85, 0.7).setAlpha(0.5);
    this.keeper = this.add.image((GOAL.left + GOAL.right) / 2, GOAL.bottom - 18, TEX.keeper).setDepth(5);
    this.ballShadow = this.add.image(SPOT.x, GROUND_Y, TEX.shadow).setDepth(4).setScale(0.5, 0.5).setAlpha(0.55);
    this.ball = this.add.image(SPOT.x, SPOT.y, TEX.ball).setDepth(6);
    this.reticle = this.add.image(SPOT.x, ROW_Y.M, TEX.reticle).setDepth(7).setVisible(false);

    // particle emitters (idle until triggered)
    this.fxStrike = this.add.particles(0, 0, TEX.spark, {
      speed: { min: 50, max: 170 }, scale: { start: 0.7, end: 0 }, lifespan: 420,
      blendMode: 'ADD', emitting: false,
    }).setDepth(8);
    this.fxSave = this.add.particles(0, 0, TEX.spark, {
      speed: { min: 70, max: 220 }, scale: { start: 0.8, end: 0 }, lifespan: 520,
      tint: 0x6db8ff, blendMode: 'ADD', emitting: false,
    }).setDepth(8);
    this.fxGoal = this.add.particles(0, 0, TEX.spark, {
      speed: { min: 90, max: 300 }, scale: { start: 1.0, end: 0 }, lifespan: 720,
      tint: [0xc8a84b, 0x8bf542, 0xffffff], blendMode: 'ADD', emitting: false,
    }).setDepth(10);

    this.instr = this.add.text(GAME_W / 2, GAME_H - 26, '', {
      fontFamily: 'Barlow, sans-serif', fontSize: '17px', color: '#f0ecf8', fontStyle: '600',
    }).setOrigin(0.5).setDepth(12);
    this.flash = this.add.text(GAME_W / 2, 168, '', {
      fontFamily: 'Barlow Condensed, Impact, sans-serif', fontSize: '66px', color: '#ffffff', fontStyle: '800',
    }).setOrigin(0.5).setDepth(13).setAlpha(0);
    this.powerTag = this.add.text(SPOT.x, 360, '', {
      fontFamily: 'Barlow Condensed, sans-serif', fontSize: '26px', color: '#ffffff', fontStyle: '800',
    }).setOrigin(0.5).setDepth(13).setAlpha(0);

    this.buildPowerMeter();
    this.bindInput();
    this.onReadyCb?.();
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  private bindInput() {
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
      if (this.mode === 'shoot') { this.onAim(p.x, p.y); this.startCharge(); }
      else this.dive(p.x, p.y);
    };
    this.upHandler = () => { if (this.state === 'charging') this.release(); };
    canvas.addEventListener('pointermove', this.moveHandler);
    canvas.addEventListener('pointerdown', this.downHandler);
    window.addEventListener('pointerup', this.upHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardownInput, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardownInput, this);
  }
  private toGameCoords(e: PointerEvent): { x: number; y: number } {
    const rect = this.game.canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * GAME_W, y: ((e.clientY - rect.top) / rect.height) * GAME_H };
  }
  private teardownInput() {
    const canvas = this.game?.canvas;
    if (canvas && this.moveHandler) canvas.removeEventListener('pointermove', this.moveHandler);
    if (canvas && this.downHandler) canvas.removeEventListener('pointerdown', this.downHandler);
    if (this.upHandler) window.removeEventListener('pointerup', this.upHandler);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  armShoot(opts: ArmShootOpts) {
    this.difficulty = opts.difficulty;
    this.onResolved = opts.onResolved;
    this.resetCommon();
    this.mode = 'shoot';
    this.ball.setPosition(SPOT.x, SPOT.y).setScale(1);
    this.reticle.setVisible(true).setPosition(COL_X.C, ROW_Y.M).setAlpha(0.95);
    this.instr.setText('Apunta · mantén pulsado para cargar · suelta para disparar');
    this.state = 'aiming';
  }

  armKeep(opts: ArmKeepOpts) {
    this.difficulty = opts.difficulty;
    this.shooterSkill = opts.shooterSkill;
    this.onResolved = opts.onResolved;
    this.resetCommon();
    this.mode = 'keep';
    this.dived = false;
    this.ball.setPosition(SPOT.x, SPOT.y).setScale(1);
    this.instr.setText('¡Atájala! Haz clic hacia dónde lanzarte');
    this.state = 'keeping';

    // AI shooter picks aim + power; stronger rivals are sharper and harder to read.
    this.aimZone = aiShooterAim(this.shooterSkill);
    this.aiPower = aiSelectPower(this.shooterSkill);
    const zone = powerZone(this.aiPower);
    const aimPt = zoneCenter(this.aimZone);
    const tellMs = lerp(560, 230, this.difficulty);
    this.reticle.setPosition(aimPt.x, aimPt.y).setVisible(true).setAlpha(0.95);

    const flightMs = lerp(640, 360, powerSpeed(zone));   // more power = faster ball
    window.setTimeout(() => {
      this.reticle.setVisible(false);
      this.strikeBurst(SPOT.x, SPOT.y);
      this.ballTween = this.tweens.add({
        targets: this.ball, x: aimPt.x, y: aimPt.y, scale: 0.6, duration: flightMs, ease: 'Quad.easeIn',
      });
    }, tellMs);
    window.setTimeout(() => this.resolveKeep(), tellMs + flightMs + 120);
  }

  private resetCommon() {
    this.resolvedOnce = false;
    this.ballTween?.stop();
    this.keeperTween?.stop();
    this.keeper.setPosition((GOAL.left + GOAL.right) / 2, GOAL.bottom - 18).setScale(1);
    this.flash.setAlpha(0);
    this.powerTag.setAlpha(0);
    this.reticle.setVisible(false);
    this.barTrack.setVisible(false);
    this.barFill.clear();
    this.barMarker.setVisible(false);
    this.barHint.setAlpha(0);
  }

  private onAim(x: number, y: number) {
    if (this.state !== 'aiming' && this.state !== 'charging') return;
    const cx = Phaser.Math.Clamp(x, GOAL.left + 22, GOAL.right - 22);
    const cy = Phaser.Math.Clamp(y, GOAL.top + 18, GOAL.bottom - 18);
    this.reticle.setPosition(cx, cy);
  }

  private startCharge() {
    if (this.state !== 'aiming') return;
    this.state = 'charging';
    this.pressTime = performance.now();
    this.barTrack.setVisible(true);
    this.barMarker.setVisible(true);
    this.barHint.setText('Suelta en la zona verde').setAlpha(0.9);
    this.instr.setText('');
  }

  private release() {
    if (this.state !== 'charging') return;
    this.fire(powerFromCharge(performance.now() - this.pressTime));
  }

  // ── Shooting ────────────────────────────────────────────────────────────────

  private fire(power: number) {
    this.state = 'flying';
    this.reticle.setVisible(false);
    this.barHint.setAlpha(0);

    const target = { x: this.reticle.x, y: this.reticle.y };
    this.aimZone = zoneAt(target.x, target.y);
    this.keeperZone = aiKeeperDive(this.aimZone, this.difficulty);
    const { outcome, zone } = resolvePoweredKick(this.aimZone, this.keeperZone, power, 0.85);

    this.showPowerTag(zone);

    const kp = zoneCenter(this.keeperZone);
    const flightMs = lerp(760, 340, powerSpeed(zone));   // faster ball at higher power
    const reaction = lerp(210, 60, this.difficulty) + lerp(0, 120, powerSpeed(zone)); // power steals reaction
    const moveMs = lerp(360, 230, this.difficulty);

    this.keeperTween = this.tweens.add({
      targets: this.keeper, x: kp.x, y: kp.y + 6, delay: reaction, duration: moveMs, ease: 'Quad.easeOut',
    });

    let ballTarget: { x: number; y: number };
    if (outcome === 'miss') {
      const overBar = zone === 'wild' || zone === 'strong';
      ballTarget = overBar
        ? { x: target.x + (Math.random() < 0.5 ? -40 : 40), y: GOAL.top - 60 }
        : { x: target.x < (GOAL.left + GOAL.right) / 2 ? GOAL.left - 28 : GOAL.right + 28, y: target.y - 24 };
    } else if (outcome === 'saved') {
      ballTarget = { x: kp.x, y: kp.y };
    } else {
      ballTarget = target;
    }
    this.strikeBurst(SPOT.x, SPOT.y);
    this.ballTween = this.tweens.add({
      targets: this.ball, x: ballTarget.x, y: ballTarget.y, scale: 0.58, duration: flightMs, ease: 'Quad.easeIn',
    });

    window.setTimeout(() => this.resolve(outcome, zone === 'perfect'), flightMs + 120);
  }

  private dive(x: number, y: number) {
    if (this.state !== 'keeping' || this.dived) return;
    this.dived = true;
    const cx = Phaser.Math.Clamp(x, GOAL.left + 22, GOAL.right - 22);
    const cy = Phaser.Math.Clamp(y, GOAL.top + 18, GOAL.bottom - 18);
    this.keeperZone = zoneAt(cx, cy);
    const kp = zoneCenter(this.keeperZone);
    this.keeperTween = this.tweens.add({
      targets: this.keeper, x: kp.x, y: kp.y + 6, duration: 220, ease: 'Quad.easeOut',
    });
    this.instr.setText('');
  }

  // ── Resolution ──────────────────────────────────────────────────────────────

  private resolveKeep() {
    if (this.resolvedOnce) return;
    const dive = this.dived ? this.keeperZone : ({ row: 'M', col: 'C' } as PKZone);
    const { outcome } = resolvePoweredKick(this.aimZone, dive, this.aiPower, this.shooterSkill, false);
    this.keeperZone = dive;
    this.resolve(outcome, false);
  }

  private resolve(outcome: PKKickOutcome, perfect: boolean) {
    if (this.resolvedOnce) return;
    this.resolvedOnce = true;
    this.state = 'resolved';

    const keep = this.mode === 'keep';
    if (outcome === 'saved') this.saveBurst(this.keeper.x, this.keeper.y);
    else if (outcome === 'goal') this.goalBurst(this.ball.x, this.ball.y, perfect);

    const label = outcome === 'saved' ? '¡ATAJADA!'
      : outcome === 'miss' ? (keep ? '¡FALLÓ!' : '¡FUERA!')
      : keep ? 'GOL RIVAL' : (perfect ? '¡GOLAZO!' : '¡GOL!');
    const good = keep ? outcome === 'saved' || outcome === 'miss' : outcome === 'goal';
    const color = good ? '#8BF542' : outcome === 'saved' ? '#3B82F6' : '#D87828';
    this.flash.setText(label).setColor(color).setAlpha(1).setScale(0.7);
    this.tweens.add({ targets: this.flash, alpha: 1, scale: 1, duration: 240, ease: 'Back.easeOut' });

    window.setTimeout(() => {
      this.onResolved?.({ outcome, aim: this.aimZone, keeperDir: this.keeperZone });
    }, 880);
  }

  // ── Power meter rendering ───────────────────────────────────────────────────

  private buildPowerMeter() {
    // translucent glass panel behind the bar
    const panel = this.add.graphics().setDepth(11);
    panel.fillStyle(0x0a0710, 0.45).fillRoundedRect(BAR.x - 12, BAR.top - 16, BAR.w + 24, BAR_H + 50, 12);
    panel.lineStyle(1, 0xffffff, 0.10).strokeRoundedRect(BAR.x - 12, BAR.top - 16, BAR.w + 24, BAR_H + 50, 12);
    panel.setVisible(true);

    this.barTrack = this.add.graphics().setDepth(11).setVisible(false);
    for (const { zone, from, to } of POWER_ZONE_RANGES) {
      const yTop = powerY(to), yBot = powerY(from);
      this.barTrack.fillStyle(ZONE_COLOR[zone], zone === 'perfect' ? 0.5 : 0.26);
      this.barTrack.fillRect(BAR.x, yTop, BAR.w, yBot - yTop);
    }
    this.barTrack.lineStyle(1.5, 0xffffff, 0.18).strokeRect(BAR.x, BAR.top, BAR.w, BAR_H);
    // perfect-band emphasis
    const pr = POWER_ZONE_RANGES.find((r) => r.zone === 'perfect')!;
    this.barTrack.lineStyle(2, 0x7cff5a, 0.9).strokeRect(BAR.x - 2, powerY(pr.to), BAR.w + 4, powerY(pr.from) - powerY(pr.to));

    this.barFill = this.add.graphics().setDepth(12);
    this.barMarker = this.add.image(BAR.x + BAR.w / 2, BAR.bottom, TEX.spark)
      .setDepth(12).setScale(2.6, 1.1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.barHint = this.add.text(BAR.x + BAR.w / 2, BAR.top - 26, '', {
      fontFamily: 'Barlow, sans-serif', fontSize: '11px', color: '#cdbb7e', fontStyle: '700',
    }).setOrigin(0.5).setDepth(12).setAlpha(0);
  }

  private drawPowerFill(power: number) {
    const zone = powerZone(power);
    const y = powerY(power);
    this.barFill.clear();
    this.barFill.fillStyle(ZONE_COLOR[zone], 0.92);
    this.barFill.fillRect(BAR.x, y, BAR.w, BAR.bottom - y);
    // glowing marker that swells in the perfect band
    const pulse = zone === 'perfect' ? 1 + 0.25 * Math.sin(performance.now() / 70) : 1;
    this.barMarker.setVisible(true).setPosition(BAR.x + BAR.w / 2, y)
      .setScale(2.6 * pulse, 1.2 * pulse).setTint(ZONE_COLOR[zone]);
  }

  private showPowerTag(zone: PowerZone) {
    const color = zone === 'perfect' ? '#7CFF5A' : zone === 'good' ? '#3FB950'
      : zone === 'weak' ? '#E8C13A' : zone === 'strong' ? '#E5484D' : '#7A1414';
    this.powerTag.setText(powerLabel(zone)).setColor(color).setAlpha(1).setScale(0.8);
    this.tweens.add({ targets: this.powerTag, alpha: 1, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.powerTag, alpha: 0, delay: 900, duration: 300 });
  }

  // ── Particle bursts ─────────────────────────────────────────────────────────

  private strikeBurst(x: number, y: number) { this.fxStrike.explode(12, x, y); }
  private saveBurst(x: number, y: number) { this.fxSave.explode(20, x, y); }
  private goalBurst(x: number, y: number, perfect: boolean) {
    this.fxGoal.explode(perfect ? 46 : 26, x, y);
    // net ripple
    const ring = this.add.image(x, y, TEX.spark).setDepth(9).setScale(1).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, scale: 7, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  // ── Per-frame ───────────────────────────────────────────────────────────────

  update() {
    if (this.state === 'charging') {
      this.drawPowerFill(powerFromCharge(performance.now() - this.pressTime));
    }
    // ball shadow tracks x and shrinks as the ball rises toward the goal
    const h = Phaser.Math.Clamp((GROUND_Y - this.ball.y) / (GROUND_Y - GOAL.top), 0, 1);
    this.ballShadow.setPosition(this.ball.x, GROUND_Y).setScale(0.5 - 0.32 * h, 0.5 - 0.32 * h).setAlpha(0.55 - 0.4 * h);
    this.keeperShadow.setPosition(this.keeper.x, GOAL.bottom - 4);
  }

  // ── Static art (layered for depth) ──────────────────────────────────────────

  private drawBackdrop() {
    const g = this.add.graphics().setDepth(-1);
    // night-stadium gradient sky
    g.fillGradientStyle(0x141d2e, 0x141d2e, 0x0c1320, 0x0c1320, 1);
    g.fillRect(0, 0, GAME_W, 250);
    // stand + crowd speckle
    g.fillStyle(0x0a0f18, 1).fillRect(0, 60, GAME_W, 70);
    for (let i = 0; i < 220; i++) {
      const cx = Math.random() * GAME_W, cy = 64 + Math.random() * 60;
      g.fillStyle(Math.random() < 0.5 ? 0x2a3550 : 0x39456a, 0.6);
      g.fillRect(cx, cy, 2, 2);
    }
  }

  private drawPitch() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x0e3a1e, 1).fillRect(0, 130, GAME_W, GAME_H - 130);
    for (let i = 0; i < 12; i++) {
      g.fillStyle(i % 2 === 0 ? 0x124a26 : 0x0e3f20, 1);
      g.fillRect(0, 130 + i * 32, GAME_W, 32);
    }
    g.lineStyle(3, 0xffffff, 0.22);
    g.strokeCircle(SPOT.x, SPOT.y, 72);
    g.fillStyle(0xffffff, 0.5).fillCircle(SPOT.x, SPOT.y, 4);
  }

  private drawGoal() {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x05140a, 0.30).fillRect(GOAL.left, GOAL.top, GOAL.right - GOAL.left, GOAL.bottom - GOAL.top);
    g.lineStyle(1, 0xffffff, 0.14);
    for (let x = GOAL.left; x <= GOAL.right; x += 18) { g.beginPath(); g.moveTo(x, GOAL.top); g.lineTo(x, GOAL.bottom); g.strokePath(); }
    for (let y = GOAL.top; y <= GOAL.bottom; y += 18) { g.beginPath(); g.moveTo(GOAL.left, y); g.lineTo(GOAL.right, y); g.strokePath(); }
    g.fillStyle(0xffffff, 1);
    g.fillRect(GOAL.left - 8, GOAL.top - 8, 8, GOAL.bottom - GOAL.top + 8);
    g.fillRect(GOAL.right, GOAL.top - 8, 8, GOAL.bottom - GOAL.top + 8);
    g.fillRect(GOAL.left - 8, GOAL.top - 8, GOAL.right - GOAL.left + 16, 8);
  }
}
