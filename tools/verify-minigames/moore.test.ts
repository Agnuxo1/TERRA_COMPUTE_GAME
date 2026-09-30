import assert from 'node:assert/strict';
import {
  E, N, S, W, bitCount, chipTiles, currentMask, generatePuzzle, isSolved, kindOf, looseEnds, neighbors, powered,
  rotMask, sizeFor, starsForMoves, tilePar,
} from '../../src/components/minigames/logic/moore.ts';

// rotation + kinds
assert.equal(rotMask(N, 1), E);
assert.equal(rotMask(W, 1), N);
assert.equal(rotMask(N | S, 1), E | W);
assert.equal(rotMask(N | E | S, 4), N | E | S);
assert.equal(kindOf(N), 'end');
assert.equal(kindOf(N | S), 'straight');
assert.equal(kindOf(N | E), 'corner');
assert.equal(kindOf(N | E | W), 'tee');
assert.equal(tilePar(N | S, 1), 1); // straight rotated once: one click fixes it
assert.equal(tilePar(N | S, 2), 0); // straight rotated twice is already fine
assert.equal(tilePar(N | E, 3), 1);
assert.equal(tilePar(N | E, 2), 2);

const SEEDS = 300;
for (const d of [1, 2, 3] as const) {
  const n = sizeFor(d);
  let parSum = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const p = generatePuzzle(d, seed);
    assert.deepEqual(p, generatePuzzle(d, seed));
    assert.equal(p.n, n);
    // every cell used, symmetric connections, tree (edges = cells - 1), connected
    let degSum = 0;
    for (let i = 0; i < n * n; i++) {
      const m = p.sol[i];
      assert.ok(m > 0, 'every cell used');
      assert.ok(bitCount(m) <= 3, 'no cross tiles');
      degSum += bitCount(m);
    }
    assert.equal(degSum / 2, n * n - 1, 'spanning tree edge count');
    assert.equal(looseEnds(n, p.sol), 0);
    assert.ok(isSolved(n, p.sol, p.source), 'stored solution solves the puzzle');
    assert.ok(powered(n, p.sol, p.source).every(Boolean));
    // the scrambled board is not solved and par is computed correctly
    const scrambled = p.sol.map((_, i) => currentMask(p, i, 0));
    assert.ok(p.par > 0);
    // brute-force par: per tile, try rotating by t in -2..2 and keep the cheapest that matches the solution
    let par = 0;
    for (let i = 0; i < n * n; i++) {
      let best = Infinity;
      for (let t = -2; t <= 2; t++) if (rotMask(scrambled[i], t) === p.sol[i]) best = Math.min(best, Math.abs(t));
      assert.ok(Number.isFinite(best));
      par += best;
    }
    assert.equal(par, p.par);
    // applying the par rotations yields a solved board
    const fixed = scrambled.map((m, i) => {
      for (let t = 0; t < 4; t++) if (rotMask(m, t) === p.sol[i]) return rotMask(m, t);
      return -1;
    });
    assert.ok(isSolved(n, fixed, p.source));
    // source is a real tile, chips are leaf tiles
    assert.ok(p.source >= 0 && p.source < n * n);
    for (const c of chipTiles(p)) assert.equal(bitCount(p.sol[c]), 1);
    assert.ok(chipTiles(p).length >= 2);
    // neighbours helper sanity
    assert.equal(neighbors(n, 0).length, 2);
    parSum += p.par;
  }
  console.log(`moore d${d}: ${SEEDS} puzzles (${n}x${n}) OK, avg par ${(parSum / SEEDS).toFixed(1)}`);
}

// an unsolved scramble must not pass the win check (spot check)
const pz = generatePuzzle(2, 7);
assert.ok(!isSolved(pz.n, pz.sol.map((_, i) => currentMask(pz, i, 0)), pz.source));

// scoring
assert.equal(starsForMoves(20, 20), 3);
assert.equal(starsForMoves(20, 29), 3);
assert.equal(starsForMoves(20, 30), 2);
assert.equal(starsForMoves(20, 46), 2);
assert.equal(starsForMoves(20, 47), 1);
console.log('moore: ALL PASS');
