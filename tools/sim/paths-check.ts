// Forces the alternative victories by state injection and prints how each game ends.
// Usage: node tools/sim/paths-check.ts
// Paths: World Assembly (governance), chip hegemony (silicon), shared custody after a rival's safe ASI (custodian).
import { chipWorldShare, custodianReady, gameReducer, governanceVotes, initialState } from '../../src/game/engine.ts';
import { botDecide } from '../../src/game/bot.ts';
import { finalScore } from '../../src/game/score.ts';
import type { GameState } from '../../src/game/types.ts';

function start(): GameState {
  return gameReducer({ ...initialState, gameMode: 'complete' }, { type: 'START_GAME', continentId: 'eu', seed: 22 });
}

/**
 * One bot turn. The bot is told that its own ignition is not ready, so it never ends the game early:
 * the path under test is the one that ends it.
 */
function botTurn(s: GameState): GameState {
  return botDecide({ ...s, playerLaunchReady: false }, 'balanced');
}

/** The balanced bot plays (and resolves events) until the given year, or the game ends. */
function playUntil(s: GameState, year: number): GameState {
  let guard = 0;
  while (s.screen === 'game' && s.year < year && guard++ < 200000) {
    s = botTurn(s);
    s = gameReducer(s, { type: 'TICK' });
  }
  return s;
}

/** Runs ticks (the bot still answers events) until the game ends or the guard runs out. */
function finish(s: GameState): GameState {
  let guard = 0;
  while (s.screen === 'game' && guard++ < 5000) {
    s = botTurn(s);
    s = gameReducer(s, { type: 'TICK' });
  }
  return s;
}

function show(label: string, s: GameState, extra = '') {
  const sc = finalScore(s);
  console.log(`${label}: screen=${s.screen} outcome=${s.outcome} year=${Math.floor(s.year)} score=${sc.total} rank=${sc.rank} ${extra}`);
  console.log(`  ${s.gameOverReason.slice(0, 160)}`);
}

// 1. World Assembly: the AI Control Treaty was tabled; the 1995 assembly votes.
{
  let s = playUntil(start(), 1994);
  s = { ...s, activeEvent: null, eventQueue: [], year: 1994.99, aiControlProposed: true, assemblyNext: 1995,
    rivals: s.rivals.map((r, i) => i < 4 ? { ...r, relation: Math.max(r.relation, 40), treaties: r.treaties.includes('safety') ? r.treaties : [...r.treaties, 'safety'] } : r) };
  const votes = governanceVotes(s);
  s = finish(s);
  show('GOVERNANCE', s, `votes=${votes}/8`);
}

// 2. Silicon hegemony: five years at 60%+ of the world chip estimate (rivals' GDP set to zero to isolate our share).
{
  let s = playUntil(start(), 1995);
  const tile = s.map!.tiles.find(t => t.region && s.ownedRegions.includes(t.region) && !t.building && t.terrain !== 'water')!;
  s = { ...s, map: { ...s.map!, tiles: s.map!.tiles.map(t => t.id === tile.id ? { ...t, building: { type: 'chipfab', level: 1, progress: 1, upgrading: false } } : t) },
    siliconYears: 4, activeEvent: null, eventQueue: [], rivals: s.rivals.map(r => ({ ...r, gdp: 0 })) };
  s = gameReducer(s, { type: 'TICK' });
  const share = chipWorldShare(s);
  s = finish(s);
  show('SILICON', s, `share=${Math.round(share * 100)}% chipProd=${s.eco.chipProd.toFixed(1)}`);
}

// 3. Custodian: a rival ignites a safe ASI while our alignment is high and we hold three safety treaties.
{
  let s = playUntil(start(), 2026.9);
  const lead = s.rivals[4].id;   // not one of the three blocs we bind with safety treaties
  s = { ...s, activeEvent: null, eventQueue: [], year: 2026.99, alignment: 95,
    rivals: s.rivals.map((r, i) => {
      let x = r;
      if (i < 3) x = { ...x, treaties: x.treaties.includes('safety') ? x.treaties : [...x.treaties, 'safety'], relation: Math.max(x.relation, 40) };
      if (r.id === lead) x = { ...x, capability: 25, alignment: 95 };
      return x;
    }) };
  const ready = custodianReady(s);
  s = finish(s);
  show('CUSTODIAN', s, `ready=${ready}`);
}
