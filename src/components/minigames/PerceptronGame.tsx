import { useCallback, useMemo, useRef, useState } from 'react';
import { play } from '../../hooks/useSound';
import { MinigameResultCard, MinigameShell, RetroButton, StarRow } from './MinigameShell';
import type { MinigameProps, MinigameResult, Stars } from './types';
import {
  ACTION_BUDGET, B_MAX, B_MIN, B_STEP, DOMAIN, ENERGY, ROUNDS, W_MAX, W_MIN, W_STEP,
  clipHalfPlane, finalStars, generateDataset, lineSegment, misclassified, perceptronConfig, starsForActions, trainStep,
  type Params,
} from './logic/perceptron.ts';

import { perceptron as meta } from './meta';

export { meta };

const ACCENT = meta.accent;
const RED = '#FF477E';
const CYAN = '#00F0FF';
const VIEW = DOMAIN + 1;
const SQUARE = [{ x: -VIEW, y: -VIEW }, { x: VIEW, y: -VIEW }, { x: VIEW, y: VIEW }, { x: -VIEW, y: VIEW }];

const fmt = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));
const poly = (pts: { x: number; y: number }[]) => pts.map(p => `${p.x},${-p.y}`).join(' ');

/** A chunky parameter control: nixie readout, stepped slider, and -/+ buttons. */
function Knob({
  label, hint, value, min, max, step, disabled, onChange,
}: {
  label: string; hint: string; value: number; min: number; max: number; step: number; disabled: boolean;
  onChange: (v: number) => void;
}) {
  const bump = (dir: 1 | -1) => {
    const snapped = Math.round(value / step) * step;
    const next = Math.min(max, Math.max(min, snapped + dir * step));
    if (next !== value) onChange(next);
  };
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: '#05060A', border: '1px solid var(--border-light)' }}>
      <div className="w-[52px] shrink-0 leading-tight">
        <div className="font-orbitron text-sm font-black" style={{ color: '#FFF4C2' }}>{label}</div>
        <div className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{hint}</div>
      </div>
      <RetroButton accent={ACCENT} onClick={() => bump(-1)} disabled={disabled || value <= min} className="h-7 w-7 shrink-0 text-lg leading-none">−</RetroButton>
      <input
        type="range"
        className="pcp-range min-w-0 flex-1"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <RetroButton accent={ACCENT} onClick={() => bump(1)} disabled={disabled || value >= max} className="h-7 w-7 shrink-0 text-lg leading-none">+</RetroButton>
      <div
        className="font-mono-data w-[70px] shrink-0 rounded px-1.5 text-right text-base font-bold tabular-nums"
        style={{ color: ACCENT, background: '#010', border: `1px solid ${ACCENT}55`, textShadow: `0 0 8px ${ACCENT}` }}
      >
        {value >= 0 ? '+' : '−'}{fmt(Math.abs(value))}
      </div>
    </div>
  );
}

export default function PerceptronGame({ difficulty, onComplete }: MinigameProps) {
  const cfg = perceptronConfig(difficulty);
  const base = useMemo(() => Math.floor(Math.random() * 1e6) + 1, []);
  const datasets = useMemo(() => Array.from({ length: ROUNDS }, (_, r) => generateDataset(difficulty, base + r * 101)), [difficulty, base]);

  const [round, setRound] = useState(0);
  const [params, setParams] = useState<Params>(datasets[0].start);
  const [actions, setActions] = useState(0);
  const [energy, setEnergy] = useState(ENERGY);
  const [scores, setScores] = useState<number[]>([]);
  const [roundDone, setRoundDone] = useState<null | { stars: Stars; failed: boolean }>(null);
  const [final, setFinal] = useState<MinigameResult | null>(null);
  const last = useRef<{ key: string; t: number }>({ key: '', t: 0 });
  const completed = useRef(false);

  const ds = datasets[round];
  const wrong = useMemo(() => misclassified(params, ds.points), [params, ds]);
  const correct = ds.points.length - wrong.length;
  const locked = roundDone !== null || final !== null;

  const finish = useCallback((r: MinigameResult) => {
    if (completed.current) return;
    completed.current = true;
    onComplete(r);
  }, [onComplete]);

  const commit = (next: Params, key: string) => {
    if (locked) return;
    const now = Date.now();
    const merge = key !== 'train' && last.current.key === key && now - last.current.t < 700;
    last.current = { key, t: now };
    const n = actions + (merge ? 0 : 1);
    setParams(next);
    setActions(n);
    if (misclassified(next, ds.points).length === 0) {
      const stars = starsForActions(difficulty, n);
      play('coin');
      setRoundDone({ stars, failed: false });
    } else if (n >= ACTION_BUDGET) {
      play('alert');
      setRoundDone({ stars: 0, failed: true });
    } else if (!merge) {
      play('click');
    }
  };

  const setParam = (k: keyof Params) => (v: number) => commit({ ...params, [k]: v }, k);

  const train = () => {
    if (energy <= 0 || locked) return;
    const next = trainStep(params, ds.points);
    if (!next) return;
    setEnergy(e => e - 1);
    commit(next, 'train');
  };

  const nextRound = () => {
    if (!roundDone) return;
    const all = [...scores, roundDone.stars];
    setScores(all);
    if (round + 1 >= ROUNDS) {
      const stars = finalStars(all);
      const summary = `Rounds: ${all.map(s => `${s}★`).join(' · ')} - average ${(all.reduce((a, b) => a + b, 0) / all.length).toFixed(1)}.`;
      setFinal({ stars, summary });
      setRoundDone(null);
      return;
    }
    play('tech');
    setRound(round + 1);
    setParams(datasets[round + 1].start);
    setActions(0);
    setEnergy(ENERGY);
    setRoundDone(null);
  };

  const seg = lineSegment(params);
  const redPoly = clipHalfPlane(SQUARE, params, 1);
  const cyanPoly = clipHalfPlane(SQUARE, params, -1);
  const degenerate = params.w1 === 0 && params.w2 === 0;
  const norm = Math.hypot(params.w1, params.w2);
  const arrow = !degenerate && seg
    ? (() => {
        const mx = (seg[0].x + seg[1].x) / 2;
        const my = (seg[0].y + seg[1].y) / 2;
        const ux = params.w1 / norm;
        const uy = params.w2 / norm;
        return { x1: mx, y1: my, x2: mx + ux * 1.1, y2: my + uy * 1.1 };
      })()
    : null;

  const grid = [];
  for (let v = -DOMAIN; v <= DOMAIN; v++) {
    grid.push(
      <line key={`v${v}`} x1={v} y1={-VIEW} x2={v} y2={VIEW} stroke="#fff" strokeOpacity={v === 0 ? 0.35 : 0.08} strokeWidth={v === 0 ? 0.05 : 0.03} />,
      <line key={`h${v}`} x1={-VIEW} y1={v} x2={VIEW} y2={v} stroke="#fff" strokeOpacity={v === 0 ? 0.35 : 0.08} strokeWidth={v === 0 ? 0.05 : 0.03} />,
    );
  }

  const energyLamps = Array.from({ length: ENERGY }, (_, i) => i < energy);

  return (
    <MinigameShell
      meta={meta}
      wide
      status={`ROUND ${round + 1}/${ROUNDS} · ACTIONS ${actions}/${ACTION_BUDGET} · 3★ ≤ ${cfg.star3}`}
      onAbandon={() => finish({ stars: 0, summary: 'Exercise abandoned.' })}
    >
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 md:flex-row md:gap-5">
        {/* Plot */}
        <div
          className="relative aspect-square h-full max-h-[min(100%,620px)] shrink rounded-lg p-1.5"
          style={{ background: 'rgba(12,13,18,0.92)', border: `2px solid ${ACCENT}`, boxShadow: `0 0 28px ${ACCENT}33` }}
        >
          <svg viewBox={`${-VIEW} ${-VIEW} ${2 * VIEW} ${2 * VIEW}`} className="h-full w-full" role="img" aria-label="Scatter plot with decision line">
            {redPoly.length > 2 && <polygon points={poly(redPoly)} fill={RED} fillOpacity={0.13} />}
            {cyanPoly.length > 2 && <polygon points={poly(cyanPoly)} fill={CYAN} fillOpacity={0.1} />}
            {grid}
            {seg && (
              <line x1={seg[0].x} y1={-seg[0].y} x2={seg[1].x} y2={-seg[1].y} stroke={ACCENT} strokeWidth={0.12} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 0.15px ${ACCENT})`, transition: 'all .15s' }} />
            )}
            {arrow && (
              <g stroke={RED} strokeWidth={0.07} opacity={0.85}>
                <line x1={arrow.x1} y1={-arrow.y1} x2={arrow.x2} y2={-arrow.y2} />
                <circle cx={arrow.x2} cy={-arrow.y2} r={0.13} fill={RED} />
              </g>
            )}
            {ds.points.map((p, i) => {
              const bad = wrong.includes(i);
              const col = p.label === 1 ? RED : CYAN;
              return (
                <g key={i}>
                  {bad && <circle cx={p.x} cy={-p.y} r={0.42} fill="none" stroke={RED} strokeWidth={0.09} className="pcp-blink" />}
                  {p.label === 1
                    ? <circle cx={p.x} cy={-p.y} r={0.26} fill={col} stroke="#fff" strokeWidth={0.04} />
                    : <rect x={p.x - 0.24} y={-p.y - 0.24} width={0.48} height={0.48} fill={col} stroke="#fff" strokeWidth={0.04} />}
                </g>
              );
            })}
          </svg>
          {roundDone && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(5,5,8,0.66)' }}>
              <div className="animate-fade-up rounded-lg p-4 text-center" style={{ background: 'rgba(12,13,18,0.96)', border: `2px solid ${roundDone.failed ? RED : ACCENT}` }}>
                <div className="font-mono-data text-[10px] tracking-[0.3em]" style={{ color: roundDone.failed ? RED : ACCENT }}>
                  {roundDone.failed ? 'ADJUSTMENT BUDGET SPENT' : 'ALL SIGNALS SEPARATED'}
                </div>
                <StarRow stars={roundDone.stars} accent={ACCENT} size={28} />
                <div className="font-rajdhani text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {roundDone.failed ? 'Round lost.' : `${actions} adjustments.`}
                </div>
                <RetroButton accent={ACCENT} active onClick={nextRound} className="px-5 py-2 text-xs font-bold tracking-widest">
                  {round + 1 >= ROUNDS ? 'FINISH ▶' : 'NEXT ROUND ▶'}
                </RetroButton>
              </div>
            </div>
          )}
        </div>

        {/* Control panel */}
        <div
          className="flex max-h-full w-full max-w-[440px] flex-col gap-1.5 overflow-y-auto rounded-lg p-2.5 md:w-[440px]"
          style={{ background: 'rgba(12,13,18,0.9)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-data text-[10px] tracking-[0.25em]" style={{ color: ACCENT }}>WEIGHT BOARD</span>
            <span className="font-mono-data text-xs tabular-nums" style={{ color: wrong.length === 0 ? ACCENT : RED }}>
              {correct}/{ds.points.length} CORRECT
            </span>
          </div>
          <div className="font-mono-data text-[11px] text-center rounded py-1 tabular-nums" style={{ background: '#05060A', color: 'var(--text-secondary)' }}>
            {fmt(params.w1)}·x {params.w2 < 0 ? '−' : '+'} {fmt(Math.abs(params.w2))}·y {params.b < 0 ? '−' : '+'} {fmt(Math.abs(params.b))} = 0
          </div>
          <Knob label="w1" hint="tilt (x)" value={params.w1} min={W_MIN} max={W_MAX} step={W_STEP} disabled={locked} onChange={setParam('w1')} />
          <Knob label="w2" hint="tilt (y)" value={params.w2} min={W_MIN} max={W_MAX} step={W_STEP} disabled={locked} onChange={setParam('w2')} />
          <Knob label="b" hint="bias (slide)" value={params.b} min={B_MIN} max={B_MAX} step={B_STEP} disabled={locked} onChange={setParam('b')} />
          <div className="flex items-center gap-2">
            <RetroButton
              accent={ACCENT}
              active
              onClick={train}
              disabled={locked || energy <= 0 || wrong.length === 0}
              className="flex-1 px-3 py-2 text-xs font-bold tracking-widest"
              title="One Rosenblatt update: w += 0.25·label·input on the first wrong point"
            >
              TRAIN STEP ⚡
            </RetroButton>
            <div className="flex gap-1" title={`Energy ${energy}/${ENERGY}`}>
              {energyLamps.map((on, i) => (
                <span key={i} style={{ width: 8, height: 18, borderRadius: 2, background: on ? '#FFB84D' : '#1A1C26', boxShadow: on ? '0 0 6px #FFB84D' : 'none' }} />
              ))}
            </div>
          </div>
          <div className="pcp-hint font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Red ● must sit in the red-shaded side (the arrow points there). Cyan ■ on the other.
          </div>
        </div>

        {final && <MinigameResultCard meta={meta} result={final} onDone={() => finish(final)} />}
        <style>{`
          @media (max-height:520px){.pcp-hint{display:none}}
          @keyframes pcp-blink{0%,100%{opacity:1}50%{opacity:.15}}
          .pcp-blink{animation:pcp-blink .7s ease-in-out infinite}
          .pcp-range{-webkit-appearance:none;appearance:none;height:26px;background:transparent;cursor:pointer}
          .pcp-range::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:linear-gradient(90deg,#0a2a0a,#1c4d1c)}
          .pcp-range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:26px;margin-top:-9px;border-radius:5px;background:linear-gradient(180deg,#d8ffd8,#33FF33 55%,#0c7a0c);border:2px solid #051;box-shadow:0 0 10px #33FF3388}
          .pcp-range::-moz-range-track{height:8px;border-radius:4px;background:linear-gradient(90deg,#0a2a0a,#1c4d1c)}
          .pcp-range::-moz-range-thumb{width:18px;height:24px;border-radius:5px;background:#33FF33;border:2px solid #051;box-shadow:0 0 10px #33FF3388}
          .pcp-range:disabled{opacity:.4;cursor:not-allowed}
          .pcp-range:hover::-webkit-slider-thumb{filter:brightness(1.2)}
        `}</style>
      </div>
    </MinigameShell>
  );
}
