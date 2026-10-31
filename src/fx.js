import * as THREE from 'three';

const MAX_PARTICLES = 2600;
const MAX_SHARDS = 420;

function makeHeartTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.translate(64, 68);
  context.scale(1.15, 1.15);
  context.beginPath();
  context.moveTo(0, 30);
  context.bezierCurveTo(-48, -10, -42, -52, -14, -52);
  context.bezierCurveTo(-4, -52, 0, -44, 0, -36);
  context.bezierCurveTo(0, -44, 4, -52, 14, -52);
  context.bezierCurveTo(42, -52, 48, -10, 0, 30);
  const gradient = context.createLinearGradient(-40, -50, 40, 30);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.4, '#ffb4ec');
  gradient.addColorStop(1, '#ff2fa8');
  context.fillStyle = gradient;
  context.shadowColor = 'rgba(255, 95, 210, 0.9)';
  context.shadowBlur = 18;
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

class ParticleField {
  constructor(scene) {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.alphas = new Float32Array(MAX_PARTICLES);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.life = new Float32Array(MAX_PARTICLES);
    this.maxLife = new Float32Array(MAX_PARTICLES);
    this.gravity = new Float32Array(MAX_PARTICLES);
    this.drag = new Float32Array(MAX_PARTICLES);
    this.baseSize = new Float32Array(MAX_PARTICLES);
    this.cursor = 0;
    this.ambientTimer = 0;
    this.ambientColors = [new THREE.Color(0xffffff), new THREE.Color(0xff8ae8), new THREE.Color(0x7df9ff)];

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uPixelRatio: { value: 1 } },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (520.0 / max(0.2, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          float core = smoothstep(0.5, 0.03, d);
          float cross = max(0.0, 1.0 - abs(p.x) * 16.0) * max(0.0, 1.0 - abs(p.y) * 2.2)
                      + max(0.0, 1.0 - abs(p.y) * 16.0) * max(0.0, 1.0 - abs(p.x) * 2.2);
          float alpha = core * 0.82 + cross * 0.38;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha * vAlpha);
        }
      `
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);
  }

  setPixelRatio(value) {
    this.material.uniforms.uPixelRatio.value = value;
  }

  setColors(colors) {
    this.ambientColors = colors;
  }

  spawnBurst(origin, colors, count = 100, options = {}) {
    const {
      speed = 2.6,
      spread = 1,
      life = 1.2,
      size = 0.16,
      gravity = -1.2,
      drag = 0.94,
      upBias = 0.25
    } = options;
    const palette = colors && colors.length ? colors : this.ambientColors;

    for (let n = 0; n < count; n += 1) {
      const index = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;
      const i3 = index * 3;
      const angle = Math.random() * Math.PI * 2;
      const horizontal = Math.random() * speed * spread;
      const vertical = (Math.random() - 0.5 + upBias) * speed;
      const color = palette[Math.floor(Math.random() * palette.length)];

      this.positions[i3] = origin.x + (Math.random() - 0.5) * 0.22;
      this.positions[i3 + 1] = origin.y + (Math.random() - 0.5) * 0.22;
      this.positions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.22;
      this.velocities[i3] = Math.cos(angle) * horizontal;
      this.velocities[i3 + 1] = vertical;
      this.velocities[i3 + 2] = Math.sin(angle) * horizontal;
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
      this.sizes[index] = size * (0.55 + Math.random() * 0.9);
      this.baseSize[index] = this.sizes[index];
      this.life[index] = life * (0.7 + Math.random() * 0.7);
      this.maxLife[index] = this.life[index];
      this.alphas[index] = 1;
      this.gravity[index] = gravity;
      this.drag[index] = drag;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aColor.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
  }

  spawnAmbient(t) {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    const i3 = index * 3;
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.8 + Math.random() * 6.4;
    const color = this.ambientColors[Math.floor(Math.random() * this.ambientColors.length)];

    this.positions[i3] = Math.cos(angle) * radius;
    this.positions[i3 + 1] = 0.15 + Math.random() * 5.4;
    this.positions[i3 + 2] = Math.sin(angle) * radius * 0.72;
    this.velocities[i3] = (Math.random() - 0.5) * 0.08;
    this.velocities[i3 + 1] = 0.05 + Math.random() * 0.12;
    this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.08;
    this.colors[i3] = color.r;
    this.colors[i3 + 1] = color.g;
    this.colors[i3 + 2] = color.b;
    this.sizes[index] = 0.025 + Math.random() * 0.05;
    this.baseSize[index] = this.sizes[index];
    this.life[index] = 3.5 + Math.random() * 3.5;
    this.maxLife[index] = this.life[index];
    this.alphas[index] = 0.75;
    this.gravity[index] = 0;
    this.drag[index] = 1;
  }

  update(dt) {
    this.ambientTimer += dt;
    if (this.ambientTimer > 0.06) {
      this.ambientTimer = 0;
      this.spawnAmbient();
    }

    for (let index = 0; index < MAX_PARTICLES; index += 1) {
      if (this.life[index] <= 0) continue;
      this.life[index] -= dt;
      const i3 = index * 3;

      if (this.life[index] <= 0) {
        this.alphas[index] = 0;
        continue;
      }

      const drag = Math.pow(this.drag[index], dt * 60);
      this.velocities[i3] *= drag;
      this.velocities[i3 + 1] = this.velocities[i3 + 1] * drag + this.gravity[index] * dt;
      this.velocities[i3 + 2] *= drag;

      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      if (this.positions[i3 + 1] < 0.04) {
        this.positions[i3 + 1] = 0.04;
        this.velocities[i3 + 1] *= -0.35;
      }

      const remaining = this.life[index] / this.maxLife[index];
      this.alphas[index] = Math.min(1, remaining * 3.2) * Math.min(1, (1 - remaining) * 8 + 0.2);
      this.sizes[index] = this.baseSize[index] * (0.55 + remaining * 0.7);
    }

    const attributes = this.points.geometry.attributes;
    attributes.position.needsUpdate = true;
    attributes.aSize.needsUpdate = true;
    attributes.aAlpha.needsUpdate = true;
  }
}

class Shockwaves {
  constructor(scene) {
    this.scene = scene;
    this.ringGeo = new THREE.RingGeometry(0.9, 1, 96);
    this.sphereGeo = new THREE.SphereGeometry(1, 24, 16);
    this.items = [];
  }

  ring(position, color, options = {}) {
    const { maxScale = 7, life = 0.9, opacity = 0.9, vertical = false, delay = 0 } = options;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(this.ringGeo, material);
    if (vertical) {
      mesh.position.set(position.x, position.y + 1.1, position.z);
    } else {
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(position.x, 0.035, position.z);
    }
    mesh.scale.setScalar(0.15);
    mesh.renderOrder = 3;
    this.scene.add(mesh);
    this.items.push({ mesh, age: -delay, life, maxScale, opacity, base: 0.15 });
  }

  sphere(position, color, options = {}) {
    const { maxScale = 5, life = 0.65, opacity = 0.55 } = options;
    const material = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(this.sphereGeo, material);
    mesh.position.copy(position);
    mesh.position.y += 1.0;
    mesh.scale.setScalar(0.25);
    mesh.renderOrder = 3;
    this.scene.add(mesh);
    this.items.push({ mesh, age: 0, life, maxScale, opacity, base: 0.25 });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      item.age += dt;
      if (item.age < 0) {
        item.mesh.visible = false;
        continue;
      }
      item.mesh.visible = true;
      const progress = Math.min(1, item.age / item.life);
      const eased = 1 - Math.pow(1 - progress, 2.2);
      item.mesh.scale.setScalar(item.base + eased * item.maxScale);
      item.mesh.material.opacity = item.opacity * Math.pow(1 - progress, 1.7);
      if (progress >= 1) {
        item.mesh.removeFromParent();
        item.mesh.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}

class Shards {
  constructor(scene) {
    this.scene = scene;
    this.dummy = new THREE.Object3D();
    this.items = [];
    this.cursor = 0;
    this.material = new THREE.MeshStandardMaterial({
      metalness: 0.65,
      roughness: 0.18,
      emissive: 0x160012,
      emissiveIntensity: 0.7
    });
    this.mesh = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.09, 0), this.material, MAX_SHARDS);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    const color = new THREE.Color(0xffffff);
    for (let i = 0; i < MAX_SHARDS; i += 1) {
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, color);
    }
    scene.add(this.mesh);
  }

  spawn(position, color, count = 14, scale = 1) {
    for (let n = 0; n < count; n += 1) {
      const index = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_SHARDS;
      const angle = Math.random() * Math.PI * 2;
      const speed = (1.2 + Math.random() * 3.8) * scale;
      this.items[index] = {
        position: new THREE.Vector3(position.x, position.y, position.z),
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 1.5 + Math.random() * 4.2, Math.sin(angle) * speed),
        rotation: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        spin: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
        life: 1.1 + Math.random() * 0.8,
        maxLife: 1.9,
        size: (0.65 + Math.random() * 0.9) * scale,
        color: color.clone()
      };
      this.mesh.setColorAt(index, color);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    let changed = false;
    for (let index = 0; index < MAX_SHARDS; index += 1) {
      const item = this.items[index];
      if (!item) continue;
      changed = true;
      item.life -= dt;
      if (item.life <= 0) {
        this.items[index] = null;
        this.dummy.position.set(0, -10, 0);
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(index, this.dummy.matrix);
        continue;
      }

      item.velocity.y -= 8.4 * dt;
      item.position.addScaledVector(item.velocity, dt);
      if (item.position.y < 0.05) {
        item.position.y = 0.05;
        item.velocity.y *= -0.38;
        item.velocity.x *= 0.82;
        item.velocity.z *= 0.82;
      }
      item.rotation.x += item.spin.x * dt;
      item.rotation.y += item.spin.y * dt;
      item.rotation.z += item.spin.z * dt;

      const fade = Math.min(1, item.life * 2.2);
      this.dummy.position.copy(item.position);
      this.dummy.rotation.copy(item.rotation);
      this.dummy.scale.setScalar(item.size * fade);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(index, this.dummy.matrix);
    }
    if (changed) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

class HeartSprites {
  constructor(scene) {
    this.scene = scene;
    this.texture = makeHeartTexture();
    this.items = [];
  }

  spawn(position, colors, count = 8) {
    for (let i = 0; i < count; i += 1) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const material = new THREE.SpriteMaterial({
        map: this.texture,
        color,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.95
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(
        position.x + (Math.random() - 0.5) * 0.8,
        position.y + 0.2 + Math.random() * 0.4,
        position.z + (Math.random() - 0.5) * 0.8
      );
      const scale = 0.16 + Math.random() * 0.16;
      sprite.scale.setScalar(scale);
      sprite.renderOrder = 4;
      this.scene.add(sprite);
      this.items.push({
        sprite,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.7 + Math.random() * 0.9, (Math.random() - 0.5) * 0.5),
        life: 1.4 + Math.random() * 1.2,
        maxLife: 2.6,
        scale,
        spin: (Math.random() - 0.5) * 2.4
      });
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      item.life -= dt;
      item.velocity.y += 0.25 * dt;
      item.sprite.position.addScaledVector(item.velocity, dt);
      item.sprite.material.rotation += item.spin * dt;
      item.sprite.scale.setScalar(item.scale * (1 + (1 - item.life / item.maxLife) * 0.45));
      item.sprite.material.opacity = Math.max(0, Math.min(0.95, item.life * 2.2));
      if (item.life <= 0) {
        item.sprite.removeFromParent();
        item.sprite.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}

class CursorRing {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    this.material = new THREE.MeshBasicMaterial({
      color: 0xff5fd2,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    this.dotMaterial = this.material.clone();

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.5, 64), this.material);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20), this.dotMaterial);
    const diamondGeo = new THREE.OctahedronGeometry(0.045, 0);
    this.group.add(ring, dot);
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * Math.PI * 2;
      const diamond = new THREE.Mesh(diamondGeo, this.dotMaterial);
      diamond.position.set(Math.cos(angle) * 0.63, Math.sin(angle) * 0.63, 0);
      this.group.add(diamond);
    }
    this.group.rotation.x = -Math.PI / 2;
    this.group.position.y = 0.04;
    this.group.renderOrder = 3;
    scene.add(this.group);
  }

  setColor(color) {
    this.material.color.set(color);
    this.dotMaterial.color.set(color);
  }

  setPosition(point) {
    this.group.position.set(point.x, 0.04, point.z);
  }

  setVisible(value) {
    this.group.visible = value;
  }

  update(t) {
    const pulse = 1 + Math.sin(t * 3.2) * 0.055;
    this.group.scale.setScalar(pulse);
    this.material.opacity = 0.7 + Math.sin(t * 2.4) * 0.12;
  }
}

export class FX {
  constructor(scene, renderer) {
    this.particles = new ParticleField(scene);
    this.shockwaves = new Shockwaves(scene);
    this.shards = new Shards(scene);
    this.hearts = new HeartSprites(scene);
    this.cursor = new CursorRing(scene);
    this.palette = null;
    this.setPixelRatio(renderer.getPixelRatio());
  }

  setPixelRatio(value) {
    this.particles.setPixelRatio(value);
  }

  setPalette(palette) {
    this.palette = palette;
    this.particles.setColors([
      new THREE.Color(0xffffff),
      new THREE.Color(palette.accent),
      new THREE.Color(palette.orbB),
      ...palette.creature.map((color) => new THREE.Color(color))
    ]);
    this.cursor.setColor(palette.accent);
  }

  setCursorColor(color) {
    this.cursor.setColor(color);
  }

  update(dt, t) {
    this.particles.update(dt);
    this.shockwaves.update(dt);
    this.shards.update(dt);
    this.hearts.update(dt);
    this.cursor.update(t);
  }
}
