import { useEffect, useMemo, useRef, useState } from 'react';
import { play } from '../../hooks/useSound';
import { t } from '../../i18n';
import { MinigameShell, MinigameResultCard } from './MinigameShell';
import type { MinigameProps, MinigameResult } from './types';
import { mulberry32 } from './logic/rng.ts';
import {
  drawItems, attentionWeights, streakMultiplier, secondsPerItem, scoreAttention,
} from './logic/attention.ts';

import { attention as meta } from './meta';

export { meta };

const ACCENT = meta.accent;
const ROUNDS = 8;
/** Placeholder marking where a styled value goes inside a translated sentence. */
const SLOT = '\u0001';

interface Answered {
  chosen: number | null;
  correct: boolean;
  weights: number[];
  arcs: { i: number; d: string; w: number }[];
}

export default function AttentionGame({ difficulty, onComplete }: MinigameProps) {
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000_000));
  const items = useMemo(() => drawItems(seed, ROUNDS), [seed]);
  const limit = secondsPerItem(difficulty) * 1000;

  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [gain, setGain] = useState(0);
  const [result, setResult] = useState<MinigameResult | null>(null);
  const [shakeQuery, setShakeQuery] = useState(false);

  const item = items[idx];
  const padTop = Math.round(Math.min(96, Math.max(44, window.innerHeight * 0.13)));
  const containerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const finished = useRef(false);

  const finish = (r: MinigameResult) => {
    if (finished.current) return;
    finished.current = true;
    onComplete(r);
  };

  const choose = (chosen: number | null) => {
    if (answered) return;
    const correct = chosen === item.answer;
    const weights = attentionWeights(item, mulberry32(seed + idx * 97));

    // Measure chip centres for the arcs.
    const box = containerRef.current?.getBoundingClientRect();
    const arcs: Answered['arcs'] = [];
    if (box) {
      const q = chipRefs.current[item.query]?.getBoundingClientRect();
      if (q) {
        const x1 = q.left + q.width / 2 - box.left;
        const y1 = q.top - box.top;
        weights.forEach((w, i) => {
          if (i === item.query) return;
          const r = chipRefs.current[i]?.getBoundingClientRect();
          if (!r) return;
          const x2 = r.left + r.width / 2 - box.left;
          const y2 = r.top - box.top;
          const dx = Math.abs(x2 - x1);
          const cy = Math.min(y1, y2) - 10 - Math.min(dx * 0.5, padTop - 10);
          arcs.push({ i, d: `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${cy} ${x2} ${y2}`, w });
        });
      }
    }

    const mult = streakMultiplier(correct ? streak + 1 : 0);
    const left = Math.max(0, 1 - elapsed / limit);
    const points = correct ? Math.round(100 * mult + left * 50) : 0;

    if (correct) {
      play(streak + 1 >= 3 ? 'coin' : 'tech');
      setCorrectCount(c => c + 1);
      setStreak(s => s + 1);
    } else {
      play('alert');
      setStreak(0);
    }
    setGain(points);
    setScore(s => s + points);
    setAnswered({ chosen, correct, weights, arcs });
  };

  // Countdown per round.
  const chooseRef = useRef(choose);
  chooseRef.current = choose;
  useEffect(() => {
    if (answered || result) return;
    const t0 = performance.now();
    const id = setInterval(() => {
      const e = performance.now() - t0;
      if (e >= limit) {
        clearInterval(id);
        setElapsed(limit);
        chooseRef.current(null);
      } else {
        setElapsed(e);
      }
    }, 80);
    return () => clearInterval(id);
  }, [idx, answered, result, limit]);

  const advance = () => {
    if (!answered) return;
    play('click');
    if (idx + 1 >= ROUNDS) {
      const stars = scoreAttention(correctCount);
      setResult({
        stars,
        summary: t('{correct} of {rounds} referents resolved. Score {score}.', { correct: correctCount, rounds: ROUNDS, score }),
      });
      return;
    }
    setIdx(i => i + 1);
    setElapsed(0);
    setAnswered(null);
    setGain(0);
  };

  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    if (!answered || result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advanceRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, result]);

  const remaining = Math.max(0, 1 - elapsed / limit);
  const barColor = remaining > 0.5 ? '#00E5A0' : remaining > 0.25 ? '#FFB84D' : '#FF477E';
  const maxW = answered ? Math.max(...answered.weights) : 1;
  const mult = streakMultiplier(streak);
  const queryWord = item.tokens[item.query].replace(/[^\w']/g, '');
  const answerWord = item.tokens[item.answer].replace(/[^\w']/g, '');
  // The query word is styled, so the prompt sentence is split around it (the translation stays whole).
  const [promptBefore, promptAfter] = t('What does "{word}" refer to?', { word: SLOT }).split(SLOT);

  return (
    <MinigameShell
      meta={meta}
      status={t('SENTENCE {idx}/{rounds} · SCORE {score}', { idx: idx + 1, rounds: ROUNDS, score })}
      onAbandon={() => finish({ stars: 0, summary: t('Exercise abandoned.') })}
      wide
    >
      <style>{`
        @keyframes att-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes att-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes att-float { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-26px); opacity: 0; } }
      `}</style>
      <div className="relative h-full w-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full flex-col items-center justify-center gap-2 px-2 py-1 md:gap-4">
        {/* HUD */}
        <div className="flex w-full max-w-4xl items-center gap-3">
          <div className="font-mono-data text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {t('STREAK')} <span style={{ color: mult > 1 ? '#FFB84D' : 'var(--text-primary)' }}>{streak}</span>
            {' · '}
            <span className="font-orbitron text-sm font-black" style={{ color: mult > 1 ? '#FFB84D' : ACCENT }}>x{mult}</span>
          </div>
          <div className="relative h-3 flex-1 overflow-hidden rounded-sm" style={{ background: '#0a0b10', border: '1px solid var(--border-light)' }}>
            <div
              className="h-full"
              style={{
                width: `${(answered ? Math.max(0, remaining) : remaining) * 100}%`,
                background: barColor,
                boxShadow: `0 0 10px ${barColor}`,
                transition: 'width 0.08s linear',
              }}
            />
          </div>
          <div className="font-mono-data w-12 text-right text-[11px]" style={{ color: barColor }}>
            {(remaining * limit / 1000).toFixed(1)}s
          </div>
        </div>

        {/* Prompt */}
        <div className="text-center">
          <div className="font-mono-data text-[10px] tracking-[0.3em]" style={{ color: ACCENT }}>
            {t('RESOLVE THE REFERENT')}
          </div>
          <div className="font-orbitron text-lg font-black md:text-2xl" style={{ color: '#FFF4C2' }}>
            {promptBefore}<span style={{ color: ACCENT, textShadow: `0 0 12px ${ACCENT}` }}>{queryWord}</span>{promptAfter}
          </div>
        </div>

        {/* Tokens + arcs */}
        <div
          className="relative w-full max-w-4xl rounded-lg px-3 pb-4 md:px-6"
          style={{ paddingTop: padTop, background: 'rgba(12,13,18,0.88)', border: `1px solid ${ACCENT}66`, boxShadow: `0 0 30px ${ACCENT}22` }}
        >
          <div ref={containerRef} className="relative">
            {answered && (
              <svg className="pointer-events-none absolute left-0 top-0 h-full w-full" style={{ overflow: 'visible', zIndex: 3 }}>
                {answered.arcs.map(a => {
                  const isAns = a.i === item.answer;
                  const weak = a.w < 0.035;
                  return (
                    <path
                      key={a.i}
                      d={a.d}
                      pathLength={1}
                      fill="none"
                      stroke={isAns ? '#00E5A0' : ACCENT}
                      strokeWidth={Math.max(1, a.w * 22)}
                      strokeLinecap="round"
                      strokeDasharray={1}
                      opacity={weak ? 0.25 : Math.min(1, 0.35 + a.w * 1.4)}
                      style={{ animation: 'att-draw 0.7s ease-out both', filter: isAns ? 'drop-shadow(0 0 6px #00E5A0)' : undefined }}
                    />
                  );
                })}
              </svg>
            )}

            <div className="flex flex-wrap items-start justify-center gap-x-2 gap-y-4 md:gap-x-3">
              {item.tokens.map((tok, i) => {
                const isQuery = i === item.query;
                const w = answered ? answered.weights[i] : 0;
                const isAns = !!answered && i === item.answer;
                const isWrongPick = !!answered && answered.chosen === i && !answered.correct;
                const heat = answered && !isQuery ? Math.min(1, w / maxW) : 0;
                return (
                  <button
                    key={i}
                    ref={el => { chipRefs.current[i] = el; }}
                    disabled={!!answered}
                    onClick={() => {
                      if (isQuery) { setShakeQuery(true); setTimeout(() => setShakeQuery(false), 400); return; }
                      choose(i);
                    }}
                    className="relative flex flex-col items-center rounded-md px-2 py-1.5 transition-all md:px-3"
                    style={{
                      fontSize: 'clamp(14px, min(2.3vw, 4vh), 26px)',
                      cursor: answered ? 'default' : isQuery ? 'not-allowed' : 'pointer',
                      color: isQuery ? '#FFF4C2' : 'var(--text-primary)',
                      background: isQuery
                        ? `${ACCENT}44`
                        : answered ? `rgba(179,136,255,${0.06 + heat * 0.4})` : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${isAns ? '#00E5A0' : isWrongPick ? '#FF477E' : isQuery ? ACCENT : 'var(--border-light)'}`,
                      boxShadow: isQuery ? `0 0 18px ${ACCENT}99` : isAns ? '0 0 16px #00E5A099' : isWrongPick ? '0 0 16px #FF477E99' : 'none',
                      animation: isQuery && shakeQuery ? 'att-shake 0.35s' : undefined,
                      zIndex: 4,
                    }}
                    onMouseEnter={e => { if (!answered && !isQuery) e.currentTarget.style.borderColor = ACCENT; }}
                    onMouseLeave={e => { if (!answered && !isQuery) e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                  >
                    <span className="font-rajdhani font-bold leading-none">{tok}</span>
                    <span className="font-mono-data mt-1 h-3 text-[10px] leading-3" style={{ color: isAns ? '#00E5A0' : 'var(--text-secondary)' }}>
                      {isQuery ? (answered ? t('query') : t('QUERY')) : answered ? `${Math.round(w * 100)}%` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="flex min-h-[96px] w-full max-w-4xl flex-col items-center gap-1 text-center">
          {!answered ? (
            <div className="font-rajdhani text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {t('Click the word the highlighted token points back to.')}
            </div>
          ) : (
            <>
              <div className="relative font-orbitron text-lg font-black" style={{ color: answered.correct ? '#00E5A0' : '#FF477E' }}>
                {answered.correct
                  ? t('CORRECT: {word}', { word: answerWord })
                  : answered.chosen === null
                    ? t("TIME'S UP: it was {word}", { word: answerWord })
                    : t('NOT QUITE: it was {word}', { word: answerWord })}
                {gain > 0 && (
                  <span className="font-mono-data absolute -right-14 top-0 text-sm" style={{ color: '#FFB84D', animation: 'att-float 1.2s ease-out forwards' }}>
                    +{gain}
                  </span>
                )}
              </div>
              <div className="font-rajdhani text-base" style={{ color: 'var(--text-primary)' }}>{item.explain}</div>
              <button
                autoFocus
                onClick={advance}
                className="animate-pulse-glow rounded px-8 py-2 font-orbitron text-sm font-bold tracking-wider transition-all hover:brightness-125"
                style={{ background: `${ACCENT}22`, color: ACCENT, border: `2px solid ${ACCENT}` }}
              >
                {idx + 1 >= ROUNDS ? t('FINISH ▶') : t('NEXT ▶')}
              </button>
            </>
          )}
        </div>

      </div>
        {result && <MinigameResultCard meta={meta} result={result} onDone={() => finish(result)} />}
      </div>
    </MinigameShell>
  );
}
