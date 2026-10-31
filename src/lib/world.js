import * as THREE from "three";

const TAU = Math.PI * 2;

function canvasTexture(size, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSunTexture() {
  return canvasTexture(1024, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const cx = s / 2;
    const cy = s / 2;

    // A hot neon limb rather than a white core: this is the portal behind her,
    // bright enough to bloom but never bright enough to eat her silhouette.
    const ring = ctx.createRadialGradient(cx, cy, 0, cx, cy, s / 2);
    ring.addColorStop(0, "rgba(80,4,120,0)");
    ring.addColorStop(0.245, "rgba(90,8,130,0)");
    ring.addColorStop(0.3, "rgba(255,64,190,0.2)");
    ring.addColorStop(0.335, "rgba(255,112,222,0.75)");
    ring.addColorStop(0.352, "rgba(255,244,255,0.95)");
    ring.addColorStop(0.365, "rgba(255,72,204,0.72)");
    ring.addColorStop(0.4, "rgba(123,20,200,0.16)");
    ring.addColorStop(0.44, "rgba(52,6,94,0)");
    ring.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, s, s);

    ctx.globalCompositeOperation = "lighter";
    [
      [0.205, "rgba(111,247,255,0.32)", 2],
      [0.232, "rgba(255,90,210,0.4)", 1.5],
      [0.385, "rgba(111,247,255,0.18)", 1],
    ].forEach(([r, color, width]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, s * r, 0, TAU);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    });

    // Fine synthwave cuts along the lower half of the halo.
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(cx - s * 0.3, cy + s * (0.1 + i * 0.028), s * 0.6, s * 0.006);
    }
    ctx.globalCompositeOperation = "source-over";
  });
}

function createGlowTexture(color = "255,255,255") {
  return canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, `rgba(${color},1)`);
    g.addColorStop(0.16, `rgba(${color},0.9)`);
    g.addColorStop(0.5, `rgba(${color},0.25)`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

function makeEnvironment(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 0, 800);
  bg.addColorStop(0, "#08000f");
  bg.addColorStop(0.4, "#1a0329");
  bg.addColorStop(0.55, "#4b0b53");
  bg.addColorStop(0.7, "#12021d");
  bg.addColorStop(1, "#020005");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1600, 800);

  // Broad bright panels to create chrome highlights
  const panels = [
    { x: 180, y: 80, w: 420, h: 110, c: "#ff43b7", a: 0.9 },
    { x: 1000, y: 70, w: 380, h: 130, c: "#6ff7ff", a: 0.8 },
    { x: 620, y: 250, w: 310, h: 80, c: "#ffffff", a: 0.95 },
    { x: 40, y: 450, w: 310, h: 180, c: "#7a2cff", a: 0.65 },
    { x: 1220, y: 430, w: 320, h: 220, c: "#ff7adf", a: 0.55 },
    { x: 690, y: 580, w: 260, h: 100, c: "#d8ff5e", a: 0.35 },
  ];
  panels.forEach((p) => {
    const g = ctx.createRadialGradient(p.x + p.w / 2, p.y + p.h / 2, 0, p.x + p.w / 2, p.y + p.h / 2, p.w);
    g.addColorStop(0, p.c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = p.a;
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w * 2, p.h * 2);
  });
  ctx.globalAlpha = 1;

  // Thin light strips
  ctx.globalCompositeOperation = "lighter";
  const strips = [
    { y: 330, h: 4, c: "rgba(255,255,255,0.9)" },
    { y: 357, h: 2, c: "rgba(255,70,190,0.9)" },
    { y: 382, h: 2, c: "rgba(111,247,255,0.65)" },
  ];
  strips.forEach((s) => {
    const g = ctx.createLinearGradient(0, 0, 1600, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.2, s.c);
    g.addColorStop(0.8, s.c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, s.y, 1600, s.h);
  });
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}

export class World {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.time = 0;
    this.palette = {
      accent: new THREE.Color("#ff3fba"),
      accent2: new THREE.Color("#6ff7ff"),
      accent3: new THREE.Color("#b897ff"),
      acid: new THREE.Color("#d8ff5e"),
    };
    this.targetPalette = {
      accent: this.palette.accent.clone(),
      accent2: this.palette.accent2.clone(),
      accent3: this.palette.accent3.clone(),
      acid: this.palette.acid.clone(),
    };
    this.shake = 0;
    this.destruction = 0;
    this.build();
  }

  build() {
    this.scene.environment = makeEnvironment(this.renderer);

    this.scene.fog = new THREE.FogExp2(0x08000f, 0.022);

    this.ambient = new THREE.AmbientLight(0x7b58b8, 0.5);
    this.scene.add(this.ambient);

    const key = new THREE.PointLight(0xffd9f2, 48, 22, 2);
    key.position.set(2.8, 4.9, 4.5);
    this.scene.add(key);
    this.keyLight = key;

    const fill = new THREE.PointLight(0x79f4ff, 22, 20, 2);
    fill.position.set(-3.5, 3.4, 4.2);
    this.scene.add(fill);
    this.fillLight = fill;

    const rim = new THREE.PointLight(0xff79d0, 2.5, 18, 2);
    rim.position.set(-1.8, 4.6, -4);
    this.scene.add(rim);
    this.rimLight = rim;

    const floorLight = new THREE.PointLight(0xff3fba, 1.2, 9, 2);
    floorLight.position.set(0, 0.45, 1.2);
    this.scene.add(floorLight);
    this.floorLight = floorLight;

    this.buildSky();
    this.buildSun();
    this.buildFloor();
    this.buildSet();
    this.buildDust();
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(38, 48, 32);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color("#030006") },
        uBottom: { value: new THREE.Color("#1c0329") },
        uAccent: { value: this.palette.accent.clone() },
        uAccent2: { value: this.palette.accent2.clone() },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uBottom;
        uniform vec3 uAccent;
        uniform vec3 uAccent2;
        uniform float uTime;
        varying vec3 vWorld;
        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }
        void main() {
          vec3 d = normalize(vWorld);
          float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(uBottom, uTop, smoothstep(0.05, 0.85, h));
          float horizon = exp(-pow((d.y + 0.035) * 5.4, 2.0));
          col += uAccent * horizon * 0.28;
          float ang = atan(d.z, d.x);
          float beams = pow(max(0.0, sin(ang * 19.0 + uTime * 0.045)), 24.0);
          beams *= smoothstep(0.35, 0.02, abs(d.y - 0.2));
          col += mix(uAccent, uAccent2, 0.5) * beams * 0.07;
          float upper = smoothstep(0.08, 0.95, d.y);
          col += uAccent2 * upper * 0.018;
          float grain = hash(gl_FragCoord.xy + uTime) * 0.012;
          gl_FragColor = vec4(col + grain, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.scene.add(this.sky);

    // Stars
    const count = 900;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = 18 + Math.random() * 16;
      const theta = Math.random() * TAU;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.cos(phi) * r * 0.7 + 3;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
      color.set(i % 7 === 0 ? "#ff91dd" : i % 5 === 0 ? "#8df9ff" : "#f3eaff");
      color.multiplyScalar(0.35 + Math.random() * 0.65);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 0.055,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        map: createGlowTexture("255,255,255"),
        toneMapped: false,
      })
    );
    this.scene.add(this.stars);
  }

  buildSun() {
    const tex = createSunTexture();
    this.sunMat = new THREE.SpriteMaterial({
      map: tex,
      color: "#ffffff",
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    this.sun = new THREE.Sprite(this.sunMat);
    this.sun.position.set(0.9, 4.9, -8.6);
    this.sun.scale.set(6.9, 6.9, 1);
    this.sun.renderOrder = -2;
    this.scene.add(this.sun);

    // A dark eclipse disc in front of the sun
    const eclipse = new THREE.Mesh(
      new THREE.CircleGeometry(0.96, 100),
      new THREE.MeshBasicMaterial({ color: "#08000f", transparent: true, opacity: 0.55 })
    );
    eclipse.position.set(0.9, 4.9, -8.57);
    eclipse.renderOrder = -1;
    eclipse.visible = false;
    this.scene.add(eclipse);
    this.eclipse = eclipse;

    const ringMat = new THREE.MeshBasicMaterial({
      color: "#ff70cf",
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.portalRings = [];
    [
      [1.55, 0.008],
      [2.3, 0.005],
      [3.2, 0.004],
    ].forEach(([r, tube], i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 4, 180), ringMat.clone());
      ring.position.set(0.9, 4.9, -8.54 + i * 0.01);
      ring.userData.spin = (i + 1) * 0.025 * (i % 2 ? -1 : 1);
      this.scene.add(ring);
      this.portalRings.push(ring);
    });

    // Giant architectural arcs behind the scene
    const arcMat = new THREE.MeshBasicMaterial({
      color: "#b06bff",
      transparent: true,
      opacity: 0.31,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.bigRings = [];
    [
      { r: 5.1, y: 2.2, z: -4.8, rot: 0.05, color: "#b06bff", opacity: 0.22 },
      { r: 6.4, y: 1.9, z: -6.3, rot: -0.11, color: "#6ff7ff", opacity: 0.16 },
    ].forEach((spec, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(spec.r, 0.014, 5, 200),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: spec.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      ring.position.set(0.4, spec.y, spec.z);
      ring.rotation.z = spec.rot;
      ring.userData.spin = i % 2 ? -0.014 : 0.01;
      this.scene.add(ring);
      this.bigRings.push(ring);
    });
  }

  buildFloor() {
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x06010b,
      metalness: 1,
      roughness: 0.09,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.4,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(26, 128), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);
    this.floor = floor;

    // Glowing grid
    const gridMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: this.palette.accent.clone() },
        uColorB: { value: this.palette.accent2.clone() },
        uOpacity: { value: 0.48 },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uOpacity;
        varying vec3 vWorld;
        float lineMask(vec2 p, float scale) {
          vec2 q = abs(fract(p * scale - 0.5) - 0.5) / max(fwidth(p * scale), vec2(0.0001));
          return 1.0 - min(min(q.x, q.y), 1.0);
        }
        void main() {
          float r = length(vWorld.xz);
          float fade = smoothstep(22.0, 1.0, r);
          float major = lineMask(vWorld.xz, 0.5);
          float minor = lineMask(vWorld.xz, 2.0);
          float pulse = 0.75 + 0.25 * sin(r * 1.8 - uTime * 1.1);
          vec3 col = mix(uColorA, uColorB, 0.5 + 0.5 * sin(vWorld.x * 0.2 + vWorld.z * 0.17));
          float alpha = (major * 0.22 + minor * 0.06) * fade * pulse * uOpacity;
          gl_FragColor = vec4(col * (1.8 + major * 1.5), alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      extensions: { derivatives: true },
    });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(50, 50, 1, 1), gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.011;
    this.scene.add(grid);
    this.grid = grid;
    this.gridMat = gridMat;

    // Stage
    const stageMat = new THREE.MeshPhysicalMaterial({
      color: 0x1b0727,
      metalness: 0.95,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2,
    });
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.26, 0.16, 96), stageMat);
    stage.position.y = 0.08;
    this.scene.add(stage);
    this.stage = stage;

    const stageTop = new THREE.Mesh(
      new THREE.CircleGeometry(1.115, 96),
      new THREE.MeshPhysicalMaterial({
        color: 0x0a0110,
        metalness: 1,
        roughness: 0.04,
        envMapIntensity: 2.1,
      })
    );
    stageTop.rotation.x = -Math.PI / 2;
    stageTop.position.y = 0.161;
    this.scene.add(stageTop);

    const stageRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.16, 0.012, 6, 120),
      new THREE.MeshBasicMaterial({
        color: "#6ff7ff",
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    stageRing.rotation.x = Math.PI / 2;
    stageRing.position.y = 0.164;
    this.scene.add(stageRing);
    this.stageRing = stageRing;

    // Ripple rings on the floor
    this.ripples = [];
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 ? "#6ff7ff" : "#ff3fba",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.004, 4, 180), mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      ring.userData.offset = i / 7;
      this.scene.add(ring);
      this.ripples.push(ring);
    }
  }

  buildSet() {
    this.setGroup = new THREE.Group();
    this.scene.add(this.setGroup);

    const chrome = new THREE.MeshPhysicalMaterial({
      color: "#eef6ff",
      metalness: 1,
      roughness: 0.06,
      clearcoat: 1,
      envMapIntensity: 2.2,
    });

    // Slender chrome pillars framing the goddess
    const pillarPositions = [
      [-3.6, 2.1, -2.2, 0.22],
      [3.8, 2.0, -2.6, 0.16],
      [-4.8, 1.8, -4.5, 0.11],
      [4.9, 1.7, -4.8, 0.1],
    ];
    pillarPositions.forEach(([x, y, z, r]) => {
      const h = 4.6;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.4, h, 16), chrome);
      pillar.position.set(x, y, z);
      pillar.rotation.z = x * 0.008;
      this.setGroup.add(pillar);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.8, 0.015, 6, 30), this.gridMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.18, z);
      this.setGroup.add(ring);
    });

    // Floating shards and monoliths
    this.shards = [];
    const shardGeo = [
      new THREE.OctahedronGeometry(0.4, 0),
      new THREE.TetrahedronGeometry(0.32, 0),
      new THREE.IcosahedronGeometry(0.26, 0),
    ];
    for (let i = 0; i < 14; i++) {
      const geo = shardGeo[i % shardGeo.length];
      const mat = i % 5 === 0
        ? new THREE.MeshBasicMaterial({ color: i % 2 ? "#ff3fba" : "#6ff7ff", transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
        : chrome;
      const mesh = new THREE.Mesh(geo, mat);
      const a = (i / 14) * TAU + 0.4;
      const r = 3.8 + Math.random() * 3.8;
      mesh.position.set(Math.sin(a) * r, 0.8 + Math.random() * 4.2, -3.6 - Math.random() * 3.8);
      mesh.rotation.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU);
      mesh.userData = {
        baseY: mesh.position.y,
        phase: Math.random() * TAU,
        spin: 0.02 + Math.random() * 0.09,
        bob: 0.08 + Math.random() * 0.2,
        scale: 0.38 + Math.random() * 0.62,
      };
      mesh.scale.setScalar(mesh.userData.scale);
      this.setGroup.add(mesh);
      this.shards.push(mesh);
    }

    // A trio of holographic hoops at the side
    this.hoops = [];
    [0, 1, 2].forEach((i) => {
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.55 + i * 0.35, 0.006, 4, 100),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? "#ff3fba" : "#6ff7ff",
          transparent: true,
          opacity: 0.33 - i * 0.06,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      hoop.position.set(-3.9 + i * 0.36, 2.3 + i * 0.2, -3.7 - i * 0.3);
      hoop.rotation.set(0.8 + i * 0.25, 0.3, 0.4 + i * 0.2);
      hoop.userData.phase = i * 1.6;
      this.setGroup.add(hoop);
      this.hoops.push(hoop);
    });
  }

  buildDust() {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 1.2 + Math.pow(Math.random(), 0.55) * 9;
      const a = Math.random() * TAU;
      positions[i * 3] = Math.sin(a) * r;
      positions[i * 3 + 1] = Math.random() * 6.5;
      positions[i * 3 + 2] = Math.cos(a) * r * 0.75;
      sizes[i] = 0.02 + Math.random() * 0.075;
      phases[i] = Math.random() * TAU;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: this.palette.accent.clone() },
        uColor2: { value: this.palette.accent2.clone() },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        varying float vMix;
        void main() {
          vec3 pos = position;
          pos.y += sin(uTime * 0.25 + aPhase) * 0.32;
          pos.x += cos(uTime * 0.15 + aPhase) * 0.13;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * 280.0 * uPixelRatio / max(-mv.z, 1.0);
          gl_Position = projectionMatrix * mv;
          vAlpha = 0.22 + 0.55 * (0.5 + 0.5 * sin(uTime * 0.9 + aPhase * 3.0));
          vMix = 0.5 + 0.5 * sin(aPhase * 2.4 + uTime * 0.2);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uColor2;
        varying float vAlpha;
        varying float vMix;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float core = smoothstep(0.5, 0.0, d);
          float glow = smoothstep(0.5, 0.05, d) * 0.28;
          vec3 col = mix(uColor, uColor2, vMix);
          gl_FragColor = vec4(col, (core + glow) * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.dust = new THREE.Points(geo, mat);
    this.dust.sortParticles = true;
    this.scene.add(this.dust);
  }

  setPalette(palette) {
    if (palette.accent) this.targetPalette.accent.set(palette.accent);
    if (palette.accent2) this.targetPalette.accent2.set(palette.accent2);
    if (palette.accent3) this.targetPalette.accent3.set(palette.accent3);
    if (palette.acid) this.targetPalette.acid.set(palette.acid);
  }

  pulse(strength = 1) {
    this.destruction = Math.max(this.destruction, strength);
    this.shake = Math.max(this.shake, strength);
    this.ripples.forEach((ring, i) => {
      ring.userData.offset = (i / this.ripples.length + Math.random() * 0.04) % 1;
    });
  }

  update(dt, t) {
    this.time = t;
    this.palette.accent.lerp(this.targetPalette.accent, dt * 2);
    this.palette.accent2.lerp(this.targetPalette.accent2, dt * 2);
    this.palette.accent3.lerp(this.targetPalette.accent3, dt * 2);
    this.palette.acid.lerp(this.targetPalette.acid, dt * 2);

    this.skyMat.uniforms.uTime.value = t;
    this.skyMat.uniforms.uAccent.value.copy(this.palette.accent);
    this.skyMat.uniforms.uAccent2.value.copy(this.palette.accent2);
    this.gridMat.uniforms.uTime.value = t;
    this.gridMat.uniforms.uColorA.value.copy(this.palette.accent);
    this.gridMat.uniforms.uColorB.value.copy(this.palette.accent2);
    this.dust.material.uniforms.uTime.value = t;
    this.dust.material.uniforms.uColor.value.copy(this.palette.accent);
    this.dust.material.uniforms.uColor2.value.copy(this.palette.accent2);
    this.stars.rotation.y = t * 0.003;
    this.sunMat.opacity = 0.48 + Math.sin(t * 0.7) * 0.045;
    this.eclipse.scale.setScalar(1 + Math.sin(t * 0.4) * 0.018);
    this.portalRings.forEach((ring) => {
      ring.rotation.z += dt * ring.userData.spin;
      ring.material.opacity = 0.18 + Math.sin(t * 0.5 + ring.userData.spin * 100) * 0.08;
      ring.material.color.copy(this.palette.accent);
    });
    this.bigRings.forEach((ring) => {
      ring.rotation.z += dt * ring.userData.spin;
    });
    this.stageRing.material.opacity = 0.58 + Math.sin(t * 1.2) * 0.22;
    this.stageRing.material.color.copy(this.palette.accent2);

    this.shards.forEach((mesh) => {
      const u = mesh.userData;
      mesh.rotation.x += dt * u.spin;
      mesh.rotation.y += dt * u.spin * 0.66;
      mesh.position.y = u.baseY + Math.sin(t * 0.42 + u.phase) * u.bob;
      if (mesh.material.transparent) mesh.material.opacity = 0.22 + Math.sin(t * 0.8 + u.phase) * 0.16;
    });
    this.hoops.forEach((hoop) => {
      hoop.rotation.z += dt * 0.08;
      hoop.rotation.y += dt * 0.03;
      hoop.material.opacity = 0.2 + Math.sin(t * 0.55 + hoop.userData.phase) * 0.1;
    });

    this.ripples.forEach((ring) => {
      const u = ring.userData;
      u.offset = (u.offset + dt * 0.12) % 1;
      const s = 1 + u.offset * 8;
      ring.scale.setScalar(s);
      ring.material.opacity = (1 - u.offset) * 0.22;
      ring.material.color.copy(u.offset > 0.5 ? this.palette.accent : this.palette.accent2);
    });

    if (this.destruction > 0.001) {
      this.destruction = Math.max(0, this.destruction - dt * 1.1);
      const d = this.destruction;
      this.setGroup.rotation.z = Math.sin(t * 45) * 0.006 * d;
      this.sunMat.opacity = 0.48 + d * 0.18;
      this.floor.position.x = THREE.MathUtils.randFloatSpread(0.05) * d;
      this.floor.position.z = THREE.MathUtils.randFloatSpread(0.05) * d;
    } else {
      this.setGroup.rotation.z = 0;
      this.floor.position.x = 0;
      this.floor.position.z = 0;
    }

    // camera shake is applied by main
    this.shake = Math.max(0, this.shake - dt * 1.8);
  }

  getShakeOffset() {
    if (this.shake <= 0.001) return new THREE.Vector3();
    const s = this.shake * this.shake * 0.06;
    return new THREE.Vector3(THREE.MathUtils.randFloatSpread(s), THREE.MathUtils.randFloatSpread(s), 0);
  }
}

export { createGlowTexture };
