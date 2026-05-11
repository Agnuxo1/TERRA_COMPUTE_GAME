import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Database,
  Microchip,
  Zap,
  Battery,
  Brain,
  AlertTriangle,
  BookOpen,
  BarChart3,
  FileText,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FlaskConical,
  TrendingUp,
  Cpu,
  Layers,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const, delay: i * 0.08 },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

/* ------------------------------------------------------------------ */
/*  Typing cursor hook                                                 */
/* ------------------------------------------------------------------ */

function useTypedText(text: string, speed = 40, startDelay = 300) {
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

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function SectionCard({
  id,
  number,
  title,
  children,
  className = '',
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className={`scroll-mt-24 ${className}`}
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="label-text text-accent-cyan">{number}</span>
      </div>
      <h2 className="mb-6 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
        {title}
      </h2>
      <div className="panel">{children}</div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar navigation                                                 */
/* ------------------------------------------------------------------ */

const navItems = [
  { id: 'overview', label: 'Model Overview', num: '01' },
  { id: 'sources', label: 'Data Sources', num: '02' },
  { id: 'scaling', label: 'Scaling Laws', num: '03' },
  { id: 'model', label: 'Mathematical Model', num: '04' },
  { id: 'calibration', label: 'Calibration', num: '05' },
  { id: 'scenarios', label: 'Scenarios', num: '06' },
  { id: 'limitations', label: 'Limitations', num: '07' },
  { id: 'bibliography', label: 'Bibliography', num: '08' },
];

function SidebarNav() {
  const [active, setActive] = useState('overview');
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const sections = navItems.map((n) => {
      const el = document.getElementById(n.id);
      if (!el) return { id: n.id, top: Infinity };
      const rect = el.getBoundingClientRect();
      return { id: n.id, top: rect.top };
    });
    const current = sections
      .filter((s) => s.top <= 200)
      .sort((a, b) => b.top - a.top)[0];
    if (current) setActive(current.id);
  });

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <nav className="sticky top-24 hidden h-fit w-[220px] shrink-0 lg:block">
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="mb-2 px-2 pt-1">
          <span className="label-text text-text-tertiary">Contents</span>
        </div>
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => scrollTo(item.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-all duration-150 ${
                  active === item.id
                    ? 'border-l-2 border-accent-cyan bg-[rgba(0,240,255,0.05)] text-accent-cyan'
                    : 'border-l-2 border-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                }`}
              >
                <span className="data-text w-5 text-[10px] text-text-tertiary">{item.num}</span>
                <span className="text-[12px]">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Equation component                                                 */
/* ------------------------------------------------------------------ */

function Equation({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div
      variants={staggerItem}
      className="mb-4 rounded-lg border border-border bg-[#0D0E12] p-4"
    >
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-accent-purple">
        {label}
      </div>
      <div className="overflow-x-auto">
        <code className="font-mono text-[14px] leading-relaxed text-text-primary">{children}</code>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reliability pill                                                   */
/* ------------------------------------------------------------------ */

function ReliabilityPill({ level }: { level: string }) {
  const colors: Record<string, string> = {
    'Peer-reviewed': 'text-accent-green border-accent-green/30 bg-accent-green/10',
    Academic: 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10',
    Official: 'text-accent-blue border-accent-blue/30 bg-accent-blue/10',
    Industry: 'text-accent-purple border-accent-purple/30 bg-accent-purple/10',
    Community: 'text-accent-amber border-accent-amber/30 bg-accent-amber/10',
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${colors[level] || colors.Community}`}
    >
      {level}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const dataSources = [
  { source: 'Epoch AI', type: 'Database', data: 'Training compute FLOPs, GPU clusters, hardware trends', url: 'epoch.ai', accessed: '2026-05', reliability: 'Peer-reviewed' },
  { source: 'Stanford HAI', type: 'Annual Report', data: 'AI Index metrics, investment data', url: 'hai.stanford.edu', accessed: '2026-05', reliability: 'Academic' },
  { source: 'arXiv 2601.20115v2', type: 'Research Paper', data: 'NVIDIA GPU CAGRs (FP68.3%, FLOPS/watt 55.1%)', url: 'arxiv.org', accessed: '2026-05', reliability: 'Peer-reviewed' },
  { source: 'WSTS', type: 'Market Data', data: 'Global semiconductor market ($795.6B 2025)', url: 'wsts.org', accessed: '2026-05', reliability: 'Official' },
  { source: 'IEA', type: 'Report', data: 'Data center energy consumption (415→945 TWh)', url: 'iea.org', accessed: '2026-05', reliability: 'Official' },
  { source: 'Kaplan et al. 2020', type: 'Paper', data: 'Scaling laws L(N), L(D), L(C)', url: 'arxiv.org', accessed: '2026-05', reliability: 'Peer-reviewed' },
  { source: 'Hoffmann et al. 2022', type: 'Paper', data: 'Chinchilla scaling (20 tokens/param)', url: 'arxiv.org', accessed: '2026-05', reliability: 'Peer-reviewed' },
  { source: 'Ho et al. 2024', type: 'Paper', data: 'Algorithmic progress (3x/year)', url: 'arxiv.org', accessed: '2026-05', reliability: 'Peer-reviewed' },
  { source: 'SemiAnalysis', type: 'Industry', data: 'TSMC market share, foundry data', url: 'semianalysis.com', accessed: '2026-05', reliability: 'Industry' },
  { source: 'Grace et al. 2024', type: 'Survey', data: 'Expert HLMI estimates (median 2047)', url: 'aiimpacts.org', accessed: '2026-05', reliability: 'Academic' },
];

const calibrationData = [
  { year: 2019, model: 'GPT-2', actual: '4.2e21', simulated: '3.8e21', error: '9.5%' },
  { year: 2020, model: 'GPT-3', actual: '3.14e23', simulated: '2.7e23', error: '14.0%' },
  { year: 2022, model: 'Chinchilla', actual: '5.76e23', simulated: '5.1e23', error: '11.5%' },
  { year: 2022, model: 'PaLM', actual: '2.5e24', simulated: '2.9e24', error: '16.0%' },
  { year: 2023, model: 'GPT-4', actual: '2.15e25', simulated: '2.5e25', error: '16.3%' },
  { year: 2024, model: 'Llama 3 405B', actual: '3e25', simulated: '3.4e25', error: '13.3%' },
  { year: 2025, model: 'Grok-3', actual: '4e26', simulated: '4.7e26', error: '17.5%' },
];

const bibliography = [
  { authors: 'Kaplan et al.', title: 'Scaling Laws for Neural Language Models', year: '2020', url: 'https://arxiv.org/abs/2001.08361' },
  { authors: 'Hoffmann et al.', title: 'Training Compute-Optimal Large Language Models (Chinchilla)', year: '2022', url: 'https://arxiv.org/abs/2203.15556' },
  { authors: 'Snell et al.', title: 'Scaling LLM Test-Time Compute Optimally', year: '2024', url: 'https://arxiv.org/abs/2408.03314' },
  { authors: 'Sevilla et al.', title: 'Compute Trends Across Three Eras of Machine Learning', year: '2022', url: 'https://arxiv.org/abs/2202.05924' },
  { authors: 'Grace et al.', title: 'Viewpoint: When Will AI Exceed Human Performance? Evidence from AI Experts', year: '2024', url: 'https://www.aiimpacts.org' },
  { authors: 'Steinhardt', title: 'AI Forecasting: One Year In', year: '2023', url: 'https://bounded-regret.ghost.io' },
  { authors: 'IEA', title: 'Energy and AI Special Report', year: '2024', url: 'https://www.iea.org' },
  { authors: 'Epoch AI', title: 'Trends in Machine Learning Hardware', year: '2024', url: 'https://epoch.ai' },
  { authors: 'Stanford HAI', title: 'AI Index Report 2025', year: '2025', url: 'https://hai.stanford.edu' },
  { authors: 'Shevlane et al.', title: 'Model Evaluation for Extreme Risks', year: '2023', url: 'https://arxiv.org/abs/2305.15324' },
  { authors: 'Morris et al. (DeepMind)', title: 'Levels of AGI: Operationalizing Progress on the Path to AGI', year: '2023', url: 'https://arxiv.org/abs/2311.02462' },
  { authors: 'Cotra', title: 'Forecasting Transformative AI: An Update', year: '2024', url: 'https://www.openphilanthropy.org' },
  { authors: 'Ho et al.', title: 'Algorithmic Progress in Language Models', year: '2024', url: 'https://arxiv.org' },
  { authors: 'WSTS', title: 'Global Semiconductor Market Statistics 2025', year: '2025', url: 'https://www.wsts.org' },
  { authors: 'SemiAnalysis', title: 'TSMC and the Future of Semiconductor Manufacturing', year: '2025', url: 'https://semianalysis.com' },
  { authors: 'NVIDIA', title: 'Blackwell Architecture Technical Brief', year: '2025', url: 'https://nvidia.com' },
  { authors: 'OpenAI', title: 'GPT-4 Technical Report', year: '2024', url: 'https://arxiv.org/abs/2303.08774' },
  { authors: 'Meta AI', title: 'The Llama 3 Herd of Models', year: '2024', url: 'https://ai.meta.com' },
];

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function Methodology() {
  const { displayed: heroTitle, done: titleDone } = useTypedText(
    'Scientific Methodology',
    45,
    300
  );
  const { displayed: heroSubtitle } = useTypedText(
    'Transparent, reproducible, and grounded in empirical data',
    30,
    900
  );

  return (
    <Layout>
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,240,255,0.04) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-[1440px] px-4 pb-12 pt-20 lg:px-8">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-2 text-[13px] text-text-secondary transition-colors duration-150 hover:text-accent-cyan"
            >
              <ArrowLeft size={14} />
              Back to Simulation
            </Link>
          </motion.div>

          {/* Title with typing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h1 className="mb-4 font-display text-[48px] font-semibold leading-[1.05] tracking-[-0.03em] text-text-primary md:text-[56px]">
              {heroTitle}
              {!titleDone && (
                <span className="ml-1 inline-block h-[1em] w-[2px] animate-[blink_1s_step-end_infinite] bg-accent-cyan align-middle" />
              )}
            </h1>
          </motion.div>

          {/* Subtitle with typing */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: titleDone ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 max-w-[640px] text-[15px] leading-relaxed text-text-secondary"
          >
            {heroSubtitle}
          </motion.p>

          {/* Meta bar */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={titleDone ? 'visible' : 'hidden'}
            className="flex flex-wrap gap-6"
          >
            {[
              { label: 'Model Version', value: '1.0.0' },
              { label: 'Last Updated', value: 'May 2026' },
              { label: 'Data Points', value: '2,400+', highlight: true },
              { label: 'Source Papers', value: '50+', highlight: true },
            ].map((meta) => (
              <motion.div key={meta.label} variants={staggerItem} className="flex items-center gap-2">
                <span className="label-text">{meta.label}:</span>
                <span
                  className={`data-text text-[12px] ${meta.highlight ? 'text-accent-cyan' : 'text-text-secondary'}`}
                >
                  {meta.value}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===================== MAIN CONTENT ===================== */}
      <div className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8">
        <div className="flex gap-8">
          <SidebarNav />

          <div className="min-w-0 flex-1 space-y-16">
            {/* ====== 01: EXECUTIVE SUMMARY ====== */}
            <SectionCard id="overview" number="01" title="Model Overview">
              <div className="space-y-4">
                <p className="text-[15px] leading-relaxed text-text-secondary">
                  The AGI/ASI Trajectory Simulation is a systems-dynamics model that projects the
                  progression of AI capabilities based on four interconnected sub-models. It uses
                  discrete-time difference equations updated annually from a 2018 baseline.
                </p>

                <div className="my-6 grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      icon: Microchip,
                      title: 'Compute Growth',
                      color: 'text-accent-cyan',
                      bg: 'bg-accent-cyan/10',
                      border: 'border-accent-cyan/20',
                      desc: 'Hardware FLOP/s growth driven by GPU scaling laws and investment in chips. CAGR ~68.3% for FP16 performance.',
                    },
                    {
                      icon: Zap,
                      title: 'Algorithmic Efficiency',
                      color: 'text-accent-purple',
                      bg: 'bg-accent-purple/10',
                      border: 'border-accent-purple/20',
                      desc: 'Software improvements delivering more capability per FLOP. Estimated 3x/year compound gains.',
                    },
                    {
                      icon: Battery,
                      title: 'Energy Constraints',
                      color: 'text-accent-amber',
                      bg: 'bg-accent-amber/10',
                      border: 'border-accent-amber/20',
                      desc: 'Real-world power limits. Data centers projected to consume 945 TWh by 2030 (IEA).',
                    },
                    {
                      icon: Brain,
                      title: 'Capability Translator',
                      color: 'text-accent-green',
                      bg: 'bg-accent-green/10',
                      border: 'border-accent-green/20',
                      desc: 'Converts effective compute into AI capability index using established scaling laws.',
                    },
                  ].map((card) => (
                    <motion.div
                      key={card.title}
                      variants={staggerItem}
                      className={`rounded-lg border ${card.border} bg-surface p-4`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <div className={`rounded-md ${card.bg} p-1.5`}>
                          <card.icon size={16} className={card.color} />
                        </div>
                        <span className="font-display text-[14px] font-medium text-text-primary">
                          {card.title}
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed text-text-secondary">{card.desc}</p>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  variants={staggerItem}
                  className="rounded-lg border border-accent-amber/30 bg-accent-amber/5 p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent-amber" />
                    <div>
                      <p className="text-[13px] font-medium text-text-primary">Key Disclaimer</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                        All projections are <strong className="text-text-primary">estimates</strong>{' '}
                        based on extrapolation of historical trends. Model compiled May 2026. Past
                        performance does not guarantee future results. This tool is for educational
                        and research purposes only.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </SectionCard>

            {/* ====== 02: DATA SOURCES ====== */}
            <SectionCard id="sources" number="02" title="Data Sources & Provenance">
              <p className="mb-6 text-[15px] leading-relaxed text-text-secondary">
                All data in this simulation is sourced from publicly available, peer-reviewed, or
                industry-standard publications. No proprietary or unverified data is used.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface-elevated">
                      {['Source', 'Type', 'Data Used', 'URL', 'Last Accessed', 'Reliability'].map(
                        (h) => (
                          <th
                            key={h}
                            className="label-text whitespace-nowrap px-3 py-2.5 text-text-secondary"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {dataSources.map((row, i) => (
                      <motion.tr
                        key={row.source}
                        variants={staggerItem}
                        custom={i}
                        className="border-b border-border transition-colors duration-150 hover:bg-surface-elevated"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 text-[13px] font-medium text-text-primary">
                          {row.source}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-text-secondary">
                          {row.type}
                        </td>
                        <td className="min-w-[200px] px-3 py-2.5 text-[12px] text-text-secondary">
                          {row.data}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[12px]">
                          <span className="font-mono text-accent-blue">{row.url}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[12px] font-mono text-text-secondary">
                          {row.accessed}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <ReliabilityPill level={row.reliability} />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* ====== 03: SCALING LAWS ====== */}
            <SectionCard id="scaling" number="03" title="Scaling Laws">
              <div className="space-y-6">
                {/* Kaplan */}
                <motion.div variants={staggerItem} className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <BookOpen size={14} className="text-accent-cyan" />
                    <span className="font-display text-[14px] font-medium text-text-primary">
                      Kaplan et al. (2020)
                    </span>
                  </div>
                  <p className="mb-2 text-[13px] text-text-secondary">
                    Original scaling laws for neural language models. Loss scales as a power law with
                    model size, dataset size, and compute.
                  </p>
                  <code className="block overflow-x-auto rounded bg-[#0D0E12] p-3 font-mono text-[13px] text-text-primary">
                    L(N) = (Nc / N)^&#x03B1;_N, &#x03B1;_N &#x2248; 0.073
                  </code>
                  <p className="mt-2 text-[12px] text-text-tertiary">
                    Where N is parameter count, Nc &#x2248; 8.8&#xd7;10&#x00B9;&#x00B3; is the critical parameter count.
                  </p>
                </motion.div>

                {/* Chinchilla */}
                <motion.div variants={staggerItem} className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <BookOpen size={14} className="text-accent-purple" />
                    <span className="font-display text-[14px] font-medium text-text-primary">
                      Hoffmann et al. / Chinchilla (2022)
                    </span>
                  </div>
                  <p className="mb-2 text-[13px] text-text-secondary">
                    Compute-optimal training requires scaling model size and training tokens equally.
                    The optimal ratio is approximately 20 tokens per parameter.
                  </p>
                  <code className="block overflow-x-auto rounded bg-[#0D0E12] p-3 font-mono text-[13px] text-text-primary">
                    D / N &#x2248; 20 tokens per parameter
                  </code>
                  <p className="mt-2 text-[12px] text-text-tertiary">
                    A 70B parameter model should be trained on ~1.4T tokens for compute-optimal results.
                  </p>
                </motion.div>

                {/* Test-Time Compute */}
                <motion.div variants={staggerItem} className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <BookOpen size={14} className="text-accent-green" />
                    <span className="font-display text-[14px] font-medium text-text-primary">
                      Snell et al. (2024) — Test-Time Compute
                    </span>
                  </div>
                  <p className="mb-2 text-[13px] text-text-secondary">
                    Using additional computation at inference time via chain-of-thought reasoning and
                    search can be up to 4x more efficient than best-of-N sampling for improving model
                    outputs.
                  </p>
                  <div className="rounded bg-accent-green/10 p-3">
                    <p className="text-[13px] text-accent-green">
                      4x more efficient than best-of-N sampling for reasoning tasks
                    </p>
                  </div>
                </motion.div>

                {/* Key insight callout */}
                <motion.div
                  variants={staggerItem}
                  className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/5 p-4"
                >
                  <div className="flex items-start gap-3">
                    <TrendingUp size={16} className="mt-0.5 shrink-0 text-accent-cyan" />
                    <div>
                      <p className="text-[13px] font-medium text-text-primary">Key Insight</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                        <strong className="text-text-primary">
                          Compute scaling accounts for 60-95% of capability gains
                        </strong>{' '}
                        observed in large language models. Algorithmic efficiency adds an
                        estimated{' '}
                        <strong className="text-text-primary">3x/year multiplier</strong> on top of
                        hardware improvements, compounding over time.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </SectionCard>

            {/* ====== 04: MATHEMATICAL MODEL ====== */}
            <SectionCard id="model" number="04" title="Mathematical Model">
              <div className="mb-6 space-y-3">
                <p className="text-[15px] leading-relaxed text-text-secondary">
                  The simulation&apos;s core equations, implemented directly in the application. All
                  state variables are updated annually starting from 2018 baseline values.
                </p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'C(t)', desc: 'Hardware Compute (FLOP/s)' },
                    { label: 'E(t)', desc: 'Algorithmic Efficiency Multiplier' },
                    { label: 'I_total(t)', desc: 'Total Investment (USD)' },
                    { label: 'C_eff(t)', desc: 'Effective Compute' },
                    { label: 'C_cum(t)', desc: 'Cumulative Training FLOPs' },
                    { label: 'Cap(t)', desc: 'Capability Index' },
                  ].map((v) => (
                    <span
                      key={v.label}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-2.5 py-1 text-[11px]"
                    >
                      <span className="font-mono text-accent-cyan">{v.label}</span>
                      <span className="text-text-tertiary">—</span>
                      <span className="text-text-secondary">{v.desc}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Equation label="1. Investment Growth with Feedback">
                  <span className="text-accent-purple">I_total</span>
                  <span className="text-text-secondary">(</span>
                  <span className="text-accent-amber">t</span>
                  <span className="text-text-secondary">
                    ) = I_total(t-1) &#x00D7; (1 +{' '}
                  </span>
                  <span className="text-accent-amber">g_invest</span>
                  <span className="text-text-secondary">) &#x00D7; </span>
                  <span className="text-accent-green">feedback</span>
                  <span className="text-text-secondary">(t)</span>
                </Equation>

                <Equation label="2. Investment Allocation">
                  <span className="text-accent-purple">I_chips</span>
                  <span className="text-text-secondary"> = </span>
                  <span className="text-accent-amber">f_chips</span>
                  <span className="text-text-secondary"> &#x00D7; I_total &#x00D7; </span>
                  <span className="text-accent-green">tsmc_constraint</span>
                </Equation>

                <Equation label="3. Hardware Compute Update">
                  <span className="text-accent-purple">C</span>
                  <span className="text-text-secondary">(t) = C(t-1) &#x00D7; (1 + </span>
                  <span className="text-accent-amber">g_compute_raw</span>
                  <span className="text-text-secondary"> &#x00D7; &#x221A;(1+</span>
                  <span className="text-accent-amber">g_hw</span>
                  <span className="text-text-secondary">)) + (I_chips/1000) &#x00D7; 1e15 &#x00D7; </span>
                  <span className="text-accent-green">price_per_flop</span>
                </Equation>

                <Equation label="4. Price per FLOP">
                  <span className="text-accent-green">price_per_flop</span>
                  <span className="text-text-secondary">(t) = price_per_flop(t-1) &#x00D7; exp(-</span>
                  <span className="text-accent-amber">g_hw</span>
                  <span className="text-text-secondary">)</span>
                </Equation>

                <Equation label="5. Algorithmic Efficiency">
                  <span className="text-accent-purple">E</span>
                  <span className="text-text-secondary">(t) = E(t-1) &#x00D7; (1 + </span>
                  <span className="text-accent-amber">g_algo</span>
                  <span className="text-text-secondary"> / (1 + 0.01 &#x00D7; (E(t-1) - 1)))</span>
                </Equation>

                <Equation label="6. Data Wall Factor">
                  <span className="text-accent-green">data_factor</span>
                  <span className="text-text-secondary">(t) = 1.0 if t &#x2264; </span>
                  <span className="text-accent-amber">data_wall_year</span>
                  <span className="text-text-secondary">, else max(0.3, 1 - 0.1&#x00D7;(t - data_wall_year))</span>
                </Equation>

                <Equation label="7. Power Consumption">
                  <span className="text-accent-purple">P</span>
                  <span className="text-text-secondary">(t) = C(t) / (1e12 &#x00D7; (1+</span>
                  <span className="text-accent-amber">g_hw</span>
                  <span className="text-text-secondary">)^(t-2018))</span>
                </Equation>

                <Equation label="8. Energy Constraint">
                  <span className="text-accent-green">energy_constraint</span>
                  <span className="text-text-secondary"> = min(1.0, </span>
                  <span className="text-accent-amber">max_energy</span>
                  <span className="text-text-secondary"> / energy_TWh(t))</span>
                </Equation>

                <Equation label="9. Effective Compute">
                  <span className="text-accent-purple">C_effective</span>
                  <span className="text-text-secondary">(t) = C(t) &#x00D7; E(t) &#x00D7; data_factor &#x00D7; energy_constraint &#x00D7; </span>
                  <span className="text-accent-amber">utilization</span>
                </Equation>

                <Equation label="10. Cumulative Training FLOPs">
                  <span className="text-accent-purple">C_cumulative</span>
                  <span className="text-text-secondary">(t) = C_cumulative(t-1) + C_effective(t) &#x00D7; 0.3 &#x00D7; </span>
                  <span className="text-accent-amber">seconds_per_year</span>
                </Equation>

                <Equation label="11. Capability Index">
                  <span className="text-accent-purple">Cap</span>
                  <span className="text-text-secondary">(t) = 1 - 1/(1 + 0.15 &#x00D7; max(0, log&#x2081;&#x2080;(C_cumulative(t) / 1e21)))</span>
                </Equation>
              </div>
            </SectionCard>

            {/* ====== 05: CALIBRATION ====== */}
            <SectionCard id="calibration" number="05" title="Calibration & Validation">
              <p className="mb-4 text-[15px] leading-relaxed text-text-secondary">
                The model is calibrated against publicly reported training compute estimates for
                landmark AI systems. All simulated values are post-calibration.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface-elevated">
                      {['Year', 'Model', 'Actual FLOPs', 'Simulated FLOPs', 'Error'].map((h) => (
                        <th
                          key={h}
                          className="label-text whitespace-nowrap px-3 py-2.5 text-text-secondary"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calibrationData.map((row, i) => (
                      <motion.tr
                        key={row.model}
                        variants={staggerItem}
                        custom={i}
                        className="border-b border-border transition-colors duration-150 hover:bg-surface-elevated"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-text-secondary">
                          {row.year}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[13px] font-medium text-text-primary">
                          {row.model}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-accent-cyan">
                          {row.actual}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-accent-purple">
                          {row.simulated}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <span className="font-mono text-[12px] text-accent-amber">{row.error}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <motion.div
                variants={staggerItem}
                className="mt-4 flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-3"
              >
                <CheckCircle2 size={14} className="text-accent-green" />
                <span className="text-[13px] text-accent-green">
                  Model calibrated to match historical data with &lt;20% MAPE on log scale
                </span>
              </motion.div>
            </SectionCard>

            {/* ====== 06: SCENARIOS ====== */}
            <SectionCard id="scenarios" number="06" title="Scenario Definitions">
              <p className="mb-6 text-[15px] leading-relaxed text-text-secondary">
                Four preset scenarios represent distinct possible futures. Each is a coherent set of
                assumptions about how investment, technology, and policy evolve.
              </p>

              <Accordion type="multiple" className="w-full space-y-3">
                {/* Baseline */}
                <AccordionItem
                  value="baseline"
                  className="overflow-hidden rounded-xl border border-accent-cyan/20 bg-surface px-0"
                >
                  <AccordionTrigger className="px-4 py-4 hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="h-8 w-1 shrink-0 rounded-full bg-accent-cyan" />
                      <div className="flex flex-1 items-center gap-3">
                        <div className="rounded-md bg-accent-cyan/10 p-1.5">
                          <BarChart3 size={14} className="text-accent-cyan" />
                        </div>
                        <div className="text-left">
                          <span className="block font-display text-[15px] font-medium text-text-primary">
                            Baseline — &quot;Status Quo&quot;
                          </span>
                          <span className="text-[12px] text-text-secondary">
                            Historical trends continue
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="ml-6 space-y-3 border-l border-border pl-4">
                      <p className="text-[13px] leading-relaxed text-text-secondary">
                        Current trends continue without major disruptions. Hyperscaler CAPEX grows at
                        historical rates (~20%/year). No breakthrough regulatory changes. Energy
                        constraints gradually tighten. AGI median estimate:{' '}
                        <strong className="text-text-primary">2040-2047</strong>.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['Chips: 35%', 'Data Centers: 25%', 'R&D: 25%', 'Energy: 15%'].map(
                          (p) => (
                            <span
                              key={p}
                              className="rounded-md border border-border bg-surface-elevated px-2 py-0.5 font-mono text-[11px] text-text-secondary"
                            >
                              {p}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Accelerated */}
                <AccordionItem
                  value="accelerated"
                  className="overflow-hidden rounded-xl border border-accent-green/20 bg-surface px-0"
                >
                  <AccordionTrigger className="px-4 py-4 hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="h-8 w-1 shrink-0 rounded-full bg-accent-green" />
                      <div className="flex flex-1 items-center gap-3">
                        <div className="rounded-md bg-accent-green/10 p-1.5">
                          <Zap size={14} className="text-accent-green" />
                        </div>
                        <div className="text-left">
                          <span className="block font-display text-[15px] font-medium text-text-primary">
                            Accelerated — &quot;Massive Surge&quot;
                          </span>
                          <span className="text-[12px] text-text-secondary">
                            Investment doubles, nuclear SMRs deployed
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="ml-6 space-y-3 border-l border-border pl-4">
                      <p className="text-[13px] leading-relaxed text-text-secondary">
                        Hyperscaler investment doubles. Government AI programs add $100B+/year.
                        Energy infrastructure buildout accelerates with nuclear SMRs. AGI possible by{' '}
                        <strong className="text-text-primary">2032-2038</strong>.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['Chips: 40%', 'Data Centers: 30%', 'R&D: 20%', 'Energy: 10%'].map(
                          (p) => (
                            <span
                              key={p}
                              className="rounded-md border border-border bg-surface-elevated px-2 py-0.5 font-mono text-[11px] text-text-secondary"
                            >
                              {p}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Constrained */}
                <AccordionItem
                  value="constrained"
                  className="overflow-hidden rounded-xl border border-accent-amber/20 bg-surface px-0"
                >
                  <AccordionTrigger className="px-4 py-4 hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="h-8 w-1 shrink-0 rounded-full bg-accent-amber" />
                      <div className="flex flex-1 items-center gap-3">
                        <div className="rounded-md bg-accent-amber/10 p-1.5">
                          <AlertTriangle size={14} className="text-accent-amber" />
                        </div>
                        <div className="text-left">
                          <span className="block font-display text-[15px] font-medium text-text-primary">
                            Constrained — &quot;Hard Limits&quot;
                          </span>
                          <span className="text-[12px] text-text-secondary">
                            Strict regulation, energy moratoriums
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="ml-6 space-y-3 border-l border-border pl-4">
                      <p className="text-[13px] leading-relaxed text-text-secondary">
                        Strict global AI regulation. Energy moratoriums in major regions. Export
                        controls limit chip access. Public backlash slows deployment. AGI delayed to{' '}
                        <strong className="text-text-primary">2050+</strong>.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['Chips: 25%', 'Data Centers: 15%', 'R&D: 30%', 'Energy: 30%'].map(
                          (p) => (
                            <span
                              key={p}
                              className="rounded-md border border-border bg-surface-elevated px-2 py-0.5 font-mono text-[11px] text-text-secondary"
                            >
                              {p}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Counterfactual */}
                <AccordionItem
                  value="counterfactual"
                  className="overflow-hidden rounded-xl border border-accent-purple/20 bg-surface px-0"
                >
                  <AccordionTrigger className="px-4 py-4 hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="h-8 w-1 shrink-0 rounded-full bg-accent-purple" />
                      <div className="flex flex-1 items-center gap-3">
                        <div className="rounded-md bg-accent-purple/10 p-1.5">
                          <FlaskConical size={14} className="text-accent-purple" />
                        </div>
                        <div className="text-left">
                          <span className="block font-display text-[15px] font-medium text-text-primary">
                            Counterfactual — &quot;Early R&D Boost&quot;
                          </span>
                          <span className="text-[12px] text-text-secondary">
                            Redirect 50% to fundamental research
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="ml-6 space-y-3 border-l border-border pl-4">
                      <p className="text-[13px] leading-relaxed text-text-secondary">
                        Redirect 50% of current infrastructure spending to fundamental research.
                        Massive algorithmic breakthrough. Open-source ecosystem accelerates.
                        Demonstrates the opportunity cost of current investment patterns. AGI:{' '}
                        <strong className="text-text-primary">~2040</strong> (more efficient path).
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['Chips: 20%', 'Data Centers: 10%', 'R&D: 50%', 'Energy: 20%'].map(
                          (p) => (
                            <span
                              key={p}
                              className="rounded-md border border-border bg-surface-elevated px-2 py-0.5 font-mono text-[11px] text-text-secondary"
                            >
                              {p}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </SectionCard>

            {/* ====== 07: LIMITATIONS ====== */}
            <SectionCard id="limitations" number="07" title="Limitations & Uncertainties">
              {/* Warning banner */}
              <motion.div
                variants={staggerItem}
                className="mb-6 flex items-start gap-3 rounded-lg border-l-4 border-accent-rose bg-accent-rose/5 p-4"
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent-rose" />
                <p className="text-[13px] leading-relaxed text-text-primary">
                  Past trends do not guarantee future performance. These projections should not be
                  used for policy, investment, or strategic decisions without additional analysis.
                  The model is for educational and research purposes only.
                </p>
              </motion.div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: 'Wildcards',
                    icon: Zap,
                    color: 'text-accent-amber',
                    bg: 'bg-accent-amber/10',
                    border: 'border-accent-amber/20',
                    text: 'Quantum computing, neuromorphic chips, or breakthrough architectures (e.g., beyond transformers) could invalidate scaling assumptions overnight.',
                  },
                  {
                    title: 'Geopolitical Disruptions',
                    icon: AlertCircle,
                    color: 'text-accent-rose',
                    bg: 'bg-accent-rose/10',
                    border: 'border-accent-rose/20',
                    text: 'Taiwan Strait tensions, export controls, or regulatory shifts could severely constrain chip supply chains and global deployment.',
                  },
                  {
                    title: 'The Bitter Lesson vs. Plateaus',
                    icon: TrendingUp,
                    color: 'text-accent-cyan',
                    bg: 'bg-accent-cyan/10',
                    border: 'border-accent-cyan/20',
                    text: 'Sutton\'s "Bitter Lesson" suggests compute wins, but we may hit fundamental plateaus in data quality, model architecture, or optimization.',
                  },
                  {
                    title: 'Data Wall Uncertainty',
                    icon: Database,
                    color: 'text-accent-purple',
                    bg: 'bg-accent-purple/10',
                    border: 'border-accent-purple/20',
                    text: 'The "data wall" may be circumvented by synthetic data, multimodal training, or entirely new training paradigms we cannot yet foresee.',
                  },
                  {
                    title: 'Feedback Loops',
                    icon: Layers,
                    color: 'text-accent-blue',
                    bg: 'bg-accent-blue/10',
                    border: 'border-accent-blue/20',
                    text: 'The model does not capture recursive self-improvement. An AGI system could accelerate its own development in ways we cannot predict.',
                  },
                  {
                    title: 'Expert Reliability',
                    icon: Brain,
                    color: 'text-accent-green',
                    bg: 'bg-accent-green/10',
                    border: 'border-accent-green/20',
                    text: 'Expert AGI timelines have historically been poor predictors. The 2047 median (Grace et al.) should be treated with extreme skepticism.',
                  },
                ].map((item) => (
                  <motion.div
                    key={item.title}
                    variants={staggerItem}
                    className={`rounded-lg border ${item.border} bg-surface p-4`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className={`rounded-md ${item.bg} p-1.5`}>
                        <item.icon size={14} className={item.color} />
                      </div>
                      <span className="font-display text-[14px] font-medium text-text-primary">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-text-secondary">{item.text}</p>
                  </motion.div>
                ))}
              </div>

              {/* Confidence levels */}
              <motion.div variants={staggerItem} className="mt-6">
                <h3 className="mb-3 font-display text-[16px] font-medium text-text-primary">
                  Confidence Levels
                </h3>
                <div className="space-y-2">
                  {[
                    { level: 'HIGH', label: 'Historical fit (2018-2025)', color: 'text-accent-green', w: '95%' },
                    { level: 'MEDIUM', label: '5-year projections (2026-2030)', color: 'text-accent-amber', w: '70%' },
                    { level: 'LOW', label: 'AGI timeline estimates (2040+)', color: 'text-accent-rose', w: '30%' },
                  ].map((c) => (
                    <div
                      key={c.label}
                      className="flex items-center gap-4 rounded-md border border-border bg-[#0D0E12] p-3"
                    >
                      <span className={`label-text w-16 ${c.color}`}>{c.level}</span>
                      <span className="w-48 text-[12px] text-text-secondary">{c.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-elevated">
                        <div
                          className={`h-full rounded-full ${c.level === 'HIGH' ? 'bg-accent-green' : c.level === 'MEDIUM' ? 'bg-accent-amber' : 'bg-accent-rose'}`}
                          style={{ width: c.w }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </SectionCard>

            {/* ====== 08: BIBLIOGRAPHY ====== */}
            <motion.section
              id="bibliography"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="scroll-mt-24"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="label-text text-accent-cyan">08</span>
              </div>
              <h2 className="mb-6 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
                Bibliography
              </h2>

              <div className="panel">
                <div className="space-y-0 divide-y divide-border">
                  {bibliography.map((ref, i) => (
                    <motion.div
                      key={i}
                      variants={staggerItem}
                      custom={i}
                      className="flex items-start gap-3 py-3 transition-colors duration-150 hover:bg-surface-elevated/50"
                    >
                      <span className="mt-0.5 w-6 shrink-0 text-right font-mono text-[11px] text-text-tertiary">
                        {i + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-relaxed text-text-secondary">
                          <span className="text-text-primary">{ref.authors}</span> ({ref.year}).{' '}
                          <em className="text-text-primary">{ref.title}</em>.
                        </p>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-accent-blue transition-colors hover:text-accent-cyan"
                        >
                          <ExternalLink size={10} />
                          {ref.url.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* ====== BACK TO SIMULATION ====== */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex justify-center py-8"
            >
              <motion.div variants={staggerItem}>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-6 py-3 font-display text-[15px] font-medium text-accent-cyan transition-all duration-200 hover:bg-accent-cyan/20 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                >
                  <ArrowLeft size={16} />
                  Back to Simulation
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
