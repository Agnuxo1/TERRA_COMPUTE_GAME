// Prints when the bot reaches key milestones. Usage: node tools/sim/milestones.ts eu complete balanced 11
import { gameReducer, initialState } from '../../src/game/engine.ts';
import { botDecide, type BotStrategy } from '../../src/game/bot.ts';
import type { GameState } from '../../src/game/types.ts';
const [cont = 'eu', mode = 'complete', strat = 'balanced', seed = '11'] = process.argv.slice(2);
let s = gameReducer({ ...initialState, gameMode: mode as GameState['gameMode'] }, { type: 'START_GAME', continentId: cont, seed: Number(seed) });
const seen = new Set<string>();
const mark = (k: string, cond: boolean) => { if (cond && !seen.has(k)) { seen.add(k); console.log(Math.floor(s.year), k); } };
while (s.screen === 'game') {
  s = gameReducer(botDecide(s, strat as BotStrategy), { type: 'TICK' });
  for (const t of ['gpu', 'dl', 'transformer', 'scaling', 'agentic', 'interp', 'agi', 'asi']) mark('tech ' + t, s.unlockedTechs.includes(t));
  for (const c of [15, 18, 21, 22, 23, 24]) mark('C>=' + c, s.capability >= c);
  mark('aifactory', !!s.map!.tiles.some(t => t.building?.type === 'aifactory' && t.building.progress >= 1));
  mark('chipfab', !!s.map!.tiles.some(t => t.building?.type === 'chipfab' && t.building.progress >= 1));
  mark('rival C>=22', s.rivals.some(r => r.capability >= 22));
}
console.log('END', Math.floor(s.year), s.outcome, 'budget', Math.round(s.budget), 'chips', Math.round(s.chips), 'steel', Math.round(s.steel), 'policies', s.policies.join(','));
