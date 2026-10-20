import type { ReactNode } from 'react';
import { t } from '../../../i18n';

export function PanelHeader({ title, accent = 'var(--cyan)', onClose, right }: { title: string; accent?: string; onClose?: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.25)' }}>
      <h3 className="font-orbitron text-[11px] font-bold tracking-[0.2em]" style={{ color: accent }}>{title}</h3>
      <div className="flex items-center gap-2">
        {right}
        {onClose && (
          <button onClick={onClose} className="font-mono-data text-[10px] px-1.5 rounded hover:brightness-150" style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-light)' }} title={t('Close [Esc]')}>✕</button>
        )}
      </div>
    </div>
  );
}

export function Section({ title, children, accent = 'var(--text-tertiary)', right }: { title: string; children: ReactNode; accent?: string; right?: ReactNode }) {
  return (
    <section className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="font-mono-data text-[9.5px] tracking-[0.22em]" style={{ color: accent }}>{title}</h4>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Bar({ value, max = 100, color, height = 6, marker }: { value: number; max?: number; color: string; height?: number; marker?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="relative w-full rounded-sm overflow-hidden" style={{ height, background: 'rgba(255,255,255,0.06)' }}>
      <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}`, transition: 'width 300ms ease' }} />
      {marker !== undefined && (
        <div className="absolute inset-y-0" style={{ left: `${Math.max(0, Math.min(100, (marker / max) * 100))}%`, width: 2, background: '#FFF4C2' }} />
      )}
    </div>
  );
}

export function ActionButton({ children, onClick, color = 'var(--cyan)', disabled, title, small }: { children: ReactNode; onClick: () => void; color?: string; disabled?: boolean; title?: string; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-full rounded font-mono-data tracking-wider transition-all ${small ? 'text-[9.5px] py-1 px-1.5' : 'text-[11px] py-1.5 px-2'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-125 active:scale-[0.98]'}`}
      style={{ background: disabled ? 'transparent' : `color-mix(in srgb, ${color}, transparent 85%)`, color, border: `1px solid ${color}` }}
    >
      {children}
    </button>
  );
}

export function KV({ k, v, tone }: { k: string; v: ReactNode; tone?: 'good' | 'bad' | 'dim' | 'warn' }) {
  const color = tone === 'good' ? 'var(--green)' : tone === 'bad' ? 'var(--rose)' : tone === 'warn' ? 'var(--amber)' : tone === 'dim' ? 'var(--text-tertiary)' : 'var(--text-primary)';
  return (
    <div className="flex justify-between gap-2 font-mono-data text-[10px] leading-[1.55]">
      <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
      <span className="text-right" style={{ color }}>{v}</span>
    </div>
  );
}
