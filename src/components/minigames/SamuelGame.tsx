import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { play } from '../../hooks/useSound';
import { MinigameShell, MinigameResultCard, RetroButton } from './MinigameShell';
import type { MinigameMeta, MinigameProps, MinigameResult } from './types';
import {
  SIZE, isDark, jumpsFrom, applyJump, generateGame, scoreSamuel,
} from './logic/samuel.ts';
import type { Jump, Piece, PuzzleOutcome } from './logic/samuel.ts';

export const meta: MinigameMeta = {
  id: 'samuel',
  eventId: 'ml',
  year: 1959,
  title: "SAMUEL'S CHECKERS",
  subtitle: 'Find the winning combination',
  accent: '#FF477E',
  background: '/assets/puzzles/samuel/samuel-1959-lab.png',
  howTo: [
    'You are Red and move up the board. Each puzzle shows a target, for example "Capture 3".',
    'Click one of your glowing pieces, then click the glowing dots to jump over enemy pieces one after another.',
    'You must keep jumping while a capture is available. Kings (crowned) may jump backwards too.',
    'Reach the target count in one turn. A wrong or short chain costs a try: you have 2 tries per puzzle.',
  ],
  rewardLabel: 'Education + Research',
};

const MAX_TRIES = 2;
const TOTAL = 3;

interface Sel { pieceId: number; path: Jump[] }
type Phase = 'play' | 'solved' | 'retry' | 'failed' | 'done';

const ACCENT = meta.accent;

export default function SamuelGame({ difficulty, onComplete }: MinigameProps) {
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000_000));
  const puzzles = useMemo(() => generateGame(seed, difficulty), [seed, difficulty]);

  const [idx, setIdx] = useState(0);
  const [tries, setTries] = useState(0); // failed tries on the current puzzle
  const [pieces, setPieces] = useState<Piece[]>(() => puzzles[0].pieces);
  const [ghosts, setGhosts] = useState<Piece[]>([]);
  const [sel, setSel] = useState<Sel | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [msg, setMsg] = useState<string>('');
  const [shake, setShake] = useState<number | null>(null);
  const [outcomes, setOutcomes] = useState<PuzzleOutcome[]>([]);
  const [result, setResult] = useState<MinigameResult | null>(null);
  const finished = useRef(false);

  const puzzle = puzzles[idx];
  const selPiece = sel ? pieces.find(p => p.id === sel.pieceId) ?? null : null;
  const nextJumps: Jump[] = sel && selPiece ? jumpsFrom(pieces, selPiece, selPiece.r, selPiece.c) : [];
  const captured = sel ? sel.path.length : 0;

  const finish = (r: MinigameResult) => {
    if (finished.current) return;
    finished.current = true;
    onComplete(r);
  };

  const resetBoard = () => {
    setPieces(puzzle.pieces);
    setGhosts([]);
    setSel(null);
  };

  const flash = (id: number) => {
    setShake(id);
    setTimeout(() => setShake(null), 450);
  };

  const onPieceClick = (p: Piece) => {
    if (phase !== 'play' || p.side !== 'r') return;
    if (sel && sel.path.length > 0) { flash(p.id); setMsg('Finish the chain first, or press UNDO to start over.'); return; }
    if (jumpsFrom(pieces, p, p.r, p.c).length === 0) {
      flash(p.id);
      setMsg('That piece has no capture. Pick a glowing piece.');
      play('alert');
      return;
    }
    play('click');
    setMsg('');
    setSel({ pieceId: p.id, path: [] });
  };

  const evaluate = (path: Jump[]) => {
    if (path.length === puzzle.target) {
      play('coin');
      const used = tries + 1;
      setOutcomes(o => [...o, used]);
      setPhase('solved');
      setMsg(`Perfect: ${path.length} captured in one turn!`);
      return;
    }
    play('alert');
    const failedTries = tries + 1;
    if (failedTries >= MAX_TRIES) {
      setTries(failedTries);
      setOutcomes(o => [...o, null]);
      setPhase('failed');
      setMsg(`Only ${path.length} captured. The best line takes ${puzzle.target}; the numbered dots show it.`);
      setPieces(puzzle.pieces);
      setGhosts([]);
      setSel(null);
    } else {
      setTries(failedTries);
      setPhase('retry');
      setMsg(`Only ${path.length} captured, but ${puzzle.target} are possible. Look for a longer chain.`);
    }
  };

  const onLanding = (j: Jump) => {
    if (phase !== 'play' || !sel || !selPiece) return;
    const victim = pieces.find(p => p.r === j.cr && p.c === j.cc);
    const nextPieces = applyJump(pieces, selPiece.id, j);
    const path = [...sel.path, j];
    play('tech');
    if (victim) setGhosts(g => [...g, victim]);
    setPieces(nextPieces);
    setSel({ pieceId: selPiece.id, path });
    const moved = nextPieces.find(p => p.id === selPiece.id)!;
    if (jumpsFrom(nextPieces, moved, moved.r, moved.c).length === 0) evaluate(path);
  };

  const undo = () => {
    if (phase !== 'play' || !sel) return;
    play('click');
    resetBoard();
    setMsg('');
  };

  const advance = () => {
    play('click');
    if (phase === 'retry') {
      resetBoard();
      setPhase('play');
      setMsg('');
      return;
    }
    // solved / failed -> next puzzle or end
    if (idx + 1 >= TOTAL) {
      const all = outcomes;
      const stars = scoreSamuel(all);
      const solved = all.filter(o => o !== null).length;
      const usedTries = all.reduce<number>((s, o) => s + (o ?? MAX_TRIES), 0);
      const r: MinigameResult = {
        stars,
        summary: stars === 0
          ? `Only ${solved} of ${TOTAL} combinations found.`
          : `${solved} of ${TOTAL} combinations found in ${usedTries} tries.`,
      };
      setResult(r);
      setPhase('done');
      return;
    }
    const n = idx + 1;
    setIdx(n);
    setTries(0);
    setPieces(puzzles[n].pieces);
    setGhosts([]);
    setSel(null);
    setPhase('play');
    setMsg('');
  };

  // Which red pieces can capture right now (hint glow).
  const canJump = new Set(
    phase === 'play' && !sel
      ? pieces.filter(p => p.side === 'r' && jumpsFrom(pieces, p, p.r, p.c).length > 0).map(p => p.id)
      : [],
  );

  const solutionMarks = phase === 'failed'
    ? puzzle.solution.path.map((j, i) => ({ r: j.r, c: j.c, n: i + 1 }))
    : [];
  const solutionStart = phase === 'failed' ? puzzle.pieces.find(p => p.id === puzzle.solution.pieceId) : null;

  const pct = 100 / SIZE;
  const center = (v: number) => v + 0.5;
  const pathPoints: [number, number][] = [];
  if (sel && selPiece) {
    const start = puzzle.pieces.find(p => p.id === sel.pieceId)!;
    pathPoints.push([center(start.c), center(start.r)]);
    for (const j of sel.path) pathPoints.push([center(j.c), center(j.r)]);
  }

  return (
    <MinigameShell
      meta={meta}
      status={`PUZZLE ${idx + 1}/${TOTAL} · TRIES ${Math.max(0, MAX_TRIES - tries)}/${MAX_TRIES}`}
      onAbandon={() => finish({ stars: 0, summary: 'Exercise abandoned.' })}
    >
      <style>{`
        @keyframes sam-fade { 0% { opacity: 1; transform: scale(1); } 60% { opacity: .6; transform: scale(1.25) rotate(8deg); } 100% { opacity: 0; transform: scale(0.2) rotate(40deg); } }
        @keyframes sam-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes sam-dot { 0%,100% { transform: scale(0.85); opacity: .75; } 50% { transform: scale(1.15); opacity: 1; } }
      `}</style>
      <div className="relative flex h-full w-full flex-wrap items-center justify-center gap-4 md:gap-8">
        {/* Board */}
        <div
          className="relative shrink-0 rounded-md p-[6px]"
          style={{
            width: 'min(94vw, calc(100dvh - 190px), 720px)',
            aspectRatio: '1 / 1',
            background: 'linear-gradient(145deg, #3a1b14, #1a0b09)',
            border: `2px solid ${ACCENT}99`,
            boxShadow: `0 0 30px ${ACCENT}33, inset 0 0 18px #000`,
          }}
        >
          <div className="relative h-full w-full">
            {/* squares */}
            {Array.from({ length: SIZE * SIZE }, (_, i) => {
              const r = Math.floor(i / SIZE), c = i % SIZE;
              const dark = isDark(r, c);
              const landing = nextJumps.find(j => j.r === r && j.c === c);
              return (
                <div
                  key={i}
                  onClick={landing ? () => onLanding(landing) : undefined}
                  className="absolute"
                  style={{
                    left: `${c * pct}%`, top: `${r * pct}%`, width: `${pct}%`, height: `${pct}%`,
                    background: dark
                      ? 'linear-gradient(135deg, #8c2f3d, #5e1a27)'
                      : 'linear-gradient(135deg, #f6e7bd, #e3cd98)',
                    boxShadow: dark ? 'inset 0 0 8px #0008' : 'inset 0 0 6px #7a5a2a33',
                    cursor: landing ? 'pointer' : 'default',
                  }}
                >
                  {landing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        style={{
                          width: '42%', height: '42%', borderRadius: '50%',
                          background: '#00F0FF', boxShadow: '0 0 14px #00F0FF, 0 0 4px #fff',
                          animation: 'sam-dot 1s ease-in-out infinite',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* chain path */}
            {pathPoints.length > 1 && (
              <svg className="pointer-events-none absolute inset-0" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: '100%', height: '100%' }}>
                <polyline
                  points={pathPoints.map(p => p.join(',')).join(' ')}
                  fill="none" stroke="#FFB84D" strokeWidth="0.09" strokeDasharray="0.18 0.14" strokeLinecap="round" opacity="0.9"
                />
              </svg>
            )}

            {/* captured pieces fading out */}
            {ghosts.map(g => (
              <div key={`g${g.id}`} className="pointer-events-none absolute" style={cellStyle(g.r, g.c, pct)}>
                <Disc piece={g} style={{ animation: 'sam-fade 0.6s ease-in forwards' }} />
              </div>
            ))}

            {/* live pieces */}
            {pieces.map(p => {
              const isSel = sel?.pieceId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => onPieceClick(p)}
                  className="absolute"
                  style={{
                    ...cellStyle(p.r, p.c, pct),
                    transition: 'left 0.3s ease, top 0.3s ease',
                    cursor: p.side === 'r' && phase === 'play' ? 'pointer' : 'default',
                    zIndex: isSel ? 5 : 2,
                    animation: shake === p.id ? 'sam-shake 0.4s' : undefined,
                  }}
                >
                  <Disc piece={p} selected={isSel} hint={canJump.has(p.id)} />
                </div>
              );
            })}

            {/* solution reveal */}
            {solutionStart && (
              <div className="pointer-events-none absolute" style={{ ...cellStyle(solutionStart.r, solutionStart.c, pct), zIndex: 6 }}>
                <div className="flex h-full w-full items-center justify-center">
                  <div className="font-orbitron text-[10px] font-black md:text-xs" style={{ color: '#FFB84D', textShadow: '0 0 6px #000' }}>START</div>
                </div>
              </div>
            )}
            {solutionMarks.map(m => (
              <div key={m.n} className="pointer-events-none absolute" style={{ ...cellStyle(m.r, m.c, pct), zIndex: 6 }}>
                <div className="flex h-full w-full items-center justify-center">
                  <div
                    className="flex items-center justify-center rounded-full font-orbitron text-xs font-black"
                    style={{ width: '52%', height: '52%', background: '#FFB84D', color: '#1a0b09', boxShadow: '0 0 12px #FFB84D' }}
                  >
                    {m.n}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div
          className="flex w-full max-w-[260px] shrink-0 flex-col gap-3 rounded-lg p-4 md:w-[250px]"
          style={{ background: 'rgba(12,13,18,0.9)', border: `1px solid ${ACCENT}88`, boxShadow: `0 0 24px ${ACCENT}22` }}
        >
          <div>
            <div className="font-mono-data text-[10px] tracking-[0.25em]" style={{ color: 'var(--text-tertiary)' }}>OBJECTIVE</div>
            <div className="font-orbitron text-2xl font-black md:text-3xl" style={{ color: '#FFF4C2' }}>
              CAPTURE {puzzle.target}
            </div>
            <div className="font-rajdhani text-sm" style={{ color: 'var(--text-secondary)' }}>
              in a single turn, the maximum possible
            </div>
          </div>

          <div className="flex items-center gap-2">
            {Array.from({ length: puzzle.target }, (_, i) => (
              <div
                key={i}
                className="h-4 flex-1 rounded-sm transition-all"
                style={{
                  background: i < captured ? '#00E5A0' : '#1a1d28',
                  border: `1px solid ${i < captured ? '#00E5A0' : 'var(--border-light)'}`,
                  boxShadow: i < captured ? '0 0 10px #00E5A088' : 'none',
                }}
              />
            ))}
          </div>

          <div
            className="min-h-[56px] font-rajdhani text-[15px] font-semibold leading-snug"
            style={{
              color: phase === 'solved' ? '#00E5A0' : phase === 'retry' || phase === 'failed' ? '#FF477E' : 'var(--text-primary)',
            }}
          >
            {msg || (sel
              ? (nextJumps.length > 0 ? 'Keep jumping: click a glowing dot.' : '')
              : 'Click a glowing red piece to start your chain.')}
          </div>

          <div className="flex gap-2">
            {phase === 'play' ? (
              <RetroButton accent={ACCENT} onClick={undo} disabled={!sel} className="flex-1 px-3 py-2 text-[11px]" title="Put the pieces back (no penalty)">
                ↺ UNDO
              </RetroButton>
            ) : (
              <button
                autoFocus
                onClick={advance}
                className="flex-1 animate-pulse-glow rounded py-2.5 font-orbitron text-sm font-bold tracking-wider transition-all hover:brightness-125"
                style={{ background: `${ACCENT}22`, color: ACCENT, border: `2px solid ${ACCENT}` }}
              >
                {phase === 'retry' ? 'TRY AGAIN ▶' : idx + 1 >= TOTAL ? 'FINISH ▶' : 'NEXT PUZZLE ▶'}
              </button>
            )}
          </div>

          <div className="font-mono-data text-[10px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            <span style={{ color: '#00F0FF' }}>●</span> next landing square<br />
            <span style={{ color: '#FFB84D' }}>- -</span> your chain so far<br />
            ♛ king: jumps in all four directions
          </div>
        </div>

        {phase === 'done' && result && (
          <MinigameResultCard meta={meta} result={result} onDone={() => finish(result)} />
        )}
      </div>
    </MinigameShell>
  );
}

function cellStyle(r: number, c: number, pct: number) {
  return { left: `${c * pct}%`, top: `${r * pct}%`, width: `${pct}%`, height: `${pct}%` } as const;
}

function Disc({ piece, selected, hint, style }: { piece: Piece; selected?: boolean; hint?: boolean; style?: CSSProperties }) {
  const red = piece.side === 'r';
  return (
    <div className="flex h-full w-full items-center justify-center" style={style}>
      <div
        className="flex items-center justify-center rounded-full transition-transform"
        style={{
          width: '78%', height: '78%',
          background: red
            ? 'radial-gradient(circle at 34% 28%, #ff9fb3 0%, #e0264f 38%, #8f1431 75%, #4d0a1a 100%)'
            : 'radial-gradient(circle at 34% 28%, #ffffff 0%, #f3e6b8 38%, #c9b47a 75%, #8a7443 100%)',
          border: `2px solid ${red ? '#3c0815' : '#6e5a2c'}`,
          boxShadow: selected
            ? '0 0 0 3px #FFB84D, 0 0 22px #FFB84D, 0 4px 6px #000a'
            : hint
              ? '0 0 0 2px #00F0FF88, 0 0 16px #00F0FF88, 0 4px 6px #000a'
              : '0 4px 6px #000a, inset 0 -3px 5px #0005',
          transform: selected ? 'scale(1.1)' : undefined,
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: '66%', height: '66%',
            border: `1.5px solid ${red ? '#ff9fb355' : '#8a744355'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: red ? '#FFE9A8' : '#5a4620',
            fontSize: 'clamp(10px, 2.6vw, 28px)',
            lineHeight: 1,
            textShadow: '0 1px 2px #0008',
          }}
        >
          {piece.king ? '♛︎' : ''}
        </div>
      </div>
    </div>
  );
}
