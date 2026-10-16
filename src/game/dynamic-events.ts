// Dynamic decisions for the long middle of the game, plus the rival ASI projects of the final act.
// Every event is a dilemma with a real price on each side; effects run through applyDynamic().
import type { BuildingId, GameEvent, GameState, Modifier, Rival } from './types';

/** Engine services injected by engine.ts (avoids a circular import of its private helpers). */
export interface DynHelpers {
  rand: () => number;
  addMod: (s: GameState, m: Omit<Modifier, 'until'> & { years: number }) => void;
  notify: (s: GameState, text: string, type?: 'info' | 'warning' | 'danger' | 'success') => void;
  pushLog: (s: GameState, who: string, text: string, tone: 'info' | 'success' | 'warning' | 'danger') => void;
  count: (s: GameState, type: BuildingId) => number;
  rivalName: (id: string) => string;
  sabotageChance: (s: GameState, r: Rival) => number;
  historicalCapability: (year: number) => number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Rival leaders (fictional) ─────────────────────────────────────────────
export const RIVAL_LEADERS: Record<string, { title: string; name: string; doctrine: string }> = {
  na: { title: 'President', name: 'Hale', doctrine: 'Frontier doctrine — outspend everyone, regulate later.' },
  eu: { title: 'Commissioner', name: 'Varga', doctrine: 'Precaution doctrine — rules first, then compute.' },
  su: { title: 'General Secretary', name: 'Volkov', doctrine: 'Iron doctrine — compute at any cost, secrecy above all.' },
  cn: { title: 'Chairman', name: 'Lin', doctrine: 'Scale doctrine — build faster than anyone can object.' },
  af: { title: 'President', name: 'Okafor', doctrine: 'Leapfrog doctrine — skip the coal age, buy the future.' },
  sa: { title: 'President', name: 'Duarte', doctrine: 'Commodity doctrine — sell the world what it needs.' },
  in: { title: 'Prime Minister', name: 'Rao', doctrine: 'Talent doctrine — the largest engineering corps on Earth.' },
  oc: { title: 'Prime Minister', name: 'Calder', doctrine: 'Fortress doctrine — safe, quiet and well defended.' },
};
export const leaderOf = (id: string) => { const l = RIVAL_LEADERS[id]; return l ? `${l.title} ${l.name}` : 'Their leader'; };

// ─── Money scale ───────────────────────────────────────────────────────────
/** A "noticeable" sum for this moment of the game: a share of yearly income. */
const sum = (s: GameState, share: number) => Math.max(20, Math.round((s.eco.income || 300) * share / 10) * 10);
const rpScale = (s: GameState, k: number) => Math.round(k * (80 + 40 * Math.max(0, s.year - 1960)));

interface DynEvent {
  key: string;
  /** Minimum years before the same event can return (Infinity = once per game). */
  every: number;
  when: (s: GameState, h: DynHelpers) => boolean;
  build: (s: GameState, h: DynHelpers) => GameEvent;
}

const ev = (s: GameState, key: string, name: string, type: GameEvent['type'], description: string, choices: GameEvent['choices']): GameEvent =>
  ({ id: `dyn-${key}-${Math.floor(s.year)}`, name, year: Math.floor(s.year), type, description, choices });

const richestRival = (s: GameState) => [...s.rivals].sort((a, b) => b.gdp - a.gdp)[0];
const hostileRival = (s: GameState) => [...s.rivals].filter(r => r.relation < -10).sort((a, b) => a.relation - b.relation)[0];
const computeCount = (s: GameState, h: DynHelpers) => h.count(s, 'mainframe') + h.count(s, 'super') + h.count(s, 'datacenter') + h.count(s, 'gpucluster') + h.count(s, 'aifactory');

const DECK: DynEvent[] = [
  { key: 'brain_drain', every: 12, when: s => s.year >= 1965 && s.education >= 50 && s.approval < 62,
    build: (s, h) => { const r = richestRival(s); return ev(s, 'brain_drain', 'Brain Drain', 'warning',
      `Your best scientists are being courted by laboratories in ${r ? h.rivalName(r.id) : 'richer countries'} with double salaries.`, [
        { label: 'Match the offers', detail: `−$${sum(s, 0.25)}B · research +10% for 6 years`, cost: sum(s, 0.25), effect: `brain_keep:${sum(s, 0.25)}` },
        { label: 'Let them go', detail: 'Research −10% for 4 years · relations with them +8', effect: `brain_go:${r?.id ?? ''}` },
      ]); } },

  { key: 'rare_earth', every: 20, when: s => s.year >= 1968 && s.ownedRegions.length >= 2,
    build: s => { const reg = s.map?.regions.find(r => r.id === s.ownedRegions[Math.floor(s.ownedRegions.length / 2)])?.name ?? 'the interior';
      return ev(s, 'rare_earth', `Rare Earths Found in ${reg}`, 'info', `Geologists report silica and rare-earth seams under protected valleys in ${reg}.`, [
        { label: 'Open-pit mining', detail: '+60 chips, +40 steel now · approval −4 for 4 years', effect: 'rare_mine' },
        { label: 'Protect the valleys', detail: 'Approval +3 for 5 years · forests keep absorbing CO₂', effect: 'rare_protect' },
      ]); } },

  { key: 'strike', every: 10, when: (s, h) => h.count(s, 'factory') >= 3 && s.approval < 64 && s.eco.unemployment < 0.07,
    build: s => ev(s, 'strike', 'General Strike in the Kombinats', 'warning', 'Steelworkers walk out demanding a share of the boom. The furnaces are cooling.', [
      { label: 'Raise wages', detail: `−$${sum(s, 0.2)}B · approval +6 for 4 years`, cost: sum(s, 0.2), effect: `strike_pay:${sum(s, 0.2)}` },
      { label: 'Break the strike', detail: 'Approval −9 for 3 years', effect: 'strike_break' },
      { label: 'Wait it out', detail: 'GDP −6% for 2 years · no steel this year', effect: 'strike_wait' },
    ]) },

  { key: 'defector', every: 9, when: s => s.year >= 1962 && !!hostileRival(s),
    build: (s, h) => { const r = hostileRival(s)!; const n = leaderOf(r.id);
      return ev(s, 'defector', `A Scientist Defects from ${h.rivalName(r.id)}`, 'info',
        `A senior computer scientist crossed the border last night with a suitcase of notebooks. ${n} demands her return.`, [
          { label: 'Grant asylum', detail: `+${rpScale(s, 1.5)} research · relations with them −12`, effect: `defect_keep:${r.id}` },
          { label: 'Send her back', detail: 'Relations with them +12 · approval −2 for 2 years', effect: `defect_return:${r.id}` },
        ]); } },

  { key: 'olympics', every: 16, when: s => s.year >= 1964 && s.year <= 2032 && s.approval >= 48,
    build: s => ev(s, 'olympics', 'Host the Olympic Games?', 'info', 'The committee is choosing the next host city. A glittering showcase — and a very large bill.', [
      { label: 'Bid to host', detail: `−$${sum(s, 0.35)}B · approval +8 for 3 years · all relations +6`, cost: sum(s, 0.35), effect: `olympics_host:${sum(s, 0.35)}` },
      { label: 'Let another city have it', detail: 'Nothing happens', effect: 'none' },
    ]) },

  { key: 'harvest', every: 8, when: s => s.eco.foodSupply >= s.eco.foodDemand * 1.18,
    build: s => ev(s, 'harvest', 'Record Harvest', 'info', 'Granaries overflow after a perfect season. What do we do with the surplus?', [
      { label: 'Export the grain', detail: `+$${sum(s, 0.18)}B · all relations +3`, effect: `harvest_sell:${sum(s, 0.18)}` },
      { label: 'Fill the strategic reserve', detail: 'Approval +4 for 4 years · cushions the next famine', effect: 'harvest_keep' },
    ]) },

  { key: 'startups', every: 14, when: s => s.year >= 1994 && s.education >= 65,
    build: s => ev(s, 'startups', 'Garage Start-ups Everywhere', 'info', 'Young founders want cheap capital and light rules. Venture money is pouring in.', [
      { label: 'Tax holiday for founders', detail: `−$${sum(s, 0.15)}B · GDP +6% for 6 years`, cost: sum(s, 0.15), effect: `startup_free:${sum(s, 0.15)}` },
      { label: 'Tax the windfall', detail: `+$${sum(s, 0.2)}B now`, effect: `startup_tax:${sum(s, 0.2)}` },
    ]) },

  { key: 'reactor', every: 18, when: (s, h) => h.count(s, 'nuclear') >= 2,
    build: s => ev(s, 'reactor', 'Reactor Incident', 'danger', 'A coolant pump failed at one of your nuclear plants. Nobody was hurt — yet. The press is outside.', [
      { label: 'Full safety inspection', detail: 'All nuclear plants offline for repairs · approval +2', effect: 'reactor_inspect' },
      { label: 'Downplay it', detail: 'Approval −7 for 4 years', effect: 'reactor_hide' },
    ]) },

  { key: 'automation', every: 10, when: (s, h) => (s.year >= 2012 || h.count(s, 'robot') > 0) && s.eco.unemployment > 0.07,
    build: s => ev(s, 'automation', 'Automation Riots', 'danger', `Robots and software agents have taken ${Math.round(s.eco.unemployment * 100)}% of jobs. Warehouses are burning.`, [
      { label: 'Universal dividend', detail: `−$${sum(s, 0.3)}B · approval +8 for 4 years`, cost: sum(s, 0.3), effect: `auto_dividend:${sum(s, 0.3)}` },
      { label: 'Retraining programme', detail: `−$${sum(s, 0.15)}B · education +5`, cost: sum(s, 0.15), effect: `auto_retrain:${sum(s, 0.15)}` },
      { label: 'Restore order', detail: 'Approval −8 for 3 years', effect: 'auto_ignore' },
    ]) },

  { key: 'water', every: 12, when: (s, h) => s.year >= 2005 && h.count(s, 'datacenter') + h.count(s, 'gpucluster') + h.count(s, 'aifactory') >= 2,
    build: s => ev(s, 'water', 'Data Centres Drink the Rivers', 'warning', 'Farmers block the gates of your server farms: the cooling towers took their irrigation water.', [
      { label: 'Closed-loop cooling', detail: `−$${sum(s, 0.25)}B`, cost: sum(s, 0.25), effect: `water_fix:${sum(s, 0.25)}` },
      { label: 'Farms can wait', detail: 'Approval −5 and farms −10% for 4 years', effect: 'water_ignore' },
    ]) },

  { key: 'leak', every: Infinity, when: s => s.capability >= 17.5,
    build: s => ev(s, 'leak', 'Frontier Model Leaked', 'danger', 'The weights of your best model appeared on a public file server. Every lab on Earth is downloading them.', [
      { label: 'Open-source it officially', detail: `+${rpScale(s, 2)} research from the community · every rival catches up ~1 year · relations +8 · alignment −4`, effect: 'leak_open' },
      { label: 'Hunt the leakers', detail: `−$${sum(s, 0.2)}B · alignment +5 · approval −4 for 3 years`, cost: sum(s, 0.2), effect: `leak_hunt:${sum(s, 0.2)}` },
    ]) },

  { key: 'interp', every: Infinity, when: (s, h) => s.year >= 2000 && h.count(s, 'defense') >= 2 && s.alignment >= 60,
    build: s => ev(s, 'interp', 'Interpretability Breakthrough', 'info', 'Your AI Safety Institute can finally read what a neural network is thinking. Publishing would make every lab safer — including your rivals.', [
      { label: 'Publish openly', detail: 'Every rival alignment +8 · relations +8 · your alignment +4', effect: 'interp_open' },
      { label: 'Keep it in-house', detail: 'Your alignment +10', effect: 'interp_keep' },
    ]) },

  { key: 'cyber_arms', every: Infinity, when: (s, h) => s.year >= 1995 && computeCount(s, h) >= 3,
    build: s => ev(s, 'cyber_arms', 'Offensive Cyber Programme', 'warning', 'The defence ministry wants to turn part of your compute into a cyber-weapons programme.', [
      { label: 'Approve it', detail: 'Your covert operations succeed far more often · alignment −5 · relations −6', effect: 'cyber_yes' },
      { label: 'Refuse', detail: 'Alignment +3', effect: 'cyber_no' },
    ]) },
];

/** Elections / party congress: a fixed rhythm every 8 years, outcome shaped by approval. */
function election(s: GameState): GameEvent {
  const a = Math.round(s.approval);
  const won = a >= 52;
  const congress = s.playerContinent === 'su' || s.playerContinent === 'cn';
  const name = congress ? 'Party Congress' : 'General Election';
  if (won) {
    return ev(s, 'election', `${name}: Mandate Renewed`, 'info', `With ${a}% approval the government is confirmed. How will you spend the mandate?`, [
      { label: 'Bold reforms', detail: 'Decree changes are free again now · GDP +5% for 4 years · approval −3', effect: 'elect_bold' },
      { label: 'Steady hands', detail: 'Approval +5 for 4 years', effect: 'elect_steady' },
    ]);
  }
  return ev(s, 'election', `${name}: The Opposition Surges`, 'danger', `Approval is only ${a}%. The opposition demands change and the streets are listening.`, [
    { label: 'Concessions', detail: 'Tax rate −3 points · approval +7 for 4 years', effect: 'elect_concede' },
    { label: 'Emergency powers', detail: 'Approval −6 for 4 years · enemy operations −30% for 4 years', effect: 'elect_powers' },
  ]);
}

/** Picks at most one dynamic decision for this year (called from engine.yearly when no event is queued). */
export function rollDynamic(s: GameState, h: DynHelpers): GameEvent | null {
  if (s.gameMode === 'logic') return null;
  const y = Math.floor(s.year);
  const meta = s.dyn ?? { last: {}, nextElection: s.startYear + 6, lastAny: 0 };
  s.dyn = meta;
  if (y >= meta.nextElection) {
    meta.nextElection = y + 8;
    meta.lastAny = y;
    return election(s);
  }
  if (y - meta.lastAny < 2 || h.rand() > 0.45) return null;
  const ready = DECK.filter(d => {
    const last = meta.last[d.key];
    if (last !== undefined && (d.every === Infinity || y - last < d.every)) return false;
    return d.when(s, h);
  });
  if (!ready.length) return null;
  const d = ready[Math.floor(h.rand() * ready.length)];
  meta.last[d.key] = y;
  meta.lastAny = y;
  return d.build(s, h);
}

// ─── Rival ASI projects ────────────────────────────────────────────────────
export function projectEvent(s: GameState, r: Rival, eta: number, h: DynHelpers): GameEvent {
  const leader = leaderOf(r.id);
  const name = h.rivalName(r.id);
  const strikeCost = sum(s, 0.45);
  const strikeChance = Math.round(clamp(h.sabotageChance(s, r) + 0.1, 0.05, 0.9) * 100);
  const inspect = r.relation >= 10 || r.treaties.includes('safety');
  return {
    id: `project-${r.id}`, name: `${name} Launches an ASI Project`, year: Math.floor(s.year), type: 'danger',
    description: `${leader} has ordered a crash programme to ignite superintelligence. Our analysts expect ignition around ${Math.round(eta)}${r.alignment < 60 ? ' — and their safety record is poor' : ''}. This is the final act of the race.`,
    choices: [
      { label: 'Demand international inspections', detail: inspect ? 'Their project slows ~1.5 years · their alignment +10' : `They refuse (relations ${Math.round(r.relation)} < 10): relations −8`, effect: `proj_inspect:${r.id}` },
      { label: 'Covert strike on their data centres', detail: `−$${strikeCost}B · ${strikeChance}% success: set back ~2.5 years · failure: relations −40 and they accelerate`, cost: strikeCost, effect: `proj_strike:${r.id}:${strikeCost}:${strikeChance}` },
      { label: 'Out-race them', detail: 'National crash programme: research +20% for 4 years · approval −5 · alignment −3', effect: 'proj_race' },
    ],
  };
}

/** Applies a dynamic effect. Returns false when the id is not a dynamic effect. */
export function applyDynamic(s: GameState, effect: string, h: DynHelpers): boolean {
  const [id, a1, a2, a3] = effect.split(':');
  const n1 = Number(a1) || 0;
  const rivalMap = (fn: (r: Rival) => Rival) => { s.rivals = s.rivals.map(fn); };
  const relAll = (d: number) => rivalMap(r => ({ ...r, relation: clamp(r.relation + d, -100, 100) }));
  const relOne = (rid: string, d: number) => rivalMap(r => r.id === rid ? { ...r, relation: clamp(r.relation + d, -100, 100) } : r);
  const offline = (type: BuildingId, progress: number) => {
    for (const t of s.map!.tiles) if (t.building?.type === type && t.building.progress >= 1) t.building = { ...t.building, progress };
  };
  switch (id) {
    case 'none': break;
    case 'brain_keep': s.budget -= n1; h.addMod(s, { id: 'brain_keep', label: 'Scientists stayed', years: 6, research: 1.1 }); break;
    case 'brain_go': h.addMod(s, { id: 'brain_go', label: 'Brain drain', years: 4, research: 0.9 }); if (a1) relOne(a1, 8); break;
    case 'rare_mine': s.chips += 60; s.steel += 40; h.addMod(s, { id: 'rare_mine', label: 'Mining protests', years: 4, approval: -4 }); break;
    case 'rare_protect': h.addMod(s, { id: 'rare_protect', label: 'Protected valleys', years: 5, approval: 3 }); break;
    case 'strike_pay': s.budget -= n1; h.addMod(s, { id: 'strike', label: 'Wage deal', years: 4, approval: 6 }); break;
    case 'strike_break': h.addMod(s, { id: 'strike', label: 'Strike broken', years: 3, approval: -9 }); break;
    case 'strike_wait': s.steel = Math.max(0, s.steel - 30); h.addMod(s, { id: 'strike', label: 'Long strike', years: 2, gdp: 0.94 }); break;
    case 'defect_keep': s.researchPoints += rpScale(s, 1.5); relOne(a1, -12); h.pushLog(s, h.rivalName(a1), 'Protests the asylum granted to its scientist.', 'warning'); break;
    case 'defect_return': relOne(a1, 12); h.addMod(s, { id: 'defect_return', label: 'Handed back a defector', years: 2, approval: -2 }); break;
    case 'olympics_host': s.budget -= n1; relAll(6); h.addMod(s, { id: 'olympics', label: 'Olympic Games', years: 3, approval: 8 }); break;
    case 'harvest_sell': s.budget += n1; relAll(3); break;
    case 'harvest_keep': h.addMod(s, { id: 'harvest_keep', label: 'Grain reserve', years: 4, approval: 4, farms: 1.05 }); break;
    case 'startup_free': s.budget -= n1; h.addMod(s, { id: 'startups', label: 'Start-up boom', years: 6, gdp: 1.06 }); break;
    case 'startup_tax': s.budget += n1; break;
    case 'reactor_inspect': offline('nuclear', 0.75); h.addMod(s, { id: 'reactor', label: 'Safety culture', years: 3, approval: 2 }); break;
    case 'reactor_hide': h.addMod(s, { id: 'reactor', label: 'Reactor cover-up', years: 4, approval: -7 }); break;
    case 'auto_dividend': s.budget -= n1; h.addMod(s, { id: 'automation', label: 'Universal dividend', years: 4, approval: 8 }); break;
    case 'auto_retrain': s.budget -= n1; s.education = clamp(s.education + 5, 0, 100); break;
    case 'auto_ignore': h.addMod(s, { id: 'automation', label: 'Automation riots', years: 3, approval: -8 }); break;
    case 'water_fix': s.budget -= n1; break;
    case 'water_ignore': h.addMod(s, { id: 'water', label: 'Thirsty farms', years: 4, approval: -5, farms: 0.9 }); break;
    case 'leak_open':
      s.researchPoints += rpScale(s, 2); relAll(8); s.alignment = clamp(s.alignment - 4, 0, 100);
      rivalMap(r => ({ ...r, lag: r.lag - 1 }));
      break;
    case 'leak_hunt': s.budget -= n1; s.alignment = clamp(s.alignment + 5, 0, 100); h.addMod(s, { id: 'leak_hunt', label: 'Leak investigation', years: 3, approval: -4 }); break;
    case 'interp_open': relAll(8); s.alignment = clamp(s.alignment + 4, 0, 100); rivalMap(r => ({ ...r, alignment: clamp(r.alignment + 8, 0, 100) })); break;
    case 'interp_keep': s.alignment = clamp(s.alignment + 10, 0, 100); break;
    case 'cyber_yes': s.alignment = clamp(s.alignment - 5, 0, 100); relAll(-6); h.addMod(s, { id: 'cyber_arms', label: 'Cyber-weapons programme', years: 9999 }); break;
    case 'cyber_no': s.alignment = clamp(s.alignment + 3, 0, 100); break;
    case 'elect_bold': s.policyCooldown = 0; h.addMod(s, { id: 'mandate', label: 'Reform mandate', years: 4, gdp: 1.05, approval: -3 }); break;
    case 'elect_steady': h.addMod(s, { id: 'mandate', label: 'Steady government', years: 4, approval: 5 }); break;
    case 'elect_concede': s.taxRate = clamp(s.taxRate - 0.03, 0.1, 0.4); h.addMod(s, { id: 'mandate', label: 'Concessions', years: 4, approval: 7 }); break;
    case 'elect_powers': h.addMod(s, { id: 'emergency_powers', label: 'Emergency powers', years: 4, approval: -6 }); break;
    // Rival ASI projects
    case 'proj_inspect': {
      const r = s.rivals.find(x => x.id === a1); if (!r) break;
      if (r.relation >= 10 || r.treaties.includes('safety')) {
        rivalMap(x => x.id === a1 ? { ...x, lag: x.lag + 1.5, alignment: clamp(x.alignment + 10, 0, 100) } : x);
        h.notify(s, `🔎 Inspectors are inside ${h.rivalName(a1)}'s project. Ignition delayed.`, 'success');
      } else {
        relOne(a1, -8);
        h.notify(s, `${leaderOf(a1)} expelled the inspectors.`, 'danger');
      }
      break;
    }
    case 'proj_strike': {
      const cost = Number(a2) || 0, p = (Number(a3) || 40) / 100;
      s.budget -= cost;
      if (h.rand() < p) {
        rivalMap(x => x.id === a1 ? { ...x, heat: (x.heat ?? 0) + 1, lag: x.lag + 2.5, capability: Math.min(x.capability, h.historicalCapability(s.year - x.lag - 2.5)) } : x);
        h.notify(s, `💥 Strike succeeded: ${h.rivalName(a1)}'s ASI project set back ~2.5 years.`, 'success');
        h.pushLog(s, 'Intelligence', `Covert strike crippled ${h.rivalName(a1)}'s ASI project.`, 'success');
      } else {
        rivalMap(x => x.id === a1 ? { ...x, lag: x.lag - 0.5, relation: clamp(x.relation - 40, -100, 100), treaties: [] } : x);
        h.notify(s, `✖ The strike on ${h.rivalName(a1)} was traced back to us. They are accelerating.`, 'danger');
        h.pushLog(s, h.rivalName(a1), 'Exposed our covert strike and tore up every treaty.', 'danger');
      }
      break;
    }
    case 'proj_race': h.addMod(s, { id: 'crash_programme', label: 'National crash programme', years: 4, research: 1.2, approval: -5 }); s.alignment = clamp(s.alignment - 3, 0, 100); break;
    default: return false;
  }
  return true;
}
