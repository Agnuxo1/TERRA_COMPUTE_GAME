// ═══════════════════════════════════════════════════════════════════════════
//  Bottleneck advisor (Phase C2). Pure: reads the state and names the single
//  most pressing constraint, with the overlay where it can be fixed.
//  Texts are English source strings; render them with t(text, params).
// ═══════════════════════════════════════════════════════════════════════════

import { SAFE_ALIGNMENT, techs } from './data.ts';
import { fmtMoney } from './format.ts';
import type { GameState } from './types.ts';

export interface Advice {
  text: string;
  params?: Record<string, string | number>;
  action?: { type: 'OPEN_OVERLAY'; overlay: string };
}

const open = (overlay: string) => ({ type: 'OPEN_OVERLAY' as const, overlay });

/** Priority: food, power, chips, staffing, approval, research, alignment, budget. First match wins. */
export function advise(s: GameState): Advice | null {
  const e = s.eco;

  const food = e.foodDemand > 0 ? e.foodSupply / e.foodDemand : 1;
  if (food < 1.02) {
    return { text: 'Food supply covers only {pct}% of demand: build farms.', params: { pct: Math.round(food * 100) }, action: open('buildings') };
  }
  if (e.energyRatio < 1) {
    return { text: 'Power covers only {pct}% of demand: build power plants.', params: { pct: Math.round(e.energyRatio * 100) }, action: open('buildings') };
  }
  if (e.chipFactor < 1 || (e.income > 0 && e.imports > 0.2 * e.income)) {
    return { text: 'Chips are the bottleneck: build chip foundries.', action: open('buildings') };
  }
  if (e.staffing < 0.95) {
    return { text: 'Only {pct}% of jobs are staffed: build housing or automation.', params: { pct: Math.round(e.staffing * 100) }, action: open('buildings') };
  }
  if (s.approval < 40) {
    return { text: 'Approval is at {pct}%: check the factors dragging it down.', params: { pct: Math.round(s.approval) }, action: open('economy') };
  }
  // Same lookahead as the engine's techAvailable (TECH_LOOKAHEAD = 10 years).
  const researchable = techs.some(tech => !s.unlockedTechs.includes(tech.id) && tech.requires.every(r => s.unlockedTechs.includes(r)) && s.year >= tech.year - 10);
  if (!s.researching && researchable) {
    return { text: 'Research is idle: pick the next technology.', action: open('tech') };
  }
  const req = s.gameMode === 'pioneer' ? 70 : SAFE_ALIGNMENT;
  if (s.alignment < req && s.capability >= 18) {
    return { text: 'Alignment is {al}%, below the {req}% needed: fund AI Safety Institutes.', params: { al: Math.round(s.alignment), req }, action: open('buildings') };
  }
  if (e.netBudget < 0) {
    return { text: 'The budget runs a deficit of {amount} a year: raise taxes or cut upkeep.', params: { amount: fmtMoney(-e.netBudget) }, action: open('economy') };
  }
  return null;
}
