// Синтезированный звук (Web Audio): гул двигателя, взрыв, щелчок отделения. Включается после первого нажатия клавиши.
export class Sound {
  constructor() { this.ctx = null; this.on = true; }
  init() {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    try {
      const c = this.ctx = new AudioContext(), buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0); let last = 0;
      for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      this.noise = buf; this.src = c.createBufferSource(); this.src.buffer = buf; this.src.loop = true;
      this.filter = c.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 400;
      this.gain = c.createGain(); this.gain.gain.value = 0;
      this.src.connect(this.filter); this.filter.connect(this.gain); this.gain.connect(c.destination); this.src.start();
    } catch { this.ctx = null; }
  }
  engine(throttle, air) {
    if (!this.ctx) return;
    this.gain.gain.setTargetAtTime(this.on ? throttle * (0.12 + 0.38 * air) : 0, this.ctx.currentTime, 0.05);
    this.filter.frequency.setTargetAtTime(300 + throttle * 500, this.ctx.currentTime, 0.1);
  }
  burst(vol, dur, freq) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(); s.stop(c.currentTime + dur);
  }
  boom() { this.burst(0.9, 1.8, 500); }
  clunk() { this.burst(0.4, 0.25, 1500); }
  toggle() { this.on = !this.on; if (!this.on) this.engine(0, 0); return this.on; }
}
