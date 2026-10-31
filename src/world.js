import * as THREE from 'three';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

const COLOR_KEYS = [
  'skyTop', 'skyMid', 'skyBot', 'accent',
  'floorBase', 'floorLine', 'floorGlow',
  'dress', 'dressEmissive', 'hair', 'hairEmissive',
  'orbA', 'orbB', 'eye', 'crown', 'gem'
];

function capsuleBetween(a, b, radius, material) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 8, 16);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.clone().normalize());
  return mesh;
}

function ringAroundLimb(position, direction, radius, tube, material) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 32), material);
  ring.position.copy(position);
  ring.quaternion.setFromUnitVectors(Z_AXIS, direction.clone().normalize());
  return ring;
}

function makeHeartGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.34);
  shape.bezierCurveTo(0, 0.58, -0.46, 0.68, -0.46, 0.3);
  shape.bezierCurveTo(-0.46, 0.02, -0.16, -0.18, 0, -0.4);
  shape.bezierCurveTo(0.16, -0.18, 0.46, 0.02, 0.46, 0.3);
  shape.bezierCurveTo(0.46, 0.68, 0, 0.58, 0, 0.34);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: 20
  });
  geometry.center();
  return geometry;
}

function makeStarGeometry() {
  const shape = new THREE.Shape();
  const points = 8;
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? 0.52 : 0.18;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 2
  });
  geometry.center();
  return geometry;
}

function makeWingGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.18, 0.26, 0.46, 0.3, 0.52, 0.08);
  shape.bezierCurveTo(0.55, -0.14, 0.3, -0.32, 0.06, -0.18);
  shape.bezierCurveTo(-0.02, -0.08, -0.02, -0.02, 0, 0);
  return new THREE.ShapeGeometry(shape, 20);
}

function makeTitleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const gradient = context.createLinearGradient(80, 150, 1968, 390);
  gradient.addColorStop(0, '#ff0a8c');
  gradient.addColorStop(0.28, '#ff5fd2');
  gradient.addColorStop(0.55, '#00e5ff');
  gradient.addColorStop(0.78, '#9dff2e');
  gradient.addColorStop(1, '#ffc32e');

  context.font = '900 258px Unbounded, sans-serif';
  context.letterSpacing = '12px';
  context.lineJoin = 'round';
  context.shadowColor = 'rgba(20, 0, 28, 0.95)';
  context.shadowBlur = 30;
  context.lineWidth = 18;
  context.strokeStyle = 'rgba(24, 0, 32, 0.94)';
  context.strokeText('ANYTHING', 1024, 256);
  context.shadowColor = 'rgba(255, 95, 210, 0.9)';
  context.shadowBlur = 54;
  context.lineWidth = 5;
  context.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  context.strokeText('ANYTHING', 1024, 256);
  context.shadowBlur = 20;
  context.fillStyle = gradient;
  context.fillText('ANYTHING', 1024, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function makeContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 124);
  gradient.addColorStop(0, 'rgba(0,0,0,0.78)');
  gradient.addColorStop(0.4, 'rgba(0,0,0,0.46)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeHeartSpriteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.translate(64, 68);
  context.scale(1.2, 1.2);
  context.beginPath();
  context.moveTo(0, 30);
  context.bezierCurveTo(-48, -10, -42, -52, -14, -52);
  context.bezierCurveTo(-4, -52, 0, -44, 0, -36);
  context.bezierCurveTo(0, -44, 4, -52, 14, -52);
  context.bezierCurveTo(42, -52, 48, -10, 0, 30);
  const gradient = context.createLinearGradient(-40, -50, 40, 30);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.45, '#ff9ae6');
  gradient.addColorStop(1, '#ff2fa8');
  context.fillStyle = gradient;
  context.shadowColor = 'rgba(255, 95, 210, 0.9)';
  context.shadowBlur = 18;
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createEnvironmentMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x160020);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(70, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y * 0.5 + 0.5;
          vec3 top = vec3(0.16, 0.01, 0.24);
          vec3 mid = vec3(1.8, 0.22, 1.25);
          vec3 low = vec3(0.05, 0.45, 0.75);
          vec3 col = mix(low, mid, smoothstep(0.22, 0.52, h));
          col = mix(col, top, smoothstep(0.52, 0.94, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    })
  );
  envScene.add(dome);

  const panel = (color, position, scale, rotation) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rotation);
    envScene.add(mesh);
  };

  panel([3.4, 0.7, 2.6], [-16, 4, 2], [16, 22, 1], [0, Math.PI / 2, 0]);
  panel([0.5, 2.7, 3.4], [16, 3, 0], [16, 20, 1], [0, -Math.PI / 2, 0]);
  panel([2.8, 2.8, 3.2], [0, 18, -4], [24, 24, 1], [Math.PI / 2, 0, 0]);
  panel([2.2, 0.4, 1.5], [0, 3, -20], [18, 14, 1], [0, 0, 0]);
  panel([0.5, 1.4, 2.2], [0, -8, 8], [20, 20, 1], [-Math.PI / 2, 0, 0]);

  const glow = new THREE.Mesh(new THREE.SphereGeometry(3, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.6, 4) }));
  glow.position.set(0, 12, 4);
  envScene.add(glow);

  const target = pmrem.fromScene(envScene, 0.035, 0.1, 120);
  pmrem.dispose();
  dome.geometry.dispose();
  dome.material.dispose();
  envScene.traverse((object) => {
    if (object.isMesh && object !== dome) {
      object.geometry.dispose();
      object.material.dispose();
    }
  });
  return target.texture;
}

function makeSky() {
  const uniforms = {
    uTop: { value: new THREE.Color(0x120024) },
    uMid: { value: new THREE.Color(0xff4fc8) },
    uBot: { value: new THREE.Color(0x2a0738) },
    uAccent: { value: new THREE.Color(0xff7ae0) },
    uTime: { value: 0 }
  };
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vDir;
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uBot;
      uniform vec3 uAccent;
      uniform float uTime;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(uBot, uMid, smoothstep(0.24, 0.55, h));
        col = mix(col, uTop, smoothstep(0.56, 1.0, h));

        vec3 sunDir = normalize(vec3(0.0, 0.12, -1.0));
        float sun = pow(max(dot(d, sunDir), 0.0), 6.0);
        col += uAccent * sun * 0.16;
        float core = pow(max(dot(d, sunDir), 0.0), 90.0);
        col += mix(uAccent, vec3(1.0, 0.82, 1.0), 0.18) * core * 0.38;

        float band = sin(d.x * 8.0 + uTime * 0.2 + sin(d.y * 5.0 - uTime * 0.14) * 2.2) * 0.5 + 0.5;
        col += uAccent * band * 0.035 * smoothstep(0.2, 0.72, h) * (1.0 - smoothstep(0.78, 1.0, h));

        float horizon = exp(-abs(d.y) * 22.0);
        col += uAccent * horizon * 0.08;

        vec2 uv = vec2(atan(d.z, d.x) * 0.1591549 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.3183099 + 0.5);
        vec2 starCell = floor(uv * vec2(900.0, 450.0));
        float rnd = hash(starCell);
        float star = smoothstep(0.9965, 1.0, rnd) * (0.4 + 0.6 * pow(max(0.0, sin(uTime * 1.7 + rnd * 35.0)), 4.0));
        col += mix(vec3(1.0), uAccent, 0.4) * star * 1.5;

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(58, 48, 32), material);
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}

function makeFloor() {
  const uniforms = {
    uBase: { value: new THREE.Color(0x180225) },
    uLine: { value: new THREE.Color(0xff5fd2) },
    uGlow: { value: new THREE.Color(0xff8ae8) },
    uTime: { value: 0 }
  };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vWorld;
      uniform vec3 uBase;
      uniform vec3 uLine;
      uniform vec3 uGlow;
      uniform float uTime;

      void main() {
        vec2 p = vWorld.xz;
        float r = length(p);

        vec2 q = p * 0.72;
        vec2 g = abs(fract(q - 0.5) - 0.5);
        float line = (1.0 - smoothstep(0.0, 0.032, min(g.x, g.y)));

        vec2 q2 = p * 0.18;
        vec2 g2 = abs(fract(q2 - 0.5) - 0.5);
        float line2 = (1.0 - smoothstep(0.0, 0.012, min(g2.x, g2.y)));

        float checker = mod(floor(p.x * 0.72) + floor(p.y * 0.72), 2.0);
        vec3 col = uBase;
        col += uLine * (line * 0.8 + line2 * 0.4);
        col += uLine * checker * 0.032;

        float rings = sin(r * 3.2 - uTime * 1.25) * 0.5 + 0.5;
        col += uGlow * pow(rings, 20.0) * 0.36 * (1.0 - smoothstep(1.0, 9.0, r));
        col += uGlow * exp(-r * 0.6) * 0.3;

        float rim = (1.0 - smoothstep(0.0, 0.07, abs(r - 5.7)));
        col += uGlow * rim * 1.25;
        float inner = (1.0 - smoothstep(0.0, 0.045, abs(r - 2.1)));
        col += uGlow * inner * 0.5;

        float alpha = (1.0 - smoothstep(2.0, 10.5, r));
        gl_FragColor = vec4(col, alpha * 0.94);
      }
    `
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  mesh.renderOrder = 1;
  return { mesh, uniforms };
}

function makeSunHalo() {
  const uniforms = {
    uColor: { value: new THREE.Color(0xff7ae0) },
    uTime: { value: 0 }
  };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uTime;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float angle = atan(p.y, p.x);

        float ring = (1.0 - smoothstep(0.0, 0.022, abs(r - 0.58))) * 0.6;
        float glow = exp(-pow((r - 0.58) * 5.5, 2.0)) * 0.045;
        float rays = pow(max(0.0, sin(angle * 22.0 + uTime * 0.18)), 30.0) * 0.16 * (1.0 - smoothstep(0.2, 0.92, r));
        float inner = exp(-r * 4.2) * 0.008;

        vec3 col = uColor * (ring + glow + rays + inner);
        float alpha = clamp(ring + glow + rays + inner, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha * 0.48);
      }
    `
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), material);
  mesh.position.set(0, 5.4, -18);
  mesh.renderOrder = -2;
  return { mesh, uniforms };
}

function buildGoddess(pearlMat, chromeMat, gownMat, hairMat, glowMat, darkMat, eyeIrisMat, crownMat, gemMat) {
  const group = new THREE.Group();
  group.name = 'goddess';

  // Gown -------------------------------------------------------------
  const gownProfile = [
    [0.0, 0.0], [1.34, 0.0], [1.44, 0.08], [1.32, 0.34],
    [1.08, 0.8], [0.9, 1.28], [0.76, 1.78], [0.64, 2.24],
    [0.56, 2.62], [0.58, 2.88], [0.5, 3.02]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const gownGeometry = new THREE.LatheGeometry(gownProfile, 128, 0, Math.PI * 2);
  const gownPositions = gownGeometry.attributes.position;
  for (let i = 0; i < gownPositions.count; i += 1) {
    let x = gownPositions.getX(i);
    let y = gownPositions.getY(i);
    let z = gownPositions.getZ(i);
    const angle = Math.atan2(z, x);
    const pleat = 1 + 0.026 * Math.cos(angle * 18) + 0.014 * Math.sin(angle * 7 + y * 1.2);
    const hemFlare = 1 + 0.05 * Math.sin(angle * 6) * Math.max(0, 1 - y / 0.65);
    x *= pleat * hemFlare;
    z *= pleat * hemFlare;
    gownPositions.setXYZ(i, x, y, z);
  }
  gownGeometry.computeVertexNormals();
  const gown = new THREE.Mesh(gownGeometry, gownMat);
  gown.castShadow = false;
  group.add(gown);

  gownMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float swayHeight = smoothstep(0.0, 2.35, position.y);
        float swayAngle = atan(position.z, position.x);
        float sway = sin(uTime * 1.15 + position.y * 1.7 + swayAngle * 2.0) * 0.034 * (1.0 - swayHeight);
        transformed.x += sway;
        transformed.z += sway * 0.55;`
      );
    gownMat.userData.shader = shader;
  };

  // Torso ------------------------------------------------------------
  const torsoProfile = [
    [0.0, 2.94], [0.48, 2.96], [0.55, 3.12], [0.59, 3.32],
    [0.55, 3.5], [0.46, 3.64], [0.31, 3.74], [0.15, 3.79]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const torsoGeometry = new THREE.LatheGeometry(torsoProfile, 64);
  torsoGeometry.scale(1, 1, 0.78);
  const torso = new THREE.Mesh(torsoGeometry, pearlMat);
  group.add(torso);

  const bustGeometry = new THREE.SphereGeometry(1, 24, 18);
  for (const side of [-1, 1]) {
    const bust = new THREE.Mesh(bustGeometry, pearlMat);
    bust.position.set(side * 0.18, 3.44, 0.19);
    bust.scale.set(0.2, 0.19, 0.16);
    group.add(bust);
  }

  const bodiceProfile = [
    [0.0, 2.97], [0.51, 2.99], [0.57, 3.12], [0.6, 3.3],
    [0.56, 3.44], [0.46, 3.55], [0.31, 3.6]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bodiceGeometry = new THREE.LatheGeometry(bodiceProfile, 72);
  bodiceGeometry.scale(1, 1, 0.8);
  const bodice = new THREE.Mesh(bodiceGeometry, gownMat);
  group.add(bodice);

  const bodiceTrim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 8, 56), chromeMat);
  bodiceTrim.position.set(0, 3.59, 0);
  bodiceTrim.rotation.x = Math.PI / 2;
  bodiceTrim.scale.set(1, 0.8, 1);
  group.add(bodiceTrim);

  // Neck + head ------------------------------------------------------
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.12, 0.26, 20), pearlMat);
  neck.position.set(0, 3.87, 0);
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 36), pearlMat);
  head.position.set(0, 4.31, 0.01);
  head.scale.set(0.9, 1.04, 0.95);
  group.add(head);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), pearlMat);
  nose.position.set(0, 4.26, 0.405);
  nose.scale.set(0.026, 0.045, 0.028);
  group.add(nose);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.011, 8, 20, Math.PI), darkMat);
  lip.position.set(0, 4.15, 0.4);
  lip.rotation.z = Math.PI;
  lip.scale.set(1, 0.65, 1);
  group.add(lip);

  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffeafb, toneMapped: false });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0a0012 });
  const eyeWhiteGeo = new THREE.SphereGeometry(1, 18, 14);
  const irisGeo = new THREE.SphereGeometry(1, 16, 12);
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.145, 4.375, 0.352);
    eye.rotation.y = side * 0.22;

    const white = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    white.scale.set(0.088, 0.056, 0.042);
    eye.add(white);

    const iris = new THREE.Mesh(irisGeo, eyeIrisMat);
    iris.position.z = 0.03;
    iris.scale.set(0.052, 0.052, 0.03);
    eye.add(iris);

    const pupil = new THREE.Mesh(irisGeo, pupilMat);
    pupil.position.z = 0.052;
    pupil.scale.set(0.025, 0.03, 0.016);
    eye.add(pupil);

    const spark = new THREE.Mesh(irisGeo, highlightMat);
    spark.position.set(-side * 0.018, 0.018, 0.064);
    spark.scale.setScalar(0.012);
    eye.add(spark);

    group.add(eye);

    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.06, 4.48, 0.385),
      new THREE.Vector3(side * 0.15, 4.505, 0.39),
      new THREE.Vector3(side * 0.235, 4.48, 0.365)
    ]);
    const brow = new THREE.Mesh(new THREE.TubeGeometry(browCurve, 16, 0.011, 5, false), darkMat);
    group.add(brow);

    const lashCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.06, 4.405, 0.389),
      new THREE.Vector3(side * 0.145, 4.43, 0.394),
      new THREE.Vector3(side * 0.238, 4.415, 0.37)
    ]);
    const lash = new THREE.Mesh(new THREE.TubeGeometry(lashCurve, 12, 0.0075, 4, false), darkMat);
    group.add(lash);

    const cheekGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), gemMat);
    cheekGem.position.set(side * 0.27, 4.29, 0.31);
    group.add(cheekGem);
  }

  // Hair -------------------------------------------------------------
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.455, 40, 28), hairMat);
  hairCap.position.set(0, 4.35, -0.1);
  hairCap.scale.set(1.03, 1.06, 1.0);
  group.add(hairCap);

  for (const side of [-1, 1]) {
    const sideMass = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), hairMat);
    sideMass.position.set(side * 0.33, 4.08, -0.02);
    sideMass.scale.set(0.17, 0.4, 0.23);
    group.add(sideMass);
  }

  const strandCount = 15;
  for (let i = 0; i < strandCount; i += 1) {
    const t = i / (strandCount - 1);
    const angle = 0.62 + t * (Math.PI * 2 - 1.24);
    const wave = Math.sin(t * 13.0) * 0.08;
    const radius = 0.31 + 0.12 * Math.sin(t * 7.0);
    const start = new THREE.Vector3(
      Math.sin(angle) * radius,
      4.62 + Math.sin(t * 9.0) * 0.05,
      Math.cos(angle) * radius - 0.06
    );
    const mid = new THREE.Vector3(
      Math.sin(angle) * (0.52 + wave),
      3.92 - t * 0.2,
      Math.cos(angle) * (0.48 + wave) - 0.1
    );
    const lower = new THREE.Vector3(
      Math.sin(angle) * (0.64 + wave * 1.4),
      3.16 - t * 0.25,
      Math.cos(angle) * (0.58 + wave * 1.4) - 0.12
    );
    const end = new THREE.Vector3(
      Math.sin(angle) * (0.7 + wave * 1.8),
      2.34 + Math.sin(t * 11.0) * 0.24,
      Math.cos(angle) * (0.62 + wave * 1.8) - 0.14
    );
    const curve = new THREE.CatmullRomCurve3([start, mid, lower, end]);
    const radiusHair = 0.044 + Math.sin(t * 5.0) * 0.012;
    const strand = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, radiusHair, 6, false), hairMat);
    group.add(strand);
  }

  const bangCurves = [
    [[-0.33, 4.6, 0.19], [-0.18, 4.55, 0.34], [-0.04, 4.6, 0.37]],
    [[0.33, 4.6, 0.19], [0.18, 4.55, 0.34], [0.04, 4.6, 0.37]]
  ];
  for (const points of bangCurves) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.052, 6, false), hairMat));
  }

  for (let i = 0; i < 7; i += 1) {
    const angle = i * 2.4 + 0.4;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 0), glowMat);
    gem.position.set(Math.sin(angle) * 0.54, 3.1 + (i % 4) * 0.42, Math.cos(angle) * 0.5 - 0.1);
    group.add(gem);
  }

  // Crown ------------------------------------------------------------
  const crown = new THREE.Group();
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), crownMat);
    spike.position.set(Math.cos(angle) * 0.3, 4.9 + (i % 2) * 0.07, Math.sin(angle) * 0.3);
    spike.scale.set(0.052, 0.14 + (i % 2) * 0.07, 0.052);
    spike.rotation.y = angle;
    crown.add(spike);
  }
  const crownJewel = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), crownMat);
  crownJewel.position.set(0, 5.08, 0.06);
  crownJewel.scale.set(0.085, 0.19, 0.085);
  crown.add(crownJewel);
  group.add(crown);

  // Halo -------------------------------------------------------------
  const halo = new THREE.Group();
  halo.position.set(0, 5.42, 0);

  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.026, 10, 96), glowMat);
  haloRing.rotation.x = Math.PI / 2;
  halo.add(haloRing);

  const haloChrome = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.012, 8, 96), chromeMat);
  haloChrome.rotation.set(Math.PI / 2 + 0.26, 0.08, 0.12);
  halo.add(haloChrome);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const bead = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 0), gemMat);
    bead.position.set(Math.cos(angle) * 0.68, Math.sin(angle * 2) * 0.03, Math.sin(angle) * 0.68);
    halo.add(bead);
  }
  group.add(halo);

  // Arms -------------------------------------------------------------
  const rightShoulder = new THREE.Vector3(0.45, 3.62, 0.0);
  const rightElbow = new THREE.Vector3(0.8, 3.88, 0.12);
  const rightWrist = new THREE.Vector3(1.02, 4.42, 0.27);
  const leftShoulder = new THREE.Vector3(-0.45, 3.62, 0.0);
  const leftElbow = new THREE.Vector3(-0.82, 3.34, 0.13);
  const leftWrist = new THREE.Vector3(-1.07, 2.98, 0.3);

  for (const side of [-1, 1]) {
    const shoulderPuff = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), gownMat);
    shoulderPuff.position.set(side * 0.46, 3.65, 0);
    shoulderPuff.scale.set(0.18, 0.14, 0.19);
    group.add(shoulderPuff);
  }

  const rightUpper = capsuleBetween(rightShoulder, rightElbow, 0.085, pearlMat);
  const rightFore = capsuleBetween(rightElbow, rightWrist, 0.074, pearlMat);
  const leftUpper = capsuleBetween(leftShoulder, leftElbow, 0.085, pearlMat);
  const leftFore = capsuleBetween(leftElbow, leftWrist, 0.074, pearlMat);
  group.add(rightUpper, rightFore, leftUpper, leftFore);

  const jointGeo = new THREE.SphereGeometry(1, 18, 14);
  for (const [point, scale] of [[rightElbow, 0.085], [leftElbow, 0.085], [rightShoulder, 0.12], [leftShoulder, 0.12]]) {
    const joint = new THREE.Mesh(jointGeo, pearlMat);
    joint.position.copy(point);
    joint.scale.setScalar(scale);
    group.add(joint);
  }

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), pearlMat);
  rightHand.position.copy(rightWrist).add(new THREE.Vector3(0.01, 0.08, 0.03));
  rightHand.scale.set(0.09, 0.12, 0.06);
  rightHand.rotation.z = -0.25;
  group.add(rightHand);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), pearlMat);
  leftHand.position.copy(leftWrist).add(new THREE.Vector3(-0.01, -0.06, 0.03));
  leftHand.scale.set(0.095, 0.125, 0.055);
  leftHand.rotation.z = 0.25;
  group.add(leftHand);

  const rightGlove = capsuleBetween(rightElbow, rightWrist, 0.082, gownMat);
  const leftGlove = capsuleBetween(leftElbow, leftWrist, 0.082, gownMat);
  group.add(rightGlove, leftGlove);

  group.add(ringAroundLimb(rightWrist, rightWrist.clone().sub(rightElbow), 0.088, 0.018, chromeMat));
  group.add(ringAroundLimb(leftWrist, leftWrist.clone().sub(leftElbow), 0.088, 0.018, chromeMat));

  for (const [wrist, dir] of [[rightWrist, rightWrist.clone().sub(rightElbow)], [leftWrist, leftWrist.clone().sub(leftElbow)]]) {
    const band = ringAroundLimb(wrist.clone().addScaledVector(dir.clone().normalize(), -0.16), dir, 0.078, 0.008, glowMat);
    group.add(band);
  }

  // Necklace, belt, ribbons -----------------------------------------
  const choker = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.022, 8, 40), darkMat);
  choker.position.set(0, 3.94, 0.0);
  choker.rotation.x = Math.PI / 2;
  group.add(choker);

  const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 8, 48), chromeMat);
  necklace.position.set(0, 3.79, 0.03);
  necklace.rotation.x = Math.PI / 2.12;
  group.add(necklace);

  const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), crownMat);
  pendant.position.set(0, 3.62, 0.43);
  pendant.scale.set(1, 1.45, 0.7);
  group.add(pendant);

  for (const side of [-1, 1]) {
    const chain = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.22, 3.76, 0.2),
      new THREE.Vector3(side * 0.16, 3.72, 0.34),
      new THREE.Vector3(side * 0.06, 3.67, 0.41),
      new THREE.Vector3(0, 3.64, 0.44)
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(chain, 18, 0.007, 5, false), chromeMat));
  }

  const foreheadGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), crownMat);
  foreheadGem.position.set(0, 4.55, 0.37);
  foreheadGem.scale.set(0.8, 1.3, 0.5);
  group.add(foreheadGem);

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), gemMat);
    bead.position.set(Math.cos(angle) * 0.14, 3.94, Math.sin(angle) * 0.14);
    group.add(bead);
  }

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.028, 10, 72), chromeMat);
  belt.position.set(0, 3.0, 0);
  belt.rotation.x = Math.PI / 2;
  group.add(belt);

  const buckle = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), crownMat);
  buckle.position.set(0, 3.0, 0.54);
  group.add(buckle);

  const ribbonMaterialA = new THREE.MeshBasicMaterial({ color: 0xff5fd2, toneMapped: false, transparent: true, opacity: 0.9 });
  const ribbonMaterialB = new THREE.MeshBasicMaterial({ color: 0x7df9ff, toneMapped: false, transparent: true, opacity: 0.7 });
  const ribbons = new THREE.Group();

  for (const [phase, material] of [[0, ribbonMaterialA], [Math.PI, ribbonMaterialB]]) {
    const points = [];
    for (let i = 0; i <= 100; i += 1) {
      const t = i / 100;
      const angle = t * Math.PI * 2.35 + phase;
      const radius = 1.48 - t * 0.9;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0.24 + t * 2.88,
        Math.sin(angle) * radius
      ));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    ribbons.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.011, 5, false), material));
  }
  group.add(ribbons);

  // Orb --------------------------------------------------------------
  const orb = new THREE.Group();
  orb.position.set(1.06, 4.83, 0.34);
  const orbUniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(0xff5fd2) },
    uColorB: { value: new THREE.Color(0x7df9ff) }
  };
  const orbMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: orbUniforms,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vNormal;
      varying vec3 vPos;
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      void main() {
        float swirl = sin(vPos.x * 9.0 + uTime * 2.1) * sin(vPos.y * 8.0 - uTime * 1.6) * sin(vPos.z * 10.0 + uTime * 1.2);
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.2);
        vec3 col = mix(uColorA, uColorB, 0.5 + 0.5 * swirl);
        col += vec3(1.0, 0.9, 1.0) * pow(max(0.0, swirl), 5.0) * 0.9;
        col += uColorB * fresnel * 1.1;
        gl_FragColor = vec4(col, 0.88);
      }
    `
  });
  const orbCore = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), orbMat);
  orb.add(orbCore);

  const orbInner = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  orb.add(orbInner);

  const orbRingA = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.007, 8, 64), glowMat);
  const orbRingB = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.005, 8, 64), chromeMat);
  orbRingB.rotation.x = Math.PI / 2.6;
  orb.add(orbRingA, orbRingB);

  const orbLight = new THREE.PointLight(0xff6ad5, 8, 5, 2);
  orb.add(orbLight);

  for (let i = 0; i < 4; i += 1) {
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 0), gemMat);
    const angle = (i / 4) * Math.PI * 2;
    spark.position.set(Math.cos(angle) * 0.34, Math.sin(angle * 2) * 0.12, Math.sin(angle) * 0.34);
    orb.add(spark);
  }
  group.add(orb);

  // Floating heart in the open hand ---------------------------------
  const handHeart = new THREE.Mesh(makeHeartGeometry(), crownMat);
  handHeart.position.set(-1.1, 2.82, 0.34);
  handHeart.scale.setScalar(0.22);
  handHeart.rotation.z = 0.2;
  group.add(handHeart);

  return {
    group,
    gown,
    gownMat,
    torso,
    head,
    halo,
    haloRing,
    haloChrome,
    crown,
    crownJewel,
    orb,
    orbUniforms,
    orbMat,
    orbLight,
    ribbons,
    handHeart,
    ribbonMaterialA,
    ribbonMaterialB,
    haloMat: glowMat
  };
}

export function createWorld(scene, renderer, palette) {
  const environment = createEnvironmentMap(renderer);
  scene.environment = environment;
  scene.environmentIntensity = 0.55;

  const root = new THREE.Group();
  scene.add(root);

  const sky = makeSky();
  const floor = makeFloor();
  const sun = makeSunHalo();
  root.add(sky.mesh, floor.mesh);
  sun.mesh.visible = false;

  // Ambient lights ---------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xffc4f5, 0x22002e, 0.14);
  root.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.36);
  key.position.set(4.5, 9, 6.5);
  root.add(key);

  const pinkLight = new THREE.PointLight(0xff4fc8, 7, 24, 2);
  pinkLight.position.set(4.5, 6.5, 4.5);
  root.add(pinkLight);

  const cyanLight = new THREE.PointLight(0x7df9ff, 4.5, 22, 2);
  cyanLight.position.set(-5.2, 4.2, 3.2);
  root.add(cyanLight);

  const rimLight = new THREE.PointLight(0xff2fa8, 18, 22, 2);
  rimLight.position.set(0, 5.2, -5.5);
  root.add(rimLight);

  const topLight = new THREE.PointLight(0xfff2ff, 3, 18, 2);
  topLight.position.set(0, 9.5, 1.5);
  root.add(topLight);

  const fillLight = new THREE.PointLight(0xffd9f7, 2, 14, 2);
  fillLight.position.set(0, 4.2, 6.5);
  root.add(fillLight);

  // Materials --------------------------------------------------------
  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: 0xd086c0,
    metalness: 0.08,
    roughness: 0.55,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
    sheen: 0.2,
    sheenColor: new THREE.Color(0xc85cb8),
    sheenRoughness: 0.5,
    iridescence: 0.2,
    iridescenceIOR: 1.34,
    iridescenceThicknessMinimum: 110,
    iridescenceThicknessMaximum: 520,
    envMapIntensity: 0.22
  });

  const chromeMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.98,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 1,
    iridescenceIOR: 1.4,
    iridescenceThicknessMinimum: 160,
    iridescenceThicknessMaximum: 640,
    envMapIntensity: 0.85
  });

  const gownMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.dress),
    metalness: 0.06,
    roughness: 0.58,
    clearcoat: 0.25,
    clearcoatRoughness: 0.22,
    sheen: 0.2,
    sheenColor: new THREE.Color(0xd63ca6),
    sheenRoughness: 0.55,
    iridescence: 0.35,
    iridescenceIOR: 1.45,
    iridescenceThicknessMinimum: 220,
    iridescenceThicknessMaximum: 900,
    emissive: new THREE.Color(palette.dressEmissive),
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
    envMapIntensity: 0.2
  });

  const hairMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.hair),
    metalness: 0.22,
    roughness: 0.48,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
    iridescence: 0.35,
    iridescenceIOR: 1.35,
    iridescenceThicknessMinimum: 120,
    iridescenceThicknessMaximum: 560,
    emissive: new THREE.Color(palette.hairEmissive),
    emissiveIntensity: 0.25,
    envMapIntensity: 0.3
  });

  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a0022, roughness: 0.24, metalness: 0.45 });
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.accent), toneMapped: false });
  const crownMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.crown), toneMapped: false });
  const gemMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.gem),
    metalness: 1,
    roughness: 0.05,
    clearcoat: 1,
    iridescence: 1,
    iridescenceIOR: 1.5,
    iridescenceThicknessMinimum: 100,
    iridescenceThicknessMaximum: 700,
    envMapIntensity: 1.2
  });
  const eyeIrisMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.eye), toneMapped: false });

  const goddess = buildGoddess(
    pearlMat, chromeMat, gownMat, hairMat, glowMat, darkMat, eyeIrisMat, crownMat, gemMat
  );
  root.add(goddess.group);

  // Contact shadow ---------------------------------------------------
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({
      map: makeContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.65
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  shadow.renderOrder = 2;
  root.add(shadow);

  // Title ------------------------------------------------------------
  const titleMaterial = new THREE.MeshBasicMaterial({
    map: makeTitleTexture(),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 1
  });
  const title = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.4), titleMaterial);
  title.position.set(0, 9.0, -13.5);
  title.renderOrder = -1;
  root.add(title);

  // Floating decor ---------------------------------------------------
  const heartMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.accent),
    metalness: 0.35,
    roughness: 0.28,
    clearcoat: 1,
    iridescence: 0.9,
    iridescenceIOR: 1.4,
    iridescenceThicknessMinimum: 150,
    iridescenceThicknessMaximum: 700,
    emissive: new THREE.Color(palette.dressEmissive),
    emissiveIntensity: 0.45,
    envMapIntensity: 1.05
  });
  const starMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.orbB),
    metalness: 0.4,
    roughness: 0.26,
    clearcoat: 1,
    iridescence: 0.9,
    iridescenceIOR: 1.4,
    iridescenceThicknessMinimum: 150,
    iridescenceThicknessMaximum: 700,
    emissive: new THREE.Color(0x00252a),
    emissiveIntensity: 0.5,
    envMapIntensity: 1.05
  });

  const heartGeo = makeHeartGeometry();
  const starGeo = makeStarGeometry();
  const decor = [];

  const heartSpots = [
    [-3.25, 2.15, 0.9, 0.52, 0.4],
    [3.15, 3.55, -0.4, 0.42, 1.7],
    [-2.7, 4.35, -1.3, 0.34, 3.1],
    [2.35, 1.45, 1.25, 0.46, 2.2],
    [3.85, 2.75, 1.5, 0.3, 4.4],
    [-3.9, 3.35, 1.6, 0.27, 5.2]
  ];
  heartSpots.forEach(([x, y, z, scale, phase], index) => {
    const mesh = new THREE.Mesh(heartGeo, heartMat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(scale);
    mesh.rotation.set(0.2 + index * 0.1, index * 0.8, 0.1);
    root.add(mesh);
    decor.push({ mesh, baseY: y, phase, bob: 0.12 + index * 0.012, spin: 0.18 + index * 0.03, axis: 'y' });
  });

  const starSpots = [
    [-4.05, 3.85, -2.1, 0.36, 0.8],
    [4.25, 4.2, -2.7, 0.3, 2.0],
    [0.9, 5.55, -1.9, 0.25, 3.6],
    [-3.75, 1.35, 1.5, 0.24, 4.8],
    [3.5, 5.05, 0.6, 0.2, 5.6]
  ];
  starSpots.forEach(([x, y, z, scale, phase], index) => {
    const mesh = new THREE.Mesh(starGeo, starMat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(scale);
    root.add(mesh);
    decor.push({ mesh, baseY: y, phase, bob: 0.14, spin: 0.3 + index * 0.04, axis: 'z' });
  });

  const gemSpots = [
    [-5.35, 6.65, -4.5, 0.2, 0.2],
    [4.8, 5.8, -4.0, 0.16, 1.2],
    [0.4, 3.0, 2.8, 0.12, 2.4],
    [-3.8, 6.2, 0.6, 0.13, 3.2],
    [1.9, 2.2, -2.4, 0.15, 4.1],
    [-4.2, 1.9, -1.4, 0.11, 5.0]
  ];
  gemSpots.forEach(([x, y, z, scale, phase]) => {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), gemMat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(scale);
    root.add(mesh);
    decor.push({ mesh, baseY: y, phase, bob: 0.16, spin: 0.45, axis: 'y' });
  });

  // Butterflies ------------------------------------------------------
  const wingGeo = makeWingGeometry();
  const butterflies = [];
  const butterflyColors = [0xff7ae0, 0x7df9ff, 0xcaff8a];
  const butterflySpots = [
    [-2.25, 4.0, 0.7],
    [2.8, 4.65, -1.1],
    [1.3, 5.1, 1.3],
    [-3.3, 2.9, -1.7]
  ];
  butterflySpots.forEach(([x, y, z], index) => {
    const butterfly = new THREE.Group();
    butterfly.position.set(x, y, z);
    butterfly.scale.setScalar(0.62 + (index % 2) * 0.12);

    const wingMat = new THREE.MeshPhysicalMaterial({
      color: butterflyColors[index % butterflyColors.length],
      metalness: 0.45,
      roughness: 0.15,
      clearcoat: 1,
      iridescence: 1,
      iridescenceIOR: 1.4,
      iridescenceThicknessMinimum: 100,
      iridescenceThicknessMaximum: 600,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      envMapIntensity: 1.5
    });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a0030, roughness: 0.25, metalness: 0.7 });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.scale.x = -1;
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    butterfly.add(leftWing, rightWing);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.24, 6, 10), bodyMat);
    body.rotation.z = Math.PI / 2;
    butterfly.add(body);

    for (const side of [-1, 1]) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4), bodyMat);
      antenna.position.set(side * 0.05, 0.12, 0.02);
      antenna.rotation.z = side * 0.4;
      butterfly.add(antenna);
    }

    root.add(butterfly);
    butterflies.push({ group: butterfly, leftWing, rightWing, baseX: x, baseZ: z, baseY: y, phase: index * 1.7, radius: 0.35 + index * 0.08 });
  });

  // Chrome rings + pearls -------------------------------------------
  const bigRingMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8c8e8,
    metalness: 1,
    roughness: 0.08,
    clearcoat: 1,
    iridescence: 0.8,
    iridescenceIOR: 1.4,
    iridescenceThicknessMinimum: 200,
    iridescenceThicknessMaximum: 800,
    envMapIntensity: 1.2
  });
  const bigRings = [];
  const ringSpots = [
    [-5.7, 6.4, -9.5, 2.35, 0.1, 0.5, 0.2, 0.18],
    [5.6, 4.9, -8.0, 1.65, 0.3, -0.4, 0.1, -0.14],
    [-6.8, 3.0, -5.5, 1.1, 0.2, 0.7, -0.3, 0.22]
  ];
  ringSpots.forEach(([x, y, z, radius, rx, ry, rz, speed]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.055, 12, 120), bigRingMat);
    ring.position.set(x, y, z);
    ring.rotation.set(rx, ry, rz);
    root.add(ring);
    bigRings.push({ mesh: ring, speed, baseY: y, phase: x });
  });


  // Palette ----------------------------------------------------------
  const current = {};
  const target = {};
  for (const key of COLOR_KEYS) {
    current[key] = new THREE.Color(palette[key]);
    target[key] = new THREE.Color(palette[key]);
  }

  function applyColors() {
    sky.uniforms.uTop.value.copy(current.skyTop);
    sky.uniforms.uMid.value.copy(current.skyMid);
    sky.uniforms.uBot.value.copy(current.skyBot);
    sky.uniforms.uAccent.value.copy(current.accent);
    scene.fog.color.copy(current.skyBot);

    floor.uniforms.uBase.value.copy(current.floorBase);
    floor.uniforms.uLine.value.copy(current.floorLine);
    floor.uniforms.uGlow.value.copy(current.floorGlow);

    sun.uniforms.uColor.value.copy(current.accent);

    gownMat.color.copy(current.dress);
    gownMat.emissive.copy(current.dressEmissive);
    hairMat.color.copy(current.hair);
    hairMat.emissive.copy(current.hairEmissive);

    glowMat.color.copy(current.accent).multiplyScalar(1.7);
    crownMat.color.copy(current.crown).multiplyScalar(1.45);
    eyeIrisMat.color.copy(current.eye).multiplyScalar(1.9);
    gemMat.color.copy(current.gem);
    heartMat.color.copy(current.accent);
    heartMat.emissive.copy(current.dressEmissive);
    starMat.color.copy(current.orbB);
    starMat.emissive.copy(current.orbB).multiplyScalar(0.1);

    goddess.orbUniforms.uColorA.value.copy(current.orbA);
    goddess.orbUniforms.uColorB.value.copy(current.orbB);
    goddess.orbLight.color.copy(current.accent);
    goddess.ribbonMaterialA.color.copy(current.accent);
    goddess.ribbonMaterialB.color.copy(current.orbB);

    pinkLight.color.copy(current.accent);
    cyanLight.color.copy(current.orbB);
    rimLight.color.copy(current.crown);
  }

  function setPalette(next, instant = false) {
    for (const key of COLOR_KEYS) target[key].set(next[key]);
    if (instant) {
      for (const key of COLOR_KEYS) current[key].copy(target[key]);
      applyColors();
    }
  }

  applyColors();

  function update(t, dt) {
    const blend = 1 - Math.exp(-dt * 5);
    for (const key of COLOR_KEYS) current[key].lerp(target[key], blend);
    applyColors();

    sky.uniforms.uTime.value = t;
    floor.uniforms.uTime.value = t;
    sun.uniforms.uTime.value = t;
    sun.mesh.rotation.z = t * 0.015;
    title.position.y = 9.0 + Math.sin(t * 0.45) * 0.055;

    if (gownMat.userData.shader) gownMat.userData.shader.uniforms.uTime.value = t;
    goddess.orbUniforms.uTime.value = t;

    goddess.group.position.y = Math.sin(t * 0.72) * 0.035;
    goddess.group.rotation.y = Math.sin(t * 0.24) * 0.065;
    goddess.group.rotation.z = Math.sin(t * 0.31) * 0.008;

    goddess.halo.rotation.y = t * 0.36;
    goddess.halo.rotation.z = Math.sin(t * 0.4) * 0.06;
    goddess.crown.rotation.y = -t * 0.2;
    goddess.crown.position.y = Math.sin(t * 0.8) * 0.012;
    goddess.handHeart.rotation.y = t * 0.7;
    goddess.handHeart.position.y = 2.82 + Math.sin(t * 1.2) * 0.055;

    goddess.orb.position.y = 4.83 + Math.sin(t * 1.1) * 0.06;
    goddess.orb.rotation.y = t * 0.5;
    goddess.orb.children[2].rotation.z = t * 0.8;
    goddess.orb.children[3].rotation.y = t * 0.55;

    goddess.ribbons.rotation.y = t * 0.09;

    decor.forEach(({ mesh, baseY, phase, bob, spin, axis }) => {
      mesh.position.y = baseY + Math.sin(t * 0.8 + phase) * bob;
      mesh.rotation[axis] += dt * spin;
    });

    butterflies.forEach(({ group, leftWing, rightWing, baseX, baseZ, baseY, phase, radius }) => {
      group.position.y = baseY + Math.sin(t * 1.1 + phase) * 0.16;
      group.position.x = baseX + Math.sin(t * 0.5 + phase) * 0.18;
      group.position.z = baseZ + Math.cos(t * 0.4 + phase) * 0.14;
      group.rotation.y = Math.sin(t * 0.35 + phase) * 0.5;
      const flap = Math.sin(t * 9 + phase) * 0.9;
      leftWing.rotation.y = flap;
      rightWing.rotation.y = -flap;
      leftWing.position.x = -Math.abs(Math.sin(t * 0.5 + phase)) * radius * 0.02;
      rightWing.position.x = Math.abs(Math.sin(t * 0.5 + phase)) * radius * 0.02;
    });

    bigRings.forEach(({ mesh, speed, baseY, phase }) => {
      mesh.rotation.y += dt * speed;
      mesh.rotation.x += dt * speed * 0.35;
      mesh.position.y = baseY + Math.sin(t * 0.5 + phase) * 0.12;
    });

  }

  return {
    root,
    setPalette,
    update,
    goddess,
    materials: { pearlMat, chromeMat, gownMat, hairMat, glowMat, crownMat, gemMat, eyeIrisMat, heartMat, starMat },
    environment
  };
}
