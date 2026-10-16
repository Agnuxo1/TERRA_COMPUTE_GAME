import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { play } from '../../hooks/useSound';
import { MinigameResultCard, MinigameShell, RetroButton } from './MinigameShell';
import type { MinigameProps, MinigameResult } from './types';
import {
  E, N, S, W, chipTiles, currentMask, generatePuzzle, isSolved, powered, starsForMoves,
} from './logic/moore.ts';

import { moore as meta } from './meta';

export { meta };

const ACCENT = meta.accent;
const ARMS: [number, number, number][] = [[N, 50, 0], [E, 100, 50], [S, 50, 100], [W, 0, 50]];

function TileGlyph({ sol, on, chip, rot }: { sol: number; on: boolean; chip: boolean; rot: number }) {
  const col = on ? ACCENT : '#566078';
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      style={{
        transform: `rotate(${rot * 90}deg)`,
        transition: 'transform .16s cubic-bezier(.3,1.4,.5,1)',
        filter: on ? `drop-shadow(0 0 4px ${ACCENT})` : 'none',
      }}
    >
      {ARMS.map(([bit, x, y]) =>
        sol & bit ? <line key={bit} x1={50} y1={50} x2={x} y2={y} stroke={col} strokeWidth={14} strokeLinecap="butt" style={{ transition: 'stroke .2s' }} /> : null,
      )}
      <circle cx={50} cy={50} r={10} fill={col} style={{ transition: 'fill .2s' }} />
      {chip && (
        <g style={{ transition: 'all .2s' }}>
          <rect x={30} y={30} width={40} height={40} rx={5} fill={on ? '#073a2b' : '#10131c'} stroke={col} strokeWidth={5} />
          <rect x={41} y={41} width={18} height={18} rx={2} fill={on ? '#E8FFF6' : '#2a3042'} />
        </g>
      )}
    </svg>
  );
}

export default function MooreGame({ difficulty, onComplete }: MinigameProps) {
  const puzzle = useMemo(() => generatePuzzle(difficulty, Math.floor(Math.random() * 1e6) + 1), [difficulty]);
  const n = puzzle.n;
  const chips = useMemo(() => new Set(chipTiles(puzzle)), [puzzle]);

  const [turns, setTurns] = useState<number[]>(() => new Array(n * n).fill(0));
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [lockMode, setLockMode] = useState(false);
  const [moves, setMoves] = useState(0);
  const [result, setResult] = useState<MinigameResult | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [bump, setBump] = useState<number | null>(null);
  const completed = useRef(false);

  const masks = useMemo(() => turns.map((t, i) => currentMask(puzzle, i, t)), [turns, puzzle]);
  const live = useMemo(() => powered(n, masks, puzzle.source), [n, masks, puzzle.source]);
  const liveCount = live.filter(Boolean).length;
  const chipsLit = [...chips].filter(i => live[i]).length;

  const finish = useCallback((r: MinigameResult) => {
    if (completed.current) return;
    completed.current = true;
    onComplete(r);
  }, [onComplete]);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setShowCard(true), 1200);
    return () => clearTimeout(t);
  }, [result]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'l') setLockMode(m => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rotate = (i: number, dir: 1 | -1) => {
    if (result) return;
    if (lockMode) {
      play('click');
      setLocked(l => {
        const s = new Set(l);
        if (s.has(i)) s.delete(i); else s.add(i);
        return s;
      });
      return;
    }
    if (locked.has(i)) { play('alert'); setBump(i); setTimeout(() => setBump(null), 250); return; }
    const nextTurns = turns.map((t, j) => (j === i ? t + dir : t));
    const nextMasks = nextTurns.map((t, j) => currentMask(puzzle, j, t));
    const total = moves + 1;
    setTurns(nextTurns);
    setMoves(total);
    if (isSolved(n, nextMasks, puzzle.source)) {
      play('coin');
      setResult({ stars: starsForMoves(puzzle.par, total), summary: `Circuit live in ${total} rotations (par ${puzzle.par}).` });
    } else {
      play('click');
    }
  };

  return (
    <MinigameShell
      meta={meta}
      wide
      status={`ROTATIONS ${moves} · PAR ${puzzle.par} · LIVE ${liveCount}/${n * n}`}
      onAbandon={() => finish({ stars: 0, summary: 'Exercise abandoned.' })}
    >
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 md:flex-row md:gap-5">
        {/* Board */}
        <div
          className="grid aspect-square h-full max-h-[min(100%,680px)] shrink gap-[2px] rounded-lg p-1.5"
          style={{
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            gridTemplateRows: `repeat(${n}, 1fr)`,
            background: 'rgba(8,10,14,0.92)',
            border: `2px solid ${result ? '#00FFB0' : ACCENT}`,
            boxShadow: `0 0 ${result ? 50 : 26}px ${ACCENT}${result ? '88' : '33'}`,
            transition: 'all .4s',
          }}
          onContextMenu={e => e.preventDefault()}
        >
          {masks.map((_, i) => {
            const on = live[i];
            const isLocked = locked.has(i);
            const isSource = i === puzzle.source;
            return (
              <button
                key={i}
                type="button"
                onClick={e => rotate(i, e.shiftKey ? -1 : 1)}
                onContextMenu={e => { e.preventDefault(); rotate(i, -1); }}
                className="relative overflow-hidden rounded-[3px] transition-all hover:brightness-150"
                style={{
                  background: on ? '#0A1F19' : '#0E1118',
                  border: `1px solid ${isLocked ? '#FFB84D' : on ? ACCENT + '55' : '#1C2030'}`,
                  cursor: lockMode ? 'cell' : 'pointer',
                  animation: bump === i ? 'moore-bump .25s' : undefined,
                }}
                aria-label={`tile ${i}`}
              >
                <TileGlyph sol={puzzle.sol[i]} on={on} chip={chips.has(i)} rot={puzzle.scr[i] + turns[i]} />
                {isSource && (
                  <span
                    className="animate-pulse-glow absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-orbitron font-black"
                    style={{ width: '46%', height: '46%', background: '#FFB84D', color: '#3a2500', fontSize: 'clamp(8px, 1.6vw, 15px)', boxShadow: '0 0 12px #FFB84D' }}
                  >
                    ⚡
                  </span>
                )}
                {isLocked && (
                  <svg viewBox="0 0 20 20" className="absolute right-[2px] top-[2px]" style={{ width: '28%', height: '28%' }}>
                    <rect x={4} y={9} width={12} height={9} rx={1.5} fill="#FFB84D" />
                    <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="#FFB84D" strokeWidth={2} />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Side panel */}
        <div
          className="flex w-full max-w-[300px] flex-col gap-2 rounded-lg p-3 md:w-[260px]"
          style={{ background: 'rgba(12,13,18,0.9)', border: '1px solid var(--border-light)' }}
        >
          <div className="font-mono-data text-[10px] tracking-[0.25em]" style={{ color: ACCENT }}>DIE STATUS</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['ROTATIONS', moves],
              ['PAR', puzzle.par],
              ['TRACES LIVE', `${liveCount}/${n * n}`],
              ['CHIPS LIT', `${chipsLit}/${chips.size}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded p-1.5 text-center" style={{ background: '#05060A', border: '1px solid var(--border-light)' }}>
                <div className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{k}</div>
                <div className="font-mono-data text-lg font-bold tabular-nums" style={{ color: ACCENT, textShadow: `0 0 8px ${ACCENT}` }}>{v}</div>
              </div>
            ))}
          </div>
          <RetroButton
            accent="#FFB84D"
            active={lockMode}
            onClick={() => { setLockMode(m => !m); play('click'); }}
            className="px-3 py-2 text-xs font-bold tracking-widest"
            title="Toggle lock mode (L). While on, clicking a tile pins or unpins it."
          >
            {lockMode ? 'LOCK MODE: ON' : 'LOCK MODE: OFF'}
          </RetroButton>
          <div className="font-mono-data text-[10px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>
            Click: rotate ↻ · Right/Shift-click: rotate ↺<br />
            Lock mode (L): click a tile to pin it. Pinned tiles cannot turn.<br />
            3★ ≤ {Math.ceil(puzzle.par * 1.35) + 2} rotations · 2★ ≤ {puzzle.par * 2 + 6}
          </div>
        </div>

        {result && showCard && <MinigameResultCard meta={meta} result={result} onDone={() => finish(result)} />}
        <style>{`@keyframes moore-bump{0%,100%{transform:translateX(0)}30%{transform:translateX(-3px)}70%{transform:translateX(3px)}}`}</style>
      </div>
    </MinigameShell>
  );
}
