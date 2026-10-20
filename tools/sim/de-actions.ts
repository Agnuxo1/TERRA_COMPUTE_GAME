// Phases D & E: drives the new reducer actions (zones, projects, scientists) through a real game and prints the effects.
// node tools/sim/de-actions.ts [continent] [seed]
import { gameReducer, initialState, worldBonus, alignmentCap } from '../../src/game/engine.ts';
import { botDecide } from '../../src/game/bot.ts';
import { available } from '../../src/game/people.ts';
import { pickEnding } from '../../src/game/endings.ts';
import type { GameState, ProjectId, ZoneId } from '../../src/game/types.ts';

const [cont = 'eu', seedArg = '22'] = process.argv.slice(2);
let s = gameReducer({ ...initialState, gameMode: 'complete' }, { type: 'START_GAME', continentId: cont, seed: Number(seedArg) });
const me = s.playerContinent!;
let lastYear = Math.floor(s.year);
const order: ProjectId[] = ['satnet', 'smart_city', 'apollo', 'align_inst', 'fab1nm'];
let guard = 0;
while (s.screen === 'game' && guard++ < 200000) {
  s = botDecide(s, 'balanced');
  s = gameReducer(s, { type: 'TICK' });
  const y = Math.floor(s.year);
  if (y === lastYear) continue;
  lastYear = y;
  // Every year: one scientist if a seat is free, one project stage, influence in the Gulf and Suez, a coup every 7 years.
  const sc = available(s)[0];
  if (sc && (s.talent?.hired.length ?? 0) < 4) s = gameReducer(s, { type: 'HIRE', scientist: sc.id });
  for (const p of order) { const before = s.budget; s = gameReducer(s, { type: 'PROJECT_STAGE', project: p }); if (s.budget !== before) break; }
  for (const z of ['gulf', 'suez'] as ZoneId[]) s = gameReducer(s, { type: 'INFLUENCE', zone: z });
  if (y % 7 === 0) {
    const g = s.zones?.gulf;
    const target = g && Object.entries(g.influence).filter(([b]) => b !== me).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (target) s = gameReducer(s, { type: 'COUP', zone: 'gulf', target });
  }
  if (y % 10 === 0) {
    const held = Object.entries(s.zones ?? {}).filter(([, z]) => z.holder === me).map(([id]) => id);
    const owned = Object.entries(s.projects ?? {}).filter(([, p]) => p.owner).map(([id, p]) => `${id}:${p.owner}${p.owner === me ? '*' : ''}`);
    const wb = worldBonus(s as GameState);
    console.log(`${y} held=[${held}] projects=[${owned}] team=[${s.talent?.hired}] lost=[${s.talent?.lost}] flags=[${Object.keys(s.flags ?? {})}]`);
    console.log(`     bonus compute×${wb.compute.toFixed(2)} research×${wb.research.toFixed(2)} power×${wb.powerSupply} trade×${wb.trade} covert+${wb.covert.toFixed(2)} approval+${wb.approval} cap=${alignmentCap(s)} budget=${Math.round(s.budget)}`);
  }
}
const e = pickEnding(s);
console.log(`END ${s.screen} ${s.outcome} ${Math.floor(s.year)} | ${e.key}: ${e.headline}`);
