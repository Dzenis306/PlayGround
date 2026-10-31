import * as THREE from "three";

const Y = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, t) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

function radialTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)", size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.18, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeTaperedTube(curve, radiusAt, tubularSegments = 72, radialSegments = 8) {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const p = curve.getPointAt(t);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    const r = radiusAt(t);

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * TAU;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);
      positions.push(p.x + r * (cos * n.x + sin * b.x), p.y + r * (cos * n.y + sin * b.y), p.z + r * (cos * n.z + sin * b.z));
      normals.push(cos * n.x + sin * b.x, cos * n.y + sin * b.y, cos * n.z + sin * b.z);
      uvs.push(t, j / radialSegments);
    }
  }

  for (let i = 1; i <= tubularSegments; i++) {
    for (let j = 1; j <= radialSegments; j++) {
      const a = (radialSegments + 1) * (i - 1) + (j - 1);
      const b = (radialSegments + 1) * i + (j - 1);
      const c = (radialSegments + 1) * i + j;
      const d = (radialSegments + 1) * (i - 1) + j;
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function makeLimb(a, b, rStart, rEnd, material, radialSegments = 16) {
  const dir = b.clone().sub(a);
  const len = Math.max(0.0001, dir.length());
  const geo = new THREE.CylinderGeometry(rEnd, rStart, len, radialSegments, 1, true);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y, dir.normalize());
  mesh.castShadow = true;
  return mesh;
}

function makeHand(fingersUp = true) {
  const group = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), null);
  palm.scale.set(0.92, 1.3, 0.56);
  group.add(palm);

  const fingerDirs = [-0.44, -0.15, 0.15, 0.44];
  fingerDirs.forEach((spread, i) => {
    const start = new THREE.Vector3(spread * 0.07, fingersUp ? 0.065 : -0.055, 0);
    const end = new THREE.Vector3(spread * 0.12, fingersUp ? 0.165 + (i === 1 ? 0.02 : 0) : -0.16, 0.005);
    const finger = makeLimb(start, end, 0.017, 0.011, null, 8);
    group.add(finger);
  });
  const thumb = makeLimb(new THREE.Vector3(-0.05, 0.012, 0.012), new THREE.Vector3(-0.12, 0.078, 0.038), 0.018, 0.011, null, 8);
  group.add(thumb);
  return group;
}

export class Goddess {
  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(0.58, 0, 0);
    this.time = 0;
    this.action = null;
    this.pointer = new THREE.Vector2();
    this.palette = {
      skin: new THREE.Color("#e6bcd6"),
      hair: new THREE.Color("#3b176b"),
      fabric: new THREE.Color("#260835"),
      accent: new THREE.Color("#ff3fba"),
      accent2: new THREE.Color("#6ff7ff"),
      chrome: new THREE.Color("#f5fbff"),
    };
    this.targetPalette = { ...this.palette };
    this.auraStrength = 1;
    this.handAnchor = new THREE.Object3D();
    this.orbAnchor = new THREE.Object3D();
    this.materials = [];
    this.rings = [];
    this.satellites = [];
    this.dressMeshes = [];
    this.hairMeshes = [];
    this.eyes = [];
    this.armGroups = [];
    this.legGroups = [];
    this.orb = new THREE.Group();

    this.build();
    this.group.add(this.aura);
    this.group.add(this.orbAnchor);
    this.group.add(this.handAnchor);
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }

  add(mesh, parent = this.group) {
    parent.add(mesh);
    return mesh;
  }

  makeMaterial(opts) {
    const mat = new THREE.MeshPhysicalMaterial(opts);
    this.materials.push(mat);
    return mat;
  }

  build() {
    this.skin = this.makeMaterial({
      color: this.palette.skin,
      roughness: 0.42,
      metalness: 0.04,
      clearcoat: 0.32,
      clearcoatRoughness: 0.28,
      iridescence: 0.18,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [90, 480],
      sheen: 0.22,
      sheenColor: new THREE.Color("#ff9ad9"),
      sheenRoughness: 0.6,
      envMapIntensity: 0.7,
    });

    this.hairMat = this.makeMaterial({
      color: this.palette.hair,
      roughness: 0.23,
      metalness: 0.42,
      clearcoat: 1,
      clearcoatRoughness: 0.07,
      iridescence: 1,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [120, 680],
      envMapIntensity: 1.15,
    });

    this.fabricMat = this.makeMaterial({
      color: this.palette.fabric,
      roughness: 0.22,
      metalness: 0.58,
      transparent: false,
      opacity: 1,
      side: THREE.DoubleSide,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      iridescence: 0.9,
      iridescenceIOR: 1.8,
      iridescenceThicknessRange: [100, 900],
      sheen: 0.65,
      sheenColor: new THREE.Color("#69f6ff"),
      sheenRoughness: 0.32,
      envMapIntensity: 1.0,
    });

    this.fabricInnerMat = this.fabricMat.clone();
    this.fabricInnerMat.color.set("#ff7ae0");
    this.fabricInnerMat.opacity = 0.14;
    this.fabricInnerMat.metalness = 0.3;
    this.fabricInnerMat.transparent = true;
    this.materials.push(this.fabricInnerMat);

    this.armorMat = this.makeMaterial({
      color: "#24072f",
      roughness: 0.21,
      metalness: 0.62,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      iridescence: 0.9,
      iridescenceIOR: 1.7,
      iridescenceThicknessRange: [120, 820],
      sheen: 0.55,
      sheenColor: new THREE.Color("#ff58c8"),
      sheenRoughness: 0.4,
      envMapIntensity: 1.0,
    });

    this.tulleMat = this.makeMaterial({
      color: "#5a0c63",
      roughness: 0.3,
      metalness: 0.25,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      iridescence: 1,
      iridescenceIOR: 1.8,
      iridescenceThicknessRange: [100, 900],
      sheen: 1,
      sheenColor: new THREE.Color("#7ef9ff"),
      sheenRoughness: 0.4,
      envMapIntensity: 0.9,
    });

    this.chrome = this.makeMaterial({
      color: this.palette.chrome,
      metalness: 1,
      roughness: 0.045,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.5,
    });

    this.dark = this.makeMaterial({
      color: "#110519",
      metalness: 0.86,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.5,
    });

    this.lipMat = this.makeMaterial({
      color: "#d71d85",
      roughness: 0.1,
      metalness: 0.55,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      emissive: "#4d062f",
      emissiveIntensity: 0.35,
      envMapIntensity: 2.1,
    });

    this.eyeWhite = this.makeMaterial({
      color: "#fff8ff",
      roughness: 0.08,
      metalness: 0.12,
      clearcoat: 1,
      emissive: "#ffd6f5",
      emissiveIntensity: 0.17,
      envMapIntensity: 1.5,
    });

    this.glowPink = new THREE.MeshBasicMaterial({
      color: "#ff3fba",
      toneMapped: false,
      transparent: true,
      opacity: 0.95,
    });
    this.glowCyan = new THREE.MeshBasicMaterial({
      color: "#74f8ff",
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
    });
    this.glowWhite = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      toneMapped: false,
      transparent: true,
      opacity: 0.92,
    });
    this.glowRibbon = new THREE.MeshBasicMaterial({
      color: "#8dffff",
      toneMapped: false,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.buildBody();
    this.buildHead();
    this.buildHair();
    this.buildArms();
    this.buildLegs();
    this.buildDress();
    this.buildHalo();
    this.buildOrbitals();
    this.buildAura();
    this.buildOrb();
  }

  buildBody() {
    const profile = [
      [0.115, 1.58],
      [0.27, 1.61],
      [0.36, 1.69],
      [0.375, 1.78],
      [0.345, 1.9],
      [0.295, 2.0],
      [0.248, 2.09],
      [0.235, 2.17],
      [0.255, 2.26],
      [0.29, 2.36],
      [0.312, 2.45],
      [0.306, 2.53],
      [0.295, 2.6],
      [0.205, 2.66],
      [0.125, 2.71],
    ];
    const torsoGeo = new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      72
    );
    torsoGeo.scale(1, 1, 0.7);
    this.torso = this.add(new THREE.Mesh(torsoGeo, this.skin));
    this.torso.name = "torso";

    const hips = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), this.skin));
    hips.position.set(0, 1.73, 0);
    hips.scale.set(0.36, 0.25, 0.27);

    const chestL = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), this.skin));
    chestL.position.set(-0.128, 2.435, 0.118);
    chestL.scale.set(0.113, 0.126, 0.09);
    chestL.rotation.z = -0.08;

    const chestR = chestL.clone();
    chestR.position.x = 0.128;
    chestR.rotation.z = 0.08;
    this.add(chestR);

    this.neck = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.095, 0.22, 24), this.skin));
    this.neck.position.set(0, 2.8, 0);

    const choker = this.add(new THREE.Mesh(new THREE.TorusGeometry(0.083, 0.014, 10, 36), this.chrome));
    choker.position.set(0, 2.858, 0);
    choker.rotation.x = Math.PI / 2;
    const chokerGem = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), this.glowPink));
    chokerGem.position.set(0, 2.84, 0.083);
    chokerGem.scale.set(0.8, 1.4, 0.65);

    const collarboneL = makeLimb(
      new THREE.Vector3(-0.03, 2.64, 0.1),
      new THREE.Vector3(-0.27, 2.67, 0.075),
      0.013,
      0.008,
      this.skin,
      10
    );
    this.add(collarboneL);
    const collarboneR = collarboneL.clone();
    collarboneR.position.x *= -1;
    this.add(collarboneR);
  }

  buildHead() {
    const headGeo = new THREE.SphereGeometry(0.235, 48, 40);
    const pos = headGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const ny = v.y / 0.235;
      if (ny < 0) {
        const t = Math.pow(-ny, 1.35);
        v.x *= 1 - 0.18 * t;
        v.z *= 1 - 0.12 * t;
      }
      if (ny > 0.45) {
        v.x *= 1 - 0.11 * (ny - 0.45);
      }
      v.y *= 1.02;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    headGeo.computeVertexNormals();
    headGeo.scale(0.95, 1.13, 0.92);
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 3.045, 0);
    this.group.add(this.headGroup);

    const head = this.add(new THREE.Mesh(headGeo, this.skin), this.headGroup);
    head.name = "head";

    // Jaw / chin volume
    const jaw = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), this.skin), this.headGroup);
    jaw.position.set(0, -0.11, 0.025);
    jaw.scale.set(0.145, 0.12, 0.155);

    // Ears
    [-1, 1].forEach((s) => {
      const ear = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), this.skin), this.headGroup);
      ear.position.set(s * 0.218, -0.005, 0.015);
      ear.scale.set(0.025, 0.06, 0.038);
      ear.rotation.z = s * 0.18;
    });

    // Eye sockets, whites, irises
    [-1, 1].forEach((s) => {
      const socket = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), this.dark), this.headGroup);
      socket.position.set(s * 0.082, 0.014, 0.184);
      socket.scale.set(0.069, 0.042, 0.025);
      socket.rotation.z = s * -0.13;

      const white = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), this.eyeWhite), this.headGroup);
      white.position.set(s * 0.082, 0.014, 0.196);
      white.scale.set(0.049, 0.026, 0.014);
      white.rotation.z = s * -0.13;

      const iris = this.add(new THREE.Mesh(new THREE.CircleGeometry(0.0205, 28), this.glowCyan), this.headGroup);
      iris.position.set(s * 0.082, 0.012, 0.2115);
      iris.rotation.z = s * -0.13;
      this.eyes.push(iris);

      const pupil = this.add(new THREE.Mesh(new THREE.CircleGeometry(0.0085, 20), this.dark), this.headGroup);
      pupil.position.set(s * 0.082, 0.012, 0.2125);
      pupil.rotation.z = s * -0.13;

      const glint = this.add(new THREE.Mesh(new THREE.CircleGeometry(0.0045, 12), this.glowWhite), this.headGroup);
      glint.position.set(s * 0.077, 0.023, 0.214);
      glint.rotation.z = s * -0.13;

      // Upper eyeliner / lid
      const lidCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.035, 0.028, 0.208),
        new THREE.Vector3(s * 0.055, 0.047, 0.219),
        new THREE.Vector3(s * 0.09, 0.051, 0.221),
        new THREE.Vector3(s * 0.123, 0.033, 0.209),
      ]);
      const lid = this.add(
        new THREE.Mesh(makeTaperedTube(lidCurve, (t) => 0.009 - t * 0.004, 20, 5), this.dark),
        this.headGroup
      );
      lid.rotation.z = 0;

      // Winged lash tips
      [0, 1].forEach((k) => {
        const start = new THREE.Vector3(s * (0.116 + k * 0.007), 0.046 - k * 0.007, 0.209);
        const end = new THREE.Vector3(s * (0.154 + k * 0.014), 0.068 + k * 0.005, 0.2);
        this.add(new THREE.Mesh(makeTaperedTube(new THREE.CatmullRomCurve3([start, end]), () => 0.0042 - k * 0.001, 8, 4), this.dark), this.headGroup);
      });

      // Soft cut-crease shadow
      const crease = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), this.lipMat), this.headGroup);
      crease.position.set(s * 0.086, 0.058, 0.19);
      crease.scale.set(0.047, 0.012, 0.008);
      crease.rotation.z = s * -0.12;
      crease.material = this.lipMat;

      // brow
      const browCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.035, 0.083, 0.195),
        new THREE.Vector3(s * 0.075, 0.098, 0.207),
        new THREE.Vector3(s * 0.125, 0.087, 0.188),
      ]);
      this.add(
        new THREE.Mesh(makeTaperedTube(browCurve, (t) => 0.007 - t * 0.004, 18, 5), this.dark),
        this.headGroup
      );
    });

    // Nose
    const nose = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), this.skin), this.headGroup);
    nose.position.set(0, -0.016, 0.218);
    nose.scale.set(0.019, 0.043, 0.035);
    nose.rotation.x = -0.18;

    const noseTip = this.add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), this.skin), this.headGroup);
    noseTip.position.set(0, -0.043, 0.226);

    // Lips
    const upperLip = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), this.lipMat), this.headGroup);
    upperLip.position.set(0, -0.097, 0.205);
    upperLip.scale.set(0.044, 0.012, 0.018);
    upperLip.rotation.x = -0.08;

    const lowerLip = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), this.lipMat), this.headGroup);
    lowerLip.position.set(0, -0.113, 0.202);
    lowerLip.scale.set(0.04, 0.016, 0.02);
    lowerLip.rotation.x = 0.13;

    // Cheek shimmer
    [-1, 1].forEach((s) => {
      const cheek = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), this.lipMat), this.headGroup);
      cheek.position.set(s * 0.135, -0.055, 0.168);
      cheek.scale.set(0.045, 0.018, 0.008);
      cheek.rotation.z = s * 0.25;
      cheek.material = this.lipMat;
    });

    // earrings
    [-1, 1].forEach((s) => {
      const chain = this.add(
        new THREE.Mesh(
          makeTaperedTube(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(s * 0.222, -0.035, 0.01),
              new THREE.Vector3(s * 0.238, -0.12, 0.02),
              new THREE.Vector3(s * 0.225, -0.22, 0.03),
              new THREE.Vector3(s * 0.2, -0.3, 0.04),
            ]),
            (t) => 0.0035,
            24,
            5
          ),
          this.chrome
        ),
        this.headGroup
      );
      const gem = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.024, 0), this.glowPink), this.headGroup);
      gem.position.set(s * 0.2, -0.315, 0.04);
      gem.scale.set(0.7, 1.5, 0.7);
    });

    // forehead jewel
    const jewel = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), this.glowPink), this.headGroup);
    jewel.position.set(0, 0.11, 0.205);
    jewel.rotation.z = 0.4;
    this.foreheadJewel = jewel;

    // crown / circlet
    const circlet = this.add(new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.008, 6, 80), this.chrome), this.headGroup);
    circlet.position.set(0, 0.12, -0.01);
    circlet.rotation.x = Math.PI / 2 + 0.17;

    // Radiant tiara at the hairline.
    for (let i = 0; i < 9; i++) {
      const k = (i - 4) / 4;
      const height = 0.06 + (1 - Math.abs(k)) * 0.095;
      const spike = this.add(
        new THREE.Mesh(new THREE.ConeGeometry(0.009 + (1 - Math.abs(k)) * 0.006, height, 5), this.chrome),
        this.headGroup
      );
      spike.position.set(k * 0.155, 0.175 + (1 - Math.abs(k)) * 0.055, 0.17 - Math.abs(k) * 0.025);
      spike.rotation.z = -k * 0.42;
      spike.rotation.x = -0.15;
      if (i % 2 === 0) {
        const tip = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.011, 0), this.glowCyan), this.headGroup);
        tip.position.copy(spike.position).add(new THREE.Vector3(0, height * 0.58, 0));
      }
    }
  }

  buildHair() {
    const hair = new THREE.Group();
    this.group.add(hair);
    this.hairGroup = hair;

    const back = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), this.hairMat), hair);
    back.position.set(0, 3.07, -0.085);
    back.scale.set(0.255, 0.33, 0.215);

    const top = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), this.hairMat), hair);
    top.position.set(0, 3.2, -0.035);
    top.scale.set(0.252, 0.195, 0.232);

    // Side volume gives the bob a sculpted, graphic silhouette.
    [-1, 1].forEach((s) => {
      const side = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), this.hairMat), hair);
      side.position.set(s * 0.192, 3.08, 0.005);
      side.scale.set(0.098, 0.225, 0.162);
      side.rotation.z = s * 0.08;
    });

    // Face-framing locks.
    [
      [
        [-0.155, 3.26, 0.115],
        [-0.235, 3.1, 0.16],
        [-0.26, 2.86, 0.17],
        [-0.235, 2.61, 0.12],
        [-0.27, 2.42, 0.03],
      ],
      [
        [0.145, 3.27, 0.11],
        [0.235, 3.1, 0.155],
        [0.255, 2.87, 0.16],
        [0.225, 2.63, 0.11],
        [0.27, 2.44, 0.01],
      ],
    ].forEach((pts, i) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const lock = this.add(new THREE.Mesh(makeTaperedTube(curve, (t) => lerp(0.052, 0.004, Math.pow(t, 0.85)), 42, 7), this.hairMat), hair);
      lock.rotation.z = i ? -0.01 : 0.01;
    });

    const strandCurves = [
      {
        pts: [
          [0.06, 3.33, -0.08],
          [0.12, 3.15, -0.31],
          [0.08, 2.83, -0.44],
          [0.02, 2.4, -0.46],
          [-0.03, 1.96, -0.4],
          [-0.02, 1.55, -0.31],
        ],
        r: [0.09, 0.015],
      },
      {
        pts: [
          [-0.04, 3.33, -0.07],
          [-0.13, 3.12, -0.28],
          [-0.16, 2.81, -0.39],
          [-0.13, 2.41, -0.36],
          [-0.16, 2.06, -0.3],
        ],
        r: [0.062, 0.008],
      },
      {
        pts: [
          [0.1, 3.31, -0.06],
          [0.22, 3.08, -0.22],
          [0.22, 2.8, -0.31],
          [0.19, 2.47, -0.27],
          [0.24, 2.17, -0.19],
        ],
        r: [0.052, 0.007],
      },
      {
        pts: [
          [-0.17, 3.2, 0.03],
          [-0.245, 3.02, 0.12],
          [-0.27, 2.75, 0.12],
          [-0.25, 2.48, 0.05],
          [-0.28, 2.25, 0.0],
        ],
        r: [0.04, 0.005],
      },
      {
        pts: [
          [0.17, 3.2, 0.02],
          [0.245, 3.02, 0.1],
          [0.26, 2.78, 0.08],
          [0.24, 2.53, 0.01],
          [0.27, 2.3, -0.04],
        ],
        r: [0.035, 0.004],
      },
    ];

    strandCurves.forEach(({ pts, r }, index) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const geo = makeTaperedTube(curve, (t) => lerp(r[0], r[1], Math.pow(t, 0.7)), 80, 7);
      const mesh = this.add(new THREE.Mesh(geo, this.hairMat), hair);
      this.hairMeshes.push({ mesh, base: mesh.position.clone(), phase: index });
    });

    // Sweeping fringe
    const fringeCurves = [
      [
        [0.06, 3.31, 0.08],
        [0.03, 3.26, 0.19],
        [-0.07, 3.17, 0.22],
        [-0.18, 3.08, 0.16],
      ],
      [
        [0.03, 3.32, 0.11],
        [-0.03, 3.27, 0.205],
        [-0.14, 3.17, 0.205],
        [-0.215, 3.05, 0.12],
      ],
      [
        [0.08, 3.3, 0.14],
        [0.11, 3.22, 0.21],
        [0.17, 3.12, 0.17],
        [0.22, 3.03, 0.08],
      ],
    ];
    fringeCurves.forEach((pts, i) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const geo = makeTaperedTube(curve, (t) => lerp(0.038, 0.003, t), 36, 6);
      this.add(new THREE.Mesh(geo, this.hairMat), hair);
    });

    // Hair cuffs
    [2.78, 2.48].forEach((y, i) => {
      const cuff = this.add(new THREE.Mesh(new THREE.TorusGeometry(0.082 - i * 0.012, 0.013, 8, 30), this.chrome), hair);
      cuff.position.set(0.06 - i * 0.015, y, -0.43 + i * 0.055);
      cuff.rotation.x = Math.PI / 2 + 0.2;
      cuff.rotation.z = 0.15;
    });
  }

  buildArms() {
    // Her right arm rises toward the halo.
    this.armR = this.buildArm(
      new THREE.Vector3(-0.305, 2.58, 0.0),
      new THREE.Vector3(-0.565, 2.78, 0.06),
      new THREE.Vector3(-0.67, 3.16, 0.1),
      true,
      -1
    );
    // Her left arm extends, palm open beneath the little universe.
    this.armL = this.buildArm(
      new THREE.Vector3(0.305, 2.58, 0.0),
      new THREE.Vector3(0.59, 2.41, 0.06),
      new THREE.Vector3(0.73, 2.13, 0.11),
      false,
      1
    );

    this.handAnchor.position.set(0.79, 2.21, 0.12);
    this.orbAnchor.position.set(0.79, 2.4, 0.13);
  }

  buildArm(shoulder, elbow, wrist, fingersUp, side) {
    const arm = new THREE.Group();
    arm.position.copy(shoulder);
    arm.userData.baseRotation = arm.rotation.clone();
    arm.userData.side = side;
    this.group.add(arm);
    this.armGroups.push(arm);

    const localElbow = elbow.clone().sub(shoulder);
    const localWrist = wrist.clone().sub(shoulder);

    const shoulderBall = this.add(new THREE.Mesh(new THREE.SphereGeometry(0.105, 22, 16), this.skin), arm);
    shoulderBall.scale.set(1, 0.95, 0.95);

    arm.add(makeLimb(new THREE.Vector3(0, 0, 0), localElbow, 0.082, 0.06, this.skin));
    const elbowBall = this.add(new THREE.Mesh(new THREE.SphereGeometry(0.062, 18, 12), this.skin), arm);
    elbowBall.position.copy(localElbow);

    const forearm = makeLimb(localElbow, localWrist, 0.058, 0.038, this.skin);
    arm.add(forearm);

    // Opera glove with a luminous cuff.
    const glove = makeLimb(localElbow, localWrist, 0.062, 0.043, this.armorMat);
    glove.scale.setScalar(1.012);
    arm.add(glove);

    const wristBall = this.add(new THREE.Mesh(new THREE.SphereGeometry(0.043, 16, 12), this.skin), arm);
    wristBall.position.copy(localWrist);

    const hand = makeHand(fingersUp);
    hand.children.forEach((child) => {
      if (child.isMesh) child.material = this.armorMat;
    });
    hand.position.copy(localWrist);
    const handDir = localWrist.clone().sub(localElbow).normalize();
    hand.quaternion.setFromUnitVectors(Y, handDir);
    hand.rotateY(side * 0.25);
    arm.add(hand);

    // Chrome cuff and bracelets
    const cuffDir = localWrist.clone().sub(localElbow);
    const cuff = this.add(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 24), this.chrome), arm);
    cuff.position.copy(localWrist).addScaledVector(cuffDir.normalize(), -0.045);
    cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), cuffDir);

    const upperCuff = this.add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 28), this.chrome), arm);
    upperCuff.position.copy(localElbow).addScaledVector(localElbow.clone().normalize(), -0.12);
    upperCuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localElbow.clone().normalize());

    // Shoulder armour
    const shoulderGem = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), this.chrome), arm);
    shoulderGem.position.set(-side * 0.01, 0.02, 0.085);
    shoulderGem.rotation.z = 0.3;

    return arm;
  }

  buildLegs() {
    const legs = [
      { hip: [-0.17, 1.72, 0], knee: [-0.18, 1.13, 0.02], ankle: [-0.18, 0.3, 0.045], side: -1 },
      { hip: [0.18, 1.72, 0], knee: [0.29, 1.15, 0.045], ankle: [0.24, 0.3, 0.07], side: 1 },
    ];

    legs.forEach(({ hip, knee, ankle, side }) => {
      const leg = new THREE.Group();
      leg.position.set(...hip);
      this.group.add(leg);
      this.legGroups.push(leg);

      const k = new THREE.Vector3(...knee).sub(new THREE.Vector3(...hip));
      const a = new THREE.Vector3(...ankle).sub(new THREE.Vector3(...hip));
      leg.add(makeLimb(new THREE.Vector3(0, 0, 0), k, 0.13, 0.093, this.skin));
      const kneeBall = this.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), this.skin), leg);
      kneeBall.position.copy(k);
      kneeBall.scale.set(0.95, 0.85, 1);
      leg.add(makeLimb(k, a, 0.09, 0.05, this.skin));

      // Thigh-high boot / iridescent stocking.
      const thighTop = k.clone().multiplyScalar(0.6);
      const upperBoot = makeLimb(thighTop, k, 0.121, 0.1, this.armorMat);
      leg.add(upperBoot);
      const thighDir = k.clone().normalize();
      const garter = this.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.011, 8, 30), this.chrome), leg);
      garter.position.copy(thighTop);
      garter.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), thighDir);
      const garterGem = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.023, 0), this.glowPink), leg);
      garterGem.position.copy(thighTop).add(new THREE.Vector3(0, 0, 0.116));

      const bootShaft = makeLimb(k, a, 0.098, 0.058, this.armorMat);
      leg.add(bootShaft);
      const shinDir = a.clone().sub(k).normalize();
      [0.17, 0.62].forEach((t, i) => {
        const band = this.add(new THREE.Mesh(new THREE.TorusGeometry(i ? 0.064 : 0.084, 0.009, 8, 26), this.chrome), leg);
        band.position.copy(k).addScaledVector(shinDir, (i ? 0.66 : 0.15));
        band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), shinDir);
      });

      const ankleBall = this.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), this.skin), leg);
      ankleBall.position.copy(a);

      // Boot / platform. The foot anchor sits at ankle height, soles at stage level.
      const foot = new THREE.Group();
      foot.position.set(ankle[0], 0.38, ankle[2] + 0.095);
      this.group.add(foot);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.42), this.chrome);
      sole.position.set(0, -0.165, 0.04);
      foot.add(sole);
      const boot = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), this.dark);
      boot.position.set(0, -0.005, 0.06);
      boot.scale.set(0.1, 0.105, 0.21);
      boot.rotation.x = 0.18;
      foot.add(boot);
      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), this.chrome);
      heel.position.set(0, -0.18, -0.12);
      foot.add(heel);
      const soleGlow = new THREE.Mesh(new THREE.BoxGeometry(0.195, 0.014, 0.43), this.glowCyan);
      soleGlow.position.set(0, -0.218, 0.04);
      foot.add(soleGlow);
      const toeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.06), this.glowPink);
      toeGlow.position.set(0, -0.115, 0.239);
      foot.add(toeGlow);
      foot.rotation.y = side * 0.08;
    });
  }

  buildDress() {
    // A short, sculpted skirt with a high front slit and a long liquid train.
    const yTop = 2.12;
    const segmentsU = 80;
    const segmentsV = 14;
    const phiStart = 0.38;
    const phiLength = 5.56;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let iv = 0; iv <= segmentsV; iv++) {
      const v = iv / segmentsV;
      for (let iu = 0; iu <= segmentsU; iu++) {
        const u = iu / segmentsU;
        const phi = phiStart + u * phiLength;
        const frontness = 0.5 + 0.5 * Math.cos(phi);
        const hemY = lerp(0.98, 1.62, frontness);
        const y = lerp(yTop, hemY, Math.pow(v, 0.94));
        const radius = lerp(0.255, 0.51, Math.pow(v, 1.45));
        const ripple = Math.sin(u * Math.PI * 7 + v * 5.2) * 0.022 * v;
        positions.push(Math.sin(phi) * (radius + ripple), y, Math.cos(phi) * (radius + ripple) * 0.92);
        uvs.push(u, v);
      }
    }
    for (let iv = 0; iv < segmentsV; iv++) {
      for (let iu = 0; iu < segmentsU; iu++) {
        const a = iv * (segmentsU + 1) + iu;
        const b = a + 1;
        const c = a + segmentsU + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const skirtGeo = new THREE.BufferGeometry();
    skirtGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    skirtGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    skirtGeo.setIndex(indices);
    skirtGeo.computeVertexNormals();

    this.skirt = this.add(new THREE.Mesh(skirtGeo, this.fabricMat));
    this.skirt.renderOrder = 1;
    this.skirtBase = skirtGeo.attributes.position.array.slice();
    this.dressMeshes.push(this.skirt);

    // Liquid train, built as a wide rippling sheet behind her.
    const trainU = 32;
    const trainV = 18;
    const trainPositions = [];
    const trainUvs = [];
    const trainIndices = [];
    for (let iv = 0; iv <= trainV; iv++) {
      const v = iv / trainV;
      for (let iu = 0; iu <= trainU; iu++) {
        const u = iu / trainU - 0.5;
        const width = 0.42 + v * 1.35;
        const x = u * width * 2 + Math.sin(v * 7.5 + u * 5) * 0.08 * v;
        const y = lerp(2.12, 0.035, v);
        const z = -0.2 - v * 0.82 - Math.cos(u * Math.PI) * 0.2 * v + Math.sin(v * 4.5) * 0.05;
        trainPositions.push(x, y, z);
        trainUvs.push(iu / trainU, v);
      }
    }
    for (let iv = 0; iv < trainV; iv++) {
      for (let iu = 0; iu < trainU; iu++) {
        const a = iv * (trainU + 1) + iu;
        const b = a + 1;
        const c = a + trainU + 1;
        const d = c + 1;
        trainIndices.push(a, c, b, b, c, d);
      }
    }
    const trainGeo = new THREE.BufferGeometry();
    trainGeo.setAttribute("position", new THREE.Float32BufferAttribute(trainPositions, 3));
    trainGeo.setAttribute("uv", new THREE.Float32BufferAttribute(trainUvs, 2));
    trainGeo.setIndex(trainIndices);
    trainGeo.computeVertexNormals();

    const trainMat = this.makeMaterial({
      color: "#55107a",
      roughness: 0.18,
      metalness: 0.5,
      transparent: true,
      opacity: 0.46,
      side: THREE.DoubleSide,
      depthWrite: false,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      iridescence: 1,
      iridescenceIOR: 1.7,
      iridescenceThicknessRange: [100, 900],
      sheen: 1,
      sheenColor: new THREE.Color("#69f6ff"),
      sheenRoughness: 0.3,
      envMapIntensity: 1.5,
    });
    this.train = this.add(new THREE.Mesh(trainGeo, trainMat));
    this.train.renderOrder = 0;

    // Corset / bodice
    const corsetProfile = [
      [0.24, 2.06],
      [0.27, 2.12],
      [0.255, 2.2],
      [0.268, 2.3],
      [0.295, 2.42],
      [0.3, 2.49],
      [0.282, 2.56],
    ];
    const corsetGeo = new THREE.LatheGeometry(
      corsetProfile.map(([r, y]) => new THREE.Vector2(r, y)),
      64
    );
    corsetGeo.scale(1, 1, 0.715);
    const corsetMat = this.makeMaterial({
      color: "#17031f",
      roughness: 0.17,
      metalness: 0.86,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      iridescence: 0.8,
      iridescenceIOR: 1.5,
      envMapIntensity: 1.8,
    });
    const corset = this.add(new THREE.Mesh(corsetGeo, corsetMat));
    corset.renderOrder = 1;

    // High-cut brief beneath the open skirt, so the silhouette stays deliberate.
    const briefProfile = [
      [0.285, 1.56],
      [0.33, 1.62],
      [0.36, 1.72],
      [0.35, 1.82],
      [0.31, 1.93],
      [0.27, 2.0],
    ];
    const briefGeo = new THREE.LatheGeometry(
      briefProfile.map(([r, y]) => new THREE.Vector2(r, y)),
      64
    );
    briefGeo.scale(1, 1, 0.76);
    const brief = this.add(new THREE.Mesh(briefGeo, this.armorMat));
    brief.renderOrder = 1;

    const briefV = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, 1.9, 0.165),
      new THREE.Vector3(-0.13, 1.78, 0.235),
      new THREE.Vector3(0, 1.7, 0.255),
      new THREE.Vector3(0.13, 1.78, 0.235),
      new THREE.Vector3(0.25, 1.9, 0.165),
    ]);
    this.add(new THREE.Mesh(makeTaperedTube(briefV, () => 0.0045, 40, 4), this.glowPink));

    // Sculpted, strapless bustier: one continuous liquid-metal shell instead
    // of pasted-on cups, with a sweetheart neckline and chrome piping.
    const bodiceMat = this.makeMaterial({
      color: "#3b0c55",
      roughness: 0.26,
      metalness: 0.45,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      iridescence: 1,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [120, 780],
      sheen: 0.6,
      sheenColor: new THREE.Color("#ff71d8"),
      sheenRoughness: 0.36,
      envMapIntensity: 1.1,
    });
    const bodiceU = 80;
    const bodiceV = 18;
    const bodicePos = [];
    const bodiceUv = [];
    const bodiceIdx = [];
    for (let iv = 0; iv <= bodiceV; iv++) {
      const v = iv / bodiceV;
      for (let iu = 0; iu <= bodiceU; iu++) {
        const u = iu / bodiceU;
        const phi = u * TAU;
        const topY = 2.65 - Math.pow(Math.max(0, Math.cos(phi)), 4) * 0.07;
        const y = lerp(2.025, topY, v);
        const bust = Math.sin(Math.min(1, v / 0.72) * Math.PI * 0.5);
        const radius = lerp(0.263, 0.315, bust) + Math.sin(v * Math.PI) * 0.022;
        bodicePos.push(Math.sin(phi) * radius, y, Math.cos(phi) * radius * 0.73);
        bodiceUv.push(u, v);
      }
    }
    for (let iv = 0; iv < bodiceV; iv++) {
      for (let iu = 0; iu < bodiceU; iu++) {
        const a = iv * (bodiceU + 1) + iu;
        const b = a + 1;
        const c = a + bodiceU + 1;
        const d = c + 1;
        bodiceIdx.push(a, c, b, b, c, d);
      }
    }
    const bodiceGeo = new THREE.BufferGeometry();
    bodiceGeo.setAttribute("position", new THREE.Float32BufferAttribute(bodicePos, 3));
    bodiceGeo.setAttribute("uv", new THREE.Float32BufferAttribute(bodiceUv, 2));
    bodiceGeo.setIndex(bodiceIdx);
    bodiceGeo.computeVertexNormals();
    const bodice = this.add(new THREE.Mesh(bodiceGeo, bodiceMat));
    bodice.renderOrder = 1;

    // Chrome neckline piping follows the sweetheart edge.
    const necklinePts = [];
    for (let i = 0; i <= 120; i++) {
      const phi = (i / 120) * TAU;
      const topY = 2.65 - Math.pow(Math.max(0, Math.cos(phi)), 4) * 0.07;
      necklinePts.push(new THREE.Vector3(Math.sin(phi) * 0.337, topY, Math.cos(phi) * 0.337 * 0.73));
    }
    this.add(new THREE.Mesh(makeTaperedTube(new THREE.CatmullRomCurve3(necklinePts, true), () => 0.006, 180, 5), this.chrome));

    // Vertical hardware and a gem at the centre of the chest.
    const zipperPts = [new THREE.Vector3(0, 2.03, 0.193), new THREE.Vector3(0, 2.2, 0.215), new THREE.Vector3(0, 2.4, 0.25)];
    this.add(new THREE.Mesh(makeTaperedTube(new THREE.CatmullRomCurve3(zipperPts), () => 0.0055, 30, 5), this.chrome));
    const sternum = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.034, 0), this.chrome));
    sternum.position.set(0, 2.405, 0.258);
    sternum.scale.set(0.8, 1.5, 0.7);

    // Underbust seam and a constellation of crystals along the neckline.
    const underbustPts = [];
    for (let i = 0; i <= 48; i++) {
      const phi = -1.55 + (i / 48) * 3.1;
      underbustPts.push(new THREE.Vector3(Math.sin(phi) * 0.326, 2.285 + Math.cos(phi) * 0.014, Math.cos(phi) * 0.326 * 0.73));
    }
    this.add(new THREE.Mesh(makeTaperedTube(new THREE.CatmullRomCurve3(underbustPts), () => 0.0045, 60, 4), this.chrome));
    for (let i = 0; i < 7; i++) {
      const u = (i / 6 - 0.5) * 1.15;
      const phi = u;
      const gem = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(i === 3 ? 0.018 : 0.011, 0), i === 3 ? this.glowPink : this.chrome));
      gem.position.set(Math.sin(phi) * 0.34, 2.62 - Math.pow(Math.max(0, Math.cos(phi)), 4) * 0.07 + 0.005, Math.cos(phi) * 0.34 * 0.73);
    }

    // Fine harness straps tracing the collarbones.
    [-1, 1].forEach((s) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.055, 2.59, 0.17),
        new THREE.Vector3(s * 0.14, 2.63, 0.155),
        new THREE.Vector3(s * 0.245, 2.62, 0.06),
        new THREE.Vector3(s * 0.285, 2.56, -0.01),
      ]);
      this.add(new THREE.Mesh(makeTaperedTube(curve, (t) => lerp(0.014, 0.008, t), 24, 6), this.armorMat));
      const stud = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), this.chrome));
      stud.position.set(s * 0.26, 2.615, 0.045);
    });

    // Waist belt
    const belt = this.add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.028, 10, 56), this.chrome));
    belt.position.set(0, 2.11, 0);
    belt.rotation.x = Math.PI / 2;
    belt.scale.z = 0.72;

    const buckle = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), this.glowPink));
    buckle.position.set(0, 2.11, 0.205);
    buckle.scale.set(1, 1.5, 0.55);

    // Hip chains
    [-1, 1].forEach((s) => {
      const chainCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.245, 2.06, 0.08),
        new THREE.Vector3(s * 0.34, 1.88, 0.12),
        new THREE.Vector3(s * 0.39, 1.7, 0.06),
        new THREE.Vector3(s * 0.44, 1.52, -0.02),
      ]);
      this.add(new THREE.Mesh(makeTaperedTube(chainCurve, (t) => 0.005, 24, 5), this.chrome));
    });

    // Shoulder straps
    [-1, 1].forEach((s) => {
      const strapCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.23, 2.49, 0.13),
        new THREE.Vector3(s * 0.27, 2.58, 0.08),
        new THREE.Vector3(s * 0.31, 2.62, 0.0),
      ]);
      this.add(new THREE.Mesh(makeTaperedTube(strapCurve, () => 0.011, 16, 5), this.chrome));
    });

    // Glowing seams echo the skirt's hem line.
    const seamAngles = [0.58, 1.08, 1.72, 2.5, 3.28, 4.02, 4.76, 5.45];
    seamAngles.forEach((a, idx) => {
      const frontness = 0.5 + 0.5 * Math.cos(a);
      const hemY = lerp(0.98, 1.62, frontness);
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const y = lerp(yTop, hemY, Math.pow(t, 0.94));
        const r = lerp(0.255, 0.51, Math.pow(t, 1.45));
        pts.push(new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r * 0.92));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const mat = idx % 3 === 0 ? this.glowPink : this.glowRibbon;
      this.add(new THREE.Mesh(makeTaperedTube(curve, (t) => 0.0055 * (1 - t * 0.25), 36, 4), mat));
    });

    // Hem light follows the high-low edge.
    const hemPoints = [];
    for (let i = 0; i <= 120; i++) {
      const u = i / 120;
      const phi = phiStart + u * phiLength;
      const frontness = 0.5 + 0.5 * Math.cos(phi);
      const y = lerp(0.98, 1.62, frontness);
      hemPoints.push(new THREE.Vector3(Math.sin(phi) * 0.51, y, Math.cos(phi) * 0.51 * 0.92));
    }
    const hemCurve = new THREE.CatmullRomCurve3(hemPoints);
    this.add(new THREE.Mesh(makeTaperedTube(hemCurve, () => 0.006, 180, 4), this.glowCyan));

    // Open-edge piping makes the high slit read at a distance.
    [phiStart, phiStart + phiLength].forEach((phi, i) => {
      const edgePts = [];
      for (let j = 0; j <= 14; j++) {
        const v = j / 14;
        const y = lerp(yTop, lerp(0.98, 1.62, 0.5 + 0.5 * Math.cos(phi)), Math.pow(v, 0.94));
        const r = lerp(0.255, 0.51, Math.pow(v, 1.45));
        edgePts.push(new THREE.Vector3(Math.sin(phi) * r, y, Math.cos(phi) * r * 0.92));
      }
      const edgeCurve = new THREE.CatmullRomCurve3(edgePts);
      const edgeMat = i === 0 ? this.glowPink : this.glowCyan;
      this.add(new THREE.Mesh(makeTaperedTube(edgeCurve, (t) => lerp(0.008, 0.004, t), 36, 4), edgeMat));
    });

    // Train edge light
    const trainEdge = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 2.12, -0.2),
      new THREE.Vector3(-0.62, 1.6, -0.55),
      new THREE.Vector3(-0.94, 0.85, -0.9),
      new THREE.Vector3(-1.06, 0.06, -1.12),
    ]);
    const edge = this.add(new THREE.Mesh(makeTaperedTube(trainEdge, (t) => 0.007 * (1 - t * 0.4), 50, 4), this.glowRibbon));
    edge.material = edge.material.clone();
    edge.material.opacity = 0.28;
    const edgeR = edge.clone();
    edgeR.scale.x = -1;
    edgeR.position.x = 0;
    this.add(edgeR);

    // Floating ribbon accents at the back
    const ribbonCurves = [
      [
        [0.2, 2.5, -0.15],
        [0.45, 2.2, -0.45],
        [0.5, 1.6, -0.6],
        [0.4, 0.95, -0.55],
        [0.62, 0.45, -0.7],
      ],
      [
        [-0.2, 2.5, -0.15],
        [-0.48, 2.15, -0.48],
        [-0.53, 1.5, -0.6],
        [-0.4, 0.8, -0.6],
        [-0.62, 0.3, -0.78],
      ],
    ];
    ribbonCurves.forEach((pts, i) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const ribbon = this.add(
        new THREE.Mesh(
          makeTaperedTube(curve, (t) => lerp(0.04, 0.008, t), 50, 5),
          i === 0 ? this.glowPink : this.glowCyan
        )
      );
      ribbon.material = ribbon.material.clone();
      ribbon.material.opacity = 0.28;
      ribbon.userData.phase = i * Math.PI;
      this.satellites.push({ mesh: ribbon, kind: "ribbon" });
    });
  }

  buildHalo() {
    const haloGroup = new THREE.Group();
    this.group.add(haloGroup);
    this.haloGroup = haloGroup;

    const ringMat = this.makeMaterial({
      color: "#dcf9ff",
      metalness: 0.95,
      roughness: 0.05,
      emissive: this.palette.accent2,
      emissiveIntensity: 1.1,
      envMapIntensity: 2.4,
      transparent: true,
      opacity: 0.9,
    });
    this.haloMat = ringMat;

    this.crownRing = this.add(new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.01, 8, 100), ringMat), haloGroup);
    this.crownRing.position.set(0, 3.48, 0);
    this.crownRing.rotation.x = Math.PI / 2 + 0.1;

    this.crownRing2 = this.add(new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.007, 6, 80), this.glowPink), haloGroup);
    this.crownRing2.position.set(0, 3.53, 0);
    this.crownRing2.rotation.x = Math.PI / 2 - 0.12;

    this.headHalo = this.add(new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.008, 6, 120), this.glowCyan), haloGroup);
    this.headHalo.position.set(0, 3.08, -0.18);
    this.headHalo.material = this.glowCyan.clone();
    this.headHalo.material.opacity = 0.5;

    // Body-scale orbit rings
    const ringSpecs = [
      { r: 1.9, tube: 0.01, y: 1.72, rx: 0.18, rz: 1.2, color: "#ff3fba", opacity: 0.48 },
      { r: 2.35, tube: 0.007, y: 2.24, rx: 1.15, rz: 0.32, color: "#6ff7ff", opacity: 0.34 },
      { r: 2.9, tube: 0.005, y: 1.3, rx: 1.36, rz: -0.28, color: "#d9ff5e", opacity: 0.22 },
    ];
    ringSpecs.forEach((spec, i) => {
      const mat = new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: spec.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(spec.r, spec.tube, 6, 180), mat);
      ring.position.y = spec.y;
      ring.rotation.set(spec.rx, 0, spec.rz);
      ring.userData = { baseRx: spec.rx, baseRz: spec.rz, speed: 0.06 + i * 0.024, phase: i * 1.4, baseOpacity: spec.opacity };
      this.add(ring);
      this.rings.push(ring);

      // Satellites on rings
      const count = i === 0 ? 3 : 2;
      for (let j = 0; j < count; j++) {
        const sat = new THREE.Group();
        const core = new THREE.Mesh(
          i % 2 === 0 ? new THREE.OctahedronGeometry(0.035, 0) : new THREE.TetrahedronGeometry(0.04, 0),
          i % 2 === 0 ? this.chrome : this.glowWhite
        );
        sat.add(core);
        const angle = (j / count) * TAU + i;
        sat.userData = { ring, angle, radius: spec.r, speed: 0.18 + i * 0.07, offset: Math.random() * TAU };
        this.group.add(sat);
        this.satellites.push({ mesh: sat, kind: "sat" });
      }
    });

    // small halo gems around crown
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), i % 3 === 0 ? this.glowPink : this.chrome);
      gem.position.set(Math.sin(a) * 0.36, 3.48, Math.cos(a) * 0.36);
      gem.userData = { angle: a, radius: 0.36, y: 3.48, speed: 0.12 + (i % 3) * 0.03 };
      haloGroup.add(gem);
      this.satellites.push({ mesh: gem, kind: "crown" });
    }
  }

  buildOrbitals() {
    // Distant chrome fragments visualising her domain
    const orbits = new THREE.Group();
    this.group.add(orbits);
    this.orbitals = orbits;
    const geos = [
      new THREE.OctahedronGeometry(0.08, 0),
      new THREE.TetrahedronGeometry(0.07, 0),
      new THREE.TorusGeometry(0.075, 0.02, 8, 20),
      new THREE.IcosahedronGeometry(0.055, 0),
    ];
    for (let i = 0; i < 22; i++) {
      const geo = geos[i % geos.length];
      const mesh = new THREE.Mesh(geo, i % 4 === 0 ? this.glowPink : this.chrome);
      const a = (i / 22) * TAU + Math.random() * 0.5;
      const r = 1.5 + Math.random() * 1.55;
      mesh.position.set(Math.sin(a) * r, 0.75 + Math.random() * 2.7, Math.cos(a) * r * 0.7 - 0.3);
      mesh.rotation.set(Math.random() * TAU, Math.random() * TAU, 0);
      mesh.userData = { a, r, y: mesh.position.y, speed: 0.025 + Math.random() * 0.07, spin: 0.2 + Math.random() * 0.8 };
      this.satellites.push({ mesh, kind: "orbit" });
      orbits.add(mesh);
    }
  }

  buildAura() {
    const geo = new THREE.SphereGeometry(1.33, 40, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColorA: { value: new THREE.Color("#ff3fba") },
        uColorB: { value: new THREE.Color("#6ff7ff") },
        uTime: { value: 0 },
        uStrength: { value: 1 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorld;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uTime;
        uniform float uStrength;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorld;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorld);
          float fres = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 2.6);
          float band = 0.5 + 0.5 * sin(vPosition.y * 13.0 - uTime * 1.4 + vPosition.x * 6.0);
          float scan = smoothstep(0.75, 1.0, band);
          vec3 color = mix(uColorA, uColorB, 0.5 + 0.5 * sin(vPosition.y * 4.0 + uTime * 0.4));
          float alpha = (fres * 0.13 + scan * 0.012) * uStrength;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.aura = new THREE.Mesh(geo, mat);
    this.aura.position.y = 1.86;
    this.aura.scale.set(1, 1.38, 1);
    this.aura.renderOrder = 6;
    this.auraMat = mat;
  }

  buildOrb() {
    this.orb.position.copy(this.orbAnchor.position);
    this.group.add(this.orb);

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.072, 32, 24), this.glowPink);
    core.name = "orb-core";
    this.orb.add(core);
    this.orbCore = core;

    const shellMat = new THREE.MeshPhysicalMaterial({
      color: "#ff7bdd",
      roughness: 0.04,
      metalness: 0.1,
      transparent: true,
      opacity: 0.22,
      transmission: 0.55,
      thickness: 0.4,
      iridescence: 1,
      iridescenceIOR: 2,
      envMapIntensity: 2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.13, 40, 30), shellMat);
    this.orb.add(shell);

    const spriteMat = new THREE.SpriteMaterial({
      map: radialTexture("rgba(255,180,240,1)", "rgba(255,40,180,0)"),
      color: "#ff9ce6",
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const glowSprite = new THREE.Sprite(spriteMat);
    glowSprite.scale.setScalar(0.85);
    this.orb.add(glowSprite);
    this.orbGlow = glowSprite;

    this.orbRings = [];
    [0, 1, 2].forEach((i) => {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(0.15 + i * 0.03, 0.003, 4, 60),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? "#6ff7ff" : "#ffd6ff",
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      r.rotation.set(Math.PI / 2 + i * 0.6, i * 0.7, i * 0.4);
      this.orb.add(r);
      this.orbRings.push(r);
    });

    // tiny star shards
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.014, 0), i % 2 ? this.glowCyan : this.chrome);
      shard.position.set(Math.cos(a) * 0.3, Math.sin(a * 1.3) * 0.15, Math.sin(a) * 0.3);
      shard.userData = { angle: a, radius: 0.3, speed: 0.7 + Math.random() * 0.4 };
      this.orb.add(shard);
      this.orbRings.push(shard);
    }
  }

  setPointer(x, y) {
    this.pointer.set(x, y);
  }

  setPalette(palette) {
    if (palette.skin) this.targetPalette.skin = new THREE.Color(palette.skin);
    if (palette.hair) this.targetPalette.hair = new THREE.Color(palette.hair);
    if (palette.fabric) this.targetPalette.fabric = new THREE.Color(palette.fabric);
    if (palette.accent) this.targetPalette.accent = new THREE.Color(palette.accent);
    if (palette.accent2) this.targetPalette.accent2 = new THREE.Color(palette.accent2);
    if (palette.chrome) this.targetPalette.chrome = new THREE.Color(palette.chrome);
  }

  cast(power) {
    this.action = { power, startedAt: this.time };
    this.auraStrength = 1.8;
    if (power === "destroy") {
      this.auraStrength = 2.6;
    }
  }

  update(dt, elapsed) {
    this.time = elapsed;
    const t = elapsed;

    // Palette easing
    this.skin.color.lerp(this.targetPalette.skin, dt * 1.8);
    this.hairMat.color.lerp(this.targetPalette.hair, dt * 1.8);
    this.fabricMat.color.lerp(this.targetPalette.fabric, dt * 1.8);
    this.fabricInnerMat.color.lerp(this.targetPalette.fabric.clone().offsetHSL(0.1, 0, 0.15), dt * 1.8);
    this.chrome.color.lerp(this.targetPalette.chrome, dt * 1.8);
    this.haloMat.emissive.lerp(this.targetPalette.accent2, dt * 1.8);

    // Idle breathing and contrapposto
    const breath = Math.sin(t * 1.25);
    this.group.position.y = breath * 0.012;
    this.group.rotation.y = Math.sin(t * 0.35) * 0.045 + this.pointer.x * 0.075;
    this.group.rotation.z = Math.sin(t * 0.42) * 0.008;
    this.torso.scale.set(1 + breath * 0.004, 1 + breath * 0.006, 1 + breath * 0.004);
    this.neck.rotation.z = Math.sin(t * 0.55) * 0.012;

    // Head follows the pointer with grace
    this.headGroup.rotation.y = this.pointer.x * 0.22 + Math.sin(t * 0.47) * 0.035;
    this.headGroup.rotation.x = this.pointer.y * -0.09 + Math.sin(t * 0.61) * 0.018;
    this.headGroup.rotation.z = Math.sin(t * 0.38) * 0.02;

    // Arm life
    const actionAge = this.action ? t - this.action.startedAt : 99;
    let gesture = 0;
    if (this.action && actionAge < 1.6) {
      const p = actionAge / 1.6;
      gesture = Math.sin(p * Math.PI) * 0.1;
    }
    this.armR.rotation.z = Math.sin(t * 0.7) * 0.018 + gesture;
    this.armR.rotation.x = Math.sin(t * 0.55 + 1) * 0.016;
    this.armL.rotation.z = Math.sin(t * 0.62 + 2) * 0.015 - gesture * 0.4;
    this.armL.rotation.x = Math.sin(t * 0.48) * 0.015;

    // Halo motion
    this.crownRing.rotation.z = t * 0.11;
    this.crownRing2.rotation.z = -t * 0.18;
    this.headHalo.rotation.z = t * 0.08;
    this.headHalo.material.opacity = 0.38 + Math.sin(t * 0.9) * 0.12;
    this.haloMat.emissiveIntensity = 0.8 + Math.sin(t * 1.1) * 0.25;

    this.rings.forEach((ring) => {
      const d = ring.userData;
      ring.rotation.z = d.baseRz + Math.sin(t * d.speed + d.phase) * 0.12;
      ring.rotation.x = d.baseRx + Math.cos(t * d.speed * 0.8 + d.phase) * 0.035;
      ring.material.opacity = d.baseOpacity + Math.sin(t * 0.5 + d.phase) * 0.08;
    });

    this.satellites.forEach(({ mesh, kind }) => {
      const u = mesh.userData;
      if (kind === "sat") {
        const ang = u.angle + t * u.speed;
        mesh.position.set(Math.cos(ang) * u.radius, u.ring.position.y + Math.sin(ang * 2) * 0.04, Math.sin(ang) * u.radius);
        mesh.rotation.x = t * 0.7;
        mesh.rotation.y = t * 0.9;
      } else if (kind === "crown") {
        const ang = u.angle + t * u.speed;
        mesh.position.set(Math.sin(ang) * u.radius, u.y + Math.sin(ang * 3 + t) * 0.018, Math.cos(ang) * u.radius);
        mesh.rotation.y = t * 0.4;
      } else if (kind === "orbit") {
        const ang = u.a + t * u.speed;
        mesh.position.set(Math.sin(ang) * u.r, u.y + Math.sin(t * 0.5 + u.a) * 0.09, Math.cos(ang) * u.r * 0.7 - 0.3);
        mesh.rotation.x += dt * u.spin;
        mesh.rotation.y += dt * u.spin * 0.7;
      }
    });

    // Dress ripple (vertices only, subtle)
    const pos = this.skirt.geometry.attributes.position;
    const arr = pos.array;
    const base = this.skirtBase;
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i];
      const z = base[i + 2];
      const y = base[i + 1];
      const angle = Math.atan2(x, z);
      const depth = clamp(1 - y / 2.1, 0, 1);
      const wave = Math.sin(angle * 4 + t * 1.6 + y * 2.2) * 0.035 * depth;
      arr[i] = x + Math.sin(angle) * wave;
      arr[i + 2] = z + Math.cos(angle) * wave;
    }
    pos.needsUpdate = true;
    this.skirt.geometry.computeVertexNormals();

    // Hair sway
    this.hairGroup.rotation.z = Math.sin(t * 0.55) * 0.012;
    this.hairGroup.rotation.x = Math.sin(t * 0.43) * 0.008;
    this.hairMeshes.forEach(({ mesh, phase }) => {
      mesh.rotation.z = Math.sin(t * 0.55 + phase) * 0.006;
    });

    // Orb
    const pulse = 1 + Math.sin(t * 2.2) * 0.06;
    this.orb.position.y = this.orbAnchor.position.y + Math.sin(t * 1.4) * 0.025;
    this.orbCore.scale.setScalar(pulse);
    this.orbGlow.scale.setScalar(0.8 + Math.sin(t * 2.1) * 0.06 + (actionAge < 1 ? 0.3 : 0));
    this.orbRings.forEach((obj, i) => {
      const u = obj.userData;
      if (u.radius) {
        const ang = u.angle + t * u.speed;
        obj.position.set(Math.cos(ang) * u.radius, Math.sin(ang * 1.7) * 0.1, Math.sin(ang) * u.radius);
        obj.rotation.x += dt * 0.9;
      } else {
        obj.rotation.z += dt * (0.2 + i * 0.05);
        obj.rotation.x += dt * 0.13;
      }
    });

    // Eyes glow with power
    const eyeGlow = 1.4 + Math.sin(t * 1.7) * 0.2 + (this.action ? Math.max(0, 1.4 - actionAge) * 1.8 : 0);
    this.eyes.forEach((eye) => {
      eye.material.opacity = 0.75;
      eye.scale.setScalar(1 + Math.sin(t * 2 + 1) * 0.05);
    });
    this.auraMat.uniforms.uStrength.value += (this.auraStrength - this.auraMat.uniforms.uStrength.value) * dt * 2.2;
    this.auraMat.uniforms.uTime.value = t;
    this.auraMat.uniforms.uColorA.value.lerp(this.targetPalette.accent, dt * 2);
    this.auraMat.uniforms.uColorB.value.lerp(this.targetPalette.accent2, dt * 2);
    this.auraStrength += (1 - this.auraStrength) * dt * 1.5;

    // Hand anchor follows the hand gesture visually
    this.handAnchor.position.y = 2.21 + Math.sin(t * 1.7 + 1) * 0.02;
    this.orb.position.x = this.orbAnchor.position.x + Math.sin(t * 0.8) * 0.02;
    this.orb.position.z = this.orbAnchor.position.z + Math.cos(t * 0.7) * 0.02;
  }

  getHandWorldPosition() {
    return this.orb.getWorldPosition(new THREE.Vector3());
  }
}
