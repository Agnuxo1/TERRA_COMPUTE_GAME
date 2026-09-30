// Minimal chess engine for mate puzzles. No React/DOM.
// Supported: all piece moves, check detection, promotion (always to queen).
// Not supported (puzzle positions never need them): castling, en passant.
import { mulberry32, shuffle } from './rng.ts';

export type Color = 'w' | 'b';
/** Uppercase = white, lowercase = black. null = empty. Index = rank8-first: idx = row*8 + col, row 0 = rank 8. */
export type Cell = string | null;

export interface Position {
  board: Cell[];
  turn: Color;
}

export interface Move {
  from: number;
  to: number;
  /** Set when a pawn reaches the last rank (always a queen). */
  promo?: string;
}

export const colorOf = (p: string): Color => (p === p.toUpperCase() ? 'w' : 'b');
export const rowOf = (i: number) => i >> 3;
export const colOf = (i: number) => i & 7;
export const sqName = (i: number) => 'abcdefgh'[colOf(i)] + (8 - rowOf(i));

export function parseFen(fen: string): Position {
  const [placement, side = 'w'] = fen.trim().split(/\s+/);
  const board: Cell[] = [];
  for (const ch of placement) {
    if (ch === '/') continue;
    if (/\d/.test(ch)) for (let k = 0; k < Number(ch); k++) board.push(null);
    else board.push(ch);
  }
  if (board.length !== 64) throw new Error(`Bad FEN: ${fen}`);
  return { board, turn: side === 'b' ? 'b' : 'w' };
}

const KNIGHT: [number, number][] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING: [number, number][] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTH: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const ok = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

/** Is square `sq` attacked by any piece of colour `by`? */
export function isAttacked(board: readonly Cell[], sq: number, by: Color): boolean {
  const r = rowOf(sq), c = colOf(sq);
  const isBy = (p: Cell, kinds: string) => !!p && colorOf(p) === by && kinds.includes(p.toUpperCase());
  // Pawns: white pawns attack upward (toward row 0), so an attacker sits one row below (r+1).
  const pr = by === 'w' ? r + 1 : r - 1;
  for (const dc of [-1, 1]) if (ok(pr, c + dc) && isBy(board[pr * 8 + c + dc], 'P')) return true;
  for (const [dr, dc] of KNIGHT) if (ok(r + dr, c + dc) && isBy(board[(r + dr) * 8 + c + dc], 'N')) return true;
  for (const [dr, dc] of KING) if (ok(r + dr, c + dc) && isBy(board[(r + dr) * 8 + c + dc], 'K')) return true;
  const ray = (dirs: [number, number][], kinds: string) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (ok(rr, cc)) {
        const p = board[rr * 8 + cc];
        if (p) { if (isBy(p, kinds)) return true; break; }
        rr += dr; cc += dc;
      }
    }
    return false;
  };
  return ray(DIAG, 'BQ') || ray(ORTH, 'RQ');
}

export function kingSquare(board: readonly Cell[], color: Color): number {
  return board.findIndex(p => p === (color === 'w' ? 'K' : 'k'));
}

export function isInCheck(pos: Position, color: Color = pos.turn): boolean {
  const k = kingSquare(pos.board, color);
  return k >= 0 && isAttacked(pos.board, k, color === 'w' ? 'b' : 'w');
}

function pseudoMoves(pos: Position): Move[] {
  const { board, turn } = pos;
  const out: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || colorOf(p) !== turn) continue;
    const r = rowOf(i), c = colOf(i);
    const kind = p.toUpperCase();
    const add = (rr: number, cc: number) => {
      const t = board[rr * 8 + cc];
      if (t && colorOf(t) === turn) return false;
      out.push({ from: i, to: rr * 8 + cc });
      return !t; // can continue sliding only through empty squares
    };
    if (kind === 'P') {
      const dir = turn === 'w' ? -1 : 1;
      const last = turn === 'w' ? 0 : 7;
      const start = turn === 'w' ? 6 : 1;
      const push = (rr: number, cc: number) => {
        const m: Move = { from: i, to: rr * 8 + cc };
        if (rr === last) m.promo = turn === 'w' ? 'Q' : 'q';
        out.push(m);
      };
      if (ok(r + dir, c) && !board[(r + dir) * 8 + c]) {
        push(r + dir, c);
        if (r === start && !board[(r + 2 * dir) * 8 + c]) push(r + 2 * dir, c);
      }
      for (const dc of [-1, 1]) {
        if (!ok(r + dir, c + dc)) continue;
        const t = board[(r + dir) * 8 + c + dc];
        if (t && colorOf(t) !== turn) push(r + dir, c + dc);
      }
    } else if (kind === 'N') {
      for (const [dr, dc] of KNIGHT) if (ok(r + dr, c + dc)) add(r + dr, c + dc);
    } else if (kind === 'K') {
      for (const [dr, dc] of KING) if (ok(r + dr, c + dc)) add(r + dr, c + dc);
    } else {
      const dirs = kind === 'B' ? DIAG : kind === 'R' ? ORTH : [...DIAG, ...ORTH];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (ok(rr, cc)) {
          if (!add(rr, cc)) break;
          rr += dr; cc += dc;
        }
      }
    }
  }
  return out;
}

export function applyMove(pos: Position, m: Move): Position {
  const board = pos.board.slice();
  board[m.to] = m.promo ?? board[m.from];
  board[m.from] = null;
  return { board, turn: pos.turn === 'w' ? 'b' : 'w' };
}

export function legalMoves(pos: Position): Move[] {
  return pseudoMoves(pos).filter(m => !isInCheck(applyMove(pos, m), pos.turn));
}

export function legalMovesFrom(pos: Position, from: number): Move[] {
  return legalMoves(pos).filter(m => m.from === from);
}

export function isCheckmate(pos: Position): boolean {
  return isInCheck(pos) && legalMoves(pos).length === 0;
}

/** Moves that checkmate immediately. */
export function mateInOneMoves(pos: Position): Move[] {
  return legalMoves(pos).filter(m => isCheckmate(applyMove(pos, m)));
}

/** First moves after which EVERY black reply allows a mate in one (and black is not mated/stalemated at once). */
export function mateInTwoFirstMoves(pos: Position): Move[] {
  return legalMoves(pos).filter(m => {
    const p1 = applyMove(pos, m);
    const replies = legalMoves(p1);
    if (replies.length === 0) return false; // mate in 1 or stalemate: not a "mate in 2" first move
    return replies.every(r => mateInOneMoves(applyMove(p1, r)).length > 0);
  });
}

/**
 * Engine defence: choose the reply that avoids mate the longest. A reply that leaves white no
 * mate in one scores higher; ties prefer captures, then checks, then board order.
 */
export function bestDefense(pos: Position): Move | null {
  const replies = legalMoves(pos);
  if (replies.length === 0) return null;
  let best = replies[0], bestScore = -1;
  for (const r of replies) {
    const after = applyMove(pos, r);
    let score = mateInOneMoves(after).length === 0 ? 10 : 0;
    if (pos.board[r.to]) score += 2;
    if (isInCheck(after, after.turn)) score += 1;
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}

/** Structural validity for puzzle positions. */
export function isLegalPuzzlePosition(pos: Position): string | null {
  const wk = pos.board.filter(p => p === 'K').length;
  const bk = pos.board.filter(p => p === 'k').length;
  if (wk !== 1 || bk !== 1) return 'need exactly one king per side';
  const a = kingSquare(pos.board, 'w'), b = kingSquare(pos.board, 'b');
  if (Math.abs(rowOf(a) - rowOf(b)) <= 1 && Math.abs(colOf(a) - colOf(b)) <= 1) return 'kings adjacent';
  if (pos.turn !== 'w') return 'white must be on move';
  if (isInCheck(pos, 'b')) return 'black king is in check with white to move';
  if (isInCheck(pos, 'w')) return 'white starts in check (not wrong, but keep puzzles simple)';
  for (let i = 0; i < 8; i++) {
    if (pos.board[i] === 'P' || pos.board[56 + i] === 'p' || pos.board[i] === 'p' || pos.board[56 + i] === 'P') return 'pawn on last rank';
  }
  return null;
}

export const PIECE_NAME: Record<string, string> = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' };

/** Short coordinate text such as "Ra2-a7" or "Nf7#". */
export function moveText(pos: Position, m: Move): string {
  const p = pos.board[m.from] ?? '?';
  const letter = p.toUpperCase() === 'P' ? '' : p.toUpperCase();
  const cap = pos.board[m.to] ? 'x' : '-';
  const after = applyMove(pos, m);
  const suffix = isCheckmate(after) ? '#' : isInCheck(after, after.turn) ? '+' : '';
  return `${letter}${sqName(m.from)}${cap}${sqName(m.to)}${m.promo ? '=Q' : ''}${suffix}`;
}

// ---------------------------------------------------------------------------
// Curated puzzles (white to move). Verified by tools/verify-minigames/chess.test.ts.
// ---------------------------------------------------------------------------

export interface MatePuzzle {
  id: string;
  fen: string;
  mateIn: 1 | 2;
  theme: string;
}

export const MATE_IN_1: MatePuzzle[] = [
  { id: 'm1-backrank-rook', fen: '6k1/5ppp/8/8/8/8/8/R3K3 w', mateIn: 1, theme: 'Back-rank mate' },
  { id: 'm1-backrank-capture', fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w', mateIn: 1, theme: 'Back-rank mate by capture' },
  { id: 'm1-smothered', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w', mateIn: 1, theme: 'Smothered mate' },
  { id: 'm1-queen-king', fen: '7k/8/5K2/8/8/8/8/6Q1 w', mateIn: 1, theme: 'Queen and king' },
  { id: 'm1-rook-ladder', fen: 'k7/8/1K6/8/8/8/8/7R w', mateIn: 1, theme: 'Rook finishes the ladder' },
  { id: 'm1-anastasia', fen: '8/4N1pk/8/8/8/8/K7/3R4 w', mateIn: 1, theme: "Anastasia's mate" },
  { id: 'm1-arabian', fen: '7k/R7/5N2/8/8/8/8/K7 w', mateIn: 1, theme: 'Arabian mate' },
  { id: 'm1-scholar', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w', mateIn: 1, theme: "Scholar's mate" },
  { id: 'm1-two-rooks', fen: '6k1/R7/8/8/8/8/8/1R4K1 w', mateIn: 1, theme: 'Two rooks' },
  { id: 'm1-queen-bishop', fen: '7k/5Q2/4N3/8/8/8/8/K7 w', mateIn: 1, theme: 'Queen backed by a knight' },
  { id: 'm1-opposition', fen: '4k3/R7/4K3/8/8/8/8/8 w', mateIn: 1, theme: 'Opposition mate' },
  { id: 'm1-queen-backrank', fen: '2r3k1/5ppp/8/8/8/8/5PPP/2Q3K1 w', mateIn: 1, theme: 'Queen takes on the back rank' },
];

export const MATE_IN_2: MatePuzzle[] = [
  { id: 'm2-rook-ladder', fen: '4k3/8/8/8/8/8/R7/1R5K w', mateIn: 2, theme: 'Rook ladder' },
  { id: 'm2-queen-net', fen: 'k7/8/2K5/8/8/8/8/6Q1 w', mateIn: 2, theme: 'Queen net' },
  { id: 'm2-corner-ladder', fen: '7k/8/8/8/8/8/1R6/R6K w', mateIn: 2, theme: 'Corner ladder' },
  { id: 'm2-philidor', fen: '5r1k/6pp/8/3QN3/2B5/8/8/6K1 w', mateIn: 2, theme: 'Queen sacrifice, smothered mate' },
  { id: 'm2-queen-rook-net', fen: '4k3/8/8/8/8/RK6/8/1Q6 w', mateIn: 2, theme: 'Queen and rook net' },
  { id: 'm2-rook-capture', fen: '7k/R7/8/2b2R2/8/8/8/1K6 w', mateIn: 2, theme: 'Rooks on the seventh' },
  { id: 'm2-h-file', fen: '2k5/7p/6R1/5p2/8/7Q/7B/7K w', mateIn: 2, theme: 'Queen and rook battery' },
  { id: 'm2-check-drive', fen: '4k3/2R5/8/1r6/5Q2/8/6K1/8 w', mateIn: 2, theme: 'Queen check drives the king' },
];

export function puzzleCounts(difficulty: 1 | 2 | 3): { m1: number; m2: number } {
  return difficulty === 1 ? { m1: 3, m2: 0 } : difficulty === 2 ? { m1: 2, m2: 1 } : { m1: 1, m2: 2 };
}

/** Pick the puzzles of one game (easiest first). */
export function pickPuzzles(seed: number, difficulty: 1 | 2 | 3): MatePuzzle[] {
  const rng = mulberry32(seed);
  const { m1, m2 } = puzzleCounts(difficulty);
  return [...shuffle(rng, MATE_IN_1).slice(0, m1), ...shuffle(rng, MATE_IN_2).slice(0, m2)];
}

/**
 * Stars: no mistakes -> 3; at most 2 mistakes -> 2; all solved -> 1; any failed -> max 1; all failed -> 0.
 * `mistakes[i]` is null when puzzle i was failed (3 mistakes).
 */
export function scoreChess(mistakes: readonly (number | null)[]): 0 | 1 | 2 | 3 {
  const failed = mistakes.filter(m => m === null).length;
  if (failed === mistakes.length) return 0;
  const total = mistakes.reduce<number>((s, m) => s + (m ?? 0), 0);
  if (failed > 0) return 1;
  return total === 0 ? 3 : total <= 2 ? 2 : 1;
}
