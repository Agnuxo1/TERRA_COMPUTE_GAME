// Achievements, evaluated once from the final GameState of a finished game.
// Unlocks persist in localStorage as { id: unlockedAt (ms) }. Cosmetic only: no effect on the game.
import { isVictory, type BuildingId, type GameState } from './types.ts';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (s: GameState) => boolean;
}

const won = (s: GameState) => s.outcome === 'safe_asi';
const anyWin = (s: GameState) => isVictory(s.outcome);
const me = (s: GameState) => s.mp?.me ?? s.playerContinent ?? '';
const zonesHeld = (s: GameState) => Object.values(s.zones ?? {}).filter(z => !!z.holder && z.holder === me(s)).length;
const projectsOwned = (s: GameState) => Object.values(s.projects ?? {}).filter(p => !!p.owner && p.owner === me(s)).length;
const firstsClaimed = (s: GameState) => Object.values(s.firsts ?? {}).filter(f => f.who === me(s)).length;
const hiredCount = (s: GameState) => s.talent?.hired.length ?? 0;
const lostCount = (s: GameState) => s.talent?.lost.length ?? 0;
const doctrineCount = (s: GameState) => Object.keys(s.doctrines ?? {}).length;
const flagCount = (s: GameState) => Object.keys(s.flags ?? {}).length;
const treatyCount = (s: GameState) => s.rivals.reduce((n, r) => n + r.treaties.length, 0);
const modCount = (s: GameState) => Object.values(s.mods ?? {}).filter(v => v !== undefined && v !== false && v !== 1).length;

function countBuildings(s: GameState, types: BuildingId[]): number {
  if (!s.map) return 0;
  let n = 0;
  for (const t of s.map.tiles) {
    if (t.building && t.building.progress >= 1 && types.includes(t.building.type)) n++;
  }
  return n;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Original 15 (ids unchanged) ──────────────────────────────────────────
  { id: 'safe_landing', name: 'Safe Landing', icon: '◆', description: 'Ignite a safe superintelligence.', check: won },
  { id: 'green_superpower', name: 'Green Superpower', icon: '❀', description: 'Win with planet health at 70% or more.', check: s => won(s) && s.planetHealth >= 70 },
  { id: 'before_2030', name: 'Before 2030', icon: '⏱', description: 'Win before the year 2030.', check: s => won(s) && s.victoryYear > 0 && s.victoryYear < 2030 },
  { id: 'ironclad', name: 'Ironclad', icon: '⛨', description: 'Win with alignment at 95% or more.', check: s => won(s) && s.alignment >= 95 },
  { id: 'against_odds', name: 'Against All Odds', icon: '☠', description: 'Win on HARD difficulty.', check: s => won(s) && s.difficulty === 'hard' },
  { id: 'full_history', name: 'The Long Century', icon: '⌛', description: 'Win in COMPLETE mode, starting from 1960.', check: s => won(s) && s.gameMode === 'complete' },
  { id: 'beloved', name: 'People’s Champion', icon: '☺', description: 'Win with public approval at 75% or more.', check: s => won(s) && s.approval >= 75 },
  { id: 'spymaster', name: 'Spymaster', icon: '👁', description: 'End a game with live intelligence on every rival bloc.', check: s => s.rivals.length > 0 && s.rivals.every(r => r.intelUntil >= s.year) },
  { id: 'five_treaties', name: 'Five Treaties', icon: '✍', description: 'Hold 5 or more treaties at the end of a game.', check: s => s.rivals.reduce((n, r) => n + r.treaties.length, 0) >= 5 },
  { id: 'full_marks', name: 'Full Marks', icon: '★', description: 'Earn 3 stars in 5 different exercises.', check: s => Object.values(s.minigameResults).filter(v => v >= 3).length >= 5 },
  { id: 'steel_empire', name: 'Steel Empire', icon: '⚒', description: 'Run 6 or more kombinats (factories) at once.', check: s => countBuildings(s, ['factory']) >= 6 },
  { id: 'clean_grid', name: 'Clean Grid', icon: '☀', description: 'End with 5+ clean power plants and no coal.', check: s => countBuildings(s, ['solar', 'nuclear', 'fusion']) >= 5 && countBuildings(s, ['coal']) === 0 },
  { id: 'master_builder', name: 'Master Builder', icon: '▦', description: 'Construct 60 buildings in one game.', check: s => s.totalBuildings >= 60 },
  { id: 'tech_titan', name: 'Tech Titan', icon: '⚛', description: 'Research 25 technologies in one game.', check: s => s.totalTechs >= 25 },
  { id: 'yottaflop', name: 'YottaFLOP', icon: '⚡', description: 'Reach 10^24 FLOPS of compute.', check: s => s.peakCapability >= 24 },

  // ── Geography, projects, people, doctrines, story, firsts (H4) ───────────
  { id: 'zone_holder', name: 'Chokepoint', icon: '⌖', description: 'Hold a strategic zone when the game ends.', check: s => zonesHeld(s) >= 1 },
  { id: 'zone_sweep', name: 'Strategic Sweep', icon: '⚑', description: 'Hold 3 strategic zones at once.', check: s => zonesHeld(s) >= 3 },
  { id: 'project_first', name: 'Founding Works', icon: '✪', description: 'Complete a national project.', check: s => projectsOwned(s) >= 1 },
  { id: 'project_three', name: 'Wonder Builder', icon: '☲', description: 'Own 3 national projects.', check: s => projectsOwned(s) >= 3 },
  { id: 'project_all', name: 'Grand Works', icon: '✦', description: 'Own every national project.', check: s => projectsOwned(s) >= 5 },
  { id: 'talent_hire', name: 'Headhunter', icon: '⚖', description: 'Hire 3 scientists.', check: s => hiredCount(s) >= 3 },
  { id: 'talent_full', name: 'Dream Team', icon: '⌬', description: 'Hire 6 scientists.', check: s => hiredCount(s) >= 6 },
  { id: 'talent_lost', name: 'Brain Drain', icon: '⇣', description: 'Lose 2 scientists to rival poaching.', check: s => lostCount(s) >= 2 },
  { id: 'doctrine_all', name: 'Doctrinaire', icon: '⚐', description: 'Choose a side on all four doctrine forks.', check: s => doctrineCount(s) >= 4 },
  { id: 'flags_many', name: 'Story Keeper', icon: '✎', description: 'Set 10 story flags through your choices.', check: s => flagCount(s) >= 10 },
  { id: 'first_one', name: 'Pioneering Claim', icon: '⬆', description: 'Claim a world first.', check: s => firstsClaimed(s) >= 1 },
  { id: 'first_three', name: 'Frontier Triple', icon: '⋯', description: 'Claim 3 world firsts.', check: s => firstsClaimed(s) >= 3 },
  { id: 'first_all', name: 'Zettaflop Pioneer', icon: '⊛', description: 'Claim every world first.', check: s => firstsClaimed(s) >= 4 },

  // ── Alternative victories, treaties, the world (H4) ─────────────────────
  { id: 'win_assembly', name: 'Speaker of the Assembly', icon: '⚖', description: 'Win through a World Assembly governance vote.', check: s => s.outcome === 'governance' },
  { id: 'win_silicon', name: 'Crown of Silicon', icon: '◈', description: 'Win with silicon hegemony.', check: s => s.outcome === 'silicon' },
  { id: 'win_custodian', name: 'Joint Custody', icon: '⚿', description: 'Win as a shared custodian of the AI.', check: s => s.outcome === 'custodian' },
  { id: 'win_agenda', name: 'Agenda Setter', icon: '☷', description: 'Put an AI Control Treaty on the Assembly agenda and win.', check: s => anyWin(s) && !!s.aiControlProposed },
  { id: 'win_mobilised', name: 'War Footing', icon: '⚔', description: 'Win with total mobilisation in force.', check: s => anyWin(s) && !!s.mobilised },
  { id: 'silicon_streak', name: 'Chip Sovereign', icon: '▣', description: 'Keep a 60% world chip share for 5 years.', check: s => (s.siliconYears ?? 0) >= 5 },
  { id: 'treaty_web', name: 'Treaty Web', icon: '⋈', description: 'Hold 10 treaties at the end of a game.', check: s => treatyCount(s) >= 10 },
  { id: 'universal_accord', name: 'Universal Accord', icon: '◎', description: 'Hold at least one treaty with every rival.', check: s => s.rivals.length > 0 && s.rivals.every(r => r.treaties.length > 0) },
  { id: 'red_phone', name: 'Red Phone', icon: '☎', description: 'Win while world tension is at DEFCON 1 (90 or more).', check: s => anyWin(s) && (s.tension ?? 0) >= 90 },
  { id: 'cool_heads', name: 'Cool Heads', icon: '❄', description: 'Win with world tension under 20.', check: s => anyWin(s) && s.tension !== undefined && s.tension < 20 },

  // ── Scenarios and daily / weekly challenges (H1, H2) ────────────────────
  { id: 'scen_cuban', name: 'Thirteen Days', icon: '✈', description: 'Win the 1962 Cuban Missile scenario.', check: s => anyWin(s) && s.scenario === 'cuban_missiles' },
  { id: 'scen_wall', name: 'Peace Dividend', icon: '⛓', description: 'Win "The Wall Falls" scenario.', check: s => anyWin(s) && s.scenario === 'cold_war_end' },
  { id: 'scen_dl', name: 'Deep Learning Pioneer', icon: '⟁', description: 'Win the 2012 Deep Learning scenario.', check: s => anyWin(s) && s.scenario === 'deep_learning' },
  { id: 'scen_fire', name: 'Firefighter', icon: '♨', description: 'Win the World on Fire scenario.', check: s => anyWin(s) && s.scenario === 'world_on_fire' },
  { id: 'scen_uchronia', name: 'Uchronian', icon: '∞', description: 'Win the Uchronia scenario.', check: s => anyWin(s) && s.scenario === 'uchronia' },
  { id: 'daily_win', name: 'Daily Victor', icon: '✔', description: 'Win a daily challenge.', check: s => anyWin(s) && !!s.challenge?.startsWith('daily-') },
  { id: 'weekly_win', name: 'Weekly Champion', icon: '✚', description: 'Win a weekly challenge.', check: s => anyWin(s) && !!s.challenge?.startsWith('weekly-') },
  { id: 'rules_win', name: 'Rules of the Game', icon: '⌘', description: 'Win with two or more game modifiers.', check: s => anyWin(s) && modCount(s) >= 2 },
  { id: 'no_coal_win', name: 'Coal-Free Ascent', icon: '◇', description: 'Win with coal plants banned.', check: s => anyWin(s) && !!s.mods?.noCoal },

  // ── Late wins and defeats with a story (cosmetic) ───────────────────────
  { id: 'late_win', name: 'Late Ignition', icon: '☾', description: 'Win in 2030 or later.', check: s => anyWin(s) && s.victoryYear >= 2030 },
  { id: 'planet_mourner', name: 'Last Green Hope', icon: '❧', description: 'Lose to a rival superintelligence while planet health stays at 60% or more.', check: s => s.outcome === 'rival_asi' && s.planetHealth >= 60 },
  { id: 'lost_climate', name: 'Burned Earth', icon: '♨', description: 'Lose to planetary collapse.', check: s => s.outcome === 'climate' },
];

const KEY = 'terra_compute_achievements';

function readStore(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return v && typeof v === 'object' ? (v as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeStore(v: Record<string, number>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // storage unavailable
  }
}

/** id → unlock timestamp (ms). */
export function getUnlocked(): Record<string, number> {
  return readStore();
}

// Same final state evaluated twice (StrictMode, remounts) returns the same answer.
const cache = new WeakMap<GameState, Achievement[]>();

/** Checks a finished game, persists new unlocks and returns the achievements unlocked by it. */
export function evaluate(state: GameState): Achievement[] {
  const hit = cache.get(state);
  if (hit) return hit;
  const store = readStore();
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    let ok = false;
    try {
      ok = a.check(state);
    } catch {
      ok = false;
    }
    if (ok && !store[a.id]) {
      store[a.id] = Date.now();
      fresh.push(a);
    }
  }
  if (fresh.length) writeStore(store);
  cache.set(state, fresh);
  return fresh;
}

/** Achievements this state satisfies, whether new or earned before. */
export function earnedBy(state: GameState): Achievement[] {
  return ACHIEVEMENTS.filter(a => {
    try {
      return a.check(state);
    } catch {
      return false;
    }
  });
}
