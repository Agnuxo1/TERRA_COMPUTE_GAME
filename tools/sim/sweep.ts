// Balance sweep: the balanced bot plays every continent with three seeds and the run fails when a game throws,
// produces NaN, or the overall win rate leaves the agreed band.
//   node tools/sim/sweep.ts [minRate=0.40] [maxRate=0.75]      (SEEDS=1,2,3,… to change the seeds)
import { gameReducer, initialState } from '../../src/game/engine.ts';
import { botDecide } from '../../src/game/bot.ts';
import { isVictory, type GameState } from '../../src/game/types.ts';

const [minArg = '0.40', maxArg = '0.75'] = process.argv.slice(2);
const CONTINENTS = ['na', 'eu', 'su', 'cn', 'af', 'sa', 'in', 'oc'];
const SEEDS = process.env.SEEDS ? process.env.SEEDS.split(',').map(Number) : [11, 22, 33];
const numeric: Array<keyof GameState> = ['budget', 'population', 'approval', 'alignment', 'capability', 'planetHealth', 'researchPoints'];

let wins = 0, games = 0;
const byFaction: Record<string, number> = {};
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
      if (won) { wins++; byFaction[c] = (byFaction[c] ?? 0) + 1; }
      rows.push(`${c} ${seed} ${won ? 'WIN ' : 'LOSS'} ${s.outcome} ${Math.floor(s.year)}`);
    } catch (e) {
      failures.push(`${c} ${seed}: ${(e as Error).stack?.split('\n').slice(0, 3).join(' | ')}`);
    }
  }
}
const rate = wins / games;
console.log(rows.join('\n'));
console.log('per faction: ' + CONTINENTS.map(c => `${c} ${byFaction[c] ?? 0}/${SEEDS.length}`).join('  '));
console.log(`win rate ${wins}/${games} = ${(rate * 100).toFixed(0)}% (band ${Number(minArg) * 100}–${Number(maxArg) * 100}%)`);
if (rate < Number(minArg) || rate > Number(maxArg)) failures.push(`win rate ${(rate * 100).toFixed(0)}% outside the band`);
// Faction symmetry (guide 8.3): with FACTION_BAND=0.35,0.75 every faction must stay inside it too.
if (process.env.FACTION_BAND) {
  const [lo, hi] = process.env.FACTION_BAND.split(',').map(Number);
  for (const c of CONTINENTS) {
    const r = (byFaction[c] ?? 0) / SEEDS.length;
    if (r < lo || r > hi) failures.push(`${c} win rate ${(r * 100).toFixed(0)}% outside ${lo * 100}–${hi * 100}%`);
  }
}
if (failures.length) {
  console.error('FAILED:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('OK');
