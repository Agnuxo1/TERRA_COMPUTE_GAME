// Dynamic decisions for the long middle of the game, plus the rival ASI projects of the final act.
// Every event is a dilemma with a real price on each side; effects run through applyDynamic().
import type { BuildingId, GameEvent, GameState, Modifier, Rival } from './types';
import { t } from '../i18n/index.ts';

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
  hasIntel: (s: GameState, r: Rival) => boolean;
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
export const leaderOf = (id: string) => { const l = RIVAL_LEADERS[id]; return l ? `${t(l.title)} ${l.name}` : t('Their leader'); };

// ─── Money scale ───────────────────────────────────────────────────────────
/** A "noticeable" sum for this moment of the game: a share of yearly income. */
const sum = (s: GameState, share: number) => Math.max(20, Math.round((s.eco.income || 300) * share / 10) * 10);
const money = (b: number) => (b >= 1000 ? `$${(b / 1000).toFixed(1)}T` : `$${Math.round(b)}B`);
const rpScale = (s: GameState, k: number) => Math.round(k * (80 + 40 * Math.max(0, s.year - 1960)));

/** Peace-time dilemmas stop once the endgame begins: the last years belong to the race. */
const calm = (s: GameState) => s.year < 2028 && !s.rivals.some(r => r.project !== undefined);
/** An event with a price is only offered when the treasury could pay it. */
const affords = (s: GameState, share: number) => s.budget >= sum(s, share);

// ─── E1 story flags ────────────────────────────────────────────────────────
/** Sets a story flag to the current year (immutable: assigns a new flags object). */
export function setFlag(s: GameState, flag: string): void {
  s.flags = { ...(s.flags ?? {}), [flag]: Math.floor(s.year) };
}
/** Years since the flag was set, or -1 if it has never been set. */
export function flagAge(s: GameState, flag: string): number {
  const y = s.flags?.[flag];
  return y === undefined ? -1 : Math.floor(s.year) - y;
}
const DEFECTOR_FLAG = 'defector_from:';
/** The rival id a defector came from (stored by the asylum choice), or '' if none. */
const defectorSource = (s: GameState) => Object.keys(s.flags ?? {}).find(k => k.startsWith(DEFECTOR_FLAG))?.slice(DEFECTOR_FLAG.length) ?? '';

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
  { key: 'brain_drain', every: 12, when: s => calm(s) && s.year >= 1965 && s.education >= 50 && s.approval < 62 && affords(s, 0.25),
    build: (s, h) => { const r = richestRival(s); return ev(s, 'brain_drain', t('Brain Drain'), 'warning',
      t('Your best scientists are being courted by laboratories in {rival} with double salaries.', { rival: r ? h.rivalName(r.id) : t('richer countries') }), [
        { label: t('Match the offers'), detail: t('−{cost} · research +10% for 6 years', { cost: money(sum(s, 0.25)) }), cost: sum(s, 0.25), effect: `brain_keep:${sum(s, 0.25)}` },
        { label: t('Let them go'), detail: t('Research −10% for 4 years · relations with them +8'), effect: `brain_go:${r?.id ?? ''}` },
      ]); } },

  { key: 'rare_earth', every: 20, when: s => calm(s) && s.year >= 1968 && s.ownedRegions.length >= 2,
    build: s => { const reg = s.map?.regions.find(r => r.id === s.ownedRegions[Math.floor(s.ownedRegions.length / 2)])?.name ?? t('the interior');
      return ev(s, 'rare_earth', t('Rare Earths Found in {region}', { region: reg }), 'info', t('Geologists report silica and rare-earth seams under protected valleys in {region}.', { region: reg }), [
        { label: t('Open-pit mining'), detail: t('+60 chips, +40 steel now · approval −4 for 4 years'), effect: 'rare_mine' },
        { label: t('Protect the valleys'), detail: t('Approval +3 for 5 years'), effect: 'rare_protect' },
      ]); } },

  { key: 'strike', every: 10, when: (s, h) => calm(s) && h.count(s, 'factory') >= 3 && s.approval < 64 && s.eco.unemployment < 0.07,
    build: s => ev(s, 'strike', t('General Strike in the Kombinats'), 'warning', t('Steelworkers walk out demanding a share of the boom. The furnaces are cooling.'), [
      { label: t('Raise wages'), detail: t('−{cost} · approval +6 for 4 years', { cost: money(sum(s, 0.2)) }), cost: sum(s, 0.2), effect: `strike_pay:${sum(s, 0.2)}` },
      { label: t('Break the strike'), detail: t('Approval −9 for 3 years'), effect: 'strike_break' },
      { label: t('Wait it out'), detail: t('−30 steel from the stockpile · GDP −6% for 2 years'), effect: 'strike_wait' },
    ]) },

  { key: 'defector', every: 9, when: s => s.year >= 1962 && !!hostileRival(s),
    build: (s, h) => { const r = hostileRival(s)!; const n = leaderOf(r.id);
      return ev(s, 'defector', t('A Scientist Defects from {rival}', { rival: h.rivalName(r.id) }), 'info',
        t('A senior computer scientist crossed the border last night with a suitcase of notebooks. {leader} demands her return.', { leader: n }), [
          { label: t('Grant asylum'), detail: t('+{amount} research · relations with them −12', { amount: rpScale(s, 1.5) }), effect: `defect_keep:${r.id}` },
          { label: t('Send her back'), detail: t('Relations with them +12 · approval −2 for 2 years'), effect: `defect_return:${r.id}` },
        ]); } },

  { key: 'olympics', every: 16, when: s => calm(s) && s.year >= 1964 && s.approval >= 48 && affords(s, 0.35),
    build: s => ev(s, 'olympics', t('Host the Olympic Games?'), 'info', t('The committee is choosing the next host city. A glittering showcase — and a very large bill.'), [
      { label: t('Bid to host'), detail: t('−{cost} · approval +8 for 3 years · all relations +6', { cost: money(sum(s, 0.35)) }), cost: sum(s, 0.35), effect: `olympics_host:${sum(s, 0.35)}` },
      { label: t('Let another city have it'), detail: t('Nothing happens'), effect: 'none' },
    ]) },

  { key: 'harvest', every: 8, when: s => calm(s) && s.eco.foodSupply >= s.eco.foodDemand * 1.18,
    build: s => ev(s, 'harvest', t('Record Harvest'), 'info', t('Granaries overflow after a perfect season. What do we do with the surplus?'), [
      { label: t('Export the grain'), detail: t('+{amount} · all relations +3', { amount: money(sum(s, 0.18)) }), effect: `harvest_sell:${sum(s, 0.18)}` },
      { label: t('Fill the strategic reserve'), detail: t('Approval +4 and farm output +5% for 4 years'), effect: 'harvest_keep' },
    ]) },

  { key: 'startups', every: 14, when: s => calm(s) && s.year >= 1994 && s.education >= 65 && affords(s, 0.15),
    build: s => ev(s, 'startups', t('Garage Start-ups Everywhere'), 'info', t('Young founders want cheap capital and light rules. Venture money is pouring in.'), [
      { label: t('Tax holiday for founders'), detail: t('−{cost} · GDP +6% for 6 years', { cost: money(sum(s, 0.15)) }), cost: sum(s, 0.15), effect: `startup_free:${sum(s, 0.15)}` },
      { label: t('Tax the windfall'), detail: t('+{amount} now', { amount: money(sum(s, 0.2)) }), effect: `startup_tax:${sum(s, 0.2)}` },
    ]) },

  { key: 'reactor', every: 18, when: (s, h) => h.count(s, 'nuclear') >= 2,
    build: s => ev(s, 'reactor', t('Reactor Incident'), 'danger', t('A coolant pump failed at one of your nuclear plants. Nobody was hurt — yet. The press is outside.'), [
      { label: t('Full safety inspection'), detail: t('All nuclear plants offline for repairs · approval +2'), effect: 'reactor_inspect' },
      { label: t('Downplay it'), detail: t('Approval −7 for 4 years'), effect: 'reactor_hide' },
    ]) },

  { key: 'automation', every: 10, when: (s, h) => (s.year >= 2012 || h.count(s, 'robot') > 0) && s.eco.unemployment > 0.07,
    build: s => ev(s, 'automation', t('Automation Riots'), 'danger', t('Robots and software agents have taken {percent}% of jobs. Warehouses are burning.', { percent: Math.round(s.eco.unemployment * 100) }), [
      { label: t('Universal dividend'), detail: t('−{cost} · approval +8 for 4 years', { cost: money(sum(s, 0.3)) }), cost: sum(s, 0.3), effect: `auto_dividend:${sum(s, 0.3)}` },
      { label: t('Retraining programme'), detail: t('−{cost} · education +5', { cost: money(sum(s, 0.15)) }), cost: sum(s, 0.15), effect: `auto_retrain:${sum(s, 0.15)}` },
      { label: t('Restore order'), detail: t('Approval −8 for 3 years'), effect: 'auto_ignore' },
    ]) },

  { key: 'water', every: 12, when: (s, h) => calm(s) && affords(s, 0.25) && s.year >= 2005 && h.count(s, 'datacenter') + h.count(s, 'gpucluster') + h.count(s, 'aifactory') >= 2,
    build: s => ev(s, 'water', t('Data Centres Drink the Rivers'), 'warning', t('Farmers block the gates of your server farms: the cooling towers took their irrigation water.'), [
      { label: t('Closed-loop cooling'), detail: t('−{cost}', { cost: money(sum(s, 0.25)) }), cost: sum(s, 0.25), effect: `water_fix:${sum(s, 0.25)}` },
      { label: t('Farms can wait'), detail: t('Approval −5 and farms −10% for 4 years'), effect: 'water_ignore' },
    ]) },

  { key: 'leak', every: Infinity, when: s => s.capability >= 17.5,
    build: s => ev(s, 'leak', t('Frontier Model Leaked'), 'danger', t('The weights of your best model appeared on a public file server. Every lab on Earth is downloading them.'), [
      { label: t('Open-source it officially'), detail: t('+{amount} research from the community · every rival catches up ~1 year · relations +8 · alignment −4', { amount: rpScale(s, 2) }), effect: 'leak_open' },
      { label: t('Hunt the leakers'), detail: t('−{cost} · alignment +5 · approval −4 for 3 years', { cost: money(sum(s, 0.2)) }), cost: sum(s, 0.2), effect: `leak_hunt:${sum(s, 0.2)}` },
    ]) },

  { key: 'interp', every: Infinity, when: (s, h) => s.year >= 2000 && h.count(s, 'defense') >= 2 && s.alignment >= 60,
    build: s => ev(s, 'interp', t('Interpretability Breakthrough'), 'info', t('Your AI Safety Institute can finally read what a neural network is thinking. Publishing would make every lab safer — including your rivals.'), [
      { label: t('Publish openly'), detail: t('Every rival alignment +8 · relations +8 · your alignment +4'), effect: 'interp_open' },
      { label: t('Keep it in-house'), detail: t('Your alignment +10'), effect: 'interp_keep' },
    ]) },

  { key: 'cyber_arms', every: Infinity, when: (s, h) => s.year >= 1995 && computeCount(s, h) >= 3,
    build: s => ev(s, 'cyber_arms', t('Offensive Cyber Programme'), 'warning', t('The defence ministry wants to turn part of your compute into a cyber-weapons programme.'), [
      { label: t('Approve it'), detail: t('Covert operations +15% success for the rest of the game · alignment −5 · relations −6'), effect: 'cyber_yes' },
      { label: t('Refuse'), detail: t('Alignment +3'), effect: 'cyber_no' },
    ]) },

  // ─── E1 follow-up chains: each fires once, some years after the choice that set its flag ───
  { key: 'chain_defector', every: Infinity, when: s => calm(s) && flagAge(s, 'defector_asylum') >= 3,
    build: (s, h) => { const rid = defectorSource(s); const name = rid ? h.rivalName(rid) : t('a rival');
      return ev(s, 'chain_defector', t('The Defector Cracks a Cipher'), 'info',
        t('The scientist who fled {rival} has settled into our labs. Her notebooks hold the key to a cipher {rival} still trusts.', { rival: name }), [
          { label: t('Keep the cipher'), detail: t('Intelligence on {rival} for 10 years', { rival: name }), effect: `chain_defector_cipher:${rid}` },
          { label: t('Trade it back'), detail: t('Relations with {rival} +10', { rival: name }), effect: `chain_defector_trade:${rid}` },
        ]); } },

  { key: 'chain_reactor', every: Infinity, when: s => calm(s) && flagAge(s, 'reactor_coverup') >= 4,
    build: s => ev(s, 'chain_reactor', t('The Reactor Cover-up Leaks'), 'danger',
      t('A former technician has posted the maintenance logs online. The reactor incident is no longer a rumour, and reporters want to know why it was hidden.'), [
        { label: t('Pay to bury it'), detail: t('−{cost} · the story dies', { cost: money(sum(s, 0.3)) }), cost: sum(s, 0.3), effect: `chain_reactor_bury:${sum(s, 0.3)}` },
        { label: t('Let it run'), detail: t('Approval −10 for 3 years'), effect: 'chain_reactor_leak' },
      ]) },

  { key: 'chain_leak', every: Infinity, when: s => calm(s) && flagAge(s, 'leak_open') >= 3,
    build: s => ev(s, 'chain_leak', t('Open-Source Community Breakthrough'), 'info',
      t('Volunteers around the world have reproduced parts of your open release and improved them. Their fixes are flowing back into your repositories.'), [
        { label: t('Harvest the fixes'), detail: t('+{amount} research now', { amount: rpScale(s, 1.5) }), effect: `chain_leak_windfall:${rpScale(s, 1.5)}` },
        { label: t('Fund the contributors'), detail: t('Research +8% for 5 years'), effect: 'chain_leak_boost' },
      ]) },

  { key: 'chain_martyrs', every: Infinity, when: s => calm(s) && flagAge(s, 'strike_broken') >= 2,
    build: s => ev(s, 'chain_martyrs', t('Union Martyrs'), 'warning',
      t('A striker injured at the gates has died in hospital. Her union has called the whole district into the streets.'), [
        { label: t('Stand firm'), detail: t('Approval −5 for 4 years'), effect: 'chain_martyrs_stand' },
        { label: t('Pay a settlement'), detail: t('−{cost} · approval −2 for 4 years', { cost: money(sum(s, 0.2)) }), cost: sum(s, 0.2), effect: `chain_martyrs_settle:${sum(s, 0.2)}` },
      ]) },

  { key: 'chain_olympic', every: Infinity, when: s => calm(s) && flagAge(s, 'olympics_hosted') >= 1,
    build: s => ev(s, 'chain_olympic', t('Olympic Tourism Boom'), 'info',
      t('Visitors from every continent fill the hotels and the trains. The Games are over, but the crowds have not gone home.'), [
        { label: t('Ride the tourist wave'), detail: t('GDP +4% for 3 years'), effect: 'chain_olympic_boom' },
        { label: t('Sell the broadcast rights'), detail: t('+{amount} now', { amount: money(sum(s, 0.2)) }), effect: `chain_olympic_rights:${sum(s, 0.2)}` },
      ]) },

  { key: 'chain_thanks', every: Infinity, when: s => calm(s) && flagAge(s, 'interp_open') >= 3,
    build: s => ev(s, 'chain_thanks', t('Rivals Thank You'), 'info',
      t('Safety teams in rival labs have adopted your interpretability tools, and their ministers want to say so in public.'), [
        { label: t('Accept the thanks'), detail: t('Relations with all rivals +8'), effect: 'chain_thanks_relations' },
        { label: t('Ask for a safety pledge'), detail: t('Your alignment +4'), effect: 'chain_thanks_pledge' },
      ]) },

  { key: 'chain_cyber', every: Infinity, when: s => calm(s) && flagAge(s, 'cyber_yes') >= 4,
    build: s => {
      const contained = s.modifiers.some(m => m.id === 'counterintel');
      const patch = sum(s, contained ? 0.1 : 0.3);
      return ev(s, 'chain_cyber', t('Your Cyber Weapon Escapes'), 'danger',
        contained
          ? t('A copy of your cyber weapon reached the grid control network, but your counter-intelligence sweep caught it at the edge. The clean-up still has to be paid for.')
          : t('A copy of your cyber weapon escaped its test range and reached the national grid. Operators are watching the load curves fall.'), [
          { label: t('Patch the grid now'), detail: t('−{cost} · the worm is removed', { cost: money(patch) }), cost: patch, effect: `chain_cyber_patch:${patch}` },
          { label: t('Ride it out'), detail: contained ? t('Counter-intelligence holds · no blackout') : t('Energy supply −30% for 1 year (blackout)'), effect: `chain_cyber_ride:${contained ? 0 : 1}` },
        ]); } },

  { key: 'chain_brain', every: Infinity, when: s => calm(s) && flagAge(s, 'brain_go') >= 4,
    build: s => ev(s, 'chain_brain', t('Returning Scientists'), 'info',
      t('Some of the scientists who left for foreign labs are knocking on the door. They bring new methods and want to work at home.'), [
        { label: t('Welcome them home'), detail: t('Research +10% for 4 years'), effect: 'chain_brain_research' },
        { label: t('Fund their schools'), detail: t('Education +5'), effect: 'chain_brain_education' },
      ]) },

  { key: 'chain_farm', every: Infinity, when: s => calm(s) && flagAge(s, 'water_ignore') >= 3,
    build: s => ev(s, 'chain_farm', t('Farmers Revolt'), 'danger',
      t('Dry fields and empty wells have turned the villages against the server farms. Tractors block the highways while the harvest is already late.'), [
        { label: t('Let the revolt run'), detail: t('Farms −15% for 3 years'), effect: 'chain_farm_revolt' },
        { label: t('Compensate the farmers'), detail: t('−{cost} · farms unaffected', { cost: money(sum(s, 0.2)) }), cost: sum(s, 0.2), effect: `chain_farm_compensate:${sum(s, 0.2)}` },
      ]) },

  { key: 'chain_reserve', every: Infinity, when: s => calm(s) && flagAge(s, 'harvest_keep') >= 5 && s.eco.foodSupply / s.eco.foodDemand < 1,
    build: s => ev(s, 'chain_reserve', t('The Reserve Saves a Famine'), 'warning',
      t('A failed season has emptied the markets. The granaries you filled years ago are the only food left in the region.'), [
        { label: t('Release the reserve'), detail: t('Food +10% for 2 years'), effect: 'chain_reserve_release' },
        { label: t('Sell the reserve for cash'), detail: t('+{amount} now', { amount: money(sum(s, 0.2)) }), effect: `chain_reserve_sell:${sum(s, 0.2)}` },
      ]) },
];

/** Elections / party congress: a fixed rhythm every 8 years, outcome shaped by approval. */
function election(s: GameState): GameEvent {
  const a = Math.round(s.approval);
  const won = a >= 52;
  const congress = s.playerContinent === 'su' || s.playerContinent === 'cn';
  const name = congress ? t('Party Congress') : t('General Election');
  if (won) {
    return ev(s, 'election', t('{name}: Mandate Renewed', { name }), 'info', t('With {approval}% approval the government is confirmed. How will you spend the mandate?', { approval: a }), [
      { label: t('Bold reforms'), detail: t('Decrees can be changed right away · GDP +5% for 4 years · approval −3'), effect: 'elect_bold' },
      { label: t('Steady hands'), detail: t('Approval +5 for 4 years'), effect: 'elect_steady' },
    ]);
  }
  return ev(s, 'election', t('{name}: The Opposition Surges', { name }), 'danger', t('Approval is only {approval}%. The opposition demands change and the streets are listening.', { approval: a }), [
    { label: t('Concessions'), detail: t('Tax rate −3 points · approval +7 for 4 years'), effect: 'elect_concede' },
    { label: t('Emergency powers'), detail: t('Approval −6 for 4 years · enemy operations −30% for 4 years'), effect: 'elect_powers' },
  ]);
}

/** Picks at most one dynamic decision for this year (called from engine.yearly when no event is queued). */
export function rollDynamic(s: GameState, h: DynHelpers): GameEvent | null {
  if (s.gameMode === 'logic') return null;
  const y = Math.floor(s.year);
  const meta = s.dyn ?? { last: {}, nextElection: s.startYear + 6, lastAny: 0 };
  s.dyn = meta;
  if (y >= meta.nextElection) {
    meta.nextElection = y + 7 + Math.floor(h.rand() * 3);   // terms of 7–9 years
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
    id: `project-${r.id}`, name: t('{rival} Launches an ASI Project', { rival: name }), year: Math.floor(s.year), type: 'danger',
    description: h.hasIntel(s, r)
      ? t('{leader} has ordered a crash programme to ignite superintelligence. Our agents expect ignition around {eta}{poor}. This is the final act of the race.', {
        leader, eta: Math.round(eta), poor: r.alignment < 60 ? t(' — and their safety record is poor') : '',
      })
      : t('{leader} has ordered a crash programme to ignite superintelligence. Without agents inside we cannot say when it will be ready — an intelligence sweep would tell us. This is the final act of the race.', { leader }),
    choices: [
      { label: t('Demand international inspections'), detail: inspect ? t('Their project slows ~1.5 years · their alignment +10') : t('They refuse (relations {relation} < 10): relations −8', { relation: Math.round(r.relation) }), effect: `proj_inspect:${r.id}` },
      { label: t('Covert strike on their data centres'), detail: t('−{cost} · {chance}% success: set back ~2.5 years · failure: relations −40, treaties torn up and they accelerate', { cost: money(strikeCost), chance: strikeChance }), cost: strikeCost, effect: `proj_strike:${r.id}:${strikeCost}:${strikeChance}` },
      { label: t('Out-race them'), detail: t('National crash programme: research +20% for 4 years · approval −5 · alignment −3'), effect: 'proj_race' },
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
    case 'brain_keep': s.budget -= n1; h.addMod(s, { id: 'brain_keep', label: t('Scientists stayed'), years: 6, research: 1.1 }); break;
    case 'brain_go': setFlag(s, 'brain_go'); h.addMod(s, { id: 'brain_go', label: t('Brain drain'), years: 4, research: 0.9 }); if (a1) relOne(a1, 8); break;
    case 'rare_mine': s.chips += 60; s.steel += 40; h.addMod(s, { id: 'rare_mine', label: t('Mining protests'), years: 4, approval: -4 }); break;
    case 'rare_protect': h.addMod(s, { id: 'rare_protect', label: t('Protected valleys'), years: 5, approval: 3 }); break;
    case 'strike_pay': s.budget -= n1; h.addMod(s, { id: 'strike', label: t('Wage deal'), years: 4, approval: 6 }); break;
    case 'strike_break': setFlag(s, 'strike_broken'); h.addMod(s, { id: 'strike', label: t('Strike broken'), years: 3, approval: -9 }); break;
    case 'strike_wait': s.steel = Math.max(0, s.steel - 30); h.addMod(s, { id: 'strike', label: t('Long strike'), years: 2, gdp: 0.94 }); break;
    case 'defect_keep': setFlag(s, 'defector_asylum'); setFlag(s, `${DEFECTOR_FLAG}${a1}`); s.researchPoints += rpScale(s, 1.5); relOne(a1, -12); h.pushLog(s, h.rivalName(a1), t('Protests the asylum granted to its scientist.'), 'warning'); break;
    case 'defect_return': relOne(a1, 12); h.addMod(s, { id: 'defect_return', label: t('Handed back a defector'), years: 2, approval: -2 }); break;
    case 'olympics_host': setFlag(s, 'olympics_hosted'); s.budget -= n1; relAll(6); h.addMod(s, { id: 'olympics', label: t('Olympic Games'), years: 3, approval: 8 }); break;
    case 'harvest_sell': s.budget += n1; relAll(3); break;
    case 'harvest_keep': setFlag(s, 'harvest_keep'); h.addMod(s, { id: 'harvest_keep', label: t('Grain reserve'), years: 4, approval: 4, farms: 1.05 }); break;
    case 'startup_free': s.budget -= n1; h.addMod(s, { id: 'startups', label: t('Start-up boom'), years: 6, gdp: 1.06 }); break;
    case 'startup_tax': s.budget += n1; break;
    case 'reactor_inspect': offline('nuclear', 0.75); h.addMod(s, { id: 'reactor', label: t('Safety culture'), years: 3, approval: 2 }); break;
    case 'reactor_hide': setFlag(s, 'reactor_coverup'); h.addMod(s, { id: 'reactor', label: t('Reactor cover-up'), years: 4, approval: -7 }); break;
    case 'auto_dividend': s.budget -= n1; h.addMod(s, { id: 'automation', label: t('Universal dividend'), years: 4, approval: 8 }); break;
    case 'auto_retrain': s.budget -= n1; s.education = clamp(s.education + 5, 0, 100); break;
    case 'auto_ignore': h.addMod(s, { id: 'automation', label: t('Automation riots'), years: 3, approval: -8 }); break;
    case 'water_fix': s.budget -= n1; break;
    case 'water_ignore': setFlag(s, 'water_ignore'); h.addMod(s, { id: 'water', label: t('Thirsty farms'), years: 4, approval: -5, farms: 0.9 }); break;
    case 'leak_open':
      setFlag(s, 'leak_open'); s.researchPoints += rpScale(s, 2); relAll(8); s.alignment = clamp(s.alignment - 4, 0, 100);
      rivalMap(r => ({ ...r, lag: r.lag - 1 }));
      break;
    case 'leak_hunt': s.budget -= n1; s.alignment = clamp(s.alignment + 5, 0, 100); h.addMod(s, { id: 'leak_hunt', label: t('Leak investigation'), years: 3, approval: -4 }); break;
    case 'interp_open': setFlag(s, 'interp_open'); relAll(8); s.alignment = clamp(s.alignment + 4, 0, 100); rivalMap(r => ({ ...r, alignment: clamp(r.alignment + 8, 0, 100) })); break;
    case 'interp_keep': s.alignment = clamp(s.alignment + 10, 0, 100); break;
    case 'cyber_yes': setFlag(s, 'cyber_yes'); s.alignment = clamp(s.alignment - 5, 0, 100); relAll(-6); h.addMod(s, { id: 'cyber_arms', label: t('Cyber-weapons programme'), years: 9999 }); break;
    case 'cyber_no': s.alignment = clamp(s.alignment + 3, 0, 100); break;
    case 'elect_bold': s.policyCooldown = 0; h.addMod(s, { id: 'mandate', label: t('Reform mandate'), years: 4, gdp: 1.05, approval: -3 }); break;
    case 'elect_steady': h.addMod(s, { id: 'mandate', label: t('Steady government'), years: 4, approval: 5 }); break;
    case 'elect_concede': s.taxRate = clamp(s.taxRate - 0.03, 0.1, 0.4); h.addMod(s, { id: 'mandate', label: t('Concessions'), years: 4, approval: 7 }); break;
    case 'elect_powers': h.addMod(s, { id: 'emergency_powers', label: t('Emergency powers'), years: 4, approval: -6 }); break;
    // Rival ASI projects
    case 'proj_inspect': {
      const r = s.rivals.find(x => x.id === a1); if (!r) break;
      if (r.relation >= 10 || r.treaties.includes('safety')) {
        rivalMap(x => x.id === a1 ? { ...x, lag: x.lag + 1.5, alignment: clamp(x.alignment + 10, 0, 100) } : x);
        h.notify(s, `🔎 ${t('Inspectors are inside {rival}\'s project. Ignition delayed.', { rival: h.rivalName(a1) })}`, 'success');
      } else {
        relOne(a1, -8);
        h.notify(s, t('{leader} expelled the inspectors.', { leader: leaderOf(a1) }), 'danger');
      }
      break;
    }
    case 'proj_strike': {
      const cost = Number(a2) || 0, p = (Number(a3) || 40) / 100;
      s.budget -= cost;
      if (h.rand() < p) {
        rivalMap(x => x.id === a1 ? { ...x, heat: (x.heat ?? 0) + 1, lag: x.lag + 2.5, capability: Math.min(x.capability, h.historicalCapability(s.year - x.lag - 2.5)) } : x);
        h.notify(s, `💥 ${t('Strike succeeded: {rival}\'s ASI project set back ~2.5 years.', { rival: h.rivalName(a1) })}`, 'success');
        h.pushLog(s, t('Intelligence'), t('Covert strike crippled {rival}\'s ASI project.', { rival: h.rivalName(a1) }), 'success');
      } else {
        rivalMap(x => x.id === a1 ? { ...x, lag: x.lag - 0.5, relation: clamp(x.relation - 40, -100, 100), treaties: [] } : x);
        h.notify(s, `✖ ${t('The strike on {rival} was traced back to us. They are accelerating.', { rival: h.rivalName(a1) })}`, 'danger');
        h.pushLog(s, h.rivalName(a1), t('Exposed our covert strike and tore up every treaty.'), 'danger');
      }
      break;
    }
    case 'proj_race': h.addMod(s, { id: 'crash_programme', label: t('National crash programme'), years: 4, research: 1.2, approval: -5 }); s.alignment = clamp(s.alignment - 3, 0, 100); break;
    // E1 follow-up chains
    case 'chain_defector_cipher': rivalMap(r => r.id === a1 ? { ...r, intelUntil: Math.max(r.intelUntil, s.year + 10) } : r); break;
    case 'chain_defector_trade': relOne(a1, 10); break;
    case 'chain_reactor_bury': s.budget -= n1; break;
    case 'chain_reactor_leak': h.addMod(s, { id: 'reactor_leak', label: t('Reactor cover-up exposed'), years: 3, approval: -10 }); break;
    case 'chain_leak_windfall': s.researchPoints += n1; break;
    case 'chain_leak_boost': h.addMod(s, { id: 'leak_boost', label: t('Open-source momentum'), years: 5, research: 1.08 }); break;
    case 'chain_martyrs_stand': h.addMod(s, { id: 'martyrs', label: t('Union martyrs'), years: 4, approval: -5 }); break;
    case 'chain_martyrs_settle': s.budget -= n1; h.addMod(s, { id: 'martyrs', label: t('Strike settlement'), years: 4, approval: -2 }); break;
    case 'chain_olympic_boom': h.addMod(s, { id: 'olympic_boom', label: t('Olympic tourism'), years: 3, gdp: 1.04 }); break;
    case 'chain_olympic_rights': s.budget += n1; break;
    case 'chain_thanks_relations': relAll(8); break;
    case 'chain_thanks_pledge': s.alignment = clamp(s.alignment + 4, 0, 100); break;
    case 'chain_cyber_patch': s.budget -= n1; break;
    case 'chain_cyber_ride': if (n1) h.addMod(s, { id: 'cyber_blackout', label: t('Grid blackout'), years: 1, energySupply: 0.7 }); break;
    case 'chain_brain_research': h.addMod(s, { id: 'brain_return', label: t('Returning scientists'), years: 4, research: 1.1 }); break;
    case 'chain_brain_education': s.education = clamp(s.education + 5, 0, 100); break;
    case 'chain_farm_revolt': h.addMod(s, { id: 'farm_revolt', label: t('Farmers in revolt'), years: 3, farms: 0.85 }); break;
    case 'chain_farm_compensate': s.budget -= n1; break;
    case 'chain_reserve_release': h.addMod(s, { id: 'reserve_release', label: t('Reserve released'), years: 2, farms: 1.1 }); break;
    case 'chain_reserve_sell': s.budget += n1; break;
    default: return false;
  }
  return true;
}
