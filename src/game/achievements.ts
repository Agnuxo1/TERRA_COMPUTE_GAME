// Achievements, evaluated once from the final GameState of a finished game.
// Unlocks persist in localStorage as { id: unlockedAt (ms) }.
import type { BuildingId, GameState } from './types.ts';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (s: GameState) => boolean;
}

const won = (s: GameState) => s.outcome === 'safe_asi';

function countBuildings(s: GameState, types: BuildingId[]): number {
  if (!s.map) return 0;
  let n = 0;
  for (const t of s.map.tiles) {
    if (t.building && t.building.progress >= 1 && types.includes(t.building.type)) n++;
  }
  return n;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'safe_landing', name: 'Safe Landing', icon: '◆', description: 'Ignite a safe superintelligence.', check: won },
  { id: 'green_superpower', name: 'Green Superpower', icon: '❀', description: 'Win with planet health at 70% or more.', check: s => won(s) && s.planetHealth >= 70 },
  { id: 'before_2030', name: 'Before 2030', icon: '⏱', description: 'Win before the year 2030.', check: s => won(s) && s.victoryYear > 0 && s.victoryYear < 2030 },
  { id: 'ironclad', name: 'Ironclad', icon: '⛨', description: 'Win with alignment at 95% or more.', check: s => won(s) && s.alignment >= 95 },
  { id: 'against_odds', name: 'Against All Odds', icon: '☠', description: 'Win on HARD difficulty.', check: s => won(s) && s.difficulty === 'hard' },
  { id: 'full_history', name: 'The Long Century', icon: '⌛', description: 'Win in COMPLETE mode, starting from 1960.', check: s => won(s) && s.gameMode === 'complete' },
  { id: 'beloved', name: 'People’s Champion', icon: '☺', description: 'Win with public approval at 75% or more.', check: s => won(s) && s.approval >= 75 },
  { id: 'spymaster', name: 'Spymaster', icon: '👁', description: 'End a game with live intelligence on every rival bloc.', check: s => s.rivals.length > 0 && s.rivals.every(r => r.intelUntil >= s.year) },
  { id: 'five_treaties', name: 'Five Treaties', icon: '✍', description: 'Hold 5 or more treaties at the end of a game.', check: s => s.rivals.reduce((n, r) => n + r.treaties.length, 0) >= 5 },
  { id: 'full_marks', name: 'Full Marks', icon: '★', description: 'Earn 3 stars in 5 different exercises.', check: s => Object.values(s.minigameResults).filter(v => v >= 3).length >= 5 },
  { id: 'steel_empire', name: 'Steel Empire', icon: '⚒', description: 'Run 6 or more kombinats (factories) at once.', check: s => countBuildings(s, ['factory']) >= 6 },
  { id: 'clean_grid', name: 'Clean Grid', icon: '☀', description: 'End with 5+ clean power plants and no coal.', check: s => countBuildings(s, ['solar', 'nuclear', 'fusion']) >= 5 && countBuildings(s, ['coal']) === 0 },
  { id: 'master_builder', name: 'Master Builder', icon: '▦', description: 'Construct 60 buildings in one game.', check: s => s.totalBuildings >= 60 },
  { id: 'tech_titan', name: 'Tech Titan', icon: '⚛', description: 'Research 25 technologies in one game.', check: s => s.totalTechs >= 25 },
  { id: 'yottaflop', name: 'YottaFLOP', icon: '⚡', description: 'Reach 10^24 FLOPS of compute.', check: s => s.peakCapability >= 24 },
];

const KEY = 'terra_compute_achievements';

function readStore(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return v && typeof v === 'object' ? (v as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeStore(v: Record<string, number>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // storage unavailable
  }
}

/** id → unlock timestamp (ms). */
export function getUnlocked(): Record<string, number> {
  return readStore();
}

// Same final state evaluated twice (StrictMode, remounts) returns the same answer.
const cache = new WeakMap<GameState, Achievement[]>();

/** Checks a finished game, persists new unlocks and returns the achievements unlocked by it. */
export function evaluate(state: GameState): Achievement[] {
  const hit = cache.get(state);
  if (hit) return hit;
  const store = readStore();
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    let ok = false;
    try {
      ok = a.check(state);
    } catch {
      ok = false;
    }
    if (ok && !store[a.id]) {
      store[a.id] = Date.now();
      fresh.push(a);
    }
  }
  if (fresh.length) writeStore(store);
  cache.set(state, fresh);
  return fresh;
}

/** Achievements this state satisfies, whether new or earned before. */
export function earnedBy(state: GameState): Achievement[] {
  return ACHIEVEMENTS.filter(a => {
    try {
      return a.check(state);
    } catch {
      return false;
    }
  });
}
