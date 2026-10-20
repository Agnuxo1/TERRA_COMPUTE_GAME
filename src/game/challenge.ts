// Daily and weekly challenges. An id (daily-YYYY-MM-DD or weekly-YYYY-Www, UTC) fixes the seed, continent,
// difficulty and 1-2 rule mods, so every player gets the same world. Result codes carry a checksum:
// tamper-evident (a friend's edited code fails), not secret. Local best scores live in terra_compute_challenges.
import { continents } from './data.ts';
import { recordFinishedGame, gameKey } from './dossier.ts';
import { mulberry32 } from './rng.ts';
import { finalScore } from './score.ts';
import { isVictory, type Difficulty, type GameMods, type GameState } from './types.ts';

export type ChallengeKind = 'daily' | 'weekly';

export interface ChallengeSpec {
  id: string;
  kind: ChallengeKind;
  /** English summary of the rules, e.g. "No coal + Hostile AI". */
  title: string;
  /** English rule labels, one per mod. Wrap with t() where shown. */
  modLabels: string[];
  seed: number;
  continentId: string;
  difficulty: Difficulty;
  mods: GameMods;
}

export interface ChallengeModDef { key: string; label: string; mods: GameMods }

/** Fixed pool the challenges draw their rules from. */
export const CHALLENGE_MODS: ChallengeModDef[] = [
  { key: 'no_coal', label: 'No coal', mods: { noCoal: true } },
  { key: 'chips_triple', label: 'Chips at triple price', mods: { chipPrice: 3 } },
  { key: 'fragile_planet', label: 'Fragile planet', mods: { fragilePlanet: true } },
  { key: 'fast_history', label: 'Fast history', mods: { pace: 1.25 } },
  { key: 'hostile_ai', label: 'Hostile AI', mods: { aiAggression: 1.4 } },
  { key: 'no_dynamic', label: 'No dynamic events', mods: { noDynamicEvents: true } },
];

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

/** FNV-1a 32-bit hash. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Today's daily id, in UTC. */
export function dailyId(date: Date = new Date()): string {
  return `daily-${date.toISOString().slice(0, 10)}`;
}

/** This ISO week's id, in UTC: weekly-YYYY-Www. */
export function weeklyId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const isoDay = d.getUTCDay() || 7;          // Mon = 1 … Sun = 7
  d.setUTCDate(d.getUTCDate() + 4 - isoDay);  // the Thursday of this ISO week decides the year
  const year = d.getUTCFullYear();
  const week = Math.floor((d.getTime() - Date.UTC(year, 0, 1)) / 86400000 / 7) + 1;
  return `weekly-${year}-W${String(week).padStart(2, '0')}`;
}

/** Deterministic challenge definition for an id. */
export function challengeSpec(id: string): ChallengeSpec {
  const kind: ChallengeKind = id.startsWith('weekly-') ? 'weekly' : 'daily';
  const rand = mulberry32(fnv1a(id));
  const continentId = continents[Math.floor(rand() * continents.length)].id;
  const difficulty = DIFFICULTIES[Math.floor(rand() * DIFFICULTIES.length)];
  const seed = 1 + Math.floor(rand() * 999998);
  const first = Math.floor(rand() * CHALLENGE_MODS.length);
  const picks = [CHALLENGE_MODS[first]];
  if (rand() < 0.5) {
    const second = (first + 1 + Math.floor(rand() * (CHALLENGE_MODS.length - 1))) % CHALLENGE_MODS.length;
    picks.push(CHALLENGE_MODS[second]);
  }
  const mods = picks.reduce<GameMods>((m, p) => ({ ...m, ...p.mods }), {});
  const modLabels = picks.map(p => p.label);
  return { id, kind, title: modLabels.join(' + '), modLabels, seed, continentId, difficulty, mods };
}

// ─── Result codes ─────────────────────────────────────────────────────────────
const CODE_PREFIX = 'TC1';
/** Id used in codes for games started without a challenge. */
export const FREE_ID = 'free';

function checksum(id: string, outcome: string, year: number, score: number): string {
  return fnv1a(`${id}|${outcome}|${year}|${score}`).toString(16).padStart(8, '0');
}

/** Shareable code: TC1:<challenge id>:<outcome>:<final year>:<score>:<checksum>. */
export function resultCode(state: GameState): string {
  const id = state.challenge || FREE_ID;
  const outcome = state.outcome ?? 'none';
  const year = state.victoryYear || Math.floor(state.year);
  const score = finalScore(state).total;
  return [CODE_PREFIX, id, outcome, year, score, checksum(id, outcome, year, score)].join(':');
}

export type CodeCheck =
  | { ok: true; id: string; outcome: string; year: number; score: number; won: boolean }
  | { ok: false; reason: 'format' | 'checksum' };

/** Checks a pasted code. Detects malformed text and edited fields (checksum mismatch). */
export function verifyCode(code: string): CodeCheck {
  const parts = code.trim().toLowerCase().split(':');
  if (parts.length !== 6 || parts[0] !== CODE_PREFIX.toLowerCase()) return { ok: false, reason: 'format' };
  const [, id, outcome, yearS, scoreS, sum] = parts;
  if (!/^[a-z0-9_-]{1,40}$/.test(id) || !/^[a-z_]{1,20}$/.test(outcome)) return { ok: false, reason: 'format' };
  if (!/^\d{4}$/.test(yearS) || !/^\d{1,9}$/.test(scoreS)) return { ok: false, reason: 'format' };
  const year = Number(yearS);
  const score = Number(scoreS);
  if (sum !== checksum(id, outcome, year, score)) return { ok: false, reason: 'checksum' };
  return { ok: true, id, outcome, year, score, won: isVictory(outcome as GameState['outcome']) };
}

// ─── Local bests and recording ───────────────────────────────────────────────
const KEY = 'terra_compute_challenges';
const MAX_SEEN = 40;

export interface ChallengeBest { score: number; won: boolean; outcome: string; year: number; code: string }
interface Store { best: Record<string, ChallengeBest>; seen: string[] }

function storage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function readStore(): Store {
  try {
    const raw = storage()?.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Store>) : null;
    return {
      best: v && typeof v.best === 'object' && v.best ? v.best : {},
      seen: v && Array.isArray(v.seen) ? v.seen.filter(x => typeof x === 'string') : [],
    };
  } catch {
    return { best: {}, seen: [] };
  }
}

function writeStore(v: Store) {
  try {
    storage()?.setItem(KEY, JSON.stringify(v));
  } catch {
    // storage unavailable
  }
}

/** Best local result for a challenge id, if any. */
export function bestFor(id: string): ChallengeBest | null {
  return readStore().best[id] ?? null;
}

export interface ChallengeFinish { id: string; code: string; score: number; won: boolean; best: boolean }

const finished = new WeakMap<GameState, ChallengeFinish | null>();

/**
 * Records a finished challenge game once (memoised per state object) and returns its code.
 * Also records the faction dossier entry. Returns null for games without a challenge.
 */
export function finishChallengeGame(state: GameState): ChallengeFinish | null {
  if (finished.has(state)) return finished.get(state) ?? null;
  recordFinishedGame(state);
  const id = state.challenge;
  if (!id) {
    finished.set(state, null);
    return null;
  }
  const code = resultCode(state);
  const score = finalScore(state).total;
  const won = isVictory(state.outcome);
  const store = readStore();
  const key = gameKey(state);
  let best = false;
  if (!store.seen.includes(key)) {
    const prev = store.best[id];
    best = !prev || (won && !prev.won) || (won === prev.won && score > prev.score);
    if (best) store.best[id] = { score, won, outcome: state.outcome ?? 'none', year: state.victoryYear || Math.floor(state.year), code };
    store.seen = [...store.seen, key].slice(-MAX_SEEN);
    writeStore(store);
  }
  const res: ChallengeFinish = { id, code, score, won, best };
  finished.set(state, res);
  return res;
}
