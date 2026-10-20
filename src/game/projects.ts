// Phase D2: national projects ("wonders"). Five one-per-world projects, three stages each.
// The first bloc to finish all three stages owns the project; the others are notified and their works stop.
// Pure module: no engine import (the engine passes DEHelpers). Deterministic given h.rand.

import { t } from '../i18n/index.ts';
import { personalityOf } from './ai/personality.ts';
import { combine, type DEHelpers, type WorldBonus } from './bonuses.ts';
import { fmtMoney } from './format.ts';
import type { GameState, ProjectId, ProjectState } from './types.ts';

export const STAGES = 3;
export const STAGE_YEARS = 2;

export interface ProjectDef { id: ProjectId; name: string; effect: string; from: number }

export const PROJECTS: ProjectDef[] = [
  { id: 'apollo', name: 'Apollo of Compute', effect: 'Compute +15 %', from: 1975 },
  { id: 'satnet', name: 'World Satellite Network', effect: 'Covert +10 %, intel lasts twice as long', from: 1965 },
  { id: 'fab1nm', name: '1 nm Chip Fab', effect: 'Chips +50 %', from: 2015 },
  { id: 'align_inst', name: 'World Alignment Institute', effect: 'Alignment +15 once, alignment cap +5', from: 2000 },
  { id: 'smart_city', name: 'Smart City', effect: 'Approval +6, housing +20 %', from: 1990 },
];

export const projectById = Object.fromEntries(PROJECTS.map(p => [p.id, p])) as Record<ProjectId, ProjectDef>;

/** Bonus each project grants its owner (only while owned). */
const PROJECT_BONUS: Record<ProjectId, Partial<WorldBonus>> = {
  apollo: { compute: 1.15 },
  satnet: { covert: 0.1, intelYears: 2 },
  fab1nm: { chips: 1.5 },
  align_inst: { alignmentCap: 5 },
  smart_city: { approval: 6, housing: 1.2 },
};

/**
 * English source strings of the project texts. They reach the UI as t(variable), which the i18n extractor
 * cannot see (its data scan skips `effect:` and names starting with a digit), so they are listed here as literal t() calls.
 * Never called.
 */
export function projectSourceStrings(): string[] {
  return [
    t('Apollo of Compute'), t('Compute +15 %'),
    t('World Satellite Network'), t('Covert +10 %, intel lasts twice as long'),
    t('1 nm Chip Fab'), t('Chips +50 %'),
    t('World Alignment Institute'), t('Alignment +15 once, alignment cap +5'),
    t('Smart City'), t('Approval +6, housing +20 %'),
  ];
}

export function initProjects(): Record<ProjectId, ProjectState> {
  return Object.fromEntries(PROJECTS.map(p => [p.id, { stages: {}, busyUntil: {}, owner: null, year: null }])) as Record<ProjectId, ProjectState>;
}

const emptyProject = (): ProjectState => ({ stages: {}, busyUntil: {}, owner: null, year: null });

/** The player's bloc in logic-free code (multiplayer: my faction, else my continent). */
const meOf = (s: GameState): string => s.mp?.me ?? s.playerContinent ?? '';

/** Cost of one stage: 25 % of yearly income, at least 50, rounded to 10. */
export function stageCost(s: GameState): number {
  return Math.max(50, Math.round((s.eco.income * 0.25) / 10) * 10);
}

const busyAnywhere = (ps: Record<ProjectId, ProjectState>, bloc: string): boolean =>
  PROJECTS.some(d => (ps[d.id] ?? emptyProject()).busyUntil[bloc] !== undefined);

/** `me` defaults to the player's bloc; the budget check applies to the player only. */
export function canStartStage(s: GameState, id: ProjectId, bloc: string, me: string = meOf(s)): { ok: boolean; reason?: string } {
  const ps = s.projects;
  if (!ps) return { ok: false, reason: t('Projects are not available in this save.') };
  const def = projectById[id];
  const st = ps[id];
  if (!def || !st) return { ok: false, reason: t('Unknown project.') };
  if (s.year < def.from) return { ok: false, reason: t('Available from {year}', { year: def.from }) };
  if (st.owner) return { ok: false, reason: st.owner === bloc ? t('Already yours') : t('Already completed by a rival') };
  if (busyAnywhere(ps, bloc)) return { ok: false, reason: t('Already building another project') };
  if ((st.stages[bloc] ?? 0) >= STAGES) return { ok: false, reason: t('All three stages are done') };
  if (bloc === me) {
    const cost = stageCost(s);
    if (s.budget < cost) return { ok: false, reason: t('Needs {cost}', { cost: fmtMoney(cost) }) };
  }
  return { ok: true };
}

/** Player only: pays the stage cost and starts the stage. Returns false when not allowed (the panel shows the reason). */
export function startStage(s: GameState, id: ProjectId, h: DEHelpers): boolean {
  const bloc = h.me(s);
  const ps = s.projects;
  if (!ps || !canStartStage(s, id, bloc, bloc).ok) return false;
  const def = projectById[id];
  const st = ps[id] ?? emptyProject();
  const cost = stageCost(s);
  const ready = Math.floor(s.year) + STAGE_YEARS;
  s.budget -= cost;
  s.projects = { ...ps, [id]: { ...st, busyUntil: { ...st.busyUntil, [bloc]: ready } } };
  const stage = (st.stages[bloc] ?? 0) + 1;
  h.pushLog(s, h.rivalName(bloc), t('Stage {stage} of the {project} started ({cost}). Ready in {year}.', {
    stage, project: t(def.name), cost: fmtMoney(cost), year: ready,
  }), 'info');
  return true;
}

/** Once per year (the engine calls it when the year turns): finish stages, award owners, let rivals start stages. */
export function tickProjects(s: GameState, h: DEHelpers): void {
  const ps = s.projects;
  if (!ps) return;
  const year = Math.floor(s.year);
  const me = h.me(s);
  const next: Record<ProjectId, ProjectState> = { ...ps };

  for (const def of PROJECTS) {
    const cur = ps[def.id] ?? emptyProject();
    const stages = { ...cur.stages };
    const busyUntil = { ...cur.busyUntil };
    let owner = cur.owner;
    let ownedYear = cur.year;
    const name = t(def.name);
    const stopped = (bloc: string) => {
      if (bloc === me) h.notify(s, t('{bloc} finished the {project} first — your works stop.', { bloc: h.rivalName(owner ?? ''), project: name }), 'warning');
    };

    for (const bloc of Object.keys(busyUntil)) {
      if (busyUntil[bloc] > year) continue;     // still building
      delete busyUntil[bloc];
      if (owner) { stopped(bloc); continue; }   // another bloc completed it earlier this year
      stages[bloc] = (stages[bloc] ?? 0) + 1;
      if (stages[bloc] < STAGES) {
        if (bloc === me) h.notify(s, t('🏛 {project}: stage {stage} of {total} complete.', { project: name, stage: stages[bloc], total: STAGES }), 'info');
        continue;
      }
      owner = bloc;
      ownedYear = year;
      if (bloc === me) {
        h.notify(s, t('🏛 You completed the {project}!', { project: name }), 'success');
        h.pushLog(s, h.rivalName(me), t('You completed the {project}!', { project: name }), 'success');
        if (def.id === 'align_inst') s.alignment = Math.min(100, s.alignment + 15);
      } else {
        const who = h.rivalName(bloc);
        h.notify(s, t('{bloc} completed the {project}.', { bloc: who, project: name }), 'warning');
        h.pushLog(s, who, t('{bloc} completed the {project}.', { bloc: who, project: name }), 'warning');
      }
    }
    // Whoever is still building it stops now that it has an owner.
    if (owner) for (const bloc of Object.keys(busyUntil)) { delete busyUntil[bloc]; stopped(bloc); }

    next[def.id] = { stages, busyUntil, owner, year: ownedYear };
  }

  // Rivals: each non-remote rival with budget may start one open project, one year in three.
  const budgets = new Map<string, number>();
  for (const r of s.rivals) {
    if (h.isRemote(s, r.id)) continue;
    if ((r.nation?.budget ?? 0) <= 0 || !r.nation) continue;
    if (busyAnywhere(next, r.id)) continue;
    if (h.rand() >= 1 / 3) continue;
    const open = PROJECTS.filter(d => year >= d.from && (next[d.id] ?? emptyProject()).owner === null && ((next[d.id] ?? emptyProject()).stages[r.id] ?? 0) < STAGES);
    if (!open.length) continue;
    const p = personalityOf(r.id);
    const pref: ProjectId[] = p.compute >= 0.4 ? ['apollo', 'fab1nm']
      : p.safety >= 0.2 ? ['align_inst']
      : p.covert >= 0.15 ? ['satnet']
      : ['smart_city'];
    const preferred = open.filter(d => pref.includes(d.id));
    const pool = preferred.length ? preferred : open;
    const pick = pool[Math.min(pool.length - 1, Math.floor(h.rand() * pool.length))];
    const st = next[pick.id] ?? emptyProject();
    next[pick.id] = { ...st, busyUntil: { ...st.busyUntil, [r.id]: year + STAGE_YEARS } };
    const spend = 0.25 * Object.values(r.nation.invest).reduce((a, b) => a + b, 0);
    budgets.set(r.id, Math.max(0, r.nation.budget - spend));
  }
  if (budgets.size) {
    s.rivals = s.rivals.map(x => (x.nation && budgets.has(x.id) ? { ...x, nation: { ...x.nation, budget: budgets.get(x.id) ?? x.nation.budget } } : x));
  }
  s.projects = next;
}

/** Bonuses from the projects this bloc owns. */
export function projectBonus(s: GameState, bloc: string): Partial<WorldBonus> {
  const ps = s.projects;
  if (!ps) return {};
  const owned = PROJECTS.filter(d => ps[d.id]?.owner === bloc).map(d => PROJECT_BONUS[d.id]);
  return combine(...owned);
}

/** The non-player bloc with the most stages (ties: the one still building), or null when nobody has started. */
export function leadingRival(s: GameState, id: ProjectId): { id: string; stages: number } | null {
  const st = s.projects?.[id];
  if (!st) return null;
  const me = meOf(s);
  let best: { id: string; stages: number; busy: boolean } | null = null;
  for (const bloc of new Set([...Object.keys(st.stages), ...Object.keys(st.busyUntil)])) {
    if (bloc === me) continue;
    const stages = st.stages[bloc] ?? 0;
    const busy = st.busyUntil[bloc] !== undefined;
    if (!best || stages > best.stages || (stages === best.stages && busy && !best.busy)) best = { id: bloc, stages, busy };
  }
  return best && (best.stages > 0 || best.busy) ? { id: best.id, stages: best.stages } : null;
}
