// Balance sweep: the balanced bot plays every continent with three seeds and the run fails when a game throws,
// produces NaN, or the overall win rate leaves the agreed band.
//   node tools/sim/sweep.ts [minRate=0.40] [maxRate=0.75]
import { gameReducer, initialState } from '../../src/game/engine.ts';
import { botDecide } from '../../src/game/bot.ts';
import { isVictory, type GameState } from '../../src/game/types.ts';

const [minArg = '0.40', maxArg = '0.75'] = process.argv.slice(2);
const CONTINENTS = ['na', 'eu', 'su', 'cn', 'af', 'sa', 'in', 'oc'];
const SEEDS = [11, 22, 33];
const numeric: Array<keyof GameState> = ['budget', 'population', 'approval', 'alignment', 'capability', 'planetHealth', 'researchPoints'];

let wins = 0, games = 0;
const failures: string[] = [];
const rows: string[] = [];
for (const c of CONTINENTS) {
  for (const seed of SEEDS) {
    games++;
    try {
      let s = gameReducer({ ...initialState, gameMode: 'complete' }, { type: 'START_GAME', continentId: c, seed });
      let guard = 0;
      while (s.screen === 'game' && guard++ < 200000) {
        s = botDecide(s, 'balanced');
        s = gameReducer(s, { type: 'TICK' });
      }
      const bad = numeric.filter(k => !Number.isFinite(s[k] as number));
      if (bad.length) failures.push(`${c} ${seed}: non-finite ${bad.join(', ')}`);
      if (s.screen === 'game') failures.push(`${c} ${seed}: did not finish`);
      const won = isVictory(s.outcome);
      if (won) wins++;
      rows.push(`${c} ${seed} ${won ? 'WIN ' : 'LOSS'} ${s.outcome} ${Math.floor(s.year)}`);
    } catch (e) {
      failures.push(`${c} ${seed}: ${(e as Error).stack?.split('\n').slice(0, 3).join(' | ')}`);
    }
  }
}
const rate = wins / games;
console.log(rows.join('\n'));
console.log(`win rate ${wins}/${games} = ${(rate * 100).toFixed(0)}% (band ${Number(minArg) * 100}–${Number(maxArg) * 100}%)`);
if (rate < Number(minArg) || rate > Number(maxArg)) failures.push(`win rate ${(rate * 100).toFixed(0)}% outside the band`);
if (failures.length) {
  console.error('FAILED:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('OK');
