import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

export const THEMES = [
  {
    id: "bubblegum",
    name: "BUBBLEGUM",
    a: 0xff2fd0,
    b: 0x4df7ff,
    c: 0x8b2bff,
    bg: 0x0a0010,
  },
  {
    id: "acid",
    name: "ACID BLOOM",
    a: 0xd8ff00,
    b: 0x00ffc8,
    c: 0xff2f7a,
    bg: 0x050a00,
  },
  {
    id: "ice",
    name: "CRYO DREAM",
    a: 0x7ae7ff,
    b: 0xc9b8ff,
    c: 0x2f7bff,
    bg: 0x01060f,
  },
  {
    id: "inferno",
    name: "SOLAR FLARE",
    a: 0xff5a1f,
    b: 0xffd166,
    c: 0xff1f6b,
    bg: 0x100200,
  },
];

function makeEnvScene(palette) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020005);

  const panel = (color, intensity, width, height, position, rotation) => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    env.add(mesh);
    return mesh;
  };

  panel(palette.a, 2.9, 16, 16, [-9, 4, 0], [0, Math.PI / 2, 0]);
  panel(palette.b, 2.7, 13, 13, [9, 3.5, 1], [0, -Math.PI / 2, 0]);
  panel(palette.c, 1.7, 12, 12, [0, 3.5, -9], [0, 0, 0]);
  panel(0xffffff, 0.7, 10, 2.2, [0, 10, 0], [Math.PI / 2, 0, 0]);
  panel(0xffffff, 0.7, 26, 1.6, [0, -2.4, 4], [-Math.PI / 2, 0, 0]);
  panel(palette.a, 1.3, 3, 12, [-3.5, 5, 8], [0, 0.5, 0]);
  panel(palette.b, 1.2, 3, 10, [4, 5.5, 8], [0, -0.5, 0]);

  return env;
}

export function createEnvironment(scene, renderer, quality) {
  const paletteA = new THREE.Color(THEMES[0].a);
  const paletteB = new THREE.Color(THEMES[0].b);
  const paletteC = new THREE.Color(THEMES[0].c);
  const paletteBg = new THREE.Color(THEMES[0].bg);
  const pureWhite = new THREE.Color(0xffffff);

  scene.fog = new THREE.FogExp2(paletteBg.clone(), 0.03);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uA: { value: paletteBg.clone() },
        uB: { value: paletteC.clone() },
        uC: { value: paletteA.clone() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uA;
        uniform vec3 uB;
        uniform vec3 uC;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = smoothstep(-0.4, 0.8, d.y);
          vec3 col = mix(uA, uB, h * 0.13);
          float horizon = pow(max(0.0, 1.0 - abs(d.y + 0.06)), 6.0);
          col += uC * horizon * 0.055;
          col += uB * 0.006 * sin(d.x * 7.0 + d.y * 11.0);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  sky.frustumCulled = false;
  scene.add(sky);

  let envTarget = null;
  const pmrem = new THREE.PMREMGenerator(renderer);

  function rebuildEnvironment(a, b, c) {
    const envScene = makeEnvScene({ a: a.getHex(), b: b.getHex(), c: c.getHex() });
    const target = pmrem.fromScene(envScene, 0.035, 0.1, 100);
    scene.environment = target.texture;
    envTarget?.dispose();
    envTarget = target;
    envScene.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }

  rebuildEnvironment(paletteA, paletteB, paletteC);

  // Mirror-black altar floor. Mobile uses a glossy plane to keep the frame budget sane.
  let mirror;
  if (quality.mobile) {
    mirror = new THREE.Mesh(
      new THREE.CircleGeometry(18, 96),
      new THREE.MeshPhysicalMaterial({
        color: 0x0a0010,
        metalness: 0.82,
        roughness: 0.28,
        envMapIntensity: 0.8,
      })
    );
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = 0;
    scene.add(mirror);
  } else {
    mirror = new Reflector(new THREE.CircleGeometry(18, 96), {
      clipBias: 0.003,
      textureWidth: quality.mirror,
      textureHeight: quality.mirror,
      color: 0x2b0b3d,
      multisample: 0,
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = 0;
    scene.add(mirror);
  }

  const gridMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uA: { value: paletteA.clone() },
      uB: { value: paletteB.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uA;
      uniform vec3 uB;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float fade = smoothstep(1.0, 0.08, r) * smoothstep(0.02, 0.16, r);
        vec2 q = abs(fract(p * 11.0) - 0.5);
        float grid = smoothstep(0.455, 0.5, max(q.x, q.y));
        float pulse = fract(uTime * 0.13);
        float ring = smoothstep(0.012, 0.0, abs(r - pulse * 1.35));
        float ring2 = smoothstep(0.008, 0.0, abs(r - fract(uTime * 0.07 + 0.4) * 1.5));
        vec3 col = mix(uA, uB, smoothstep(0.1, 0.9, r));
        float alpha = (grid * 0.06 + ring * 0.22 + ring2 * 0.13) * fade;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const grid = new THREE.Mesh(new THREE.CircleGeometry(18, 96), gridMaterial);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.006;
  scene.add(grid);

  // A dark glass dais ring.
  const dais = new THREE.Mesh(
    new THREE.RingGeometry(2.12, 2.86, 128),
    new THREE.MeshPhysicalMaterial({
      color: 0x0b0014,
      metalness: 0.9,
      roughness: 0.18,
      transparent: true,
      opacity: 0.72,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide,
    })
  );
  dais.rotation.x = -Math.PI / 2;
  dais.position.y = 0.008;
  scene.add(dais);

  const daisRimMaterial = new THREE.MeshBasicMaterial({
    color: paletteA.clone(),
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const daisRim = new THREE.Mesh(new THREE.TorusGeometry(2.86, 0.008, 6, 180), daisRimMaterial);
  daisRim.rotation.x = Math.PI / 2;
  daisRim.position.y = 0.012;
  scene.add(daisRim);

  const daisInnerMaterial = daisRimMaterial.clone();
  daisInnerMaterial.color = paletteB.clone();
  daisInnerMaterial.opacity = 0.45;
  const daisInner = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.005, 6, 180), daisInnerMaterial);
  daisInner.rotation.x = Math.PI / 2;
  daisInner.position.y = 0.012;
  scene.add(daisInner);

  // Orbital halos.
  const rings = [];
  const ringDefs = [
    { radius: 1.62, tilt: [1.24, 0.18, 0], color: "a", speed: 0.22, gems: 7 },
    { radius: 2.12, tilt: [-0.98, 0.62, 0.22], color: "b", speed: -0.15, gems: 9 },
    { radius: 2.62, tilt: [1.52, -0.42, 0.1], color: "c", speed: 0.1, gems: 11 },
  ];

  ringDefs.forEach((def, index) => {
    const group = new THREE.Group();
    group.position.y = 1.52;
    group.rotation.set(...def.tilt);

    const material = new THREE.MeshBasicMaterial({
      color: paletteA.clone(),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const torus = new THREE.Mesh(new THREE.TorusGeometry(def.radius, 0.006, 6, 220), material);
    group.add(torus);

    const gemMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < def.gems; i += 1) {
      const angle = (i / def.gems) * Math.PI * 2;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), gemMaterial);
      gem.position.set(Math.cos(angle) * def.radius, Math.sin(angle) * def.radius, 0);
      gem.rotation.z = angle;
      group.add(gem);
    }

    group.userData = {
      speed: def.speed,
      material,
      gemMaterial,
      colorKey: def.color,
      index,
      tilt: new THREE.Euler(...def.tilt),
    };
    scene.add(group);
    rings.push(group);
  });

  // Floating chrome relics.
  const shardMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffe9fb,
    metalness: 1,
    roughness: 0.12,
    envMapIntensity: 2.4,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    iridescence: 1,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [120, 620],
  });
  const shards = [];
  const shardCount = quality.mobile ? 7 : 12;
  for (let i = 0; i < shardCount; i += 1) {
    const angle = (i / shardCount) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 1.1 + Math.random() * 1.7;
    const geometry = new THREE.OctahedronGeometry(0.055 + Math.random() * 0.06, 0);
    const shard = new THREE.Mesh(geometry, shardMaterial);
    shard.scale.set(0.8, 2.2 + Math.random() * 1.6, 0.8);
    shard.position.set(Math.cos(angle) * radius, 0.45 + Math.random() * 2.6, Math.sin(angle) * radius);
    shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    shard.userData = {
      baseY: shard.position.y,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.3,
      radius,
      angle,
      orbit: 0.03 + Math.random() * 0.08,
    };
    scene.add(shard);
    shards.push(shard);
  }

  // Chrome hearts and stars: a little Y2K jewelry for the void.
  const trinkets = [];
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0.45);
  heartShape.bezierCurveTo(0, 0.5, -0.5, 1.0, -1.0, 0.5);
  heartShape.bezierCurveTo(-1.5, 0, -1.0, -0.8, 0, -1.2);
  heartShape.bezierCurveTo(1.0, -0.8, 1.5, 0, 1.0, 0.5);
  heartShape.bezierCurveTo(0.5, 1.0, 0, 0.5, 0, 0.45);
  const heartGeometry = new THREE.ExtrudeGeometry(heartShape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06,
  });
  heartGeometry.center();
  heartGeometry.scale(0.11, 0.11, 0.11);

  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 1 : 0.44;
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const starGeometry = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.05,
    bevelThickness: 0.05,
  });
  starGeometry.center();
  starGeometry.scale(0.12, 0.12, 0.12);

  const trinketDefs = [
    { geometry: heartGeometry, angle: 0.7, radius: 2.35, y: 2.55, scale: 1.0 },
    { geometry: starGeometry, angle: 2.4, radius: 2.7, y: 1.15, scale: 1.1 },
    { geometry: heartGeometry, angle: 3.9, radius: 2.25, y: 0.9, scale: 0.8 },
    { geometry: starGeometry, angle: 5.3, radius: 2.5, y: 2.1, scale: 0.85 },
  ];
  trinketDefs.forEach((def, index) => {
    if (quality.mobile && index > 1) return;
    const trinket = new THREE.Mesh(def.geometry, shardMaterial);
    trinket.position.set(Math.cos(def.angle) * def.radius, def.y, Math.sin(def.angle) * def.radius);
    trinket.scale.setScalar(def.scale);
    trinket.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    trinket.userData = {
      baseY: def.y,
      phase: Math.random() * Math.PI * 2,
      angle: def.angle,
      radius: def.radius,
      orbit: 0.02 + index * 0.008,
    };
    scene.add(trinket);
    trinkets.push(trinket);
  });

  // Ambient glitter.
  const dustCount = quality.mobile ? 750 : 1800;
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  const dustSizes = new Float32Array(dustCount);
  const dustSeeds = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i += 1) {
    const radius = 4.6 + Math.pow(Math.random(), 0.65) * 13;
    const angle = Math.random() * Math.PI * 2;
    dustPositions[i * 3] = Math.cos(angle) * radius;
    dustPositions[i * 3 + 1] = -0.6 + Math.random() * 9;
    dustPositions[i * 3 + 2] = Math.sin(angle) * radius;
    dustSizes[i] = 0.5 + Math.random() * 1.5;
    dustSeeds[i] = Math.random();
  }
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute("aSize", new THREE.BufferAttribute(dustSizes, 1));
  dustGeometry.setAttribute("aSeed", new THREE.BufferAttribute(dustSeeds, 1));

  const dustMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uA: { value: paletteA.clone() },
      uB: { value: paletteB.clone() },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vSeed;
      varying float vFade;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.16 + aSeed * 6.283) * 0.35;
        p.x += cos(uTime * 0.11 + aSeed * 6.283) * 0.22;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = min(aSize * uPixelRatio * (42.0 / max(0.001, -mv.z)), 8.0 * uPixelRatio);
        gl_Position = projectionMatrix * mv;
        vSeed = aSeed;
        vFade = 0.4 + 0.6 * (0.5 + 0.5 * sin(uTime * 0.9 + aSeed * 22.0));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uA;
      uniform vec3 uB;
      varying float vSeed;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.0, d);
        alpha *= alpha * vFade;
        vec3 col = mix(uA, uB, vSeed);
        gl_FragColor = vec4(col, alpha * 0.22);
      }
    `,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  scene.add(dust);

  // Lighting: hot key, cold rim, violet fill.
  const ambient = new THREE.AmbientLight(0xffffff, 0.22);
  scene.add(ambient);

  const key = new THREE.SpotLight(0xffffff, 90, 40, 0.62, 0.95, 1.6);
  key.position.set(5, 8, 6);
  key.target.position.set(0, 1.5, 0);
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0xffffff, 1.0);
  rim.position.set(-6, 5, -5);
  scene.add(rim);

  const fill = new THREE.PointLight(0xffffff, 8, 14, 2);
  fill.position.set(0, 1.4, 3.4);
  scene.add(fill);

  const under = new THREE.PointLight(0xffffff, 6, 12, 2);
  under.position.set(0, 0.25, 1.2);
  scene.add(under);

  const hotRim = new THREE.PointLight(0xffffff, 7, 8, 2);
  hotRim.position.set(2.6, 2.7, 1.8);
  scene.add(hotRim);

  const coldRim = new THREE.PointLight(0xffffff, 8, 7, 2);
  coldRim.position.set(-2.3, 2.1, 1.1);
  scene.add(coldRim);

  const faceLight = new THREE.PointLight(0xffffff, 4, 4.5, 2);
  faceLight.position.set(0.35, 2.7, 1.5);
  scene.add(faceLight);

  function update(time, dt, palette) {
    sky.rotation.y = time * 0.008;
    gridMaterial.uniforms.uTime.value = time;
    gridMaterial.uniforms.uA.value.copy(palette.a);
    gridMaterial.uniforms.uB.value.copy(palette.b);
    dustMaterial.uniforms.uTime.value = time;
    dustMaterial.uniforms.uA.value.copy(palette.a);
    dustMaterial.uniforms.uB.value.copy(palette.b);

    if (mirror.material.uniforms?.color) mirror.material.uniforms.color.value.copy(palette.bg).lerp(palette.c, 0.55);

    daisRimMaterial.color.copy(palette.a);
    daisInnerMaterial.color.copy(palette.b);
    daisRimMaterial.opacity = 0.65 + Math.sin(time * 1.4) * 0.15;

    rings.forEach((ring) => {
      const data = ring.userData;
      ring.rotation.z += dt * data.speed;
      ring.rotation.y = data.tilt.y + Math.sin(time * 0.3 + data.index) * 0.12;
      data.material.color.copy(palette[data.colorKey]);
      data.material.opacity = 0.38 + Math.sin(time * 1.1 + data.index * 2) * 0.12;
      data.gemMaterial.color.copy(data.colorKey === "b" ? palette.a : palette.b);
    });

    shards.forEach((shard, index) => {
      const data = shard.userData;
      shard.position.y = data.baseY + Math.sin(time * 0.6 + data.phase) * 0.16;
      shard.rotation.x += dt * data.speed * 0.5;
      shard.rotation.y += dt * data.speed * 0.8;
      data.angle += dt * data.orbit;
      shard.position.x = Math.cos(data.angle) * data.radius;
      shard.position.z = Math.sin(data.angle) * data.radius;
      const pulse = 0.85 + Math.sin(time * 1.2 + index) * 0.15;
      shard.scale.x = 0.8 * pulse;
      shard.scale.z = 0.8 * pulse;
    });

    trinkets.forEach((trinket) => {
      const data = trinket.userData;
      data.angle += dt * data.orbit;
      trinket.position.x = Math.cos(data.angle) * data.radius;
      trinket.position.z = Math.sin(data.angle) * data.radius;
      trinket.position.y = data.baseY + Math.sin(time * 0.7 + data.phase) * 0.18;
      trinket.rotation.y += dt * 0.5;
      trinket.rotation.x += dt * 0.2;
    });

    key.color.copy(palette.a);
    rim.color.copy(palette.b);
    fill.color.copy(palette.c);
    under.color.copy(palette.a);
    hotRim.color.copy(palette.a);
    coldRim.color.copy(palette.b);
    faceLight.color.copy(palette.a).lerp(pureWhite, 0.6);
    scene.fog.color.copy(palette.bg);
  }

  function setTheme(palette) {
    rebuildEnvironment(palette.a, palette.b, palette.c);
  }

  function setQuality(next) {
    dustMaterial.uniforms.uPixelRatio.value = next.pixelRatio;
  }

  function dispose() {
    pmrem.dispose();
    envTarget?.dispose();
  }

  return {
    update,
    setTheme,
    setQuality,
    dispose,
    mirror,
    rings,
    shards,
    dust,
    lights: { ambient, key, rim, fill, under, hotRim, coldRim, faceLight },
  };
}
