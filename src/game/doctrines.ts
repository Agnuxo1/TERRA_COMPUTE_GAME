// Doctrines: four one-time forks in the AI race. Each is offered as a decision when its year arrives.
// The choice is stored in state.doctrines[id] ('a' | 'b') and read by the engine through doctrine(s, id).
// Texts are English source strings; the UI and the event log translate them with t() at render time.

export type DoctrineId = 'research_model' | 'compute_arch' | 'model_policy' | 'safety_path';

export interface DoctrineOption {
  label: string;
  detail: string;
}

export interface DoctrineDef {
  id: DoctrineId;
  year: number;
  name: string;        // event title
  short: string;       // row label in the overview
  description: string;
  a: DoctrineOption;
  b: DoctrineOption;
}

export const DOCTRINES: DoctrineDef[] = [
  {
    id: 'research_model', year: 1970, name: 'Doctrine: Research model', short: 'Research model',
    description: 'Should the country publish its AI research openly, or keep it in secret labs?',
    a: { label: 'Open science', detail: 'Research +8%. Rival spies find our work easier to steal: their theft chance +15%.' },
    b: { label: 'Secret labs', detail: 'Research −5%. Rival spies find our work much harder to steal: their theft chance −30%.' },
  },
  {
    id: 'compute_arch', year: 1995, name: 'Doctrine: Compute architecture', short: 'Compute architecture',
    description: 'Concentrate compute in a few giant sites, or spread it across the country?',
    a: { label: 'Centralised', detail: 'AI Gigafactory and Data Center cost −8%. Sabotage against us hits 2 buildings.' },
    b: { label: 'Distributed', detail: 'Compute buildings cost +4%. Sabotage never hits more than 1 building, and repairs take half the time.' },
  },
  {
    id: 'model_policy', year: 2012, name: 'Doctrine: Model release policy', short: 'Model release',
    description: 'Release frontier models with open weights, or keep them closed?',
    a: { label: 'Open weights', detail: 'Immediate research windfall. Every rival catches up about 10 months. Relations +10. World tension −5.' },
    b: { label: 'Closed weights', detail: 'All rivals lag 0.3 years more. World tension +5.' },
  },
  {
    id: 'safety_path', year: 2020, name: 'Doctrine: Safety path', short: 'Safety path',
    description: 'Invest in interpretability research, or accept strict containment?',
    a: { label: 'Interpretability', detail: 'Alignment ceiling +10. Alignment +1 per year. Compute −10%.' },
    b: { label: 'Containment', detail: 'Compute +10%. AI incidents twice as likely.' },
  },
];

export const doctrineById: Record<DoctrineId, DoctrineDef> = Object.fromEntries(DOCTRINES.map(d => [d.id, d])) as Record<DoctrineId, DoctrineDef>;
