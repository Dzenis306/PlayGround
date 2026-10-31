import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld } from './world.js';
import { CreatureManager } from './creatures.js';
import { FX } from './fx.js';
import { DivineAudio } from './audio.js';

const PALETTES = [
  {
    name: 'GENESIS',
    skyTop: 0x090012,
    skyMid: 0x9a0b73,
    skyBot: 0x16001f,
    accent: 0xff4fc8,
    floorBase: 0x0e0117,
    floorLine: 0xff3fbf,
    floorGlow: 0xff8ae8,
    dress: 0xd10082,
    dressEmissive: 0x220018,
    hair: 0xc02fa5,
    hairEmissive: 0x1c0014,
    orbA: 0xff5fd2,
    orbB: 0x7df9ff,
    eye: 0x7df9ff,
    crown: 0xff5fd2,
    gem: 0xffd9f7,
    creature: [0xff6ad5, 0x7df9ff, 0xc8ff5e, 0xffd166, 0xb28dff, 0xff8a5c, 0x5eead4],
    cssAccent: '#ff5fd2',
    cssAccent2: '#7df9ff'
  },
  {
    name: 'ACID BLOOM',
    skyTop: 0x001a16,
    skyMid: 0x7fdc28,
    skyBot: 0x0b1f12,
    accent: 0xd6ff3e,
    floorBase: 0x07160c,
    floorLine: 0xb6ff3e,
    floorGlow: 0xeaff8a,
    dress: 0x6fdb20,
    dressEmissive: 0x0d2600,
    hair: 0x59e8dd,
    hairEmissive: 0x002020,
    orbA: 0xd6ff3e,
    orbB: 0x7df9ff,
    eye: 0xd6ff3e,
    crown: 0xefffb0,
    gem: 0xeaffd0,
    creature: [0xd6ff3e, 0x7df9ff, 0xff6ad5, 0xffd166, 0x9dffcf, 0xb28dff, 0xff8a5c],
    cssAccent: '#b6ff3e',
    cssAccent2: '#7df9ff'
  },
  {
    name: 'CHROME DREAM',
    skyTop: 0x070a2a,
    skyMid: 0x45cede,
    skyBot: 0x10123a,
    accent: 0x7df9ff,
    floorBase: 0x060a1e,
    floorLine: 0x7df9ff,
    floorGlow: 0xd6ffff,
    dress: 0x7688e6,
    dressEmissive: 0x000b26,
    hair: 0xc9d3ff,
    hairEmissive: 0x12122b,
    orbA: 0x7df9ff,
    orbB: 0xff9ae6,
    eye: 0xffffff,
    crown: 0xe6f7ff,
    gem: 0xffffff,
    creature: [0x9ef7ff, 0xff9ae6, 0xffffff, 0xb28dff, 0x7dffd4, 0xffd166, 0x8fa8ff],
    cssAccent: '#7df9ff',
    cssAccent2: '#ffb4ec'
  },
  {
    name: 'BLOOD MOON',
    skyTop: 0x1a0008,
    skyMid: 0xc92446,
    skyBot: 0x2a0710,
    accent: 0xff7a3c,
    floorBase: 0x1a020b,
    floorLine: 0xff3b5c,
    floorGlow: 0xffb07a,
    dress: 0xe6284b,
    dressEmissive: 0x280006,
    hair: 0xe8742f,
    hairEmissive: 0x220600,
    orbA: 0xff7a3c,
    orbB: 0xffd166,
    eye: 0xffd166,
    crown: 0xffb07a,
    gem: 0xffe0b0,
    creature: [0xff7a3c, 0xffd166, 0xff3b8d, 0xffb07a, 0xb28dff, 0xff6ad5, 0x7df9ff],
    cssAccent: '#ff7a3c',
    cssAccent2: '#ffd166'
  }
];

const MODE_COPY = {
  create: {
    kicker: 'DIVINE ACT',
    title: 'CREATE',
    sub: 'life blooms at your touch'
  },
  change: {
    kicker: 'DIVINE ACT',
    title: 'CHANGE',
    sub: 'reality, rewritten'
  },
  destroy: {
    kicker: 'DIVINE ACT',
    title: 'DESTROY',
    sub: 'the void answers'
  }
};

const canvas = document.querySelector('#scene');
const livesEl = document.querySelector('#lives');
const lifeStat = document.querySelector('#life-stat');
const toast = document.querySelector('#toast');
const toastKicker = document.querySelector('#toast-kicker');
const toastTitle = document.querySelector('#toast-title');
const toastSub = document.querySelector('#toast-sub');
const flash = document.querySelector('#flash');
const prism = document.querySelector('#prism');
const soundButton = document.querySelector('#sound');
const resetButton = document.querySelector('#reset');
const powerButtons = [...document.querySelectorAll('.power')];
const fallback = document.querySelector('#fallback');
const hint = document.querySelector('#hint');
const actIndex = document.querySelector('#act-index');
const actName = document.querySelector('#act-name');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
    stencil: false
  });
} catch (error) {
  showFallback('This experience needs WebGL. Try a modern browser with hardware acceleration enabled.');
  throw error;
}

if (!renderer.getContext()) {
  showFallback('This experience needs WebGL. Try a modern browser with hardware acceleration enabled.');
  throw new Error('WebGL unavailable');
}

function showFallback(message) {
  fallback.hidden = false;
  const paragraph = fallback.querySelector('p');
  if (paragraph) paragraph.textContent = message;
  document.body.classList.add('no-webgl');
}

const isMobile = () => window.innerWidth < 760;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile() ? 1.45 : 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.72;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x160020, 0.014);

const camera = new THREE.PerspectiveCamera(isMobile() ? 47 : 40, window.innerWidth / window.innerHeight, 0.1, 120);
let baseCameraZ = isMobile() ? 14.2 : 10.6;
let baseCameraY = isMobile() ? 3.72 : 3.62;
const lookTarget = new THREE.Vector3(0, isMobile() ? 3.25 : 3.12, 0);
camera.position.set(0, baseCameraY + 0.15, baseCameraZ + 1.7);
camera.lookAt(lookTarget);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.12, 0.5, 1.18);
composer.addPass(bloom);
composer.addPass(new OutputPass());

await loadFonts();

function loadFonts() {
  if (!document.fonts) return Promise.resolve();
  return Promise.allSettled([
    document.fonts.load('900 262px Unbounded'),
    document.fonts.load('500 16px "Space Grotesk"'),
    document.fonts.ready
  ]);
}

let paletteIndex = 0;
let palette = PALETTES[0];
let paletteColors = [];

const world = createWorld(scene, renderer, palette);
const creatures = new CreatureManager(scene, palette);
const fx = new FX(scene, renderer);
const audio = new DivineAudio();

let currentMode = 'create';
let toastTimer = 0;
let shake = 0;
let elapsed = 0;
let intro = 0;
const introDuration = 1.15;
const pointer = new THREE.Vector2(0, 0);
const parallax = new THREE.Vector2(0, 0);
const parallaxSmooth = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const cursorWorld = new THREE.Vector3(0, 0, 0);
let cursorVisible = true;

function makePaletteColors(nextPalette) {
  return [
    new THREE.Color(0xffffff),
    new THREE.Color(nextPalette.accent),
    new THREE.Color(nextPalette.orbB),
    ...nextPalette.creature.map((color) => new THREE.Color(color))
  ];
}

function applyPalette(index, instant = false) {
  paletteIndex = ((index % PALETTES.length) + PALETTES.length) % PALETTES.length;
  palette = PALETTES[paletteIndex];
  paletteColors = makePaletteColors(palette);
  world.setPalette(palette, instant);
  creatures.setPalette(palette);
  fx.setPalette(palette);
  document.documentElement.style.setProperty('--accent', palette.cssAccent);
  document.documentElement.style.setProperty('--accent-2', palette.cssAccent2);
  if (actIndex) actIndex.textContent = `ACT ${['I', 'II', 'III', 'IV'][paletteIndex]}`;
  if (actName) actName.textContent = palette.name;
  setMode(currentMode, false);
}

function modeColor(mode) {
  if (mode === 'create') return palette.accent;
  if (mode === 'change') return palette.orbB;
  return 0xff7a3c;
}

function cssHex(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function setMode(mode, announce = false) {
  currentMode = mode;
  document.body.dataset.mode = mode;
  const [modeColorA, modeColorB] = mode === 'create'
    ? [palette.accent, palette.gem]
    : mode === 'change'
      ? [palette.orbB, palette.accent]
      : [0xff7a3c, 0xff3b7f];
  document.body.style.setProperty('--mode', cssHex(modeColorA));
  document.body.style.setProperty('--mode-2', cssHex(modeColorB));
  powerButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  fx.setCursorColor(modeColor(mode));
  if (announce) {
    hint.style.opacity = '0.38';
    window.setTimeout(() => { hint.style.opacity = ''; }, 180);
  }
}

function updateLives(animate = true) {
  livesEl.textContent = String(creatures.count).padStart(2, '0');
  if (animate) {
    lifeStat.classList.remove('bump');
    void lifeStat.offsetWidth;
    lifeStat.classList.add('bump');
  }
}

function showToast(mode, sub = '') {
  const copy = MODE_COPY[mode] || MODE_COPY.create;
  toastKicker.textContent = copy.kicker;
  toastTitle.textContent = copy.title;
  toastSub.textContent = sub || copy.sub;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2100);
}

function fireFlash() {
  flash.style.setProperty('--fx', `${45 + Math.random() * 10}%`);
  flash.style.setProperty('--fy', `${42 + Math.random() * 12}%`);
  flash.classList.remove('fire');
  void flash.offsetWidth;
  flash.classList.add('fire');
}

function firePrism() {
  prism.classList.remove('fire');
  void prism.offsetWidth;
  prism.classList.add('fire');
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  if (event.pointerType === 'mouse') {
    parallax.set(pointer.x, pointer.y);
  } else {
    parallax.set(0, 0);
  }
  updateCursor();
}

function updateCursor() {
  raycaster.setFromCamera(pointer, camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(floorPlane, hit)) {
    const radius = Math.hypot(hit.x, hit.z);
    const maxRadius = 6.4;
    if (radius > maxRadius) {
      hit.x *= maxRadius / radius;
      hit.z *= maxRadius / radius;
    }
    cursorWorld.set(hit.x, 0, hit.z);
    fx.cursor.setPosition(cursorWorld);
    fx.cursor.setVisible(cursorVisible);
  }
}

function cast(mode, point = cursorWorld) {
  const color = modeColor(mode);

  if (mode === 'create') {
    const creature = creatures.createAt(point);
    if (!creature) {
      showToast('create', 'the world is full — destroy something');
      return;
    }
    const origin = new THREE.Vector3(point.x, 0.95, point.z);
    fx.particles.spawnBurst(origin, paletteColors, 130, {
      speed: 3.1, spread: 1, life: 1.25, size: 0.17, gravity: -1.3, drag: 0.93
    });
    fx.hearts.spawn(origin, [palette.accent, palette.orbB, ...palette.creature], 7);
    fx.shockwaves.ring(point, color, { maxScale: 3.4, life: 0.8 });
    fx.shockwaves.ring(point, palette.orbB, { maxScale: 2.3, life: 0.65, delay: 0.08 });
    showToast('create', 'life blooms at your touch');
    updateLives();
    audio.cast('create');
    return;
  }

  if (mode === 'change') {
    applyPalette(paletteIndex + 1);
    creatures.change(palette);
    const origin = new THREE.Vector3(0, 2.3, 0);
    fx.particles.spawnBurst(origin, paletteColors, 190, {
      speed: 4.2, spread: 1, life: 1.6, size: 0.16, gravity: -0.6, drag: 0.955, upBias: 0.1
    });
    fx.particles.spawnBurst(new THREE.Vector3(point.x, 0.7, point.z), paletteColors, 80, {
      speed: 2.2, spread: 1, life: 1.0, size: 0.14, gravity: -1, drag: 0.92
    });
    fx.shockwaves.ring(point, color, { maxScale: 7.6, life: 1.05 });
    fx.shockwaves.ring(point, palette.accent, { maxScale: 4.8, life: 0.9, vertical: true, delay: 0.06 });
    fx.shockwaves.sphere(point, palette.orbB, { maxScale: 3.6, life: 0.75, opacity: 0.42 });
    firePrism();
    showToast('change', `reality ${palette.name.toLowerCase()} — rewritten`);
    audio.cast('change');
    return;
  }

  const destroyed = creatures.destroyNear(point, 2.55);
  destroyed.forEach(({ position, color: shardColor, scale }) => {
    fx.shards.spawn(position, shardColor, 16, Math.max(0.7, scale));
    fx.particles.spawnBurst(position, [shardColor, new THREE.Color(0xffffff), new THREE.Color(palette.accent)], 64, {
      speed: 3.3, spread: 1, life: 1.0, size: 0.15, gravity: -3.2, drag: 0.94
    });
    fx.hearts.spawn(position, [shardColor], 2);
  });

  const origin = new THREE.Vector3(point.x, 0.5, point.z);
  fx.particles.spawnBurst(origin, [new THREE.Color(palette.accent), new THREE.Color(0xffffff), new THREE.Color(palette.crown)], 180, {
    speed: 5.2, spread: 1, life: 1.1, size: 0.18, gravity: -2.1, drag: 0.94, upBias: 0.3
  });
  fx.shockwaves.ring(point, 0xff7a3c, { maxScale: 7.8, life: 0.95 });
  fx.shockwaves.ring(point, 0xff3b7f, { maxScale: 4.8, life: 0.68, delay: 0.05 });
  fx.shockwaves.sphere(point, 0xff3b7f, { maxScale: 4.6, life: 0.65, opacity: 0.45 });
  shake = 1;
  fireFlash();
  showToast('destroy', destroyed.length ? `${destroyed.length} ${destroyed.length === 1 ? 'life' : 'lives'} unmade` : 'the void answers');
  updateLives();
  audio.cast('destroy');
}

function resetWorld() {
  creatures.reset();
  applyPalette(0, true);
  setMode('create');
  updateLives();
  shake = 0.35;
  firePrism();
  showToast(currentMode, 'genesis restored');
  audio.ping(392, 0.7, 0.035, 'sine');
  audio.ping(587.33, 0.8, 0.03, 'sine', 0.08);
}

function updateCamera(dt, t) {
  intro = Math.min(1, intro + dt / introDuration);
  const ease = 1 - Math.pow(1 - intro, 3);
  const introOffset = (1 - ease) * 1.7;
  const parallaxStrength = reduceMotion ? 0 : 1;
  const smooth = 1 - Math.exp(-dt * 3.2);
  parallaxSmooth.lerp(parallax, smooth * parallaxStrength);

  shake = Math.max(0, shake - dt * 2.1);
  const shakePower = shake * shake * (reduceMotion ? 0.15 : 1);

  camera.position.x = parallaxSmooth.x * 0.52 + (Math.random() - 0.5) * 0.18 * shakePower;
  camera.position.y = baseCameraY + parallaxSmooth.y * 0.24 + (Math.random() - 0.5) * 0.12 * shakePower;
  camera.position.z = baseCameraZ + introOffset;
  lookTarget.set(
    parallaxSmooth.x * 0.16,
    (isMobile() ? 3.25 : 3.12) + parallaxSmooth.y * 0.06 + (Math.random() - 0.5) * 0.1 * shakePower,
    0
  );
  camera.lookAt(lookTarget);
  camera.rotation.z += Math.sin(t * 0.27) * (reduceMotion ? 0 : 0.0025) + (Math.random() - 0.5) * 0.018 * shakePower;
}

function resize() {
  const mobile = isMobile();
  baseCameraZ = mobile ? 14.2 : 10.6;
  baseCameraY = mobile ? 3.72 : 3.62;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = mobile ? 47 : 40;
  camera.updateProjectionMatrix();
  const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.45 : 1.7);
  renderer.setPixelRatio(ratio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  fx.setPixelRatio(renderer.getPixelRatio());
  updateCursor();
}

function handlePointerMove(event) {
  updatePointer(event);
  cursorVisible = true;
  fx.cursor.setVisible(true);
}

function handlePointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  updatePointer(event);
  cursorVisible = true;
  fx.cursor.setVisible(true);
  cast(currentMode);
}

canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointerenter', () => {
  cursorVisible = true;
  fx.cursor.setVisible(true);
});
canvas.addEventListener('pointerleave', () => {
  if (!('ontouchstart' in window)) {
    cursorVisible = false;
    fx.cursor.setVisible(false);
  }
});
window.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'mouse' && event.target !== canvas) {
    parallax.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -((event.clientY / window.innerHeight) * 2 - 1)
    );
  }
});
window.addEventListener('blur', () => {
  cursorVisible = false;
  fx.cursor.setVisible(false);
});

powerButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    setMode(button.dataset.mode, true);
    audio.ping(button.dataset.mode === 'destroy' ? 196 : button.dataset.mode === 'change' ? 587.33 : 783.99, 0.22, 0.022, 'sine');
  });
});

soundButton.addEventListener('click', async (event) => {
  event.stopPropagation();
  const enabled = await audio.toggle();
  soundButton.setAttribute('aria-pressed', String(enabled));
  soundButton.setAttribute('aria-label', enabled ? 'Turn sound off' : 'Turn sound on');
  if (enabled) {
    audio.ping(659.25, 0.35, 0.03, 'sine');
    audio.ping(987.77, 0.4, 0.025, 'sine', 0.06);
  }
});

resetButton.addEventListener('click', (event) => {
  event.stopPropagation();
  resetWorld();
});

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.code === 'Digit1' || event.code === 'Numpad1') setMode('create', true);
  else if (event.code === 'Digit2' || event.code === 'Numpad2') setMode('change', true);
  else if (event.code === 'Digit3' || event.code === 'Numpad3') setMode('destroy', true);
  else if (event.code === 'Space') {
    event.preventDefault();
    cast(currentMode);
  } else if (event.code === 'KeyR') {
    resetWorld();
  } else if (event.code === 'KeyM') {
    soundButton.click();
  }
});

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  showFallback('The divine link was interrupted. Reload to summon her again.');
});

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => window.setTimeout(resize, 120));

applyPalette(0, true);
creatures.seed();
updateLives(false);
setMode('create');
fx.cursor.setPosition(new THREE.Vector3(0, 0, 0));
fx.cursor.setVisible(true);
resize();
updateCursor();

let lastFrame = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  elapsed += dt;
  updateCamera(dt, elapsed);
  world.update(elapsed, dt);
  creatures.update(dt, elapsed, camera);
  fx.update(dt, elapsed);
  bloom.strength = 0.12 + Math.sin(elapsed * 0.85) * 0.012;
  composer.render();
});

document.body.classList.add('ready');

window.__OMNI__ = {
  cast,
  setMode,
  reset: resetWorld,
  applyPalette,
  palettes: PALETTES,
  world,
  creatures,
  fx,
  renderer,
  bloom,
  composer,
  get paletteIndex() { return paletteIndex; },
  get palette() { return palette; }
};
