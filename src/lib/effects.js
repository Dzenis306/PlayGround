import * as THREE from "three";
import { createGlowTexture } from "./world.js";

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export const PALETTES = [
  {
    name: "CANDY DIVINITY",
    accent: "#ff3fba",
    accent2: "#6ff7ff",
    accent3: "#b897ff",
    acid: "#d8ff5e",
    skin: "#ffe0f1",
    hair: "#d4c5ff",
    fabric: "#9d43ff",
    chrome: "#f7fbff",
  },
  {
    name: "CHROME ORCHID",
    accent: "#ff78d8",
    accent2: "#b38cff",
    accent3: "#ffc4f0",
    acid: "#bffcff",
    skin: "#f4dfff",
    hair: "#ffc9f2",
    fabric: "#5536ff",
    chrome: "#ffffff",
  },
  {
    name: "ACID ANGEL",
    accent: "#d8ff5e",
    accent2: "#ff4fb8",
    accent3: "#87ffdc",
    acid: "#f3ff9e",
    skin: "#fff7e8",
    hair: "#c4ffb4",
    fabric: "#24ffad",
    chrome: "#fbfff2",
  },
  {
    name: "DEEP SPACE",
    accent: "#a97dff",
    accent2: "#ffb268",
    accent3: "#7adfff",
    acid: "#ff7adf",
    skin: "#e7ddff",
    hair: "#9e8cff",
    fabric: "#3720c9",
    chrome: "#eff4ff",
  },
  {
    name: "BLOOD MOON",
    accent: "#ff4d6d",
    accent2: "#ffcb7c",
    accent3: "#ff94b7",
    acid: "#ffd45c",
    skin: "#ffd9dd",
    hair: "#ff8fae",
    fabric: "#c0104c",
    chrome: "#fff7f2",
  },
];

class SparkPool {
  constructor(scene, max = 420) {
    this.max = max;
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);
    this.velocities = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.gravity = new Float32Array(max);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(this.alphas, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: createGlowTexture("255,255,255") },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * 280.0 * uPixelRatio / max(-mv.z, 1.0);
          gl_Position = projectionMatrix * mv;
          vColor = aColor;
          vAlpha = aAlpha;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float mask = texture2D(uMap, gl_PointCoord).r;
          gl_FragColor = vec4(vColor, mask * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    scene.add(this.points);
    this.geo = geo;
    this.color = new THREE.Color();
  }

  emit(origin, options = {}) {
    const {
      count = 30,
      speed = 1.2,
      spread = 0.35,
      color = "#ff8be5",
      color2 = "#8dffff",
      life = 1.4,
      gravity = -0.25,
      size = 0.1,
      direction = null,
      hemisphere = 1,
    } = options;

    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;

      const theta = Math.random() * TAU;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.abs(Math.cos(phi)) * hemisphere,
        Math.sin(phi) * Math.sin(theta)
      );

      if (direction) {
        dir.lerp(direction, 0.58).normalize();
      }

      const s = speed * rand(0.32, 1.25);
      this.positions[i * 3] = origin.x + rand(-spread, spread);
      this.positions[i * 3 + 1] = origin.y + rand(-spread, spread);
      this.positions[i * 3 + 2] = origin.z + rand(-spread, spread);
      this.velocities[i * 3] = dir.x * s;
      this.velocities[i * 3 + 1] = dir.y * s;
      this.velocities[i * 3 + 2] = dir.z * s;
      this.color.set(Math.random() > 0.45 ? color : color2);
      this.color.multiplyScalar(rand(0.7, 1.4));
      this.colors[i * 3] = this.color.r;
      this.colors[i * 3 + 1] = this.color.g;
      this.colors[i * 3 + 2] = this.color.b;
      this.sizes[i] = size * rand(0.5, 1.5);
      this.maxLife[i] = life * rand(0.65, 1.25);
      this.life[i] = this.maxLife[i];
      this.gravity[i] = gravity;
      this.alphas[i] = 1;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  update(dt) {
    let active = false;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      active = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      const drag = Math.pow(0.24, dt);
      this.velocities[i * 3] *= drag;
      this.velocities[i * 3 + 1] = this.velocities[i * 3 + 1] * drag + this.gravity[i] * dt;
      this.velocities[i * 3 + 2] *= drag;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      const k = this.life[i] / this.maxLife[i];
      this.alphas[i] = Math.pow(k, 0.6);
      this.sizes[i] *= 1 - dt * 0.16;
    }
    if (active) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.aAlpha.needsUpdate = true;
      this.geo.attributes.aSize.needsUpdate = true;
    }
  }
}

function makeFlower(index) {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const hue = index % 3;
  const petalMat = new THREE.MeshPhysicalMaterial({
    color: hue === 0 ? "#ffb8ec" : hue === 1 ? "#b8f8ff" : "#e3ccff",
    roughness: 0.16,
    metalness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 1,
    iridescenceIOR: 1.5,
    emissive: hue === 0 ? "#7c0d4e" : hue === 1 ? "#0a626e" : "#3e147f",
    emissiveIntensity: 0.3,
    envMapIntensity: 1.7,
    side: THREE.DoubleSide,
  });

  const petalGeo = new THREE.SphereGeometry(1, 14, 10);
  for (let i = 0; i < 6; i++) {
    const petal = new THREE.Mesh(petalGeo, petalMat);
    const a = (i / 6) * TAU;
    petal.position.set(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12);
    petal.scale.set(0.045, 0.012, 0.15);
    petal.rotation.y = -a;
    petal.rotation.x = 0.2;
    inner.add(petal);
  }

  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 12),
    new THREE.MeshBasicMaterial({
      color: index % 2 ? "#8dffff" : "#ff8de0",
      toneMapped: false,
    })
  );
  center.position.y = 0.025;
  inner.add(center);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.008, 0.5, 6),
    new THREE.MeshPhysicalMaterial({ color: "#73ffd8", metalness: 0.6, roughness: 0.2, emissive: "#1b6e54", emissiveIntensity: 0.4 })
  );
  stem.position.y = -0.3;
  group.add(stem);

  group.userData.inner = inner;
  group.userData.center = center;
  return group;
}

export class PowerFX {
  constructor(scene, goddess, world, onPalette) {
    this.scene = scene;
    this.goddess = goddess;
    this.world = world;
    this.onPalette = onPalette;
    this.time = 0;
    this.paletteIndex = 0;
    this.sparks = new SparkPool(scene, 520);
    this.shockwaves = [];
    this.debris = [];
    this.flowers = [];
    this.flowerState = null;
    this.buildFlowers();
  }

  buildFlowers() {
    for (let i = 0; i < 20; i++) {
      const flower = makeFlower(i);
      const a = (i / 20) * TAU + rand(-0.16, 0.16);
      const r = rand(0.55, 2.45);
      flower.position.set(Math.cos(a) * r, 0.65, Math.sin(a) * r * 0.92);
      flower.rotation.y = Math.random() * TAU;
      flower.scale.setScalar(0.001);
      flower.visible = false;
      flower.userData.delay = rand(0, 0.7);
      flower.userData.baseY = 0.65;
      flower.userData.spin = rand(-0.35, 0.35);
      flower.userData.targetScale = rand(0.7, 1.35);
      this.scene.add(flower);
      this.flowers.push(flower);
    }
  }

  addShockwave(origin, color, options = {}) {
    const { maxScale = 5, duration = 1.4, tilt = Math.PI / 2, opacity = 0.5 } = options;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.006, 4, 120), mat);
    ring.position.copy(origin);
    ring.rotation.x = tilt;
    ring.scale.setScalar(0.05);
    this.scene.add(ring);
    this.shockwaves.push({ mesh: ring, age: 0, duration, maxScale, baseOpacity: opacity });
  }

  createLife() {
    const origin = this.goddess.getHandWorldPosition();
    this.sparks.emit(origin, {
      count: 150,
      speed: 2.4,
      spread: 0.08,
      color: "#ff86df",
      color2: "#8dffff",
      life: 2.0,
      gravity: -0.07,
      size: 0.13,
      hemisphere: 1.2,
    });
    this.sparks.emit(origin, {
      count: 60,
      speed: 0.7,
      spread: 0.18,
      color: "#ffffff",
      color2: "#d8ff5e",
      life: 1.6,
      gravity: 0.08,
      size: 0.07,
      hemisphere: 1,
    });
    this.addShockwave(origin, "#8dffff", { maxScale: 4, duration: 1.25, tilt: 0, opacity: 0.4 });
    this.addShockwave(new THREE.Vector3(0.42, 0.22, 0), "#ff4fbe", { maxScale: 6.5, duration: 1.8, opacity: 0.34 });

    this.flowerState = { start: this.time, active: true };
    this.flowers.forEach((flower, i) => {
      flower.visible = true;
      flower.scale.setScalar(0.001);
      flower.rotation.y = Math.random() * TAU;
      flower.userData.delay = rand(0, 0.62);
      flower.userData.baseY = 0.65;
      const a = (i / this.flowers.length) * TAU + rand(-0.2, 0.2);
      const r = rand(0.45, 2.7);
      flower.position.set(Math.cos(a) * r, 0.65, Math.sin(a) * r * 0.9);
    });

    this.world.pulse(0.32);
  }

  destroyWorld() {
    const origin = this.goddess.getHandWorldPosition();
    this.sparks.emit(origin, {
      count: 220,
      speed: 5.6,
      spread: 0.2,
      color: "#ff2f84",
      color2: "#ffffff",
      life: 1.5,
      gravity: -1.8,
      size: 0.16,
      hemisphere: 0.7,
    });
    this.addShockwave(new THREE.Vector3(0.42, 1.7, 0), "#ff3fba", { maxScale: 8.5, duration: 1.2, tilt: 0, opacity: 0.75 });
    this.addShockwave(new THREE.Vector3(0.42, 0.22, 0), "#ffffff", { maxScale: 10, duration: 1.5, opacity: 0.65 });

    const geos = [
      new THREE.TetrahedronGeometry(0.11, 0),
      new THREE.OctahedronGeometry(0.09, 0),
      new THREE.BoxGeometry(0.1, 0.05, 0.15),
    ];
    for (let i = 0; i < 42; i++) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: i % 4 === 0 ? "#ff4fb8" : "#ffffff",
        metalness: 1,
        roughness: 0.08,
        transparent: true,
        opacity: 1,
        emissive: i % 4 === 0 ? "#8b0f58" : "#1f0f31",
        emissiveIntensity: i % 4 === 0 ? 0.5 : 0.1,
        envMapIntensity: 2,
      });
      const mesh = new THREE.Mesh(geos[i % geos.length], mat);
      const a = Math.random() * TAU;
      const r = rand(0.2, 1.4);
      mesh.position.set(0.42 + Math.cos(a) * r, rand(0.4, 2.8), Math.sin(a) * r);
      mesh.rotation.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU);
      const dir = new THREE.Vector3(Math.cos(a) * rand(1.5, 4.5), rand(1.5, 5), Math.sin(a) * rand(1.5, 4.5));
      this.scene.add(mesh);
      this.debris.push({ mesh, velocity: dir, life: rand(1.1, 2.1), maxLife: 2.1, spin: new THREE.Vector3(rand(-8, 8), rand(-8, 8), rand(-8, 8)) });
    }

    this.flowers.forEach((flower) => {
      flower.visible = false;
      flower.scale.setScalar(0.001);
    });
    this.flowerState = null;
    this.world.pulse(1.4);
  }

  changeReality() {
    this.paletteIndex = (this.paletteIndex + 1) % PALETTES.length;
    const palette = PALETTES[this.paletteIndex];
    this.onPalette?.(palette, this.paletteIndex);
    const origin = this.goddess.getHandWorldPosition();
    this.sparks.emit(origin, {
      count: 180,
      speed: 3.4,
      spread: 0.12,
      color: palette.accent,
      color2: palette.accent2,
      life: 2.3,
      gravity: 0,
      size: 0.12,
      hemisphere: 1,
    });
    this.sparks.emit(new THREE.Vector3(0.42, 1.8, 0), {
      count: 180,
      speed: 4.2,
      spread: 0.6,
      color: palette.accent,
      color2: palette.accent3,
      life: 2.4,
      gravity: 0.02,
      size: 0.09,
      hemisphere: 1,
    });
    this.addShockwave(new THREE.Vector3(0.42, 1.8, 0), palette.accent2, { maxScale: 7, duration: 1.6, tilt: 0, opacity: 0.42 });
    this.addShockwave(new THREE.Vector3(0.42, 0.22, 0), palette.accent, { maxScale: 8, duration: 1.9, opacity: 0.3 });
    this.world.pulse(0.65);
    return palette;
  }

  everything() {
    const palette = this.changeReality();
    this.createLife();
    this.destroyWorld();
    this.world.pulse(1.7);
    return palette;
  }

  cast(power) {
    this.goddess.cast(power);
    if (power === "create") {
      this.createLife();
      return null;
    }
    if (power === "destroy") {
      this.destroyWorld();
      return null;
    }
    if (power === "change") {
      return this.changeReality();
    }
    return this.everything();
  }

  update(dt, time) {
    this.time = time;
    this.sparks.update(dt);

    if (this.flowerState) {
      const age = time - this.flowerState.start;
      this.flowers.forEach((flower, i) => {
        const localAge = age - flower.userData.delay;
        if (localAge < 0) return;
        const grow = Math.min(1, localAge / 0.7);
        const s = easeOutBack(grow) * flower.userData.targetScale;
        flower.scale.setScalar(Math.max(0.001, s));
        flower.rotation.y += dt * (0.12 + flower.userData.spin * 0.2);
        flower.rotation.z = Math.sin(time * 0.8 + i) * 0.08;
        flower.position.y = flower.userData.baseY + Math.sin(time * 1.2 + i) * 0.035;
        flower.userData.inner.position.y = Math.sin(time * 2 + i) * 0.02;
        const center = flower.userData.center;
        center.material.color.set(i % 2 ? "#8dffff" : "#ff8de0");
        center.scale.setScalar(1 + Math.sin(time * 2.4 + i) * 0.12);
      });
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const wave = this.shockwaves[i];
      wave.age += dt;
      const p = wave.age / wave.duration;
      if (p >= 1) {
        this.scene.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        wave.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const scale = 0.05 + p * wave.maxScale;
      wave.mesh.scale.setScalar(scale);
      wave.mesh.material.opacity = (1 - p) * wave.baseOpacity;
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        d.mesh.material.dispose();
        this.debris.splice(i, 1);
        continue;
      }
      d.velocity.y -= dt * 6.2;
      d.mesh.position.addScaledVector(d.velocity, dt);
      if (d.mesh.position.y < 0.08) {
        d.mesh.position.y = 0.08;
        d.velocity.y *= -0.32;
        d.velocity.x *= 0.72;
        d.velocity.z *= 0.72;
      }
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.y += d.spin.y * dt;
      d.mesh.rotation.z += d.spin.z * dt;
      d.mesh.material.opacity = Math.min(1, d.life / 0.55);
    }
  }
}
