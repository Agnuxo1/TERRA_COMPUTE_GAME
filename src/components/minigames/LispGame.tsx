import { useCallback, useMemo, useRef, useState, type DragEvent } from 'react';
import { play } from '../../hooks/useSound';
import { MinigameResultCard, MinigameShell, RetroButton } from './MinigameShell';
import type { MinigameProps, MinigameResult } from './types';
import {
  LEVELS, MAX_WRONG_EVALS, atomLabel, evalStages, finalStars, generateLevel, levelPoints, listText, opDef, sameList,
  type Atom,
} from './logic/lisp.ts';

import { lisp as meta } from './meta';

export { meta };

const ACCENT = meta.accent;
const CREAM = '#E9DFB8';

function Atoms({ list, target, dim }: { list: readonly Atom[]; target?: readonly Atom[]; dim?: boolean }) {
  if (list.length === 0) {
    return <span className="font-mono-data text-xs" style={{ color: 'var(--text-tertiary)' }}>( )</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-[3px]">
      {list.map((a, i) => {
        const hit = target && target[i] === a;
        return (
          <span
            key={i}
            className="font-orbitron inline-flex items-center justify-center rounded-sm text-[11px] font-bold"
            style={{
              width: 20,
              height: 22,
              color: dim ? 'var(--text-secondary)' : '#FFF4C2',
              background: '#0A1A1E',
              border: `1px solid ${hit ? '#00E5A0' : ACCENT + '66'}`,
              boxShadow: hit ? '0 0 6px #00E5A066' : 'none',
            }}
          >
            {atomLabel(a)}
          </span>
        );
      })}
    </span>
  );
}

function Card({
  op, onClick, onDragStart, compact,
}: { op: string; onClick?: () => void; onDragStart?: (e: DragEvent) => void; compact?: boolean }) {
  const d = opDef(op);
  return (
    <button
      type="button"
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onClick={onClick}
      title={d.desc}
      className="lisp-card group relative text-left transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
      style={{
        background: CREAM,
        color: '#2b2412',
        clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
        padding: compact ? '3px 8px 4px' : '4px 8px 5px',
        boxShadow: '0 2px 0 #8a7a45',
        width: '100%',
        cursor: 'pointer',
      }}
    >
      <div className="font-orbitron text-[11px] font-black leading-tight">{d.label}</div>
      <div className="font-rajdhani text-[11px] font-semibold leading-tight opacity-75">{d.desc}</div>
      <div className="mt-[2px] h-[3px] opacity-50" style={{ backgroundImage: 'radial-gradient(circle, #2b2412 1.2px, transparent 1.4px)', backgroundSize: '7px 3px' }} />
    </button>
  );
}

export default function LispGame({ difficulty, onComplete }: MinigameProps) {
  const base = useMemo(() => Math.floor(Math.random() * 1e6) + 1, []);
  const levels = useMemo(() => Array.from({ length: LEVELS }, (_, i) => generateLevel(difficulty, base + i * 131)), [difficulty, base]);

  const [li, setLi] = useState(0);
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(levels[0].slots).fill(null));
  const [cursor, setCursor] = useState<number | null>(null);
  const [wrong, setWrong] = useState(0);
  const [points, setPoints] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<null | { pts: number; lost: boolean }>(null);
  const [final, setFinal] = useState<MinigameResult | null>(null);
  const [flash, setFlash] = useState<'bad' | null>(null);
  const completed = useRef(false);

  const level = levels[li];
  const stages = useMemo(() => evalStages(level.input, slots), [level, slots]);
  const result = stages[stages.length - 1];
  const matches = sameList(result, level.target);
  const used = slots.filter(Boolean).length;
  const locked = outcome !== null || final !== null;

  const finish = useCallback((r: MinigameResult) => {
    if (completed.current) return;
    completed.current = true;
    onComplete(r);
  }, [onComplete]);

  const place = (op: string, at?: number) => {
    if (locked) return;
    const idx = at ?? cursor ?? slots.indexOf(null);
    if (idx < 0) { play('alert'); return; }
    setSlots(s => s.map((x, i) => (i === idx ? op : x)));
    setCursor(null);
    play('click');
  };

  const clickSlot = (i: number) => {
    if (locked) return;
    play('click');
    if (slots[i]) setSlots(s => s.map((x, j) => (j === i ? null : x)));
    else setCursor(c => (c === i ? null : i));
  };

  const evaluate = () => {
    if (locked) return;
    if (matches) {
      play('coin');
      setOutcome({ pts: levelPoints(used, level.par, wrong), lost: false });
      return;
    }
    const w = wrong + 1;
    setWrong(w);
    setFlash('bad');
    setTimeout(() => setFlash(null), 450);
    play('alert');
    if (w >= MAX_WRONG_EVALS) {
      setSlots([...level.solution, ...Array(level.slots - level.solution.length).fill(null)]);
      setOutcome({ pts: 0, lost: true });
    }
  };

  const next = () => {
    if (!outcome) return;
    const all = [...points, outcome.pts];
    setPoints(all);
    if (li + 1 >= LEVELS) {
      const stars = finalStars(all);
      const solved = all.filter(p => p > 0).length;
      setFinal({ stars, summary: `${solved}/${LEVELS} pipelines built - score ${all.reduce((a, b) => a + b, 0)}/${LEVELS * 3}.` });
      setOutcome(null);
      return;
    }
    play('tech');
    setLi(li + 1);
    setSlots(Array(levels[li + 1].slots).fill(null));
    setCursor(null);
    setWrong(0);
    setOutcome(null);
  };

  const onDrop = (e: DragEvent, i: number) => {
    e.preventDefault();
    const op = e.dataTransfer.getData('text/plain');
    if (op) place(op, i);
  };

  return (
    <MinigameShell
      meta={meta}
      wide
      status={`LEVEL ${li + 1}/${LEVELS} · PAR ${level.par} · WRONG EVAL ${wrong}/${MAX_WRONG_EVALS}`}
      onAbandon={() => finish({ stars: 0, summary: 'Exercise abandoned.' })}
    >
      <div className="relative flex h-full w-full max-w-[1100px] flex-col justify-center gap-2 md:gap-3">
        {/* Input -> target */}
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg p-2" style={{ background: 'rgba(12,13,18,0.9)', border: `1px solid ${ACCENT}55` }}>
          <div className="flex items-center gap-2">
            <span className="font-mono-data text-[10px] tracking-widest" style={{ color: ACCENT }}>INPUT</span>
            <Atoms list={level.input} />
          </div>
          <span className="font-orbitron" style={{ color: 'var(--text-tertiary)' }}>⇒ ⇒ ⇒</span>
          <div className="flex items-center gap-2">
            <span className="font-mono-data text-[10px] tracking-widest" style={{ color: '#00E5A0' }}>TARGET</span>
            <Atoms list={level.target} />
          </div>
        </div>

        {/* Pipeline */}
        <div
          className="flex items-stretch justify-center gap-1 rounded-lg p-2"
          style={{
            background: 'rgba(12,13,18,0.9)',
            border: `2px solid ${flash ? '#FF477E' : matches ? '#00E5A0' : ACCENT}`,
            boxShadow: `0 0 ${matches ? 26 : 14}px ${matches ? '#00E5A055' : ACCENT + '33'}`,
            transition: 'all .2s',
          }}
        >
          {slots.map((op, i) => (
            <div key={i} className="flex min-w-0 flex-1 items-start gap-1">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>SLOT {i + 1}</div>
                <div
                  onClick={() => clickSlot(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => onDrop(e, i)}
                  className="flex w-full items-center justify-center rounded transition-all"
                  style={{
                    minHeight: 50,
                    cursor: locked ? 'default' : 'pointer',
                    border: `2px dashed ${cursor === i ? '#FFF4C2' : op ? 'transparent' : ACCENT + '66'}`,
                    background: op ? 'transparent' : '#00000066',
                    boxShadow: cursor === i ? `0 0 12px ${ACCENT}` : 'none',
                  }}
                  title={op ? 'Click to remove' : 'Empty slot'}
                >
                  {op ? <Card op={op} compact /> : <span className="font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}>drop card</span>}
                </div>
                <div className="flex min-h-[28px] items-center justify-center rounded px-1 py-0.5" style={{ background: '#05101388' }}>
                  <Atoms list={stages[i]} target={i === slots.length - 1 ? level.target : undefined} dim />
                </div>
              </div>
              {i < slots.length - 1 && <span className="mt-8 font-orbitron text-sm" style={{ color: ACCENT }}>▸</span>}
            </div>
          ))}
        </div>

        {/* Card rack */}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))' }}>
          {level.ops.map(op => (
            <Card
              key={op}
              op={op}
              compact
              onClick={() => place(op)}
              onDragStart={e => { e.dataTransfer.setData('text/plain', op); e.dataTransfer.effectAllowed = 'copy'; }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <RetroButton accent={ACCENT} onClick={() => { setSlots(Array(level.slots).fill(null)); setCursor(null); play('click'); }} disabled={locked || used === 0} className="px-4 py-2 text-xs tracking-widest">
            CLEAR
          </RetroButton>
          <RetroButton accent={matches ? '#00E5A0' : ACCENT} active onClick={evaluate} disabled={locked} className="px-8 py-2 text-sm font-bold tracking-widest">
            EVAL ▶
          </RetroButton>
          <span className="font-mono-data text-[11px]" style={{ color: matches ? '#00E5A0' : 'var(--text-tertiary)' }}>
            {matches ? 'Output matches the target!' : `Output ${listText(result)}`}
          </span>
        </div>

        {outcome && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(5,5,8,0.72)' }}>
            <div className="animate-fade-up w-full max-w-sm rounded-lg p-4 text-center" style={{ background: 'rgba(12,13,18,0.96)', border: `2px solid ${outcome.lost ? '#FF477E' : '#00E5A0'}` }}>
              <div className="font-mono-data text-[10px] tracking-[0.3em]" style={{ color: outcome.lost ? '#FF477E' : '#00E5A0' }}>
                {outcome.lost ? 'OUT OF EVALS - HERE IS A SOLUTION' : 'PIPELINE VERIFIED'}
              </div>
              <div className="font-rajdhani my-2 text-base" style={{ color: 'var(--text-primary)' }}>
                {outcome.lost
                  ? level.solution.map(o => opDef(o).label).join(' → ')
                  : `${used} ${used === 1 ? 'card' : 'cards'} (par ${level.par}), ${wrong} wrong EVAL${wrong === 1 ? '' : 's'} · ${outcome.pts}/3 points`}
              </div>
              <RetroButton accent={ACCENT} active onClick={next} className="w-full py-2 text-xs font-bold tracking-widest">
                {li + 1 >= LEVELS ? 'FINISH ▶' : 'NEXT LEVEL ▶'}
              </RetroButton>
            </div>
          </div>
        )}
        {final && <MinigameResultCard meta={meta} result={final} onDone={() => finish(final)} />}
      </div>
    </MinigameShell>
  );
}
