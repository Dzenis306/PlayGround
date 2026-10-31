import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Goddess } from "./lib/goddess.js";
import { World } from "./lib/world.js";
import { PowerFX } from "./lib/effects.js";
import { AudioEngine } from "./lib/audio.js";
import "./style.css";

const canvas = document.querySelector("#scene");
const boot = document.querySelector("#boot");
const body = document.body;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
  preserveDrawingBuffer: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, reduceMotion ? 1 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#050008");

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 80);
const target = new THREE.Vector3(0.18, 1.98, 0);
const baseCamera = {
  radius: 6.7,
  yaw: 0,
  pitch: 0.018,
  fov: 38,
};
const state = {
  yaw: baseCamera.yaw,
  pitch: baseCamera.pitch,
  targetYaw: 0,
  targetPitch: 0,
  pointerX: 0,
  pointerY: 0,
  dragX: 0,
  dragY: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
  cameraKick: 0,
  cooldown: 0,
  paletteIndex: 0,
  casting: null,
  castTimer: null,
  typeTimer: null,
};

const world = new World(scene, camera, renderer);
const goddess = new Goddess();
scene.add(goddess.group);

const audio = new AudioEngine();
const fx = new PowerFX(scene, goddess, world, applyPalette);

// ---------------------------------------------------------------------------
// Post processing
// ---------------------------------------------------------------------------

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.32,
  0.5,
  1.15
);
composer.addPass(bloom);

const glitchShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.0014 },
    uTime: { value: 0 },
    uGlitch: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
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
    uniform float uAmount;
    uniform float uTime;
    uniform float uGlitch;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      float glitch = uGlitch;
      float line = step(0.5, hash(vec2(floor(uv.y * 90.0), floor(uTime * 18.0))));
      uv.x += (line * 0.004 * glitch) * (hash(vec2(floor(uv.y * 120.0), uTime)) - 0.5);
      vec2 dir = uv - 0.5;
      float dist = length(dir);
      float aberration = uAmount + glitch * 0.008 * (0.35 + dist);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * aberration * 1.35).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * aberration * 1.35).b;
      float grain = hash(gl_FragCoord.xy + fract(uTime) * 431.0) - 0.5;
      col += grain * 0.018;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
const glitchPass = new ShaderPass(glitchShader);
composer.addPass(glitchPass);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const POWER_META = {
  create: {
    label: "CREATION",
    text: "“Let there be something that breathes.”",
    status: "LIFE DETECTED",
    verb: "BREATHE",
  },
  destroy: {
    label: "ANNIHILATION",
    text: "Nothing is sacred. Not even nothing.",
    status: "REALITY BREACHED",
    verb: "UNMAKE",
  },
  change: {
    label: "MUTATION",
    text: "Reality is a mood ring. She turns the dial.",
    status: "FORM REWRITTEN",
    verb: "REWRITE",
  },
  everything: {
    label: "OMNIPOTENCE",
    text: "She does not choose. She is.",
    status: "ALL AT ONCE",
    verb: "BECOME",
  },
};

const powerButtons = [...document.querySelectorAll(".power")];
const transmissionText = document.querySelector("#transmission-text");
const stateLabel = document.querySelector("#state-label");
const soundButton = document.querySelector("#sound");
const soundLabel = document.querySelector("#sound-label");
const powerPct = document.querySelector("#power-pct");
const ring = document.querySelector("#ring");
const footerStatus = document.querySelector(".footer-meta span:first-child");
const clockEl = document.querySelector("#clock");
const modal = document.querySelector("#modal");
const modalClose = document.querySelector("#modal-close");
const infoButton = document.querySelector("#info");

function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString("en-GB", { hour12: false });
}
updateClock();
setInterval(updateClock, 1000);

function setTransmission(label, text) {
  transmissionText.classList.add("is-changing");
  stateLabel.textContent = label;
  clearTimeout(state.typeTimer);
  state.typeTimer = setTimeout(() => {
    transmissionText.textContent = text;
    transmissionText.classList.remove("is-changing");
  }, 220);
}

function applyPalette(palette, index) {
  state.paletteIndex = index;
  document.documentElement.style.setProperty("--accent", palette.accent);
  document.documentElement.style.setProperty("--accent-2", palette.accent2);
  document.documentElement.style.setProperty("--accent-3", palette.accent2);
  document.documentElement.style.setProperty("--acid", palette.acid);
  goddess.setPalette(palette);
  world.setPalette(palette);
  if (state.casting === "change" || state.casting === "everything") {
    setTransmission("MUTATION", `Reality now reads: ${palette.name.toLowerCase()}.`);
  }
}

function pulseGauge() {
  ring.style.strokeDashoffset = "248";
  powerPct.textContent = "08";
  setTimeout(() => {
    ring.style.strokeDashoffset = "0";
    powerPct.textContent = "100";
  }, 420);
}

function cast(power) {
  if (state.cooldown > 0) return;
  state.cooldown = 0.62;
  state.casting = power;
  body.classList.add("is-casting");
  body.classList.add("is-flashing");
  clearTimeout(state.castTimer);
  state.castTimer = setTimeout(() => {
    body.classList.remove("is-casting");
  }, 420);
  setTimeout(() => body.classList.remove("is-flashing"), 60);

  const meta = POWER_META[power];
  setTransmission(meta.label, meta.text);
  if (footerStatus) {
    footerStatus.innerHTML = `<i class="pulse-dot"></i> ${meta.status}`;
  }
  if (power === "destroy" || power === "everything") {
    body.classList.add("is-glitching");
    setTimeout(() => body.classList.remove("is-glitching"), 380);
    world.shake = Math.max(world.shake, 1.25);
    state.cameraKick = Math.max(state.cameraKick, 0.1);
  } else {
    state.cameraKick = Math.max(state.cameraKick, 0.025);
  }

  const resultPalette = fx.cast(power);
  if (resultPalette) applyPalette(resultPalette, fx.paletteIndex);
  pulseGauge();
  audio.power(power);

  powerButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.power === power);
    if (button.dataset.power === power) {
      clearTimeout(button._activeTimer);
      button._activeTimer = setTimeout(() => button.classList.remove("is-active"), 1350);
    }
  });

  setTimeout(() => {
    state.casting = null;
    if (footerStatus) {
      footerStatus.innerHTML = `<i class="pulse-dot"></i> REALITY STABLE`;
    }
  }, 1600);
}

powerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    cast(button.dataset.power);
    if (!audio.muted && !audio.started) {
      audio.start();
      setSoundUI(true);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  const map = { "1": "create", "2": "destroy", "3": "change", "4": "everything" };
  if (map[event.key]) {
    cast(map[event.key]);
    event.preventDefault();
  }
  if (event.key === "Escape") closeModal();
});

function setSoundUI(on) {
  body.classList.toggle("sound-on", on);
  soundButton.setAttribute("aria-pressed", String(on));
  soundLabel.textContent = on ? "SOUND ON" : "SOUND OFF";
}

soundButton.addEventListener("click", async () => {
  if (!audio.started) {
    const ok = await audio.start();
    setSoundUI(ok);
  } else {
    const nextMuted = !audio.muted;
    audio.setMuted(nextMuted);
    setSoundUI(!nextMuted);
  }
});

function openModal() {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}
infoButton.addEventListener("click", openModal);
modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

// ---------------------------------------------------------------------------
// Pointer + camera
// ---------------------------------------------------------------------------

canvas.addEventListener("pointerdown", (event) => {
  state.dragging = true;
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  canvas.setPointerCapture?.(event.pointerId);
});

window.addEventListener("pointerup", () => {
  state.dragging = false;
});

window.addEventListener("pointercancel", () => {
  state.dragging = false;
});

window.addEventListener("pointermove", (event) => {
  state.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
  state.pointerY = -((event.clientY / window.innerHeight) * 2 - 1);
  if (state.dragging) {
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.targetYaw = THREE.MathUtils.clamp(state.targetYaw - dx * 0.004, -0.62, 0.62);
    state.targetPitch = THREE.MathUtils.clamp(state.targetPitch + dy * 0.0025, -0.2, 0.28);
  }
});

window.addEventListener("pointerleave", () => {
  state.pointerX = 0;
  state.pointerY = 0;
});

function updateCamera(dt) {
  const aspect = window.innerWidth / window.innerHeight;
  const mobile = aspect < 0.8;
  const radius = mobile ? 8.8 : 6.7;
  const fov = mobile ? 43 : 38;
  const targetPos = mobile ? new THREE.Vector3(0.34, 1.86, 0) : new THREE.Vector3(0.24, 1.95, 0);

  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  state.yaw += (state.targetYaw + state.pointerX * 0.045 - state.yaw) * Math.min(1, dt * 4.2);
  state.pitch += (state.targetPitch + state.pointerY * 0.025 - state.pitch) * Math.min(1, dt * 3.8);
  target.lerp(targetPos, Math.min(1, dt * 3));

  const cp = Math.cos(state.pitch);
  const shake = world.getShakeOffset();
  camera.position.set(
    target.x + Math.sin(state.yaw) * radius * cp + shake.x,
    target.y + Math.sin(state.pitch) * radius + shake.y,
    target.z + Math.cos(state.yaw) * radius * cp
  );
  const kick = state.cameraKick;
  camera.position.z -= kick;
  camera.position.y += kick * 0.12;
  state.cameraKick += (0 - state.cameraKick) * Math.min(1, dt * 8);
  camera.lookAt(target.x, target.y + 0.02, target.z);
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(width, height);
  composer.setSize(width, height);
  bloom.setSize(width, height);
  glitchPass.uniforms.uResolution.value.set(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  world.dust.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
}
window.addEventListener("resize", onResize);

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let bootTimer = null;
let frame = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  state.cooldown = Math.max(0, state.cooldown - dt);
  goddess.setPointer(state.pointerX, state.pointerY);
  goddess.update(dt, t);
  world.update(dt, t);
  fx.update(dt, t);
  updateCamera(dt);

  glitchPass.uniforms.uTime.value = t;
  const glitchTarget = body.classList.contains("is-glitching") ? 1 : 0;
  glitchPass.uniforms.uGlitch.value +=
    (glitchTarget - glitchPass.uniforms.uGlitch.value) * Math.min(1, dt * 12);

  const pulse = 0.0014 + (state.casting ? 0.0008 : 0) + Math.sin(t * 0.4) * 0.0002;
  glitchPass.uniforms.uAmount.value += (pulse - glitchPass.uniforms.uAmount.value) * dt * 3;

  composer.render();

  frame++;
  if (frame === 2) {
    bootTimer = setTimeout(() => {
      boot.classList.add("is-done");
      body.dataset.ready = "true";
    }, 280);
  }
}

onResize();
updateCamera(1);
animate();

// Deliberately start silent; the sound button is the consent gate.
setSoundUI(false);

// Pause the loop when hidden to preserve battery on mobile.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clock.stop();
  } else {
    clock.start();
  }
});

window.__omni = { scene, camera, renderer, composer, goddess, world, fx, audio, cast, state };
