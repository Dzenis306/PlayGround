import * as THREE from "three";
import { glowTexture } from "./figure.js";

const CENTER = new THREE.Vector3(0, 1.5, 0);
const WHITE = new THREE.Color(0xffffff);
const EASE_OUT = (t) => 1 - Math.pow(1 - t, 3);
const EASE_IN = (t) => t * t * t;

export class SoulField {
  constructor(scene, palette, quality) {
    this.scene = scene;
    this.max = quality.mobile ? 90 : 170;
    this.time = 0;
    this.souls = [];
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.max * 3);
    this.colors = new Float32Array(this.max * 3);
    this.sizes = new Float32Array(this.max);
    this.phases = new Float32Array(this.max);

    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("aColor", new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("aSize", new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("aPhase", new THREE.BufferAttribute(this.phases, 1).setUsage(THREE.DynamicDrawUsage));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPixelRatio * (58.0 / max(0.001, -mv.z));
          vColor = aColor;
          vAlpha = 0.72 + 0.28 * sin(aPhase * 31.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float core = pow(smoothstep(0.5, 0.0, d), 2.4);
          float star = max(0.0, 1.0 - abs(c.x) * 15.0) * max(0.0, 1.0 - abs(c.y) * 2.4)
                     + max(0.0, 1.0 - abs(c.y) * 15.0) * max(0.0, 1.0 - abs(c.x) * 2.4);
          star *= smoothstep(0.5, 0.0, d);
          float alpha = (core + star * 0.55) * vAlpha;
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(vColor * (1.0 + star * 1.4), alpha);
        }
      `,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);

    for (let i = 0; i < this.max; i += 1) {
      this.souls.push({
        active: false,
        birth: 0,
        start: new THREE.Vector3(),
        radius: 1,
        baseY: 1.5,
        phase: 0,
        speed: 0.2,
        targetSize: 1,
        color: new THREE.Color(),
        dying: false,
        deathAt: 0,
        deathStart: new THREE.Vector3(),
        deathTarget: new THREE.Vector3(),
      });
    }

    this.recolor(palette);
  }

  pickColor(palette) {
    const roll = Math.random();
    if (roll < 0.42) return palette.a;
    if (roll < 0.76) return palette.b;
    if (roll < 0.92) return palette.c;
    return WHITE;
  }

  spawn(count, origin, palette) {
    for (let n = 0; n < count; n += 1) {
      let slot = this.souls.find((soul) => !soul.active);
      if (!slot) {
        slot = this.souls.reduce((oldest, soul) => (soul.birth < oldest.birth ? soul : oldest), this.souls[0]);
      }
      const index = this.souls.indexOf(slot);
      const angle = Math.random() * Math.PI * 2;
      slot.active = true;
      slot.dying = false;
      slot.birth = this.time + Math.random() * 0.18;
      slot.start.copy(origin).add(
        new THREE.Vector3((Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18)
      );
      slot.radius = 0.85 + Math.random() * 1.85;
      slot.baseY = 0.4 + Math.random() * 2.75;
      slot.phase = angle;
      slot.speed = (0.12 + Math.random() * 0.36) * (Math.random() < 0.5 ? -1 : 1);
      slot.targetSize = 0.55 + Math.random() * 1.05;
      slot.color.copy(this.pickColor(palette));
      slot.deathStart.set(0, 0, 0);
      slot.deathTarget.set(0, 0, 0);

      this.colors[index * 3] = slot.color.r;
      this.colors[index * 3 + 1] = slot.color.g;
      this.colors[index * 3 + 2] = slot.color.b;
      this.phases[index] = slot.phase;
      this.sizes[index] = 0;
      this.positions[index * 3] = slot.start.x;
      this.positions[index * 3 + 1] = slot.start.y;
      this.positions[index * 3 + 2] = slot.start.z;
    }
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aPhase.needsUpdate = true;
  }

  destroy() {
    this.souls.forEach((soul) => {
      if (!soul.active || soul.dying) return;
      soul.dying = true;
      soul.deathAt = this.time + Math.random() * 0.4;
      const index = this.souls.indexOf(soul);
      soul.deathStart.set(this.positions[index * 3], this.positions[index * 3 + 1], this.positions[index * 3 + 2]);
      soul.deathTarget.copy(CENTER).add(
        new THREE.Vector3((Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16)
      );
    });
  }

  recolor(palette) {
    this.souls.forEach((soul, index) => {
      if (!soul.active) return;
      soul.color.copy(this.pickColor(palette));
      this.colors[index * 3] = soul.color.r;
      this.colors[index * 3 + 1] = soul.color.g;
      this.colors[index * 3 + 2] = soul.color.b;
    });
    this.geometry.attributes.aColor.needsUpdate = true;
  }

  update(time) {
    this.time = time;
    for (let i = 0; i < this.max; i += 1) {
      const soul = this.souls[i];
      if (!soul.active) {
        this.sizes[i] = 0;
        continue;
      }

      if (soul.dying) {
        const progress = Math.min(1, Math.max(0, (time - soul.deathAt) / 0.8));
        if (progress >= 1) {
          soul.active = false;
          this.sizes[i] = 0;
          continue;
        }
        const eased = EASE_IN(progress);
        const spiral = (1 - progress) * 0.6;
        const angle = soul.phase + progress * 14;
        this.positions[i * 3] = soul.deathStart.x + (soul.deathTarget.x - soul.deathStart.x) * eased + Math.cos(angle) * spiral;
        this.positions[i * 3 + 1] = soul.deathStart.y + (soul.deathTarget.y - soul.deathStart.y) * eased + Math.sin(angle * 1.3) * spiral * 0.5;
        this.positions[i * 3 + 2] = soul.deathStart.z + (soul.deathTarget.z - soul.deathStart.z) * eased + Math.sin(angle) * spiral;
        this.sizes[i] = soul.targetSize * (1 - progress) * (0.4 + Math.sin(progress * Math.PI) * 0.6);
        continue;
      }

      const age = time - soul.birth;
      if (age < 0) {
        this.sizes[i] = 0;
        continue;
      }
      const appear = EASE_OUT(Math.min(1, age / 0.85));
      const angle = soul.phase + time * soul.speed;
      const radius = soul.radius * (0.7 + 0.3 * appear);
      const targetX = Math.cos(angle) * radius;
      const targetZ = Math.sin(angle) * radius * 0.86;
      const targetY = soul.baseY + Math.sin(time * 0.75 + soul.phase * 2.2) * 0.17;
      this.positions[i * 3] = soul.start.x + (targetX - soul.start.x) * appear;
      this.positions[i * 3 + 1] = soul.start.y + (targetY - soul.start.y) * appear;
      this.positions[i * 3 + 2] = soul.start.z + (targetZ - soul.start.z) * appear;
      const fadeIn = Math.min(1, age / 0.3);
      this.sizes[i] = soul.targetSize * appear * (0.85 + Math.sin(time * 2.4 + soul.phase * 5) * 0.15) * fadeIn;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
  }

  count() {
    return this.souls.reduce((total, soul) => total + (soul.active && !soul.dying ? 1 : 0), 0);
  }

  clear() {
    this.souls.forEach((soul) => {
      soul.active = false;
    });
    this.sizes.fill(0);
    this.geometry.attributes.aSize.needsUpdate = true;
  }
}

export class Shockwaves {
  constructor(scene) {
    this.scene = scene;
    this.waves = [];
  }

  fire(position, palette, power = 1) {
    const material = new THREE.MeshBasicMaterial({
      color: palette.a.clone(),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 128), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(position.x, 0.02, position.z);
    ring.scale.setScalar(0.2);
    this.scene.add(ring);

    const verticalMaterial = material.clone();
    verticalMaterial.color.copy(palette.b);
    verticalMaterial.opacity = 0.55;
    const vertical = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 128), verticalMaterial);
    vertical.position.copy(position);
    vertical.position.y = 1.5;
    vertical.scale.setScalar(0.2);
    this.scene.add(vertical);

    this.waves.push({
      ring,
      vertical,
      material,
      verticalMaterial,
      birth: performance.now() / 1000,
      life: 1.35,
      power,
    });
  }

  update(dt) {
    const now = performance.now() / 1000;
    for (let i = this.waves.length - 1; i >= 0; i -= 1) {
      const wave = this.waves[i];
      const progress = (now - wave.birth) / wave.life;
      if (progress >= 1) {
        this.scene.remove(wave.ring, wave.vertical);
        wave.ring.geometry.dispose();
        wave.vertical.geometry.dispose();
        wave.material.dispose();
        wave.verticalMaterial.dispose();
        this.waves.splice(i, 1);
        continue;
      }
      const eased = EASE_OUT(progress);
      const scale = (0.2 + eased * (4.2 + wave.power * 2.4)) * wave.power;
      wave.ring.scale.setScalar(scale);
      wave.material.opacity = 0.85 * (1 - progress);
      wave.vertical.scale.setScalar(0.2 + eased * (2.4 + wave.power * 1.6));
      wave.vertical.rotation.z += dt * 0.6;
      wave.verticalMaterial.opacity = 0.55 * (1 - progress);
    }
  }
}

export class BurstSystem {
  constructor(scene, quality) {
    this.scene = scene;
    this.bursts = [];
    this.maxBursts = 3;
    this.texture = glowTexture();
    this.particleCount = quality.mobile ? 90 : 170;
  }

  fire(origin, palette, power = 1) {
    if (this.bursts.length >= this.maxBursts) {
      const oldest = this.bursts.shift();
      this.scene.remove(oldest.points);
      oldest.geometry.dispose();
      oldest.material.dispose();
    }

    const count = Math.floor(this.particleCount * Math.min(1.4, power));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = origin.x + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 1] = origin.y + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.1;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = (0.6 + Math.random() * 2.6) * power;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed * 0.85 + 0.4;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      const roll = Math.random();
      color.copy(roll < 0.5 ? palette.a : roll < 0.82 ? palette.b : palette.c);
      if (Math.random() < 0.18) color.setRGB(1, 1, 1);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.09,
      map: this.texture,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.scene.add(points);
    this.bursts.push({ points, geometry, material, velocities, birth: performance.now() / 1000, life: 1.15 });
  }

  update(dt) {
    const now = performance.now() / 1000;
    for (let b = this.bursts.length - 1; b >= 0; b -= 1) {
      const burst = this.bursts[b];
      const progress = (now - burst.birth) / burst.life;
      if (progress >= 1) {
        this.scene.remove(burst.points);
        burst.geometry.dispose();
        burst.material.dispose();
        this.bursts.splice(b, 1);
        continue;
      }
      const position = burst.geometry.attributes.position.array;
      const drag = Math.pow(0.24, dt);
      for (let i = 0; i < burst.velocities.length; i += 3) {
        burst.velocities[i] *= drag;
        burst.velocities[i + 1] = burst.velocities[i + 1] * drag - 1.1 * dt;
        burst.velocities[i + 2] *= drag;
        position[i] += burst.velocities[i] * dt;
        position[i + 1] += burst.velocities[i + 1] * dt;
        position[i + 2] += burst.velocities[i + 2] * dt;
      }
      burst.geometry.attributes.position.needsUpdate = true;
      burst.material.opacity = Math.pow(1 - progress, 1.5);
      burst.material.size = 0.09 * (1 - progress * 0.6);
    }
  }
}
