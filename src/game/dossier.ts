// Faction dossier: per-faction game history kept in localStorage (terra_compute_dossier).
// Records one entry per finished game; a seen-key list stops re-renders or reloads from recording twice.
import { t } from '../i18n/index.ts';
import { finalScore } from './score.ts';
import { isVictory, type GameState } from './types.ts';

const KEY = 'terra_compute_dossier';
const MAX_RESULTS = 10;
const MAX_SEEN = 40;

export interface DossierResult {
  at: number;
  outcome: string;
  won: boolean;
  year: number;
  mode: string;
  score: number;
  scenario?: string;
  challenge?: string;
}
export interface FactionDossier { games: number; wins: number; bestScore: number; results: DossierResult[] }
interface Store { factions: Record<string, FactionDossier>; seen: string[] }

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
      factions: v && typeof v.factions === 'object' && v.factions ? v.factions : {},
      seen: v && Array.isArray(v.seen) ? v.seen.filter(x => typeof x === 'string') : [],
    };
  } catch {
    return { factions: {}, seen: [] };
  }
}

function writeStore(v: Store) {
  try {
    storage()?.setItem(KEY, JSON.stringify(v));
  } catch {
    // storage unavailable
  }
}

/** Stable fingerprint of a finished game (same game, same key). */
export function gameKey(s: GameState): string {
  return [
    s.seed, s.startYear, s.mp?.me ?? s.playerContinent ?? '', s.outcome ?? '',
    s.victoryYear || Math.floor(s.year), s.totalBuildings, s.totalTechs, s.tickCount, s.difficulty,
  ].join('|');
}

const recorded = new WeakSet<GameState>();

/** Adds the finished game to its faction's dossier. Returns true when a new entry was written. */
export function recordFinishedGame(state: GameState): boolean {
  if (recorded.has(state)) return false;
  recorded.add(state);
  const faction = state.mp?.me ?? state.playerContinent;
  if (!faction) return false;
  const key = gameKey(state);
  const store = readStore();
  if (store.seen.includes(key)) return false;

  const won = isVictory(state.outcome);
  const score = finalScore(state).total;
  const prev: FactionDossier = store.factions[faction] ?? { games: 0, wins: 0, bestScore: 0, results: [] };
  const result: DossierResult = {
    at: Date.now(),
    outcome: state.outcome ?? 'none',
    won,
    year: state.victoryYear || Math.floor(state.year),
    mode: state.gameMode ?? 'complete',
    score,
  };
  if (state.scenario) result.scenario = state.scenario;
  if (state.challenge) result.challenge = state.challenge;

  store.factions[faction] = {
    games: prev.games + 1,
    wins: prev.wins + (won ? 1 : 0),
    bestScore: Math.max(prev.bestScore, score),
    results: [...prev.results, result].slice(-MAX_RESULTS),
  };
  store.seen = [...store.seen, key].slice(-MAX_SEEN);
  writeStore(store);
  return true;
}

/** Dossier rows for the achievements view, most played faction first. */
export function dossierRows(): Array<{ faction: string; dossier: FactionDossier }> {
  return Object.entries(readStore().factions)
    .filter(([, d]) => d && d.games > 0)
    .map(([faction, dossier]) => ({ faction, dossier }))
    .sort((a, b) => b.dossier.games - a.dossier.games);
}

/** Translated outcome names (built at call time so the active language applies). */
export function outcomeLabel(outcome: string): string {
  const map: Record<string, string> = {
    safe_asi: t('Safe superintelligence'),
    governance: t('World Assembly victory'),
    silicon: t('Silicon hegemony'),
    custodian: t('Shared custody'),
    rival_asi: t('A rival ignited first'),
    rogue_rival: t('Rogue superintelligence'),
    rogue_self: t('Misaligned ignition'),
    climate: t('Planetary collapse'),
    revolution: t('Revolution'),
    bankrupt: t('Bankruptcy'),
    timeout: t('Window closed'),
  };
  return map[outcome] ?? t('Unfinished');
}

/** Translated scenario names for the dossier chips. */
export function scenarioLabel(id: string): string {
  const map: Record<string, string> = {
    cuban_missiles: t('Thirteen Days'),
    cold_war_end: t('The Wall Falls'),
    deep_learning: t('The Deep Learning Revolution'),
    world_on_fire: t('World on Fire'),
    uchronia: t('Uchronia: the Union Endures'),
  };
  return map[id] ?? id;
}
