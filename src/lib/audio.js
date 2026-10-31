const NOTE = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

const midi = (name, octave) => 440 * Math.pow(2, (NOTE[name] + (octave - 4) * 12 - 9) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = true;
    this.started = false;
    this.timer = null;
    this.nextNoteTime = 0;
    this.step = 0;
    this.bpm = 124;
    this.stepDuration = 60 / this.bpm / 4;
    this.noiseBuffer = null;
    this.delay = null;
    this.delayGain = null;
    this.chords = [
      [["F#", 2], ["A", 2], ["C#", 3], ["E", 3]],
      [["D", 2], ["F#", 2], ["A", 2], ["C#", 3]],
      [["A", 2], ["C#", 3], ["E", 3], ["G#", 3]],
      [["E", 2], ["G#", 2], ["B", 2], ["D", 3]],
    ];
    this.arpPattern = [0, 2, 1, 3, 2, 1, 3, 0, 1, 3, 2, 1, 0, 2, 3, 1];
    this.bassPattern = [0, null, 0, null, 0, 0, null, 0, 0, null, 0, 0, null, 0, 3, null];
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0001;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.24;
    this.master.connect(compressor);
    compressor.connect(this.ctx.destination);

    this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.5, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.delay = this.ctx.createDelay(0.5);
    this.delay.delayTime.value = this.stepDuration * 3;
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.value = 0.26;
    this.delay.connect(this.delayGain);
    this.delayGain.connect(this.delay);
    this.delayGain.connect(this.master);

    // A soft bed of filtered noise keeps the air alive.
    const air = this.ctx.createBufferSource();
    air.buffer = this.noiseBuffer;
    air.loop = true;
    const airFilter = this.ctx.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 5200;
    airFilter.Q.value = 0.4;
    const airGain = this.ctx.createGain();
    airGain.gain.value = 0.006;
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(this.master);
    air.start();
  }

  async start() {
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (this.started) {
      this.setMuted(false);
      return true;
    }
    this.started = true;
    this.muted = false;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.06;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.master.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + 1.1);
    this.timer = window.setInterval(() => this.scheduler(), 25);
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    this.master.gain.exponentialRampToValueAtTime(muted ? 0.0001 : 0.3, now + 0.35);
    if (this.ctx.state === "suspended" && !muted) this.ctx.resume();
  }

  scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.nextNoteTime += this.stepDuration;
      this.step = (this.step + 1) % 64;
    }
  }

  scheduleStep(step, time) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = this.chords[bar % this.chords.length];

    // Kick: four on the floor, with a syncopated bounce.
    if (s === 0 || s === 4 || s === 8 || s === 12) this.kick(time, s === 0 ? 1 : 0.8);
    if (s === 14 && bar % 2 === 1) this.kick(time, 0.5);

    if (s === 4 || s === 12) this.clap(time);
    if (s % 2 === 0) this.hat(time, s % 4 === 0 ? 0.16 : 0.08, false);
    if (s === 7 || s === 15) this.hat(time, 0.1, true);

    const arpNote = chord[this.arpPattern[s] % chord.length];
    if (s % 2 === 0) {
      this.pluck(time, midi(arpNote[0], arpNote[1] + 2), 0.07);
    }

    const bassIndex = this.bassPattern[s];
    if (bassIndex !== null) {
      const note = chord[bassIndex % chord.length];
      this.bass(time, midi(note[0], note[1]), 0.16);
    }

    if (s === 0) {
      this.pad(time, chord, this.stepDuration * 16);
    }

    if (s === 0 && bar === 0) {
      this.sparkle(time);
    }
  }

  kick(time, gain) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(155, time);
    osc.frequency.exponentialRampToValueAtTime(43, time + 0.13);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.95 * gain, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
    osc.connect(g);
    g.connect(this.master);
    osc.start(time);
    osc.stop(time + 0.35);
  }

  clap(time) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1900;
    filter.Q.value = 1.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.35, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    g.connect(this.delay);
    src.start(time);
    src.stop(time + 0.2);
  }

  hat(time, gain, open) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 8200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + (open ? 0.16 : 0.045));
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(time);
    src.stop(time + (open ? 0.2 : 0.06));
  }

  bass(time, frequency, gain) {
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc2.type = "square";
    osc.frequency.value = frequency / 2;
    osc2.frequency.value = frequency / 2;
    osc2.detune.value = -7;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(650, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + 0.2);
    filter.Q.value = 7;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.26);
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.3);
    osc2.stop(time + 0.3);
  }

  pluck(time, frequency, gain) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(g);
    g.connect(this.master);
    g.connect(this.delay);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  pad(time, chord, duration) {
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(260, time);
    filter.frequency.linearRampToValueAtTime(900, time + duration);
    filter.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.035, time + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, time + duration);
    filter.connect(g);
    g.connect(this.master);
    chord.forEach(([name, octave], i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 ? "sawtooth" : "triangle";
      osc.frequency.value = midi(name, octave);
      osc.detune.value = i * 4 - 6;
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + duration + 0.1);
    });
  }

  sparkle(time) {
    const notes = ["F#", "A", "C#", "E", "G#"];
    for (let i = 0; i < 7; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = midi(notes[i % notes.length], 6 + Math.floor(i / 4));
      g.gain.setValueAtTime(0.0001, time + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.035, time + i * 0.05 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, time + i * 0.05 + 0.4);
      osc.connect(g);
      g.connect(this.master);
      g.connect(this.delay);
      osc.start(time + i * 0.05);
      osc.stop(time + i * 0.05 + 0.45);
    }
  }

  power(power) {
    if (!this.ctx || this.muted) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 2.2;
    const map = {
      create: { start: 280, end: 900, dur: 0.5, gain: 0.12, type: "sine" },
      destroy: { start: 540, end: 55, dur: 0.65, gain: 0.18, type: "sawtooth" },
      change: { start: 320, end: 640, dur: 0.42, gain: 0.1, type: "triangle" },
      everything: { start: 180, end: 1200, dur: 0.9, gain: 0.14, type: "sawtooth" },
    };
    const spec = map[power] || map.create;
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.start, time);
    osc.frequency.exponentialRampToValueAtTime(spec.end, time + spec.dur);
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(4000, time + spec.dur * 0.3);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(spec.gain, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + spec.dur);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    g.connect(this.delay);
    osc.start(time);
    osc.stop(time + spec.dur + 0.02);
  }
}
