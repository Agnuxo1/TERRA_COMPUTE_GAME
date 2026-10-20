// Budget split doctrines for the living rivals (weights sum to 1). Keyed by continent id, matching RIVAL_LEADERS.
export type InvestKey = 'compute' | 'research' | 'safety' | 'defense' | 'covert';

export const PERSONALITY: Record<string, Record<InvestKey, number>> = {
  su: { compute: 0.45, research: 0.15, safety: 0.05, defense: 0.15, covert: 0.20 },   // Volkov: iron doctrine
  cn: { compute: 0.50, research: 0.20, safety: 0.05, defense: 0.10, covert: 0.15 },   // Lin: scale doctrine
  na: { compute: 0.45, research: 0.30, safety: 0.10, defense: 0.05, covert: 0.10 },   // Hale: frontier doctrine
  eu: { compute: 0.30, research: 0.30, safety: 0.25, defense: 0.05, covert: 0.10 },   // Varga: precaution doctrine
  in: { compute: 0.35, research: 0.40, safety: 0.10, defense: 0.05, covert: 0.10 },   // Rao: talent doctrine
  af: { compute: 0.40, research: 0.30, safety: 0.15, defense: 0.10, covert: 0.05 },   // Okafor: leapfrog doctrine
  sa: { compute: 0.40, research: 0.25, safety: 0.15, defense: 0.10, covert: 0.10 },   // Duarte: commodity doctrine
  oc: { compute: 0.30, research: 0.25, safety: 0.20, defense: 0.20, covert: 0.05 },   // Calder: fortress doctrine
};

/** Used for any bloc without a doctrine of its own. */
export const EVEN_PERSONALITY: Record<InvestKey, number> = { compute: 0.2, research: 0.2, safety: 0.2, defense: 0.2, covert: 0.2 };

export const personalityOf = (id: string): Record<InvestKey, number> => PERSONALITY[id] ?? EVEN_PERSONALITY;
