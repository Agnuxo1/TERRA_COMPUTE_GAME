import assert from 'node:assert/strict';
import { generatePuzzle, generateGame, solve, isLegalBoard, scoreSamuel, applyJump, jumpsFrom } from '../../src/components/minigames/logic/samuel.ts';

let count = 0;
const stats: Record<number, { n: number; decoys: number; kingTargets: number }> = {};
for (const d of [1, 2, 3] as const) {
  stats[d] = { n: 0, decoys: 0, kingTargets: 0 };
  const range = d === 1 ? [2, 3] : d === 2 ? [3, 4] : [4, 5];
  for (let seed = 1; seed <= 150; seed++) {
    const pz = generatePuzzle(seed * 7919 + d, d);
    assert.ok(isLegalBoard(pz.pieces), `illegal board d${d} seed${seed}`);
    const res = solve(pz.pieces);
    assert.equal(res.max, pz.target, `max != target d${d} seed${seed}`);
    assert.ok(pz.target >= range[0] && pz.target <= range[1], `target ${pz.target} out of range d${d}`);
    // Replay the stored solution through the public rules.
    let cur = pz.pieces;
    const mover = cur.find(p => p.id === pz.solution.pieceId)!;
    assert.ok(mover && mover.side === 'r');
    let pos = { r: mover.r, c: mover.c };
    for (const j of pz.solution.path) {
      const legal = jumpsFrom(cur, mover, pos.r, pos.c);
      assert.ok(legal.some(l => l.r === j.r && l.c === j.c && l.cr === j.cr && l.cc === j.cc), 'solution step illegal');
      cur = applyJump(cur, mover.id, j);
      pos = { r: j.r, c: j.c };
    }
    assert.equal(pz.solution.path.length, pz.target);
    assert.equal(jumpsFrom(cur, mover, pos.r, pos.c).length, 0, 'solution must end with no further jumps');
    assert.ok(pz.pieces.filter(p => p.side === 'r').length >= 1);
    if (res.shortEnds > 0) stats[d].decoys++;
    stats[d].n++;
    count++;
  }
  assert.ok(stats[d].decoys / stats[d].n >= (d === 1 ? 0 : 0.9), `too few decoys d${d}`);
}
// determinism
assert.deepEqual(generatePuzzle(42, 3), generatePuzzle(42, 3));
assert.equal(generateGame(5, 2).length, 3);
// scoring
assert.equal(scoreSamuel([1, 1, 1]), 3);
assert.equal(scoreSamuel([2, 1, 1]), 2);
assert.equal(scoreSamuel([2, 2, 1]), 1);
assert.equal(scoreSamuel([2, 2, 2]), 1);
assert.equal(scoreSamuel([1, 1, null]), 1);
assert.equal(scoreSamuel([1, null, null]), 0);
assert.equal(scoreSamuel([null, null, null]), 0);
console.log(`samuel: ${count} puzzles OK`, JSON.stringify(stats));
