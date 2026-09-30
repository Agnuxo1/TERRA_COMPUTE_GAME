// Perceptron Trainer: datasets, scoring and Rosenblatt update (no React/DOM).
import { mulberry32 } from './rng.ts';

export type Difficulty = 1 | 2 | 3;

export const DOMAIN = 5; // points live in [-DOMAIN, DOMAIN]^2
export const W_MIN = -5;
export const W_MAX = 5;
export const W_STEP = 0.5;
export const B_MIN = -10;
export const B_MAX = 10;
export const B_STEP = 0.5;
export const ROUNDS = 3;
export const ENERGY = 8;
export const ACTION_BUDGET = 40;
export const TRAIN_RATE = 0.25;

export interface Point { x: number; y: number; label: 1 | -1 }
export interface Params { w1: number; w2: number; b: number }

export interface PerceptronConfig {
  points: number;
  margin: number; // minimum geometric distance from the hidden line
  star3: number; // actions <= this -> 3 stars for a round
  star2: number;
}

const CONFIGS: Record<Difficulty, PerceptronConfig> = {
  1: { points: 10, margin: 0.9, star3: 6, star2: 12 },
  2: { points: 16, margin: 0.55, star3: 8, star2: 16 },
  3: { points: 24, margin: 0.3, star3: 10, star2: 20 },
};

export const perceptronConfig = (d: Difficulty): PerceptronConfig => CONFIGS[d];

export interface Dataset {
  points: Point[];
  hidden: Params;
  start: Params;
}

export const START: Params = { w1: 1, w2: 0, b: 0 };

export const predict = (p: Params, pt: { x: number; y: number }): 1 | -1 =>
  p.w1 * pt.x + p.w2 * pt.y + p.b > 0 ? 1 : -1;

export const misclassified = (p: Params, pts: readonly Point[]): number[] =>
  pts.flatMap((pt, i) => (predict(p, pt) === pt.label ? [] : [i]));

export const accuracy = (p: Params, pts: readonly Point[]): number =>
  1 - misclassified(p, pts).length / pts.length;

const round2 = (v: number) => Math.round(v * 100) / 100;

/** One Rosenblatt update on the first misclassified point; null when already perfect. */
export function trainStep(p: Params, pts: readonly Point[]): Params | null {
  const idx = misclassified(p, pts)[0];
  if (idx === undefined) return null;
  const { x, y, label } = pts[idx];
  return {
    w1: round2(p.w1 + TRAIN_RATE * label * x),
    w2: round2(p.w2 + TRAIN_RATE * label * y),
    b: round2(p.b + TRAIN_RATE * label),
  };
}

export function generateDataset(d: Difficulty, seed: number): Dataset {
  const cfg = CONFIGS[d];
  const rng = mulberry32(seed * 7919 + d);
  const gridW = () => Math.floor(rng() * ((W_MAX - W_MIN) / W_STEP + 1)) * W_STEP + W_MIN;
  for (let attempt = 0; attempt < 2000; attempt++) {
    const hidden: Params = {
      w1: gridW(),
      w2: gridW(),
      b: Math.round((rng() * 2 - 1) * 10 * 2) / 2,
    };
    const norm = Math.hypot(hidden.w1, hidden.w2);
    // The line must cross the middle of the plot.
    if (norm < 1.5 || Math.abs(hidden.b) / norm > 2.2) continue;
    const pts: Point[] = [];
    let pos = 0;
    let neg = 0;
    const need = Math.floor(cfg.points / 2) - 1;
    let guard = 0;
    while (pts.length < cfg.points && guard++ < 5000) {
      const x = Math.round((rng() * 2 - 1) * (DOMAIN - 0.2) * 10) / 10;
      const y = Math.round((rng() * 2 - 1) * (DOMAIN - 0.2) * 10) / 10;
      const s = hidden.w1 * x + hidden.w2 * y + hidden.b;
      if (Math.abs(s) / norm < cfg.margin) continue;
      const label: 1 | -1 = s > 0 ? 1 : -1;
      // keep the classes roughly balanced
      if (label === 1 ? pos >= cfg.points - need : neg >= cfg.points - need) continue;
      // avoid stacking points
      if (pts.some(q => Math.hypot(q.x - x, q.y - y) < 0.45)) continue;
      pts.push({ x, y, label });
      if (label === 1) pos++; else neg++;
    }
    if (pts.length < cfg.points || pos < need || neg < need) continue;
    // the starting line must not already be (nearly) perfect
    if (misclassified(START, pts).length < 3) continue;
    return { points: pts, hidden, start: { ...START } };
  }
  throw new Error('could not generate dataset');
}

/** Brute force over the slider grid: parameters of a perfect separator, or null. */
export function findGridSolution(pts: readonly Point[]): Params | null {
  for (let w1 = W_MIN; w1 <= W_MAX; w1 += W_STEP)
    for (let w2 = W_MIN; w2 <= W_MAX; w2 += W_STEP)
      for (let b = B_MIN; b <= B_MAX; b += B_STEP)
        if (misclassified({ w1, w2, b }, pts).length === 0) return { w1, w2, b };
  return null;
}

/** Rosenblatt updates needed to reach a perfect separator (Infinity if above cap). */
export function rosenblattStepsToConverge(start: Params, pts: readonly Point[], cap = 5000): number {
  let p = start;
  for (let n = 0; n <= cap; n++) {
    const next = trainStep(p, pts);
    if (!next) return n;
    p = next;
  }
  return Infinity;
}

export function starsForActions(d: Difficulty, actions: number): 1 | 2 | 3 {
  const cfg = CONFIGS[d];
  return actions <= cfg.star3 ? 3 : actions <= cfg.star2 ? 2 : 1;
}

/** Final game stars: average of rounds (failed round = 0), rounded down. */
export function finalStars(rounds: readonly number[]): 0 | 1 | 2 | 3 {
  const avg = rounds.reduce((a, b) => a + b, 0) / Math.max(1, rounds.length);
  return Math.floor(avg + 1e-9) as 0 | 1 | 2 | 3;
}

interface V { x: number; y: number }

/** Clip a convex polygon to the half-plane sign*(w1 x + w2 y + b) >= 0. */
export function clipHalfPlane(poly: readonly V[], p: Params, sign: 1 | -1): V[] {
  const f = (v: V) => sign * (p.w1 * v.x + p.w2 * v.y + p.b);
  const out: V[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const c = poly[(i + 1) % poly.length];
    const fa = f(a);
    const fc = f(c);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fc >= 0) {
      const t = fa / (fa - fc);
      out.push({ x: a.x + t * (c.x - a.x), y: a.y + t * (c.y - a.y) });
    }
  }
  return out;
}

/** Segment of the decision line inside the plot square (for drawing), or null. */
export function lineSegment(p: Params, r = DOMAIN + 1): [V, V] | null {
  const pts: V[] = [];
  const add = (x: number, y: number) => {
    if (Math.abs(x) <= r + 1e-9 && Math.abs(y) <= r + 1e-9 && !pts.some(q => Math.hypot(q.x - x, q.y - y) < 1e-6)) pts.push({ x, y });
  };
  if (Math.abs(p.w2) > 1e-9) { add(-r, (-p.b + p.w1 * r) / p.w2); add(r, (-p.b - p.w1 * r) / p.w2); }
  if (Math.abs(p.w1) > 1e-9) { add((-p.b + p.w2 * r) / p.w1, -r); add((-p.b - p.w2 * r) / p.w1, r); }
  return pts.length >= 2 ? [pts[0], pts[1]] : null;
}
