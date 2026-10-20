// Strategic zones check: a full bot game for continent eu, seed 22. Prints each zone's holder and top influences every 10 years.
// Usage: node tools/sim/zones-check.ts
import { gameReducer, initialState } from '../../src/game/engine.ts';
import { botDecide, type BotStrategy } from '../../src/game/bot.ts';
import type { GameState } from '../../src/game/types.ts';
import { ZONES, zoneHolder } from '../../src/game/zones.ts';

const CONT = 'eu';
const MODE = 'complete';
const STRAT = 'balanced';
const SEED = 22;

let s = gameReducer({ ...initialState, gameMode: MODE as GameState['gameMode'] }, { type: 'START_GAME', continentId: CONT, seed: SEED });
let lastDecade = -1;
let warned = false;
let guard = 0;
while (s.screen === 'game' && guard++ < 200000) {
  s = botDecide(s, STRAT as BotStrategy);
  s = gameReducer(s, { type: 'TICK' });
  const y = Math.floor(s.year);
  if (y % 10 !== 0 || y === lastDecade) continue;
  lastDecade = y;
  if (!s.zones) {
    if (!warned) console.log('zones not wired (s.zones is undefined); the game still runs to the end');
    warned = true;
    continue;
  }
  const zones = s.zones;
  const parts = ZONES.map(z => {
    const zs = zones[z.id];
    const top = Object.entries(zs.influence)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([b, v]) => `${b}:${v.toFixed(0)}`)
      .join(' ');
    return `${z.id}=${zoneHolder(zs) ?? 'none'} [${top || '-'}]`;
  });
  console.log(`${y} ${parts.join(' | ')}`);
}
console.log('END', s.screen, s.outcome, Math.floor(s.year), '|', s.gameOverReason.slice(0, 120));
