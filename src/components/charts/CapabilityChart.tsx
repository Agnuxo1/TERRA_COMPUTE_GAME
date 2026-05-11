import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { YearlyData } from '@/lib/simulation';
import { getCapabilityDescription } from '@/lib/simulation';

interface CapabilityChartProps {
  data: YearlyData[];
}

interface ChartPoint {
  year: number;
  capability: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  const cap = payload[0].value;
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3 shadow-xl">
      <div className="data-text mb-1 text-[13px] text-text-primary">{label}</div>
      <div className="data-text text-lg text-accent-cyan">{(cap * 100).toFixed(1)}%</div>
      <div className="mt-1 text-[12px] text-text-secondary">{getCapabilityDescription(cap)}</div>
    </div>
  );
};

export default function CapabilityChart({ data }: CapabilityChartProps) {
  const chartData = useMemo<ChartPoint[]>(() => {
    return data.map(d => ({ year: d.year, capability: d.capability }));
  }, [data]);

  return (
    <div className="panel">
      <h2 className="mb-4 font-display text-xl font-medium text-text-primary">
        Capability Index
      </h2>
      <p className="mb-4 text-[13px] text-text-secondary">
        Projected AI capability trajectory from narrow AI to superhuman ASI.
      </p>
      <ResponsiveContainer width="100%" height={420}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            domain={[0, 1]}
            tick={{ fontSize: 11, fill: '#7A7D8A', fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1E2028' }}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Shaded regions */}
          <ReferenceArea y1={0} y2={0.6} fill="#3B82F6" fillOpacity={0.04} />
          <ReferenceArea y1={0.6} y2={0.7} fill="#FFB84D" fillOpacity={0.08} label={{ value: 'Near-AGI', position: 'insideTopLeft', fill: '#FFB84D', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
          <ReferenceArea y1={0.7} y2={0.85} fill="#00E5A0" fillOpacity={0.08} label={{ value: 'AGI', position: 'insideTopLeft', fill: '#00E5A0', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
          <ReferenceArea y1={0.85} y2={1.0} fill="#FF477E" fillOpacity={0.08} label={{ value: 'ASI', position: 'insideTopLeft', fill: '#FF477E', fontSize: 11, fontFamily: 'JetBrains Mono' }} />

          {/* Reference lines */}
          <ReferenceLine y={0.7} stroke="#00E5A0" strokeDasharray="6 4" strokeOpacity={0.6} />
          <ReferenceLine y={0.85} stroke="#FF477E" strokeDasharray="6 4" strokeOpacity={0.6} />
          <ReferenceLine y={0.95} stroke="#FF477E" strokeDasharray="2 2" strokeOpacity={0.8} />

          <Area
            type="monotone"
            dataKey="capability"
            stroke="#00F0FF"
            strokeWidth={2.5}
            fill="url(#capGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#00F0FF', stroke: '#040405', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
