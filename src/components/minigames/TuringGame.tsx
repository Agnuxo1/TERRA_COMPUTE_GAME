import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { play } from '../../hooks/useSound';
import { t } from '../../i18n';
import { MinigameResultCard, MinigameShell, RetroButton } from './MinigameShell';
import type { MinigameProps, MinigameResult } from './types';
import {
  CODE_LEN, generateSecret, isValidGuess, scoreGuess, starsForAttempts, symbolLabel, turingConfig,
  type GuessRecord,
} from './logic/turing.ts';

import { turing as meta } from './meta';

export { meta };

const ACCENT = meta.accent;

function Lamp({ kind, size = 12 }: { kind: 'green' | 'amber' | 'off'; size?: number }) {
  const col = kind === 'green' ? '#00E5A0' : kind === 'amber' ? '#FFB84D' : '#2A2E42';
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: kind === 'off' ? '#15171F' : `radial-gradient(circle at 35% 30%, #fff9, ${col} 55%)`,
        border: `1px solid ${kind === 'off' ? '#2A2E42' : col}`,
        boxShadow: kind === 'off' ? 'inset 0 0 3px #000' : `0 0 ${size}px ${col}`,
        display: 'inline-block',
      }}
    />
  );
}

function Lamps({ exact, partial, size }: { exact: number; partial: number; size?: number }) {
  return (
    <span className="inline-flex gap-1">
      {Array.from({ length: CODE_LEN }, (_, i) => (
        <Lamp key={i} kind={i < exact ? 'green' : i < exact + partial ? 'amber' : 'off'} size={size} />
      ))}
    </span>
  );
}

export default function TuringGame({ difficulty, onComplete }: MinigameProps) {
  const cfg = turingConfig(difficulty);
  const secret = useMemo(() => generateSecret(difficulty, Math.floor(Math.random() * 1e9)), [difficulty]);
  const [guess, setGuess] = useState<number[]>(() => Array.from({ length: CODE_LEN }, (_, i) => i % cfg.symbols));
  const [focus, setFocus] = useState(0);
  const [history, setHistory] = useState<GuessRecord[]>([]);
  const [crossed, setCrossed] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<MinigameResult | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [shake, setShake] = useState(0);
  const completed = useRef(false);
  const tapeEnd = useRef<HTMLDivElement>(null);

  const finish = useCallback((r: MinigameResult) => {
    if (completed.current) return;
    completed.current = true;
    onComplete(r);
  }, [onComplete]);

  const valid = isValidGuess(difficulty, guess);
  const done = result !== null;

  const setRotor = useCallback((i: number, v: number) => {
    setGuess(g => g.map((x, j) => (j === i ? ((v % cfg.symbols) + cfg.symbols) % cfg.symbols : x)));
  }, [cfg.symbols]);

  const test = useCallback(() => {
    if (done) return;
    if (!valid) { play('alert'); setShake(s => s + 1); return; }
    const fb = scoreGuess(secret, guess);
    const next = [...history, { guess: guess.slice(), fb }];
    setHistory(next);
    if (fb.exact === CODE_LEN) {
      play('coin');
      const stars = starsForAttempts(difficulty, next.length);
      setResult({
        stars,
        summary: next.length === 1
          ? t('Rotors cracked in {n} test.', { n: next.length })
          : t('Rotors cracked in {n} tests.', { n: next.length }),
      });
    } else if (next.length >= cfg.maxAttempts) {
      play('alert');
      setResult({
        stars: 0,
        summary: t('Out of tests. The setting was {setting}.', { setting: secret.map(symbolLabel).join(' ') }),
      });
    } else {
      play(fb.exact + fb.partial > 0 ? 'tech' : 'click');
    }
  }, [done, valid, secret, guess, history, difficulty, cfg.maxAttempts]);

  useEffect(() => {
    tapeEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [history.length]);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setShowCard(true), 1100);
    return () => clearTimeout(timer);
  }, [result]);

  // keyboard: letters set the focused rotor, arrows move/cycle, Enter tests
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowLeft') { setFocus(f => (f + CODE_LEN - 1) % CODE_LEN); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setFocus(f => (f + 1) % CODE_LEN); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { setRotor(focus, guess[focus] + 1); play('click'); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { setRotor(focus, guess[focus] - 1); play('click'); e.preventDefault(); }
      else if (e.key === 'Backspace') { setFocus(f => (f + CODE_LEN - 1) % CODE_LEN); e.preventDefault(); }
      else if (e.key === 'Enter') { test(); e.preventDefault(); }
      else if (/^[a-z]$/i.test(e.key)) {
        const v = e.key.toUpperCase().charCodeAt(0) - 65;
        if (v < cfg.symbols) {
          setRotor(focus, v);
          setFocus(f => (f + 1) % CODE_LEN);
          play('click');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, focus, guess, cfg.symbols, setRotor, test]);

  const toggleCross = (s: number) => {
    play('click');
    setCrossed(c => {
      const n = new Set(c);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });
  };

  const attemptsLeft = cfg.maxAttempts - history.length;
  const last = history[history.length - 1];
  const dupHint = !valid && new Set(guess).size < CODE_LEN && !cfg.repeats;

  return (
    <MinigameShell
      meta={meta}
      status={t('TESTS {used}/{max} · 3★ ≤ {star3}', { used: history.length, max: cfg.maxAttempts, star3: cfg.star3 })}
      onAbandon={() => finish({ stars: 0, summary: t('Exercise abandoned.') })}
    >
      <div className="relative flex h-full w-full flex-col gap-3 md:flex-row md:items-stretch md:justify-center">
        {/* Rotor console */}
        <div
          className="flex flex-col items-center justify-between gap-2 rounded-lg p-3 md:w-[52%]"
          style={{ background: 'rgba(12,13,18,0.9)', border: `2px solid ${ACCENT}`, boxShadow: `0 0 26px ${ACCENT}33` }}
        >
          <div className="font-mono-data text-[10px] tracking-[0.25em]" style={{ color: ACCENT }}>
            {t('ROTOR BANK · {symbols} SYMBOLS · {mode}', {
              symbols: cfg.symbols,
              mode: cfg.repeats ? t('REPEATS ALLOWED') : t('NO REPEATS'),
            })}
          </div>

          <div key={shake} className="flex items-center justify-center gap-2 md:gap-3" style={shake ? { animation: 'turing-shake 0.3s' } : undefined}>
            {guess.map((g, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => { setFocus(i); setRotor(i, g + 1); play('click'); }}
                  disabled={done}
                  className="font-mono-data text-xs rounded px-3 py-0.5 transition-all hover:brightness-150 active:scale-90"
                  style={{ color: ACCENT, border: '1px solid var(--border-light)', background: '#0008' }}
                  aria-label={t('rotor {n} up', { n: i + 1 })}
                >▲</button>
                <button
                  onClick={() => { setFocus(i); setRotor(i, g + 1); play('click'); }}
                  disabled={done}
                  onContextMenu={e => { e.preventDefault(); setRotor(i, g - 1); play('click'); }}
                  title={t('Click to cycle. Right-click to go back.')}
                  className="font-orbitron font-black select-none transition-all hover:brightness-125 active:scale-95"
                  style={{
                    width: 'clamp(50px, 9vw, 84px)',
                    height: 'clamp(64px, 12vw, 110px)',
                    fontSize: 'clamp(28px, 5vw, 52px)',
                    color: '#3A2A08',
                    borderRadius: 10,
                    background: 'linear-gradient(180deg,#8f6a25 0%,#f5d27a 28%,#d9a93f 50%,#f5d27a 72%,#7a5a1e 100%)',
                    border: `3px solid ${focus === i && !done ? '#FFF4C2' : '#5a4210'}`,
                    boxShadow: focus === i && !done ? `0 0 18px ${ACCENT}, inset 0 0 12px #0006` : 'inset 0 0 12px #0006',
                    textShadow: '0 1px 0 #fff6',
                  }}
                >
                  {symbolLabel(g)}
                </button>
                <button
                  onClick={() => { setFocus(i); setRotor(i, g - 1); play('click'); }}
                  disabled={done}
                  className="font-mono-data text-xs rounded px-3 py-0.5 transition-all hover:brightness-150 active:scale-90"
                  style={{ color: ACCENT, border: '1px solid var(--border-light)', background: '#0008' }}
                  aria-label={t('rotor {n} down', { n: i + 1 })}
                >▼</button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <RetroButton accent={ACCENT} onClick={test} disabled={done || !valid} active className="px-6 py-2 text-sm font-bold tracking-widest">
              {t('TEST ⏎')}
            </RetroButton>
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('LAST RESULT')}</span>
              <Lamps exact={last?.fb.exact ?? 0} partial={last?.fb.partial ?? 0} size={14} />
            </div>
          </div>
          <div className="font-mono-data text-[10px] h-3" style={{ color: dupHint ? 'var(--rose)' : 'var(--text-tertiary)' }}>
            {dupHint ? t('This machine has no repeated rotors.') : t('{n} tests left', { n: attemptsLeft })}
          </div>

          {/* Note pad */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="font-mono-data text-[10px] mr-1" style={{ color: 'var(--text-tertiary)' }}>{t('NOTE PAD')}</span>
            {Array.from({ length: cfg.symbols }, (_, s) => (
              <button
                key={s}
                onClick={() => toggleCross(s)}
                title={t('Click to cross out / restore')}
                className="font-orbitron text-sm font-bold w-7 h-7 rounded transition-all hover:brightness-150"
                style={{
                  color: crossed.has(s) ? 'var(--text-tertiary)' : '#FFF4C2',
                  background: crossed.has(s) ? '#0008' : '#2A210E',
                  border: `1px solid ${crossed.has(s) ? 'var(--border-light)' : ACCENT + '99'}`,
                  textDecoration: crossed.has(s) ? 'line-through' : 'none',
                  opacity: crossed.has(s) ? 0.55 : 1,
                }}
              >
                {symbolLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Teleprinter tape */}
        <div
          className="flex min-h-[110px] flex-1 flex-col rounded-lg p-3 md:max-w-[340px]"
          style={{ background: 'rgba(12,13,18,0.9)', border: '1px solid var(--border-light)' }}
        >
          <div className="font-mono-data text-[10px] tracking-[0.25em] mb-1 flex justify-between" style={{ color: ACCENT }}>
            <span>{t('TELEPRINTER TAPE')}</span>
            <span style={{ color: 'var(--text-tertiary)' }}>
              <span style={{ color: '#00E5A0' }}>●</span> {t('exact')} <span style={{ color: '#FFB84D' }}>●</span> {t('misplaced')}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded p-2" style={{ background: '#F1E6BE', color: '#2b2412' }}>
            {history.length === 0 && (
              <div className="font-mono-data text-[11px] opacity-60">{t('No tests yet. Set the rotors and press TEST.')}</div>
            )}
            {history.map((h, i) => (
              <div
                key={i}
                className="animate-fade-up font-mono-data flex items-center justify-between border-b border-dashed py-1 text-sm"
                style={{ borderColor: '#2b241255' }}
              >
                <span className="opacity-60 w-6">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-bold tracking-[0.3em]">{h.guess.map(symbolLabel).join(' ')}</span>
                <span className="rounded px-1.5 py-1" style={{ background: '#15171F' }}>
                  <Lamps exact={h.fb.exact} partial={h.fb.partial} size={11} />
                </span>
              </div>
            ))}
            <div ref={tapeEnd} />
          </div>
        </div>

        {result && showCard && <MinigameResultCard meta={meta} result={result} onDone={() => finish(result)} />}
        {result && result.stars > 0 && !showCard && (
          <div className="pointer-events-none absolute inset-0 animate-pulse-glow" style={{ boxShadow: 'inset 0 0 80px #00E5A055' }} />
        )}
        <style>{`@keyframes turing-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
      </div>
    </MinigameShell>
  );
}
