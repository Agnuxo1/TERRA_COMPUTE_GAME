import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { YearlyData } from '@/lib/simulation';

interface TimelineChartProps {
  data: YearlyData[];
  agiYear: number | null;
  asiYear: number | null;
}

interface ChartPoint {
  year: number;
  agiProbability: number;
  asiProbability: number;
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
            {p.dataKey === 'agiProbability' ? 'P(AGI by year)' : 'P(ASI by year)'}
          </span>
          <span className="data-text text-text-primary">{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export default function TimelineChart({ data, agiYear, asiYear }: TimelineChartProps) {
  const chartData = useMemo<ChartPoint[]>(() => {
    // Build cumulative probability curves based on capability thresholds
    const result: ChartPoint[] = [];
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      // Probability increases as capability approaches thresholds
      const agiProb = Math.min(99, d.capability >= 0.7 ? 95 : Math.max(0, (d.capability / 0.7) * 60));
      const asiProb = Math.min(99, d.capability >= 0.95 ? 95 : Math.max(0, (d.capability / 0.95) * 40));
      result.push({
        year: d.year,
        agiProbability: agiProb,
        asiProbability: asiProb,
      });
    }
    return result;
  }, [data]);

  const milestones = useMemo(() => [
    { year: 2047, label: 'Grace et al. median', color: '#7A7D8A' },
  ], []);

  return (
    <div className="panel">
      <h2 className="mb-4 font-display text-xl font-medium text-text-primary">
        Timeline to AGI / ASI
      </h2>
      <p className="mb-4 text-[13px] text-text-secondary">
        Cumulative probability curves for AGI and ASI arrival by year.
      </p>
      <ResponsiveContainer width="100%" height={420}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="agiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="asiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF477E" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#FF477E" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2028" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#7A7D8A', fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1E2028' }}
            domain={[2020, 2050]}
            type="number"
            scale="linear"
            ticks={[2020, 2022, 2024, 2026, 2028, 2030, 2032, 2034, 2036, 2038, 2040, 2045, 2050]}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#7A7D8A', fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1E2028' }}
            tickFormatter={(v: number) => `${v}%`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Expert estimate lines */}
          {milestones.map((m) => (
            <ReferenceLine
              key={m.year}
              x={m.year}
              stroke={m.color}
              strokeDasharray="6 4"
              label={{ value: m.label, position: 'top', fill: m.color, fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
          ))}

          {/* 50% reference */}
          <ReferenceLine y={50} stroke="#4A4D5A" strokeDasharray="4 4" />

          <Area
            type="monotone"
            dataKey="agiProbability"
            stroke="#00F0FF"
            strokeWidth={2.5}
            fill="url(#agiGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#00F0FF' }}
          />
          <Area
            type="monotone"
            dataKey="asiProbability"
            stroke="#FF477E"
            strokeWidth={2}
            fill="url(#asiGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#FF477E' }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Milestone info */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-border bg-surface p-2">
          <div className="label-text mb-1">AGI Estimate</div>
          <div className="data-text text-lg text-accent-cyan">
            {agiYear ?? '>2050'}
          </div>
        </div>
        <div className="rounded border border-border bg-surface p-2">
          <div className="label-text mb-1">ASI Estimate</div>
          <div className="data-text text-lg text-accent-rose">
            {asiYear ?? '>2050'}
          </div>
        </div>
        <div className="rounded border border-border bg-surface p-2">
          <div className="label-text mb-1">Expert Median</div>
          <div className="data-text text-lg text-text-secondary">2047</div>
        </div>
        <div className="rounded border border-border bg-surface p-2">
          <div className="label-text mb-1">Current Trajectory</div>
          <div className="data-text text-lg text-accent-green">
            {agiYear && agiYear < 2040 ? 'Accelerated' : agiYear && agiYear < 2050 ? 'Moderate' : 'Delayed'}
          </div>
        </div>
      </div>
    </div>
  );
}
