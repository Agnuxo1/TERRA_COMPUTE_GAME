// Lists every decision a scripted game meets (pacing check): node tools/sim/events.ts [continent] [mode] [strategy] [seed]
import { gameReducer, initialState } from '../../src/game/engine.ts';
import { botDecide, type BotStrategy } from '../../src/game/bot.ts';
import type { GameState } from '../../src/game/types.ts';

const [cont = 'eu', mode = 'complete', strat = 'balanced', seedArg = '7'] = process.argv.slice(2);
let s = gameReducer({ ...initialState, gameMode: mode as GameState['gameMode'] }, { type: 'START_GAME', continentId: cont, seed: Number(seedArg) });
const seen: string[] = [];
let guard = 0;
while (s.screen === 'game' && guard++ < 200000) {
  if (s.activeEvent && seen[seen.length - 1] !== s.activeEvent.id) { seen.push(s.activeEvent.id); console.log(Math.floor(s.year), s.activeEvent.event.minigame ? '[exercise]' : '', s.activeEvent.event.name); }
  s = botDecide(s, strat as BotStrategy);
  s = gameReducer(s, { type: 'TICK' });
}
console.log('END', s.outcome, Math.floor(s.year), 'decisions', seen.length);
