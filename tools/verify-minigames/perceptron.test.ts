import assert from 'node:assert/strict';
import {
  B_MAX, B_MIN, DOMAIN, W_MAX, W_MIN, accuracy, clipHalfPlane, finalStars, findGridSolution, generateDataset,
  lineSegment, misclassified, perceptronConfig, rosenblattStepsToConverge, starsForActions, trainStep,
} from '../../src/components/minigames/logic/perceptron.ts';

const SEEDS = 300;
for (const d of [1, 2, 3] as const) {
  const cfg = perceptronConfig(d);
  let maxSteps = 0;
  let sumSteps = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const ds = generateDataset(d, seed);
    assert.equal(ds.points.length, cfg.points);
    assert.deepEqual(ds, generateDataset(d, seed));
    for (const p of ds.points) assert.ok(Math.abs(p.x) <= DOMAIN && Math.abs(p.y) <= DOMAIN);
    const pos = ds.points.filter(p => p.label === 1).length;
    assert.ok(pos >= 3 && ds.points.length - pos >= 3, 'balanced classes');
    // hidden params are on the slider grid and separate perfectly
    const h = ds.hidden;
    assert.equal(misclassified(h, ds.points).length, 0);
    assert.ok(h.w1 >= W_MIN && h.w1 <= W_MAX && h.w2 >= W_MIN && h.w2 <= W_MAX && h.b >= B_MIN && h.b <= B_MAX);
    assert.ok((h.w1 * 2) % 1 === 0 && (h.w2 * 2) % 1 === 0 && (h.b * 2) % 1 === 0);
    // brute force on the grid finds a solution
    const sol = findGridSolution(ds.points);
    assert.ok(sol, `no grid solution d${d} seed ${seed}`);
    assert.equal(accuracy(sol, ds.points), 1);
    // start is not already solved
    assert.ok(misclassified(ds.start, ds.points).length >= 3);
    // Rosenblatt converges
    const steps = rosenblattStepsToConverge(ds.start, ds.points);
    assert.ok(Number.isFinite(steps), `no convergence d${d} seed ${seed}`);
    maxSteps = Math.max(maxSteps, steps);
    sumSteps += steps;
    assert.equal(trainStep(h, ds.points), null); // step on a solved state is a no-op
    assert.ok(lineSegment(h) !== null);
  }
  console.log(`perceptron d${d}: ${SEEDS} datasets OK, rosenblatt avg ${(sumSteps / SEEDS).toFixed(1)} max ${maxSteps} steps`);
}

// scoring
assert.equal(starsForActions(1, 6), 3);
assert.equal(starsForActions(1, 7), 2);
assert.equal(starsForActions(1, 13), 1);
assert.equal(finalStars([3, 3, 2]), 2);
assert.equal(finalStars([3, 3, 3]), 3);
assert.equal(finalStars([3, 0, 0]), 1);
assert.equal(finalStars([0, 0, 0]), 0);

// half-plane clip areas sum to the full square
const sq = [{ x: -6, y: -6 }, { x: 6, y: -6 }, { x: 6, y: 6 }, { x: -6, y: 6 }];
const area = (p: { x: number; y: number }[]) =>
  Math.abs(p.reduce((s, a, i) => { const c = p[(i + 1) % p.length]; return s + a.x * c.y - c.x * a.y; }, 0)) / 2;
const prm = { w1: 1.5, w2: -2, b: 3 };
const a1 = area(clipHalfPlane(sq, prm, 1));
const a2 = area(clipHalfPlane(sq, prm, -1));
assert.ok(Math.abs(a1 + a2 - 144) < 1e-6);
// line segment endpoints satisfy the line equation
const seg = lineSegment(prm)!;
for (const v of seg) assert.ok(Math.abs(prm.w1 * v.x + prm.w2 * v.y + prm.b) < 1e-6);
console.log('perceptron: ALL PASS');
