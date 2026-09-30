// Integrated Circuit Router: spanning-tree rotation puzzle (no React/DOM).
import { mulberry32 } from './rng.ts';

export type Difficulty = 1 | 2 | 3;

// connection bits
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
const DIRS: { bit: number; opp: number; dr: number; dc: number }[] = [
  { bit: N, opp: S, dr: -1, dc: 0 },
  { bit: E, opp: W, dr: 0, dc: 1 },
  { bit: S, opp: N, dr: 1, dc: 0 },
  { bit: W, opp: E, dr: 0, dc: -1 },
];

export const sizeFor = (d: Difficulty): number => 4 + d;

/** Rotate a connection mask 90 degrees clockwise `k` times. */
export function rotMask(m: number, k: number): number {
  let r = m;
  for (let i = ((k % 4) + 4) % 4; i > 0; i--) r = ((r << 1) & 15) | ((r >> 3) & 1);
  return r;
}

export const bitCount = (m: number): number => ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1));

export type TileKind = 'end' | 'straight' | 'corner' | 'tee' | 'cross';
export function kindOf(m: number): TileKind {
  const c = bitCount(m);
  if (c === 1) return 'end';
  if (c === 3) return 'tee';
  if (c === 4) return 'cross';
  return m === (N | S) || m === (E | W) ? 'straight' : 'corner';
}

export interface MoorePuzzle {
  n: number;
  /** solved masks, row-major */
  sol: number[];
  /** initial clockwise turns applied to each tile (0..3) */
  scr: number[];
  source: number;
  /** minimal rotations (either direction) to reach a solved layout */
  par: number;
}

/** Current mask of a tile after `turns` additional clockwise quarter-turns. */
export const currentMask = (p: MoorePuzzle, i: number, turns: number): number => rotMask(p.sol[i], p.scr[i] + turns);

export function neighbors(n: number, i: number): { idx: number; bit: number; opp: number }[] {
  const r = Math.floor(i / n);
  const c = i % n;
  const out: { idx: number; bit: number; opp: number }[] = [];
  for (const d of DIRS) {
    const rr = r + d.dr;
    const cc = c + d.dc;
    if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.push({ idx: rr * n + cc, bit: d.bit, opp: d.opp });
  }
  return out;
}

/** Flood fill from the source through matching connections. */
export function powered(n: number, masks: readonly number[], source: number): boolean[] {
  const on = new Array<boolean>(n * n).fill(false);
  const stack = [source];
  on[source] = true;
  while (stack.length) {
    const i = stack.pop()!;
    for (const nb of neighbors(n, i)) {
      if (!(masks[i] & nb.bit) || !(masks[nb.idx] & nb.opp) || on[nb.idx]) continue;
      on[nb.idx] = true;
      stack.push(nb.idx);
    }
  }
  return on;
}

/** Number of connection stubs that point at a wall or at a tile that does not connect back. */
export function looseEnds(n: number, masks: readonly number[]): number {
  let loose = 0;
  for (let i = 0; i < n * n; i++) {
    for (const d of DIRS) {
      if (!(masks[i] & d.bit)) continue;
      const nb = neighbors(n, i).find(x => x.bit === d.bit);
      if (!nb || !(masks[nb.idx] & d.opp)) loose++;
    }
  }
  return loose;
}

export function isSolved(n: number, masks: readonly number[], source: number): boolean {
  return powered(n, masks, source).every(Boolean) && looseEnds(n, masks) === 0;
}

function buildTree(n: number, rng: () => number): number[] | null {
  const masks = new Array<number>(n * n).fill(0);
  const deg = new Array<number>(n * n).fill(0);
  const inTree = new Array<boolean>(n * n).fill(false);
  const start = Math.floor(rng() * n * n);
  inTree[start] = true;
  let count = 1;
  // randomized Prim: pick random (tree cell, free neighbour) edges, max degree 3 (no cross tiles)
  while (count < n * n) {
    const cand: { a: number; b: number; bit: number; opp: number }[] = [];
    for (let i = 0; i < n * n; i++) {
      if (!inTree[i] || deg[i] >= 3) continue;
      for (const nb of neighbors(n, i)) if (!inTree[nb.idx]) cand.push({ a: i, b: nb.idx, bit: nb.bit, opp: nb.opp });
    }
    if (cand.length === 0) return null;
    const e = cand[Math.floor(rng() * cand.length)];
    masks[e.a] |= e.bit;
    masks[e.b] |= e.opp;
    deg[e.a]++;
    deg[e.b]++;
    inTree[e.b] = true;
    count++;
  }
  return masks;
}

/** Minimal quarter-turns (either direction) for a tile at orientation `scr` to match any rotation of sol. */
export function tilePar(sol: number, scr: number): number {
  const cur = rotMask(sol, scr);
  let best = Infinity;
  for (let k = 0; k < 4; k++) if (rotMask(cur, k) === sol) best = Math.min(best, Math.min(k, 4 - k));
  return best;
}

export function generatePuzzle(d: Difficulty, seed: number): MoorePuzzle {
  const n = sizeFor(d);
  const rng = mulberry32(seed * 2654435 + d * 97);
  for (let attempt = 0; attempt < 500; attempt++) {
    const sol = buildTree(n, rng);
    if (!sol) continue;
    const scr = sol.map(() => Math.floor(rng() * 4));
    const par = sol.reduce((s, m, i) => s + tilePar(m, scr[i]), 0);
    if (par < Math.ceil((n * n) / 3)) continue; // avoid near-solved boards
    // power source: a random tile with at least two connections (falls back to any)
    const hubs = sol.map((m, i) => (bitCount(m) >= 2 ? i : -1)).filter(i => i >= 0);
    const source = hubs[Math.floor(rng() * hubs.length)];
    return { n, sol, scr, source, par };
  }
  throw new Error('could not generate puzzle');
}

export const chipTiles = (p: MoorePuzzle): number[] =>
  p.sol.flatMap((m, i) => (bitCount(m) === 1 && i !== p.source ? [i] : []));

/** 3 stars: near-par; 2: within about double; 1: solved. */
export function starsForMoves(par: number, moves: number): 1 | 2 | 3 {
  if (moves <= Math.ceil(par * 1.35) + 2) return 3;
  if (moves <= par * 2 + 6) return 2;
  return 1;
}
