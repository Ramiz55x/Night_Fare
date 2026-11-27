// أصوات مولّدة بالكود (Web Audio). أضف أصواتاً جديدة هنا (صرخة، باب، ...)
import { Settings } from './settings.js';
export const Audio = {
  ctx: null,
  init() {
    if (this.ctx) return;
    try {
      const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = c.createGain(); this.master.connect(c.destination);
      this.osc = c.createOscillator(); this.osc.type = 'sawtooth';
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
      const eg = c.createGain(); eg.gain.value = 0.25;
      this.osc.connect(lp).connect(eg).connect(this.master); this.osc.start();
      this.apply();
    } catch (e) { this.ctx = null; }
  },
  apply() { if (this.ctx) this.master.gain.value = Settings.data.vol; },
  engine(speed) { if (this.ctx) this.osc.frequency.value = 38 + Math.abs(speed) * 3.2; },
  blip() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = 660; g.gain.value = 0.1;
    o.connect(g).connect(this.master); o.start(); o.stop(this.ctx.currentTime + 0.08);
  }
};
