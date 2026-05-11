import { useMemo } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart,
  Legend,
} from 'recharts';
import type { YearlyData } from '@/lib/simulation';

interface EnergyChartProps {
  data: YearlyData[];
  maxEnergy: number;
}

interface ChartPoint {
  year: number;
  energyTWh: number;
  energyConstraint: number;
  gpuPower: number;
  maxEnergy: number;
  dataFactor: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3 shadow-xl">
      <div className="data-text mb-2 text-[13px] text-text-primary">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[12px]">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-text-secondary">
            {p.dataKey === 'energyTWh' && 'Energy Demand'}
            {p.dataKey === 'maxEnergy' && 'Max Energy Cap'}
            {p.dataKey === 'gpuPower' && 'GPU Power (W)'}
          </span>
          <span className="data-text text-text-primary">
            {p.dataKey === 'gpuPower' ? `${Math.round(p.value)}W` : `${p.value.toFixed(0)} TWh`}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function EnergyChart({ data, maxEnergy }: EnergyChartProps) {
  const chartData = useMemo<ChartPoint[]>(() => {
    return data.map(d => ({
      year: d.year,
      energyTWh: d.energyTWh,
      energyConstraint: d.energyConstraint,
      gpuPower: d.gpuPower,
      maxEnergy: maxEnergy,
      dataFactor: d.dataFactor,
    }));
  }, [data, maxEnergy]);

  const breachYear = useMemo(() => {
    return chartData.find(d => d.energyTWh > maxEnergy)?.year ?? null;
  }, [chartData, maxEnergy]);

  return (
    <div className="panel">
      <h2 className="mb-4 font-display text-xl font-medium text-text-primary">
        Energy Constraints
      </h2>
      <p className="mb-4 text-[13px] text-text-secondary">
        AI compute energy demand vs. supply ceiling. Constraint activation shown when demand exceeds capacity.
      </p>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2028" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#7A7D8A', fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1E2028' }}
            domain={[2018, 2050]}
            type="number"
            scale="linear"
            ticks={[2018, 2020, 2022, 2024, 2026, 2028, 2030, 2035, 2040, 2045, 2050]}
          />
          <YAxis
            yAxisId="energy"
            tick={{ fontSize: 11, fill: '#7A7D8A', fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1E2028' }}
            domain={[0, Math.max(maxEnergy * 1.5, 2000)]}
            label={{ value: 'TWh / year', angle: -90, position: 'insideLeft', fill: '#7A7D8A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis
            yAxisId="gpu"
            orientation="right"
            tick={{ fontSize: 11, fill: '#7A7D8A', fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1E2028' }}
            domain={[0, 5000]}
            label={{ value: 'GPU TDP (W)', angle: 90, position: 'insideRight', fill: '#7A7D8A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, fontFamily: 'Inter', paddingTop: 8 }}
          />

          {/* Max energy cap line */}
          <ReferenceLine
            yAxisId="energy"
            y={maxEnergy}
            stroke="#FF477E"
            strokeDasharray="6 4"
            strokeWidth={2}
            label={{ value: `Cap: ${maxEnergy} TWh`, position: 'right', fill: '#FF477E', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          />

          {/* Breach indicator */}
          {breachYear && (
            <ReferenceLine
              x={breachYear}
              stroke="#FFB84D"
              strokeDasharray="4 4"
              label={{ value: `Breach: ${breachYear}`, position: 'top', fill: '#FFB84D', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
          )}

          <Area
            yAxisId="energy"
            type="monotone"
            dataKey="energyTWh"
            stroke="#FFB84D"
            fill="#FFB84D"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={false}
            name="Energy Demand"
          />
          <Line
            yAxisId="gpu"
            type="monotone"
            dataKey="gpuPower"
            stroke="#7B61FF"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 4"
            name="GPU TDP (W)"
          />
          <Line
            yAxisId="energy"
            type="monotone"
            dataKey="maxEnergy"
            stroke="#FF477E"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            name="Max Energy Cap"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded border border-border bg-surface p-3">
          <div className="label-text mb-1">Energy Gap</div>
          <div className="data-text text-lg" style={{ color: breachYear ? '#FF477E' : '#00E5A0' }}>
            {breachYear ? `${Math.round(chartData[chartData.length - 1].energyTWh - maxEnergy)} TWh` : 'No gap'}
          </div>
        </div>
        <div className="rounded border border-border bg-surface p-3">
          <div className="label-text mb-1">GPU Power</div>
          <div className="data-text text-lg text-accent-purple">
            {Math.round(chartData[chartData.length - 1].gpuPower)}W
          </div>
        </div>
        <div className="rounded border border-border bg-surface p-3">
          <div className="label-text mb-1">Constraint Active</div>
          <div className="data-text text-lg" style={{ color: breachYear ? '#FFB84D' : '#00E5A0' }}>
            {breachYear ? `From ${breachYear}` : 'No'}
          </div>
        </div>
      </div>
    </div>
  );
}
