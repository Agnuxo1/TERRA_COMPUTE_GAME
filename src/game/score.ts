// End-of-game score and rank: rewards winning early, safely, with a living planet and a content people.
import type { GameState } from './types';

export interface ScoreLine { label: string; points: number }
export interface FinalScore { total: number; raw: number; rank: 'S' | 'A' | 'B' | 'C' | 'D'; title: string; lines: ScoreLine[]; mult: number }

const DIFF_MULT = { easy: 0.8, normal: 1, hard: 1.3 } as const;
const MODE_MULT: Record<string, number> = { pioneer: 0.6, strategist: 0.9, complete: 1 };

export function finalScore(s: GameState): FinalScore {
  const won = s.outcome === 'safe_asi';
  const year = s.victoryYear || Math.floor(s.year);
  const lines: ScoreLine[] = [
    { label: won ? 'Safe superintelligence' : 'Race lost', points: won ? 4000 : 0 },
    { label: won ? `Ignited in ${year}` : 'Time survived', points: won ? Math.max(0, 2040 - year) * 180 : Math.max(0, Math.min(year, 2040) - (s.startYear || 1960)) * 20 },
    { label: 'Peak compute', points: Math.round(Math.max(0, (s.peakCapability ?? 6) - 6) * 90) },
    { label: `Alignment ${Math.round(s.alignment)}%`, points: Math.round(s.alignment * 12) },
    { label: `Planet health ${Math.round(s.planetHealth)}%`, points: Math.round(s.planetHealth * 15) },
    { label: `Approval ${Math.round(s.approval)}%`, points: Math.round(s.approval * 8) },
    { label: `${s.unlockedTechs?.length ?? 0} technologies`, points: (s.unlockedTechs?.length ?? 0) * 15 },
  ];
  const mult = (DIFF_MULT[s.difficulty] ?? 1) * (MODE_MULT[s.gameMode ?? 'complete'] ?? 1);
  // The rank judges the game itself (any mode, any difficulty); the multiplier only weighs the faction record.
  const raw = lines.reduce((a, l) => a + (Number.isFinite(l.points) ? l.points : 0), 0);
  const total = Math.round(raw * mult);
  const rank = raw >= 11500 ? 'S' : raw >= 9800 ? 'A' : raw >= 7500 ? 'B' : raw >= 5000 ? 'C' : 'D';
  const title = won
    ? { S: 'Architect of the Future', A: 'Steward of the Singularity', B: 'Careful Pioneer', C: 'Lucky Winner', D: 'Pyrrhic Victory' }[rank]
    : { S: 'Noble Runner-up', A: 'Noble Runner-up', B: 'Respected Contender', C: 'Footnote of History', D: 'Cautionary Tale' }[rank];
  return { total, raw, rank, title, lines, mult };
}

const BEST_KEY = 'terra_compute_best';
export interface BestRecord { score: number; rank: string; year: number; won: boolean }

export function loadBest(): Record<string, BestRecord> {
  try { const v = JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

/** Saves the score if it beats the faction's record; returns true when it is a new record. */
export function recordBest(continent: string, sc: FinalScore, s: GameState): boolean {
  const all = loadBest();
  const prev = all[continent];
  if (prev && prev.score >= sc.total) return false;
  all[continent] = { score: sc.total, rank: sc.rank, year: s.victoryYear || Math.floor(s.year), won: s.outcome === 'safe_asi' };
  try { localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
  return true;
}
