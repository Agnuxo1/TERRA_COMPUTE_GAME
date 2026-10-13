// Player settings, persisted in localStorage. Tiny external store so React and plain modules
// (audio, map scrolling) read the same values and components re-render on change.
import { useSyncExternalStore } from 'react';

export type AutosaveYears = 0 | 1 | 2 | 5;

export interface Settings {
  masterVolume: number;   // 0..1
  sfx: boolean;
  ambient: boolean;
  edgeScroll: boolean;
  scrollSpeed: number;    // 0.5..2
  dayNight: boolean;
  autosaveYears: AutosaveYears;
  reduceMotion: boolean;
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
};

const KEY = 'terra_compute_settings';
const AUTOSAVE_CHOICES: AutosaveYears[] = [0, 1, 2, 5];

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function sanitize(raw: Partial<Settings> | null | undefined): Settings {
  const r = raw ?? {};
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
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
