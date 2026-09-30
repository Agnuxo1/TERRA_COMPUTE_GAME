// Atari Go (first capture wins). Pure logic. No React/DOM.
import type { Rng } from './rng.ts';

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export type Stone = 0 | 1 | 2;
export type Board = Stone[];

export const other = (s: Stone): Stone => (s === BLACK ? WHITE : BLACK);

export function emptyBoard(n: number): Board {
  return new Array<Stone>(n * n).fill(EMPTY);
}

export function sizeOf(board: readonly Stone[]): number {
  return Math.round(Math.sqrt(board.length));
}

export function neighbors(n: number, idx: number): number[] {
  const r = Math.floor(idx / n), c = idx % n;
  const out: number[] = [];
  if (r > 0) out.push(idx - n);
  if (r < n - 1) out.push(idx + n);
  if (c > 0) out.push(idx - 1);
  if (c < n - 1) out.push(idx + 1);
  return out;
}

export interface Group {
  color: Stone;
  stones: number[];
  liberties: number[];
}

export function groupAt(board: readonly Stone[], idx: number): Group {
  const n = sizeOf(board);
  const color = board[idx];
  const seen = new Set<number>([idx]);
  const libs = new Set<number>();
  const stack = [idx];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nb of neighbors(n, cur)) {
      const v = board[nb];
      if (v === EMPTY) libs.add(nb);
      else if (v === color && !seen.has(nb)) { seen.add(nb); stack.push(nb); }
    }
  }
  return { color, stones: [...seen], liberties: [...libs] };
}

export function allGroups(board: readonly Stone[]): Group[] {
  const done = new Set<number>();
  const out: Group[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === EMPTY || done.has(i)) continue;
    const g = groupAt(board, i);
    g.stones.forEach(s => done.add(s));
    out.push(g);
  }
  return out;
}

export interface PlayResult {
  ok: boolean;
  board: Board;
  /** Opponent stones captured by this move (game ends on the first capture). */
  captured: number[];
  reason?: 'occupied' | 'suicide';
}

/** Place a stone. Suicide is illegal unless the move captures. */
export function play(board: readonly Stone[], idx: number, color: Stone): PlayResult {
  if (board[idx] !== EMPTY) return { ok: false, board: board as Board, captured: [], reason: 'occupied' };
  const n = sizeOf(board);
  const next = board.slice() as Board;
  next[idx] = color;
  const captured: number[] = [];
  const seenGroups = new Set<number>();
  for (const nb of neighbors(n, idx)) {
    if (next[nb] !== other(color) || seenGroups.has(nb)) continue;
    const g = groupAt(next, nb);
    g.stones.forEach(s => seenGroups.add(s));
    if (g.liberties.length === 0) captured.push(...g.stones);
  }
  for (const s of captured) next[s] = EMPTY;
  if (captured.length === 0 && groupAt(next, idx).liberties.length === 0) {
    return { ok: false, board: board as Board, captured: [], reason: 'suicide' };
  }
  return { ok: true, board: next, captured };
}

export function legalMoves(board: readonly Stone[], color: Stone): number[] {
  const out: number[] = [];
  for (let i = 0; i < board.length; i++) if (board[i] === EMPTY && play(board, i, color).ok) out.push(i);
  return out;
}

/** Sum of the liberties of every group of a colour (the tiebreak used when no capture is possible). */
export function libertySum(board: readonly Stone[], color: Stone): number {
  return allGroups(board).filter(g => g.color === color).reduce((s, g) => s + g.liberties.length, 0);
}

export type Winner = Stone; // 0 = undecided

/** Winner by the board-full rule: more total liberties wins; a tie goes to Black (the player). */
export function countWinner(board: readonly Stone[]): Stone {
  return libertySum(board, WHITE) > libertySum(board, BLACK) ? WHITE : BLACK;
}

/** Groups currently in atari (one liberty). */
export function atariGroups(board: readonly Stone[]): Group[] {
  return allGroups(board).filter(g => g.liberties.length === 1);
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export type AiLevel = 1 | 2 | 3;

const pickRandom = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

function adjacentToStones(board: readonly Stone[], moves: number[]): number[] {
  const n = sizeOf(board);
  return moves.filter(m => neighbors(n, m).some(nb => board[nb] !== EMPTY));
}

function captureMoves(board: readonly Stone[], moves: number[], color: Stone): number[] {
  return moves.filter(m => play(board, m, color).captured.length > 0);
}

function selfAtari(board: readonly Stone[], m: number, color: Stone): boolean {
  const r = play(board, m, color);
  if (!r.ok) return true;
  if (r.captured.length > 0) return false;
  return groupAt(r.board, m).liberties.length <= 1;
}

/** Can `attacker` capture something immediately on this board? */
function canCaptureNow(board: readonly Stone[], attacker: Stone): boolean {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === EMPTY && play(board, i, attacker).captured.length > 0) return true;
  }
  return false;
}

/**
 * Simple ladder check: does `attacker` capture the defender group containing `idx`
 * by repeatedly ataring it while it keeps extending? Depth-limited.
 * Assumes the group currently has exactly 1 or 2 liberties and it is the attacker's turn
 * when it has 2, or the defender's turn when it has 1.
 */
export function ladderCaptures(board: readonly Stone[], idx: number, attacker: Stone, depth = 40): boolean {
  if (depth <= 0) return false;
  const defender = other(attacker);
  if (board[idx] !== defender) return true; // group already gone
  const g = groupAt(board, idx);
  if (g.liberties.length === 0) return true;
  if (g.liberties.length === 1) {
    // Defender to move: extend (or capture something to win).
    const lib = g.liberties[0];
    const r = play(board, lib, defender);
    if (!r.ok) return true;
    if (r.captured.length > 0) return false;
    const ng = groupAt(r.board, lib);
    if (ng.liberties.length >= 3) return false;
    if (ng.liberties.length === 1) return true; // extension still in atari: captured next turn
    // Exactly two liberties: attacker ataris again.
    return ladderCaptures(r.board, lib, attacker, depth - 1);
  }
  if (g.liberties.length === 2) {
    for (const lib of g.liberties) {
      const r = play(board, lib, attacker);
      if (!r.ok) continue;
      if (r.captured.length > 0) continue; // capturing ends the game anyway; not a ladder move
      if (groupAt(r.board, lib).liberties.length <= 1) continue; // don't self-atari
      const dg = groupAt(r.board, idx);
      if (dg.liberties.length !== 1) continue;
      if (canCaptureNow(r.board, defender)) continue; // defender would capture first
      if (ladderCaptures(r.board, idx, attacker, depth - 1)) return true;
    }
    return false;
  }
  return false;
}

/** Score a candidate for the AI (level 2+): reduce enemy liberties, keep own groups safe. */
function attackScore(board: readonly Stone[], m: number, color: Stone): number {
  const r = play(board, m, color);
  if (!r.ok) return -Infinity;
  const foe = other(color);
  const n = sizeOf(board);
  let score = 0;
  const seen = new Set<number>();
  for (const nb of neighbors(n, m)) {
    if (board[nb] !== foe || seen.has(nb)) continue;
    const gBefore = groupAt(board, nb);
    gBefore.stones.forEach(s => seen.add(s));
    const gAfter = groupAt(r.board, nb);
    const drop = gBefore.liberties.length - gAfter.liberties.length;
    score += drop * 2 + (gAfter.liberties.length === 1 ? 6 : 0) + (gAfter.liberties.length === 2 ? 1 : 0);
  }
  const mine = groupAt(r.board, m);
  score += Math.min(mine.liberties.length, 4) * 0.8;
  // Mild preference for the middle of the board.
  const row = Math.floor(m / n), col = m % n;
  score -= (Math.abs(row - (n - 1) / 2) + Math.abs(col - (n - 1) / 2)) * 0.1;
  return score;
}

/** Choose the AI's move. `color` is the AI's colour (White in the game). */
export function aiMove(board: readonly Stone[], color: Stone, level: AiLevel, rng: Rng): number | null {
  const n = sizeOf(board);
  const moves = legalMoves(board, color);
  if (moves.length === 0) return null;
  const foe = other(color);

  // All levels: take a capture when there is one.
  const caps = captureMoves(board, moves, color);
  if (caps.length > 0) return pickRandom(rng, caps);

  if (level === 1) {
    if (rng() < 0.3) return pickRandom(rng, moves); // blunder-prone
    const near = adjacentToStones(board, moves);
    return pickRandom(rng, near.length ? near : moves);
  }

  // Level 2+: save own group in atari.
  const myAtari = atariGroups(board).filter(g => g.color === color);
  if (myAtari.length > 0) {
    const escapes: { m: number; libs: number }[] = [];
    for (const g of myAtari) {
      const m = g.liberties[0];
      const r = play(board, m, color);
      if (!r.ok) continue;
      const libs = groupAt(r.board, m).liberties.length;
      if (libs >= 2) escapes.push({ m, libs });
    }
    if (level === 3) {
      // Prefer escapes that are not simply ladder-captured, and do not hand over a capture.
      const good = escapes.filter(e => {
        const r = play(board, e.m, color);
        if (canCaptureNow(r.board, foe)) return false;
        return !(e.libs === 2 && ladderCaptures(r.board, e.m, foe));
      });
      if (good.length > 0) return good.sort((a, b) => b.libs - a.libs)[0].m;
    } else if (escapes.length > 0) {
      return escapes.sort((a, b) => b.libs - a.libs)[0].m;
    }
  }

  let cands = moves.filter(m => !selfAtari(board, m, color));
  if (cands.length === 0) cands = moves;

  if (level === 3) {
    // Ladder offence: atari a black group that cannot run away.
    for (const m of cands) {
      const r = play(board, m, color);
      const seen = new Set<number>();
      for (const nb of neighbors(n, m)) {
        if (board[nb] !== foe || seen.has(nb)) continue;
        const g = groupAt(r.board, nb);
        g.stones.forEach(s => seen.add(s));
        if (g.liberties.length === 1 && !canCaptureNow(r.board, foe) && ladderCaptures(r.board, nb, color)) return m;
      }
    }
    // 1-ply lookahead: never allow an immediate enemy capture if avoidable.
    const safe = cands.filter(m => !canCaptureNow(play(board, m, color).board, foe));
    if (safe.length > 0) cands = safe;
  }

  let best = -Infinity;
  let bestMoves: number[] = [];
  for (const m of cands) {
    const s = attackScore(board, m, color) + rng() * 0.6;
    if (s > best + 1e-9) { best = s; bestMoves = [m]; } else if (Math.abs(s - best) <= 1e-9) bestMoves.push(m);
  }
  return pickRandom(rng, bestMoves);
}

// ---------------------------------------------------------------------------
// Game driver (used by the UI and by the tests)
// ---------------------------------------------------------------------------

export interface GameState {
  board: Board;
  turn: Stone;
  /** Winner: 0 = game still running. */
  winner: Stone;
  endedBy: 'capture' | 'count' | null;
  playerMoves: number;
  lastMove: number | null;
  captured: number[];
}

export function newGame(n: number): GameState {
  return { board: emptyBoard(n), turn: BLACK, winner: 0, endedBy: null, playerMoves: 0, lastMove: null, captured: [] };
}

/** Apply a move for the side to move and resolve the end of the game. Returns null when illegal. */
export function applyGameMove(st: GameState, idx: number): GameState | null {
  if (st.winner !== 0) return null;
  const r = play(st.board, idx, st.turn);
  if (!r.ok) return null;
  const next: GameState = {
    board: r.board,
    turn: other(st.turn),
    winner: 0,
    endedBy: null,
    playerMoves: st.playerMoves + (st.turn === BLACK ? 1 : 0),
    lastMove: idx,
    captured: r.captured,
  };
  if (r.captured.length > 0) {
    next.winner = st.turn;
    next.endedBy = 'capture';
    return next;
  }
  // No legal move for the next player (board filled): decide by liberty count.
  if (legalMoves(next.board, next.turn).length === 0) {
    next.winner = countWinner(next.board);
    next.endedBy = 'count';
  }
  return next;
}

export function boardSizeFor(difficulty: 1 | 2 | 3): number {
  return difficulty === 3 ? 9 : 7;
}

/** Player-move limit for a 3-star win. */
export function threeStarMoves(n: number): number {
  return n === 9 ? 14 : 10;
}

export type GoOutcome = 'win-fast' | 'win' | 'win-second' | 'lose';

/** Stars: fast first win 3, first win 2, win on second life 1, lose both 0. */
export function scoreGo(outcome: GoOutcome): 0 | 1 | 2 | 3 {
  return outcome === 'win-fast' ? 3 : outcome === 'win' ? 2 : outcome === 'win-second' ? 1 : 0;
}
