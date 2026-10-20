// Living rivals: every AI bloc gets a yearly budget, splits it by doctrine and situation, and the split changes its pace
// (lag behind the historical compute curve), its alignment and its defence. Rivals also remember what the player did.
// Pure functions: the engine owns the state, the RNG and the log (passed in through PlanHelpers, like DynHelpers).
import { t } from '../../i18n/index.ts';
import { isRemote } from '../mp.ts';
import type { AIMemory, AINation, GameState, LogEntry, Rival } from '../types.ts';
import { personalityOf, type InvestKey } from './personality.ts';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const KEYS: InvestKey[] = ['compute', 'research', 'safety', 'defense', 'covert'];
const MEMORY_MAX = 12;

/** Engine services a yearly plan needs (avoids a circular import with engine.ts). */
export interface PlanHelpers {
  rand: () => number;
  affinity: (a: string, b: string) => number;
  pushLog: (s: GameState, who: string, text: string, tone: LogEntry['tone']) => void;
  raiseTension: (s: GameState, d: number) => void;
  rivalName: (id: string) => string;
}

// English source texts; the UI and the log translate them with t() at render time.
const PLAN_TEXT: Record<InvestKey | 'steady', string> = {
  compute: 'Crash compute programme',
  research: 'Expanding research universities',
  safety: 'Investing in AI safety',
  defense: 'Hardening cyber defences',
  covert: 'Funding covert operations',
  steady: 'Steady industrial build-up',
};

export function initNation(r: Rival, year: number): AINation {
  const par = r.gdp * 0.05;
  const w = personalityOf(r.id);
  return {
    budget: par,
    invest: { compute: w.compute * par, research: w.research * par, safety: w.safety * par, defense: w.defense * par, covert: w.covert * par },
    mood: 'build',
    plan: '',
    memory: [],
    lastYear: Math.floor(year),
  };
}

/** Copy of a nation that can be mutated without touching the previous game state. */
export function cloneNation(n: AINation): AINation {
  return { ...n, invest: { ...n.invest }, memory: [...n.memory] };
}

/** Once per new integer year: income in, budget split by doctrine + situation, plan text, occasional pacts. Mutates r.nation (pass a clone). */
export function planYear(s: GameState, r: Rival, playerLead: number, h: PlanHelpers): void {
  const n = r.nation;
  if (!n) return;
  n.budget += r.gdp * 0.05;

  const base = personalityOf(r.id);
  const w: Record<InvestKey, number> = { ...base };
  let mood: AINation['mood'] = 'build';
  if (playerLead > 0.5) { w.compute += 0.15; w.covert += r.strategy === 'aggressive' ? 0.10 : 0.03; mood = 'race'; }
  if (r.project !== undefined) { w.compute += 0.20; mood = 'race'; }
  if ((r.heat ?? 0) > 1) { w.defense += 0.10; mood = 'secure'; }
  if ((s.tension ?? 0) > 70) { w.defense += 0.05; w.covert = Math.max(0, w.covert - 0.05); }
  if (r.relation > 30 && mood !== 'race') { w.safety += 0.05; mood = 'diplomacy'; }
  const sum = KEYS.reduce((a, k) => a + w[k], 0);
  for (const k of KEYS) w[k] /= sum;

  const spend = n.budget * 0.9;
  for (const k of KEYS) n.invest[k] = n.invest[k] * 0.7 + spend * w[k] * 0.3;
  n.budget -= spend;
  n.mood = mood;

  // The plan names the biggest gain against the doctrine.
  let best: InvestKey | null = null;
  let gain = 0.01;
  for (const k of KEYS) if (w[k] - base[k] > gain) { gain = w[k] - base[k]; best = k; }
  const plan = PLAN_TEXT[best ?? 'steady'];
  if (plan !== n.plan) {
    n.plan = plan;
    h.pushLog(s, h.rivalName(r.id), t(plan), best === 'compute' || best === 'covert' ? 'warning' : 'info');
  }

  // Blocs talk to each other: research pacts between friends, UN denunciations between enemies.
  const roll = h.rand();
  if (roll < 0.08) {
    const pool = s.rivals.filter(o => o.id !== r.id && !isRemote(s, o.id) && h.affinity(r.id, o.id) > 0);
    if (pool.length) {
      const o = pool[Math.floor(h.rand() * pool.length)];
      r.lag -= 0.1;
      o.lag -= 0.1;
      h.pushLog(s, t('World'), t('{a} and {b} signed a research pact.', { a: h.rivalName(r.id), b: h.rivalName(o.id) }), 'info');
    }
  } else if (roll < 0.12) {
    const pool = s.rivals.filter(o => o.id !== r.id && !isRemote(s, o.id) && h.affinity(r.id, o.id) < 0);
    if (pool.length) {
      const o = pool[Math.floor(h.rand() * pool.length)];
      h.pushLog(s, t('World'), t('{a} denounced {b} at the United Nations.', { a: h.rivalName(r.id), b: h.rivalName(o.id) }), 'warning');
      h.raiseTension(s, 3);
      h.raiseTension(s, 3);
    }
  }
}

/** Continuous, every tick: the investment split moves lag, alignment and defence (yearly change capped at ±0.3 years). */
export function applyNation(r: Rival, dt: number, year: number): void {
  const n = r.nation;
  if (!n) return;
  const gdp5 = r.gdp * 0.05;
  const compute = clamp(n.invest.compute / Math.max(1, gdp5 * 0.40), 0, 2.5);
  const research = clamp(n.invest.research / Math.max(1, gdp5 * 0.35), 0, 2.5);
  const lagPerYear = clamp((compute - 1) * 0.18 + (research - 1) * 0.07, -0.3, 0.3);
  r.lag -= lagPerYear * dt;
  if (year > 2005) {
    const safety = clamp(n.invest.safety / Math.max(1, gdp5 * 0.12), 0, 3);
    r.alignment = clamp(r.alignment + (safety - 1) * 0.6 * dt, 5, 95);
  }
  r.defense = clamp(n.invest.defense / Math.max(1, gdp5 * 0.1) * 0.06, 0, 0.3);
}

/** Multiplier on the chance of hostile actions: a bloc that funds covert operations acts more often. */
export function aggression(r: Rival): number {
  if (!r.nation) return 1;
  return clamp(r.nation.invest.covert / Math.max(1, r.gdp * 0.05 * 0.12), 0.5, 2);
}

/** Records what someone did to this bloc (last 12 kept). Returns nothing: replaces r.nation so the previous state is not touched. */
export function remember(r: Rival, who: string, delta: number, why: string, year: number): void {
  const n = r.nation ?? initNation(r, year);
  const m: AIMemory = { who, delta, year: Math.floor(year), why };
  r.nation = { ...n, memory: [...n.memory, m].slice(-MEMORY_MAX) };
}

/** Sum of remembered deltas, each fading by 15% a year. */
export function memoryScore(r: Rival, year: number): number {
  if (!r.nation) return 0;
  return r.nation.memory.reduce((a, m) => a + m.delta * Math.pow(0.85, Math.max(0, year - m.year)), 0);
}

/** A successful sabotage destroys hardware: the compute line loses 40% of its money. */
export function sabotaged(r: Rival): void {
  if (!r.nation) return;
  r.nation = { ...r.nation, invest: { ...r.nation.invest, compute: r.nation.invest.compute * 0.6 } };
}
