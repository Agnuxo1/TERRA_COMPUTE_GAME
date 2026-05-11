import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ComputeChart from './charts/ComputeChart';
import CapabilityChart from './charts/CapabilityChart';
import TimelineChart from './charts/TimelineChart';
import EnergyChart from './charts/EnergyChart';
import InvestmentChart from './charts/InvestmentChart';
import type { YearlyData } from '@/lib/simulation';

interface TabPanelProps {
  data: YearlyData[];
  agiYear: number | null;
  asiYear: number | null;
  maxEnergy: number;
}

const tabs = [
  { key: 'compute', label: 'Compute', description: 'Hardware compute trajectory with historical validation points.' },
  { key: 'capability', label: 'Capability', description: 'AI Capability Index from narrow AI to superhuman ASI.' },
  { key: 'timeline', label: 'Timeline', description: 'Probability distribution for AGI/ASI arrival years.' },
  { key: 'energy', label: 'Energy', description: 'Energy demand vs supply constraints.' },
  { key: 'investment', label: 'Investment', description: 'Investment allocation across categories over time.' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function TabPanel({ data, agiYear, asiYear, maxEnergy }: TabPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('compute');

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab-pill ${activeTab === tab.key ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {activeTab === 'compute' && <ComputeChart data={data} />}
          {activeTab === 'capability' && <CapabilityChart data={data} />}
          {activeTab === 'timeline' && <TimelineChart data={data} agiYear={agiYear} asiYear={asiYear} />}
          {activeTab === 'energy' && <EnergyChart data={data} maxEnergy={maxEnergy} />}
          {activeTab === 'investment' && <InvestmentChart data={data} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
