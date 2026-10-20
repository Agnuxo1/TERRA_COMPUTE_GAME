import { useEffect, useRef, useState } from 'react';
import { useGame, continents } from '../App';
import type { Difficulty } from '../game/types';
import { SCENARIOS, buildScenario, type ScenarioDef } from '../game/scenarios';
import { play } from '../hooks/useSound';
import { t } from '../i18n';

const ACCENT = '#FFB020';

// Built at render time so the labels follow the active language.
function buildDifficulties(): Array<{ id: Difficulty; label: string; color: string; text: string }> {
  return [
    { id: 'easy', label: t('EASY'), color: 'var(--green)', text: t('Rivals research slower, milder climate, more starting budget.') },
    { id: 'normal', label: t('NORMAL'), color: 'var(--cyan)', text: t('The historical race as balanced. Recommended first game.') },
    { id: 'hard', label: t('HARD'), color: 'var(--rose)', text: t('Rivals research faster, harsher climate, less starting budget.') },
  ];
}

export default function ScenarioSelect() {
  const { dispatch } = useGame();
  const [selected, setSelected] = useState<ScenarioDef['id']>(SCENARIOS[0].id);
  const [continent, setContinent] = useState<string>(SCENARIOS[0].continentHint ?? 'eu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const difficulties = buildDifficulties();
  const def = SCENARIOS.find(s => s.id === selected) ?? SCENARIOS[0];

  // Cancel a pending build when the page unmounts.
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const pickScenario = (sc: ScenarioDef) => {
    play('click');
    setSelected(sc.id);
    if (sc.continentHint) setContinent(sc.continentHint);
    setError(null);
  };

  const begin = () => {
    if (busy) return;
    play('coin');
    setBusy(true);
    setError(null);
    // Let the "Preparing the world…" label paint before the (synchronous) fast-forward runs.
    timer.current = window.setTimeout(() => {
      timer.current = null;
      try {
        const state = buildScenario(selected, continent, Date.now() % 1e9, difficulty);
        dispatch({ type: 'LOAD_STATE', state });
      } catch {
        setError(t('Could not prepare this scenario. Try another faction or difficulty.'));
        setBusy(false);
      }
    }, 60);
  };

  const handleBack = () => {
    play('click');
    dispatch({ type: 'SET_SCREEN', screen: 'title' });
  };

  const faction = continents.find(c => c.id === continent);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-4 relative overflow-y-auto"
      style={{ background: 'var(--bg-primary)' }}>

      <div className="text-center mb-1">
        <h1 className="font-orbitron text-2xl md:text-3xl font-bold tracking-wider"
          style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}44` }}>
          {t('SCENARIOS')}
        </h1>
        <p className="font-rajdhani text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {t('Historical starting points. Pick a moment, a faction and a difficulty.')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 w-full max-w-6xl">
        {SCENARIOS.map((sc, index) => {
          const on = sc.id === selected;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => pickScenario(sc)}
              disabled={busy}
              aria-pressed={on}
              className="text-left rounded-xl p-4 flex flex-col gap-2 transition-all duration-300 hover:brightness-110 disabled:opacity-60"
              style={{
                background: on ? `color-mix(in srgb, ${ACCENT}, transparent 88%)` : 'rgba(11,12,16,0.85)',
                border: `2px solid ${on ? ACCENT : 'var(--border-light)'}`,
                boxShadow: on ? `0 0 20px ${ACCENT}33` : 'none',
                animation: `fadeSlideUp 0.6s ease ${index * 0.1}s both`,
              }}
            >
              <span className="font-mono-data text-[11px] tracking-wider" style={{ color: ACCENT }}>
                {sc.year}
              </span>
              <h2 className="font-orbitron text-sm font-bold tracking-wider leading-snug" style={{ color: on ? ACCENT : 'var(--text-primary)' }}>
                {t(sc.name)}
              </h2>
              <p className="font-rajdhani text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {t(sc.blurb)}
              </p>
              <ul className="flex flex-col gap-1 mt-auto pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                {sc.goals.map((g, i) => (
                  <li key={i} className="flex items-start gap-1.5 font-rajdhani text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    <span style={{ color: ACCENT, fontSize: '8px', marginTop: 3 }}>◆</span>
                    <span>{t(g)}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
        <div className="flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label={t('Faction')}>
          {continents.map(c => {
            const on = c.id === continent;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={busy}
                onClick={() => { play('click'); setContinent(c.id); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-rajdhani text-xs transition-all hover:brightness-125 disabled:opacity-60"
                style={{
                  background: on ? `color-mix(in srgb, ${c.color}, transparent 75%)` : 'rgba(11,12,16,0.85)',
                  border: `1px solid ${on ? c.color : 'var(--border-light)'}`,
                  color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: c.color }} />
                {t(c.name)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1" role="radiogroup" aria-label={t('Difficulty')}>
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
            {difficulties.map(d => {
              const on = d.id === difficulty;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={busy}
                  onClick={() => { play('click'); setDifficulty(d.id); }}
                  title={d.text}
                  className="font-orbitron text-[10px] font-bold tracking-[0.18em] px-3 py-2 transition-all disabled:opacity-60"
                  style={{
                    background: on ? `color-mix(in srgb, ${d.color}, transparent 80%)` : 'rgba(11,12,16,0.85)',
                    color: on ? d.color : 'var(--text-tertiary)',
                    boxShadow: on ? `inset 0 -2px 0 ${d.color}` : 'none',
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <span className="font-rajdhani text-[11px] text-center leading-tight" style={{ color: 'var(--text-secondary)', maxWidth: 300 }}>
            {difficulties.find(d => d.id === difficulty)?.text}
          </span>
        </div>

        <button
          type="button"
          onClick={begin}
          disabled={busy}
          className="px-8 py-3 rounded font-orbitron text-xs font-bold tracking-widest transition-all hover:brightness-125 disabled:cursor-wait"
          style={{ background: `color-mix(in srgb, ${ACCENT}, transparent 80%)`, color: ACCENT, border: `1px solid ${ACCENT}` }}
        >
          {busy ? t('Preparing the world…') : <>▶ {t('BEGIN SCENARIO')}</>}
        </button>
        <span className="font-rajdhani text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          {faction ? t('{scenario} as {faction}, {year}.', { scenario: t(def.name), faction: t(faction.name), year: def.year }) : ''}
        </span>
        {error && (
          <span role="alert" className="font-rajdhani text-xs" style={{ color: 'var(--rose)' }}>{error}</span>
        )}
      </div>

      <button onClick={handleBack} disabled={busy}
        className="px-4 py-1.5 rounded font-orbitron text-[9px] font-bold tracking-wider transition-all hover:brightness-125 disabled:opacity-60"
        style={{ background: 'var(--surface-elevated)', color: ACCENT, border: `1px solid ${ACCENT}55` }}>
        ← {t('BACK TO MENU')}
      </button>
    </div>
  );
}
