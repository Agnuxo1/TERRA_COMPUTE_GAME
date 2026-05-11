import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import ScenarioSelector from '@/components/ScenarioSelector';
import MetricCards from '@/components/MetricCards';
import SimulationControls from '@/components/SimulationControls';
import TabPanel from '@/components/TabPanel';
import { runSimulation, defaultParams } from '@/lib/simulation';
import type { SimulationParams, ScenarioKey, SimulationResult } from '@/lib/simulation';

/* ─── Typing Animation Hook ──────────────────────────────────────────────── */
function useTypingEffect(text: string, speed: number = 30, startDelay: number = 500) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let idx = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        idx++;
        if (idx <= text.length) {
          setDisplayed(text.slice(0, idx));
        } else {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timer);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

/* ─── Data Ticker ────────────────────────────────────────────────────────── */
const tickerItems = [
  'NVIDIA H100: 700W TDP',
  'Hyperscaler CAPEX 2025: $390B',
  'AI Training Compute: 4.2x/year',
  'TSMC Revenue: $122B+',
  'Data Center Energy 2024: 415 TWh',
  'Pre-training Efficiency: 3x/year',
  'Semiconductor Market: $795.6B',
  'AI Accelerator Market: $120.2B',
];

function DataTicker() {
  return (
    <div className="w-full overflow-hidden border-t border-border bg-surface" style={{ height: 40 }}>
      <div className="marquee-track flex h-full items-center whitespace-nowrap">
        {[...tickerItems, ...tickerItems].map((item, i) => (
          <span key={i} className="data-text flex items-center gap-4 px-4 text-[11px] text-text-secondary">
            <span>{item}</span>
            <span className="text-text-tertiary">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Hero Section ───────────────────────────────────────────────────────── */
function HeroSection({ result }: { result: SimulationResult }) {
  const title = 'AGI/ASI Trajectory Simulation';
  const { displayed, done } = useTypingEffect(title, 30, 500);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const _currentData = useMemo(() => {
    return result.yearly.find(d => d.year === currentYear) ?? result.yearly[result.yearly.length - 1];
  }, [result, currentYear]);
  void _currentData;

  return (
    <section className="relative overflow-hidden px-4 pb-8 pt-12 lg:px-8">
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: 'url(/neural-mesh-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,240,255,0.03) 0%, transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-[1440px]">
        {/* Typing title */}
        <h1
          className="font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl lg:text-[56px]"
          style={{ letterSpacing: '-0.03em', lineHeight: 1.05 }}
        >
          {displayed}
          {!done && <span className="blink-cursor text-accent-cyan">|</span>}
        </h1>

        {/* Subtitle fades in after typing */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: done ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="mt-4 max-w-[680px] text-[15px] leading-relaxed text-text-secondary"
        >
          An interactive model projecting the path to AGI and ASI based on real-world economic
          investment, hardware scaling laws, algorithmic efficiency, and energy constraints.
        </motion.p>

        {/* Key metrics row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: done ? 1 : 0, y: done ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 flex flex-wrap gap-4"
        >
          <div className="card min-w-[140px]">
            <div className="label-text mb-1">Est. AGI Year</div>
            <div className="data-large text-accent-cyan">
              {result.agiYear ?? '>2050'}
            </div>
            <div className="mt-1 text-[11px] text-text-tertiary">50% confidence</div>
          </div>
          <div className="card min-w-[140px]">
            <div className="label-text mb-1">Compute Growth</div>
            <div className="data-large text-accent-green">
              {(1 + defaultParams.g_compute_raw).toFixed(1)}x
            </div>
            <div className="mt-1 text-[11px] text-text-tertiary">/ year</div>
          </div>
          <div className="card min-w-[140px]">
            <div className="label-text mb-1">Efficiency Gain</div>
            <div className="data-large text-accent-purple">
              {(1 + defaultParams.g_algo).toFixed(1)}x
            </div>
            <div className="mt-1 text-[11px] text-text-tertiary">/ year</div>
          </div>
          <div className="card min-w-[140px]">
            <div className="label-text mb-1">Energy Ceiling</div>
            <div className="data-large text-accent-amber">
              {defaultParams.max_energy}
            </div>
            <div className="mt-1 text-[11px] text-text-tertiary">TWh 2030</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Main Dashboard Page ────────────────────────────────────────────────── */
export default function Home() {
  const [params, setParams] = useState<SimulationParams>({ ...defaultParams });
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey | null>('baseline');

  /* Run simulation whenever params change */
  const result: SimulationResult = useMemo(() => {
    return runSimulation(params);
  }, [params]);

  const handleScenarioSelect = useCallback((key: ScenarioKey, scenarioParams: SimulationParams) => {
    setSelectedScenario(key);
    setParams({ ...scenarioParams });
  }, []);

  const handleParamsChange = useCallback((newParams: SimulationParams) => {
    setSelectedScenario(null); // clear scenario selection when user tweaks
    setParams(newParams);
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <HeroSection result={result} />

      {/* Scenario Selector */}
      <section className="px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <ScenarioSelector selected={selectedScenario} onSelect={handleScenarioSelect} />
        </div>
      </section>

      {/* Metric Cards */}
      <section className="px-4 pb-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <MetricCards result={result} />
        </div>
      </section>

      {/* Data Ticker */}
      <DataTicker />

      {/* Main Workspace: Controls + Charts */}
      <section className="px-4 py-8 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 lg:flex-row">
          {/* Left: Controls Panel */}
          <div className="w-full shrink-0 lg:w-[320px]">
            <SimulationControls params={params} onChange={handleParamsChange} />
          </div>

          {/* Right: Tab Panel */}
          <div className="min-w-0 flex-1">
            <TabPanel
              data={result.yearly}
              agiYear={result.agiYear}
              asiYear={result.asiYear}
              maxEnergy={params.max_energy}
            />
          </div>
        </div>
      </section>
    </Layout>
  );
}
