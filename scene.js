/* IRONBLOOM — scene loop, people placement, particles, canvas interaction. */
'use strict';

const sceneCanvas = document.getElementById('scene');
const sceneCtx = sceneCanvas ? sceneCanvas.getContext('2d') : null;
const bgCanvas = document.createElement('canvas');
bgCanvas.width = DESIGN_W * 2;
bgCanvas.height = DESIGN_H * 2;
const bgCtx = bgCanvas.getContext('2d');

let sceneW = 0;
let sceneH = 0;
let sceneDpr = 1;
let sceneScale = 1;
let sceneOx = 0;
let sceneOy = 0;
let bgDirty = true;
let hoverClientId = null;
let sceneHitboxes = [];
let lastSceneTime = performance.now();
let sceneReady = false;

const STATIONS = {
  strength: [
    { x: 692, y: 704, scale: 1.0, pose: 'lift', facing: 1 },
    { x: 790, y: 738, scale: 0.94, pose: 'lift', facing: -1 },
    { x: 612, y: 742, scale: 0.9, pose: 'lift', facing: 1 }
  ],
  cardio: [
    { x: 960, y: 704, scale: 1.0, pose: 'run', facing: 1 },
    { x: 1048, y: 738, scale: 0.94, pose: 'run', facing: -1 },
    { x: 890, y: 742, scale: 0.9, pose: 'run', facing: 1 }
  ],
  mobility: [
    { x: 508, y: 722, scale: 1.0, pose: 'stretch', facing: 1 },
    { x: 410, y: 744, scale: 0.94, pose: 'stretch', facing: -1 },
    { x: 592, y: 746, scale: 0.9, pose: 'stretch', facing: 1 }
  ]
};

function rebuildBackground() {
  bgCtx.setTransform(1, 0, 0, 1, 0, 0);
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  bgCtx.save();
  bgCtx.scale(2, 2);
  drawGymBackground(bgCtx);
  bgCtx.restore();
  bgDirty = false;
}

function resizeScene() {
  if (!sceneCanvas) return;
  const panel = document.getElementById('stagePanel');
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  sceneW = rect.width;
  sceneH = rect.height;
  sceneDpr = Math.min(window.devicePixelRatio || 1, 2);
  sceneCanvas.width = Math.round(sceneW * sceneDpr);
  sceneCanvas.height = Math.round(sceneH * sceneDpr);
  sceneScale = Math.max(sceneW / DESIGN_W, sceneH / DESIGN_H);
  sceneOx = (sceneW - DESIGN_W * sceneScale) / 2;
  sceneOy = (sceneH - DESIGN_H * sceneScale) / 2;
  sceneReady = true;
  bgDirty = true;
}

function sceneSqueezeX() {
  if (!sceneW || !sceneH || !sceneScale) return 1;
  // Keep the cast inside the visible crop when the stage is tall and narrow.
  const visibleDesignWidth = sceneW / sceneScale;
  return clamp(visibleDesignWidth / DESIGN_W, 0.6, 1);
}

function getScenePeople() {
  const counts = { strength: 0, cardio: 0, mobility: 0 };
  const people = [];
  const squeeze = sceneSqueezeX();
  const safeX = x => DESIGN_W / 2 + (x - DESIGN_W / 2) * squeeze;
  state.clients.forEach(client => {
    const slots = STATIONS[client.goal] || STATIONS.strength;
    const slot = slots[Math.min(counts[client.goal] || 0, slots.length - 1)];
    counts[client.goal] = (counts[client.goal] || 0) + 1;
    people.push({
      type: 'client',
      client,
      x: safeX(slot.x),
      y: slot.y,
      scale: slot.scale,
      pose: slot.pose,
      facing: slot.facing
    });
  });
  people.push({
    type: 'hero',
    x: safeX(246),
    y: 664,
    scale: 1.12,
    pose: 'coach',
    facing: 1,
    palette: MIA_PALETTE,
    hair: 'bun',
    accessory: 'headband',
    seed: 0.6
  });
  if (state.staff.coach) {
    people.push({
      type: 'staff',
      label: 'COACH KOFI',
      x: safeX(340),
      y: 696,
      scale: 0.9,
      pose: 'coach',
      facing: -1,
      palette: { skin: '#6e3f2a', hair: '#17110f', shirt: '#ffc857', pants: '#315a70', shoe: '#fffaf0', accent: '#ff6b57' },
      hair: 'short',
      accessory: 'whistle',
      seed: 2.7
    });
  }
  if (state.staff.cleaner) {
    people.push({
      type: 'staff',
      label: 'AUNTIE BEA',
      x: safeX(112),
      y: 722,
      scale: 0.8,
      pose: 'idle',
      facing: 1,
      palette: { skin: '#d98e69', hair: '#2b1b18', shirt: '#b9a7e8', pants: '#3c6c63', shoe: '#fffaf0', accent: '#ffc857' },
      hair: 'bob',
      accessory: 'glasses',
      seed: 5.2,
      broom: true
    });
  }
  return people.sort((a, b) => a.y - b.y);
}

function drawTag(g, x, y, text, accent, scale = 1, hover = false, sub = '') {
  g.save();
  g.translate(x, y);
  if (hover) g.scale(1.07, 1.07);
  g.font = '900 10px Lato, sans-serif';
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  const tw = Math.max(g.measureText(text).width, sub ? g.measureText(sub).width : 0);
  const w = Math.min(170, tw + 28);
  const h = sub ? 31 : 22;
  rr(g, -w / 2, -h / 2, w, h, h / 2);
  fillStroke(g, CREAM, INK, 1.8);
  dot(g, -w / 2 + 10, sub ? -4 : 0, 3.3, accent, INK, 1);
  g.fillStyle = INK;
  g.font = '900 10px Lato, sans-serif';
  g.fillText(text, -w / 2 + 18, sub ? -5 : 0);
  if (sub) {
    g.fillStyle = 'rgba(23,63,53,.65)';
    g.font = '800 6.5px Lato, sans-serif';
    g.fillText(sub, -w / 2 + 18, 7);
  }
  // pointer
  g.beginPath();
  g.moveTo(-4, h / 2 - 1);
  g.lineTo(0, h / 2 + 6);
  g.lineTo(4, h / 2 - 1);
  g.closePath();
  g.fillStyle = CREAM;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.stroke();
  g.restore();
}

function drawHoverRing(g, p, time) {
  const pulse = 1 + Math.sin(time * 0.006) * 0.04;
  g.save();
  g.translate(p.x, p.y + 1);
  g.scale(1, 0.3);
  g.beginPath();
  g.arc(0, 0, 30 * pulse, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(255,200,87,.9)';
  g.lineWidth = 4;
  g.setLineDash([6, 6]);
  g.stroke();
  g.setLineDash([]);
  g.restore();
}

function drawAmbient(g, time) {
  const t = time * 0.001;
  g.save();
  for (let i = 0; i < 18; i++) {
    const baseX = (i * 173 + 40) % DESIGN_W;
    const baseY = 120 + ((i * 97) % 520);
    const x = baseX + Math.sin(t * 0.35 + i) * 16;
    const y = baseY + Math.cos(t * 0.27 + i * 1.7) * 13;
    g.globalAlpha = 0.12 + (i % 3) * 0.05;
    dot(g, x, y, 1.3 + (i % 2) * 0.8, '#fff7d8');
  }
  g.globalAlpha = 1;
  if (state.upgrades.sound) {
    g.fillStyle = 'rgba(255,248,233,.55)';
    g.font = '900 15px Lato, sans-serif';
    g.fillText('♪', 404 + Math.sin(t * 0.8) * 9, 137 + Math.cos(t * 0.7) * 7);
    g.fillText('♫', 742 + Math.cos(t * 0.65) * 8, 156 + Math.sin(t * 0.9) * 8);
  }
  g.restore();
}

function drawScene(time) {
  if (!sceneCtx || !sceneReady || !sceneW || !sceneH) return;
  sceneCtx.setTransform(sceneDpr, 0, 0, sceneDpr, 0, 0);
  sceneCtx.clearRect(0, 0, sceneW, sceneH);
  sceneCtx.save();
  sceneCtx.setTransform(sceneDpr * sceneScale, 0, 0, sceneDpr * sceneScale, sceneDpr * sceneOx, sceneDpr * sceneOy);
  if (bgDirty) rebuildBackground();
  sceneCtx.drawImage(bgCanvas, 0, 0, DESIGN_W, DESIGN_H);
  drawAmbient(sceneCtx, time);

  const people = getScenePeople();
  const hitboxes = [];
  people.forEach(p => {
    if (p.type === 'client' && hoverClientId === p.client.id) drawHoverRing(sceneCtx, p, time);
    const person = p.type === 'client' ? p.client : p;
    drawPerson(sceneCtx, person, p.x, p.y, p.scale, p.pose, time, p.facing, p.type === 'hero');
    if (p.type === 'client') {
      hitboxes.push({
        id: p.client.id,
        x: p.x - 33,
        y: p.y - 134 * p.scale,
        w: 66,
        h: 140 * p.scale
      });
    }
    if (p.type === 'staff' && p.broom) {
      // Broom for Auntie Bea.
      sceneCtx.save();
      sceneCtx.translate(p.x + 26, p.y - 50);
      sceneCtx.rotate(0.08);
      line(sceneCtx, 0, 0, 0, 70, '#9a6b3f', 3);
      sceneCtx.beginPath();
      sceneCtx.moveTo(-7, 68);
      sceneCtx.lineTo(7, 68);
      sceneCtx.lineTo(13, 86);
      sceneCtx.lineTo(-13, 86);
      sceneCtx.closePath();
      fillStroke(sceneCtx, SUN, INK, 2);
      sceneCtx.restore();
    }
  });
  sceneHitboxes = hitboxes;

  people.forEach(p => {
    if (p.type === 'client') {
      const client = p.client;
      drawTag(sceneCtx, p.x, p.y - 142 * p.scale, client.name, client.palette.accent, p.scale, hoverClientId === client.id, GOALS[client.goal].label);
    } else if (p.type === 'hero') {
      drawTag(sceneCtx, p.x, p.y - 158 * p.scale, 'MIA · 12', CORAL, 1.03, false, 'BOSS / COACH');
    } else if (p.type === 'staff' && p.label) {
      drawTag(sceneCtx, p.x, p.y - 138 * p.scale, p.label, p.palette.accent, 0.86, false);
    }
  });

  drawParticles(sceneCtx);
  sceneCtx.restore();
}

/* ------------------------------------------------------------
   Particles
   ------------------------------------------------------------ */
let particles = [];

function spawnBurst(x, y, colors = [SUN, CORAL, MINT, LILAC], count = 34) {
  for (let i = 0; i < count; i++) {
    const angle = rand(-Math.PI * 0.92, -Math.PI * 0.08);
    const speed = rand(80, 260);
    particles.push({
      type: 'confetti',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: rand(280, 480),
      rot: rand(0, Math.PI * 2),
      vr: rand(-7, 7),
      w: rand(3, 7),
      h: rand(5, 11),
      color: pick(colors),
      life: rand(0.9, 1.7),
      maxLife: 1.7
    });
  }
}

function spawnFloat(x, y, text, color = TEAL) {
  particles.push({
    type: 'text',
    x,
    y,
    vx: rand(-8, 8),
    vy: -52,
    gravity: 0,
    text,
    color,
    life: 1.45,
    maxLife: 1.45
  });
}

function updateParticles(dt) {
  if (!particles.length) return;
  particles.forEach(p => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.gravity || 0) * dt;
    p.vx *= 0.992;
    if (p.type === 'confetti') p.rot += p.vr * dt;
  });
  particles = particles.filter(p => p.life > 0);
}

function drawParticles(g) {
  if (!particles.length) return;
  g.save();
  particles.forEach(p => {
    const alpha = clamp(p.life / Math.min(0.35, p.maxLife), 0, 1);
    g.globalAlpha = alpha;
    if (p.type === 'confetti') {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      g.restore();
    } else {
      g.font = '900 15px Lato, sans-serif';
      g.textAlign = 'center';
      g.lineWidth = 4;
      g.strokeStyle = CREAM;
      g.strokeText(p.text, p.x, p.y);
      g.fillStyle = p.color;
      g.fillText(p.text, p.x, p.y);
    }
  });
  g.restore();
}

/* ------------------------------------------------------------
   Interaction
   ------------------------------------------------------------ */
function designPointFromEvent(event) {
  if (!sceneCanvas) return { x: -1, y: -1 };
  const rect = sceneCanvas.getBoundingClientRect();
  const scale = Math.max(rect.width / DESIGN_W, rect.height / DESIGN_H);
  const ox = (rect.width - DESIGN_W * scale) / 2;
  const oy = (rect.height - DESIGN_H * scale) / 2;
  return {
    x: (event.clientX - rect.left - ox) / scale,
    y: (event.clientY - rect.top - oy) / scale
  };
}

function hitClientAt(x, y) {
  for (let i = sceneHitboxes.length - 1; i >= 0; i--) {
    const b = sceneHitboxes[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  }
  return null;
}

function bindSceneInteraction() {
  if (!sceneCanvas) return;
  sceneCanvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const p = designPointFromEvent(event);
    const id = hitClientAt(p.x, p.y);
    if (id !== hoverClientId) {
      hoverClientId = id;
      sceneCanvas.style.cursor = id ? 'pointer' : 'default';
    }
  });
  sceneCanvas.addEventListener('pointerleave', () => {
    hoverClientId = null;
    sceneCanvas.style.cursor = 'default';
  });
  sceneCanvas.addEventListener('click', event => {
    const p = designPointFromEvent(event);
    const id = hitClientAt(p.x, p.y);
    if (id && typeof openTrainingSetup === 'function') {
      openTrainingSetup(id);
    }
  });
}

function sceneFrame(now) {
  const dt = Math.min(0.05, (now - lastSceneTime) / 1000);
  lastSceneTime = now;
  const app = document.getElementById('app');
  if (app && !app.classList.contains('hidden')) {
    drawScene(now);
    if (typeof updateTrainingMeter === 'function') updateTrainingMeter(now);
  }
  updateParticles(dt);
  requestAnimationFrame(sceneFrame);
}

if (sceneCanvas) {
  resizeScene();
  bindSceneInteraction();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resizeScene).observe(document.getElementById('stagePanel'));
  }
  window.addEventListener('resize', resizeScene);
  requestAnimationFrame(sceneFrame);
}
