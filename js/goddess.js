import * as THREE from "three";
import { makeGlowSprite, rand } from "./utils.js";

const hairVertex = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec3 p = position;
    float sway = sin(uv.y * 6.5 + uTime * 1.35 + position.x * 2.0) * (0.02 + uv.y * 0.085);
    p.x += sway;
    p.z += cos(uv.y * 4.8 + uTime * 1.05 + position.y * 1.5) * 0.022 * uv.y;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const hairFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 1.0, vUv.y)) * 0.62;
    float edge = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.5);
    col += uColorC * edge * 0.5;
    float alpha = uOpacity * smoothstep(0.0, 0.08, vUv.y) * (0.5 + edge * 0.5);
    gl_FragColor = vec4(col, alpha);
  }
`;

const clothVertex = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec3 p = position;
    float wave = sin(uv.y * 7.0 + uTime * 1.15) * 0.045 + cos(uv.x * 9.0 - uTime * 0.9) * 0.028;
    p.x += wave * uv.y;
    p.z += cos(uv.y * 5.0 + uTime * 0.8) * 0.035 * uv.y;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const clothFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.0);
    float stripe = pow(sin(vUv.y * 95.0 - uTime * 2.2) * 0.5 + 0.5, 9.0);
    float flow = sin(vUv.x * 6.28318 * 3.0 + uTime * 0.7 + vUv.y * 5.0) * 0.5 + 0.5;
    vec3 deep = uColorA * 0.16 + uColorB * 0.06;
    vec3 col = mix(deep, uColorB * 0.55, clamp(vUv.y * 1.1 + flow * 0.1, 0.0, 1.0));
    col += uColorC * (fres * 0.7 + stripe * 0.28 + flow * 0.08);
    float alpha = (0.5 + fres * 0.4 + stripe * 0.07) * smoothstep(0.0, 0.08, vUv.y);
    alpha *= 1.0 - smoothstep(0.7, 1.0, vUv.y) * 0.9;
    gl_FragColor = vec4(col, alpha * uOpacity);
  }
`;

const capeFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.0);
    vec3 col = mix(uColorB * 0.16, uColorA * 0.3, smoothstep(0.0, 1.0, vUv.y));
    col += uColorC * fres * 0.55;
    float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    float alpha = (0.24 + fres * 0.36) * edge * smoothstep(0.0, 0.12, vUv.y);
    alpha *= 1.0 - smoothstep(0.55, 1.0, vUv.y) * 0.92;
    float shimmer = pow(sin(vUv.y * 60.0 - uTime * 2.6 + vUv.x * 20.0) * 0.5 + 0.5, 10.0);
    col += uColorC * shimmer * 0.35;
    gl_FragColor = vec4(col, alpha * uOpacity);
  }
`;

const haloVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const haloFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float dash = pow(sin(vUv.x * 6.28318 * 14.0 + uTime * 1.3) * 0.5 + 0.5, 4.0);
    vec3 col = mix(uColorA, uColorB, vUv.x * 3.0);
    col += vec3(0.4) * dash;
    gl_FragColor = vec4(col, (0.35 + dash * 0.65) * uOpacity);
  }
`;

function ribbonGeometry(points, width, segments = 42) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const reference = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPoint(t);
    curve.getTangent(t, tangent).normalize();
    side.crossVectors(tangent, reference);
    if (side.lengthSq() < 0.001) side.set(1, 0, 0);
    side.normalize();
    normal.crossVectors(tangent, side).normalize();
    const w = width * (1 - t * 0.72) * (0.72 + 0.28 * Math.sin(t * Math.PI));
    positions.push(p.x - side.x * w, p.y - side.y * w, p.z - side.z * w);
    positions.push(p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
    normals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
    uvs.push(0, t, 1, t);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function makeHaloMaterial(colorA, colorB, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
    },
    vertexShader: haloVertex,
    fragmentShader: haloFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

export function createGoddess(palette) {
  const root = new THREE.Group();
  root.position.y = 0.14;
  const body = new THREE.Group();
  root.add(body);

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xd0c2ea,
    metalness: 0.8,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 1,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [80, 700],
    envMapIntensity: 1.05,
  });
  const darkGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1a0726,
    metalness: 0.9,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 1,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [200, 900],
    envMapIntensity: 1.8,
  });

  const target = {
    hairA: new THREE.Color(palette.hairA),
    hairB: new THREE.Color(palette.hairB),
    hairC: new THREE.Color(palette.hairC),
    dressA: new THREE.Color(palette.dressA),
    dressB: new THREE.Color(palette.dressB),
    dressC: new THREE.Color(palette.dressC),
    heart: new THREE.Color(palette.heart),
    haloA: new THREE.Color(palette.halo),
    haloB: new THREE.Color(palette.skyAccent),
    eye: new THREE.Color(palette.eye),
    gemA: new THREE.Color(palette.skyMid),
    gemB: new THREE.Color(palette.skyAccent),
    gemC: new THREE.Color(0xfff4ff),
  };

  const current = {
    hairA: target.hairA.clone(),
    hairB: target.hairB.clone(),
    hairC: target.hairC.clone(),
    dressA: target.dressA.clone(),
    dressB: target.dressB.clone(),
    dressC: target.dressC.clone(),
    heart: target.heart.clone(),
    haloA: target.haloA.clone(),
    haloB: target.haloB.clone(),
    eye: target.eye.clone(),
    gemA: target.gemA.clone(),
    gemB: target.gemB.clone(),
    gemC: target.gemC.clone(),
  };

  // torso
  const torsoProfile = new THREE.SplineCurve([
    new THREE.Vector2(0.001, -0.72),
    new THREE.Vector2(0.18, -0.71),
    new THREE.Vector2(0.34, -0.68),
    new THREE.Vector2(0.46, -0.61),
    new THREE.Vector2(0.51, -0.5),
    new THREE.Vector2(0.49, -0.38),
    new THREE.Vector2(0.42, -0.24),
    new THREE.Vector2(0.34, -0.1),
    new THREE.Vector2(0.31, 0.02),
    new THREE.Vector2(0.34, 0.14),
    new THREE.Vector2(0.4, 0.25),
    new THREE.Vector2(0.46, 0.34),
    new THREE.Vector2(0.46, 0.42),
    new THREE.Vector2(0.4, 0.49),
    new THREE.Vector2(0.28, 0.55),
    new THREE.Vector2(0.17, 0.6),
    new THREE.Vector2(0.135, 0.67),
    new THREE.Vector2(0.13, 0.76),
  ]).getPoints(64);

  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 72), chrome);
  torso.scale.z = 0.64;
  body.add(torso);

  // chest forms
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.125, 0.18, 32), chrome);
  neck.position.y = 0.8;
  body.add(neck);

  // head
  const head = new THREE.Group();
  head.position.y = 1.06;
  body.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.29, 48, 36), chrome);
  skull.scale.set(0.86, 1.02, 0.94);
  head.add(skull);

  const eyeMat = new THREE.MeshBasicMaterial({ color: palette.eye, toneMapped: false });
  const eyeGeo = new THREE.SphereGeometry(1, 24, 16);
  const socketMat = new THREE.MeshPhysicalMaterial({
    color: 0x140320,
    metalness: 0.55,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const lashMat = new THREE.MeshBasicMaterial({ color: 0x10001a, toneMapped: false });
  const browMat = new THREE.MeshBasicMaterial({ color: 0x240634, toneMapped: false });
  const eyeGlows = [];
  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(eyeGeo, socketMat);
    socket.position.set(side * 0.102, 0.045, 0.232);
    socket.scale.set(0.1, 0.046, 0.03);
    socket.rotation.z = side * -0.14;
    head.add(socket);

    const iris = new THREE.Mesh(eyeGeo, eyeMat);
    iris.position.set(side * 0.102, 0.043, 0.256);
    iris.scale.set(0.05, 0.026, 0.018);
    iris.rotation.z = side * -0.14;
    head.add(iris);

    const pupil = new THREE.Mesh(eyeGeo, lashMat);
    pupil.position.set(side * 0.102, 0.043, 0.272);
    pupil.scale.set(0.014, 0.018, 0.008);
    head.add(pupil);

    const lid = new THREE.Mesh(eyeGeo, chrome);
    lid.position.set(side * 0.102, 0.077, 0.248);
    lid.scale.set(0.092, 0.028, 0.022);
    lid.rotation.z = side * -0.14;
    head.add(lid);

    const lash = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.105, 4, 8), lashMat);
    lash.position.set(side * 0.104, 0.079, 0.258);
    lash.rotation.z = Math.PI / 2 + side * 0.16;
    head.add(lash);

    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.075, 3), lashMat);
    wing.position.set(side * 0.17, 0.09, 0.248);
    wing.rotation.z = side * -0.85;
    wing.rotation.x = -0.15;
    head.add(wing);

    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.09, 4, 8), browMat);
    brow.position.set(side * 0.105, 0.128, 0.25);
    brow.rotation.z = Math.PI / 2 + side * 0.18;
    head.add(brow);

    const glow = makeGlowSprite(palette.eye, 0.24, 0.6);
    glow.position.set(side * 0.102, 0.045, 0.28);
    head.add(glow);
    eyeGlows.push(glow);
  }

  const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.035, 4, 10), chrome);
  nose.position.set(0, -0.022, 0.252);
  nose.scale.set(1, 1, 0.5);
  head.add(nose);
  const noseTip = new THREE.Mesh(eyeGeo, chrome);
  noseTip.position.set(0, -0.052, 0.258);
  noseTip.scale.set(0.022, 0.016, 0.016);
  head.add(noseTip);

  const lipMat = new THREE.MeshPhysicalMaterial({
    color: 0xff2f8f,
    metalness: 0.25,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: 0x6a0033,
    emissiveIntensity: 0.5,
  });
  const upperLipL = new THREE.Mesh(eyeGeo, lipMat);
  upperLipL.position.set(-0.02, -0.136, 0.257);
  upperLipL.scale.set(0.028, 0.011, 0.013);
  upperLipL.rotation.z = 0.2;
  head.add(upperLipL);
  const upperLipR = upperLipL.clone();
  upperLipR.position.x = 0.02;
  upperLipR.rotation.z = -0.2;
  head.add(upperLipR);
  const lowerLip = new THREE.Mesh(eyeGeo, lipMat);
  lowerLip.position.set(0, -0.149, 0.259);
  lowerLip.scale.set(0.044, 0.016, 0.015);
  head.add(lowerLip);
  const mouthLine = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.05, 4, 8), lashMat);
  mouthLine.position.set(0, -0.142, 0.264);
  mouthLine.rotation.z = Math.PI / 2;
  head.add(mouthLine);

  const chin = new THREE.Mesh(eyeGeo, chrome);
  chin.position.set(0, -0.232, 0.15);
  chin.scale.set(0.075, 0.055, 0.065);
  head.add(chin);

  const thirdEye = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.035, 0),
    new THREE.MeshBasicMaterial({ color: palette.skyAccent, toneMapped: false })
  );
  thirdEye.position.set(0, 0.16, 0.29);
  thirdEye.scale.set(1, 1.35, 0.5);
  head.add(thirdEye);

  const gemMat = new THREE.MeshBasicMaterial({ color: palette.skyAccent, toneMapped: false });
  const cheekGemGeo = new THREE.OctahedronGeometry(0.012, 0);
  const cheekSpots = [
    [0.15, 0.02, 0.278],
    [0.185, -0.03, 0.262],
    [0.13, -0.07, 0.286],
  ];
  cheekSpots.forEach(([x, y, z], i) => {
    const gem = new THREE.Mesh(cheekGemGeo, gemMat);
    gem.position.set(x, y, z);
    gem.scale.setScalar(i === 1 ? 0.8 : 1);
    head.add(gem);
  });

  // ears + hoops
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(eyeGeo, chrome);
    ear.position.set(side * 0.243, 0.0, 0.0);
    ear.scale.set(0.03, 0.055, 0.028);
    head.add(ear);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.005, 6, 28), chrome);
    hoop.position.set(side * 0.245, -0.06, 0.015);
    hoop.rotation.y = side * 0.15;
    head.add(hoop);
    const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), gemMat);
    drop.position.set(side * 0.245, -0.1, 0.015);
    head.add(drop);
  }

  // choker
  const choker = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.014, 8, 44), darkGlass);
  choker.position.y = 0.82;
  choker.rotation.x = Math.PI / 2;
  body.add(choker);
  const chokerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.024, 0), gemMat);
  chokerGem.position.set(0, 0.82, 0.115);
  chokerGem.scale.set(1, 1.35, 0.7);
  body.add(chokerGem);

  // crown
  const crown = new THREE.Group();
  crown.position.y = 0.32;
  head.add(crown);

  const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.012, 8, 90), chrome);
  crownRing.rotation.x = Math.PI / 2;
  crown.add(crownRing);

  const spikeGeo = new THREE.ConeGeometry(0.026, 1, 6);
  const crownGemGeo = new THREE.OctahedronGeometry(0.026, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const h = 0.075 + Math.abs(Math.sin(a * 1.5)) * 0.12 + (i === 0 ? 0.075 : 0);
    const spike = new THREE.Mesh(spikeGeo, chrome);
    spike.scale.y = h;
    spike.position.set(Math.cos(a) * 0.29, h * 0.5, Math.sin(a) * 0.29);
    spike.rotation.z = Math.cos(a) * -0.16;
    spike.rotation.x = Math.sin(a) * 0.16;
    crown.add(spike);
    if (i % 3 === 0) {
      const gem = new THREE.Mesh(crownGemGeo, gemMat);
      gem.position.set(Math.cos(a) * 0.29, h + 0.02, Math.sin(a) * 0.29);
      crown.add(gem);
    }
  }

  const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), new THREE.MeshBasicMaterial({ color: palette.skyMid, toneMapped: false }));
  crownGem.position.set(0, 0.03, 0.3);
  crownGem.scale.set(1, 1.4, 0.7);
  crown.add(crownGem);

  // hair
  const hairMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: current.hairA.clone() },
      uColorB: { value: current.hairB.clone() },
      uColorC: { value: current.hairC.clone() },
      uOpacity: { value: 0.92 },
    },
    vertexShader: hairVertex,
    fragmentShader: hairFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const hair = new THREE.Group();
  const strandCount = 24;
  for (let i = 0; i < strandCount; i++) {
    const a = (i / strandCount) * Math.PI * 2;
    const x = Math.sin(a) * 0.29;
    const z = Math.cos(a) * 0.26;
    if (z > 0.1 && Math.abs(x) < 0.25) continue;
    const rootY = 1.4 - Math.max(0, z) * 0.12;
    const len = 0.9 + Math.random() * 0.55;
    const points = [
      [x * 0.72, rootY, z * 0.72],
      [x * 1.08, rootY - 0.16, z * 1.02 - 0.02],
      [x * 1.38 + rand(-0.06, 0.06), rootY - 0.46, z * 1.18 - 0.08],
      [x * 1.55 + rand(-0.08, 0.08), rootY - 0.86, z * 1.12 - 0.16],
      [x * 1.4 + rand(-0.1, 0.1), rootY - 1.26, z * 0.94 - 0.2],
      [x * 1.2 + rand(-0.12, 0.12), rootY - 1.26 - len * 0.5, z * 0.78 - 0.18],
    ];
    const width = 0.035 + Math.random() * 0.05;
    const strand = new THREE.Mesh(ribbonGeometry(points, width, 46), hairMat);
    strand.renderOrder = 2;
    hair.add(strand);
  }
  body.add(hair);

  // sculpted hair mass
  const hairMassMat = new THREE.MeshPhysicalMaterial({
    color: 0x5a1a6e,
    metalness: 0.75,
    roughness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    iridescence: 1,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [150, 800],
    envMapIntensity: 1,
    emissive: 0x1a0525,
    emissiveIntensity: 0.5,
  });
  const hairMass = new THREE.Group();
  const hairMassGeo = new THREE.SphereGeometry(1, 32, 24);
  [
    [0, 1.3, -0.1, 0.33, 0.23, 0.29],
    [0, 1.07, -0.22, 0.37, 0.4, 0.23],
    [0, 0.72, -0.28, 0.29, 0.4, 0.16],
    [0.255, 1.19, -0.03, 0.125, 0.3, 0.2],
    [-0.255, 1.19, -0.03, 0.125, 0.3, 0.2],
    [0.295, 0.91, -0.11, 0.105, 0.32, 0.14],
    [-0.295, 0.91, -0.11, 0.105, 0.32, 0.14],
    [0.22, 0.61, -0.19, 0.095, 0.28, 0.1],
    [-0.22, 0.61, -0.19, 0.095, 0.28, 0.1],
  ].forEach(([x, y, z, sx, sy, sz]) => {
    const lobe = new THREE.Mesh(hairMassGeo, hairMassMat);
    lobe.position.set(x, y, z);
    lobe.scale.set(sx, sy, sz);
    hairMass.add(lobe);
  });
  body.add(hairMass);

  // fringe, face-framing locks and long waves
  const locks = [
    [[-0.12, 1.47, 0.19], [-0.16, 1.36, 0.24], [-0.19, 1.27, 0.25], [-0.21, 1.19, 0.21]],
    [[-0.04, 1.49, 0.21], [-0.05, 1.37, 0.27], [-0.06, 1.27, 0.28], [-0.08, 1.19, 0.23]],
    [[0.05, 1.49, 0.21], [0.06, 1.37, 0.27], [0.08, 1.27, 0.28], [0.1, 1.19, 0.23]],
    [[0.13, 1.47, 0.19], [0.17, 1.36, 0.24], [0.2, 1.27, 0.25], [0.22, 1.19, 0.21]],
    [[-0.23, 1.4, 0.1], [-0.31, 1.22, 0.14], [-0.35, 0.98, 0.12], [-0.33, 0.72, 0.04], [-0.27, 0.46, -0.04]],
    [[0.23, 1.4, 0.1], [0.31, 1.22, 0.14], [0.35, 0.98, 0.12], [0.33, 0.72, 0.04], [0.27, 0.46, -0.04]],
    [[-0.12, 1.34, -0.22], [-0.24, 1.1, -0.3], [-0.33, 0.78, -0.34], [-0.36, 0.42, -0.3], [-0.3, 0.08, -0.22]],
    [[0.12, 1.34, -0.22], [0.24, 1.1, -0.3], [0.33, 0.78, -0.34], [0.36, 0.42, -0.3], [0.3, 0.08, -0.22]],
    [[-0.05, 1.36, -0.26], [-0.1, 1.1, -0.36], [-0.15, 0.8, -0.4], [-0.18, 0.45, -0.36], [-0.14, 0.1, -0.28]],
    [[0.05, 1.36, -0.26], [0.1, 1.1, -0.36], [0.15, 0.8, -0.4], [0.18, 0.45, -0.36], [0.14, 0.1, -0.28]],
  ];
  locks.forEach((points, i) => {
    const width = i < 4 ? 0.03 : 0.052 + (i % 2) * 0.018;
    const strand = new THREE.Mesh(ribbonGeometry(points, width, 40), hairMat);
    strand.renderOrder = 2;
    hair.add(strand);
  });

  // halo rings
  const haloGroup = new THREE.Group();
  haloGroup.position.y = 1.46;
  body.add(haloGroup);
  const haloMats = [];
  const haloSpecs = [
    [0.6, 0.011, 1.24, 0.14, 0.68],
    [0.76, 0.008, 0.96, -0.22, 0.48],
    [0.92, 0.005, 0.64, -0.38, 0.26],
  ];
  const haloRings = [];
  haloSpecs.forEach(([radius, tube, rx, rz, opacity]) => {
    const mat = makeHaloMaterial(palette.halo, palette.skyAccent, opacity);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 180), mat);
    ring.rotation.x = rx;
    ring.rotation.z = rz;
    haloGroup.add(ring);
    haloMats.push(mat);
    haloRings.push(ring);
  });

  const bodyRing = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.005, 6, 160), makeHaloMaterial(palette.skyMid, palette.skyAccent, 0.26));
  bodyRing.rotation.x = Math.PI / 2;
  bodyRing.position.y = 0.06;
  body.add(bodyRing);
  haloMats.push(bodyRing.material);

  // accent ribbons woven through the hair
  const hairRibbonMat = makeHaloMaterial(palette.halo, palette.skyAccent, 0.5);
  haloMats.push(hairRibbonMat);
  [
    [[-0.22, 1.38, 0.05], [-0.34, 1.15, 0.12], [-0.38, 0.9, 0.05], [-0.34, 0.65, -0.02]],
    [[0.22, 1.38, 0.05], [0.34, 1.15, 0.12], [0.38, 0.9, 0.05], [0.34, 0.65, -0.02]],
  ].forEach((points) => {
    const ribbon = new THREE.Mesh(ribbonGeometry(points, 0.017, 32), hairRibbonMat);
    ribbon.renderOrder = 3;
    body.add(ribbon);
  });

  const haloGlow = makeGlowSprite(palette.halo, 2.0, 0.1);
  haloGlow.position.y = 1.5;
  body.add(haloGlow);

  // heart
  const heartMat = new THREE.MeshBasicMaterial({ color: palette.heart, toneMapped: false });
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), heartMat);
  heart.position.set(0, 0.24, 0.31);
  heart.scale.set(0.8, 1.15, 0.6);
  body.add(heart);
  const heartGlow = makeGlowSprite(palette.heart, 0.8, 0.6);
  heartGlow.position.copy(heart.position);
  body.add(heartGlow);
  const heartLight = new THREE.PointLight(palette.heart, 12, 4.5, 2);
  heartLight.position.set(0, 0.25, 0.44);
  body.add(heartLight);

  const chainMat = makeHaloMaterial(palette.halo, palette.skyAccent, 0.55);
  haloMats.push(chainMat);
  const chainCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.82, 0.115),
    new THREE.Vector3(0, 0.64, 0.2),
    new THREE.Vector3(0, 0.44, 0.27),
    new THREE.Vector3(0, 0.28, 0.31),
  ]);
  body.add(new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 24, 0.004, 6, false), chainMat));

  // arms
  const armMat = chrome;
  const rightCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.41, 0.44, 0),
    new THREE.Vector3(0.6, 0.52, 0.03),
    new THREE.Vector3(0.73, 0.7, 0.09),
    new THREE.Vector3(0.79, 0.88, 0.15),
  ]);
  const leftCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.41, 0.44, 0),
    new THREE.Vector3(-0.6, 0.29, 0.06),
    new THREE.Vector3(-0.71, 0.04, 0.13),
    new THREE.Vector3(-0.77, -0.22, 0.18),
  ]);

  for (const [curve, side] of [
    [rightCurve, 1],
    [leftCurve, -1],
  ]) {
    const arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.072, 12, false), armMat);
    body.add(arm);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.145, 24, 18), armMat);
    shoulder.position.set(side * 0.42, 0.44, 0);
    shoulder.scale.set(1.05, 0.9, 0.9);
    body.add(shoulder);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.076, 18, 14), armMat);
    elbow.position.copy(curve.getPoint(0.55));
    body.add(elbow);
    const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), armMat);
    wrist.position.copy(curve.getPoint(0.94));
    body.add(wrist);

    const seamPoints = curve.points.map((p) => p.clone().add(new THREE.Vector3(0, 0, 0.075)));
    const seamCurve = new THREE.CatmullRomCurve3(seamPoints);
    const seamMat = makeHaloMaterial(palette.halo, palette.skyAccent, 0.55);
    haloMats.push(seamMat);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(seamCurve, 32, 0.005, 6, false), seamMat));

    [0.3, 0.86].forEach((t, idx) => {
      const bandMat = makeHaloMaterial(palette.halo, palette.skyAccent, 0.7);
      haloMats.push(bandMat);
      const band = new THREE.Mesh(new THREE.TorusGeometry(idx ? 0.066 : 0.083, 0.007, 6, 36), bandMat);
      band.position.copy(curve.getPoint(t));
      band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangent(t).normalize());
      body.add(band);
    });
  }

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 18), armMat);
  rightHand.position.set(0.8, 0.93, 0.16);
  rightHand.scale.set(0.95, 1.35, 0.65);
  rightHand.rotation.z = -0.5;
  body.add(rightHand);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 18), armMat);
  leftHand.position.set(-0.785, -0.28, 0.19);
  leftHand.scale.set(0.85, 1.5, 0.6);
  leftHand.rotation.z = 0.25;
  body.add(leftHand);

  const fingertipMat = new THREE.MeshBasicMaterial({ color: palette.eye, toneMapped: false });
  const fingertipGeo = new THREE.SphereGeometry(0.014, 10, 8);
  const fingertipPositions = [
    [0.84, 1.02, 0.17],
    [0.87, 0.99, 0.15],
    [0.8, 0.99, 0.2],
    [0.75, 1.0, 0.14],
    [-0.8, -0.39, 0.2],
    [-0.75, -0.4, 0.22],
    [-0.84, -0.4, 0.18],
  ];
  fingertipPositions.forEach(([x, y, z]) => {
    const tip = new THREE.Mesh(fingertipGeo, fingertipMat);
    tip.position.set(x, y, z);
    body.add(tip);
  });

  // hand orb
  const orbMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const handOrb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 18), orbMat);
  handOrb.position.set(0.83, 1.14, 0.2);
  body.add(handOrb);
  const orbGlow = makeGlowSprite(palette.skyAccent, 0.7, 0.7);
  orbGlow.position.copy(handOrb.position);
  body.add(orbGlow);
  const orbRingMat = makeHaloMaterial(palette.skyAccent, palette.halo, 0.8);
  const orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.004, 6, 80), orbRingMat);
  orbRing.position.copy(handOrb.position);
  orbRing.rotation.x = 1.2;
  body.add(orbRing);

  // dark bodysuit under the holographic gown
  const bodysuitProfile = torsoProfile
    .filter((p) => p.y <= 0.36)
    .map((p) => new THREE.Vector2(p.x * 1.015, p.y));
  const bodysuitMat = new THREE.MeshPhysicalMaterial({
    color: 0x12041f,
    metalness: 0.8,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 1,
    iridescenceIOR: 1.65,
    iridescenceThicknessRange: [120, 760],
    envMapIntensity: 1.15,
  });
  const bodysuit = new THREE.Mesh(new THREE.LatheGeometry(bodysuitProfile, 72), bodysuitMat);
  bodysuit.scale.z = 0.65;
  body.add(bodysuit);

  const chestTrimMat = makeHaloMaterial(palette.halo, palette.skyAccent, 0.5);
  const chestTrim = new THREE.Mesh(new THREE.TorusGeometry(0.452, 0.006, 6, 100), chestTrimMat);
  chestTrim.rotation.x = Math.PI / 2;
  chestTrim.position.y = 0.335;
  chestTrim.scale.z = 0.65;
  body.add(chestTrim);
  haloMats.push(chestTrimMat);

  const boneMat = makeHaloMaterial(palette.halo, palette.skyAccent, 0.42);
  haloMats.push(boneMat);
  [-0.14, -0.05, 0.05, 0.14].forEach((x) => {
    const boneCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x * 0.8, 0.02, 0.205),
      new THREE.Vector3(x * 0.95, 0.14, 0.228),
      new THREE.Vector3(x, 0.28, 0.27),
    ]);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(boneCurve, 16, 0.0045, 6, false), boneMat));
  });

  for (const side of [-1, 1]) {
    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 18), darkGlass);
    pauldron.position.set(side * 0.42, 0.5, 0);
    pauldron.scale.set(1.05, 0.62, 1.0);
    body.add(pauldron);
    const pauldronRim = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.008, 6, 40), chrome);
    pauldronRim.position.copy(pauldron.position);
    pauldronRim.rotation.x = Math.PI / 2;
    pauldronRim.scale.z = 0.95;
    body.add(pauldronRim);

    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.12, 0.35, 0.22),
      new THREE.Vector3(side * 0.26, 0.42, 0.12),
      new THREE.Vector3(side * 0.38, 0.48, 0.0),
    ]);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 16, 0.013, 8, false), chrome));
  }

  const waistTrimMat = makeHaloMaterial(palette.halo, palette.skyAccent, 0.7);
  const waistTrim = new THREE.Mesh(new THREE.TorusGeometry(0.318, 0.007, 6, 100), waistTrimMat);
  waistTrim.rotation.x = Math.PI / 2;
  waistTrim.position.y = 0.045;
  body.add(waistTrim);
  haloMats.push(waistTrimMat);

  const beltGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), gemMat);
  beltGem.position.set(0, 0.045, 0.31);
  beltGem.scale.set(1, 1.4, 0.6);
  body.add(beltGem);

  // gown
  const gownProfile = new THREE.SplineCurve([
    new THREE.Vector2(0.3, 0.04),
    new THREE.Vector2(0.33, -0.12),
    new THREE.Vector2(0.4, -0.36),
    new THREE.Vector2(0.52, -0.64),
    new THREE.Vector2(0.68, -0.94),
    new THREE.Vector2(0.88, -1.26),
    new THREE.Vector2(1.02, -1.48),
  ]).getPoints(48);
  const gownGeo = new THREE.LatheGeometry(gownProfile, 96);
  gownGeo.scale(1, 1, 0.82);
  const gownMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: current.dressA.clone() },
      uColorB: { value: current.dressB.clone() },
      uColorC: { value: current.dressC.clone() },
      uOpacity: { value: 1 },
    },
    vertexShader: clothVertex,
    fragmentShader: clothFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const gown = new THREE.Mesh(gownGeo, gownMat);
  gown.renderOrder = 3;
  body.add(gown);

  const innerGown = new THREE.Mesh(
    new THREE.LatheGeometry(
      new THREE.SplineCurve([
        new THREE.Vector2(0.27, 0.0),
        new THREE.Vector2(0.31, -0.2),
        new THREE.Vector2(0.4, -0.5),
        new THREE.Vector2(0.52, -0.9),
        new THREE.Vector2(0.62, -1.25),
      ]).getPoints(32),
      64
    ),
    new THREE.MeshPhysicalMaterial({
      color: 0x2a0c3f,
      metalness: 0.8,
      roughness: 0.15,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.2,
    })
  );
  innerGown.scale.z = 0.82;
  innerGown.renderOrder = 1;
  body.add(innerGown);

  // cape
  const capeGeo = new THREE.PlaneGeometry(1.45, 2.5, 28, 44);
  const capeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: current.dressA.clone() },
      uColorB: { value: current.dressB.clone() },
      uColorC: { value: current.dressC.clone() },
      uOpacity: { value: 0.85 },
    },
    vertexShader: clothVertex,
    fragmentShader: capeFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const cape = new THREE.Mesh(capeGeo, capeMat);
  cape.position.set(0, 0.28, -0.36);
  cape.rotation.x = -0.06;
  cape.renderOrder = 0;
  body.add(cape);

  // orbiting gems
  const gemCount = 18;
  const gemMesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.032, 0),
    new THREE.MeshBasicMaterial({ toneMapped: false }),
    gemCount
  );
  gemMesh.frustumCulled = false;
  body.add(gemMesh);
  const gemData = [];
  for (let i = 0; i < gemCount; i++) {
    gemData.push({
      radius: rand(0.95, 1.55),
      y: rand(-0.15, 1.45),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.15, 0.4) * (Math.random() > 0.5 ? 1 : -1),
      scale: rand(0.55, 1.4),
      bob: rand(0.05, 0.2),
    });
    gemMesh.setColorAt(i, i % 3 === 0 ? target.gemC : i % 3 === 1 ? target.gemA : target.gemB);
  }
  gemMesh.instanceColor.needsUpdate = true;

  let time = 0;
  let destruction = 0;
  let morph = 0;
  let creation = 0;
  let pointerX = 0;
  let pointerY = 0;
  const dummy = new THREE.Object3D();
  const red = new THREE.Color(0xff2444);
  const tmpColor = new THREE.Color();

  function setPalette(p) {
    target.hairA.set(p.hairA);
    target.hairB.set(p.hairB);
    target.hairC.set(p.hairC);
    target.dressA.set(p.dressA);
    target.dressB.set(p.dressB);
    target.dressC.set(p.dressC);
    target.heart.set(p.heart);
    target.haloA.set(p.halo);
    target.haloB.set(p.skyAccent);
    target.eye.set(p.eye);
    target.gemA.set(p.skyMid);
    target.gemB.set(p.skyAccent);
    fingertipMat.color.set(p.eye);
  }

  function react(power) {
    if (power === "destroy") destruction = 1;
    if (power === "change") morph = 1;
    if (power === "create") creation = 1;
  }

  function update(dt, elapsed, pointer = { x: 0, y: 0 }) {
    time = elapsed;
    pointerX += (pointer.x - pointerX) * Math.min(1, dt * 3);
    pointerY += (pointer.y - pointerY) * Math.min(1, dt * 3);
    destruction = Math.max(0, destruction - dt * 0.5);
    creation = Math.max(0, creation - dt * 0.6);
    morph = Math.max(0, morph - dt * 2.2);

    const k = 1 - Math.exp(-2.6 * dt);
    current.hairA.lerp(target.hairA, k);
    current.hairB.lerp(target.hairB, k);
    current.hairC.lerp(target.hairC, k);
    current.dressA.lerp(target.dressA, k);
    current.dressB.lerp(target.dressB, k);
    current.dressC.lerp(target.dressC, k);
    current.heart.lerp(target.heart, k);
    current.haloA.lerp(target.haloA, k);
    current.haloB.lerp(target.haloB, k);
    current.eye.lerp(target.eye, k);
    current.gemA.lerp(target.gemA, k);
    current.gemB.lerp(target.gemB, k);

    const destroyEase = destruction * destruction;
    const eyeColor = tmpColor.copy(current.eye).lerp(red, destroyEase);
    eyeMat.color.copy(eyeColor);
    fingertipMat.color.copy(eyeColor);
    heartMat.color.copy(tmpColor.copy(current.heart).lerp(red, destroyEase));
    heartGlow.material.color.copy(heartMat.color);
    heartLight.color.copy(heartMat.color);
    orbMat.color.copy(tmpColor.copy(current.eye).lerp(red, destroyEase * 0.7));
    orbGlow.material.color.copy(tmpColor.copy(current.haloB).lerp(red, destroyEase * 0.7));

    hairMat.uniforms.uColorA.value.copy(current.hairA);
    hairMat.uniforms.uColorB.value.copy(current.hairB);
    hairMat.uniforms.uColorC.value.copy(current.hairC);
    hairMat.uniforms.uTime.value = time;

    gownMat.uniforms.uColorA.value.copy(current.dressA);
    gownMat.uniforms.uColorB.value.copy(current.dressB);
    gownMat.uniforms.uColorC.value.copy(current.dressC);
    gownMat.uniforms.uTime.value = time;

    capeMat.uniforms.uColorA.value.copy(current.dressA);
    capeMat.uniforms.uColorB.value.copy(current.dressB);
    capeMat.uniforms.uColorC.value.copy(current.dressC);
    capeMat.uniforms.uTime.value = time;

    haloMats.forEach((mat) => {
      mat.uniforms.uColorA.value.copy(current.haloA);
      mat.uniforms.uColorB.value.copy(current.haloB);
      mat.uniforms.uTime.value = time;
    });
    orbRingMat.uniforms.uColorA.value.copy(current.gemB);
    orbRingMat.uniforms.uColorB.value.copy(current.haloA);
    orbRingMat.uniforms.uTime.value = time;

    gemData.forEach((g, i) => {
      gemMesh.setColorAt(i, i % 3 === 0 ? current.gemC : i % 3 === 1 ? current.gemA : current.gemB);
    });
    gemMesh.instanceColor.needsUpdate = true;

    root.position.y = 0.14 + Math.sin(time * 0.7) * 0.045 + creation * 0.04;
    body.rotation.y = Math.sin(time * 0.28) * 0.07 + pointerX * 0.08;
    body.rotation.z = Math.sin(time * 0.42) * 0.012 + destruction * Math.sin(time * 38) * 0.006;
    body.rotation.x = pointerY * 0.02;

    const squash = morph * 0.07;
    body.scale.set(1 + squash, 1 - squash * 0.75, 1 + squash);

    head.rotation.y = Math.sin(time * 0.36) * 0.08 + pointerX * 0.16;
    head.rotation.z = Math.sin(time * 0.52) * 0.02 + destruction * Math.sin(time * 23) * 0.02;
    head.rotation.x = pointerY * 0.05;

    haloRings[0].rotation.z += dt * (0.35 + destruction * 1.6);
    haloRings[1].rotation.z -= dt * (0.22 + destruction * 1.1);
    haloRings[2].rotation.y += dt * 0.14;
    bodyRing.rotation.z += dt * 0.12;
    haloGlow.material.opacity = 0.08 + Math.sin(time * 1.4) * 0.03 + creation * 0.08;
    haloGlow.scale.setScalar(2.0 + Math.sin(time * 1.1) * 0.1 + creation * 0.45);

    heart.scale.set(0.8 + Math.sin(time * 2.2) * 0.08 + creation * 0.18, 1.15 + Math.sin(time * 2.2) * 0.1, 0.6);
    heart.rotation.y += dt * 0.7;
    heartGlow.material.opacity = 0.45 + Math.sin(time * 2.2) * 0.15 + creation * 0.2;
    heartGlow.scale.setScalar(0.95 + Math.sin(time * 2.2) * 0.1 + creation * 0.4);
    heartLight.intensity = 10 + Math.sin(time * 2.2) * 4 + creation * 12;

    handOrb.position.y = 1.14 + Math.sin(time * 1.5) * 0.035 + creation * 0.05;
    handOrb.scale.setScalar(1 + Math.sin(time * 2.4) * 0.08 + creation * 0.5);
    orbGlow.position.copy(handOrb.position);
    orbGlow.scale.setScalar(0.7 + Math.sin(time * 2.1) * 0.07 + creation * 0.6);
    orbRing.position.copy(handOrb.position);
    orbRing.rotation.z += dt * 0.8;
    orbRing.rotation.x = 1.2 + Math.sin(time * 0.7) * 0.3;

    eyeGlows.forEach((glow, i) => {
      glow.material.opacity = 0.5 + Math.sin(time * 2.6 + i) * 0.18 + destruction * 0.4;
      glow.scale.setScalar(0.3 + Math.sin(time * 2.1 + i) * 0.03 + creation * 0.1);
    });

    gemData.forEach((g, i) => {
      const a = g.phase + time * g.speed;
      dummy.position.set(Math.cos(a) * g.radius, g.y + Math.sin(time * 0.8 + g.phase) * g.bob, Math.sin(a) * g.radius);
      dummy.rotation.set(time * 0.8 + i, time * 0.6 + i * 0.3, 0);
      dummy.scale.setScalar(g.scale * (1 + Math.sin(time * 1.7 + g.phase) * 0.15));
      dummy.updateMatrix();
      gemMesh.setMatrixAt(i, dummy.matrix);
    });
    gemMesh.instanceMatrix.needsUpdate = true;

    thirdEye.rotation.y += dt * 0.7;
    crownGem.rotation.y -= dt * 0.5;
  }

  return { root, body, head, setPalette, react, update, materials: { chrome, darkGlass }, haloGlow };
}
