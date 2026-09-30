import assert from 'node:assert/strict';
import { CODE_LEN, allCodes, generateSecret, isValidGuess, scoreGuess, solve, starsForAttempts, turingConfig } from '../../src/components/minigames/logic/turing.ts';

// scoring unit cases (duplicates)
assert.deepEqual(scoreGuess([0, 0, 1, 2], [0, 1, 0, 0]), { exact: 1, partial: 2 });
assert.deepEqual(scoreGuess([0, 1, 2, 3], [3, 2, 1, 0]), { exact: 0, partial: 4 });
assert.deepEqual(scoreGuess([1, 1, 2, 2], [1, 1, 1, 1]), { exact: 2, partial: 0 });
assert.deepEqual(scoreGuess([0, 1, 2, 3], [0, 1, 2, 3]), { exact: 4, partial: 0 });
assert.deepEqual(scoreGuess([0, 0, 0, 1], [1, 0, 0, 0]), { exact: 2, partial: 2 });

for (const d of [1, 2, 3] as const) {
  const cfg = turingConfig(d);
  const codes = allCodes(d);
  let worst = 0;
  // Exhaustive: every possible secret must be solvable within max attempts.
  for (const secret of codes) worst = Math.max(worst, solve(d, secret, codes));
  assert.ok(worst <= cfg.maxAttempts, `d${d}: worst ${worst} > ${cfg.maxAttempts}`);
  // Seeded generation: valid, deterministic, obeys repeat rule.
  for (let seed = 1; seed <= 400; seed++) {
    const s = generateSecret(d, seed);
    assert.equal(s.length, CODE_LEN);
    assert.ok(isValidGuess(d, s));
    assert.deepEqual(s, generateSecret(d, seed));
  }
  assert.equal(starsForAttempts(d, cfg.star3), 3);
  assert.equal(starsForAttempts(d, cfg.star3 + 1), cfg.star2 >= cfg.star3 + 1 ? 2 : 1);
  assert.equal(starsForAttempts(d, cfg.star2), 2);
  assert.equal(starsForAttempts(d, cfg.star2 + 1), 1);
  console.log(`turing d${d}: ${codes.length} codes, worst solver attempts ${worst}/${cfg.maxAttempts} OK`);
}
console.log('turing: ALL PASS');
