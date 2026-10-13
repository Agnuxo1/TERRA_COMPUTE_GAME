// World commodity market for steel and chips.
// Prices follow a historical curve; your own trades nudge them, and the nudge fades.

export type Good = 'steel' | 'chips';

const STEEL_CURVE: Array<[number, number]> = [[1960, 4], [1980, 4.5], [2000, 5], [2020, 5.5], [2040, 6]];
// Chips start as precious hand-made components and get cheap with Moore's law,
// until the AI boom makes them scarce again.
const CHIP_CURVE: Array<[number, number]> = [[1960, 30], [1975, 16], [1990, 9], [2005, 6], [2018, 5], [2028, 7], [2040, 8]];

function interp(curve: Array<[number, number]>, year: number): number {
  if (year <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    if (year <= curve[i][0]) {
      const [y0, v0] = curve[i - 1];
      const [y1, v1] = curve[i];
      return v0 + ((year - y0) / (y1 - y0)) * (v1 - v0);
    }
  }
  return curve[curve.length - 1][1];
}

export function basePrice(good: Good, year: number): number {
  return interp(good === 'steel' ? STEEL_CURVE : CHIP_CURVE, year);
}

/** Price impact per unit traded (fades by ~25% per year). */
export const PRICE_IMPACT = 0.0006;

export const GOOD_INFO: Record<Good, { name: string; icon: string; color: string; unit: string }> = {
  steel: { name: 'Steel', icon: '⛓', color: '#B8BBC8', unit: 'kt' },
  chips: { name: 'Chips', icon: '◆', color: '#67E8F9', unit: 'M' },
};
