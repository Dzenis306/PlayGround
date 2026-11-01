import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createPost } from "./post.js";
import { createEnvironment } from "./environment.js";
import { createGoddess } from "./goddess.js";
import { DivineEffects } from "./effects.js";
import { palettes, applyPaletteCss } from "./palettes.js";
import { DivineAudio } from "./audio.js";

const canvas = document.getElementById("stage");
const flashEl = document.getElementById("flash");
const glitchEl = document.getElementById("glitch");
const loader = document.getElementById("loader");
const loaderFill = document.getElementById("loader-fill");
const loaderStatus = document.getElementById("loader-status");
const toast = document.getElementById("toast");
const toastWord = document.getElementById("toast-word");
const toastSub = document.getElementById("toast-sub");
const statusEl = document.getElementById("status");
const hint = document.getElementById("hint");
const cursor = document.getElementById("cursor");
const soundBtn = document.getElementById("sound-btn");
const infoBtn = document.getElementById("info-btn");
const modal = document.getElementById("modal");

let paletteIndex = 0;
let palette = palettes[paletteIndex];
applyPaletteCss(palette);

const isCoarse = window.matchMedia("(pointer: coarse)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
  stencil: false,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 220);

const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const envTexture = pmrem.fromScene(room, 0.04).texture;
scene.environment = envTexture;
scene.environmentIntensity = 0.5;

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.38, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.7;
controls.minDistance = 4.2;
controls.maxDistance = 10.5;
controls.minPolarAngle = 0.55;
controls.maxPolarAngle = 1.72;
controls.autoRotate = false;

const environment = createEnvironment(scene, palette);
const goddess = createGoddess(palette);
goddess.root.scale.setScalar(0.86);
scene.add(goddess.root);
const effects = new DivineEffects(scene, camera, palette);

const hemi = new THREE.HemisphereLight(palette.skyMid, palette.floorBase, 0.5);
scene.add(hemi);
const keyLight = new THREE.DirectionalLight(0xfff4ff, 1.25);
keyLight.position.set(3.5, 6, 5);
scene.add(keyLight);

const pinkSpot = new THREE.SpotLight(palette.skyMid, 80, 30, Math.PI / 5, 0.95, 1.7);
pinkSpot.position.set(5, 4.5, 5.5);
pinkSpot.target.position.set(0, 0.4, 0);
scene.add(pinkSpot, pinkSpot.target);

const cyanSpot = new THREE.SpotLight(palette.skyAccent, 95, 30, Math.PI / 4.4, 0.95, 1.8);
cyanSpot.position.set(-5.5, 3.4, -4.5);
cyanSpot.target.position.set(0, 0.6, 0);
scene.add(cyanSpot, cyanSpot.target);

const frontFill = new THREE.PointLight(0xffffff, 10, 14, 2);
frontFill.position.set(0, 2.4, 4.4);
scene.add(frontFill);

const altarLight = new THREE.PointLight(palette.skyAccent, 34, 9, 2);
altarLight.position.set(0, -1.1, 1.6);
scene.add(altarLight);

const post = createPost(renderer, scene, camera);

const audio = new DivineAudio();
const state = {
  shake: 0,
  glitch: 0,
  flash: 0,
  interacted: false,
  userMoved: false,
};
const pointer = { x: 0, y: 0, px: window.innerWidth / 2, py: window.innerHeight / 2 };
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const shakeOffset = new THREE.Vector3();

const lightTargets = {
  hemiSky: new THREE.Color(palette.skyMid),
  hemiGround: new THREE.Color(palette.floorBase),
  pink: new THREE.Color(palette.skyMid),
  cyan: new THREE.Color(palette.skyAccent),
  altar: new THREE.Color(palette.skyAccent),
};
const tmpColor = new THREE.Color();

function frameCamera(force = false) {
  const portrait = window.innerWidth / window.innerHeight < 0.82;
  camera.fov = portrait ? 44 : 36;
  camera.updateProjectionMatrix();
  controls.minDistance = portrait ? 5.6 : 4.8;
  controls.maxDistance = portrait ? 12.5 : 12;
  if (force || !state.userMoved) {
    camera.position.set(0, portrait ? 0.8 : 0.82, portrait ? 8.2 : 7.4);
    controls.target.set(0, portrait ? -0.1 : -0.12, 0);
    controls.update();
  }
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, w < 760 ? 1.6 : 1.8);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  frameCamera();
  post.setSize(w, h, dpr);
}

window.addEventListener("resize", resize);
resize();
frameCamera(true);

controls.addEventListener("start", () => {
  state.userMoved = true;
});

function setStatus(text) {
  statusEl.innerHTML = `<i></i> ${text}`;
  statusEl.classList.remove("is-flash");
  void statusEl.offsetWidth;
  statusEl.classList.add("is-flash");
}

let toastTimer = null;
function showToast(word, sub, kicker = "DIVINE ACT") {
  toast.querySelector(".toast__kicker").textContent = kicker;
  toastWord.textContent = word;
  toastSub.textContent = sub;
  toast.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-on"), 1700);
}

function triggerFlash(color, intensity = 1) {
  flashEl.style.background = `radial-gradient(circle at 50% 46%, #fff 0%, ${color} 30%, transparent 70%)`;
  flashEl.classList.remove("is-on");
  void flashEl.offsetWidth;
  flashEl.classList.add("is-on");
  state.flash = Math.max(state.flash, 0.32 * intensity);
}

function triggerGlitch() {
  glitchEl.classList.remove("is-on");
  void glitchEl.offsetWidth;
  glitchEl.classList.add("is-on");
  state.glitch = 1;
}

function setPowerButton(type) {
  document.querySelectorAll(".power").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.power === type);
    if (btn.dataset.power === type) {
      setTimeout(() => btn.classList.remove("is-active"), 700);
    }
  });
}

function doPower(type) {
  setPowerButton(type);
  if (type === "create") {
    effects.create(palette);
    goddess.react("create");
    triggerFlash(palette.skyMid, 0.9);
    setStatus("LIFE IS EVERYWHERE");
    showToast("CREATE", "LIFE BLOOMS", "DIVINE ACT 01");
    audio.sfxCreate();
  } else if (type === "destroy") {
    effects.destroy(palette);
    goddess.react("destroy");
    state.shake = 0.16;
    triggerGlitch();
    triggerFlash("#ff2b4a", 1.15);
    setStatus("SHE ENDS WORLDS");
    showToast("DESTROY", "WORLDS END", "DIVINE ACT 02");
    audio.sfxDestroy();
  } else if (type === "change") {
    paletteIndex = (paletteIndex + 1) % palettes.length;
    palette = palettes[paletteIndex];
    applyPaletteCss(palette);
    environment.setPalette(palette);
    goddess.setPalette(palette);
    effects.change(palette);
    goddess.react("change");
    lightTargets.hemiSky.set(palette.skyMid);
    lightTargets.hemiGround.set(palette.floorBase);
    lightTargets.pink.set(palette.skyMid);
    lightTargets.cyan.set(palette.skyAccent);
    lightTargets.altar.set(palette.skyAccent);
    triggerFlash(palette.skyAccent, 0.85);
    setStatus(palette.name);
    showToast("CHANGE", palette.name, "DIVINE ACT 03");
    audio.sfxChange();
  }
}

document.querySelectorAll("[data-power]").forEach((btn) => {
  btn.addEventListener("click", () => doPower(btn.dataset.power));
  btn.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
  btn.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (event.key === "1" || event.key.toLowerCase() === "c") doPower("create");
  else if (event.key === "2" || event.key.toLowerCase() === "d") doPower("destroy");
  else if (event.key === "3" || event.key.toLowerCase() === "x") doPower("change");
  else if (event.key.toLowerCase() === "m") toggleSound();
});

function toggleSound() {
  const enabled = audio.toggle();
  soundBtn.setAttribute("aria-pressed", String(enabled));
  soundBtn.setAttribute("aria-label", enabled ? "Mute sound" : "Enable sound");
  soundBtn.title = enabled ? "Mute sound (M)" : "Sound (M)";
}

soundBtn.addEventListener("click", toggleSound);
infoBtn.addEventListener("click", () => modal.showModal());
modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.close();
});

function unlockAudio() {
  audio.unlock().then(() => {
    soundBtn.setAttribute("aria-pressed", "true");
    soundBtn.setAttribute("aria-label", "Mute sound");
    soundBtn.title = "Mute sound (M)";
  }).catch(() => {});
}
window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("keydown", unlockAudio, { once: true });

// cursor + pointer head tracking
if (!isCoarse) {
  window.addEventListener("pointermove", (event) => {
    pointer.px = event.clientX;
    pointer.py = event.clientY;
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    cursor.classList.remove("is-hidden");
  });
  window.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));
  document.querySelectorAll(".icon-btn, .brand").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
  });
}

// tap the goddess
let down = { x: 0, y: 0, t: 0 };
canvas.addEventListener("pointerdown", (event) => {
  down = { x: event.clientX, y: event.clientY, t: performance.now() };
});
canvas.addEventListener("pointerup", (event) => {
  const dist = Math.hypot(event.clientX - down.x, event.clientY - down.y);
  if (dist > 9 || performance.now() - down.t > 650) return;
  ndc.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(goddess.root, true);
  if (!hits.length) return;
  const point = hits[0].point.clone();
  effects.bless(point, palette);
  goddess.react("create");
  triggerFlash(palette.halo, 0.45);
  showToast("BLESSED", "SHE SEES YOU", "DIVINE FAVOR");
  setStatus("SHE SEES YOU");
  audio.sfxBless();
});

setTimeout(() => {
  hint.style.transition = "opacity 1.2s ease";
  hint.style.opacity = "0";
}, 11000);

const clock = new THREE.Clock();
let elapsed = 0;
let firstFrame = true;
let bootProgress = 8;

const bootTimer = setInterval(() => {
  bootProgress = Math.min(88, bootProgress + Math.random() * 9);
  loaderFill.style.width = `${bootProgress}%`;
}, 130);

function finishBoot() {
  clearInterval(bootTimer);
  loaderFill.style.width = "100%";
  loaderStatus.textContent = "ALTAR ONLINE";
  setTimeout(() => loader.classList.add("is-gone"), 260);
  setTimeout(() => {
    effects.flowers.spawn(3, palette);
    effects.butterflies.spawn(3, palette);
  }, 900);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  controls.update();
  goddess.update(dt, elapsed, { x: pointer.x, y: pointer.y });
  environment.update(dt, elapsed);
  effects.update(dt, elapsed);

  const k = 1 - Math.exp(-2.4 * dt);
  hemi.color.lerp(lightTargets.hemiSky, k);
  hemi.groundColor.lerp(lightTargets.hemiGround, k);
  pinkSpot.color.lerp(lightTargets.pink, k);
  cyanSpot.color.lerp(lightTargets.cyan, k);
  altarLight.color.lerp(lightTargets.altar, k);
  keyLight.color.copy(tmpColor.set(0xfff4ff));

  state.shake *= Math.exp(-6 * dt);
  state.glitch = Math.max(0, state.glitch - dt * 1.9);
  state.flash = Math.max(0, state.flash - dt * 3.6);

  if (state.shake > 0.001) {
    shakeOffset.set(
      (Math.random() - 0.5) * state.shake,
      (Math.random() - 0.5) * state.shake,
      (Math.random() - 0.5) * state.shake * 0.5
    );
    camera.position.add(shakeOffset);
  }

  post.grade.uniforms.uTime.value = elapsed;
  post.grade.uniforms.uGlitch.value = state.glitch;
  post.grade.uniforms.uFlash.value = state.flash;
  post.grade.uniforms.uAberration.value = 0.0015 + state.glitch * 0.004;

  post.composer.render();

  if (state.shake > 0.001) camera.position.sub(shakeOffset);

  if (firstFrame) {
    firstFrame = false;
    finishBoot();
  }
}

animate();

window.__OMNI = { scene, camera, renderer, controls, goddess, environment, effects, palettes, doPower, post, hemi, keyLight, pinkSpot, cyanSpot, frontFill, altarLight };
