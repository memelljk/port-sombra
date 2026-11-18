// wavefm.js — all sound in Port Sombra is WebAudio synthesis: six radio
// stations, engine and boat hums, sirens, gunshots, rain noise. Nothing is
// loaded; the context only opens after a real user gesture.
window.PS = window.PS || {};

PS.STATIONS = [
  { name: 'Bassline FM', kind: 'bass', root: 55 },
  { name: 'Neon Wave', kind: 'arp', root: 220 },
  { name: 'Rain FM', kind: 'pad', root: 110 },
  { name: 'Harbor Talk', kind: 'talk', root: 330 },
  { name: 'Container Static', kind: 'beat', root: 82 },
  { name: 'Ferry Tones', kind: 'lofi', root: 174 }
];
PS.radio = { idx: 0, on: true };

PS.audio = {
  ctx: null, master: null, muted: false, step: 0, radioTimer: null,
  engineOsc: null, engineGain: null, boatOsc: null, boatGain: null, rainGain: null, sirenOsc: null, sirenGain: null,
  unlock: function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      // looping rain noise bed
      const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const rain = this.ctx.createBufferSource(); rain.buffer = buf; rain.loop = true;
      const rf = this.ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 900;
      this.rainGain = this.ctx.createGain(); this.rainGain.gain.value = 0;
      rain.connect(rf); rf.connect(this.rainGain); this.rainGain.connect(this.master); rain.start();
      const self = this;
      this.radioTimer = setInterval(function () { self.radioStep(); }, 210);
    } catch (err) { /* audio is garnish; silence is safe */ }
  },
  note: function (freq, dur, type, vol, when) {
    if (!this.ctx || this.muted) return;
    const t = when || this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  radioStep: function () {
    if (!this.ctx || this.muted || !PS.radio.on) return;
    if (!PS.hero || (!PS.hero.inCar && !PS.shotMode)) return;
    const st = PS.STATIONS[PS.radio.idx], s = this.step++;
    const scale = [0, 3, 5, 7, 10, 12, 15];
    const f = function (deg, oct) { return st.root * Math.pow(2, (scale[deg % scale.length] + 12 * (oct || 0)) / 12); };
    if (st.kind === 'bass') { if (s % 2 === 0) this.note(f(s % 7), 0.19, 'sawtooth', 0.16); }
    else if (st.kind === 'arp') { this.note(f((s * 2) % 7, 1), 0.16, 'square', 0.07); if (s % 8 === 0) this.note(f(0), 0.5, 'triangle', 0.1); }
    else if (st.kind === 'pad') { if (s % 8 === 0) { this.note(f(0), 1.6, 'sine', 0.12); this.note(f(2), 1.6, 'sine', 0.1); this.note(f(4), 1.6, 'sine', 0.09); } }
    else if (st.kind === 'talk') { if (Math.random() > 0.45) this.note(300 + Math.random() * 500, 0.05, 'square', 0.035); }
    else if (st.kind === 'beat') { if (s % 4 === 0) this.note(58, 0.12, 'sine', 0.3); if (s % 2 === 1) this.note(1200, 0.03, 'square', 0.03); if (s % 8 === 4) this.note(f(3), 0.2, 'sawtooth', 0.08); }
    else if (st.kind === 'lofi') { if (s % 4 === 0) { this.note(f(s % 5), 0.7, 'triangle', 0.12); this.note(f((s + 2) % 5), 0.7, 'sine', 0.08); } }
  },
  sfx: function (name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (name === 'shot') {
      const len = this.ctx.sampleRate * 0.09, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const g = this.ctx.createGain(); g.gain.value = 0.4; src.connect(g); g.connect(this.master); src.start(t);
    } else if (name === 'reload' || name === 'swing') this.note(name === 'reload' ? 700 : 240, 0.07, 'square', 0.08);
    else if (name === 'cash') { this.note(880, 0.09, 'square', 0.1); this.note(1320, 0.12, 'square', 0.1, t + 0.07); }
    else if (name === 'door') this.note(180, 0.1, 'triangle', 0.12);
    else if (name === 'splash') this.note(300, 0.25, 'sine', 0.1);
  },
  setEngine: function (speed01, boating) {
    if (!this.ctx) return;
    const mk = function (type) {
      const o = PS.audio.ctx.createOscillator(), g = PS.audio.ctx.createGain();
      o.type = type; g.gain.value = 0; o.connect(g); g.connect(PS.audio.master); o.start(); return [o, g];
    };
    if (!this.engineOsc) { const e = mk('sawtooth'); this.engineOsc = e[0]; this.engineGain = e[1]; }
    if (!this.boatOsc) { const b = mk('triangle'); this.boatOsc = b[0]; this.boatGain = b[1]; }
    const driving = !boating && PS.hero && PS.hero.inCar;
    this.engineGain.gain.value = this.muted ? 0 : (driving ? 0.05 + speed01 * 0.05 : 0);
    if (driving) this.engineOsc.frequency.value = 55 + speed01 * 130;
    this.boatGain.gain.value = this.muted ? 0 : (boating ? 0.07 : 0);
    if (boating) this.boatOsc.frequency.value = 38 + speed01 * 60;
    // siren bed while police are active
    if (!this.sirenOsc) { const s = mk('square'); this.sirenOsc = s[0]; this.sirenGain = s[1]; }
    const sirenOn = PS.wanted && PS.wanted.stars > 0 && PS.policePool && PS.policePool.some(function (c) { return c.active; });
    this.sirenGain.gain.value = this.muted ? 0 : (sirenOn ? 0.018 : 0);
    if (sirenOn) this.sirenOsc.frequency.value = (Math.floor(PS.time * 1.6) % 2 === 0) ? 660 : 880;
    if (this.rainGain) this.rainGain.gain.value = this.muted ? 0 : (PS.weather ? PS.weather.rain * 0.14 : 0);
  },
  toggleMute: function () { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.5; return this.muted; }
};
PS.cycleRadio = function () {
  PS.radio.idx = (PS.radio.idx + 1) % PS.STATIONS.length;
  PS.HUD && PS.HUD.refresh();
};
