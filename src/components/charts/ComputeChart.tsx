import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, Legend,
} from 'recharts';
import { historicalPoints } from '@/lib/simulation';
import type { YearlyData } from '@/lib/simulation';

interface ComputeChartProps {
  data: YearlyData[];
}

interface ChartPoint {
  year: number;
  compute: number;
  effectiveCompute: number;
  cumulativeTraining: number;
  [key: string]: number;
}

const log10 = Math.log10;

function yFormatter(v: number): string {
  if (v <= 0) return '0';
  const exp = Math.floor(log10(v));
  return `10^${exp}`;
}

function yTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  const minExp = Math.floor(log10(min));
  const maxExp = Math.ceil(log10(max));
  for (let e = minExp; e <= maxExp; e++) {
    ticks.push(Math.pow(10, e));
  }
  return ticks;
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
            {p.dataKey === 'compute' && 'Hardware Compute'}
            {p.dataKey === 'effectiveCompute' && 'Effective Compute'}
            {p.dataKey === 'cumulativeTraining' && 'Cumulative Training'}
          </span>
          <span className="data-text text-text-primary">
            {p.value >= 1e15 ? `10^${Math.round(log10(p.value))}` : p.value.toExponential(1)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ComputeChart({ data }: ComputeChartProps) {
  const chartData = useMemo<ChartPoint[]>(() => {
    return data.map(d => ({
      year: d.year,
      compute: d.compute,
      effectiveCompute: d.effectiveCompute,
      cumulativeTraining: d.cumulativeTrainingFLOPs,
    }));
  }, [data]);

  const allValues = useMemo(() => {
    const vals: number[] = [];
    chartData.forEach(d => {
      vals.push(d.compute, d.effectiveCompute, d.cumulativeTraining);
    });
    return vals.filter(v => v > 0);
  }, [chartData]);

  const yDomain = useMemo(() => {
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    return [
      Math.pow(10, Math.floor(log10(min)) - 0.5),
      Math.pow(10, Math.ceil(log10(max)) + 0.5),
    ];
  }, [allValues]);

  const ticks = useMemo(() => yTicks(yDomain[0], yDomain[1]), [yDomain]);

  return (
    <div className="panel">
      <h2 className="mb-4 font-display text-xl font-medium text-text-primary">
        Compute Trajectory
      </h2>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
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
            tick={{ fontSize: 11, fill: '#7A7D8A', fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1E2028' }}
            scale="log"
            domain={yDomain as [number, number]}
            ticks={ticks}
            tickFormatter={yFormatter}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, fontFamily: 'Inter', paddingTop: 8 }}
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                compute: 'Hardware Compute',
                effectiveCompute: 'Effective Compute',
                cumulativeTraining: 'Cumulative Training FLOPs',
              };
              return labels[value] || value;
            }}
          />

          {/* AGI Threshold Range */}
          <ReferenceArea
            y1={1e29}
            y2={1e31}
            fill="#FFB84D"
            fillOpacity={0.08}
            strokeOpacity={0}
          />

          {/* Lines */}
          <Line
            type="monotone"
            dataKey="compute"
            stroke="#3B82F6"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 4"
            activeDot={{ r: 4, fill: '#3B82F6' }}
          />
          <Line
            type="monotone"
            dataKey="effectiveCompute"
            stroke="#00F0FF"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#00F0FF', stroke: '#040405', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="cumulativeTraining"
            stroke="#7B61FF"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#7B61FF' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Historical markers */}
      <div className="mt-4 flex flex-wrap gap-3">
        {historicalPoints.map((hp) => (
          <div key={hp.model} className="flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-blue" />
            <span className="data-text text-[11px] text-text-secondary">
              {hp.model} ({hp.year})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
