import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rand, easeOutCubic } from "./utils.js";

const particleVertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (360.0 / max(0.1, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

class ParticleField {
  constructor(group) {
    this.max = 900;
    this.cursor = 0;
    this.positions = new Float32Array(this.max * 3);
    this.colors = new Float32Array(this.max * 3);
    this.sizes = new Float32Array(this.max);
    this.alphas = new Float32Array(this.max);
    this.velocities = new Float32Array(this.max * 3);
    this.lives = new Float32Array(this.max);
    this.maxLives = new Float32Array(this.max);
    this.drags = new Float32Array(this.max);
    this.gravities = new Float32Array(this.max);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aColor", new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aSize", new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));

    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    group.add(this.points);
    this.geo = geo;
    this.tmp = new THREE.Color();
  }

  burst(origin, count, palette, opts = {}) {
    const {
      speed = 3.2,
      spread = 0.12,
      gravity = 0.8,
      drag = 0.986,
      size = 1,
      life = 1.4,
      paletteMix = true,
      colors = null,
    } = opts;
    const paletteColors = [
      new THREE.Color(palette.skyMid),
      new THREE.Color(palette.skyAccent),
      new THREE.Color(palette.halo),
      new THREE.Color(palette.heart),
      new THREE.Color(0xffffff),
    ];
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(rand(-1, 1));
      const dirX = Math.sin(phi) * Math.cos(theta);
      const dirY = Math.cos(phi);
      const dirZ = Math.sin(phi) * Math.sin(theta);
      const s = speed * rand(0.35, 1.15);
      this.positions[i * 3] = origin.x + dirX * spread;
      this.positions[i * 3 + 1] = origin.y + dirY * spread;
      this.positions[i * 3 + 2] = origin.z + dirZ * spread;
      this.velocities[i * 3] = dirX * s;
      this.velocities[i * 3 + 1] = dirY * s + rand(0.2, 1.4);
      this.velocities[i * 3 + 2] = dirZ * s;
      const c = colors && colors.length
        ? new THREE.Color(colors[Math.floor(Math.random() * colors.length)])
        : paletteMix
          ? paletteColors[Math.floor(Math.random() * paletteColors.length)]
          : new THREE.Color(0xffffff);
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;
      this.sizes[i] = rand(0.035, 0.16) * size;
      const l = life * rand(0.55, 1.25);
      this.lives[i] = l;
      this.maxLives[i] = l;
      this.alphas[i] = 1;
      this.drags[i] = drag;
      this.gravities[i] = gravity;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.lives[i] <= 0) {
        if (this.alphas[i] !== 0) this.alphas[i] = 0;
        continue;
      }
      this.lives[i] -= dt;
      const drag = Math.pow(this.drags[i], dt * 60);
      this.velocities[i * 3] *= drag;
      this.velocities[i * 3 + 1] = this.velocities[i * 3 + 1] * drag - this.gravities[i] * dt;
      this.velocities[i * 3 + 2] *= drag;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      const lifeRatio = Math.max(0, this.lives[i] / this.maxLives[i]);
      this.alphas[i] = Math.min(1, lifeRatio * 1.8) * 0.95;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }
}

class Shockwaves {
  constructor(group, camera) {
    this.camera = camera;
    this.items = [];
    for (let i = 0; i < 8; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 96), material);
      mesh.visible = false;
      mesh.frustumCulled = false;
      group.add(mesh);
      this.items.push({ mesh, active: false, t: 0, dur: 1, scale: 1, faceCamera: false, baseOpacity: 1 });
    }
  }

  spawn(position, color, opts = {}) {
    const item = this.items.find((i) => !i.active) || this.items[0];
    const { duration = 0.9, scale = 4, faceCamera = false, opacity = 0.9, startScale = 0.15 } = opts;
    item.active = true;
    item.t = 0;
    item.dur = duration;
    item.scale = scale;
    item.startScale = startScale;
    item.faceCamera = faceCamera;
    item.baseOpacity = opacity;
    item.mesh.visible = true;
    item.mesh.position.copy(position);
    item.mesh.material.color.set(color);
    item.mesh.material.opacity = opacity;
    if (faceCamera) {
      item.mesh.rotation.set(0, 0, 0);
      item.mesh.quaternion.copy(this.camera.quaternion);
    } else {
      item.mesh.quaternion.identity();
      item.mesh.rotation.x = -Math.PI / 2;
    }
  }

  update(dt) {
    this.items.forEach((item) => {
      if (!item.active) return;
      item.t += dt;
      const p = Math.min(1, item.t / item.dur);
      const e = easeOutCubic(p);
      const s = item.startScale + e * item.scale;
      item.mesh.scale.setScalar(s);
      item.mesh.material.opacity = (1 - p) * item.baseOpacity;
      if (item.faceCamera) item.mesh.quaternion.copy(this.camera.quaternion);
      if (p >= 1) {
        item.active = false;
        item.mesh.visible = false;
      }
    });
  }
}

class ShardBurst {
  constructor(group, palette) {
    this.count = 110;
    this.data = [];
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.18,
      envMapIntensity: 1.4,
      emissive: 0x12000a,
      emissiveIntensity: 0.6,
    });
    this.mesh = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.085, 0), this.material, this.count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(this.mesh);
    const dummy = new THREE.Object3D();
    dummy.scale.setScalar(0.001);
    dummy.updateMatrix();
    for (let i = 0; i < this.count; i++) {
      this.mesh.setMatrixAt(i, dummy.matrix);
      this.data.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        rotVel: new THREE.Vector3(),
        scale: 1,
        life: 0,
        maxLife: 1,
      });
    }
    this.dummy = new THREE.Object3D();
    this.palette = palette;
  }

  burst(origin, palette) {
    this.palette = palette;
    const colors = [new THREE.Color(palette.skyMid), new THREE.Color(palette.skyAccent), new THREE.Color(palette.halo), new THREE.Color(0xffffff)];
    this.data.forEach((d, i) => {
      d.active = true;
      d.pos.copy(origin).add(new THREE.Vector3(rand(-0.9, 0.9), rand(-0.6, 1.1), rand(-0.6, 0.6)));
      const dir = d.pos.clone().sub(origin).normalize();
      const speed = rand(1.6, 6.5);
      d.vel.set(dir.x * speed + rand(-1, 1), rand(0.5, 4.5), dir.z * speed + rand(-1, 1));
      d.rot.set(rand(0, 6), rand(0, 6), rand(0, 6));
      d.rotVel.set(rand(-8, 8), rand(-8, 8), rand(-8, 8));
      d.scale = rand(0.5, 1.8);
      d.maxLife = rand(1.4, 2.8);
      d.life = d.maxLife;
      this.mesh.setColorAt(i, colors[Math.floor(Math.random() * colors.length)]);
    });
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    this.data.forEach((d, i) => {
      if (!d.active) return;
      d.life -= dt;
      if (d.life <= 0) {
        d.active = false;
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.setScalar(0.001);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        return;
      }
      d.vel.y -= 5.2 * dt;
      d.pos.addScaledVector(d.vel, dt);
      d.rot.x += d.rotVel.x * dt;
      d.rot.y += d.rotVel.y * dt;
      d.rot.z += d.rotVel.z * dt;
      const fade = Math.min(1, d.life / 0.45);
      this.dummy.position.copy(d.pos);
      this.dummy.rotation.copy(d.rot);
      this.dummy.scale.setScalar(d.scale * fade);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

function buildFlowerGeometries() {
  const stemParts = [];
  const stem = new THREE.CylinderGeometry(0.012, 0.02, 0.44, 6);
  stem.translate(0, 0.22, 0);
  stemParts.push(stem);

  for (const side of [-1, 1]) {
    const leaf = new THREE.SphereGeometry(0.09, 8, 6);
    leaf.scale(1.2, 0.16, 0.45);
    leaf.rotateZ(side * 0.55);
    leaf.translate(side * 0.08, 0.16 + (side > 0 ? 0.08 : 0.02), 0);
    stemParts.push(leaf);
  }

  const petalParts = [];
  const petalCount = 6;
  const tilt = new THREE.Matrix4().makeRotationX(-0.5);
  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    const petal = new THREE.SphereGeometry(0.1, 10, 8);
    petal.scale(1.35, 0.24, 0.6);
    const m = new THREE.Matrix4();
    const rot = new THREE.Matrix4().makeRotationY(a);
    const trans = new THREE.Matrix4().makeTranslation(0.105, 0, 0);
    m.multiply(rot).multiply(trans);
    petal.applyMatrix4(m);
    petal.applyMatrix4(tilt);
    petal.translate(0, 0.45, 0);
    petalParts.push(petal);
  }
  return {
    stem: mergeGeometries(stemParts, false),
    petals: mergeGeometries(petalParts, false),
  };
}

class FlowerField {
  constructor(group, palette) {
    this.group = group;
    this.geometries = buildFlowerGeometries();
    this.stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f7a4a,
      roughness: 0.5,
      metalness: 0.2,
      emissive: 0x0a2a14,
      emissiveIntensity: 0.6,
    });
    this.slots = [];
    for (let i = 0; i < 16; i++) {
      const holder = new THREE.Group();
      holder.visible = false;
      const stemMesh = new THREE.Mesh(this.geometries.stem, this.stemMaterial);
      const petalMat = new THREE.MeshStandardMaterial({
        color: palette.skyMid,
        roughness: 0.25,
        metalness: 0.5,
        emissive: palette.skyMid,
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
      });
      const petals = new THREE.Mesh(this.geometries.petals, petalMat);
      const centerMat = new THREE.MeshBasicMaterial({ color: palette.halo, toneMapped: false });
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), centerMat);
      center.position.y = 0.45;
      holder.add(stemMesh, petals, center);
      group.add(holder);
      this.slots.push({
        holder,
        petalMat,
        centerMat,
        active: false,
        grow: 0,
        wither: false,
        baseScale: 1,
        phase: rand(0, 6),
        pos: new THREE.Vector3(),
        colorIndex: 0,
        age: 0,
      });
    }
    this.palette = palette;
  }

  spawn(count, palette) {
    this.palette = palette;
    let spawned = 0;
    for (const slot of this.slots) {
      if (spawned >= count) break;
      if (slot.active && !slot.wither) continue;
      const a = rand(0, Math.PI * 2);
      const r = rand(0.55, 1.28);
      slot.pos.set(Math.cos(a) * r, -1.19, Math.sin(a) * r);
      slot.holder.position.copy(slot.pos);
      slot.holder.rotation.y = rand(0, Math.PI * 2);
      slot.holder.visible = true;
      slot.active = true;
      slot.wither = false;
      slot.grow = 0.001;
      slot.age = 0;
      slot.baseScale = rand(0.6, 1.15);
      slot.phase = rand(0, 6);
      slot.colorIndex = Math.floor(Math.random() * 3);
      this.tint(slot);
      spawned++;
    }
    return spawned;
  }

  tint(slot) {
    const p = this.palette;
    const colors = [p.skyMid, p.skyAccent, p.heart, p.halo];
    slot.petalMat.color.set(colors[slot.colorIndex % colors.length]);
    slot.petalMat.emissive.set(colors[slot.colorIndex % colors.length]);
    slot.centerMat.color.set(p.halo);
  }

  setPalette(palette) {
    this.palette = palette;
    this.slots.forEach((s) => this.tint(s));
  }

  witherAll() {
    this.slots.forEach((s) => {
      if (s.active) s.wither = true;
    });
  }

  update(dt, time) {
    this.slots.forEach((s) => {
      if (!s.active) return;
      s.age += dt;
      if (s.wither) {
        s.grow -= dt * 1.8;
        if (s.grow <= 0) {
          s.grow = 0;
          s.active = false;
          s.holder.visible = false;
          return;
        }
      } else if (s.grow < 1) {
        s.grow = Math.min(1, s.grow + dt * 2.2);
      }
      const g = s.grow < 1 ? 1 - Math.pow(1 - s.grow, 3) : 1;
      const sway = Math.sin(time * 1.2 + s.phase) * 0.06;
      s.holder.scale.setScalar(s.baseScale * g);
      s.holder.rotation.z = sway * 0.5;
      s.holder.rotation.x = Math.cos(time * 0.9 + s.phase) * 0.03;
      s.holder.position.y = -1.19 + Math.sin(time * 1.4 + s.phase) * 0.008;
    });
  }
}

function wingShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.02);
  shape.bezierCurveTo(0.1, 0.16, 0.24, 0.3, 0.27, 0.16);
  shape.bezierCurveTo(0.3, 0.03, 0.2, -0.1, 0.06, -0.07);
  shape.bezierCurveTo(0.02, -0.06, 0.005, -0.02, 0, 0.02);
  return shape;
}

class ButterflySwarm {
  constructor(group, palette) {
    this.palette = palette;
    this.wingGeo = new THREE.ShapeGeometry(wingShape(), 12);
    this.bodyGeo = new THREE.CapsuleGeometry(0.011, 0.075, 4, 8);
    this.bodyMat = new THREE.MeshBasicMaterial({ color: 0x1b0726, toneMapped: false });
    this.slots = [];
    for (let i = 0; i < 12; i++) {
      const holder = new THREE.Group();
      holder.visible = false;
      const body = new THREE.Mesh(this.bodyGeo, this.bodyMat);
      body.rotation.x = Math.PI / 2;
      const leftMat = new THREE.MeshBasicMaterial({
        color: palette.skyMid,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const rightMat = leftMat.clone();
      const left = new THREE.Mesh(this.wingGeo, leftMat);
      const right = new THREE.Mesh(this.wingGeo, rightMat);
      left.scale.x = -1;
      left.position.z = 0;
      holder.add(body, left, right);
      group.add(holder);
      this.slots.push({
        holder,
        left,
        right,
        leftMat,
        rightMat,
        active: false,
        grow: 0,
        fade: 1,
        radius: 1.5,
        height: 0.6,
        angle: 0,
        speed: 0.4,
        phase: rand(0, 6),
        size: 0.7,
        colorIndex: 0,
      });
    }
  }

  spawn(count, palette) {
    this.palette = palette;
    let spawned = 0;
    for (const s of this.slots) {
      if (spawned >= count) break;
      if (s.active && s.fade > 0.9) continue;
      s.active = true;
      s.holder.visible = true;
      s.grow = 0.001;
      s.fade = 1;
      s.radius = rand(1.25, 2.35);
      s.height = rand(0.1, 1.45);
      s.angle = rand(0, Math.PI * 2);
      s.speed = rand(0.3, 0.75) * (Math.random() > 0.5 ? 1 : -1);
      s.phase = rand(0, 6);
      s.size = rand(0.7, 1.2);
      s.colorIndex = Math.floor(Math.random() * 3);
      this.tint(s);
      spawned++;
    }
    return spawned;
  }

  tint(s) {
    const p = this.palette;
    const colors = [p.skyMid, p.skyAccent, p.halo, p.heart];
    const c = colors[s.colorIndex % colors.length];
    s.leftMat.color.set(c);
    s.rightMat.color.set(c);
  }

  setPalette(palette) {
    this.palette = palette;
    this.slots.forEach((s) => this.tint(s));
  }

  scatter() {
    this.slots.forEach((s) => {
      if (s.active) s.fade = 0.999;
    });
  }

  update(dt, time) {
    this.slots.forEach((s) => {
      if (!s.active) return;
      s.angle += s.speed * dt;
      if (s.fade < 1) {
        s.fade -= dt * 1.2;
        if (s.fade <= 0) {
          s.active = false;
          s.holder.visible = false;
          return;
        }
      } else if (s.grow < 1) {
        s.grow = Math.min(1, s.grow + dt * 2.5);
      }
      const r = s.radius + Math.sin(time * 0.5 + s.phase) * 0.12;
      const x = Math.cos(s.angle) * r;
      const z = Math.sin(s.angle) * r - 0.2;
      const y = s.height + Math.sin(time * 1.7 + s.phase) * 0.18;
      s.holder.position.set(x, y, z);
      s.holder.rotation.y = -s.angle + Math.PI / 2;
      s.holder.rotation.z = Math.sin(time * 1.3 + s.phase) * 0.12;
      const flap = Math.sin(time * 11 + s.phase) * 0.85 + 0.25;
      s.left.rotation.z = -flap;
      s.right.rotation.z = flap;
      const g = 1 - Math.pow(1 - s.grow, 3);
      s.holder.scale.setScalar(s.size * g * s.fade);
      s.leftMat.opacity = 0.85 * s.fade;
      s.rightMat.opacity = 0.85 * s.fade;
    });
  }
}

class Lightning {
  constructor(group) {
    this.items = [];
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9 * 3), 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xff3b6b,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      group.add(line);
      this.items.push({ line, geo, mat, active: false, t: 0, dur: 0 });
    }
  }

  strike(color) {
    this.items.forEach((item, i) => {
      const pos = item.geo.attributes.position.array;
      const startX = rand(-3.2, 3.2);
      const startZ = rand(-2.2, 0.4);
      let x = startX;
      let z = startZ;
      for (let p = 0; p < 9; p++) {
        const y = 5.2 - (p / 8) * 6.8;
        pos[p * 3] = x;
        pos[p * 3 + 1] = y;
        pos[p * 3 + 2] = z;
        x += rand(-0.4, 0.4);
        z += rand(-0.3, 0.3);
      }
      item.geo.attributes.position.needsUpdate = true;
      item.mat.color.set(color);
      item.active = true;
      item.t = 0;
      item.dur = 0.22 + Math.random() * 0.22;
      item.line.visible = true;
      item.line.position.set(0, 0, 0);
    });
  }

  update(dt) {
    this.items.forEach((item) => {
      if (!item.active) return;
      item.t += dt;
      const p = item.t / item.dur;
      item.mat.opacity = p < 1 ? (Math.random() > 0.4 ? 0.9 : 0.2) : 0;
      if (p >= 1) {
        item.active = false;
        item.line.visible = false;
      }
    });
  }
}

export class DivineEffects {
  constructor(scene, camera, palette) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.camera = camera;
    this.palette = palette;
    this.particles = new ParticleField(this.group);
    this.shockwaves = new Shockwaves(this.group, camera);
    this.shards = new ShardBurst(this.group, palette);
    this.flowers = new FlowerField(this.group, palette);
    this.butterflies = new ButterflySwarm(this.group, palette);
    this.lightning = new Lightning(this.group);
    this.origin = new THREE.Vector3(0, 0.25, 0.1);
    this.time = 0;
  }

  setPalette(palette) {
    this.palette = palette;
    this.flowers.setPalette(palette);
    this.butterflies.setPalette(palette);
  }

  create(palette, origin = this.origin) {
    this.setPalette(palette);
    this.particles.burst(origin, 170, palette, { speed: 3.4, size: 1.15, life: 1.6, gravity: 0.35 });
    this.particles.burst(new THREE.Vector3(0, -1.15, 0.3), 90, palette, {
      speed: 2.2,
      size: 0.9,
      life: 1.9,
      gravity: -0.2,
    });
    this.shockwaves.spawn(new THREE.Vector3(0, -1.16, 0), palette.skyAccent, {
      duration: 1.1,
      scale: 4.6,
      opacity: 0.8,
    });
    this.shockwaves.spawn(origin.clone().add(new THREE.Vector3(0, 0.6, 0)), palette.halo, {
      duration: 0.9,
      scale: 2.2,
      faceCamera: true,
      opacity: 0.55,
    });
    this.flowers.spawn(5, palette);
    this.butterflies.spawn(6, palette);
  }

  destroy(palette, origin = this.origin) {
    this.setPalette(palette);
    this.particles.burst(origin, 260, palette, {
      speed: 6.5,
      size: 1.5,
      life: 1.8,
      gravity: 1.4,
      colors: [0xff2b4a, 0xff8a2f, 0xffffff, palette.skyMid],
    });
    this.shards.burst(origin.clone().add(new THREE.Vector3(0, 0.25, 0)), palette);
    this.shockwaves.spawn(new THREE.Vector3(0, -1.15, 0), 0xff2b4a, {
      duration: 1.2,
      scale: 7,
      opacity: 0.95,
    });
    this.shockwaves.spawn(origin.clone().add(new THREE.Vector3(0, 0.4, 0)), 0xff5f6f, {
      duration: 0.7,
      scale: 3.4,
      faceCamera: true,
      opacity: 0.8,
    });
    this.lightning.strike(0xff4f6f);
    this.flowers.witherAll();
    this.butterflies.scatter();
  }

  change(palette, origin = this.origin) {
    this.setPalette(palette);
    this.particles.burst(origin, 150, palette, {
      speed: 3.6,
      size: 1.05,
      life: 1.4,
      gravity: 0.2,
      colors: [palette.skyAccent, palette.skyMid, 0xffffff, palette.halo],
    });
    this.shockwaves.spawn(origin.clone().add(new THREE.Vector3(0, 0.5, 0)), palette.skyAccent, {
      duration: 0.85,
      scale: 3.2,
      faceCamera: true,
      opacity: 0.7,
    });
  }

  bless(position, palette) {
    this.setPalette(palette);
    this.particles.burst(position, 70, palette, {
      speed: 2.4,
      size: 1.2,
      life: 1.2,
      gravity: 0.15,
      colors: [palette.halo, palette.skyAccent, 0xffffff],
    });
    this.shockwaves.spawn(position, palette.halo, {
      duration: 0.75,
      scale: 1.6,
      faceCamera: true,
      opacity: 0.75,
    });
  }

  update(dt, elapsed) {
    this.time = elapsed;
    this.particles.update(dt);
    this.shockwaves.update(dt);
    this.shards.update(dt);
    this.flowers.update(dt, elapsed);
    this.butterflies.update(dt, elapsed);
    this.lightning.update(dt);
  }
}
