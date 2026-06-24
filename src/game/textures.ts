import Phaser from 'phaser';

// Procedurally generated textures — no image assets to download, keeps the lazy
// Phaser chunk self-contained and fast on mobile.

export const TEX = {
  ball: 'pk-ball',
  keeper: 'pk-keeper',
  reticle: 'pk-reticle',
} as const;

function makeBall(scene: Phaser.Scene) {
  const r = 18;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(r, r, r);
  g.lineStyle(2, 0xcfd6dd, 1);
  g.strokeCircle(r, r, r - 1);
  // simple pentagon hints
  g.fillStyle(0x222a33, 1);
  g.fillCircle(r, r, 4);
  g.fillCircle(r - 8, r - 6, 2.5);
  g.fillCircle(r + 8, r - 6, 2.5);
  g.fillCircle(r - 6, r + 8, 2.5);
  g.fillCircle(r + 6, r + 8, 2.5);
  g.generateTexture(TEX.ball, r * 2, r * 2);
  g.destroy();
}

function makeKeeper(scene: Phaser.Scene) {
  // A compact goalkeeper figure with outstretched gloves (drawn arms-out so the
  // hitbox reads as a diving keeper). Bright kit to stand out against the net.
  const w = 96, h = 70;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const kit = 0x18c08a, kitDk = 0x0e8c63, skin = 0xe9b48a, glove = 0xf4f4f4;
  // arms / gloves bar
  g.fillStyle(kitDk, 1);
  g.fillRoundedRect(2, 22, w - 4, 16, 8);
  g.fillStyle(glove, 1);
  g.fillCircle(10, 30, 11);
  g.fillCircle(w - 10, 30, 11);
  // body
  g.fillStyle(kit, 1);
  g.fillRoundedRect(w / 2 - 16, 20, 32, h - 20, 8);
  // head
  g.fillStyle(skin, 1);
  g.fillCircle(w / 2, 14, 12);
  g.generateTexture(TEX.keeper, w, h);
  g.destroy();
}

function makeReticle(scene: Phaser.Scene) {
  const s = 56, c = s / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.lineStyle(3, 0xc8a84b, 0.95);
  g.strokeCircle(c, c, 20);
  g.lineStyle(3, 0xe0c062, 0.95);
  g.beginPath();
  g.moveTo(c, 4); g.lineTo(c, 16);
  g.moveTo(c, s - 4); g.lineTo(c, s - 16);
  g.moveTo(4, c); g.lineTo(16, c);
  g.moveTo(s - 4, c); g.lineTo(s - 16, c);
  g.strokePath();
  g.fillStyle(0xe0c062, 1);
  g.fillCircle(c, c, 3);
  g.generateTexture(TEX.reticle, s, s);
  g.destroy();
}

export function makeTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists(TEX.ball)) makeBall(scene);
  if (!scene.textures.exists(TEX.keeper)) makeKeeper(scene);
  if (!scene.textures.exists(TEX.reticle)) makeReticle(scene);
}
