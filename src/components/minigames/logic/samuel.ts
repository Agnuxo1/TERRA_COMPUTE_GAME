// Samuel's Checkers: pure logic for "find the maximum multi-jump" puzzles. No React/DOM.
import { mulberry32, randInt, shuffle } from './rng.ts';
import type { Rng } from './rng.ts';

export type Side = 'r' | 'w';

export interface Piece {
  id: number;
  r: number;
  c: number;
  side: Side;
  king: boolean;
}

export interface Jump {
  /** Landing square. */
  r: number;
  c: number;
  /** Captured piece square. */
  cr: number;
  cc: number;
}

export interface SamuelPuzzle {
  pieces: Piece[];
  /** Maximum number of captures achievable in one turn (shown to the player). */
  target: number;
  /** One optimal solution: the piece id and the landing squares in order. */
  solution: { pieceId: number; path: Jump[] };
}

export const SIZE = 8;
export const isDark = (r: number, c: number) => (r + c) % 2 === 1;
const inBoard = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

/** Red moves up the board (row decreasing). A piece keeps its rank during one turn. */
function dirsFor(p: { side: Side; king: boolean }): [number, number][] {
  const fwd = p.side === 'r' ? -1 : 1;
  return p.king
    ? [[fwd, -1], [fwd, 1], [-fwd, -1], [-fwd, 1]]
    : [[fwd, -1], [fwd, 1]];
}

function pieceAt(pieces: readonly Piece[], r: number, c: number): Piece | undefined {
  return pieces.find(p => p.r === r && p.c === c);
}

/**
 * Jumps available to `mover` standing on (r,c) given the current `pieces`
 * (captured pieces are already removed; the mover's own original square is treated as empty).
 */
export function jumpsFrom(pieces: readonly Piece[], mover: Piece, r: number, c: number): Jump[] {
  const out: Jump[] = [];
  for (const [dr, dc] of dirsFor(mover)) {
    const er = r + dr, ec = c + dc;
    const lr = r + 2 * dr, lc = c + 2 * dc;
    if (!inBoard(lr, lc)) continue;
    const enemy = pieceAt(pieces, er, ec);
    if (!enemy || enemy.side === mover.side || enemy.id === mover.id) continue;
    const blocker = pieceAt(pieces, lr, lc);
    if (blocker && blocker.id !== mover.id) continue;
    out.push({ r: lr, c: lc, cr: er, cc: ec });
  }
  return out;
}

/** Apply a jump: returns a new piece list with the captured piece removed and the mover relocated. */
export function applyJump(pieces: readonly Piece[], moverId: number, j: Jump): Piece[] {
  return pieces
    .filter(p => !(p.r === j.cr && p.c === j.cc))
    .map(p => (p.id === moverId ? { ...p, r: j.r, c: j.c } : p));
}

export interface SolveResult {
  max: number;
  /** All maximal-length sequences. */
  best: { pieceId: number; path: Jump[] }[];
  /** Number of complete sequences that end shorter than the maximum (decoys). */
  shortEnds: number;
  /** Complete shorter sequences that belong to a piece other than an optimal one. */
  shortEndsOtherPieces: number;
}

/** Exhaustive solver over every red piece. */
export function solve(pieces: readonly Piece[]): SolveResult {
  const all: { pieceId: number; path: Jump[] }[] = [];
  for (const p of pieces) {
    if (p.side !== 'r') continue;
    const dfs = (cur: readonly Piece[], r: number, c: number, path: Jump[]) => {
      const js = jumpsFrom(cur, p, r, c);
      if (js.length === 0) {
        if (path.length > 0) all.push({ pieceId: p.id, path });
        return;
      }
      for (const j of js) dfs(applyJump(cur, p.id, j), j.r, j.c, [...path, j]);
    };
    dfs(pieces, p.r, p.c, []);
  }
  const max = all.reduce((m, s) => Math.max(m, s.path.length), 0);
  const best = all.filter(s => s.path.length === max);
  const bestPieces = new Set(best.map(s => s.pieceId));
  const shorter = all.filter(s => s.path.length < max);
  return {
    max,
    best,
    shortEnds: shorter.length,
    shortEndsOtherPieces: shorter.filter(s => !bestPieces.has(s.pieceId)).length,
  };
}

export function isLegalBoard(pieces: readonly Piece[]): boolean {
  const seen = new Set<string>();
  const ids = new Set<number>();
  for (const p of pieces) {
    if (!inBoard(p.r, p.c) || !isDark(p.r, p.c)) return false;
    const k = `${p.r},${p.c}`;
    if (seen.has(k) || ids.has(p.id)) return false;
    seen.add(k);
    ids.add(p.id);
    // Men never stand on their promotion row unpromoted.
    if (!p.king && ((p.side === 'r' && p.r === 0) || (p.side === 'w' && p.r === SIZE - 1))) return false;
  }
  return true;
}

const TARGET_RANGE: Record<1 | 2 | 3, [number, number]> = { 1: [2, 3], 2: [3, 4], 3: [4, 5] };

/** Random jump chain on an empty board (all touched squares distinct). */
function randomChain(rng: Rng, len: number, king: boolean, avoid: Set<string>):
  { start: [number, number]; jumps: Jump[] } | null {
  for (let attempt = 0; attempt < 60; attempt++) {
    const sr = randInt(rng, SIZE), sc = randInt(rng, SIZE);
    if (!isDark(sr, sc) || avoid.has(`${sr},${sc}`)) continue;
    const used = new Set<string>([`${sr},${sc}`]);
    const dummy: Piece = { id: 0, r: sr, c: sc, side: 'r', king };
    let r = sr, c = sc;
    const jumps: Jump[] = [];
    let ok = true;
    for (let i = 0; i < len && ok; i++) {
      const opts = dirsFor(dummy).map(([dr, dc]) => ({
        r: r + 2 * dr, c: c + 2 * dc, cr: r + dr, cc: c + dc,
      })).filter(j => inBoard(j.r, j.c)
        && !used.has(`${j.r},${j.c}`) && !used.has(`${j.cr},${j.cc}`)
        && !avoid.has(`${j.r},${j.c}`) && !avoid.has(`${j.cr},${j.cc}`));
      if (opts.length === 0) { ok = false; break; }
      // Prefer zig-zags for kings so long chains fit the small board.
      const j = shuffle(rng, opts)[0];
      used.add(`${j.r},${j.c}`); used.add(`${j.cr},${j.cc}`);
      jumps.push(j);
      r = j.r; c = j.c;
    }
    if (ok) return { start: [sr, sc], jumps };
  }
  return null;
}

function occupied(pieces: readonly Piece[]): Set<string> {
  return new Set(pieces.map(p => `${p.r},${p.c}`));
}

function emptyDark(rng: Rng, pieces: readonly Piece[]): [number, number][] {
  const occ = occupied(pieces);
  const cells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (isDark(r, c) && !occ.has(`${r},${c}`)) cells.push([r, c]);
  }
  return shuffle(rng, cells);
}

/** Build one puzzle; retries internally until the solver confirms max == target. */
export function generatePuzzle(seed: number, difficulty: 1 | 2 | 3): SamuelPuzzle {
  const rng = mulberry32(seed);
  const [lo, hi] = TARGET_RANGE[difficulty];
  for (let tries = 0; tries < 4000; tries++) {
    const strict = tries < 1500; // first insist on decoys, later relax
    const target = lo + randInt(rng, hi - lo + 1);
    const king = target >= 4 ? true : rng() < 0.4;
    const chain = randomChain(rng, target, king, new Set());
    if (!chain) continue;
    let nextId = 1;
    const pieces: Piece[] = [{ id: nextId++, r: chain.start[0], c: chain.start[1], side: 'r', king }];
    for (const j of chain.jumps) pieces.push({ id: nextId++, r: j.cr, c: j.cc, side: 'w', king: rng() < 0.3 });

    if (difficulty >= 2) {
      // Decoy red piece with its own shorter chain.
      const dLen = Math.max(1, target - 1 - randInt(rng, 2));
      const dKing = rng() < 0.5;
      const avoid = occupied(pieces);
      const dc = randomChain(rng, dLen, dKing, avoid);
      if (dc) {
        pieces.push({ id: nextId++, r: dc.start[0], c: dc.start[1], side: 'r', king: dKing });
        for (const j of dc.jumps) pieces.push({ id: nextId++, r: j.cr, c: j.cc, side: 'w', king: rng() < 0.3 });
      } else if (strict) continue;
    }

    // Decoy scatter: extra white pieces (and for d3 an extra red) that must not lengthen the max.
    const extraWhite = difficulty === 1 ? 1 + randInt(rng, 2) : difficulty === 2 ? 2 + randInt(rng, 2) : 3 + randInt(rng, 3);
    const cells = emptyDark(rng, pieces);
    let placed = 0;
    for (const [r, c] of cells) {
      if (placed >= extraWhite) break;
      const cand: Piece = { id: nextId, r, c, side: 'w', king: rng() < 0.25 };
      if (!isLegalBoard([...pieces, cand])) continue;
      const trial = [...pieces, cand];
      if (solve(trial).max !== target) continue;
      pieces.push(cand);
      nextId++;
      placed++;
    }
    const res = solve(pieces);
    if (res.max !== target || res.best.length === 0) continue;
    if (!isLegalBoard(pieces)) continue;
    // Keep the puzzle non-trivial: require decoys according to difficulty.
    if (strict) {
      if (difficulty === 2 && res.shortEndsOtherPieces < 1) continue;
      if (difficulty === 3 && (res.shortEnds < 2 || res.shortEndsOtherPieces < 1)) continue;
      // Avoid overly many optimal lines (would make the puzzle trivial).
      if (res.best.length > 3) continue;
    }
    const sol = res.best[0];
    return { pieces, target, solution: sol };
  }
  // Fallback: a guaranteed-valid plain chain.
  const king = difficulty >= 2;
  const fallback: Piece[] = king
    ? [
        { id: 1, r: 7, c: 0, side: 'r', king: true },
        { id: 2, r: 6, c: 1, side: 'w', king: false },
        { id: 3, r: 4, c: 3, side: 'w', king: false },
        { id: 4, r: 2, c: 3, side: 'w', king: false },
      ]
    : [
        { id: 1, r: 7, c: 0, side: 'r', king: false },
        { id: 2, r: 6, c: 1, side: 'w', king: false },
        { id: 3, r: 4, c: 3, side: 'w', king: false },
      ];
  const res = solve(fallback);
  return { pieces: fallback, target: res.max, solution: res.best[0] };
}

/** Three puzzles for one game, derived from a single seed. */
export function generateGame(seed: number, difficulty: 1 | 2 | 3): SamuelPuzzle[] {
  const rng = mulberry32(seed);
  return [0, 1, 2].map(() => generatePuzzle(Math.floor(rng() * 2 ** 31), difficulty));
}

/** Tries used per puzzle (1 or 2), or null when the puzzle was failed. */
export type PuzzleOutcome = number | null;

/**
 * Stars: all three solved -> 3 if every one on the first try, 2 with at most one extra try,
 * otherwise 1. Two solved -> 1. Fewer -> 0.
 */
export function scoreSamuel(outcomes: readonly PuzzleOutcome[]): 0 | 1 | 2 | 3 {
  const solved = outcomes.filter((o): o is number => o !== null);
  if (solved.length === outcomes.length && outcomes.length > 0) {
    const extra = solved.reduce((s, t) => s + (t - 1), 0);
    return extra === 0 ? 3 : extra <= 1 ? 2 : 1;
  }
  return solved.length >= 2 ? 1 : 0;
}
