// Phases D & E: one bonus vocabulary shared by strategic zones, national projects and hired scientists.
// Each module returns a Partial<WorldBonus> for a bloc; the engine combines them and applies each key in one place.

export interface WorldBonus {
  /** Multipliers (1 = neutral). */
  chipImport: number;     // chip market buy price
  powerSupply: number;    // energy supply
  computeEnergy: number;  // energy used by compute buildings
  steel: number;          // steel production
  chips: number;          // chip production
  trade: number;          // trade-treaty income
  compute: number;        // effective compute
  research: number;       // research rate
  economy: number;        // GDP
  housing: number;        // housing capacity
  intelYears: number;     // duration of intel gathered by our operations
  /** Additive (0 = neutral). */
  covert: number;         // covert success chance (0.1 = +10 points)
  approval: number;       // approval target points
  alignment: number;      // alignment points per year
  alignmentCap: number;   // alignment cap points
}

export const ADDITIVE: ReadonlyArray<keyof WorldBonus> = ['covert', 'approval', 'alignment', 'alignmentCap'];

export const NEUTRAL: WorldBonus = {
  chipImport: 1, powerSupply: 1, computeEnergy: 1, steel: 1, chips: 1, trade: 1, compute: 1, research: 1, economy: 1, housing: 1, intelYears: 1,
  covert: 0, approval: 0, alignment: 0, alignmentCap: 0,
};

/** Multiplies the multipliers and adds the additive keys. */
export function combine(...parts: Array<Partial<WorldBonus>>): WorldBonus {
  const out: WorldBonus = { ...NEUTRAL };
  for (const p of parts) {
    for (const k of Object.keys(p) as Array<keyof WorldBonus>) {
      const v = p[k];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      out[k] = ADDITIVE.includes(k) ? out[k] + v : out[k] * v;
    }
  }
  return out;
}

/** Engine services handed to the D/E modules (zones, projects, people) so they never import engine.ts. */
export interface DEHelpers {
  rand: () => number;
  notify: (s: import('./types').GameState, text: string, type?: 'info' | 'warning' | 'danger' | 'success') => void;
  pushLog: (s: import('./types').GameState, who: string, text: string, tone: 'info' | 'success' | 'warning' | 'danger') => void;
  /** Translated display name of a bloc id. */
  rivalName: (id: string) => string;
  /** The player's bloc id. */
  me: (s: import('./types').GameState) => string;
  /** True when this bloc is simulated elsewhere (a human, or any rival on a multiplayer guest): skip AI logic for it. */
  isRemote: (s: import('./types').GameState, id: string) => boolean;
  raiseTension: (s: import('./types').GameState, d: number, culprit?: string) => void;
  /** Operational buildings of a type owned by the player. */
  countBuildings: (s: import('./types').GameState, type: import('./types').BuildingId) => number;
}
