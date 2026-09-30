import assert from 'node:assert/strict';
import {
  FIXED_OPS, MAX_LEN, applyOp, evalStages, finalStars, generateLevel, levelPoints, sameList, solveMin,
} from '../../src/components/minigames/logic/lisp.ts';

// op unit cases
assert.deepEqual(applyOp('car', [3, 1, 2]), [3]);
assert.deepEqual(applyOp('cdr', [3, 1, 2]), [1, 2]);
assert.deepEqual(applyOp('reverse', [3, 1, 2]), [2, 1, 3]);
assert.deepEqual(applyOp('sort', [3, 1, 2]), [1, 2, 3]);
assert.deepEqual(applyOp('double', [3, 1]), [3, 1, 3, 1]);
assert.deepEqual(applyOp('last', [3, 1, 2]), [2]);
assert.deepEqual(applyOp('take2', [3, 1, 2]), [3, 1]);
assert.deepEqual(applyOp('droplast', [3, 1, 2]), [3, 1]);
assert.deepEqual(applyOp('cons:5', [3]), [5, 3]);
assert.deepEqual(applyOp('car', []), []);
assert.deepEqual(evalStages([3, 1, 2], ['sort', null, 'cdr']), [[1, 2, 3], [1, 2, 3], [2, 3]]);
assert.equal(FIXED_OPS.length, 8);

const SEEDS = 300;
for (const d of [1, 2, 3] as const) {
  let parSum = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const lv = generateLevel(d, seed);
    assert.deepEqual(lv, generateLevel(d, seed));
    assert.equal(lv.slots, d + 2);
    assert.ok(lv.target.length > 0 && lv.target.length <= MAX_LEN);
    assert.ok(!sameList(lv.input, lv.target), 'target differs from input');
    assert.ok(lv.par >= Math.max(2, d) && lv.par <= d + 1, `par ${lv.par} d${d}`);
    // BFS solution fits in the slots and really works
    const sol = solveMin(lv.input, lv.target, lv.ops, lv.slots);
    assert.ok(sol && sol.length <= lv.slots, 'solvable within slots');
    assert.equal(sol.length, lv.par);
    const padded = [...lv.solution, ...Array(lv.slots - lv.solution.length).fill(null)];
    const stages = evalStages(lv.input, padded);
    assert.ok(sameList(stages[stages.length - 1], lv.target));
    // no shorter pipeline exists
    if (lv.par > 1) assert.equal(solveMin(lv.input, lv.target, lv.ops, lv.par - 1), null);
    // palette has exactly two CONS tiles
    assert.equal(lv.ops.filter(o => o.startsWith('cons:')).length, 2);
    parSum += lv.par;
  }
  console.log(`lisp d${d}: ${SEEDS} levels OK, avg par ${(parSum / SEEDS).toFixed(2)}`);
}

// scoring
assert.equal(levelPoints(2, 2, 0), 3);
assert.equal(levelPoints(2, 2, 1), 3);
assert.equal(levelPoints(3, 2, 0), 2);
assert.equal(levelPoints(2, 2, 4), 2);
assert.equal(levelPoints(3, 2, 4), 1);
assert.equal(finalStars([3, 3, 2]), 3);
assert.equal(finalStars([3, 2, 1]), 2);
assert.equal(finalStars([1, 0, 0]), 1);
assert.equal(finalStars([0, 0, 0]), 0);
console.log('lisp: ALL PASS');
