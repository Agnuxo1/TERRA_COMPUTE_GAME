// National policies ("decrees"). A limited number of slots forces real choices:
// every policy has a clear benefit and a clear price, and some exclude each other.

export interface PolicyDef {
  id: string;
  name: string;
  icon: string;
  pro: string;
  con: string;
  requiresTech?: string;
  excludes?: string[];
  /** One-line flavour shown under the name. */
  motto: string;
}

export const POLICIES: PolicyDef[] = [
  { id: 'five_year_plan', name: 'Five-Year Plan', icon: '☭', motto: 'Steel for the motherland.',
    pro: 'Kombinat steel +35%', con: 'Approval −4', excludes: ['free_market'] },
  { id: 'free_market', name: 'Free Market', icon: '$', motto: 'Let prices decide.',
    pro: 'GDP +12%', con: 'Steel −10% · approval −2', excludes: ['five_year_plan'] },
  { id: 'welfare', name: 'Welfare State', icon: '✚', motto: 'Nobody left behind.',
    pro: 'Approval +8 · healthier growth', con: 'Costs 1.5% of GDP per year', excludes: ['austerity'] },
  { id: 'austerity', name: 'Austerity', icon: '✂', motto: 'Balance the books.',
    pro: 'Building upkeep −15%', con: 'Approval −8', excludes: ['welfare'] },
  { id: 'mass_housing', name: 'Mass Housing', icon: '🏘', motto: 'A flat for every family.',
    pro: 'Housing & hospitals −40% cost · homes +15% capacity', con: 'Costs 0.5% of GDP per year' },
  { id: 'education_drive', name: 'Education Drive', icon: '✎', motto: 'Knowledge is power.',
    pro: 'Education grows 50% faster · schools & universities −25% cost', con: 'Costs 1% of GDP per year' },
  { id: 'autarky', name: 'Autarky', icon: '⛓', motto: 'We need nobody.',
    pro: 'Own steel & chips +25% · approval +3', con: 'No imports: shortages are not covered by the market', excludes: ['open_trade'] },
  { id: 'open_trade', name: 'Open Trade', icon: '⚓', motto: 'Wealth flows through open doors.',
    pro: 'Market spread −10 points · trade treaties +50%', con: 'Approval −2 · own steel −10%', excludes: ['autarky'] },
  { id: 'green_deal', name: 'Green Deal', icon: '☘', motto: 'A planet to inherit.', requiresTech: 'envprot',
    pro: 'Emissions −30% · solar & nuclear −25% cost', con: 'GDP −5%' },
  { id: 'space_race', name: 'Space Race', icon: '🚀', motto: 'First to the stars.', requiresTech: 'space',
    pro: 'Research +10% · Space Centers −30% cost · covert ops +10%', con: 'Costs 1% of GDP per year' },
  { id: 'security_state', name: 'Security State', icon: '👁', motto: 'Trust, but verify.', requiresTech: 'cybernetics',
    pro: 'Enemy operations −50% · your covert ops +15%', con: 'Approval −5' },
  { id: 'propaganda', name: 'Ministry of Truth', icon: '📻', motto: 'The people are happy.',
    pro: 'Approval +7', con: 'Research −5% · relations −1/yr with everyone' },
  { id: 'manhattan_ai', name: 'Manhattan Project for AI', icon: '☢', motto: 'Whoever builds it first, wins.', requiresTech: 'dl',
    pro: 'Compute +35% · research +15%', con: 'Alignment pressure +50%', excludes: ['safety_first'] },
  { id: 'safety_first', name: 'Safety First', icon: '🛡', motto: 'Slow is smooth, smooth is fast.', requiresTech: 'alignment',
    pro: 'Alignment gain +60%', con: 'Compute −10%', excludes: ['manhattan_ai'] },
];

export const policyById: Record<string, PolicyDef> = Object.fromEntries(POLICIES.map(p => [p.id, p]));

/** Policy slots grow with the era you have reached (by year). */
export function policySlots(year: number): number {
  return year < 1971 ? 1 : year < 1990 ? 2 : year < 2012 ? 3 : 4;
}

/** Years before you may change policies again after a change. */
export const POLICY_COOLDOWN = 2;

/** Yearly cost of policies as a share of GDP. */
export const POLICY_GDP_COST: Record<string, number> = {
  welfare: 0.015, mass_housing: 0.005, education_drive: 0.01, space_race: 0.01,
};
