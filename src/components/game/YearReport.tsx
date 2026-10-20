// Yearly report (Phase C1): a small card above the sector map that slides in for 8 s after each new year.
// Hidden while an event is open, dismissable, and the slide is skipped when reduce-motion is on.
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../App';
import { useSettings } from '../../lib/settings';
import { t } from '../../i18n';

const SHOW_MS = 8000;
const TONE = { good: '#00E5A0', bad: '#FF477E', info: '#00F0FF' } as const;

export default function YearReport() {
  const { state } = useGame();
  const [settings] = useSettings();
  const report = state.yearReport;
  const [shown, setShown] = useState(false);
  // The report that was current when this card mounted (e.g. from a loaded save) does not pop up again.
  const seen = useRef(report);

  useEffect(() => {
    if (!report || report === seen.current) return;
    seen.current = report;
    setShown(true);
    const id = setTimeout(() => setShown(false), SHOW_MS);
    return () => clearTimeout(id);
  }, [report]);

  if (!report) return null;
  const visible = shown && settings.yearReport && !state.activeEvent && report.lines.length > 0;
  const motion = settings.reduceMotion ? 'none' : 'transform 350ms ease-out, opacity 350ms ease-out';

  return (
    <div role="status" aria-live="polite" aria-hidden={!visible}
      className="absolute left-2 z-20 w-[248px] max-w-[calc(100%-1rem)] rounded p-2 font-mono-data"
      style={{
        bottom: 160,
        background: 'rgba(5,8,12,0.94)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        transform: visible ? 'translateX(0)' : 'translateX(-115%)',
        opacity: visible ? 1 : 0,
        transition: motion,
        pointerEvents: visible ? 'auto' : 'none',
      }}>
      <div className="flex items-center justify-between mb-1.5 font-mono-data text-[9px] tracking-widest">
        <span style={{ color: 'var(--cyan)' }}>{t('YEAR {year} REPORT', { year: report.year })}</span>
        <button type="button" aria-label={t('Dismiss yearly report')} onClick={() => setShown(false)}
          className="px-1 leading-none hover:brightness-150" style={{ color: 'var(--text-secondary)' }}>✕</button>
      </div>
      <ul className="flex flex-col gap-1">
        {report.lines.map((line, i) => (
          <li key={i} className="flex gap-1.5 text-[10px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
            <span aria-hidden="true" style={{ color: TONE[line.tone] }}>■</span>
            <span>{t(line.text, line.params)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
