import { useState, type ReactNode } from 'react';
import { useGame } from '../../App';
import { play } from '../../hooks/useSound';
import { alignmentCap, requiredAlignment } from '../../game/engine';
import { ERA_NAMES, techById } from '../../game/data';
import { capabilityLabel, fmtFlops, fmtMoney, fmtPop, fmtSigned } from '../../game/format';

function clampPercent(v: number) { return Math.max(0, Math.min(100, v)); }
function gaugeColor(p: number) { return p >= 75 ? '#00E5A0' : p >= 45 ? '#FFB84D' : '#FF477E'; }

interface GaugeDef {
  label: string;
  value: string;
  sub?: string;
  percent: number;
  color: string;
  pulse?: boolean;
  detail: ReactNode;
}

function Gauge({ g, open, onOpen }: { g: GaugeDef; open: boolean; onOpen: (v: boolean) => void }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={`hud-gauge ${g.pulse ? 'hud-gauge-alert' : ''}`}
      style={{ ['--gauge-color' as string]: g.color }}
      onMouseEnter={() => onOpen(true)}
      onMouseLeave={() => onOpen(false)}
      onClick={() => onOpen(!open)}
    >
      <svg className="hud-gauge-svg" viewBox="0 0 88 88" aria-hidden="true">
        <circle className="hud-gauge-track" cx="44" cy="44" r={r} />
        <circle className="hud-gauge-progress" cx="44" cy="44" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - clampPercent(g.percent) / 100)} />
        <circle className="hud-gauge-inner" cx="44" cy="44" r="25" />
      </svg>
      <div className="hud-gauge-readout">
        <span className="hud-gauge-label">{g.label}</span>
        <strong className="hud-gauge-value">{g.value}</strong>
        {g.sub && <span className="hud-gauge-sub">{g.sub}</span>}
      </div>
      {open && (
        <div className="hud-detail animate-fade-up">
          <div className="font-mono-data text-[10px] tracking-widest mb-1" style={{ color: g.color }}>{g.label}</div>
          {g.detail}
        </div>
      )}
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: 'good' | 'bad' | 'dim' }) {
  const color = tone === 'good' ? 'var(--green)' : tone === 'bad' ? 'var(--rose)' : tone === 'dim' ? 'var(--text-tertiary)' : 'var(--text-primary)';
  return (
    <div className="flex justify-between gap-3 font-mono-data text-[10px] leading-[1.45]">
      <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
      <span style={{ color }}>{v}</span>
    </div>
  );
}
function Tip({ children }: { children: ReactNode }) {
  return <div className="font-rajdhani text-[12px] mt-1.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>{children}</div>;
}

export default function ResourceBar() {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const e = state.eco;
  const year = Math.floor(state.year);
  const era = state.year < 1971 ? 1 : state.year < 1983 ? 2 : state.year < 2006 ? 3 : state.year < 2023 ? 4 : 5;
  const fr = e.foodSupply / Math.max(1, e.foodDemand);
  const hr = e.housingCap / Math.max(1, state.population);
  const er = e.energySupply / Math.max(1, e.energyDemand);
  const req = requiredAlignment(state);
  const research = state.researching ? techById[state.researching] : null;

  const gauges: GaugeDef[] = [
    {
      label: 'YEAR', value: String(year), sub: ERA_NAMES[era].toUpperCase(), percent: ((state.year - 1960) / 80) * 100,
      color: state.year < 2020 ? '#00F0FF' : state.year < 2030 ? '#FFB84D' : '#FF477E', pulse: state.year >= 2030,
      detail: <><Row k="Era" v={ERA_NAMES[era]} /><Row k="Hard deadline" v="2040" /><Tip>Each year lasts 15 seconds at 1×. Rivals typically reach superintelligence in the early 2030s.</Tip></>,
    },
    {
      label: 'BUDGET', value: fmtMoney(state.budget), sub: `${fmtSigned(e.netBudget)}/yr`, percent: clampPercent(50 + e.netBudget / Math.max(1, e.income) * 100),
      color: state.budget < 0 ? '#FF477E' : e.netBudget >= 0 ? '#00E5A0' : '#FFB84D', pulse: state.budget < 0,
      detail: (
        <>
          <Row k="GDP" v={`${fmtMoney(e.gdp)}/yr`} />
          <Row k={`Taxes (${Math.round(state.taxRate * 100)}%)`} v={`+${fmtMoney(e.gdp * state.taxRate)}`} tone="good" />
          <Row k="Trade treaties" v={`+${fmtMoney(e.income - e.gdp * state.taxRate)}`} tone="good" />
          <Row k="Building upkeep" v={`-${fmtMoney(e.upkeep)}`} tone="bad" />
          <Row k="Net per year" v={`${fmtSigned(e.netBudget)}B`} tone={e.netBudget >= 0 ? 'good' : 'bad'} />
          <div className="mt-2 font-mono-data text-[10px]" style={{ color: 'var(--text-secondary)' }}>TAX RATE {Math.round(state.taxRate * 100)}%</div>
          <input type="range" min={10} max={40} step={1} value={Math.round(state.taxRate * 100)}
            onChange={ev => dispatch({ type: 'SET_TAX', rate: Number(ev.target.value) / 100 })}
            className="w-full accent-[#00E5A0]" />
          <Tip>Higher taxes fund more buildings but cost approval (−1 per point above 20%).</Tip>
        </>
      ),
    },
    {
      label: 'POP', value: fmtPop(state.population), sub: `${Math.round(e.workers)}M workers`, percent: clampPercent(hr * 60),
      color: '#8BE9FD',
      detail: <><Row k="Population" v={fmtPop(state.population)} /><Row k="Working age" v={`${e.workers.toFixed(0)}M`} /><Tip>Grows when food and housing are sufficient. Education slows growth (demographic transition).</Tip></>,
    },
    {
      label: 'FOOD', value: `${Math.round(fr * 100)}%`, sub: fr >= 1 ? 'fed' : 'HUNGER', percent: clampPercent(fr * 80),
      color: fr >= 1.05 ? '#00E5A0' : fr >= 1 ? '#FFB84D' : '#FF477E', pulse: fr < 1,
      detail: <><Row k="Supply" v={`${e.foodSupply.toFixed(0)}M fed`} /><Row k="Demand" v={`${e.foodDemand.toFixed(0)}M people`} /><Tip>Below 100%: population shrinks and approval collapses. Farms love river valleys (+50%).</Tip></>,
    },
    {
      label: 'HOUSING', value: `${Math.round(hr * 100)}%`, sub: hr >= 1 ? 'capacity' : 'CROWDED', percent: clampPercent(hr * 80),
      color: hr >= 1.04 ? '#00E5A0' : hr >= 1 ? '#FFB84D' : '#FF477E', pulse: hr < 1,
      detail: <><Row k="Capacity" v={`${e.housingCap.toFixed(0)}M`} /><Row k="Population" v={`${state.population.toFixed(0)}M`} /><Row k="Neighbourhood comfort" v={e.comfort.toFixed(1)} tone={e.comfort >= 0 ? 'good' : 'bad'} /><Tip>No room = no growth. Housing next to schools, hospitals and markets is happier; next to smoke it is miserable.</Tip></>,
    },
    {
      label: 'JOBS', value: `${Math.round(e.unemployment * 100)}%`, sub: e.staffing < 0.98 ? `staff ${Math.round(e.staffing * 100)}%` : 'unemployed',
      percent: clampPercent(100 - e.unemployment * 300), color: gaugeColor(100 - e.unemployment * 400 - (1 - e.staffing) * 200), pulse: e.unemployment > 0.12,
      detail: <><Row k="Jobs" v={`${e.jobs.toFixed(0)}M`} /><Row k="Workers" v={`${e.workers.toFixed(0)}M`} /><Row k="Unemployment" v={`${(e.unemployment * 100).toFixed(1)}%`} tone={e.unemployment > 0.08 ? 'bad' : 'good'} /><Row k="Staffing" v={`${(e.staffing * 100).toFixed(0)}%`} tone={e.staffing < 0.95 ? 'bad' : 'good'} /><Tip>Unemployment angers people; a labour shortage slows every building. Kombinats and markets create jobs, robots fill shortages.</Tip></>,
    },
    {
      label: 'POWER', value: `${Math.round(er * 100)}%`, sub: `${Math.round(e.energySupply)} GW`, percent: clampPercent(er * 75),
      color: er >= 1.1 ? '#00E5A0' : er >= 1 ? '#FFB84D' : '#FF477E', pulse: er < 1,
      detail: <><Row k="Supply" v={`${e.energySupply.toFixed(0)} GW`} /><Row k="Demand" v={`${e.energyDemand.toFixed(0)} GW`} /><Row k="Your emissions" v={`${e.emissions.toFixed(0)} Mt/yr`} tone={e.emissions > 200 ? 'bad' : 'dim'} /><Tip>Below 100% there are blackouts: research, compute and GDP all drop. Old pre-1960 plants slowly retire.</Tip></>,
    },
    {
      label: 'EDU', value: `${Math.round(state.education)}`, sub: `→ ${Math.round(e.eduTarget)}`, percent: state.education, color: '#FFB84D',
      detail: <><Row k="Education" v={state.education.toFixed(1)} /><Row k="Target (schools/unis)" v={e.eduTarget.toFixed(0)} /><Tip>Education multiplies GDP and research. Schools lift it to ~70, universities beyond. It changes slowly.</Tip></>,
    },
    {
      label: 'RESEARCH', value: `${Math.round(e.researchRate)}`, sub: research ? research.name : 'IDLE — pick tech', percent: clampPercent(Math.log10(e.researchRate + 1) * 25),
      color: research ? '#A78BFA' : '#FF477E', pulse: !research,
      detail: <><Row k="Research / year" v={e.researchRate.toFixed(0)} /><Row k="Stored points" v={state.researchPoints.toFixed(0)} /><Row k="Current" v={research ? research.name : 'none'} tone={research ? undefined : 'bad'} /><Tip>Press [T] to choose research. Institutes and universities produce it; after Deep Learning, compute does too.</Tip></>,
    },
    {
      label: 'COMPUTE', value: capabilityLabel(state.capability), sub: fmtFlops(state.compute), percent: clampPercent(((state.capability - 6) / 18) * 100), color: '#00F0FF',
      detail: <><Row k="Effective" v={fmtFlops(state.compute)} /><Row k="Hardware" v={fmtFlops(e.computeRaw)} /><Row k="Tech multiplier" v={`×${e.computeMult.toFixed(1)}`} /><Row k="Goal" v="1 YottaFLOP (10²⁴)" /><Tip>Superintelligence needs 1 YottaFLOP plus the Superintelligence Theory tech.</Tip></>,
    },
    {
      label: 'APPROVAL', value: `${Math.round(state.approval)}%`, sub: `→ ${Math.round(e.approvalTarget)}`, percent: state.approval,
      color: gaugeColor(state.approval), pulse: state.approval < 35,
      detail: (
        <>
          {e.approvalFactors.map(f => <Row key={f.label} k={f.label} v={fmtSigned(f.value, 0)} tone={f.value > 0.5 ? 'good' : f.value < -0.5 ? 'bad' : 'dim'} />)}
          <Tip>Below 35%: unrest (slower building, −15% GDP). Below 20% for 3 years: revolution.</Tip>
        </>
      ),
    },
    {
      label: 'ALIGN', value: `${Math.round(state.alignment)}%`, sub: `need ${req}`, percent: state.alignment,
      color: state.alignment >= req ? '#00E5A0' : state.alignment >= 55 ? '#FFB84D' : '#FF477E', pulse: state.capability > 15 && state.alignment < 45,
      detail: <><Row k="Institutes" v={`+${e.alignmentGain.toFixed(1)}/yr`} tone="good" /><Row k="Capability pressure" v={`-${e.alignmentPressure.toFixed(1)}/yr`} tone="bad" /><Row k="Ceiling (safety science)" v={`${alignmentCap(state)}%`} /><Row k="Needed for safe ASI" v={`${req}%`} /><Tip>Stronger AI is harder to align. Safety Institutes raise alignment; Alignment Research, Interpretability and AGI raise the ceiling.</Tip></>,
    },
  ];

  const setSpeed = (spd: number) => { play('click'); dispatch({ type: 'SET_SPEED', speed: spd }); };

  return (
    <>
      <style>{HUD_CSS}</style>
      <header className="hud-strip" aria-label="Strategic indicators">
        {gauges.map(g => <Gauge key={g.label} g={g} open={open === g.label} onOpen={v => setOpen(v ? g.label : null)} />)}
        <div className="hud-speed-dock" aria-label="Time controls">
          <button onClick={() => { play('click'); dispatch({ type: 'TOGGLE_PAUSE' }); }} className="hud-speed-button"
            style={{ background: state.paused ? 'var(--amber-dim)' : 'var(--green-dim)', color: state.paused ? 'var(--amber)' : 'var(--green)', border: `1px solid ${state.paused ? 'var(--amber)' : 'var(--green)'}` }}>
            {state.paused ? '▶' : 'II'}
          </button>
          {[1, 2, 3].map(spd => (
            <button key={spd} onClick={() => setSpeed(spd)} className="hud-speed-button"
              style={{
                background: state.speed === spd && !state.paused ? 'var(--cyan)' : 'rgba(255,255,255,0.03)',
                color: state.speed === spd && !state.paused ? '#001014' : 'var(--text-secondary)',
                border: `1px solid ${state.speed === spd ? 'var(--cyan)' : 'rgba(255,255,255,0.12)'}`,
              }}>
              {spd}x
            </button>
          ))}
        </div>
      </header>
    </>
  );
}

const HUD_CSS = `
@keyframes hudPulse {
  0%, 100% { filter: drop-shadow(0 0 4px color-mix(in srgb, var(--gauge-color), transparent 45%)); }
  50% { filter: drop-shadow(0 0 12px var(--gauge-color)); }
}
.hud-strip {
  position: relative; z-index: 45; display: flex; align-items: center; gap: 4px; padding: 4px 8px;
  min-height: 84px; overflow-x: auto; overflow-y: visible; scrollbar-width: none;
  background: linear-gradient(180deg, rgba(5,9,13,0.98), rgba(10,12,18,0.96));
  border-bottom: 1px solid var(--border);
}
.hud-strip::-webkit-scrollbar { display: none; }
.hud-gauge { position: relative; width: 78px; height: 78px; flex: 0 0 78px; display: grid; place-items: center; border-radius: 50%; cursor: help; }
.hud-gauge::before {
  content: ""; position: absolute; inset: 5px; border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(4,12,18,0.7) 0 48%, rgba(4,12,18,0.28) 49% 100%),
    conic-gradient(from 220deg, color-mix(in srgb, var(--gauge-color), transparent 64%), rgba(255,255,255,0.04), color-mix(in srgb, var(--gauge-color), transparent 78%));
  box-shadow: inset 0 0 18px rgba(0,0,0,0.72), 0 0 14px rgba(0,0,0,0.35);
}
.hud-gauge-svg { position: absolute; inset: 3px; width: 72px; height: 72px; transform: rotate(-90deg); }
.hud-gauge-track { fill: none; stroke: rgba(255,255,255,0.10); stroke-width: 7; }
.hud-gauge-progress { fill: none; stroke: var(--gauge-color); stroke-width: 7; stroke-linecap: round; transition: stroke-dashoffset 260ms ease, stroke 260ms ease; filter: drop-shadow(0 0 5px var(--gauge-color)); }
.hud-gauge-inner { fill: rgba(8,13,18,0.45); stroke: rgba(255,255,255,0.08); stroke-width: 1; }
.hud-gauge-readout { position: relative; z-index: 1; width: 60px; display: flex; flex-direction: column; align-items: center; text-align: center; line-height: 1.05; }
.hud-gauge-label { font-family: 'Share Tech Mono', monospace; font-size: 7.5px; color: rgba(226,240,246,0.62); letter-spacing: 0.08em; }
.hud-gauge-value { max-width: 60px; margin-top: 1px; font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 14px; color: #fff; text-shadow: 0 0 8px var(--gauge-color), 0 1px 2px rgba(0,0,0,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hud-gauge-sub { max-width: 60px; margin-top: 1px; font-family: 'Share Tech Mono', monospace; font-size: 6.5px; color: color-mix(in srgb, var(--gauge-color), white 28%); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hud-gauge-alert .hud-gauge-progress { animation: hudPulse 1.25s infinite; }
.hud-detail {
  position: fixed; top: 88px; z-index: 200; width: 240px; padding: 10px 12px; border-radius: 8px; cursor: default;
  background: rgba(8,9,13,0.97); border: 1px solid color-mix(in srgb, var(--gauge-color), transparent 40%);
  box-shadow: 0 16px 40px rgba(0,0,0,0.7), 0 0 20px color-mix(in srgb, var(--gauge-color), transparent 80%);
  transform: translateX(-80px);
}
.hud-speed-dock { margin-left: auto; flex: 0 0 auto; display: grid; grid-template-columns: repeat(4, 34px); gap: 5px; padding: 8px 7px; border-radius: 18px; background: rgba(5,10,14,0.34); border: 1px solid rgba(255,255,255,0.08); }
.hud-speed-button { height: 30px; border-radius: 50%; font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 10px; transition: transform 140ms ease, filter 140ms ease; }
.hud-speed-button:hover { transform: translateY(-1px); filter: brightness(1.2); }
@media (max-width: 900px) {
  .hud-strip { min-height: 70px; }
  .hud-gauge { width: 64px; height: 64px; flex-basis: 64px; }
  .hud-gauge-svg { width: 58px; height: 58px; }
  .hud-gauge-value { font-size: 11px; }
  .hud-gauge-sub { display: none; }
  .hud-detail { top: 74px; }
}
`;
