/**
 * AGI/ASI Trajectory Simulation Engine
 * Calibrated to match Epoch AI historical training compute data.
 */

export interface SimulationParams {
  f_chips: number; f_dc: number; f_rd: number; f_energy: number;
  g_invest: number; g_hw: number; g_algo: number; g_compute_raw: number;
  max_energy: number; max_spend: number; data_wall_year: number;
  tsmc_constraint: number; utilization_factor: number;
}

export const scenarios = {
  baseline: { name: 'Baseline', title: 'Status Quo', subtitle: 'Current trends continue', color: '#00F0FF', params: { f_chips: 0.35, f_dc: 0.30, f_rd: 0.25, f_energy: 0.10, g_invest: 0.20, g_hw: 0.55, g_algo: 1.26, g_compute_raw: 1.45, max_energy: 945, max_spend: 500, data_wall_year: 2026, tsmc_constraint: 0.95, utilization_factor: 0.6 } },
  accelerated: { name: 'Accelerated', title: 'Massive Surge', subtitle: 'Hyperscaler 2x CAPEX', color: '#00E5A0', params: { f_chips: 0.30, f_dc: 0.25, f_rd: 0.35, f_energy: 0.10, g_invest: 0.35, g_hw: 0.65, g_algo: 1.80, g_compute_raw: 2.00, max_energy: 1500, max_spend: 1000, data_wall_year: 2028, tsmc_constraint: 1.0, utilization_factor: 0.7 } },
  constrained: { name: 'Constrained', title: 'Hard Limits', subtitle: 'Strict energy & regulation', color: '#FFB84D', params: { f_chips: 0.40, f_dc: 0.30, f_rd: 0.15, f_energy: 0.15, g_invest: 0.10, g_hw: 0.40, g_algo: 0.80, g_compute_raw: 1.00, max_energy: 500, max_spend: 200, data_wall_year: 2026, tsmc_constraint: 0.70, utilization_factor: 0.5 } },
  counterfactual: { name: 'Counterfactual', title: 'Early R&D Boost', subtitle: 'Redirect 50% to research', color: '#7B61FF', params: { f_chips: 0.35, f_dc: 0.30, f_rd: 0.30, f_energy: 0.05, g_invest: 0.25, g_hw: 0.60, g_algo: 2.00, g_compute_raw: 1.60, max_energy: 800, max_spend: 400, data_wall_year: 2027, tsmc_constraint: 0.95, utilization_factor: 0.6 } },
};
export type ScenarioKey = keyof typeof scenarios;

export interface YearlyData { year: number; compute: number; effectiveCompute: number; cumulativeTrainingFLOPs: number; capability: number; totalInvestment: number; investChips: number; investDC: number; investRD: number; investEnergy: number; energyTWh: number; algoEfficiency: number; dataFactor: number; energyConstraint: number; gpuPower: number; pricePerFlop: number; }
export interface SimulationResult { yearly: YearlyData[]; agiYear: number | null; asiYear: number | null; agiProbability: number; maxCapability: number; maxCapabilityYear: number; }

export const log10 = (x: number): number => Math.log10(x);
export function formatFLOPs(flops: number): string { if (flops >= 1e27) return `${(flops / 1e27).toFixed(1)}e27`; if (flops >= 1e24) return `${(flops / 1e24).toFixed(1)}e24`; if (flops >= 1e21) return `${(flops / 1e21).toFixed(1)}e21`; if (flops >= 1e18) return `${(flops / 1e18).toFixed(1)}e18`; if (flops >= 1e15) return `${(flops / 1e15).toFixed(1)}e15`; if (flops >= 1e12) return `${(flops / 1e12).toFixed(1)}e12`; return flops.toExponential(1); }
export function formatYear(year: number): string { return year.toString(); }
export function formatCompact(n: number): string { if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`; if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`; if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`; return n.toFixed(1); }
export function formatCapability(cap: number): string { return `${(cap * 100).toFixed(1)}%`; }
export function getProbabilityColor(prob: number): string { if (prob < 30) return '#FF477E'; if (prob < 60) return '#FFB84D'; return '#00E5A0'; }
export function getCapabilityDescription(cap: number): string { if (cap < 0.10) return 'Narrow AI'; if (cap < 0.25) return 'Emerging Capabilities'; if (cap < 0.45) return 'Advanced AI'; if (cap < 0.60) return 'Near-AGI'; if (cap < 0.75) return 'AGI Threshold'; if (cap < 0.90) return 'Competent AGI'; if (cap < 0.97) return 'Expert AGI / ASI Threshold'; return 'Superhuman ASI'; }

export const defaultParams: SimulationParams = { f_chips: 0.35, f_dc: 0.30, f_rd: 0.25, f_energy: 0.10, g_invest: 0.20, g_hw: 0.55, g_algo: 1.26, g_compute_raw: 1.45, max_energy: 945, max_spend: 500, data_wall_year: 2026, tsmc_constraint: 0.95, utilization_factor: 0.6 };

export const historicalPoints = [
  { year: 2019, model: 'GPT-2', cumulativeFLOPs: 1.5e21, capability: 0.06 },
  { year: 2020, model: 'GPT-3', cumulativeFLOPs: 1e23, capability: 0.22 },
  { year: 2022, model: 'Chinchilla', cumulativeFLOPs: 5e24, capability: 0.38 },
  { year: 2023, model: 'GPT-4', cumulativeFLOPs: 2e25, capability: 0.48 },
  { year: 2025, model: 'Grok-3', cumulativeFLOPs: 4e26, capability: 0.58 },
];

/** Core simulation engine. */
export function runSimulation(params: SimulationParams): SimulationResult {
  const START = 2018, END = 2050, N = END - START + 1;
  let hwComp = 1e17, algo = 1.0, inv = 50, cumT = 1e21, price = 1e-15;
  const caps: number[] = [];
  const out: YearlyData[] = [];

  for (let i = 0; i < N; i++) {
    const yr = START + i, dt = yr - 2018;

    let fb = 1.0;
    if (i >= 2) { const c1 = caps[i-1]??0, c0 = caps[i-2]??0; fb = 1+0.02*((c1-c0)/Math.max(c0,0.001)); fb = Math.max(0.96,Math.min(1.04,fb)); }
    inv = inv*(1+params.g_invest)*fb;
    inv = Math.min(inv, params.max_spend);

    const Ic = params.f_chips*inv*params.tsmc_constraint;
    const Id = params.f_dc*inv, Ir = params.f_rd*inv, Ie = params.f_energy*inv;

    price *= Math.exp(-params.g_hw*0.35);

    // Strong compute growth to match ~4-7x/year historical training compute growth
    const hwMult = Math.exp(params.g_compute_raw*0.75 + params.g_hw*0.18);
    const chipAdd = (Ic/1000)*8e15*price*Math.exp(0.40*dt);
    hwComp = hwComp*hwMult + chipAdd;

    // Algorithmic efficiency
    algo *= 1 + params.g_algo*0.06/(1+0.005*Math.max(0,algo-1));

    const df = yr<=params.data_wall_year ? 1.0 : Math.max(0.3, 1-0.05*(yr-params.data_wall_year));

    const gpuP = 300*Math.exp(0.30*dt);
    const fpuw = Math.exp(params.g_hw*0.60*dt);
    const watts = hwComp/Math.max(1e12*fpuw, 1e9);
    const eTWh = watts*0.6*8760/1e9;
    const ec = eTWh<=params.max_energy ? 1.0 : Math.max(0.12, params.max_energy/eTWh);

    const eff = hwComp*algo*df*ec*params.utilization_factor;

    // Training fraction: increases over time as models get bigger
    const trainFrac = 0.002 + dt*0.0004;
    cumT += eff*Math.min(trainFrac,0.04)*(365*24*3600);

    // Capability: sigmoid calibrated at 1e23→0.25, 2e25→0.50, 4e26→0.60
    const logDiff = Math.max(0, log10(Math.max(cumT,1))-21);
    const cap = Math.min(0.999, Math.max(0, 1-1/(1+0.073*Math.pow(logDiff,1.75))));
    caps.push(cap);

    out.push({year:yr, compute:hwComp, effectiveCompute:eff, cumulativeTrainingFLOPs:cumT, capability:cap, totalInvestment:inv, investChips:Ic, investDC:Id, investRD:Ir, investEnergy:Ie, energyTWh:eTWh, algoEfficiency:algo, dataFactor:df, energyConstraint:ec, gpuPower:gpuP, pricePerFlop:price});
  }

  let ag:number|null=null, as:number|null=null, mx=0, mxy=START;
  for (const d of out) { if (d.capability>=0.7 && ag===null) ag=d.year; if (d.capability>=0.95 && as===null) as=d.year; if (d.capability>mx){mx=d.capability;mxy=d.year;} }
  const last=out[out.length-1];
  const ap=last.capability>=0.7?95:last.capability>=0.5?60+last.capability*40:last.capability*100;
  return {yearly:out, agiYear:ag, asiYear:as, agiProbability:Math.round(Math.min(ap,99)), maxCapability:mx, maxCapabilityYear:mxy};
}
