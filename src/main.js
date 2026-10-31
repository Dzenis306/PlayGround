import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { createEnvironment, THEMES } from "./environment.js";
import { createGoddess } from "./figure.js";
import { SoulField, Shockwaves, BurstSystem } from "./effects.js";
import { DivineAudio } from "./audio.js";

const canvas = document.querySelector("#scene");
const lifeCountEl = document.querySelector("#life-count");
const cycleCountEl = document.querySelector("#cycle-count");
const realmEl = document.querySelector("#realm");
const soundButton = document.querySelector("#sound");
const soundLabel = document.querySelector("#sound-label");
const captionEl = document.querySelector("#caption");
const captionKicker = document.querySelector("#caption-kicker");
const captionText = document.querySelector("#caption-text");
const flashEl = document.querySelector("#flash");
const cursorEl = document.querySelector("#cursor");
const powerButtons = [...document.querySelectorAll(".power")];

const isMobile = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
const quality = {
  mobile: isMobile,
  pixelRatio: Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75),
  mirror: isMobile ? 512 : 768,
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
} catch (error) {
  document.body.innerHTML =
    '<p style="position:fixed;inset:0;display:grid;place-items:center;padding:24px;text-align:center;font-family:sans-serif;color:#fff;background:#0a0010">This altar needs WebGL, and your browser could not open it.</p>';
  throw error;
}

renderer.setPixelRatio(quality.pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 140);

const environment = createEnvironment(scene, renderer, quality);

const theme = THEMES[0];
const current = {
  a: new THREE.Color(theme.a),
  b: new THREE.Color(theme.b),
  c: new THREE.Color(theme.c),
  bg: new THREE.Color(theme.bg),
};
const target = {
  a: current.a.clone(),
  b: current.b.clone(),
  c: current.c.clone(),
  bg: current.bg.clone(),
};

const goddess = createGoddess(current, quality);
scene.add(goddess.root);

const souls = new SoulField(scene, current, quality);
const shockwaves = new Shockwaves(scene);
const bursts = new BurstSystem(scene, quality);
const audio = new DivineAudio();

// Post-processing: bloom, tone mapping, then a custom hyperpop grade.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  isMobile ? 0.45 : 0.5,
  0.5,
  1.25
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGlitch: { value: 0 },
    uVignette: { value: 0.46 },
    uGrain: { value: 0.028 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGlitch;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      float block = floor(uv.y * 30.0);
      float jump = (hash(vec2(block, floor(uTime * 18.0))) - 0.5) * 0.03 * uGlitch;
      uv.x += jump;

      vec2 dir = uv - 0.5;
      float ca = 0.0011 + uGlitch * 0.007;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;

      float vignette = smoothstep(0.92, 0.24, length(uv - 0.5));
      col *= mix(1.0, vignette, uVignette);
      col *= 1.0 - 0.022 * sin(uv.y * 1200.0);
      col += (hash(uv * vec2(1920.0, 1080.0) + uTime) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
const gradePass = new ShaderPass(GradeShader);
composer.addPass(gradePass);

// Camera orbit rig.
const cameraState = {
  yaw: 0.02,
  pitch: 0.075,
  distance: isMobile ? 7.35 : 5.9,
  userYaw: 0,
  userPitch: 0,
  targetX: 0,
  targetY: 1.52,
  shake: 0,
  intro: 1,
};
const lookTarget = new THREE.Vector3(0, 1.52, 0);
const introStartedAt = performance.now();
const handPosition = new THREE.Vector3();
const centerPosition = new THREE.Vector3(0, 1.5, 0);

function frameCamera() {
  const wide = window.innerWidth > 980 && window.innerWidth / window.innerHeight > 1.15;
  cameraState.targetX = wide ? -Math.min(1.15, window.innerWidth * 0.00068) : 0;
  cameraState.targetY = window.innerWidth <= 680 ? 1.75 : 1.52;
  if (window.innerWidth <= 760) cameraState.distance = Math.min(cameraState.distance, 7.6);
}

frameCamera();

function updateCamera(time, dt) {
  cameraState.intro = Math.max(0, 1 - (performance.now() - introStartedAt) / 900);
  const introEase = 1 - Math.pow(1 - cameraState.intro, 3);
  const distance = cameraState.distance + introEase * 2.2;
  const yaw = cameraState.yaw + cameraState.userYaw + Math.sin(time * 0.11) * 0.075;
  const pitch = THREE.MathUtils.clamp(
    cameraState.pitch + cameraState.userPitch + Math.sin(time * 0.17) * 0.012,
    -0.36,
    0.62
  );

  lookTarget.set(cameraState.targetX, cameraState.targetY, 0);
  camera.position.set(
    lookTarget.x + Math.sin(yaw) * Math.cos(pitch) * distance,
    lookTarget.y + Math.sin(pitch) * distance,
    lookTarget.z + Math.cos(yaw) * Math.cos(pitch) * distance
  );

  if (cameraState.shake > 0.001) {
    const amount = cameraState.shake;
    camera.position.x += (Math.random() - 0.5) * amount * 0.16;
    camera.position.y += (Math.random() - 0.5) * amount * 0.12;
    camera.position.z += (Math.random() - 0.5) * amount * 0.1;
    cameraState.shake *= Math.pow(0.012, dt);
  }

  camera.lookAt(lookTarget);
  camera.rotateZ(Math.sin(time * 0.09) * 0.004);
}

// UI helpers.
let captionTimer = 0;
let glitchTimer = 0;
let eraseTimer = 0;
let lastSoulCount = -1;
let cycles = 0;
let glitchAmount = 0;

function updateSoundUI() {
  const on = audio.enabled;
  soundButton.setAttribute("aria-pressed", String(on));
  soundLabel.textContent = on ? "SOUND ON" : "SOUND OFF";
}

function showCaption(kicker, text, big = false) {
  window.clearTimeout(captionTimer);
  captionEl.classList.remove("show");
  captionKicker.textContent = kicker;
  captionText.textContent = text;
  captionText.classList.toggle("big", big);
  // Force a reflow so the entrance can replay on rapid commands.
  void captionEl.offsetWidth;
  captionEl.classList.add("show");
  captionTimer = window.setTimeout(() => captionEl.classList.remove("show"), big ? 3800 : 3200);
}

function screenFlash() {
  flashEl.classList.remove("bang");
  void flashEl.offsetWidth;
  flashEl.classList.add("bang");
}

function glitch(amount = 1) {
  glitchAmount = Math.max(glitchAmount, amount);
  document.body.classList.remove("is-glitching");
  void document.body.offsetWidth;
  document.body.classList.add("is-glitching");
  window.clearTimeout(glitchTimer);
  glitchTimer = window.setTimeout(() => document.body.classList.remove("is-glitching"), 520);
}

function erasePulse() {
  document.body.classList.add("is-erasing");
  window.clearTimeout(eraseTimer);
  eraseTimer = window.setTimeout(() => document.body.classList.remove("is-erasing"), 700);
}

function updateStats(force = false) {
  const count = souls.count();
  if (force || count !== lastSoulCount) {
    lifeCountEl.textContent = String(count).padStart(3, "0");
    lastSoulCount = count;
  }
  cycleCountEl.textContent = String(cycles).padStart(2, "0");
}

const CREATION_LINES = [
  "LIFE, BORN FROM NOTHING",
  "LET THERE BE LIGHT",
  "A NEW SOUL, JUST FOR YOU",
  "BREATHE, LITTLE THING",
];
const ERASURE_LINES = [
  "ASHES. THEN SILENCE.",
  "I UNMAKE IT ALL",
  "NOTHING IS FOREVER",
  "BACK TO THE VOID",
];
const CHANGE_LINES = [
  "FORM IS A SUGGESTION",
  "BECOME OTHERWISE",
  "REALITY, RECOMPILED",
  "A NEW SKIN FOR THE WORLD",
];
const EVERYTHING_LINES = [
  "I AM EVERYTHING",
  "ALL AT ONCE. ALWAYS.",
  "EVERY VERSION OF REALITY",
  "WATCH ME DO IT ALL",
];
const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

let themeIndex = 0;

function applyTheme(index, rebuild = true) {
  themeIndex = ((index % THEMES.length) + THEMES.length) % THEMES.length;
  const next = THEMES[themeIndex];
  target.a.set(next.a);
  target.b.set(next.b);
  target.c.set(next.c);
  target.bg.set(next.bg);
  document.body.dataset.theme = next.id;
  realmEl.textContent = `REALM: ${next.name}`;
  audio.setTheme(themeIndex);
  if (rebuild) environment.setTheme(target);
}

function startAudio() {
  audio.ensure().then(updateSoundUI).catch(() => updateSoundUI());
}

function getHandPosition() {
  goddess.root.updateMatrixWorld(true);
  return goddess.orb.getWorldPosition(handPosition);
}

function fireButton(kind) {
  const button = powerButtons.find((item) => item.dataset.power === kind);
  if (!button) return;
  button.classList.remove("is-firing");
  void button.offsetWidth;
  button.classList.add("is-firing");
  window.setTimeout(() => button.classList.remove("is-firing"), 600);
}

function doPower(kind) {
  startAudio();
  fireButton(kind);

  if (kind === "create") {
    const origin = getHandPosition().clone();
    souls.spawn(12 + Math.floor(Math.random() * 7), origin, target);
    bursts.fire(origin, target, 1);
    shockwaves.fire(origin, target, 1);
    goddess.kick(0.55);
    cameraState.shake = Math.max(cameraState.shake, 0.3);
    audio.create();
    showCaption("CREATION", pick(CREATION_LINES));
    updateStats(true);
    return;
  }

  if (kind === "destroy") {
    souls.destroy();
    bursts.fire(new THREE.Vector3(0, 1.4, 0), target, 1.6);
    shockwaves.fire(centerPosition, target, 1.9);
    goddess.kick(0.95);
    goddess.spin(-1.8);
    cameraState.shake = Math.max(cameraState.shake, 1.25);
    glitch(1);
    erasePulse();
    audio.destroy();
    showCaption("ERASURE", pick(ERASURE_LINES), true);
    updateStats(true);
    return;
  }

  if (kind === "change") {
    applyTheme(themeIndex + 1);
    souls.recolor(target);
    goddess.spin(2.4);
    goddess.kick(0.4);
    shockwaves.fire(centerPosition, target, 1.2);
    cameraState.shake = Math.max(cameraState.shake, 0.35);
    audio.change();
    cycles += 1;
    showCaption("MUTATION", pick(CHANGE_LINES));
    updateStats(true);
    return;
  }

  if (kind === "everything") {
    const origin = getHandPosition().clone();
    let next = Math.floor(Math.random() * THEMES.length);
    if (next === themeIndex) next = (next + 1) % THEMES.length;
    applyTheme(next);
    souls.spawn(24 + Math.floor(Math.random() * 10), origin, target);
    souls.recolor(target);
    bursts.fire(origin, target, 1.7);
    bursts.fire(centerPosition, target, 1.3);
    shockwaves.fire(centerPosition, target, 2.4);
    window.setTimeout(() => shockwaves.fire(centerPosition, target, 1.6), 180);
    goddess.spin(4.2);
    goddess.kick(1.25);
    cameraState.shake = Math.max(cameraState.shake, 1.7);
    glitch(1.3);
    screenFlash();
    audio.everything();
    cycles += 1;
    showCaption("OMNIPOTENCE", pick(EVERYTHING_LINES), true);
    updateStats(true);
  }
}

// Controls.
powerButtons.forEach((button) => {
  button.addEventListener("click", () => doPower(button.dataset.power));
});

soundButton.addEventListener("click", async () => {
  await audio.toggle();
  updateSoundUI();
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (["1", "2", "3", "4"].includes(key)) {
    event.preventDefault();
    doPower({ "1": "create", "2": "destroy", "3": "change", "4": "everything" }[key]);
  } else if (key === " " || key === "enter") {
    const tag = document.activeElement?.tagName;
    if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA") return;
    event.preventDefault();
    doPower("everything");
  }
});

const pointers = new Map();
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let pinchDistance = 0;

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1) {
    dragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.classList.add("is-dragging");
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDistance > 0 && distance > 0) {
      cameraState.distance = THREE.MathUtils.clamp(
        cameraState.distance * (pinchDistance / distance),
        4.1,
        10.5
      );
    }
    pinchDistance = distance;
    return;
  }

  if (!dragging) return;
  const dx = event.clientX - lastPointerX;
  const dy = event.clientY - lastPointerY;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  cameraState.userYaw -= dx * 0.0048;
  cameraState.userPitch = THREE.MathUtils.clamp(cameraState.userPitch - dy * 0.0031, -0.34, 0.52);
});

function endPointer(event) {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinchDistance = 0;
  if (pointers.size === 0) {
    dragging = false;
    canvas.classList.remove("is-dragging");
  }
}

canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("lostpointercapture", endPointer);

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    cameraState.distance = THREE.MathUtils.clamp(cameraState.distance + event.deltaY * 0.0018, 4.1, 10.5);
  },
  { passive: false }
);

window.addEventListener(
  "pointermove",
  (event) => {
    if (event.pointerType === "touch") return;
    document.body.classList.add("has-pointer");
    cursorEl.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  },
  { passive: true }
);

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.mobile ? 1.5 : 1.75));
  renderer.setSize(width, height);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.mobile ? 1.5 : 1.75));
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  frameCamera();
});

// Loop.
const clock = new THREE.Clock();
let elapsed = 0;
let statsAccumulator = 0;

function tick() {
  requestAnimationFrame(tick);
  if (document.hidden) return;

  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  const ease = 1 - Math.exp(-dt * 3.1);
  current.a.lerp(target.a, ease);
  current.b.lerp(target.b, ease);
  current.c.lerp(target.c, ease);
  current.bg.lerp(target.bg, ease);

  environment.update(elapsed, dt, current);
  goddess.update(elapsed, dt, current);
  souls.update(elapsed);
  shockwaves.update(dt);
  bursts.update(dt);
  updateCamera(elapsed, dt);

  glitchAmount = Math.max(0, glitchAmount - dt * 2.4);
  gradePass.uniforms.uTime.value = elapsed;
  gradePass.uniforms.uGlitch.value = glitchAmount;

  statsAccumulator += dt;
  if (statsAccumulator > 0.2) {
    statsAccumulator = 0;
    updateStats();
  }

  composer.render(dt);
}

applyTheme(0, false);
updateSoundUI();
updateStats(true);
showCaption("ALTAR ONLINE", "SHE IS EVERYTHING", false);
tick();

window.__HYPERDEITY__ = {
  power: doPower,
  setTheme: (index) => applyTheme(index),
  souls,
  camera: cameraState,
  audio,
  themes: THEMES,
  scene,
  composer,
  renderer,
  bloom,
  environment,
};
