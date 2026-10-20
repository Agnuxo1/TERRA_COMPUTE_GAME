// Post-game statistics: three history charts, run summary and achievements earned this game.
// Shared by GameOverScreen and VictoryScreen.
import { useState, type ReactNode } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GameState } from '../../game/types';
import { evaluate, type Achievement } from '../../game/achievements';
import { fmtMoney } from '../../game/format';
import { continentName } from './SaveSlots';
import { t } from '../../i18n';

const AXIS = { fill: 'var(--text-tertiary)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' };
const GRID = 'rgba(255,255,255,0.07)';

const tooltipStyle = {
  contentStyle: { background: 'rgba(11,12,16,0.95)', border: '1px solid var(--border-light)', borderRadius: 4, padding: '4px 8px' },
  labelStyle: { color: '#FFF4C2', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 },
  itemStyle: { fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: 0 },
};

function ChartCard({ title, legend, children }: { title: string; legend: Array<[string, string]>; children: ReactNode }) {
  return (
    <div className="flex flex-col min-w-0 rounded px-2 pt-1.5 pb-1" style={{ background: 'rgba(11,12,16,0.72)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="font-mono-data text-[9px] tracking-[0.2em] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>{title}</span>
        <span className="flex gap-2 flex-wrap justify-end">
          {legend.map(([label, color]) => (
            <span key={label} className="flex items-center gap-1 font-mono-data text-[8.5px]" style={{ color }}>
              <span style={{ width: 8, height: 2, background: color, display: 'inline-block' }} />{label}
            </span>
          ))}
        </span>
      </div>
      <div className="end-chart" style={{ width: '100%' }}>{children}</div>
    </div>
  );
}

export default function EndStats({ state, accent }: { state: GameState; accent: string }) {
  // Evaluate once per finished game (evaluate() is idempotent per state object).
  const [fresh] = useState<Achievement[]>(() => evaluate(state));
  const data = state.history.length
    ? state.history
    : [{ year: Math.floor(state.year), gdp: state.eco.gdp, capability: state.capability, rivalTop: 0, planetHealth: state.planetHealth, approval: state.approval, alignment: state.alignment }];
  const capMin = Math.floor(Math.min(...data.map(d => Math.min(d.capability, d.rivalTop || d.capability))));

  const summary: Array<[string, string]> = [
    [t('FACTION'), continentName(state.playerContinent)],
    [t('MODE'), (state.gameMode ?? '—').toUpperCase()],
    [t('DIFFICULTY'), (state.difficulty ?? 'normal').toUpperCase()],
    [t('YEARS'), `${state.startYear}–${Math.floor(state.year)}`],
  ];

  return (
    <div className="w-full flex flex-col gap-2">
      <style>{`
        .end-chart { height: 112px; }
        @media (max-height: 620px) { .end-chart { height: 84px; } }
      `}</style>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 font-mono-data text-[9.5px] tracking-[0.15em]">
        {summary.map(([k, v]) => (
          <span key={k} style={{ color: 'var(--text-tertiary)' }}>{k} <span style={{ color: accent }}>{v}</span></span>
        ))}
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <ChartCard title={t('COMPUTE · LOG10 FLOPS')} legend={[[t('YOU'), '#00F0FF'], [t('TOP RIVAL'), '#FF477E']]}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -26 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="year" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={18} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[Math.max(0, capMin), 25]} allowDecimals={false} />
              <ReferenceLine y={24} stroke="#FFF4C2" strokeDasharray="4 3" label={{ value: t('ASI 10^24'), position: 'insideTopLeft', fill: '#FFF4C2', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => `10^${Number(v).toFixed(1)}`} />
              <Line type="monotone" dataKey="capability" name={t('You')} stroke="#00F0FF" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="rivalTop" name={t('Top rival')}stroke="#FF477E" strokeWidth={1.5} strokeDasharray="3 2" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('PLANET · PEOPLE · SAFETY %')} legend={[[t('PLANET'), '#00E5A0'], [t('APPROVAL'), '#FFB84D'], [t('ALIGN'), '#B794FF']]}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -26 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="year" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={18} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 50, 100]} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => `${Math.round(Number(v))}%`} />
              <Line type="monotone" dataKey="planetHealth" name={t('Planet')} stroke="#00E5A0" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="approval" name={t('Approval')} stroke="#FFB84D" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="alignment" name={t('Alignment')}stroke="#B794FF" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('GDP')} legend={[[t('GDP / YEAR'), '#FFF4C2']]}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="year" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={18} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtMoney(v)} width={44} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => fmtMoney(Number(v))} />
              <Line type="monotone" dataKey="gdp" name={t('GDP')}stroke="#FFF4C2" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="font-mono-data text-[9px] tracking-[0.2em]" style={{ color: 'var(--text-tertiary)' }}>
          {fresh.length ? t('ACHIEVEMENTS UNLOCKED') : t('NO NEW ACHIEVEMENTS THIS GAME')}
        </span>
        {fresh.map(a => (
          <span
            key={a.id}
            title={t(a.description)}
            className="flex items-center gap-1 px-2 py-0.5 rounded font-orbitron text-[9px] font-bold tracking-wider"
            style={{ color: accent, border: `1px solid ${accent}`, background: 'rgba(11,12,16,0.8)', boxShadow: `0 0 10px color-mix(in srgb, ${accent}, transparent 75%)` }}
          >
            <span>{a.icon}</span>{t(a.name)}
          </span>
        ))}
      </div>
    </div>
  );
}
