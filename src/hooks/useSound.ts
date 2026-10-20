// Web Audio API - generates 8-bit arcade sounds in real time
import { getSettings, subscribeSettings } from '../lib/settings';
import '../lib/accessibility'; // applies colour / text-scale settings on load (UI-only module)

const BASE_GAIN = 0.3;
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let enabled = false;
let ambientInterval: ReturnType<typeof setInterval> | null = null;
let ambientWanted = false; // a screen asked for ambient; settings decide whether it actually plays

function getCtx(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = BASE_GAIN * getSettings().masterVolume;
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
    g.connect(masterGain!);
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
    g.connect(masterGain!);
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
    g.connect(masterGain!);
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
    g.connect(masterGain!);
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
  if (ambientWanted) runAmbient();
}

export function disableAudio() {
  enabled = false;
  if (ambientInterval) {
    clearInterval(ambientInterval);
    ambientInterval = null;
  }
  stopMusic();
}

export function isAudioEnabled() {
  return enabled;
}

export function play(name: SoundName) {
  if (!enabled) return;
  const st = getSettings();
  if (name === 'ambient' ? !st.ambient : !st.sfx) return;
  const c = getCtx();
  if (!c || c.state === 'suspended') return;
  try {
    SYNTH[name](now());
  } catch {
    // ignore audio errors
  }
}

function runAmbient() {
  if (!enabled || !getSettings().ambient) return;
  if (musicMood) {
    // a music mood replaces the old drone step
    if (ambientInterval) {
      clearInterval(ambientInterval);
      ambientInterval = null;
    }
    startMusic();
    return;
  }
  if (ambientInterval) return;
  synthAmbientStep(now());
  ambientInterval = setInterval(() => {
    if (enabled && getSettings().ambient) synthAmbientStep(now());
  }, 3000);
}

function haltAmbient() {
  if (ambientInterval) {
    clearInterval(ambientInterval);
    ambientInterval = null;
  }
  stopMusic();
}

export function startAmbient() {
  ambientWanted = true;
  runAmbient();
}

export function stopAmbient() {
  ambientWanted = false;
  haltAmbient();
}

// Settings changes apply live: volume on the master bus, ambient/music on/off.
subscribeSettings(() => {
  const st = getSettings();
  if (ctx && masterGain) masterGain.gain.setTargetAtTime(BASE_GAIN * st.masterVolume, ctx.currentTime, 0.05);
  if (!st.ambient) haltAmbient();
  else if (ambientWanted) runAmbient();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADAPTIVE MUSIC (procedural, no audio files)
//  setMusicMood({ era, defcon, asiRace }) selects the palette (era), tension (defcon) and a
//  high drone (asiRace). Mood changes that alter the palette crossfade over ~2 s between two
//  scenes. Notes are scheduled ahead on the AudioContext clock. At most MAX_VOICES oscillators
//  or buffer sources run at once; transient notes are skipped when the budget is full.
//  Ambient/master settings gate it exactly like the drone (`ambient` flag, `enabled`).
// ═══════════════════════════════════════════════════════════════════════════════

export interface MusicMood {
  era: number;       // 1..5 (1-2 analog 60s/70s, 3 synth 80s with drums, 4-5 soft pads)
  defcon: number;    // 1..5; 3 and below adds tension (faster, minor, pulsing bass)
  asiRace: boolean;  // adds a high drone
}

interface Palette {
  bpm: number;
  arpWave: OscillatorType;
  arpGain: number;
  arpEvery: number;   // play an arp note every N eighth-steps
  arpOct: number;     // extra octaves for the arp
  padWave: OscillatorType;
  padGain: number;
  bassWave: OscillatorType;
  bassGain: number;
  drums: boolean;
}

const PALETTES: Record<number, Palette> = {
  1: { bpm: 92, arpWave: 'sawtooth', arpGain: 0.03, arpEvery: 2, arpOct: 0, padWave: 'triangle', padGain: 0.05, bassWave: 'sine', bassGain: 0.12, drums: false },
  2: { bpm: 100, arpWave: 'square', arpGain: 0.025, arpEvery: 2, arpOct: 0, padWave: 'triangle', padGain: 0.05, bassWave: 'sine', bassGain: 0.12, drums: false },
  3: { bpm: 118, arpWave: 'square', arpGain: 0.03, arpEvery: 1, arpOct: 1, padWave: 'triangle', padGain: 0.035, bassWave: 'triangle', bassGain: 0.1, drums: true },
  4: { bpm: 84, arpWave: 'sine', arpGain: 0.04, arpEvery: 2, arpOct: 1, padWave: 'triangle', padGain: 0.07, bassWave: 'sine', bassGain: 0.14, drums: false },
  5: { bpm: 96, arpWave: 'sine', arpGain: 0.035, arpEvery: 2, arpOct: 1, padWave: 'sine', padGain: 0.07, bassWave: 'sine', bassGain: 0.15, drums: false },
};

// Chord roots are semitone offsets from A (pad 220 Hz, bass 110 Hz); [root, isMinor]
const PROG_MAJOR: Array<[number, boolean]> = [[0, false], [7, false], [9, true], [5, false]];
const PROG_MINOR: Array<[number, boolean]> = [[0, true], [8, false], [10, false], [7, true]];

const MAX_VOICES = 6;
const CROSS_SECONDS = 2;
const MUSIC_LEVEL = 0.6;
const LOOKAHEAD = 0.4;

interface Scene {
  key: string;
  bus: GainNode;
  pad: OscillatorNode;
  bass: OscillatorNode;
  bassGain: GainNode;
  palette: Palette;
}

let musicMood: MusicMood | null = null;
let musicBus: GainNode | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicScene: Scene | null = null;
let fadingScenes: Scene[] = [];
let droneOsc: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let musicStep = 0;
let nextStepTime = 0;
let voices = 0;
let noiseBuf: AudioBuffer | null = null;

function voiceStart(node: AudioScheduledSourceNode) {
  voices++;
  node.onended = () => { voices = Math.max(0, voices - 1); };
}

function ensureMusicBus(c: AudioContext): GainNode | null {
  if (!musicBus && masterGain) {
    musicBus = c.createGain();
    musicBus.gain.value = MUSIC_LEVEL;
    musicBus.connect(masterGain);
  }
  return musicBus;
}

function sanitizeMood(m: MusicMood): MusicMood {
  const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || lo));
  return { era: clampInt(m.era, 1, 5), defcon: clampInt(m.defcon, 1, 5), asiRace: !!m.asiRace };
}

/** Sets the adaptive music mood; pass null to return to the plain ambient drone. */
export function setMusicMood(mood: MusicMood | null) {
  if (!mood) {
    musicMood = null;
    stopMusic();
    if (ambientWanted) runAmbient();
    return;
  }
  musicMood = sanitizeMood(mood);
  ambientWanted = true;
  runAmbient();
  if (musicScene) updateScene();
  if (droneGain && ctx) droneGain.gain.setTargetAtTime(musicMood.asiRace ? 0.02 : 0, ctx.currentTime, 0.7);
}

function stepSeconds(p: Palette, m: MusicMood): number {
  const bpm = p.bpm * (1 + 0.1 * (5 - m.defcon));
  return 60 / bpm / 2; // eighth notes
}

function makeScene(key: string, p: Palette, t: number): Scene | null {
  const c = ctx;
  const mb = c ? ensureMusicBus(c) : null;
  if (!c || !mb) return null;
  const bus = c.createGain();
  bus.gain.setValueAtTime(0, t);
  bus.gain.linearRampToValueAtTime(1, t + CROSS_SECONDS);
  bus.connect(mb);
  const padGain = c.createGain();
  padGain.gain.value = p.padGain;
  padGain.connect(bus);
  const bassGain = c.createGain();
  bassGain.gain.value = p.bassGain;
  bassGain.connect(bus);
  const pad = c.createOscillator();
  pad.type = p.padWave;
  pad.frequency.value = 220;
  pad.connect(padGain);
  voiceStart(pad);
  pad.start(t);
  const bass = c.createOscillator();
  bass.type = p.bassWave;
  bass.frequency.value = 110;
  bass.connect(bassGain);
  voiceStart(bass);
  bass.start(t);
  return { key, bus, pad, bass, bassGain, palette: p };
}

function stopScene(s: Scene, t: number, delay: number) {
  const at = t + delay;
  try {
    s.pad.stop(at);
    s.bass.stop(at);
  } catch {
    // already stopped
  }
}

function updateScene() {
  const c = ctx;
  if (!c || !musicMood) return;
  const key = `${musicMood.era}|${musicMood.asiRace ? 1 : 0}`;
  if (musicScene && musicScene.key === key) return;
  const t = c.currentTime;
  // keep at most two live scenes: hard-stop any scene still fading from an earlier change
  for (const s of fadingScenes) stopScene(s, t, 0.02);
  fadingScenes = [];
  if (musicScene) {
    const g = musicScene.bus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + CROSS_SECONDS);
    stopScene(musicScene, t, CROSS_SECONDS + 0.1);
    fadingScenes = [musicScene];
  }
  musicScene = makeScene(key, PALETTES[musicMood.era] ?? PALETTES[1], t);
}

function playTone(dest: GainNode, type: OscillatorType, freq: number, t: number, dur: number, peak: number) {
  const c = ctx;
  if (!c || voices >= MAX_VOICES) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest);
  voiceStart(o);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function playKick(dest: GainNode, t: number) {
  const c = ctx;
  if (!c || voices >= MAX_VOICES) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g);
  g.connect(dest);
  voiceStart(o);
  o.start(t);
  o.stop(t + 0.16);
}

function playHat(dest: GainNode, t: number) {
  const c = ctx;
  if (!c || voices >= MAX_VOICES) return;
  if (!noiseBuf) {
    const len = Math.floor(c.sampleRate * 0.1);
    noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const g = c.createGain();
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  src.connect(hp);
  hp.connect(g);
  g.connect(dest);
  voiceStart(src);
  src.start(t, 0, 0.05);
}

function scheduleStep(step: number, t: number, scene: Scene, m: MusicMood, dur: number) {
  const p = scene.palette;
  const tense = m.defcon <= 3;
  const prog = tense ? PROG_MINOR : PROG_MAJOR;
  const [root, minor] = prog[Math.floor(step / 16) % prog.length];
  const triad = [root, root + (minor ? 3 : 4), root + 7];
  if (step % 16 === 0) {
    scene.pad.frequency.setTargetAtTime(220 * 2 ** (root / 12), t, 0.15);
    scene.bass.frequency.setValueAtTime(110 * 2 ** (root / 12), t);
  }
  const bg = scene.bassGain.gain;
  if (tense) {
    // pulsing bass
    bg.setValueAtTime(p.bassGain * 1.5, t);
    bg.exponentialRampToValueAtTime(p.bassGain * 0.35, t + dur * 0.9);
  } else {
    bg.setValueAtTime(p.bassGain, t);
  }
  if (step % p.arpEvery === 0 && musicBus) {
    const semi = triad[step % 3] + 12 * p.arpOct;
    playTone(scene.bus, p.arpWave, 220 * 2 ** (semi / 12), t, dur * 0.9, p.arpGain);
  }
  if (p.drums) {
    if (step % 4 === 0) playKick(scene.bus, t);
    else if (step % 2 === 1) playHat(scene.bus, t);
  }
}

function musicTick() {
  const c = ctx;
  if (!c || !musicMood || !musicScene || c.state !== 'running') return;
  if (nextStepTime < c.currentTime) nextStepTime = c.currentTime + 0.05; // catch up after timer throttling
  const horizon = c.currentTime + LOOKAHEAD;
  while (nextStepTime < horizon && musicScene && musicMood) {
    const dur = stepSeconds(musicScene.palette, musicMood);
    scheduleStep(musicStep, nextStepTime, musicScene, musicMood, dur);
    musicStep++;
    nextStepTime += dur;
  }
}

function startMusic() {
  const c = getCtx();
  if (!c || !musicMood || !ensureMusicBus(c)) return;
  if (!droneOsc && musicBus) {
    droneOsc = c.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 880;
    droneGain = c.createGain();
    droneGain.gain.value = 0;
    droneOsc.connect(droneGain);
    droneGain.connect(musicBus);
    voiceStart(droneOsc);
    droneOsc.start();
    droneGain.gain.setTargetAtTime(musicMood.asiRace ? 0.02 : 0, c.currentTime, 0.7);
  }
  updateScene();
  if (!musicTimer) {
    nextStepTime = c.currentTime + 0.1;
    musicTimer = setInterval(musicTick, 100);
    musicTick();
  }
}

function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  const c = ctx;
  if (c) {
    const t = c.currentTime;
    const scenes = musicScene ? [...fadingScenes, musicScene] : [...fadingScenes];
    for (const s of scenes) {
      const g = s.bus.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0, t + 0.3);
      stopScene(s, t, 0.35);
      setTimeout(() => { try { s.bus.disconnect(); } catch { /* ignore */ } }, 500);
    }
    if (droneOsc) {
      try { droneOsc.stop(t + 0.35); } catch { /* ignore */ }
    }
  }
  musicScene = null;
  fadingScenes = [];
  droneOsc = null;
  droneGain = null;
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
 * @param src Path to MP3 file (e.g. './assets/sounds/plane-1960.mp3')
 * @param volume Volume 0.0-1.0 (default 0.2)
 * @param allowOverlap If false, won't play if same sound already playing (default false)
 */
export function playSfx(src: string, volume = 0.2, allowOverlap = false) {
  if (!enabled) return;
  const st = getSettings();
  if (!st.sfx || st.masterVolume <= 0) return;
  if (!allowOverlap && sfxPlaying[src]) return;
  const audio = getSfx(src);
  if (!audio) return;
  audio.volume = Math.max(0, Math.min(1, volume * st.masterVolume));
  audio.currentTime = 0;
  sfxPlaying[src] = true;
  audio.play().catch(() => {});
  audio.onended = () => { sfxPlaying[src] = false; };
}
