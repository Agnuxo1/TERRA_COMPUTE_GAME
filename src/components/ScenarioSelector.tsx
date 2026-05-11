import { motion } from 'framer-motion';
import { scenarios } from '@/lib/simulation';
import type { ScenarioKey, SimulationParams } from '@/lib/simulation';

interface ScenarioSelectorProps {
  selected: ScenarioKey | null;
  onSelect: (key: ScenarioKey, params: SimulationParams) => void;
}

export default function ScenarioSelector({ selected, onSelect }: ScenarioSelectorProps) {
  const keys: ScenarioKey[] = ['baseline', 'accelerated', 'constrained', 'counterfactual'];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {keys.map((key, i) => {
        const scenario = scenarios[key];
        const isSelected = selected === key;

        return (
          <motion.button
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 + i * 0.1, ease: 'easeOut' }}
            onClick={() => onSelect(key, scenario.params)}
            className="card group relative cursor-pointer text-left"
            style={{
              borderColor: isSelected ? scenario.color : undefined,
              boxShadow: isSelected ? `0 0 16px ${scenario.color}14` : undefined,
            }}
          >
            {/* Left accent bar */}
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: isSelected ? 1 : 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ backgroundColor: scenario.color, originY: 1 }}
            />

            <div className="pl-2">
              <h3
                className="font-display text-base font-medium"
                style={{ color: isSelected ? scenario.color : '#F0ECE4' }}
              >
                {scenario.title}
              </h3>
              <p className="mt-1 text-[13px] text-text-secondary">{scenario.subtitle}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
