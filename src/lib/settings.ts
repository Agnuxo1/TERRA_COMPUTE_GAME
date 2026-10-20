// Player settings, persisted in localStorage. Tiny external store so React and plain modules
// (audio, map scrolling) read the same values and components re-render on change.
import { useSyncExternalStore } from 'react';

export type AutosaveYears = 0 | 1 | 2 | 5;
export type ColorblindMode = 'off' | 'deuteranopia' | 'protanopia' | 'tritanopia';
export type TextScale = 1 | 1.15 | 1.3;

export interface Settings {
  masterVolume: number;   // 0..1
  sfx: boolean;
  ambient: boolean;       // also gates the adaptive music
  edgeScroll: boolean;
  scrollSpeed: number;    // 0.5..2
  dayNight: boolean;
  autosaveYears: AutosaveYears;
  reduceMotion: boolean;
  yearReport: boolean;    // yearly summary card (Phase C1)
  colorblind: ColorblindMode;  // status-colour remap (src/lib/accessibility.ts)
  textScale: TextScale;        // root font-size multiplier
  subtitles: boolean;          // captions for voiced lines (read by VideoPlayer when present)
  turnUrl: string;             // optional TURN relay for multiplayer (empty = none)
  turnUser: string;
  turnCred: string;
}

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.7,
  sfx: true,
  ambient: true,
  edgeScroll: true,
  scrollSpeed: 1,
  dayNight: true,
  autosaveYears: 1,
  reduceMotion: false,
  yearReport: true,
  colorblind: 'off',
  textScale: 1,
  subtitles: true,
  turnUrl: '',
  turnUser: '',
  turnCred: '',
};

const KEY = 'terra_compute_settings';
const AUTOSAVE_CHOICES: AutosaveYears[] = [0, 1, 2, 5];
export const COLORBLIND_MODES: ColorblindMode[] = ['off', 'deuteranopia', 'protanopia', 'tritanopia'];
export const TEXT_SCALES: TextScale[] = [1, 1.15, 1.3];

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function sanitize(raw: Partial<Settings> | null | undefined): Settings {
  const r = raw ?? {};
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v.trim().slice(0, 200) : d);
  const auto = num(r.autosaveYears, DEFAULT_SETTINGS.autosaveYears);
  return {
    masterVolume: clamp(num(r.masterVolume, DEFAULT_SETTINGS.masterVolume), 0, 1),
    sfx: bool(r.sfx, DEFAULT_SETTINGS.sfx),
    ambient: bool(r.ambient, DEFAULT_SETTINGS.ambient),
    edgeScroll: bool(r.edgeScroll, DEFAULT_SETTINGS.edgeScroll),
    scrollSpeed: clamp(num(r.scrollSpeed, DEFAULT_SETTINGS.scrollSpeed), 0.5, 2),
    dayNight: bool(r.dayNight, DEFAULT_SETTINGS.dayNight),
    autosaveYears: (AUTOSAVE_CHOICES as number[]).includes(auto) ? (auto as AutosaveYears) : DEFAULT_SETTINGS.autosaveYears,
    reduceMotion: bool(r.reduceMotion, DEFAULT_SETTINGS.reduceMotion),
    yearReport: bool(r.yearReport, DEFAULT_SETTINGS.yearReport),
    colorblind: COLORBLIND_MODES.find(m => m === r.colorblind) ?? DEFAULT_SETTINGS.colorblind,
    textScale: TEXT_SCALES.find(v => v === r.textScale) ?? DEFAULT_SETTINGS.textScale,
    subtitles: bool(r.subtitles, DEFAULT_SETTINGS.subtitles),
    turnUrl: str(r.turnUrl, ''),
    turnUser: str(r.turnUser, ''),
    turnCred: str(r.turnCred, ''),
  };
}

function load(): Settings {
  try {
    const raw = window.localStorage.getItem(KEY);
    return sanitize(raw ? (JSON.parse(raw) as Partial<Settings>) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let current: Settings = load();
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return current;
}

export function setSettings(patch: Partial<Settings>): Settings {
  current = sanitize({ ...current, ...patch });
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // storage unavailable: keep in memory only
  }
  listeners.forEach(l => l());
  return current;
}

export function resetSettings(): Settings {
  return setSettings({ ...DEFAULT_SETTINGS });
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** React hook: current settings plus a setter; re-renders when any component changes them. */
export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const s = useSyncExternalStore(subscribeSettings, getSettings, getSettings);
  return [s, setSettings];
}
