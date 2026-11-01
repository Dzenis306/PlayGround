import * as THREE from "three";

let glowTexture = null;

export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.12, "rgba(255,255,255,0.92)");
  g.addColorStop(0.35, "rgba(255,255,255,0.32)");
  g.addColorStop(0.68, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  glowTexture.needsUpdate = true;
  return glowTexture;
}

export function makeGlowSprite(color, scale = 1, opacity = 1) {
  const material = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

export function lerpColor(uniformOrColor, target, k) {
  if (uniformOrColor && uniformOrColor.value && uniformOrColor.value.isColor) {
    uniformOrColor.value.lerp(target, k);
  } else if (uniformOrColor && uniformOrColor.isColor) {
    uniformOrColor.lerp(target, k);
  }
}

export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

export function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
