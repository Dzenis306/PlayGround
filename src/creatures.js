import * as THREE from 'three';

const EYE_WHITE = new THREE.MeshBasicMaterial({ color: 0xfff3fd, toneMapped: false });
const PUPIL = new THREE.MeshBasicMaterial({ color: 0x120016 });
const SPARK = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const MOUTH = new THREE.MeshStandardMaterial({ color: 0x3a002c, roughness: 0.22, metalness: 0.5 });
const BLUSH = new THREE.MeshBasicMaterial({ color: 0xff5fa8, transparent: true, opacity: 0.52, depthWrite: false });
const CENTER = new THREE.MeshPhysicalMaterial({
  color: 0xfff0fb,
  metalness: 0.45,
  roughness: 0.15,
  clearcoat: 1,
  iridescence: 0.8,
  envMapIntensity: 1.5
});

const eyeWhiteGeo = new THREE.SphereGeometry(1, 18, 14);
const pupilGeo = new THREE.SphereGeometry(1, 14, 12);
const sparkGeo = new THREE.SphereGeometry(1, 10, 8);
const mouthGeo = new THREE.TorusGeometry(0.055, 0.013, 6, 16, Math.PI);
const blushGeo = new THREE.CircleGeometry(0.07, 16);
const footGeo = new THREE.SphereGeometry(0.1, 16, 12);
const petalGeo = new THREE.SphereGeometry(1, 20, 14);

function makeBlobGeometry() {
  const geometry = new THREE.SphereGeometry(0.5, 48, 34);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);
    const noise = 1 + 0.055 * Math.sin(vertex.x * 7.2 + 1.4) * Math.sin(vertex.y * 6.1 - 0.6) * Math.sin(vertex.z * 5.4 + 2.2);
    vertex.multiplyScalar(noise);
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeStarGeometry() {
  const shape = new THREE.Shape();
  const points = 10;
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? 0.52 : 0.23;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    curveSegments: 2
  });
  geometry.center();
  return geometry;
}

const BLOB_GEO = makeBlobGeometry();
const STAR_GEO = makeStarGeometry();

function makeShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0,0,0,0.72)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0.34)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SHADOW_TEXTURE = makeShadowTexture();
const SHADOW_MATERIAL = new THREE.MeshBasicMaterial({
  map: SHADOW_TEXTURE,
  transparent: true,
  depthWrite: false,
  opacity: 0.4
});
const SHADOW_GEO = new THREE.PlaneGeometry(1, 1);

const TYPE_WEIGHTS = [
  { type: 'blob', weight: 0.5 },
  { type: 'star', weight: 0.26 },
  { type: 'flower', weight: 0.24 }
];

function pickType() {
  const roll = Math.random();
  let sum = 0;
  for (const entry of TYPE_WEIGHTS) {
    sum += entry.weight;
    if (roll <= sum) return entry.type;
  }
  return 'blob';
}

function easeOutBack(value) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = value - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

class Creature {
  constructor(type, color, home, scale, shadowRoot) {
    this.type = type;
    this.baseScale = scale;
    this.home = home.clone();
    this.phase = Math.random() * Math.PI * 2;
    this.speed = 0.55 + Math.random() * 0.55;
    this.drift = 0.09 + Math.random() * 0.16;
    this.spawn = 0;
    this.spawnDuration = 0.72 + Math.random() * 0.18;
    this.pulse = 0;
    this.blink = 2 + Math.random() * 4;
    this.blinking = 0;
    this.targetColor = new THREE.Color(color);
    this.spin = (Math.random() - 0.5) * 0.7;
    this.eyes = [];

    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: 0.02,
      roughness: 0.34,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      sheen: 0.9,
      sheenColor: new THREE.Color(0xffffff),
      sheenRoughness: 0.3,
      iridescence: 0.7,
      iridescenceIOR: 1.35,
      iridescenceThicknessMinimum: 100,
      iridescenceThicknessMaximum: 500,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.14,
      envMapIntensity: 0.48
    });

    this.group = new THREE.Group();
    this.group.position.copy(home);
    this.group.scale.setScalar(0.001);

    if (type === 'star') this.buildStar();
    else if (type === 'flower') this.buildFlower();
    else this.buildBlob();

    this.shadow = new THREE.Mesh(SHADOW_GEO, SHADOW_MATERIAL.clone());
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(home.x, 0.02, home.z);
    this.shadow.scale.setScalar(scale * 1.25);
    this.shadow.renderOrder = 2;
    shadowRoot.add(this.shadow);
  }

  addEyes(z, y, spread, scale = 1) {
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * spread, y, z);
      eye.rotation.y = side * 0.16;

      const white = new THREE.Mesh(eyeWhiteGeo, EYE_WHITE);
      white.scale.set(0.105 * scale, 0.13 * scale, 0.06 * scale);
      eye.add(white);

      const pupil = new THREE.Mesh(pupilGeo, PUPIL);
      pupil.position.set(0, 0.004, 0.055 * scale);
      pupil.scale.set(0.052 * scale, 0.075 * scale, 0.03 * scale);
      eye.add(pupil);

      const spark = new THREE.Mesh(sparkGeo, SPARK);
      spark.position.set(-side * 0.025 * scale, 0.03 * scale, 0.075 * scale);
      spark.scale.setScalar(0.024 * scale);
      eye.add(spark);

      this.group.add(eye);
      this.eyes.push(eye);
    }
  }

  addMouth(z, y, scale = 1) {
    const mouth = new THREE.Mesh(mouthGeo, MOUTH);
    mouth.position.set(0, y, z);
    mouth.rotation.z = Math.PI;
    mouth.scale.setScalar(scale);
    this.group.add(mouth);
  }

  addBlush(z, y, spread, scale = 1) {
    for (const side of [-1, 1]) {
      const blush = new THREE.Mesh(blushGeo, BLUSH);
      blush.position.set(side * spread, y, z);
      blush.rotation.y = side * 0.25;
      blush.scale.setScalar(scale);
      this.group.add(blush);
    }
  }

  buildBlob() {
    const body = new THREE.Mesh(BLOB_GEO, this.bodyMat);
    body.scale.set(1, 0.92, 1);
    this.group.add(body);
    this.body = body;

    this.addEyes(0.445, 0.075, 0.175, 1);
    this.addMouth(0.49, -0.12, 1);
    this.addBlush(0.43, -0.03, 0.3, 0.95);

    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(footGeo, this.bodyMat);
      foot.position.set(side * 0.19, -0.46, 0.12);
      foot.scale.set(1.1, 0.65, 1.2);
      this.group.add(foot);
    }

    if (Math.random() < 0.45) {
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.18, 6, 10), this.bodyMat);
        ear.position.set(side * 0.17, 0.52, -0.02);
        ear.rotation.z = side * -0.22;
        this.group.add(ear);
      }
    }

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.22, 6), this.bodyMat);
    antenna.position.set(0, 0.63, 0);
    this.group.add(antenna);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    bulb.position.set(0, 0.76, 0);
    this.group.add(bulb);
  }

  buildStar() {
    const body = new THREE.Mesh(STAR_GEO, this.bodyMat);
    body.scale.setScalar(1.08);
    this.group.add(body);
    this.body = body;

    this.addEyes(0.1, 0.05, 0.14, 0.72);
    this.addMouth(0.105, -0.09, 0.7);
    this.addBlush(0.1, -0.01, 0.24, 0.62);
  }

  buildFlower() {
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.29, 28, 20), CENTER);
    this.group.add(center);
    this.body = center;

    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, this.bodyMat);
      petal.position.set(Math.cos(angle) * 0.37, Math.sin(angle) * 0.37, -0.03);
      petal.scale.set(0.17, 0.29, 0.075);
      petal.rotation.z = angle;
      this.group.add(petal);
    }

    this.addEyes(0.255, 0.06, 0.12, 0.68);
    this.addMouth(0.27, -0.055, 0.62);
    this.addBlush(0.245, 0.0, 0.21, 0.55);
  }

  setTargetColor(color) {
    this.targetColor.set(color);
  }

  update(dt, t, camera) {
    this.spawn = Math.min(1, this.spawn + dt / this.spawnDuration);
    this.pulse = Math.max(0, this.pulse - dt * 2.1);
    this.blink -= dt;

    if (this.blink <= 0) {
      this.blinking = 1;
      this.blink = 2.8 + Math.random() * 4.5;
    }
    if (this.blinking > 0) {
      this.blinking = Math.max(0, this.blinking - dt * 7);
    }

    const driftX = Math.sin(t * this.speed + this.phase) * this.drift;
    const driftZ = Math.cos(t * this.speed * 0.8 + this.phase * 1.4) * this.drift;
    this.group.position.set(
      this.home.x + driftX,
      this.home.y + Math.sin(t * 1.55 + this.phase) * 0.08,
      this.home.z + driftZ
    );

    const targetRotation = Math.atan2(camera.position.x - this.group.position.x, camera.position.z - this.group.position.z);
    this.group.rotation.y = targetRotation;
    if (this.type === 'star' || this.type === 'flower') {
      this.group.rotation.z = Math.sin(t * 0.6 + this.phase) * 0.14 + (this.type === 'star' ? t * this.spin : 0);
    } else {
      this.group.rotation.z = Math.sin(t * 0.8 + this.phase) * 0.03;
    }

    const spawnScale = easeOutBack(this.spawn);
    const pulseScale = 1 + Math.sin(this.pulse * Math.PI) * 0.22;
    this.group.scale.setScalar(this.baseScale * Math.max(0.001, spawnScale) * pulseScale);

    const colorBlend = 1 - Math.exp(-dt * 4.5);
    this.bodyMat.color.lerp(this.targetColor, colorBlend);
    this.bodyMat.emissive.copy(this.bodyMat.color).multiplyScalar(0.14);

    for (const eye of this.eyes) {
      eye.scale.y = 1 - this.blinking * 0.9;
    }

    const height = Math.max(0.2, this.group.position.y);
    this.shadow.position.set(this.group.position.x, 0.022, this.group.position.z);
    this.shadow.scale.setScalar(this.baseScale * (1.3 + height * 0.18));
    this.shadow.material.opacity = 0.34 * (1 - Math.min(0.65, height * 0.06));
  }

  dispose() {
    this.group.removeFromParent();
    this.shadow.removeFromParent();
    this.shadow.material.dispose();
    this.bodyMat.dispose();
  }
}

export class CreatureManager {
  constructor(scene, palette) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.shadowRoot = new THREE.Group();
    this.root.name = 'creatures';
    scene.add(this.root, this.shadowRoot);
    this.creatures = [];
    this.palette = palette;
    this.max = 18;
  }

  setPalette(palette) {
    this.palette = palette;
  }

  spawnAt(x, y, z, options = {}) {
    if (this.creatures.length >= this.max) return null;
    const type = options.type || pickType();
    const colors = this.palette.creature;
    const color = options.color || colors[Math.floor(Math.random() * colors.length)];
    const scale = options.scale || 0.56 + Math.random() * 0.2;
    const home = new THREE.Vector3(
      x + (Math.random() - 0.5) * 0.5,
      y + (Math.random() - 0.5) * 0.12,
      z + (Math.random() - 0.5) * 0.5
    );
    const creature = new Creature(type, color, home, scale, this.shadowRoot);
    this.root.add(creature.group);
    this.creatures.push(creature);
    return creature;
  }

  createAt(point) {
    return this.spawnAt(point.x, 0.72 + Math.random() * 0.22, point.z);
  }

  seed() {
    const spots = [
      [2.35, 0.78, 0.7],
      [-2.55, 0.74, 0.2],
      [1.5, 0.7, -1.9],
      [-1.85, 0.82, -1.5],
      [3.35, 0.62, -0.55],
      [-3.25, 0.68, 1.25]
    ];
    const types = ['blob', 'flower', 'blob', 'star', 'blob', 'flower'];
    spots.forEach(([x, y, z], index) => {
      this.spawnAt(x, y, z, {
        type: types[index],
        scale: 0.58 + (index % 3) * 0.08,
        color: this.palette.creature[index % this.palette.creature.length]
      });
    });
  }

  destroyNear(point, radius) {
    const destroyed = [];
    for (let i = this.creatures.length - 1; i >= 0; i -= 1) {
      const creature = this.creatures[i];
      const dx = creature.group.position.x - point.x;
      const dz = creature.group.position.z - point.z;
      if (Math.hypot(dx, dz) <= radius) {
        destroyed.push({
          position: creature.group.position.clone(),
          color: creature.bodyMat.color.clone(),
          scale: creature.baseScale
        });
        creature.dispose();
        this.creatures.splice(i, 1);
      }
    }
    return destroyed;
  }

  change(palette) {
    this.setPalette(palette);
    const colors = palette.creature;
    this.creatures.forEach((creature, index) => {
      creature.setTargetColor(colors[(index + Math.floor(Math.random() * colors.length)) % colors.length]);
      creature.pulse = 1;
      creature.spin = (Math.random() - 0.5) * 1.2;
      creature.home.x += (Math.random() - 0.5) * 0.5;
      creature.home.z += (Math.random() - 0.5) * 0.5;
    });
  }

  reset() {
    for (const creature of this.creatures) creature.dispose();
    this.creatures.length = 0;
    this.seed();
  }

  update(dt, t, camera) {
    for (const creature of this.creatures) creature.update(dt, t, camera);
  }

  get count() {
    return this.creatures.length;
  }
}
