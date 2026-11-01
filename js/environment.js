import * as THREE from "three";
import { makeGlowSprite, rand } from "./utils.js";

const skyVertex = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uAccent;
  uniform float uTime;
  varying vec3 vPos;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec3 d = normalize(vPos);
    float up = smoothstep(-0.12, 0.10, d.y);

    vec3 col = mix(uMid * 0.3, uTop, up);
    col = mix(vec3(0.006, 0.001, 0.018), col, smoothstep(-0.5, 0.06, d.y));

    float horizon = exp(-abs(d.y) * 10.0);
    col += uMid * horizon * 0.15;

    float a = sin(d.x * 5.0 + uTime * 0.16 + sin(d.z * 4.0 - uTime * 0.13) * 2.2);
    a = pow(max(0.0, a), 5.0);
    float b = sin(d.z * 7.0 - uTime * 0.21 + sin(d.x * 3.0 + uTime * 0.1) * 2.6);
    b = pow(max(0.0, b), 7.0);
    float aurora = smoothstep(-0.15, 0.7, d.y);
    col += uAccent * (a * 0.08 + b * 0.05) * aurora;

    float back = pow(max(0.0, -d.z), 10.0) * smoothstep(-0.25, 0.85, d.y);
    col += uMid * back * 0.1;

    float lowGlow = pow(max(0.0, -d.y), 2.0) * 0.09;
    col += uMid * lowGlow;

    col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const floorVertex = /* glsl */ `
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const floorFragment = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uGrid;
  uniform vec3 uRing;
  uniform vec3 uAccent;
  uniform float uTime;
  varying vec3 vWorld;
  varying vec2 vUv;

  float grid(vec2 p, float scale, float width) {
    vec2 q = p * scale;
    vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
    return 1.0 - min(min(g.x, g.y) / width, 1.0);
  }

  void main() {
    vec2 p = vWorld.xz;
    float r = length(p);

    vec3 col = uBase;
    float glow = exp(-r * 0.9);
    col += uRing * glow * 0.18;
    col += uRing * exp(-r * 2.7) * 0.30;

    float fade = 1.0 - smoothstep(2.0, 17.0, r);
    float g1 = grid(p, 1.0, 1.15);
    float g2 = grid(p, 0.25, 0.9);
    col += uGrid * (g1 * 0.16 + g2 * 0.04) * fade;

    float rings = smoothstep(0.9, 1.0, sin(r * 6.2 - uTime * 1.4) * 0.5 + 0.5);
    col += uAccent * rings * exp(-r * 0.24) * 0.15;

    float streak = exp(-abs(p.x) * 3.2) * smoothstep(-3.0, 7.0, p.y) * exp(-abs(p.y - 1.4) * 0.32);
    col += uAccent * streak * 0.06;

    float scan = sin(p.y * 24.0 - uTime * 2.2) * 0.5 + 0.5;
    col *= 0.94 + scan * 0.06 * exp(-r * 0.2);

    float alpha = 1.0 - smoothstep(13.0, 27.0, r);
    gl_FragColor = vec4(col, alpha * 0.97);
  }
`;

const ringVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float dash = smoothstep(0.18, 0.72, sin(vUv.x * 6.28318 * 18.0 + uTime * 0.7) * 0.5 + 0.5);
    vec3 col = mix(uColorA, uColorB, vUv.x * 4.0);
    col += vec3(0.5) * pow(dash, 8.0);
    gl_FragColor = vec4(col, (0.24 + dash * 0.76) * uOpacity);
  }
`;

const beamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float edge = smoothstep(0.0, 0.32, vUv.x) * smoothstep(1.0, 0.68, vUv.x);
    float vert = smoothstep(0.0, 0.22, vUv.y) * pow(1.0 - vUv.y, 1.6);
    gl_FragColor = vec4(uColor, edge * vert * uOpacity);
  }
`;

const pillarFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float vert = pow(1.0 - vUv.y, 2.6);
    float stripe = 0.7 + 0.3 * sin(vUv.x * 6.28318 * 16.0 + uTime * 0.9);
    float edge = smoothstep(0.0, 0.42, vUv.x) * smoothstep(1.0, 0.58, vUv.x);
    gl_FragColor = vec4(uColor, vert * stripe * edge * uOpacity);
  }
`;

function energyRing(radius, tube, colorA, colorB, opacity, segments = 220) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
    },
    vertexShader: ringVertex,
    fragmentShader: ringFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, segments), material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function createEnvironment(scene, palette) {
  const group = new THREE.Group();
  scene.add(group);

  const target = {
    skyTop: new THREE.Color(palette.skyTop),
    skyMid: new THREE.Color(palette.skyMid),
    skyAccent: new THREE.Color(palette.skyAccent),
    floorBase: new THREE.Color(palette.floorBase),
    floorGrid: new THREE.Color(palette.floorGrid),
    floorRing: new THREE.Color(palette.floorRing),
    floorAccent: new THREE.Color(palette.floorAccent),
    fog: new THREE.Color(palette.fog),
    lightA: new THREE.Color(palette.lightA),
    lightB: new THREE.Color(palette.lightB),
    ringA: new THREE.Color(palette.skyMid),
    ringB: new THREE.Color(palette.skyAccent),
    beam: new THREE.Color(palette.skyMid),
    pillar: new THREE.Color(palette.skyAccent),
    bubble: new THREE.Color(0xffffff),
  };

  const skyUniforms = {
    uTop: { value: target.skyTop.clone() },
    uMid: { value: target.skyMid.clone() },
    uAccent: { value: target.skyAccent.clone() },
    uTime: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(80, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
  );
  sky.renderOrder = -10;
  group.add(sky);

  const floorUniforms = {
    uBase: { value: target.floorBase.clone() },
    uGrid: { value: target.floorGrid.clone() },
    uRing: { value: target.floorRing.clone() },
    uAccent: { value: target.floorAccent.clone() },
    uTime: { value: 0 },
  };
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 120),
    new THREE.ShaderMaterial({
      uniforms: floorUniforms,
      vertexShader: floorVertex,
      fragmentShader: floorFragment,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.44;
  floor.renderOrder = -2;
  group.add(floor);

  scene.fog = new THREE.FogExp2(target.fog.clone().getHex(), 0.018);

  // stars
  const starCount = 1100;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  const starColors = [new THREE.Color(0xffffff), new THREE.Color(0xffb7f2), new THREE.Color(0xa8f6ff), new THREE.Color(0xfff0b0)];
  for (let i = 0; i < starCount; i++) {
    const r = rand(26, 58);
    const theta = rand(0, Math.PI * 2);
    const phi = Math.acos(rand(-0.4, 1));
    starPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    starPos[i * 3 + 1] = Math.cos(phi) * r * 0.9 + 4;
    starPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    const c = starColors[Math.floor(Math.random() * starColors.length)];
    const bright = rand(0.35, 1);
    starCol[i * 3] = c.r * bright;
    starCol[i * 3 + 1] = c.g * bright;
    starCol[i * 3 + 2] = c.b * bright;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      size: 0.11,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  group.add(stars);

  // altar
  const altar = new THREE.Group();
  group.add(altar);

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xdfe4ff,
    metalness: 1,
    roughness: 0.09,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.75,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [100, 620],
    envMapIntensity: 1.5,
  });
  const darkChrome = new THREE.MeshPhysicalMaterial({
    color: 0x3a2352,
    metalness: 1,
    roughness: 0.05,
    clearcoat: 1,
    envMapIntensity: 1.4,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.5, 0.2, 96), chrome);
  base.position.y = -1.32;
  altar.add(base);

  const top = new THREE.Mesh(new THREE.CircleGeometry(1.34, 96), darkChrome);
  top.rotation.x = -Math.PI / 2;
  top.position.y = -1.217;
  altar.add(top);

  const bevel = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.035, 12, 120), chrome);
  bevel.rotation.x = -Math.PI / 2;
  bevel.position.y = -1.22;
  altar.add(bevel);

  const underGlow = makeGlowSprite(palette.skyAccent, 3.8, 0.4);
  underGlow.position.y = -1.37;
  underGlow.material.toneMapped = false;
  altar.add(underGlow);

  const rimMaterial = new THREE.MeshBasicMaterial({
    color: palette.skyAccent,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.33, 0.01, 6, 140), rimMaterial);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = -1.213;
  altar.add(rim);

  const runeGroup = new THREE.Group();
  runeGroup.position.y = -1.21;
  altar.add(runeGroup);
  const runeMaterial = new THREE.MeshBasicMaterial({
    color: palette.skyMid,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const runeGeo = new THREE.BoxGeometry(0.035, 0.008, 0.16);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const rune = new THREE.Mesh(runeGeo, runeMaterial);
    rune.position.set(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2);
    rune.rotation.y = -a;
    rune.scale.z = i % 4 === 0 ? 1.5 : 0.7;
    runeGroup.add(rune);
  }

  const ringA = energyRing(1.46, 0.008, palette.skyMid, palette.skyAccent, 0.8, 160);
  ringA.position.y = -1.2;
  altar.add(ringA);
  const ringB = energyRing(1.82, 0.006, palette.skyAccent, palette.skyMid, 0.5, 180);
  ringB.position.y = -1.18;
  altar.add(ringB);

  const orbitRings = [];
  [
    [2.25, 0.004, 0.22, 0.22],
    [2.85, 0.0035, 0.14, -0.16],
    [3.7, 0.003, 0.08, 0.12],
  ].forEach(([radius, tube, opacity, tilt], i) => {
    const holder = new THREE.Group();
    holder.position.y = -1.16;
    holder.rotation.x = tilt;
    const r = energyRing(radius, tube, palette.skyMid, palette.skyAccent, opacity, 240);
    holder.add(r);
    holder.userData.spin = 0.05 + i * 0.035;
    group.add(holder);
    orbitRings.push(holder);
  });

  // light pillar
  const pillarUniforms = {
    uColor: { value: target.pillar.clone() },
    uTime: { value: 0 },
    uOpacity: { value: 0.03 },
  };
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.45, 6.4, 64, 1, true),
    new THREE.ShaderMaterial({
      uniforms: pillarUniforms,
      vertexShader: beamVertex,
      fragmentShader: pillarFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  );
  pillar.position.y = 1.55;
  group.add(pillar);

  // god rays
  const beams = [];
  for (let i = 0; i < 5; i++) {
    const uniforms = {
      uColor: { value: target.beam.clone() },
      uOpacity: { value: 0.026 },
    };
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(rand(0.8, 1.8), rand(10, 14)),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    beam.position.set(rand(-6, 6), rand(3, 5), rand(-6, -2.5));
    beam.rotation.z = rand(-0.4, 0.4);
    beam.rotation.y = rand(-0.4, 0.4);
    beam.renderOrder = -1;
    group.add(beam);
    beams.push(beam);
  }

  // floating chrome bubbles
  const bubbleCount = 24;
  const bubbleGeo = new THREE.IcosahedronGeometry(1, 2);
  const bubbleMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.06,
    clearcoat: 1,
    iridescence: 1,
    iridescenceIOR: 1.5,
    envMapIntensity: 1.6,
  });
  const bubbles = new THREE.InstancedMesh(bubbleGeo, bubbleMat, bubbleCount);
  bubbles.frustumCulled = false;
  const bubbleData = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < bubbleCount; i++) {
    const big = i < 3;
    const angle = rand(0, Math.PI * 2);
    const radius = big ? rand(7.5, 10) : rand(3.8, 9.5);
    const scale = big ? rand(0.3, 0.5) : rand(0.05, 0.22);
    const data = {
      base: new THREE.Vector3(Math.cos(angle) * radius, rand(-0.8, 5.5), Math.sin(angle) * radius - 1.2),
      scale,
      phase: rand(0, Math.PI * 2),
      speed: rand(0.12, 0.4),
      spin: new THREE.Vector3(rand(-0.2, 0.2), rand(-0.2, 0.2), rand(-0.2, 0.2)),
      rotation: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)),
    };
    bubbleData.push(data);
    dummy.position.copy(data.base);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    bubbles.setMatrixAt(i, dummy.matrix);
  }
  group.add(bubbles);

  // dust
  const dustCount = 420;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const a = rand(0, Math.PI * 2);
    const r = Math.sqrt(Math.random()) * 9;
    dustPos[i * 3] = Math.cos(a) * r;
    dustPos[i * 3 + 1] = rand(-1.4, 6);
    dustPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xffe8ff,
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  group.add(dust);

  const current = {
    skyTop: target.skyTop.clone(),
    skyMid: target.skyMid.clone(),
    skyAccent: target.skyAccent.clone(),
    floorBase: target.floorBase.clone(),
    floorGrid: target.floorGrid.clone(),
    floorRing: target.floorRing.clone(),
    floorAccent: target.floorAccent.clone(),
    fog: target.fog.clone(),
    ringA: target.ringA.clone(),
    ringB: target.ringB.clone(),
    beam: target.beam.clone(),
    pillar: target.pillar.clone(),
  };

  function setPalette(p, instant = false) {
    target.skyTop.set(p.skyTop);
    target.skyMid.set(p.skyMid);
    target.skyAccent.set(p.skyAccent);
    target.floorBase.set(p.floorBase);
    target.floorGrid.set(p.floorGrid);
    target.floorRing.set(p.floorRing);
    target.floorAccent.set(p.floorAccent);
    target.fog.set(p.fog);
    target.lightA.set(p.lightA);
    target.lightB.set(p.lightB);
    target.ringA.set(p.skyMid);
    target.ringB.set(p.skyAccent);
    target.beam.set(p.skyMid);
    target.pillar.set(p.skyAccent);

    underGlow.material.color.set(p.skyAccent);
    rimMaterial.color.set(p.skyAccent);
    runeMaterial.color.set(p.skyMid);

    if (instant) {
      current.skyTop.copy(target.skyTop);
      current.skyMid.copy(target.skyMid);
      current.skyAccent.copy(target.skyAccent);
      current.floorBase.copy(target.floorBase);
      current.floorGrid.copy(target.floorGrid);
      current.floorRing.copy(target.floorRing);
      current.floorAccent.copy(target.floorAccent);
      current.fog.copy(target.fog);
      current.ringA.copy(target.ringA);
      current.ringB.copy(target.ringB);
      current.beam.copy(target.beam);
      current.pillar.copy(target.pillar);
      scene.fog.color.copy(current.fog);
    }
  }

  let time = 0;
  function update(dt, elapsed) {
    time = elapsed;
    const k = 1 - Math.exp(-2.2 * dt);
    current.skyTop.lerp(target.skyTop, k);
    current.skyMid.lerp(target.skyMid, k);
    current.skyAccent.lerp(target.skyAccent, k);
    current.floorBase.lerp(target.floorBase, k);
    current.floorGrid.lerp(target.floorGrid, k);
    current.floorRing.lerp(target.floorRing, k);
    current.floorAccent.lerp(target.floorAccent, k);
    current.fog.lerp(target.fog, k);
    current.ringA.lerp(target.ringA, k);
    current.ringB.lerp(target.ringB, k);
    current.beam.lerp(target.beam, k);
    current.pillar.lerp(target.pillar, k);

    skyUniforms.uTop.value.copy(current.skyTop);
    skyUniforms.uMid.value.copy(current.skyMid);
    skyUniforms.uAccent.value.copy(current.skyAccent);
    skyUniforms.uTime.value = time;

    floorUniforms.uBase.value.copy(current.floorBase);
    floorUniforms.uGrid.value.copy(current.floorGrid);
    floorUniforms.uRing.value.copy(current.floorRing);
    floorUniforms.uAccent.value.copy(current.floorAccent);
    floorUniforms.uTime.value = time;

    scene.fog.color.copy(current.fog);
    pillarUniforms.uColor.value.copy(current.pillar);
    pillarUniforms.uTime.value = time;

    ringA.material.uniforms.uColorA.value.copy(current.ringA);
    ringA.material.uniforms.uColorB.value.copy(current.ringB);
    ringB.material.uniforms.uColorA.value.copy(current.ringB);
    ringB.material.uniforms.uColorB.value.copy(current.ringA);
    ringA.material.uniforms.uTime.value = time;
    ringB.material.uniforms.uTime.value = time;

    orbitRings.forEach((holder, i) => {
      holder.rotation.y += dt * holder.userData.spin * (i % 2 ? -1 : 1);
      holder.rotation.x += Math.sin(time * 0.2 + i) * dt * 0.01;
      holder.children[0].material.uniforms.uTime.value = time;
      holder.children[0].material.uniforms.uColorA.value.copy(current.ringA);
      holder.children[0].material.uniforms.uColorB.value.copy(current.ringB);
    });

    beams.forEach((beam, i) => {
      beam.material.uniforms.uColor.value.copy(current.beam);
      beam.material.uniforms.uOpacity.value = 0.022 + Math.sin(time * 0.35 + i) * 0.008;
      beam.rotation.z += Math.sin(time * 0.12 + i) * dt * 0.01;
    });

    stars.rotation.y += dt * 0.004;
    stars.material.opacity = 0.72 + Math.sin(time * 0.8) * 0.1;
    dust.rotation.y += dt * 0.012;
    dust.position.y = Math.sin(time * 0.4) * 0.08;

    for (let i = 0; i < bubbleCount; i++) {
      const d = bubbleData[i];
      dummy.position.set(
        d.base.x + Math.sin(time * d.speed + d.phase) * 0.35,
        d.base.y + Math.sin(time * d.speed * 1.4 + d.phase) * 0.32,
        d.base.z + Math.cos(time * d.speed * 0.8 + d.phase) * 0.35
      );
      d.rotation.x += d.spin.x * dt;
      d.rotation.y += d.spin.y * dt;
      d.rotation.z += d.spin.z * dt;
      dummy.rotation.copy(d.rotation);
      dummy.scale.setScalar(d.scale * (1 + Math.sin(time * 0.7 + d.phase) * 0.04));
      dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;

    underGlow.material.opacity = 0.28 + Math.sin(time * 1.6) * 0.06;
    rimMaterial.opacity = 0.65 + Math.sin(time * 2.1) * 0.25;
    runeGroup.rotation.y -= dt * 0.18;
    ringA.rotation.z += dt * 0.1;
    ringB.rotation.z -= dt * 0.08;
  }

  return {
    group,
    setPalette,
    update,
    materials: { chrome, darkChrome, bubbleMat, rimMaterial, runeMaterial },
    underGlow,
  };
}
