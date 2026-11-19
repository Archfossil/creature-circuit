import { settings } from './settings';

// Tiny synthesized sound kit (Web Audio) — no audio files to download, works offline.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (!settings().sound) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Mobile browsers only allow audio after a user gesture. */
export function unlockAudio() {
  const once = () => { audio(); removeEventListener('pointerdown', once); };
  addEventListener('pointerdown', once);
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.5, slideTo?: number, delay = 0) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.3, delay = 0, hp = 800) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export const sfx = {
  tap: () => tone(660, 0.06, 'triangle', 0.25),
  dice: () => { for (let i = 0; i < 5; i++) noise(0.04, 0.25, i * 0.09, 2500); },
  land: () => tone(220, 0.12, 'square', 0.18, 140),
  hop: () => tone(300, 0.18, 'sine', 0.3, 600),
  hit: () => { noise(0.15, 0.45, 0, 400); tone(160, 0.15, 'square', 0.25, 70); },
  crit: () => { noise(0.25, 0.6, 0, 300); tone(880, 0.12, 'sawtooth', 0.25, 220); },
  zap: () => tone(1200, 0.25, 'sawtooth', 0.2, 300),
  heal: () => { tone(523, 0.12, 'sine', 0.3); tone(784, 0.18, 'sine', 0.3, undefined, 0.1); },
  ko: () => tone(400, 0.6, 'triangle', 0.35, 60),
  good: () => { tone(523, 0.1, 'triangle', 0.3); tone(659, 0.1, 'triangle', 0.3, undefined, 0.09); tone(784, 0.2, 'triangle', 0.3, undefined, 0.18); },
  bad: () => tone(300, 0.3, 'triangle', 0.3, 150),
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.32, undefined, i * 0.12)),
};
