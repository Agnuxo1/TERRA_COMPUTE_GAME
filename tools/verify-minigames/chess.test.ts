import assert from 'node:assert/strict';
import {
  parseFen, legalMoves, mateInOneMoves, mateInTwoFirstMoves, applyMove, bestDefense, isLegalPuzzlePosition,
  isCheckmate, isInCheck, MATE_IN_1, MATE_IN_2, pickPuzzles, puzzleCounts, scoreChess, moveText,
} from '../../src/components/minigames/logic/chess.ts';

// --- engine sanity (known perft-like facts) ---
const start = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w');
assert.equal(legalMoves(start).length, 20, 'start position has 20 moves');
const fools = parseFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w');
assert.ok(isCheckmate(fools), "fool's mate is mate");
const promo = parseFen('8/4P1k1/8/8/8/8/8/K7 w');
assert.ok(legalMoves(promo).some(m => m.promo === 'Q'), 'promotion to queen generated');
const pinned = parseFen('4r1k1/8/8/8/8/8/4B3/4K3 w');
assert.equal(legalMoves(pinned).filter(m => m.from === 52).length, 0, 'pinned bishop cannot move');
assert.ok(isInCheck(parseFen('4k3/8/8/8/8/8/8/4RK2 b')), 'rook check detected');

// --- puzzle bank ---
const ids = new Set<string>();
for (const pz of [...MATE_IN_1, ...MATE_IN_2]) {
  assert.ok(!ids.has(pz.id), 'duplicate id ' + pz.id); ids.add(pz.id);
  const pos = parseFen(pz.fen);
  assert.equal(isLegalPuzzlePosition(pos), null, `${pz.id}: ${isLegalPuzzlePosition(pos)}`);
  const m1 = mateInOneMoves(pos);
  if (pz.mateIn === 1) {
    assert.ok(m1.length >= 1, `${pz.id} has no mate in 1`);
    for (const m of m1) assert.ok(isCheckmate(applyMove(pos, m)));
  } else {
    assert.equal(m1.length, 0, `${pz.id} must NOT be mate in 1`);
    const first = mateInTwoFirstMoves(pos);
    assert.ok(first.length >= 1, `${pz.id} is not a forced mate in 2`);
    assert.ok(first.length <= 6, `${pz.id} has too many solutions (${first.length})`);
    for (const f of first) {
      const p1 = applyMove(pos, f);
      const reply = bestDefense(p1)!;
      assert.ok(reply, 'defender must have a reply');
      const p2 = applyMove(p1, reply);
      assert.ok(mateInOneMoves(p2).length >= 1, `${pz.id}: no mate after best defence`);
    }
  }
  console.log(`${pz.id.padEnd(22)} mateIn${pz.mateIn} ok  e.g. ${pz.mateIn === 1 ? moveText(pos, m1[0]) : moveText(pos, mateInTwoFirstMoves(pos)[0])}`);
}
assert.ok(MATE_IN_1.length >= 12 && MATE_IN_2.length >= 6, `bank too small: ${MATE_IN_1.length}/${MATE_IN_2.length}`);

// --- picking ---
for (const d of [1, 2, 3] as const) {
  for (let s = 1; s <= 50; s++) {
    const p = pickPuzzles(s, d);
    const { m1, m2 } = puzzleCounts(d);
    assert.equal(p.length, 3);
    assert.equal(p.filter(x => x.mateIn === 1).length, m1);
    assert.equal(p.filter(x => x.mateIn === 2).length, m2);
    assert.equal(new Set(p.map(x => x.id)).size, 3);
  }
}
// --- scoring ---
assert.equal(scoreChess([0, 0, 0]), 3);
assert.equal(scoreChess([1, 1, 0]), 2);
assert.equal(scoreChess([2, 1, 0]), 1);
assert.equal(scoreChess([0, 0, null]), 1);
assert.equal(scoreChess([null, null, null]), 0);
console.log(`chess: ${MATE_IN_1.length} mate-in-1, ${MATE_IN_2.length} mate-in-2 verified`);
