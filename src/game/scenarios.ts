// H1 Scenarios: historical starting points. Each one fast-forwards a complete game with the
// scripted bot to the scenario year, then applies the scenario's world changes.
// Pure and deterministic for a given (id, continent, seed, difficulty).
import { gameReducer, historicalCapability, initialState } from './engine.ts';
import { botDecide } from './bot.ts';
import { fmtMoney } from './format.ts';
import { t } from '../i18n/index.ts';
import type { Difficulty, GameState, Notification, LogEntry } from './types.ts';

export type ScenarioId = 'cuban_missiles' | 'cold_war_end' | 'deep_learning' | 'world_on_fire' | 'uchronia';

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  year: number;
  blurb: string;
  goals: string[];
  continentHint?: string;
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'cuban_missiles', name: 'Thirteen Days', year: 1962,
    blurb: 'Missiles in Cuba. Two superpowers stare down the abyss, and every message is read twice.',
    goals: ['Get through October 1962 without a nuclear exchange', 'Keep the world below DEFCON 1 while you build'],
    continentHint: 'na',
  },
  {
    id: 'cold_war_end', name: 'The Wall Falls', year: 1991,
    blurb: 'The Soviet bloc splits apart. The peace dividend is real, and so is the risk of a collapse nobody planned for.',
    goals: ['Turn the peace dividend into a lead in the race', 'Keep the former Soviet rival from turning into a threat'],
    continentHint: 'eu',
  },
  {
    id: 'deep_learning', name: 'The Deep Learning Revolution', year: 2012,
    blurb: 'Neural networks suddenly work. Rivals are close behind and every lab is hiring.',
    goals: ['Convert the research boom into compute before the rivals do', 'Stay ahead of a field that now moves in months'],
    continentHint: 'na',
  },
  {
    id: 'world_on_fire', name: 'World on Fire', year: 2030,
    blurb: 'Heatwaves on every continent, failed harvests and a public that wants answers. The planet is already burning.',
    goals: ['Stabilise planet health while racing to superintelligence', 'Hold approval above water until the machine is safe'],
    continentHint: 'in',
  },
  {
    id: 'uchronia', name: 'Uchronia: the Union Endures', year: 1960,
    blurb: 'An alternate history in which the Soviet Union never breaks. Its science is a year ahead of yours from day one.',
    goals: ['Outpace a much stronger Soviet rival', 'Win the race without waiting for the Union to falter'],
    continentHint: 'eu',
  },
];

export function scenarioById(id: string): ScenarioDef | undefined {
  return SCENARIOS.find(s => s.id === id);
}

/** Fast-forwards a complete game with the bot to `year`. Returns null if the game ended first. */
function fastForward(continentId: string, seed: number, difficulty: Difficulty, year: number): GameState | null {
  let s = gameReducer({ ...initialState, gameMode: 'complete' }, { type: 'START_GAME', continentId, seed, difficulty });
  let guard = 0;
  while (s.screen === 'game' && s.year < year && guard++ < 100000) {
    s = gameReducer(botDecide({ ...s, playerLaunchReady: false }), { type: 'TICK' });
  }
  return s.screen === 'game' ? s : null;
}

/** Applies the scenario's world changes to a state that has been fast-forwarded to the scenario year. */
function applyScenario(s: GameState, id: ScenarioId): { text: string; tone: Notification['type'] } {
  const rivalWith = (rid: string) => s.rivals.find(r => r.id === rid);
  switch (id) {
    case 'cuban_missiles': {
      s.tension = 70;
      s.rivals = s.rivals.map(r => r.id === 'su' ? { ...r, relation: Math.max(-100, r.relation - 25) } : r);
      return { text: t('☢ Cuban missile crisis: DEFCON 2. Moscow and Washington are trading ultimatums. Every move counts.'), tone: 'danger' };
    }
    case 'cold_war_end': {
      const dividend = Math.max(0, s.eco.income * 0.5);
      s.budget += dividend;
      s.rivals = s.rivals.map(r => r.id === 'su' ? { ...r, stability: Math.max(0, Math.min(100, r.stability - 30)) } : r);
      return { text: t('🧱 The Wall falls. A peace dividend of {amount} reaches your treasury, and the former Soviet bloc is in turmoil.', { amount: fmtMoney(dividend) }), tone: 'success' };
    }
    case 'deep_learning': {
      s.researchPoints += 300;
      const floor = s.capability - 0.4;
      s.rivals = s.rivals.map(r => ({ ...r, capability: Math.max(r.capability, floor) }));
      return { text: t('🧠 Deep learning works. Research money floods in, and every rival is within striking distance of your compute.'), tone: 'warning' };
    }
    case 'world_on_fire': {
      // Planet health is derived from temperature each tick: 100 - (T - 0.6) * 48 = 40 at T = 1.85.
      s.temperature = 1.85;
      s.planetHealth = 40;
      s.approval = Math.max(0, s.approval - 15);
      s.doomClock = Math.min(s.doomClock, 5);
      return { text: t('🔥 Heatwaves on every continent. Planet health is at 40%, approval is falling fast, and the machine cannot wait.'), tone: 'danger' };
    }
    case 'uchronia': {
      const su = rivalWith('su');
      if (su) {
        const lag = su.lag - 3;
        const capability = Math.max(su.capability, historicalCapability(s.year - lag));
        s.rivals = s.rivals.map(r => r.id === 'su' ? { ...r, lag, capability, gdp: r.gdp * 1.4 } : r);
      }
      return { text: t('☭ In this history the Union endures. Its science is a year ahead, and its industry is much larger than yours.'), tone: 'warning' };
    }
  }
}

/**
 * Builds the starting state of a scenario: a complete game fast-forwarded with the bot to the scenario year,
 * then the scenario's changes applied. If the bot's game ends before that year (rare), the next seed is tried.
 */
export function buildScenario(id: ScenarioId, continentId: string, seed: number, difficulty: Difficulty): GameState {
  const def = scenarioById(id);
  if (!def) throw new Error(`Unknown scenario: ${id}`);
  let s: GameState | null = null;
  for (let attempt = 0; attempt < 5 && !s; attempt++) {
    s = fastForward(continentId, seed + attempt, difficulty, def.year);
  }
  if (!s) throw new Error(`Scenario ${id} could not be built for ${continentId}`);

  const { text, tone } = applyScenario(s, id);
  s.scenario = id;
  s.paused = false;
  s.speed = 1;
  s.eventQueue = [];
  s.activeEvent = null;
  s.notifications = [{ id: `scn-${id}-n`, text, type: tone, time: 0 }, ...s.notifications].slice(0, 5);
  const entry: LogEntry = { id: `scn-${id}-l`, year: Math.floor(s.year), who: t(def.name), text, tone };
  s.log = [entry, ...s.log].slice(0, 40);
  return s;
}
