export class DivineAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.filter = null;
    this.enabled = false;
    this.noiseBuffer = null;
  }

  build() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    const context = new AudioContext();
    this.context = context;

    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    this.master = master;

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 760;
    filter.Q.value = 0.8;
    filter.connect(master);
    this.filter = filter;

    const pad = context.createGain();
    pad.gain.value = 0.13;
    pad.connect(filter);

    const voices = [110, 164.81, 220, 329.63];
    voices.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index % 2 === 0 ? 'triangle' : 'sawtooth';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = (index - 1.5) * 7;
      const gain = context.createGain();
      gain.gain.value = 0.16 / (index + 1);
      oscillator.connect(gain).connect(pad);
      oscillator.start();
    });

    const lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const length = Math.floor(context.sampleRate * 0.45);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.2);
    }
    this.noiseBuffer = buffer;
    return true;
  }

  async enable() {
    if (!this.context && !this.build()) return false;
    if (this.context.state === 'suspended') await this.context.resume();
    this.enabled = true;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.15, now + 0.8);
    return true;
  }

  disable() {
    if (!this.context) return;
    this.enabled = false;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.4);
  }

  async toggle() {
    if (this.enabled) {
      this.disable();
      return false;
    }
    return this.enable();
  }

  ping(frequency, duration = 0.5, volume = 0.05, type = 'triangle', delay = 0) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise(volume = 0.1, duration = 0.3) {
    if (!this.enabled || !this.context || !this.noiseBuffer) return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  sweep(from, to, duration = 0.7, volume = 0.045) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  cast(mode) {
    if (!this.enabled || !this.context) return;
    if (mode === 'create') {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        this.ping(frequency, 0.55, 0.038, 'triangle', index * 0.055);
      });
      this.sweep(320, 980, 0.5, 0.025);
    } else if (mode === 'change') {
      this.sweep(180, 1200, 0.8, 0.04);
      [392, 493.88, 587.33].forEach((frequency, index) => {
        this.ping(frequency, 0.7, 0.03, 'sine', index * 0.04);
      });
      this.noise(0.035, 0.5);
    } else {
      this.noise(0.14, 0.42);
      this.sweep(160, 36, 0.55, 0.08);
      this.ping(72, 0.7, 0.06, 'sine', 0.02);
    }
  }
}
