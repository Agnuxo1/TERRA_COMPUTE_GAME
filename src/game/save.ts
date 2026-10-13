// Save games live in localStorage. Everything in GameState is plain data, so a save is just JSON.
import { initialState, reseed } from './engine.ts';
import type { GameState } from './types.ts';

const VERSION = 2;
const PREFIX = 'terra_compute_save_';
export const SLOTS = ['auto', '1', '2', '3'] as const;
export type SaveSlot = (typeof SLOTS)[number];

export interface SaveMeta {
  slot: SaveSlot;
  savedAt: number;
  year: number;
  continent: string | null;
  mode: GameState['gameMode'];
  difficulty: GameState['difficulty'];
  capability: number;
}

interface SaveFile {
  version: number;
  meta: SaveMeta;
  state: GameState;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState, slot: SaveSlot): boolean {
  const ls = storage();
  if (!ls || state.screen !== 'game') return false;
  const meta: SaveMeta = {
    slot, savedAt: Date.now(), year: Math.floor(state.year), continent: state.playerContinent,
    mode: state.gameMode, difficulty: state.difficulty, capability: state.capability,
  };
  // Transient UI bits are not worth saving.
  const clean: GameState = { ...state, notifications: [], placing: null, selectedTile: null, overlay: null, paused: true };
  try {
    ls.setItem(PREFIX + slot, JSON.stringify({ version: VERSION, meta, state: clean } satisfies SaveFile));
    return true;
  } catch {
    return false;
  }
}

export function listSaves(): SaveMeta[] {
  const ls = storage();
  if (!ls) return [];
  const out: SaveMeta[] = [];
  for (const slot of SLOTS) {
    try {
      const raw = ls.getItem(PREFIX + slot);
      if (!raw) continue;
      const f = JSON.parse(raw) as SaveFile;
      if (f.version === VERSION) out.push(f.meta);
    } catch {
      // ignore corrupt slot
    }
  }
  return out;
}

export function loadGame(slot: SaveSlot): GameState | null {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(PREFIX + slot);
    if (!raw) return null;
    const f = JSON.parse(raw) as SaveFile;
    if (f.version !== VERSION) return null;
    reseed((f.state.seed ^ (f.state.tickCount * 2654435761)) >>> 0);
    // Fill fields added after the save was written.
    return { ...initialState, ...f.state, screen: 'game', paused: true };
  } catch {
    return null;
  }
}

export function deleteSave(slot: SaveSlot) {
  storage()?.removeItem(PREFIX + slot);
}
