// Headless balance simulator: a scripted "reasonable player" plays full games.
// Usage: node tools/sim/sim.ts [continent] [mode] [strategy] [seed]
import { countBuildings, gameReducer, initialState } from '../../src/game/engine.ts';
import { botDecide, type BotStrategy } from '../../src/game/bot.ts';
import type { GameState } from '../../src/game/types.ts';

const [cont = 'eu', mode = 'complete', strat = 'balanced', seedArg = '7'] = process.argv.slice(2);
const verbose = process.env.V === '1';

let s = gameReducer({ ...initialState, gameMode: mode as GameState['gameMode'] }, { type: 'START_GAME', continentId: cont, seed: Number(seedArg) });
let lastYear = Math.floor(s.year) - 1;
let guard = 0;
while (s.screen === 'game' && guard++ < 200000) {
  s = botDecide(s, strat as BotStrategy);
  s = gameReducer(s, { type: 'TICK' });
  const y = Math.floor(s.year);
  if (y !== lastYear && (y % 5 === 0 || verbose)) {
    lastYear = y;
    const e = s.eco;
    const lead = [...s.rivals].sort((a, b) => b.capability - a.capability)[0];
    console.log(
      `${y} bud ${s.budget.toFixed(0).padStart(6)} gdp ${e.gdp.toFixed(0).padStart(6)} inc ${e.income.toFixed(0).padStart(5)} upk ${e.upkeep.toFixed(0).padStart(5)} tax ${(s.taxRate*100).toFixed(0)} pop ${s.population.toFixed(0)} food ${(e.foodSupply / e.foodDemand).toFixed(2)} house ${(e.housingCap/s.population).toFixed(2)} unemp ${(e.unemployment*100).toFixed(0)}% staff ${e.staffing.toFixed(2)} en ${(e.energySupply / e.energyDemand).toFixed(2)} edu ${s.education.toFixed(0)} rp/y ${e.researchRate.toFixed(0)} techs ${s.unlockedTechs.length} C ${s.capability.toFixed(1)} al ${s.alignment.toFixed(0)} app ${s.approval.toFixed(0)} em ${e.emissions.toFixed(0)} T ${s.temperature.toFixed(2)} planet ${s.planetHealth.toFixed(0)} bld ${countBuildings(s)} reg ${s.ownedRegions.length} | lead ${lead.id} ${lead.capability.toFixed(1)} al ${lead.alignment.toFixed(0)}`,
    );
  }
}
const comp: Record<string, string> = {}; for (const t of s.map!.tiles) if (t.building) comp[t.building.type] = (comp[t.building.type] ? comp[t.building.type] + ',' : '') + t.building.level;
console.log('buildings', JSON.stringify(comp), 'techs', s.unlockedTechs.join(' '));
console.log('ai', JSON.stringify(s.map!.tiles.filter(t=>t.building?.type==='aifactory').map(t=>t.building)), 'raw', s.eco.computeRaw.toExponential(2), 'mult', s.eco.computeMult.toFixed(0), 'er', s.eco.energyRatio.toFixed(2), 'staff', s.eco.staffing.toFixed(2));
console.log('world em', (s.eco.emissions + s.rivals.reduce((a,b)=>a+b.emissions,0)).toFixed(0), 'rivals', s.rivals.map(r=>r.id+':'+r.capability.toFixed(1)+'/'+r.alignment.toFixed(0)+'/rel'+r.relation.toFixed(0)+'/'+r.treaties.join('+')).join(' '));
console.log('END', s.screen, s.outcome, Math.floor(s.year), '|', s.gameOverReason.slice(0, 160));
