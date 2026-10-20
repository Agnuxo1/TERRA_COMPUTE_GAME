// Era transitions (F3): when the year crosses into a new era during a game, a full-width newspaper
// overlay names the era and sets the nation against its state at the end of the previous era.
// The game keeps running underneath; a click or Esc dismisses it early. A new game or a loaded save
// resets the baseline silently, so only a real crossing shows the overlay.
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../App';
import { ERA_NAMES } from '../../game/data';
import { capabilityLabel, fmtMoney } from '../../game/format';
import type { GameState, HistoryPoint } from '../../game/types';
import { useSettings } from '../../lib/settings';
import { t } from '../../i18n';

const PAPER = '#f4efe2';
const INK = '#16140f';
const MUTED = '#6b6250';
const GOOD = '#1B7F5B';
const BAD = '#A3281E';
const SERIF = 'Georgia, "Times New Roman", Times, serif';
const SHOW_MS = 5000;
const SHOW_MS_REDUCED = 2500;

/** Same boundaries as the HUD year gauge (ResourceBar.tsx). */
function eraOf(year: number): number {
  return year < 1971 ? 1 : year < 1983 ? 2 : year < 2006 ? 3 : year < 2023 ? 4 : 5;
}
/** First year of each era (index = era number; 0 unused). */
const ERA_START = [0, 1960, 1971, 1983, 2006, 2023];

function headlineOf(era: number): string {
  switch (era) {
    case 2: return t('Microchips leave the lab and enter every factory');
    case 3: return t('The network goes public and the ledger goes digital');
    case 4: return t('Machines learn to learn, and the models outpace their makers');
    case 5: return t('Superintelligence stops being a thought experiment');
    default: return t('A new era begins');
  }
}

interface Stat { label: string; now: string; delta: string | null; tone: string }

/** The four headline numbers, each compared with the history point at the end of the previous era. */
function nationStats(s: GameState, before: HistoryPoint | null): Stat[] {
  const year = before?.year ?? 0;
  const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
  const toneOf = (n: number) => (n > 0 ? GOOD : n < 0 ? BAD : MUTED);
  const pctText = (now: number, was: number): { delta: string; tone: string } | null => {
    if (!before || was <= 0) return null;
    const n = Math.round(((now - was) / was) * 100);
    if (n === 0) return { delta: t('unchanged since {year}', { year }), tone: MUTED };
    return { delta: t('{sign}{n}% since {year}', { sign: sign(n), n: Math.abs(n), year }), tone: toneOf(n) };
  };
  const ptsText = (now: number, was: number): { delta: string; tone: string } | null => {
    if (!before) return null;
    const n = Math.round(now - was);
    if (n === 0) return { delta: t('unchanged since {year}', { year }), tone: MUTED };
    return { delta: t('{sign}{n} points since {year}', { sign: sign(n), n: Math.abs(n), year }), tone: toneOf(n) };
  };
  const gdp = pctText(s.eco.gdp, before?.gdp ?? 0);
  const compute = before ? { diff: s.capability - before.capability } : null;
  const computeDelta = compute && Math.abs(compute.diff) >= 0.05
    ? { delta: t('{sign}{n} orders of magnitude since {year}', { sign: sign(compute.diff), n: Math.abs(compute.diff).toFixed(1), year }), tone: toneOf(compute.diff) }
    : compute ? { delta: t('unchanged since {year}', { year }), tone: MUTED } : null;
  const align = ptsText(s.alignment, before?.alignment ?? 0);
  const approval = ptsText(s.approval, before?.approval ?? 0);
  return [
    { label: t('GDP'), now: fmtMoney(s.eco.gdp), delta: gdp?.delta ?? null, tone: gdp?.tone ?? MUTED },
    { label: t('Computing power'), now: t('{scale}FLOP class', { scale: capabilityLabel(s.capability) }), delta: computeDelta?.delta ?? null, tone: computeDelta?.tone ?? MUTED },
    { label: t('Alignment'), now: `${Math.round(s.alignment)}%`, delta: align?.delta ?? null, tone: align?.tone ?? MUTED },
    { label: t('Approval'), now: `${Math.round(s.approval)}%`, delta: approval?.delta ?? null, tone: approval?.tone ?? MUTED },
  ];
}

interface Shown { era: number; year: number; before: HistoryPoint | null; stats: Stat[] }

export default function EraTransition() {
  const { state } = useGame();
  const [settings] = useSettings();
  const [shown, setShown] = useState<Shown | null>(null);
  // The era, year and game last seen. Null until the first render of this game.
  const seen = useRef<{ key: string; era: number; year: number } | null>(null);
  const key = `${state.seed}|${state.startYear}|${state.playerContinent ?? ''}`;

  useEffect(() => {
    const era = eraOf(state.year);
    const prev = seen.current;
    seen.current = { key, era, year: state.year };
    // First render of a game, a loaded save (other game, year went back or jumped) or no era change: nothing to show.
    if (!prev || prev.key !== key || state.year < prev.year || state.year - prev.year > 3) return;
    if (era === prev.era) return;
    let before: HistoryPoint | null = null;
    for (const h of state.history) if (h.year < ERA_START[era]) before = h;
    setShown({ era, year: Math.floor(state.year), before, stats: nationStats(state, before) });
  }, [key, state]);

  useEffect(() => {
    if (!shown) return;
    const id = window.setTimeout(() => setShown(null), settings.reduceMotion ? SHOW_MS_REDUCED : SHOW_MS);
    // Capture phase + stopImmediatePropagation: Esc closes only this overlay, not the pause menu behind it.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); setShown(null); } };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [shown, settings.reduceMotion]);

  if (!shown) return null;

  return (
    <div role="status" aria-live="polite" onClick={() => setShown(null)}
      className="absolute inset-0 z-40 flex cursor-pointer items-center justify-center px-4 py-6"
      style={{ background: 'rgba(3,5,10,0.8)' }}>
      <article className="w-full" style={{
        maxWidth: 720, background: PAPER, color: INK, fontFamily: SERIF,
        border: '1px solid #b9ae92', boxShadow: '0 10px 60px rgba(0,0,0,0.6), inset 0 0 60px rgba(120,95,40,0.08)',
        padding: '14px 22px 18px',
      }}>
        <header className="text-center" style={{ borderTop: `3px double ${INK}`, borderBottom: `1px solid ${INK}`, padding: '6px 0 4px' }}>
          <div style={{ fontWeight: 900, letterSpacing: '0.06em', fontSize: 'clamp(1.3rem, 5vw, 2.1rem)', lineHeight: 1.1 }}>{t('The Terra Chronicle')}</div>
          <div className="font-mono-data" style={{ fontSize: 10, letterSpacing: '0.14em' }}>{t('Special edition · {year}', { year: shown.year })}</div>
        </header>
        <div className="text-center" style={{ margin: '14px 0 6px' }}>
          <div className="font-mono-data" style={{ fontSize: 11, letterSpacing: '0.3em', color: '#7a5a1e' }}>{t('A NEW ERA')}</div>
          <h2 style={{ margin: '4px 0 0', fontWeight: 900, lineHeight: 1, fontSize: 'clamp(2.4rem, 10vw, 5rem)' }}>{t(ERA_NAMES[shown.era])}</h2>
        </div>
        <h3 className="text-center" style={{ fontStyle: 'italic', fontWeight: 600, fontSize: 'clamp(1rem, 3.4vw, 1.3rem)', margin: '8px 0 14px' }}>
          {headlineOf(shown.era)}
        </h3>
        <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px', borderBottom: `1px solid ${INK}`, paddingBottom: 3 }}>
          {t('Your nation in {year}', { year: shown.year })}
        </h4>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3" style={{ margin: 0 }}>
          {shown.stats.map(st => (
            <div key={st.label} style={{ borderTop: `1px solid ${INK}`, paddingTop: 6 }}>
              <dt style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{st.label}</dt>
              <dd style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', lineHeight: 1.2 }}>{st.now}</dd>
              {st.delta && <dd style={{ margin: 0, fontSize: 12, color: st.tone }}>{st.delta}</dd>}
            </div>
          ))}
        </dl>
        <p className="text-center" style={{ fontSize: 11, color: MUTED, margin: '12px 0 0' }}>{t('Click or press Esc to continue')}</p>
      </article>
    </div>
  );
}
