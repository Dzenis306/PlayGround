import * as THREE from "three";

export function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.22, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.26)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function limb(a, b, radiusA, radiusB, material, radialSegments = 14) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radiusB, radiusA, length, radialSegments, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function ball(position, radius, scale, material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 18), material);
  mesh.position.copy(position);
  if (scale) mesh.scale.copy(scale);
  return mesh;
}

function sprite(texture, color, scale, opacity = 1) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  const item = new THREE.Sprite(material);
  item.scale.set(scale, scale, 1);
  return item;
}

export function createGoddess(palette, quality) {
  const root = new THREE.Group();
  root.position.y = 0.02;
  const body = new THREE.Group();
  root.add(body);

  const glow = glowTexture();

  const white = new THREE.Color(0xffffff);

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xb58cc9,
    metalness: 1,
    roughness: 0.22,
    envMapIntensity: 1.0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    iridescence: 1,
    iridescenceIOR: 1.75,
    iridescenceThicknessRange: [110, 640],
  });

  // Porcelain-doll skin: warm enough to read as a face, cool enough to belong
  // to the chrome world. Lower env response keeps the bloom from washing it out.
  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xd79aae,
    metalness: 0.08,
    roughness: 0.44,
    clearcoat: 0.65,
    clearcoatRoughness: 0.3,
    iridescence: 0.3,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [180, 520],
    envMapIntensity: 0.55,
    sheen: 1,
    sheenColor: new THREE.Color(0xff9ecb),
    sheenRoughness: 0.55,
  });
  const skinShadow = new THREE.MeshStandardMaterial({
    color: 0xb06f8c,
    roughness: 0.5,
    metalness: 0.1,
  });

  const hairMaterial = new THREE.MeshStandardMaterial({
    color: 0x150020,
    metalness: 0.92,
    roughness: 0.24,
    emissive: 0x22002e,
    emissiveIntensity: 0.7,
    envMapIntensity: 1.5,
  });

  const hairAccent = new THREE.MeshStandardMaterial({
    color: 0x4a003f,
    metalness: 0.8,
    roughness: 0.3,
    emissive: palette.a.clone().multiplyScalar(0.5),
    emissiveIntensity: 1.2,
    envMapIntensity: 1.4,
  });

  // Torso — a lathed chrome silhouette with a pinched waist and flared hips.
  const profile = [
    [0.002, 0.83],
    [0.23, 0.845],
    [0.315, 0.9],
    [0.39, 0.99],
    [0.395, 1.09],
    [0.33, 1.23],
    [0.272, 1.39],
    [0.3, 1.54],
    [0.355, 1.69],
    [0.36, 1.8],
    [0.312, 1.9],
    [0.226, 1.985],
    [0.118, 2.03],
    [0.068, 2.06],
    [0.062, 2.1],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), chrome);
  torso.scale.z = 0.79;
  body.add(torso);

  const pelvis = ball(new THREE.Vector3(0, 0.99, -0.02), 0.35, new THREE.Vector3(1.02, 0.74, 0.84), chrome);
  body.add(pelvis);

  [-1, 1].forEach((side) => {
    body.add(
      ball(
        new THREE.Vector3(0.288 * side, 1.985, 0),
        0.082,
        new THREE.Vector3(1.08, 0.9, 1),
        chrome
      )
    );
  });

  // Neck and head.
  body.add(limb(new THREE.Vector3(0, 2.0, 0), new THREE.Vector3(0, 2.175, 0), 0.082, 0.058, skin));
  const head = ball(new THREE.Vector3(0, 2.35, 0.008), 0.178, new THREE.Vector3(0.9, 1.08, 0.94), skin);
  body.add(head);
  body.add(ball(new THREE.Vector3(0, 2.283, 0.038), 0.115, new THREE.Vector3(0.82, 0.72, 0.9), skin));

  // A painted face: dark sockets with reactor-core irises, arched brows,
  // a plum mouth and a soft blush. Everything sits proud of the skin so the
  // features survive bloom at a distance.
  const socketMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b0a30,
    roughness: 0.55,
    metalness: 0.15,
  });
  const irisMaterial = new THREE.MeshBasicMaterial({ color: 0xffe6ff });
  const eyeSprites = [];
  const blushSprites = [];
  [-1, 1].forEach((side) => {
    const socket = ball(
      new THREE.Vector3(0.058 * side, 2.366, 0.158),
      0.033,
      new THREE.Vector3(1.18, 0.64, 0.5),
      socketMaterial
    );
    socket.rotation.z = side * 0.12;
    body.add(socket);

    const iris = ball(
      new THREE.Vector3(0.058 * side, 2.366, 0.172),
      0.0135,
      new THREE.Vector3(1, 1, 0.55),
      irisMaterial
    );
    body.add(iris);

    const halo = sprite(glow, palette.a.clone(), 0.062, 0.45);
    halo.position.set(0.058 * side, 2.366, 0.186);
    body.add(halo);
    eyeSprites.push(halo);

    const blush = sprite(glow, palette.b.clone(), 0.09, 0.22);
    blush.position.set(0.092 * side, 2.312, 0.15);
    body.add(blush);
    blushSprites.push(blush);
  });

  // Nose: a soft shaded wedge rather than a cone.
  const nose = ball(new THREE.Vector3(0, 2.322, 0.168), 0.013, new THREE.Vector3(0.7, 1.25, 0.5), skinShadow);
  body.add(nose);

  const browMaterial = new THREE.MeshStandardMaterial({ color: 0x23052a, roughness: 0.45, metalness: 0.2 });
  [-1, 1].forEach((side) => {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.011, 0.013), browMaterial);
    brow.position.set(0.06 * side, 2.402, 0.16);
    brow.rotation.z = side * 0.12;
    body.add(brow);
  });

  const lipMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d1f52,
    roughness: 0.32,
    metalness: 0.25,
    emissive: palette.a.clone().multiplyScalar(0.2),
    emissiveIntensity: 1,
  });
  const lips = ball(new THREE.Vector3(0, 2.292, 0.163), 0.043, new THREE.Vector3(1, 0.4, 0.3), lipMaterial);
  body.add(lips);
  const lipLight = ball(
    new THREE.Vector3(0, 2.281, 0.171),
    0.022,
    new THREE.Vector3(1, 0.22, 0.18),
    new THREE.MeshBasicMaterial({ color: 0xffb3d4, transparent: true, opacity: 0.5 })
  );
  body.add(lipLight);

  // Hair cap and sculpted face frame.
  const cap = ball(new THREE.Vector3(0, 2.362, -0.05), 0.205, new THREE.Vector3(1.01, 1.03, 0.88), hairMaterial);
  body.add(cap);
  [-1, 1].forEach((side) => {
    body.add(
      ball(
        new THREE.Vector3(0.163 * side, 2.29, -0.028),
        0.1,
        new THREE.Vector3(0.72, 1.35, 0.9),
        hairMaterial
      )
    );
  });

  const hairPivot = new THREE.Group();
  hairPivot.position.set(0, 2.36, 0);
  body.add(hairPivot);

  const strandCount = quality.mobile ? 16 : 24;
  for (let i = 0; i < strandCount; i += 1) {
    const t = i / (strandCount - 1);
    const theta = 1.16 + t * (Math.PI * 2 - 2.32);
    const startRadius = 0.18;
    const start = new THREE.Vector3(
      Math.sin(theta) * startRadius,
      2.39 + (Math.random() - 0.5) * 0.13,
      Math.cos(theta) * startRadius - 0.035
    );
    const p1 = new THREE.Vector3(
      Math.sin(theta) * 0.255 + Math.sin(theta * 3.1) * 0.03,
      2.24 + (Math.random() - 0.5) * 0.12,
      Math.cos(theta) * 0.245 - 0.04
    );
    const p2 = new THREE.Vector3(
      Math.sin(theta) * (0.38 + Math.random() * 0.12) + Math.sin(theta * 2.3) * 0.07,
      1.82 + (Math.random() - 0.5) * 0.16,
      Math.cos(theta) * (0.34 + Math.random() * 0.12) - 0.05
    );
    const end = new THREE.Vector3(
      Math.sin(theta) * (0.46 + Math.random() * 0.28) + Math.sin(theta * 1.7) * 0.1,
      1.02 + Math.random() * 0.46,
      Math.cos(theta) * (0.38 + Math.random() * 0.22) - 0.02
    );
    const points = [start, p1, p2, end].map((point) => point.clone().sub(hairPivot.position));
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.45);
    const material = i % 3 === 0 ? hairAccent : hairMaterial;
    const strand = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 28, 0.016 + Math.random() * 0.02, 5, false),
      material
    );
    hairPivot.add(strand);
  }

  // Fringe.
  for (let i = 0; i < 6; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const start = new THREE.Vector3(side * 0.02, 2.52, 0.08);
    const end = new THREE.Vector3(side * (0.08 + Math.random() * 0.1), 2.29 + Math.random() * 0.07, 0.165);
    const mid = new THREE.Vector3(side * (0.1 + Math.random() * 0.06), 2.44, 0.15);
    const curve = new THREE.CatmullRomCurve3(
      [start, mid, end].map((point) => point.clone().sub(hairPivot.position)),
      false,
      "catmullrom",
      0.5
    );
    const strand = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.009 + Math.random() * 0.006, 5, false), hairMaterial);
    hairPivot.add(strand);
  }

  // Arms: one conjures, one lets a relic hover.
  const rightShoulder = new THREE.Vector3(0.295, 1.975, 0);
  const rightElbow = new THREE.Vector3(0.59, 2.225, 0.09);
  const rightWrist = new THREE.Vector3(0.735, 2.515, 0.225);
  const rightPalm = new THREE.Vector3(0.775, 2.605, 0.27);
  body.add(limb(rightShoulder, rightElbow, 0.078, 0.057, chrome));
  body.add(limb(rightElbow, rightWrist, 0.057, 0.042, chrome));
  body.add(ball(rightElbow, 0.05, null, chrome));
  body.add(ball(rightWrist, 0.042, null, chrome));
  const rightHand = ball(rightPalm, 0.055, new THREE.Vector3(1.15, 1.25, 0.65), chrome);
  rightHand.rotation.z = -0.4;
  body.add(rightHand);
  for (let i = 0; i < 3; i += 1) {
    const base = new THREE.Vector3(rightPalm.x + 0.005 + i * 0.018, rightPalm.y + 0.045, rightPalm.z + 0.012);
    const tip = new THREE.Vector3(base.x + 0.006 + i * 0.01, base.y + 0.075, base.z + 0.018);
    body.add(limb(base, tip, 0.011, 0.005, chrome, 6));
  }

  const leftShoulder = new THREE.Vector3(-0.295, 1.975, 0);
  const leftElbow = new THREE.Vector3(-0.525, 1.675, 0.08);
  const leftWrist = new THREE.Vector3(-0.535, 1.345, 0.175);
  const leftPalm = new THREE.Vector3(-0.52, 1.265, 0.215);
  body.add(limb(leftShoulder, leftElbow, 0.078, 0.057, chrome));
  body.add(limb(leftElbow, leftWrist, 0.057, 0.042, chrome));
  body.add(ball(leftElbow, 0.05, null, chrome));
  body.add(ball(leftWrist, 0.042, null, chrome));
  body.add(ball(leftPalm, 0.052, new THREE.Vector3(1.1, 1.3, 0.65), chrome));
  for (let i = 0; i < 3; i += 1) {
    const base = new THREE.Vector3(leftPalm.x - 0.012 - i * 0.016, leftPalm.y - 0.04, leftPalm.z + 0.01);
    const tip = new THREE.Vector3(base.x - 0.004 - i * 0.008, base.y - 0.06, base.z + 0.016);
    body.add(limb(base, tip, 0.01, 0.005, chrome, 6));
  }

  // Legs and heels, visible through the veil.
  [-1, 1].forEach((side) => {
    const hip = new THREE.Vector3(0.155 * side, 0.965, 0);
    const knee = new THREE.Vector3(0.16 * side, 0.535, 0.015);
    const ankle = new THREE.Vector3(0.145 * side, 0.105, 0.035);
    body.add(limb(hip, knee, 0.105, 0.07, chrome));
    body.add(limb(knee, ankle, 0.065, 0.042, chrome));
    body.add(ball(knee, 0.06, null, chrome));
    body.add(ball(ankle, 0.042, null, chrome));
    const foot = ball(new THREE.Vector3(0.145 * side, 0.055, 0.1), 0.07, new THREE.Vector3(0.95, 0.5, 1.9), chrome);
    body.add(foot);
    body.add(limb(new THREE.Vector3(0.145 * side, 0.05, -0.045), new THREE.Vector3(0.145 * side, 0.0, -0.06), 0.014, 0.008, chrome, 6));
  });

  // Belt.
  const beltMaterial = new THREE.MeshBasicMaterial({
    color: palette.a.clone(),
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.009, 6, 96), beltMaterial);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 1.0;
  belt.scale.z = 0.86;
  body.add(belt);

  // Flowing iridescent gown.
  const gownUniforms = {
    uTime: { value: 0 },
    uA: { value: palette.a.clone() },
    uB: { value: palette.b.clone() },
    uC: { value: palette.c.clone() },
  };
  const gownMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: gownUniforms,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec3 p = position;
        float t = uv.y;
        float wave = sin(p.x * 2.2 + uTime * 1.05) * 0.035 + cos(p.z * 2.7 - uTime * 0.8) * 0.035;
        p += normal * wave * (0.35 + 0.65 * t);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uA;
      uniform vec3 uB;
      uniform vec3 uC;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fres = pow(1.0 - abs(dot(vNormal, vView)), 2.1);
        float band = sin((vUv.y * 5.2 - uTime * 0.35 + fres * 1.8) * 3.14159);
        vec3 col = mix(uA, uB, smoothstep(-1.0, 1.0, band));
        col = mix(col, uC, fres * 0.65);
        float pleat = 0.72 + 0.28 * sin(vUv.x * 42.0 + vUv.y * 3.0);
        col *= pleat;
        float sparkle = pow(max(0.0, sin(vUv.x * 180.0 + vUv.y * 30.0 - uTime * 1.6)), 22.0);
        col += sparkle * 0.6;
        float hem = smoothstep(0.82, 1.0, vUv.y);
        col += uA * hem * 0.25;
        float alpha = 0.1 + 0.3 * fres + 0.08 * vUv.y + hem * 0.1;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const gownSegments = quality.mobile ? 64 : 96;
  const gownRows = 18;
  const gownPositions = [];
  const gownUvs = [];
  const gownIndices = [];
  for (let i = 0; i <= gownRows; i += 1) {
    const t = i / gownRows;
    const y = 0.995 - 0.865 * t;
    const baseRadius = 0.355 + 0.53 * Math.pow(t, 1.35);
    for (let j = 0; j <= gownSegments; j += 1) {
      const theta = (j / gownSegments) * Math.PI * 2;
      const wave = Math.sin(theta * 7 + t * 4.2) * 0.045 * t + Math.sin(theta * 3 - t * 6) * 0.02 * t;
      const radius = baseRadius + wave;
      const x = Math.sin(theta) * radius;
      const z = Math.cos(theta) * radius * 0.86;
      const yy = y + Math.sin(theta * 9 + t * 3) * 0.018 * t;
      gownPositions.push(x, yy, z);
      gownUvs.push(j / gownSegments, t);
    }
  }
  for (let i = 0; i < gownRows; i += 1) {
    for (let j = 0; j < gownSegments; j += 1) {
      const a = i * (gownSegments + 1) + j;
      const b = a + gownSegments + 1;
      gownIndices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const gownGeometry = new THREE.BufferGeometry();
  gownGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gownPositions, 3));
  gownGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(gownUvs, 2));
  gownGeometry.setIndex(gownIndices);
  gownGeometry.computeVertexNormals();
  const underskirtMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x3a0a4c,
    metalness: 0.95,
    roughness: 0.26,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    envMapIntensity: 1.5,
    depthWrite: false,
  });
  const underskirt = new THREE.Mesh(gownGeometry, underskirtMaterial);
  underskirt.renderOrder = 1;
  body.add(underskirt);

  const gown = new THREE.Mesh(gownGeometry, gownMaterial);
  gown.renderOrder = 2;
  body.add(gown);

  // Silk ribbons orbiting the gown.
  const ribbons = new THREE.Group();
  const ribbonCount = quality.mobile ? 4 : 7;
  for (let i = 0; i < ribbonCount; i += 1) {
    const angle = (i / ribbonCount) * Math.PI * 2;
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 1.75, 1, 20), gownMaterial);
    ribbon.position.set(Math.sin(angle) * 0.55, 0.42, Math.cos(angle) * 0.5);
    ribbon.rotation.y = angle;
    ribbon.rotation.z = (Math.random() - 0.5) * 0.25;
    ribbon.rotation.x = 0.08;
    ribbon.renderOrder = 3;
    ribbons.add(ribbon);
  }
  body.add(ribbons);

  // Crown of chrome shards.
  const crown = new THREE.Group();
  crown.position.y = 2.52;
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2;
    const height = 0.17 + (i === 0 ? 0.12 : Math.random() * 0.1);
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.035, height, 4), chrome);
    shard.position.set(Math.sin(angle) * 0.185, height * 0.42, Math.cos(angle) * 0.185);
    shard.rotation.x = Math.cos(angle) * 0.32;
    shard.rotation.z = -Math.sin(angle) * 0.32;
    crown.add(shard);
  }
  const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.006, 6, 80), beltMaterial);
  crownBand.rotation.x = Math.PI / 2;
  crown.add(crownBand);
  body.add(crown);

  // Halo rings.
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: palette.a.clone(),
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const haloMaterial2 = haloMaterial.clone();
  haloMaterial2.color = palette.b.clone();
  haloMaterial2.opacity = 0.55;
  const halo = new THREE.Group();
  halo.position.set(0, 2.42, -0.15);
  const haloInner = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.007, 6, 120), haloMaterial);
  const haloOuter = new THREE.Mesh(new THREE.TorusGeometry(0.465, 0.004, 6, 120), haloMaterial2);
  haloOuter.rotation.z = 0.5;
  halo.add(haloInner, haloOuter);
  body.add(halo);

  // Chest gem.
  const gemMaterial = new THREE.MeshBasicMaterial({ color: palette.a.clone() });
  const chestGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), gemMaterial);
  chestGem.position.set(0, 1.835, 0.285);
  chestGem.rotation.z = 0.2;
  body.add(chestGem);
  const chestGlow = sprite(glow, palette.a.clone(), 0.24, 0.24);
  chestGlow.position.set(0, 1.835, 0.27);
  body.add(chestGlow);

  // Shoulder relics.
  const shoulderRelics = [];
  [-1, 1].forEach((side) => {
    const relic = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), chrome);
    relic.scale.set(0.7, 2.8, 0.7);
    relic.position.set(0.43 * side, 2.16, 0.02);
    body.add(relic);
    shoulderRelics.push(relic);
  });

  // The conjured orb.
  const orb = new THREE.Group();
  orb.position.set(0.785, 2.77, 0.3);
  const orbCoreMaterial = new THREE.MeshBasicMaterial({ color: palette.a.clone() });
  const orbCore = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), orbCoreMaterial);
  const orbGlow = sprite(glow, palette.a.clone(), 0.95, 0.9);
  const orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.004, 5, 64), haloMaterial);
  orbRing.rotation.x = 1.1;
  const orbRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.003, 5, 64), haloMaterial2);
  orbRing2.rotation.set(0.4, 0.8, 0.2);
  const orbLight = new THREE.PointLight(palette.a.clone(), 2.2, 4.5, 2);
  orb.add(orbCore, orbGlow, orbRing, orbRing2, orbLight);
  body.add(orb);

  // A small relic above the open left palm.
  const leftRelic = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), gemMaterial);
  leftRelic.position.set(-0.53, 1.4, 0.25);
  leftRelic.scale.set(0.8, 1.6, 0.8);
  body.add(leftRelic);
  const leftRelicGlow = sprite(glow, palette.b.clone(), 0.4, 0.55);
  leftRelicGlow.position.copy(leftRelic.position);
  body.add(leftRelicGlow);

  // Backlight aura.
  const aura = sprite(glow, palette.c.clone(), 2.4, 0.1);
  aura.position.set(0, 2.0, -0.35);
  body.add(aura);

  let pulse = 0;
  let spin = 0;
  let spinVelocity = 0;

  function update(time, dt, currentPalette) {
    root.position.y = 0.02 + Math.sin(time * 0.8) * 0.026;

    spinVelocity *= Math.pow(0.2, dt);
    spin += spinVelocity * dt;
    pulse *= Math.pow(0.08, dt);

    body.rotation.y = Math.sin(time * 0.24) * 0.055 + spin;
    const scale = 1 + Math.sin(time * 1.2) * 0.004 + pulse * 0.08;
    body.scale.setScalar(scale);

    hairPivot.rotation.z = Math.sin(time * 0.52) * 0.024;
    hairPivot.rotation.x = Math.sin(time * 0.37) * 0.014;
    hairPivot.rotation.y = Math.sin(time * 0.29) * 0.032;

    gownUniforms.uTime.value = time;
    gownUniforms.uA.value.copy(currentPalette.a);
    gownUniforms.uB.value.copy(currentPalette.b);
    gownUniforms.uC.value.copy(currentPalette.c);
    ribbons.rotation.y = Math.sin(time * 0.4) * 0.08;

    crown.rotation.y = time * 0.14;
    crown.position.y = 2.52 + Math.sin(time * 1.1) * 0.012;

    halo.rotation.z = time * 0.35;
    halo.rotation.y = Math.sin(time * 0.5) * 0.18;
    haloInner.rotation.z = -time * 0.2;
    haloOuter.rotation.z = 0.5 + time * 0.28;

    haloMaterial.color.copy(currentPalette.a);
    haloMaterial2.color.copy(currentPalette.b);
    haloMaterial.opacity = 0.48 + Math.sin(time * 1.6) * 0.14;
    haloMaterial2.opacity = 0.3 + Math.sin(time * 1.2 + 1) * 0.1;

    beltMaterial.color.copy(currentPalette.a);
    lipMaterial.emissive.copy(currentPalette.a).multiplyScalar(0.2);
    gemMaterial.color.copy(currentPalette.a).lerp(white, 0.25);
    chestGem.rotation.y = time * 0.9;
    chestGem.position.y = 1.835 + Math.sin(time * 1.4) * 0.012;
    chestGlow.position.y = chestGem.position.y;
    chestGlow.material.color.copy(currentPalette.a);
    chestGlow.material.opacity = 0.18 + Math.sin(time * 1.8) * 0.06;

    shoulderRelics.forEach((relic, index) => {
      relic.position.y = 2.16 + Math.sin(time * 0.9 + index * 2) * 0.055;
      relic.rotation.y = time * 0.5 + index;
    });

    const orbPulse = 1 + Math.sin(time * 2.4) * 0.09;
    orbCore.scale.setScalar(orbPulse);
    orbGlow.scale.setScalar(0.9 * orbPulse);
    orbGlow.material.color.copy(currentPalette.a);
    orbCoreMaterial.color.copy(currentPalette.a).lerp(white, 0.35);
    orbRing.rotation.z = time * 0.8;
    orbRing2.rotation.z = -time * 0.6;
    orbLight.color.copy(currentPalette.a);
    orbLight.intensity = 2.2 + Math.sin(time * 2.4) * 0.6;

    leftRelic.rotation.y = -time * 0.7;
    leftRelic.position.y = 1.4 + Math.sin(time * 1.3) * 0.03;
    leftRelicGlow.position.y = leftRelic.position.y;
    leftRelicGlow.material.color.copy(currentPalette.b);
    leftRelicGlow.material.opacity = 0.45 + Math.sin(time * 1.7) * 0.14;

    eyeSprites.forEach((eyeGlow) => {
      eyeGlow.material.color.copy(currentPalette.a).lerp(white, 0.4);
      eyeGlow.material.opacity = 0.42 + Math.sin(time * 3.1) * 0.14;
    });
    irisMaterial.color.copy(currentPalette.a).lerp(white, 0.5);
    blushSprites.forEach((blush) => {
      blush.material.color.copy(currentPalette.b).lerp(white, 0.2);
    });

    aura.material.color.copy(currentPalette.c);
    aura.material.opacity = 0.08 + Math.sin(time * 0.9) * 0.03;
    aura.scale.setScalar(2.4 + Math.sin(time * 0.7) * 0.15);

    hairAccent.emissive.copy(currentPalette.a).multiplyScalar(0.55);
  }

  return {
    root,
    body,
    orb,
    gown,
    update,
    kick(amount = 1) {
      pulse = Math.min(1.4, pulse + amount);
    },
    spin(amount = 2.5) {
      spinVelocity += amount;
    },
    setPalette(currentPalette) {
      hairAccent.emissive.copy(currentPalette.a).multiplyScalar(0.55);
    },
  };
}
