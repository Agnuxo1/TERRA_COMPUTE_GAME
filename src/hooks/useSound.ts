// Web Audio API - generates 8-bit arcade sounds in real time
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let enabled = false;
let ambientInterval: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function now(): number {
  const c = getCtx();
  return c ? c.currentTime : 0;
}

function synthClick(t: number) {
  const c = getCtx();
  if (!c || !masterGain) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(880, t);
  o.frequency.exponentialRampToValueAtTime(440, t + 0.06);
  g.gain.setValueAtTime(0.4, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  o.connect(g);
  g.connect(masterGain);
  o.start(t);
  o.stop(t + 0.1);
}

function synthTech(t: number) {
  const c = getCtx();
  if (!c || !masterGain) return;
  [523, 659, 784, 1047].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(f, t + i * 0.08);
    g.gain.setValueAtTime(0, t + i * 0.08);
    g.gain.linearRampToValueAtTime(0.25, t + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.18);
    o.connect(g);
    g.connect(masterGain);
    o.start(t + i * 0.08);
    o.stop(t + i * 0.08 + 0.2);
  });
}

function synthBuild(t: number) {
  const c = getCtx();
  if (!c || !masterGain) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(200, t);
  o.frequency.exponentialRampToValueAtTime(600, t + 0.15);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.4);
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(g);
  g.connect(masterGain);
  o.start(t);
  o.stop(t + 0.55);
  const o2 = c.createOscillator();
  const g2 = c.createGain();
  o2.type = 'square';
  o2.frequency.setValueAtTime(1000, t + 0.1);
  g2.gain.setValueAtTime(0.15, t + 0.1);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o2.connect(g2);
  g2.connect(masterGain);
  o2.start(t + 0.1);
  o2.stop(t + 0.25);
}

function synthAlert(t: number) {
  const c = getCtx();
  if (!c || !masterGain) return;
  for (let i = 0; i < 4; i++) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    const st = t + i * 0.18;
    o.frequency.setValueAtTime(880, st);
    o.frequency.setValueAtTime(660, st + 0.08);
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(0.3, st + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, st + 0.15);
    o.connect(g);
    g.connect(masterGain);
    o.start(st);
    o.stop(st + 0.16);
  }
}

function synthVictory(t: number) {
  const c = getCtx();
  if (!c || !masterGain) return;
  const melody = [523, 659, 784, 1047, 784, 1047];
  const durs = [0.15, 0.15, 0.15, 0.3, 0.15, 0.5];
  let time = 0;
  melody.forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(f, t + time);
    g.gain.setValueAtTime(0, t + time);
    g.gain.linearRampToValueAtTime(0.3, t + time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + time + durs[i]);
    o.connect(g);
    g.connect(masterGain);
    o.start(t + time);
    o.stop(t + time + durs[i] + 0.05);
    time += durs[i];
  });
}

function synthDefeat(t: number) {
  const c = getCtx();
  if (!c || !masterGain) return;
  [440, 370, 330, 262].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t + i * 0.3);
    g.gain.setValueAtTime(0.25, t + i * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.5);
    o.connect(g);
    g.connect(masterGain);
    o.start(t + i * 0.3);
    o.stop(t + i * 0.3 + 0.6);
  });
}

function synthCoin(t: number) {
  const c = getCtx();
  if (!c || !masterGain) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(1200, t);
  o.frequency.exponentialRampToValueAtTime(2400, t + 0.05);
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g);
  g.connect(masterGain);
  o.start(t);
  o.stop(t + 0.2);
  const o2 = c.createOscillator();
  const g2 = c.createGain();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(1800, t + 0.05);
  g2.gain.setValueAtTime(0.2, t + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o2.connect(g2);
  g2.connect(masterGain);
  o2.start(t + 0.05);
  o2.stop(t + 0.22);
}

function synthAmbientStep(t: number) {
  const c = getCtx();
  if (!c || !masterGain) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(55 + Math.random() * 10, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.5);
  g.gain.linearRampToValueAtTime(0, t + 4);
  o.connect(g);
  g.connect(masterGain);
  o.start(t);
  o.stop(t + 4);
  if (Math.random() > 0.6) {
    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(880 + Math.random() * 400, t + 1);
    g2.gain.setValueAtTime(0, t + 1);
    g2.gain.linearRampToValueAtTime(0.04, t + 1.2);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
    o2.connect(g2);
    g2.connect(masterGain);
    o2.start(t + 1);
    o2.stop(t + 2.5);
  }
}

export type SoundName = 'click' | 'build' | 'tech' | 'alert' | 'victory' | 'defeat' | 'coin' | 'ambient';

const SYNTH: Record<SoundName, (t: number) => void> = {
  click: synthClick,
  build: synthBuild,
  tech: synthTech,
  alert: synthAlert,
  victory: synthVictory,
  defeat: synthDefeat,
  coin: synthCoin,
  ambient: synthAmbientStep,
};

export function enableAudio() {
  enabled = true;
  getCtx();
}

export function disableAudio() {
  enabled = false;
  if (ambientInterval) {
    clearInterval(ambientInterval);
    ambientInterval = null;
  }
}

export function isAudioEnabled() {
  return enabled;
}

export function play(name: SoundName, _vol = 1) {
  if (!enabled) return;
  const c = getCtx();
  if (!c || c.state === 'suspended') return;
  try {
    SYNTH[name](now());
  } catch {
    // ignore audio errors
  }
}

export function startAmbient() {
  if (!enabled || ambientInterval) return;
  synthAmbientStep(now());
  ambientInterval = setInterval(() => {
    if (enabled) synthAmbientStep(now());
  }, 3000);
}

export function stopAmbient() {
  if (ambientInterval) {
    clearInterval(ambientInterval);
    ambientInterval = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SFX PLAYER (for generated MP3 sound effects - planes, rockets, satellites)
// ═══════════════════════════════════════════════════════════════════════════════

const sfxCache: Record<string, HTMLAudioElement> = {};
const sfxPlaying: Record<string, boolean> = {};

function getSfx(src: string): HTMLAudioElement | null {
  if (!enabled) return null;
  if (!sfxCache[src]) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    sfxCache[src] = audio;
  }
  return sfxCache[src];
}

/**
 * Play a sound effect MP3 file. Suitable for ambient/atmospheric sounds.
 * @param src Path to MP3 file (e.g. '/assets/sounds/plane-1960.mp3')
 * @param volume Volume 0.0-1.0 (default 0.2)
 * @param allowOverlap If false, won't play if same sound already playing (default false)
 */
export function playSfx(src: string, volume = 0.2, allowOverlap = false) {
  if (!enabled) return;
  if (!allowOverlap && sfxPlaying[src]) return;
  const audio = getSfx(src);
  if (!audio) return;
  audio.volume = volume;
  audio.currentTime = 0;
  sfxPlaying[src] = true;
  audio.play().catch(() => {});
  audio.onended = () => { sfxPlaying[src] = false; };
}
