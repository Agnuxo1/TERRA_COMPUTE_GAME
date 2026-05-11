import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import type { SimulationParams } from '@/lib/simulation';

interface SimulationControlsProps {
  params: SimulationParams;
  onChange: (params: SimulationParams) => void;
}

interface SliderConfig {
  key: keyof SimulationParams;
  label: string;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}

const investmentSliders: SliderConfig[] = [
  { key: 'f_chips', label: 'AI Chips & Hardware', min: 0.1, max: 0.7, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'f_dc', label: 'Data Centers & Infra', min: 0.1, max: 0.5, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'f_rd', label: 'R&D & Algorithms', min: 0.05, max: 0.4, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'f_energy', label: 'Energy & Power', min: 0.05, max: 0.3, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` },
];

const growthSliders: SliderConfig[] = [
  { key: 'g_invest', label: 'Investment Growth', min: 0.05, max: 0.50, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'g_hw', label: 'Hardware Efficiency', min: 0.20, max: 0.80, step: 0.01, format: (v) => `${v.toFixed(2)}x` },
  { key: 'g_algo', label: 'Algorithmic Efficiency', min: 0.5, max: 3.0, step: 0.01, format: (v) => `${v.toFixed(2)}x` },
  { key: 'g_compute_raw', label: 'Raw Compute Growth', min: 1.0, max: 4.0, step: 0.01, format: (v) => `${v.toFixed(2)}x` },
];

const constraintSliders: SliderConfig[] = [
  { key: 'max_energy', label: 'Max Energy (TWh)', min: 500, max: 5000, step: 50, format: (v) => `${v.toFixed(0)}` },
  { key: 'max_spend', label: 'Max Spend ($B)', min: 100, max: 2000, step: 10, format: (v) => `$${v.toFixed(0)}B` },
  { key: 'data_wall_year', label: 'Data Wall Year', min: 2025, max: 2035, step: 1, format: (v) => `${v.toFixed(0)}` },
  { key: 'tsmc_constraint', label: 'TSMC Capacity', min: 0.5, max: 1.0, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'utilization_factor', label: 'Utilization Factor', min: 0.3, max: 0.9, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` },
];

export default function SimulationControls({ params, onChange }: SimulationControlsProps) {
  const allocationTotal = useMemo(() => {
    return params.f_chips + params.f_dc + params.f_rd + params.f_energy;
  }, [params.f_chips, params.f_dc, params.f_rd, params.f_energy]);

  const handleSliderChange = (key: keyof SimulationParams, value: number[]) => {
    onChange({ ...params, [key]: value[0] });
  };

  const renderSlider = (config: SliderConfig) => {
    const value = params[config.key];
    return (
      <div key={config.key} className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label-text text-text-secondary">{config.label}</span>
          <span className="data-text text-[13px] text-accent-cyan">
            {config.format ? config.format(value as number) : String(value)}
          </span>
        </div>
        <Slider
          value={[value as number]}
          onValueChange={(v) => handleSliderChange(config.key, v)}
          min={config.min}
          max={config.max}
          step={config.step}
          className="w-full"
        />
      </div>
    );
  };

  return (
    <div className="panel h-full max-h-[calc(100dvh-200px)] overflow-y-auto">
      {/* Investment Allocation Section */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-medium text-text-primary">
            Investment Allocation
          </h3>
          <span
            className="data-text text-[11px]"
            style={{
              color: Math.abs(allocationTotal - 1.0) < 0.01 ? '#00E5A0' : '#FFB84D',
            }}
          >
            Total: {(allocationTotal * 100).toFixed(0)}%
          </span>
        </div>

        {/* Stacked allocation bar */}
        <div className="mb-4 flex h-2 w-full overflow-hidden rounded-full">
          <div
            className="h-full bg-accent-cyan"
            style={{ width: `${(params.f_chips / allocationTotal) * 100}%` }}
          />
          <div
            className="h-full bg-accent-blue"
            style={{ width: `${(params.f_dc / allocationTotal) * 100}%` }}
          />
          <div
            className="h-full bg-accent-purple"
            style={{ width: `${(params.f_rd / allocationTotal) * 100}%` }}
          />
          <div
            className="h-full bg-accent-amber"
            style={{ width: `${(params.f_energy / allocationTotal) * 100}%` }}
          />
        </div>

        {investmentSliders.map(renderSlider)}
      </div>

      <div className="mb-4 h-px w-full bg-border" />

      {/* Growth Rates Section */}
      <div className="mb-6">
        <h3 className="mb-3 font-display text-base font-medium text-text-primary">
          Growth Rates
        </h3>
        {growthSliders.map(renderSlider)}
      </div>

      <div className="mb-4 h-px w-full bg-border" />

      {/* Constraints Section */}
      <div>
        <h3 className="mb-3 font-display text-base font-medium text-text-primary">
          Constraints
        </h3>
        {constraintSliders.map(renderSlider)}
      </div>
    </div>
  );
}
