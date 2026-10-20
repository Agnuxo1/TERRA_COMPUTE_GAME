// Living-rivals inspector: runs a scripted game and prints every rival's posture every 10 years.
// Usage: node tools/sim/ai-check.ts [continent] [mode] [strategy] [seed]   (default: eu complete balanced 22)
import { gameReducer, initialState } from '../../src/game/engine.ts';
import { botDecide, type BotStrategy } from '../../src/game/bot.ts';
import type { GameState } from '../../src/game/types.ts';

const [cont = 'eu', mode = 'complete', strat = 'balanced', seedArg = '22'] = process.argv.slice(2);

let s = gameReducer({ ...initialState, gameMode: mode as GameState['gameMode'] }, { type: 'START_GAME', continentId: cont, seed: Number(seedArg) });
let lastDecade = -1;
let guard = 0;
while (s.screen === 'game' && guard++ < 200000) {
  s = botDecide(s, strat as BotStrategy);
  s = gameReducer(s, { type: 'TICK' });
  const y = Math.floor(s.year);
  const decade = Math.floor(y / 10) * 10;
  if (decade !== lastDecade && y % 10 === 0) {
    lastDecade = decade;
    console.log(`── ${y} ──`);
    for (const r of s.rivals) {
      const n = r.nation;
      console.log(
        `${y} ${r.id.padEnd(3)} ${(n?.mood ?? '-').padEnd(9)} lag ${r.lag.toFixed(2).padStart(6)} al ${r.alignment.toFixed(0).padStart(3)} ` +
        `compute ${(n?.invest.compute ?? 0).toFixed(1).padStart(6)}B  plan: ${n?.plan || '-'}`,
      );
    }
  }
}
console.log('END', s.screen, s.outcome, Math.floor(s.year), '|', s.gameOverReason.slice(0, 120));
