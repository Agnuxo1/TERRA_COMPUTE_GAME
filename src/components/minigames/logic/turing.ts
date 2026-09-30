// Bombe Codebreaker: Mastermind logic (no React/DOM).
import { mulberry32 } from './rng.ts';

export const CODE_LEN = 4;
export type Difficulty = 1 | 2 | 3;

export interface TuringConfig {
  symbols: number;
  repeats: boolean;
  maxAttempts: number;
  /** solved in <= this many attempts -> 3 stars */
  star3: number;
  /** solved in <= this many attempts -> 2 stars */
  star2: number;
}

const CONFIGS: Record<Difficulty, TuringConfig> = {
  1: { symbols: 6, repeats: false, maxAttempts: 10, star3: 5, star2: 7 },
  2: { symbols: 6, repeats: true, maxAttempts: 9, star3: 6, star2: 7 },
  3: { symbols: 8, repeats: true, maxAttempts: 9, star3: 6, star2: 8 },
};

export const turingConfig = (d: Difficulty): TuringConfig => CONFIGS[d];

export const symbolLabel = (i: number): string => String.fromCharCode(65 + i);

export function generateSecret(d: Difficulty, seed: number): number[] {
  const cfg = CONFIGS[d];
  const rng = mulberry32(seed);
  const out: number[] = [];
  while (out.length < CODE_LEN) {
    const s = Math.floor(rng() * cfg.symbols);
    if (!cfg.repeats && out.includes(s)) continue;
    out.push(s);
  }
  return out;
}

export interface Feedback {
  /** right symbol, right rotor */
  exact: number;
  /** right symbol, wrong rotor */
  partial: number;
}

/** Standard Mastermind scoring; duplicates are counted once per available secret symbol. */
export function scoreGuess(secret: readonly number[], guess: readonly number[]): Feedback {
  let exact = 0;
  const sCount = new Map<number, number>();
  const gCount = new Map<number, number>();
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) exact++;
    else {
      sCount.set(secret[i], (sCount.get(secret[i]) ?? 0) + 1);
      gCount.set(guess[i], (gCount.get(guess[i]) ?? 0) + 1);
    }
  }
  let partial = 0;
  for (const [sym, n] of gCount) partial += Math.min(n, sCount.get(sym) ?? 0);
  return { exact, partial };
}

export function isValidGuess(d: Difficulty, guess: readonly number[]): boolean {
  const cfg = CONFIGS[d];
  if (guess.length !== CODE_LEN) return false;
  if (guess.some(g => g < 0 || g >= cfg.symbols)) return false;
  return cfg.repeats || new Set(guess).size === CODE_LEN;
}

export function starsForAttempts(d: Difficulty, attempts: number): 1 | 2 | 3 {
  const cfg = CONFIGS[d];
  return attempts <= cfg.star3 ? 3 : attempts <= cfg.star2 ? 2 : 1;
}

export function allCodes(d: Difficulty): number[][] {
  const cfg = CONFIGS[d];
  const out: number[][] = [];
  const rec = (cur: number[]) => {
    if (cur.length === CODE_LEN) { out.push(cur.slice()); return; }
    for (let s = 0; s < cfg.symbols; s++) {
      if (!cfg.repeats && cur.includes(s)) continue;
      cur.push(s);
      rec(cur);
      cur.pop();
    }
  };
  rec([]);
  return out;
}

export interface GuessRecord { guess: number[]; fb: Feedback }

/**
 * Reference solver: fixed opening, then among the codes consistent with all feedback so far
 * pick (from a bounded sample (~24)) the one whose worst-case feedback bucket is smallest.
 */
export function solverNextGuess(d: Difficulty, history: readonly GuessRecord[], codes: number[][]): number[] {
  if (history.length === 0) return d === 1 ? [0, 1, 2, 3] : d === 2 ? [0, 0, 1, 1] : [0, 0, 1, 2];
  const consistent = codes.filter(cand =>
    history.every(h => {
      const f = scoreGuess(cand, h.guess);
      return f.exact === h.fb.exact && f.partial === h.fb.partial;
    }),
  );
  if (consistent.length === 0) throw new Error('no consistent code');
  const step = Math.max(1, Math.floor(consistent.length / 24));
  let best = consistent[0];
  let bestWorst = Infinity;
  for (let i = 0; i < consistent.length; i += step) {
    const buckets = new Map<number, number>();
    for (const other of consistent) {
      const f = scoreGuess(other, consistent[i]);
      const k = f.exact * 10 + f.partial;
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    const worst = Math.max(...buckets.values());
    if (worst < bestWorst) { bestWorst = worst; best = consistent[i]; }
  }
  return best;
}

export function solve(d: Difficulty, secret: readonly number[], codes = allCodes(d)): number {
  const history: GuessRecord[] = [];
  for (let n = 1; n <= 30; n++) {
    const g = solverNextGuess(d, history, codes);
    const fb = scoreGuess(secret, g);
    if (fb.exact === CODE_LEN) return n;
    history.push({ guess: g, fb });
  }
  return Infinity;
}
