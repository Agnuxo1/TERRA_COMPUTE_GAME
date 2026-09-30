import assert from 'node:assert/strict';
import { mulberry32 } from '../../src/components/minigames/logic/rng.ts';
import { ITEMS, drawItems, attentionWeights, streakMultiplier, scoreAttention, secondsPerItem } from '../../src/components/minigames/logic/attention.ts';

assert.ok(ITEMS.length >= 30, `need 30+ items, have ${ITEMS.length}`);
const seen = new Set<string>();
for (const it of ITEMS) {
  assert.ok(it.tokens.length >= 5, 'sentence too short');
  assert.ok(it.query >= 0 && it.query < it.tokens.length, `query out of range #${it.id}`);
  assert.ok(it.answer >= 0 && it.answer < it.tokens.length, `answer out of range #${it.id}`);
  assert.notEqual(it.answer, it.query, `answer == query #${it.id}`);
  assert.ok(it.tokens[it.answer].length > 0);
  for (const d of it.distractors) assert.ok(d >= 0 && d < it.tokens.length && d !== it.answer && d !== it.query);
  assert.ok(it.explain.length > 10, 'missing explanation');
  const s = it.tokens.join(' ');
  assert.ok(!seen.has(s), 'duplicate sentence ' + s);
  seen.add(s);
  assert.ok(!/[*^~]/.test(s), 'markup leaked');
  for (let k = 1; k <= 40; k++) {
    const w = attentionWeights(it, mulberry32(k * 13 + it.id));
    assert.equal(w.length, it.tokens.length);
    assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9);
    assert.equal(w.indexOf(Math.max(...w)), it.answer, `argmax != answer #${it.id}`);
    assert.ok(w.every(x => x > 0));
  }
}
for (let seed = 1; seed <= 500; seed++) {
  const d = drawItems(seed);
  assert.equal(d.length, 8);
  assert.equal(new Set(d.map(x => x.id)).size, 8, 'repeat within a game');
}
assert.deepEqual(drawItems(7).map(x => x.id), drawItems(7).map(x => x.id));
assert.notDeepEqual(drawItems(7).map(x => x.id), drawItems(8).map(x => x.id));
assert.deepEqual([0, 1, 2, 3, 4, 5].map(streakMultiplier), [1, 1, 1, 2, 2, 3]);
assert.deepEqual([0, 2, 3, 4, 5, 6, 7, 8].map(scoreAttention), [0, 0, 1, 1, 2, 2, 3, 3]);
assert.deepEqual([1, 2, 3].map(secondsPerItem), [20, 14, 9]);
console.log(`attention: ${ITEMS.length} items OK`);
