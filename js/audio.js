const BPM = 124;
const STEP = 60 / BPM / 4;
const BAR_ROOTS = [110, 87.31, 130.81, 98];
const BAR_CHORDS = [
  [0, 3, 7, 10, 14],
  [0, 4, 7, 11, 14],
  [0, 4, 7, 11, 16],
  [0, 4, 7, 10, 14],
];
const ARP = [0, 2, 4, 3, 1, 4, 2, 3, 0, 3, 4, 2, 1, 3, 4, 2];

function midiToFreq(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export class DivineAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.sfx = null;
    this.started = false;
    this.muted = true;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.noiseBuffer = null;
    this.distortion = null;
  }

  async unlock() {
    if (!this.ctx) this.build();
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* gesture required */ }
    }
    if (!this.started) this.start();
    if (this.muted) this.setMuted(false);
  }

  build() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.24;

    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(comp).connect(ctx.destination);

    this.music = ctx.createGain();
    this.music.gain.value = 0.5;
    this.music.connect(this.master);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.85;
    this.sfx.connect(this.master);

    this.delay = ctx.createDelay(1.5);
    this.delay.delayTime.value = STEP * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.2;
    this.delay.connect(feedback).connect(this.delay);
    this.delay.connect(wet).connect(this.music);

    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = ((3 + 12) * x * 20 * (Math.PI / 180)) / (Math.PI + 12 * Math.abs(x));
    }
    this.distortion = curve;
  }

  start() {
    if (!this.ctx || this.started) return;
    this.started = true;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  schedule() {
    if (!this.ctx) return;
    if (this.nextTime < this.ctx.currentTime - 0.4) {
      this.nextTime = this.ctx.currentTime + 0.05;
    }
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      this.playStep(this.step, this.nextTime);
      this.step = (this.step + 1) % 32;
      this.nextTime += STEP;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0.0001 : 0.72, now, 0.08);
  }

  toggle() {
    if (this.muted) this.unlock();
    else this.setMuted(true);
    return !this.muted;
  }

  playStep(step, time) {
    const s = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const root = BAR_ROOTS[bar];
    const chord = BAR_CHORDS[bar];

    if (s % 4 === 0) {
      this.kick(time);
      this.duck(time);
    }
    if (s === 4 || s === 12) this.clap(time);
    if (s % 2 === 0) this.hat(time, s === 14 ? 0.06 : 0.028, s === 14);
    if (s % 2 === 1 && Math.random() > 0.55) this.hat(time, 0.014, false);

    if ([0, 3, 6, 8, 11, 14].includes(s)) {
      const octave = s === 6 || s === 14 ? 2 : 1;
      this.bass(time, root * octave, s === 11 ? 0.13 : 0.2);
    }

    const degree = chord[ARP[(step + bar * 3) % ARP.length] % chord.length];
    const arpFreq = midiToFreq(69 + Math.round(12 * Math.log2(root / 440)) + degree + 24);
    this.arp(time, arpFreq, 0.09);

    if (s === 0) this.pad(time, root, chord, 2.6);
    if (s === 8 && bar === 3) this.sparkle(time);
  }

  tone(time, freq, dur, opts = {}) {
    if (!this.ctx) return;
    const {
      type = "sine",
      gain = 0.1,
      attack = 0.005,
      release = 0.1,
      slideTo = null,
      filter = null,
      filterQ = 1,
      dest = this.music,
      detune = 0,
    } = opts;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), time);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), time + dur);
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);
    let node = o;
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = filter;
      f.frequency.value = typeof filter === "number" ? filter : 900;
      f.Q.value = filterQ;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(dest);
    o.start(time);
    o.stop(time + dur + release + 0.05);
  }

  noise(time, dur, opts = {}) {
    if (!this.ctx || !this.noiseBuffer) return;
    const { gain = 0.1, type = "highpass", freq = 8000, q = 0.8, dest = this.music, slideTo = null } = opts;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, time);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, time + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(time, Math.random() * 0.4);
    src.stop(time + dur + 0.02);
  }

  kick(time) {
    this.tone(time, 165, 0.22, { type: "sine", gain: 0.8, slideTo: 44, attack: 0.002, release: 0.08 });
    this.noise(time, 0.02, { gain: 0.12, type: "highpass", freq: 2200 });
  }

  clap(time) {
    this.noise(time, 0.11, { gain: 0.22, type: "bandpass", freq: 1500, q: 1.1 });
    this.noise(time + 0.012, 0.08, { gain: 0.14, type: "bandpass", freq: 2200, q: 1.4 });
  }

  hat(time, gain, open) {
    this.noise(time, open ? 0.16 : 0.035, { gain, type: "highpass", freq: 8600, q: 0.7 });
  }

  bass(time, freq, dur) {
    this.tone(time, freq, dur, { type: "sawtooth", gain: 0.18, filter: "lowpass", filterQ: 4, release: 0.05 });
    this.tone(time, freq / 2, dur, { type: "sine", gain: 0.22, release: 0.06 });
  }

  arp(time, freq, gain) {
    this.tone(time, freq, 0.08, { type: "triangle", gain, release: 0.08 });
    this.tone(time, freq * 2.005, 0.06, { type: "sine", gain: gain * 0.4, release: 0.06, dest: this.delay });
  }

  pad(time, root, chord, dur) {
    chord.slice(0, 3).forEach((semi, i) => {
      const freq = root * Math.pow(2, semi / 12) * 2;
      this.tone(time, freq, dur, {
        type: i === 0 ? "triangle" : "sawtooth",
        gain: 0.035,
        attack: 0.6,
        release: 1.2,
        filter: "lowpass",
        filterQ: 0.8,
        detune: (i - 1) * 7,
      });
    });
  }

  sparkle(time) {
    [0, 4, 7, 11, 14].forEach((semi, i) => {
      this.tone(time + i * 0.055, midiToFreq(81 + semi), 0.16, {
        type: "sine",
        gain: 0.05,
        release: 0.4,
        dest: this.delay,
      });
    });
  }

  duck(time) {
    if (!this.music) return;
    this.music.gain.cancelScheduledValues(time);
    this.music.gain.setValueAtTime(0.5, time);
    this.music.gain.linearRampToValueAtTime(0.2, time + 0.03);
    this.music.gain.linearRampToValueAtTime(0.5, time + 0.22);
  }

  sfxCreate() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    const notes = [0, 4, 7, 11, 14, 19, 23, 26];
    notes.forEach((semi, i) => {
      this.tone(t + i * 0.06, midiToFreq(72 + semi), 0.18, {
        type: i % 2 ? "triangle" : "sine",
        gain: 0.11,
        release: 0.5,
        dest: this.sfx,
      });
    });
    this.noise(t, 0.7, { gain: 0.1, type: "highpass", freq: 3000, slideTo: 12000, dest: this.sfx });
    this.tone(t, 220, 0.6, { type: "sine", gain: 0.1, slideTo: 880, dest: this.sfx });
  }

  sfxDestroy() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    this.tone(t, 130, 1.1, { type: "sine", gain: 0.65, slideTo: 28, release: 0.4, dest: this.sfx });
    this.tone(t, 84, 0.7, { type: "square", gain: 0.12, slideTo: 40, filter: "lowpass", filterQ: 2, dest: this.sfx });
    this.noise(t, 1.2, { gain: 0.45, type: "lowpass", freq: 5000, slideTo: 90, dest: this.sfx });
    this.noise(t, 0.25, { gain: 0.3, type: "highpass", freq: 400, dest: this.sfx });
    if (this.distortion) {
      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.distortion;
      shaper.oversample = "2x";
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const g = this.ctx.createGain();
      g.gain.value = 0.16;
      src.connect(shaper).connect(g).connect(this.sfx);
      src.start(t);
      src.stop(t + 0.6);
    }
  }

  sfxChange() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    this.tone(t, 180, 0.65, {
      type: "sawtooth",
      gain: 0.12,
      slideTo: 1600,
      filter: "bandpass",
      filterQ: 3,
      release: 0.2,
      dest: this.sfx,
    });
    [0, 7, 12, 19].forEach((semi, i) => {
      this.tone(t + 0.5 + i * 0.045, midiToFreq(72 + semi), 0.22, {
        type: "triangle",
        gain: 0.09,
        release: 0.5,
        dest: this.sfx,
      });
    });
  }

  sfxBless() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    this.tone(t, 1046.5, 0.5, { type: "sine", gain: 0.09, release: 1.4, dest: this.sfx });
    this.tone(t + 0.08, 1568, 0.4, { type: "sine", gain: 0.06, release: 1.2, dest: this.sfx });
    this.tone(t + 0.16, 2093, 0.3, { type: "triangle", gain: 0.03, release: 1.0, dest: this.sfx });
    this.noise(t, 0.5, { gain: 0.04, type: "highpass", freq: 9000, dest: this.sfx });
  }

  sfxUi() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
    this.tone(t, 720, 0.05, { type: "sine", gain: 0.04, release: 0.06, dest: this.sfx });
  }
}
