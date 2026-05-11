import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { YearlyData } from '@/lib/simulation';

interface InvestmentChartProps {
  data: YearlyData[];
}

interface ChartPoint {
  year: number;
  chips: number;
  datacenters: number;
  rd: number;
  energy: number;
  total: number;
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
            {p.dataKey === 'chips' && 'AI Chips'}
            {p.dataKey === 'datacenters' && 'Data Centers'}
            {p.dataKey === 'rd' && 'R&D'}
            {p.dataKey === 'energy' && 'Energy'}
            {p.dataKey === 'total' && 'Total'}
          </span>
          <span className="data-text text-text-primary">${p.value.toFixed(1)}B</span>
        </div>
      ))}
    </div>
  );
};

export default function InvestmentChart({ data }: InvestmentChartProps) {
  const chartData = useMemo<ChartPoint[]>(() => {
    return data.map(d => ({
      year: d.year,
      chips: d.investChips,
      datacenters: d.investDC,
      rd: d.investRD,
      energy: d.investEnergy,
      total: d.totalInvestment,
    }));
  }, [data]);

  return (
    <div className="panel">
      <h2 className="mb-4 font-display text-xl font-medium text-text-primary">
        Investment Distribution
      </h2>
      <p className="mb-4 text-[13px] text-text-secondary">
        Stacked area showing allocation of AI investment across categories over time.
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="chipsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="dcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="rdGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7B61FF" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#7B61FF" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB84D" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#FFB84D" stopOpacity={0.05} />
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
            tick={{ fontSize: 11, fill: '#7A7D8A', fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1E2028' }}
            tickFormatter={(v: number) => `$${v.toFixed(0)}B`}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, fontFamily: 'Inter', paddingTop: 8 }}
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                chips: 'AI Chips',
                datacenters: 'Data Centers',
                rd: 'R&D',
                energy: 'Energy',
              };
              return labels[value] || value;
            }}
          />

          <Area
            type="monotone"
            dataKey="energy"
            stackId="1"
            stroke="#FFB84D"
            strokeWidth={1}
            fill="url(#energyGrad)"
          />
          <Area
            type="monotone"
            dataKey="rd"
            stackId="1"
            stroke="#7B61FF"
            strokeWidth={1}
            fill="url(#rdGrad)"
          />
          <Area
            type="monotone"
            dataKey="datacenters"
            stackId="1"
            stroke="#3B82F6"
            strokeWidth={1}
            fill="url(#dcGrad)"
          />
          <Area
            type="monotone"
            dataKey="chips"
            stackId="1"
            stroke="#00F0FF"
            strokeWidth={1}
            fill="url(#chipsGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
