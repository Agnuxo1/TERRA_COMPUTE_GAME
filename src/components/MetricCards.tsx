import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SimulationResult } from '@/lib/simulation';
import { formatFLOPs, formatCapability, getProbabilityColor } from '@/lib/simulation';

interface MetricCardsProps {
  result: SimulationResult;
}

export default function MetricCards({ result }: MetricCardsProps) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentData = useMemo(() => {
    return result.yearly.find(d => d.year === currentYear) ?? result.yearly[result.yearly.length - 1];
  }, [result, currentYear]);

  const metrics = useMemo(() => {
    const agiProb = result.agiProbability;
    return [
      {
        label: 'Current Year',
        value: String(currentYear),
        unit: '',
        color: '#00F0FF',
      },
      {
        label: 'Effective Compute',
        value: formatFLOPs(currentData.effectiveCompute),
        unit: 'FLOP/s',
        color: '#00E5A0',
      },
      {
        label: 'Cumulative Training',
        value: formatFLOPs(currentData.cumulativeTrainingFLOPs),
        unit: 'FLOP',
        color: '#7B61FF',
      },
      {
        label: 'Capability Index',
        value: formatCapability(currentData.capability),
        unit: '',
        color: '#FFB84D',
      },
      {
        label: 'AGI Probability',
        value: `${agiProb}%`,
        unit: '',
        color: getProbabilityColor(agiProb / 100),
      },
      {
        label: 'Est. AGI Year',
        value: result.agiYear ? String(result.agiYear) : '>2050',
        unit: '',
        color: '#FF477E',
      },
    ];
  }, [currentData, currentYear, result]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 + i * 0.1, ease: 'easeOut' }}
          className="card"
        >
          <div className="label-text mb-2">{m.label}</div>
          <motion.div
            key={m.value}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="data-large"
            style={{ color: m.color }}
          >
            {m.value}
          </motion.div>
          {m.unit && (
            <div className="data-text mt-1 text-[11px] text-text-secondary">{m.unit}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
