export class DivineAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.padGain = null;
    this.padFilter = null;
    this.enabled = false;
    this.started = false;
    this.muted = false;
    this.themeIndex = 0;
    this.noiseBuffer = null;
    this.notes = [0, 0, 0, 0];
  }

  init() {
    if (this.ctx) return true;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    try {
      this.ctx = new AudioCtor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);

      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.value = 0.36;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.28;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.22;
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(this.master);

      this.padFilter = this.ctx.createBiquadFilter();
      this.padFilter.type = "lowpass";
      this.padFilter.frequency.value = 900;
      this.padFilter.Q.value = 2.4;

      this.padGain = this.ctx.createGain();
      this.padGain.gain.value = 0.05;

      this.padFilter.connect(this.padGain);
      this.padGain.connect(this.master);
      this.padGain.connect(delay);

      const frequencies = [110, 164.81, 220, 329.63];
      frequencies.forEach((frequency, index) => {
        const osc = this.ctx.createOscillator();
        osc.type = index % 2 === 0 ? "triangle" : "sine";
        osc.frequency.value = frequency;
        osc.detune.value = (index - 1.5) * 7;
        const gain = this.ctx.createGain();
        gain.gain.value = index === 3 ? 0.1 : 0.2;
        osc.connect(gain);
        gain.connect(this.padFilter);
        osc.start();
        this.notes[index] = osc;
      });

      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain);
      lfoGain.connect(this.padFilter.frequency);
      lfo.start();

      const length = Math.floor(this.ctx.sampleRate * 1.4);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      return true;
    } catch (error) {
      this.ctx = null;
      return false;
    }
  }

  async ensure() {
    if (!this.init()) return false;
    try {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      if (!this.started || (!this.enabled && !this.muted)) {
        this.started = true;
        this.muted = false;
        this.enabled = true;
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.3);
      }
      return this.enabled;
    } catch (error) {
      return false;
    }
  }

  async toggle() {
    if (!this.ctx || !this.started) {
      const ready = await this.ensure();
      return ready;
    }
    if (this.enabled) {
      this.enabled = false;
      this.muted = true;
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      return false;
    }
    this.enabled = true;
    this.muted = false;
    this.master.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.12);
    return true;
  }

  note(frequency, at, duration, type = "sine", volume = 0.06) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  noise(at, duration, from, to, volume = 0.1) {
    if (!this.ctx || !this.enabled || !this.noiseBuffer) return;
    const now = this.ctx.currentTime + at;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(to, now + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.05);
  }

  create() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, index) => {
      this.note(frequency, index * 0.065, 0.6 - index * 0.06, index % 2 === 0 ? "sine" : "triangle", 0.055);
    });
    this.note(261.63, 0, 0.8, "sine", 0.03);
  }

  destroy() {
    this.noise(0, 1.1, 2400, 70, 0.16);
    if (this.ctx && this.enabled) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.9);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + 1.05);
    }
  }

  change() {
    [329.63, 415.3, 493.88, 659.25].forEach((frequency, index) => {
      this.note(frequency, index * 0.04, 0.45, "triangle", 0.045);
    });
    this.noise(0, 0.35, 400, 3200, 0.05);
  }

  everything() {
    [130.81, 196, 261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
      this.note(frequency, index * 0.03, 1.4, index % 2 === 0 ? "triangle" : "sine", 0.05);
    });
    this.noise(0, 0.7, 300, 5000, 0.1);
    this.noise(0.18, 1.4, 5000, 200, 0.06);
  }

  setTheme(index) {
    this.themeIndex = index;
    if (!this.ctx || !this.padFilter) return;
    const frequencies = [900, 1250, 1500, 720];
    this.padFilter.frequency.setTargetAtTime(frequencies[index % frequencies.length], this.ctx.currentTime, 0.5);
  }
}
