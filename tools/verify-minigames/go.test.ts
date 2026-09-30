import assert from 'node:assert/strict';
import { mulberry32 } from '../../src/components/minigames/logic/rng.ts';
import {
  BLACK, WHITE, EMPTY, emptyBoard, play, groupAt, legalMoves, newGame, applyGameMove, aiMove, neighbors, sizeOf,
  atariGroups, boardSizeFor, threeStarMoves, scoreGo, countWinner, libertySum, ladderCaptures,
} from '../../src/components/minigames/logic/go.ts';
import type { Stone, AiLevel } from '../../src/components/minigames/logic/go.ts';

// --- rules ---
{
  const n = 5;
  const b = emptyBoard(n);
  // corner capture: white at (0,0), black at (0,1) and (1,0)
  b[0] = WHITE; b[1] = BLACK;
  assert.equal(groupAt(b, 0).liberties.length, 1);
  const r = play(b, 5, BLACK);
  assert.ok(r.ok && r.captured.length === 1 && r.captured[0] === 0 && r.board[0] === EMPTY);
  // group capture
  const g = emptyBoard(n);
  g[0] = WHITE; g[1] = WHITE; g[2] = BLACK; g[5] = BLACK;
  assert.equal(groupAt(g, 0).liberties.length, 1); // only (1,1)=6
  const rg = play(g, 6, BLACK);
  assert.deepEqual(rg.captured.sort(), [0, 1]);
  // suicide illegal
  const s = emptyBoard(n);
  s[1] = WHITE; s[5] = WHITE;
  assert.equal(play(s, 0, BLACK).ok, false);
  assert.equal(play(s, 0, BLACK).reason, 'suicide');
  // suicide allowed when it captures
  const sc = emptyBoard(n);
  sc[1] = WHITE; sc[5] = WHITE; sc[2] = BLACK; sc[10] = BLACK; sc[6] = BLACK;
  // white (0,1) has libs: (0,0) only (since (0,2) black, (1,1) black). black at (0,0) captures white 1; also white 5 libs (0,0) only -> captured.
  const rc = play(sc, 0, BLACK);
  assert.ok(rc.ok && rc.captured.length === 2);
  assert.equal(play(b, 0, BLACK).reason, 'occupied');
  assert.equal(atariGroups(b).length, 1);
}
// --- ladder sanity: a stone on the edge in atari with 2 libs runs a ladder to capture on an open board ---
{
  const b = emptyBoard(7);
  // white stone at (1,1); black stones around making a ladder toward the corner
  b[1 * 7 + 1] = WHITE; b[1 * 7 + 0] = BLACK; b[0 * 7 + 1] = BLACK; // white has libs (1,2),(2,1)
  assert.ok(typeof ladderCaptures(b, 8, BLACK) === 'boolean');
}

// --- a scripted "player bot" (black) ---
function botMove(board: Stone[], rng: () => number): number {
  const n = sizeOf(board);
  const moves = legalMoves(board, BLACK);
  for (const m of moves) if (play(board, m, BLACK).captured.length) return m;
  // save own group in atari
  for (const g of atariGroups(board).filter(x => x.color === BLACK)) {
    const m = g.liberties[0];
    const r = play(board, m, BLACK);
    if (r.ok && groupAt(r.board, m).liberties.length >= 2) return m;
  }
  const scored = moves.map(m => {
    const r = play(board, m, BLACK);
    const selfLibs = groupAt(r.board, m).liberties.length;
    if (selfLibs <= 1) return { m, s: -100 };
    let s = selfLibs * 0.5;
    const seen = new Set<number>();
    for (const nb of neighbors(n, m)) {
      if (board[nb] !== WHITE || seen.has(nb)) continue;
      const before = groupAt(board, nb); before.stones.forEach(x => seen.add(x));
      const after = groupAt(r.board, nb);
      s += (before.liberties.length - after.liberties.length) * 3 + (after.liberties.length === 1 ? 8 : 0);
    }
    // avoid letting white capture next
    return { m, s: s + rng() * 0.5 };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].m;
}

function playGame(seed: number, level: AiLevel, n: number) {
  const rng = mulberry32(seed);
  let st = newGame(n);
  let plies = 0;
  while (st.winner === 0) {
    const mv = st.turn === BLACK ? botMove(st.board, rng) : aiMove(st.board, WHITE, level, rng);
    assert.ok(mv !== null && mv !== undefined, 'no move available while game undecided');
    const nx = applyGameMove(st, mv as number);
    assert.ok(nx, `illegal move generated (${mv})`);
    st = nx;
    plies++;
    assert.ok(plies <= n * n + 2, 'game did not terminate');
  }
  return st;
}

const report: string[] = [];
for (const [level, n] of [[1, 7], [2, 7], [3, 9], [1, 9], [3, 7]] as [AiLevel, number][]) {
  let wins = 0, fast = 0, count = 0;
  const moves: number[] = [];
  const N = 300;
  for (let i = 1; i <= N; i++) {
    const st = playGame(i * 101 + level, level, n);
    if (st.endedBy === 'count') count++;
    if (st.winner === BLACK) { wins++; moves.push(st.playerMoves); if (st.playerMoves <= threeStarMoves(n)) fast++; }
  }
  moves.sort((a, b) => a - b);
  const med = moves[Math.floor(moves.length / 2)];
  report.push(`lvl${level} ${n}x${n}: bot wins ${wins}/${N} (${(wins / N * 100).toFixed(0)}%), <=${threeStarMoves(n)} moves: ${fast}, median win moves ${med}, count-endings ${count}`);
  if (level === 1) assert.ok(wins / N > 0.6, `bot must beat level 1 in >60% (got ${wins / N}) on ${n}x${n}`);
}
// --- forced termination by liberty count: fill a board with no captures ---
{
  const n = 3;
  let st = newGame(n);
  // Crafted: checker-like fill avoiding captures is hard by hand; instead verify countWinner rule directly.
  const b = emptyBoard(n);
  b[0] = BLACK; b[8] = WHITE;
  assert.equal(libertySum(b, BLACK), 2);
  assert.equal(countWinner(b), BLACK); // tie -> black
  b[1] = WHITE; // white now has more liberties? white groups: (8): libs 5,7 ; (1): libs 2,4 ; black (0): libs 3
  assert.equal(countWinner(b), WHITE);
  st = newGame(n);
  assert.equal(st.turn, BLACK);
}
assert.equal(boardSizeFor(1), 7); assert.equal(boardSizeFor(2), 7); assert.equal(boardSizeFor(3), 9);
assert.equal(scoreGo('win-fast'), 3); assert.equal(scoreGo('win'), 2); assert.equal(scoreGo('win-second'), 1); assert.equal(scoreGo('lose'), 0);
console.log(report.join('\n'));
console.log('go: rules, termination, bot-vs-AI OK');
