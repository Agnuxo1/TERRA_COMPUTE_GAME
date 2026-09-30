// Scripted "reasonable player" used by the balance simulator (tools/sim) and the dev autoplay.
import { buildingById } from './data.ts';
import {
  countBuildings, evaluatePlacement, gameReducer, has, isUnlocked, regionCost, scaledCost, upgradeCost,
  TREATY_INFO, giftCost, covertCost, techAvailable, alignmentCap,
} from './engine.ts';
import type { BuildingId, GameState } from './types.ts';

export type BotStrategy = 'balanced' | 'greedy' | 'dirty' | 'nosafety';

function bestTile(s: GameState, type: BuildingId): number | null {
  let best: number | null = null, score = -Infinity;
  for (const t of s.map!.tiles) {
    const pl = evaluatePlacement(s, t, type);
    if (!pl.ok) continue;
    const sc = pl.mult - (t.terrain === 'forest' ? 0.25 : 0) - (type !== 'housing' && t.building === undefined && t.terrain === 'fertile' && type !== 'farm' && type !== 'nuclear' ? 0.2 : 0);
    if (sc > score) { score = sc; best = t.id; }
  }
  return best;
}

function tryBuild(s: GameState, type: BuildingId, reserve = 0): GameState {
  if (!isUnlocked(s, type)) return s;
  const cost = scaledCost(s, type);
  if (s.budget - reserve < cost) return s;
  const tile = bestTile(s, type);
  if (tile === null) return tryExpand(s) ;
  return gameReducer(s, { type: 'BUILD', tileId: tile, building: type });
}

function tryExpand(s: GameState): GameState {
  const cand = s.map!.regions.filter(r => !s.ownedRegions.includes(r.id)).sort((a, b) => regionCost(s, a.id) - regionCost(s, b.id))[0];
  if (cand && s.budget > regionCost(s, cand.id)) return gameReducer(s, { type: 'DEVELOP_REGION', regionId: cand.id });
  return s;
}

function tryUpgrade(s: GameState, types: BuildingId[]): GameState {
  const t = s.map!.tiles.find(t => t.building && types.includes(t.building.type) && t.building.level < 3 && t.building.progress >= 1 && !t.building.upgrading && upgradeCost(s, t) < s.budget);
  return t ? gameReducer(s, { type: 'UPGRADE', tileId: t.id }) : s;
}

const TECH_PRIORITY = ['transistor', 'mass_edu', 'ic', 'greenrev', 'nuclear', 'cybernetics', 'micro', 'container', 'envprot', 'vector', 'solar', 'space', 'litho', 'pc', 'internet', 'backprop', 'climate', 'web', 'gpu', 'dl', 'alignment', 'transformer', 'renew', 'scaling', 'interp', 'agentic', 'robotics', 'agi', 'fusion', 'asi'];

export function botDecide(s: GameState, strat: BotStrategy = 'balanced'): GameState {
  const e = s.eco;
  const dirty = strat === 'dirty';
  const greedy = strat === 'greedy';
  // research
  if (!s.researching) {
    const next = TECH_PRIORITY.find(id => techAvailable(s, id));
    if (next) s = gameReducer(s, { type: 'RESEARCH', techId: next });
  }
  // events
  if (s.activeEvent) {
    const ev = s.activeEvent.event;
    if (ev.minigame) s = gameReducer(s, { type: 'MINIGAME_DONE', minigame: ev.minigame, stars: 2 });
    else s = gameReducer(s, { type: 'RESOLVE_EVENT', choice: ev.choices.findIndex(c => !c.cost || c.cost < s.budget) });
  }
  const reserve = Math.max(0, -e.netBudget * 2);
  const fr = e.foodSupply / e.foodDemand;
  const pending = (t: BuildingId) => s.map!.tiles.some(x => x.building?.type === t && x.building.progress < 1);
  if (fr < 1.06 && !pending('farm')) s = tryBuild(s, 'farm');
  if (s.population > e.housingCap * 0.95 && !pending('housing')) s = tryBuild(s, 'housing');
  if (e.energySupply < e.energyDemand * 1.1 && !['coal','nuclear','solar','fusion'].some(t => pending(t as BuildingId))) {
    const clean: BuildingId[] = dirty ? ['coal'] : ['fusion', 'nuclear', 'solar', 'coal'];
    const pick = clean.find(t => isUnlocked(s, t) && s.budget > scaledCost(s, t) && bestTile(s, t) !== null) ?? 'coal';
    s = tryBuild(s, pick);
  }
  if (e.unemployment > 0.07) s = tryBuild(s, countBuildings(s, 'factory') > countBuildings(s, 'market') * 2 ? 'market' : 'factory', reserve);
  if (s.approval < 50 && countBuildings(s, 'hospital') < 1 + countBuildings(s) / 10) s = tryBuild(s, 'hospital', reserve);
  if (e.eduTarget < 85 && countBuildings(s, 'school') < 2 + s.population / 90) s = tryBuild(s, 'school', reserve);
  if (has(s, 'mass_edu') && countBuildings(s, 'uni') < 1 + countBuildings(s, 'lab') / 2) s = tryBuild(s, 'uni', reserve);
  if (isUnlocked(s, 'lab') && countBuildings(s, 'lab') < 3 + (s.year - 1960) / 6) s = tryBuild(s, 'lab', reserve);
  // safety
  if (strat !== 'nosafety' && isUnlocked(s, 'defense') && s.capability > 13 && s.alignment < alignmentCap(s) - 3 && e.alignmentGain < e.alignmentPressure + 3) {
    s = tryBuild(s, 'defense', reserve);
    s = tryUpgrade(s, ['defense']);
  }
  // compute: best available
  const comp: BuildingId[] = ['aifactory', 'gpucluster', 'datacenter', 'super', 'mainframe'];
  const top = comp.find(t => isUnlocked(s, t));
  if (top && e.energySupply > e.energyDemand + buildingById[top].energyUse * 0.8) {
    if (bestTile(s, top) === null && s.budget > scaledCost(s, top) * 1.1) {
      // Map full: recycle the weakest compute building or a surplus farm.
      const order: BuildingId[] = ['mainframe', 'super', 'datacenter', 'gpucluster'];
      const victim = order.filter(t => t !== top).map(t => s.map!.tiles.find(x => x.building?.type === t && x.building.progress >= 1)).find(Boolean);
      if (victim) s = gameReducer(s, { type: 'DEMOLISH', tileId: victim.id });
    }
    s = tryBuild(s, top, greedy ? 0 : reserve);
  }
  s = tryUpgrade(s, comp.filter(t => isUnlocked(s, t)).slice(0, 2));
  if (isUnlocked(s, 'chipfab') && countBuildings(s, 'chipfab') < 3 && s.year > 1985) s = tryBuild(s, 'chipfab', reserve);
  if (isUnlocked(s, 'seaport') && countBuildings(s, 'seaport') < 2) s = tryBuild(s, 'seaport', reserve);
  // upgrades when rich
  if (s.budget > 1.5 * (e.income)) s = tryUpgrade(s, ['lab', 'uni', 'farm', 'housing', 'factory', ...comp, 'nuclear', 'solar']);
  // expansion
  const free = s.map!.tiles.filter(t => t.region && s.ownedRegions.includes(t.region) && !t.building && t.terrain !== 'water').length;
  if (free < 6) s = tryExpand(s);
  // diplomacy
  for (const r of s.rivals) {
    for (const tid of ['trade', 'research', 'climate', 'safety'] as const) {
      const info = TREATY_INFO[tid];
      if (!r.treaties.includes(tid) && (!info.tech || has(s, info.tech)) && r.relation >= info.need) {
        if (tid === 'climate' && dirty) continue;
        s = gameReducer(s, { type: 'DIPLOMACY', rivalId: r.id, action: tid });
      }
    }
    if (strat === 'balanced' && r.relation < 15 && r.relation > -10 && s.budget > giftCost(s) * 6 && s.year > 1985) s = gameReducer(s, { type: 'DIPLOMACY', rivalId: r.id, action: 'gift' });
  }
  // sabotage the front-runner late game
  if (strat === 'balanced' && s.year > 2022) {
    const lead = [...s.rivals].sort((a, b) => b.capability - a.capability)[0];
    if (lead.capability > s.capability - 0.5 && s.budget > covertCost(s, 'sabotage') * 3) s = gameReducer(s, { type: 'COVERT', rivalId: lead.id, op: 'sabotage' });
  }
  // tax
  if (e.netBudget < 0 && s.taxRate < 0.3) s = gameReducer(s, { type: 'SET_TAX', rate: s.taxRate + 0.01 });
  if (e.netBudget > e.income * 0.5 && s.approval < 55 && s.taxRate > 0.15) s = gameReducer(s, { type: 'SET_TAX', rate: s.taxRate - 0.01 });
  // ignite
  if (s.playerLaunchReady && s.alignment >= 80) s = gameReducer(s, { type: 'IGNITE_ASI' });
  return s;
}

