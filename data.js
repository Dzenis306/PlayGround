/* IRONBLOOM — data, helpers, save state, audio. */
'use strict';

const DESIGN_W = 1180;
const DESIGN_H = 760;
const MAX_DAY = 10;
const BASE_ACTIONS = 7;
const SAVE_KEY = 'ironbloom-save-v1';
const STAR_THRESHOLDS = [0, 45, 110, 190, 290];
const INK = '#173f35';
const INK_2 = '#0f2d26';
const CREAM = '#fff8e9';
const CORAL = '#ff6b57';
const SUN = '#ffc857';
const MINT = '#8bd6b8';
const MINT_2 = '#53b393';
const TEAL = '#2a7f6d';
const LILAC = '#b9a7e8';

const GOALS = {
  strength: {
    label: 'Get stronger',
    focus: 'Strength',
    icon: 'dumbbell',
    color: CORAL,
    quotes: [
      'I want to carry all the groceries in one trip.',
      'My goal is one clean pull-up. Just one.',
      'I signed up because my little brother thinks he is stronger than me.',
      'I want to feel like I could lift a couch. In a good way.'
    ]
  },
  cardio: {
    label: 'Run a 5K',
    focus: 'Cardio',
    icon: 'heart',
    color: '#ff8a5b',
    quotes: [
      'I want to run the block without negotiating with my lungs.',
      'The 5K is in three weeks. I am choosing optimism.',
      'I keep saying I will start tomorrow. Today is tomorrow.',
      'I want to be the person who takes the stairs.'
    ]
  },
  mobility: {
    label: 'Move better',
    focus: 'Mobility',
    icon: 'stretch',
    color: MINT_2,
    quotes: [
      'I want to touch my toes without making a sound.',
      'My back cracks like a glow stick. I would like that to stop.',
      'I sit at a desk all day. My hips have filed a complaint.',
      'I want to get off the floor without using the coffee table.'
    ]
  }
};

const FOCUSES = [
  { id: 'strength', label: 'Strength', icon: 'dumbbell', blurb: 'Slow. Heavy. Honest.' },
  { id: 'cardio', label: 'Cardio', icon: 'heart', blurb: 'Breathe. Move. Repeat.' },
  { id: 'mobility', label: 'Mobility', icon: 'stretch', blurb: 'Longer. Smoother. Free.' }
];

const INTENSITIES = {
  steady: {
    id: 'steady',
    name: 'Steady',
    pay: 1.05,
    width: 0.30,
    speed: 0.86,
    fatigue: 7,
    desc: 'Wide form window. Easy on the joints.',
    mult: '×1.05'
  },
  focused: {
    id: 'focused',
    name: 'Focused',
    pay: 1.35,
    width: 0.23,
    speed: 1,
    fatigue: 10,
    desc: 'The sweet spot. Clean reps, fair pay.',
    mult: '×1.35'
  },
  strict: {
    id: 'strict',
    name: 'Strict',
    pay: 1.75,
    width: 0.165,
    speed: 1.22,
    fatigue: 14,
    desc: 'Narrow window. Big reward. No sloppy reps.',
    mult: '×1.75'
  }
};

const UPGRADES = [
  {
    id: 'sound',
    name: 'Big Sound',
    tag: 'VIBES',
    icon: 'speaker',
    cost: 140,
    desc: '+5% session pay. The bass makes everyone stand a little taller.'
  },
  {
    id: 'cardio',
    name: 'Cardio Deck',
    tag: 'EQUIPMENT',
    icon: 'heart',
    cost: 190,
    desc: '+15% pay for cardio clients. Adds a second machine to the floor.'
  },
  {
    id: 'recovery',
    name: 'Recovery Nook',
    tag: 'CARE',
    icon: 'leaf',
    cost: 240,
    desc: '+8 client satisfaction every session. Foam rollers and good plants.'
  },
  {
    id: 'smoothie',
    name: 'Smoothie Bar',
    tag: 'PERKS',
    icon: 'cup',
    cost: 280,
    desc: '+$8 per client and +1 reputation. Berry protein blast, on the house.'
  },
  {
    id: 'floor',
    name: 'Bigger Floor',
    tag: 'EXPAND',
    icon: 'expand',
    cost: 420,
    desc: '+1 client each day. The garage becomes a real gym.'
  },
  {
    id: 'coach',
    name: 'Coach Kofi',
    tag: 'STAFF · $25/DAY',
    icon: 'whistle',
    cost: 200,
    desc: '+1 action point every day. A second pair of eyes on every rep.'
  },
  {
    id: 'cleaner',
    name: 'Auntie Bea',
    tag: 'STAFF · $15/DAY',
    icon: 'broom',
    cost: 150,
    desc: 'Gym stays cleaner overnight. +11 cleanliness every morning.'
  }
];

const NAME_POOL = [
  'Auntie June', 'Dev', 'Priya', 'Marco', 'Tasha', 'Mr. Okafor',
  'Lina', 'Sam', 'Bea', 'Jules', 'Ravi', 'Noor', 'Mo', 'Frankie',
  'Kit', 'Talia', 'Benji', 'Rosa', 'Ash', 'Nia', 'Dre', 'Mina'
];

const PALETTES = [
  { skin: '#c87b58', hair: '#3a2522', shirt: '#ff6b57', pants: '#2f8e7a', shoe: '#fffaf0', accent: '#ffc857' },
  { skin: '#8f5438', hair: '#211815', shirt: '#53b393', pants: '#315a70', shoe: '#ffe3b3', accent: '#ffc857' },
  { skin: '#e0a077', hair: '#6b3f2b', shirt: '#b9a7e8', pants: '#3f5b54', shoe: '#fffaf0', accent: '#ff6b57' },
  { skin: '#f0b48c', hair: '#c86d3d', shirt: '#ffc857', pants: '#7a5b9e', shoe: '#173f35', accent: '#53b393' },
  { skin: '#6e3f2a', hair: '#17110f', shirt: '#ff8a5b', pants: '#1f6d60', shoe: '#fffaf0', accent: '#b9a7e8' },
  { skin: '#b96f4d', hair: '#4b2c23', shirt: '#7fc9c2', pants: '#364f66', shoe: '#ffc857', accent: '#ff6b57' },
  { skin: '#d98e69', hair: '#2b1b18', shirt: '#e5d7ff', pants: '#255c54', shoe: '#fffaf0', accent: '#ff8a5b' },
  { skin: '#a86242', hair: '#563322', shirt: '#ffb3a4', pants: '#3c6c63', shoe: '#f3e4c7', accent: '#ffc857' },
  { skin: '#f3c6a5', hair: '#e0b36b', shirt: '#6fa8dc', pants: '#315a70', shoe: '#fffaf0', accent: '#ff6b57' },
  { skin: '#7f4a33', hair: '#2a1b16', shirt: '#8bd6b8', pants: '#9a6b3f', shoe: '#fffaf0', accent: '#ffc857' }
];

const HAIRS = ['bun', 'curly', 'bob', 'short', 'pony', 'locs', 'cap', 'wave'];
const ACCESSORIES = ['none', 'none', 'glasses', 'headphones', 'headband', 'earring'];

const TRAITS = {
  nervous: { label: 'Nervous', blurb: 'Misses sting a little less.' },
  showoff: { label: 'Show-off', blurb: 'Perfect reps pay a bonus.' },
  regular: { label: 'Regular', blurb: 'Always tips 10%.' },
  strict: { label: 'Strict-only', blurb: 'Wants the hard set.' }
};

const MIA_PALETTE = {
  skin: '#c87b58', hair: '#3a2522', shirt: '#ff6b57', pants: '#2f8e7a',
  shoe: '#fffaf0', accent: '#ffc857'
};

/* ------------------------------------------------------------
   Tiny inline icon set
   ------------------------------------------------------------ */
const ICONS = {
  logo: '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4c2.8 0 5 2.3 5 5.1 0 3.2-2.4 5.7-5 8.2-2.6-2.5-5-5-5-8.2C11 6.3 13.2 4 16 4Z"/><path d="M16 15c2.8 0 5 2.3 5 5.1 0 3.2-2.4 5.7-5 8.2-2.6-2.5-5-5-5-8.2 0-2.8 2.2-5.1 5-5.1Z"/><path d="M6.2 13.6c2.1-1.8 5-1.7 6.9.2 2.2 2.2 2.9 5.4 3.6 8.8-3.5-.1-6.8-.4-9.2-2.5-2-1.9-2.2-4.8-1.3-6.5Z"/><path d="M25.8 13.6c-2.1-1.8-5-1.7-6.9.2-2.2 2.2-2.9 5.4-3.6 8.8 3.5-.1 6.8-.4 9.2-2.5 2-1.9 2.2-4.8 1.3-6.5Z"/></g></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z"/></svg>',
  grow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V5M16 20v-7M22 20H2M16 5l3-3 3 3M19 2v7"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h3l4 3V7l-4 3H4ZM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 6.5a4.5 4.5 0 0 0-6.1 5.9L3 17.8 6.2 21l5.4-5.4a4.5 4.5 0 0 0 5.9-6.1l-2.8 2.8-2.1-.7-.7-2.1 2.6-3Z"/></svg>',
  broom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 4 6 6M16 6 8 14M6 12l6 6M6 12c-2 2-3 5-2 9 4 1 7 0 9-2l-7-7ZM4 21l-2 1"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4l12 5V5L4 10ZM16 8a4 4 0 0 1 0 8M6 14v4a2 2 0 0 0 4 0v-2"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-8a5.2 5.2 0 0 0 0-7.4Z"/></svg>',
  stretch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="2.2"/><path d="m12 7 1 5 4 2M12 9 7 7M13 12l-4 4-3 1M13 12l3 4 3 3M9 20l-1 2M16 20l1 2"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9L12 2.8Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>',
  cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.7"/><path d="M6 9h.01M18 15h.01"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 5.5a3 3 0 0 1 0 5.7M17 14c2.5.4 4 2.5 4 6"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4.5 13H11l-1 9 9-12h-6.5L13 2Z"/></svg>',
  cup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h13l-1.5 12h-10L5 7ZM8 7V4h7v3M17 10h2a3 3 0 0 1 0 6h-1M9 11l1 4M13 11l-1 4"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M9 12h6M12 9v6"/></svg>',
  whistle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 8h6a2 2 0 0 1 2 2v2a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5v-1H5a3 3 0 0 1 0-6h6M14 8v7M19 12h.01"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 4c-8 0-14 4-14 11 0 2 .7 3.6 2 5C15 20 20 14 20 4ZM4 21c2-6 5-9 11-11"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><circle cx="12" cy="15" r="3.2"/><circle cx="12" cy="7" r="1.4"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H3v2a4 4 0 0 0 4 4M17 6h4v2a4 4 0 0 1-4 4M12 14v4M8 21h8M9 18h6"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M18.5 9A7.5 7.5 0 0 0 5.6 6.4L4 8M5.5 15A7.5 7.5 0 0 0 18.4 17.6L20 16"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.5h6V4M8 9h8M8 13h8M8 17h5"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l10-2v13M9 9l10-2"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>'
};

function icon(name, extra = '') {
  const svg = ICONS[name] || ICONS.spark;
  if (!extra) return svg;
  return svg.replace('<svg ', `<svg class="${extra}" `);
}

function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    if (el.dataset.iconDone === '1') return;
    const name = el.dataset.icon;
    if (ICONS[name]) {
      el.innerHTML = icon(name);
      el.dataset.iconDone = '1';
    }
  });
}

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const money = n => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
const esc = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function starLevel(rep) {
  let level = 1;
  for (let i = 1; i < STAR_THRESHOLDS.length; i++) {
    if (rep >= STAR_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(5, level);
}

function nextStarAt(rep) {
  const level = starLevel(rep);
  return level >= 5 ? null : STAR_THRESHOLDS[level];
}

function starProgress(rep) {
  const level = starLevel(rep);
  if (level >= 5) return 1;
  const floor = STAR_THRESHOLDS[level - 1];
  const next = STAR_THRESHOLDS[level];
  return clamp((rep - floor) / (next - floor), 0, 1);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function defaultState() {
  return {
    version: 1,
    started: false,
    final: false,
    day: 1,
    cash: 220,
    rep: 0,
    time: BASE_ACTIONS,
    timeMax: BASE_ACTIONS,
    cleanliness: 86,
    equipment: 92,
    upgrades: { sound: false, cardio: false, recovery: false, smoothie: false, floor: false },
    staff: { coach: false, cleaner: false },
    clients: [],
    trainedToday: 0,
    dayPerfect: 0,
    dayEarnings: 0,
    dayExpenses: 0,
    dayRep: 0,
    daySatSum: 0,
    daySatCount: 0,
    goalTarget: 3,
    goalReward: 25,
    totalSessions: 0,
    totalPerfect: 0,
    dayComplete: false,
    history: [],
    soundOn: true,
    seenHelp: false
  };
}

let state = defaultState();
let savedGame = null;
let clientSeq = 0;

/* ------------------------------------------------------------
   Audio
   ------------------------------------------------------------ */
let audioCtx = null;
let audioMaster = null;

function ensureAudio() {
  if (!state.soundOn) return null;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
      audioMaster = audioCtx.createGain();
      audioMaster.gain.value = 0.17;
      audioMaster.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(freq, duration = 0.1, type = 'sine', gain = 0.18, delay = 0) {
  if (!state.soundOn) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp);
  amp.connect(audioMaster);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function sfx(name) {
  if (!state.soundOn) return;
  switch (name) {
    case 'click':
      tone(520, 0.045, 'triangle', 0.12);
      break;
    case 'cash':
      tone(660, 0.09, 'triangle', 0.16);
      tone(880, 0.1, 'triangle', 0.14, 0.08);
      tone(1100, 0.14, 'triangle', 0.1, 0.16);
      break;
    case 'perfect':
      tone(880, 0.12, 'triangle', 0.15);
      tone(1174, 0.14, 'triangle', 0.12, 0.08);
      tone(1568, 0.2, 'sine', 0.1, 0.17);
      break;
    case 'good':
      tone(620, 0.1, 'triangle', 0.14);
      tone(780, 0.13, 'triangle', 0.1, 0.08);
      break;
    case 'miss':
      tone(220, 0.16, 'sawtooth', 0.09);
      tone(150, 0.22, 'sawtooth', 0.07, 0.08);
      break;
    case 'level':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.13, i * 0.11));
      break;
    case 'day':
      [392, 523, 659].forEach((f, i) => tone(f, 0.18, 'sine', 0.12, i * 0.1));
      break;
    case 'warn':
      tone(240, 0.16, 'square', 0.07);
      break;
    case 'buy':
      tone(520, 0.07, 'triangle', 0.13);
      tone(780, 0.1, 'triangle', 0.13, 0.07);
      tone(1040, 0.16, 'triangle', 0.1, 0.14);
      break;
    default:
      break;
  }
}

/* ------------------------------------------------------------
   Save / load
   ------------------------------------------------------------ */
function saveGame() {
  try {
    const copy = JSON.parse(JSON.stringify(state));
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
    savedGame = copy;
  } catch (err) {
    // Storage can be blocked in private mode. The game still plays.
  }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.started) return null;
    const base = defaultState();
    const merged = { ...base, ...parsed };
    merged.upgrades = { ...base.upgrades, ...(parsed.upgrades || {}) };
    merged.staff = { ...base.staff, ...(parsed.staff || {}) };
    merged.clients = Array.isArray(parsed.clients) ? parsed.clients : [];
    merged.history = Array.isArray(parsed.history) ? parsed.history : [];
    return merged;
  } catch {
    return null;
  }
}

function eraseSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
  savedGame = null;
}

/* ------------------------------------------------------------
   Client generation
   ------------------------------------------------------------ */
function makeClient(goal) {
  const palette = pick(PALETTES);
  const trait = pick(['nervous', 'showoff', 'regular', 'strict', 'regular', 'nervous']);
  const difficulty = rand(0.91, 1.12);
  const level = starLevel(state.rep);
  const basePay = randInt(30, 42) + Math.min(8, (level - 1) * 2);
  const hair = pick(HAIRS);
  const accessory = pick(ACCESSORIES);
  return {
    id: `c${Date.now().toString(36)}${clientSeq++}`,
    name: pick(NAME_POOL),
    goal,
    focus: GOALS[goal].focus,
    basePay,
    difficulty,
    trait,
    quote: pick(GOALS[goal].quotes),
    palette,
    hair,
    accessory,
    seed: Math.random() * 10
  };
}

function makeDayClients(count) {
  const goals = shuffle(['strength', 'cardio', 'mobility', 'strength', 'cardio', 'mobility']);
  const used = new Set();
  const out = [];
  for (let i = 0; i < count; i++) {
    let client = makeClient(goals[i % goals.length]);
    let guard = 0;
    while (used.has(client.name) && guard++ < 30) client.name = pick(NAME_POOL);
    used.add(client.name);
    out.push(client);
  }
  return out;
}

function addWalkIn() {
  const max = maxClients();
  if (state.clients.length >= max) return null;
  const used = new Set(state.clients.map(c => c.name));
  let client = makeClient(pick(['strength', 'cardio', 'mobility']));
  let guard = 0;
  while (used.has(client.name) && guard++ < 30) client.name = pick(NAME_POOL);
  state.clients.push(client);
  return client;
}

function maxClients() {
  return Math.min(5, 3 + (state.upgrades.floor ? 1 : 0) + (starLevel(state.rep) >= 3 ? 1 : 0));
}

/* ------------------------------------------------------------
   Avatar illustration
   ------------------------------------------------------------ */
function avatarSVG(client, size = 72) {
  const p = client.palette || MIA_PALETTE;
  const hair = client.hair || 'bun';
  const acc = client.accessory || 'none';
  const bg = p.accent || SUN;
  const skin = p.skin;
  const hairColor = p.hair;
  const shirt = p.shirt;
  const ink = INK;

  let hairBack = '';
  let hairFront = '';
  if (hair === 'bun') {
    hairBack = `<circle cx="50" cy="18" r="10" fill="${hairColor}" stroke="${ink}" stroke-width="2.2"/><path d="M28 43c0-18 9-29 22-29s22 11 22 29c-6-9-13-13-22-13s-16 4-22 13Z" fill="${hairColor}" stroke="${ink}" stroke-width="2.2"/>`;
    hairFront = `<path d="M30 37c4-10 11-15 20-15s16 5 20 15" fill="none" stroke="${hairColor}" stroke-width="7" stroke-linecap="round"/>`;
  } else if (hair === 'curly') {
    hairBack = `<g fill="${hairColor}" stroke="${ink}" stroke-width="2"><circle cx="30" cy="31" r="10"/><circle cx="41" cy="20" r="11"/><circle cx="58" cy="21" r="11"/><circle cx="70" cy="32" r="10"/><circle cx="26" cy="44" r="8"/><circle cx="74" cy="44" r="8"/><circle cx="36" cy="52" r="7"/><circle cx="64" cy="52" r="7"/></g>`;
  } else if (hair === 'bob') {
    hairBack = `<path d="M27 45c0-20 9-31 23-31s23 11 23 31v12c0 8-8 13-23 13s-23-5-23-13V45Z" fill="${hairColor}" stroke="${ink}" stroke-width="2.2"/><path d="M29 39c5-11 12-16 21-16s16 5 21 16" fill="none" stroke="${ink}" stroke-width="2" opacity=".2"/>`;
  } else if (hair === 'short') {
    hairBack = `<path d="M28 42c1-18 9-28 22-28s21 10 22 28c-6-9-13-13-22-13s-16 4-22 13Z" fill="${hairColor}" stroke="${ink}" stroke-width="2.2"/>`;
  } else if (hair === 'pony') {
    hairBack = `<circle cx="77" cy="43" r="11" fill="${hairColor}" stroke="${ink}" stroke-width="2.2"/><path d="M28 43c0-18 9-29 22-29s22 11 22 29c-6-9-13-13-22-13s-16 4-22 13Z" fill="${hairColor}" stroke="${ink}" stroke-width="2.2"/>`;
  } else if (hair === 'locs') {
    hairBack = `<g fill="${hairColor}" stroke="${ink}" stroke-width="2.2"><path d="M28 43c0-18 9-29 22-29s22 11 22 29c-6-9-13-13-22-13s-16 4-22 13Z"/><path d="M31 43v16M39 36v27M50 33v31M61 36v27M69 43v16" stroke-width="5" stroke-linecap="round"/></g>`;
  } else if (hair === 'cap') {
    hairBack = `<path d="M28 42c1-17 9-27 22-27s21 10 22 27H28Z" fill="${hairColor}" stroke="${ink}" stroke-width="2.2"/><path d="M28 40h47c8 0 10 9 1 11H29c-8 0-8-8-1-11Z" fill="${p.shirt}" stroke="${ink}" stroke-width="2.2"/><path d="M50 15v9" stroke="${ink}" stroke-width="2" opacity=".3"/>`;
  } else {
    hairBack = `<path d="M28 43c0-18 9-29 22-29s22 11 22 29c-6-9-13-13-22-13s-16 4-22 13Z" fill="${hairColor}" stroke="${ink}" stroke-width="2.2"/><path d="M30 33c9-11 21-13 37-3" fill="none" stroke="${ink}" stroke-width="2" opacity=".18"/>`;
  }

  let accessory = '';
  if (acc === 'glasses') {
    accessory = `<g fill="none" stroke="${ink}" stroke-width="2"><circle cx="41" cy="46" r="5.4"/><circle cx="59" cy="46" r="5.4"/><path d="M46.4 46h7.2M35.6 45l-5 1M64.4 45l5 1"/></g>`;
  } else if (acc === 'headphones') {
    accessory = `<g fill="none" stroke="${ink}" stroke-width="2.4"><path d="M29 40a21 21 0 0 1 42 0"/><rect x="25" y="40" width="8" height="13" rx="4" fill="${p.accent}"/><rect x="67" y="40" width="8" height="13" rx="4" fill="${p.accent}"/></g>`;
  } else if (acc === 'headband') {
    accessory = `<path d="M30 36c12 5 28 5 40 0" fill="none" stroke="${p.accent}" stroke-width="6" stroke-linecap="round"/><path d="M30 36c12 5 28 5 40 0" fill="none" stroke="${ink}" stroke-width="1.6"/>`;
  } else if (acc === 'earring') {
    accessory = `<circle cx="74" cy="54" r="2.8" fill="${p.accent}" stroke="${ink}" stroke-width="1.5"/><circle cx="26" cy="54" r="2.2" fill="${p.accent}" stroke="${ink}" stroke-width="1.2"/>`;
  }

  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${esc(client.name)}">
    <circle cx="50" cy="50" r="50" fill="${bg}"/>
    <path d="M8 96c2-21 18-34 42-34s40 13 42 34" fill="${shirt}" stroke="${ink}" stroke-width="2.6"/>
    <path d="M43 62h14v12H43z" fill="${skin}" stroke="${ink}" stroke-width="2.2"/>
    <path d="M37 88c4 2 9 3 13 3s9-1 13-3" fill="none" stroke="${p.accent}" stroke-width="3"/>
    ${hairBack}
    <ellipse cx="50" cy="45" rx="21" ry="24" fill="${skin}" stroke="${ink}" stroke-width="2.4"/>
    ${hairFront}
    <path d="M39 42c2-2 5-2 7 0M54 42c2-2 5-2 7 0" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="43" cy="46" rx="2.4" ry="3" fill="${ink}"/>
    <ellipse cx="57" cy="46" rx="2.4" ry="3" fill="${ink}"/>
    <circle cx="44" cy="45" r=".8" fill="${CREAM}"/><circle cx="58" cy="45" r=".8" fill="${CREAM}"/>
    <path d="M45 55c3 3 7 3 10 0" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="35" cy="51" r="3" fill="${CORAL}" opacity=".35"/><circle cx="65" cy="51" r="3" fill="${CORAL}" opacity=".35"/>
    ${accessory}
    <path d="M50 65l-2 6 4 1" fill="none" stroke="${p.accent}" stroke-width="2"/>
    <circle cx="50" cy="74" r="2.6" fill="${p.accent}" stroke="${ink}" stroke-width="1.4"/>
  </svg>`;
}

function heroAvatarSVG(size = 72) {
  return avatarSVG({
    name: 'Mia',
    palette: MIA_PALETTE,
    hair: 'bun',
    accessory: 'headband'
  }, size);
}
