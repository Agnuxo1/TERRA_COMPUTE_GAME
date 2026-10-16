import { useEffect, useMemo, useRef, useState } from 'react';
import { play } from '../../hooks/useSound';
import { MinigameShell, MinigameResultCard } from './MinigameShell';
import type { MinigameProps, MinigameResult } from './types';
import {
  parseFen, legalMoves, applyMove, isCheckmate, isInCheck, kingSquare, colorOf,
  mateInOneMoves, mateInTwoFirstMoves, bestDefense, moveText, pickPuzzles, scoreChess,
} from './logic/chess.ts';
import type { Move, Position } from './logic/chess.ts';

import { deepblue as meta } from './meta';

export { meta };

const ACCENT = meta.accent;
const MAX_MISTAKES = 3;
const TOTAL = 3;
const GLYPH: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };

type Phase = 'play' | 'wrong' | 'reply' | 'solved' | 'failed' | 'done';

const sameMove = (a: Move, b: Move) => a.from === b.from && a.to === b.to && a.promo === b.promo;

export default function DeepBlueGame({ difficulty, onComplete }: MinigameProps) {
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000_000));
  const puzzles = useMemo(() => pickPuzzles(seed, difficulty), [seed, difficulty]);

  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState<Position>(() => parseFen(puzzles[0].fen));
  const [step, setStep] = useState(0); // 0 = first white move, 1 = the mating move of a mate in 2
  const [mistakes, setMistakes] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [wrongMove, setWrongMove] = useState<Move | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const [solutionText, setSolutionText] = useState('');
  const [quote, setQuote] = useState('Your move, engineer.');
  const [results, setResults] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<MinigameResult | null>(null);

  const finished = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const puzzle = puzzles[idx];
  const startPos = useMemo(() => parseFen(puzzle.fen), [puzzle]);
  const forcedFirst = useMemo(
    () => (puzzle.mateIn === 2 ? mateInTwoFirstMoves(startPos) : []),
    [puzzle, startPos],
  );

  const finish = (r: MinigameResult) => {
    if (finished.current) return;
    finished.current = true;
    onComplete(r);
  };

  const legal = useMemo(() => (phase === 'play' ? legalMoves(pos) : []), [pos, phase]);
  const targets = selected === null ? [] : legal.filter(m => m.from === selected);

  const onSquare = (i: number) => {
    if (phase !== 'play') return;
    const piece = pos.board[i];
    const move = targets.find(m => m.to === i);
    if (move) { attempt(move); return; }
    if (piece && colorOf(piece) === 'w') {
      if (selected === i) { setSelected(null); return; }
      play('click');
      setSelected(i);
    } else {
      setSelected(null);
    }
  };

  const attempt = (m: Move) => {
    const before = pos;
    const after = applyMove(before, m);
    setSelected(null);
    const isMate = isCheckmate(after);
    const goodFirst = puzzle.mateIn === 2 && step === 0 && forcedFirst.some(f => sameMove(f, m));

    if (isMate) {
      play('coin');
      setPos(after);
      setLastMove(m);
      setPhase('solved');
      setResults(r => [...r, mistakes]);
      setQuote('Impossible... the machine resigns.');
      return;
    }
    if (goodFirst) {
      play('tech');
      setPos(after);
      setLastMove(m);
      setPhase('reply');
      setQuote('Hmm. I am forced to answer.');
      later(() => {
        const reply = bestDefense(after);
        if (!reply) return;
        play('click');
        setPos(applyMove(after, reply));
        setLastMove(reply);
        setStep(1);
        setPhase('play');
        setQuote('...');
      }, 800);
      return;
    }

    // Wrong move: show it briefly, then reset to the position before it.
    play('alert');
    setPos(after);
    setLastMove(m);
    setWrongMove(m);
    setPhase('wrong');
    setQuote('Is that the best you can do?');
    const total = mistakes + 1;
    later(() => {
      setWrongMove(null);
      setMistakes(total);
      if (total >= MAX_MISTAKES) {
        revealSolution();
      } else {
        setPos(before);
        setLastMove(null);
        setPhase('play');
        setQuote(total === 2 ? 'One more slip and I win.' : 'Try again.');
      }
    }, 950);
  };

  const revealSolution = () => {
    let text: string;
    let hintMove: Move;
    if (puzzle.mateIn === 1) {
      const m = mateInOneMoves(startPos)[0];
      text = moveText(startPos, m);
      hintMove = m;
    } else {
      const f = forcedFirst[0];
      const p1 = applyMove(startPos, f);
      const reply = bestDefense(p1)!;
      const p2 = applyMove(p1, reply);
      const mate = mateInOneMoves(p2)[0];
      text = `${moveText(startPos, f)}  ${moveText(p1, reply)}  ${moveText(p2, mate)}`;
      hintMove = f;
    }
    setSolutionText(text);
    setHint(hintMove);
    setPos(startPos);
    setStep(0);
    setLastMove(null);
    setResults(r => [...r, null]);
    setPhase('failed');
    setQuote('Study this one, engineer.');
  };

  const advance = () => {
    play('click');
    if (idx + 1 >= TOTAL) {
      const stars = scoreChess(results);
      const solved = results.filter(r => r !== null).length;
      const totalMistakes = results.reduce<number>((s, r) => s + (r ?? MAX_MISTAKES), 0);
      const r: MinigameResult = {
        stars,
        summary: solved === 0
          ? 'The champion survived every line.'
          : `Mated the champion in ${solved} of ${TOTAL} puzzles with ${totalMistakes} mistake${totalMistakes === 1 ? '' : 's'}.`,
      };
      setResult(r);
      setPhase('done');
      return;
    }
    const n = idx + 1;
    setIdx(n);
    setPos(parseFen(puzzles[n].fen));
    setStep(0);
    setMistakes(0);
    setSelected(null);
    setLastMove(null);
    setWrongMove(null);
    setHint(null);
    setSolutionText('');
    setQuote('Next position. Concentrate.');
    setPhase('play');
  };

  const checkedKing = isInCheck(pos, pos.turn) ? kingSquare(pos.board, pos.turn) : -1;
  const whiteToPlayPrompt = puzzle.mateIn === 1
    ? 'White to move: mate in 1'
    : step === 0 ? 'White to move: mate in 2' : 'Now finish it: mate in 1';

  return (
    <MinigameShell
      meta={meta}
      status={`PUZZLE ${idx + 1}/${TOTAL} · MISTAKES ${mistakes}/${MAX_MISTAKES}`}
      onAbandon={() => finish({ stars: 0, summary: 'Exercise abandoned.' })}
    >
      <style>{`
        @keyframes db-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes db-pop { 0% { transform: scale(0.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes db-mate { 0%,100% { box-shadow: inset 0 0 0 3px #FF477E, 0 0 12px #FF477E; } 50% { box-shadow: inset 0 0 0 3px #FF477E, 0 0 26px #FF477E; } }
      `}</style>
      <div className="relative flex h-full w-full flex-wrap items-center justify-center gap-4 md:gap-8">
        {/* Board with coordinate frame */}
        <div
          className="relative shrink-0"
          style={{
            width: 'min(94vw, calc(100dvh - 180px), 720px)',
            aspectRatio: '1 / 1',
            padding: 'clamp(14px, 3vmin, 24px)',
            background: 'linear-gradient(145deg, #0d1b24, #050a10)',
            border: `2px solid ${ACCENT}99`,
            borderRadius: 6,
            boxShadow: `0 0 30px ${ACCENT}33, inset 0 0 20px #000`,
          }}
        >
          {/* coordinates */}
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((f, c) => (
            <div key={f} className="font-mono-data pointer-events-none absolute text-[10px] md:text-xs" style={{
              left: `calc(clamp(14px, 3vmin, 24px) + (100% - 2 * clamp(14px, 3vmin, 24px)) * ${(c + 0.5) / 8})`,
              bottom: 2, transform: 'translateX(-50%)', color: ACCENT,
            }}>{f}</div>
          ))}
          {[8, 7, 6, 5, 4, 3, 2, 1].map((rk, r) => (
            <div key={rk} className="font-mono-data pointer-events-none absolute text-[10px] md:text-xs" style={{
              top: `calc(clamp(14px, 3vmin, 24px) + (100% - 2 * clamp(14px, 3vmin, 24px)) * ${(r + 0.5) / 8})`,
              left: 4, transform: 'translateY(-50%)', color: ACCENT,
            }}>{rk}</div>
          ))}

          <div
            className="relative h-full w-full"
            style={{ containerType: 'inline-size', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' }}
          >
            {pos.board.map((piece, i) => {
              const r = i >> 3, c = i & 7;
              const light = (r + c) % 2 === 0;
              const isSel = selected === i;
              const target = targets.find(m => m.to === i);
              const isLast = lastMove && (lastMove.from === i || lastMove.to === i);
              const isWrong = wrongMove && (wrongMove.to === i);
              const isHint = hint && (hint.from === i || hint.to === i);
              const isMated = phase === 'solved' && checkedKing === i;
              const white = piece ? colorOf(piece) === 'w' : false;
              return (
                <div
                  key={i}
                  onClick={() => onSquare(i)}
                  className="relative flex items-center justify-center"
                  style={{
                    background: light ? '#a9c3cf' : '#2f5567',
                    cursor: phase === 'play' && (target || (piece && white)) ? 'pointer' : 'default',
                    boxShadow: isSel
                      ? 'inset 0 0 0 3px #FFB84D'
                      : isWrong ? 'inset 0 0 0 4px #FF477E'
                      : isHint ? 'inset 0 0 0 4px #FFB84D'
                      : undefined,
                    animation: isMated ? 'db-mate 0.9s ease-in-out infinite' : isWrong ? 'db-shake 0.5s' : undefined,
                  }}
                >
                  {isLast && !isWrong && <div className="absolute inset-0" style={{ background: '#FFB84D33' }} />}
                  {isWrong && <div className="absolute inset-0" style={{ background: '#FF477E55' }} />}
                  {piece && (
                    <span
                      className="relative select-none"
                      style={{
                        fontSize: 'calc(100cqw / 8 * 1.0)',
                        lineHeight: 1,
                        color: white ? '#FFF4C2' : '#0a0e16',
                        textShadow: white
                          ? '0 0 2px #000, 0 0 2px #000, 0 2px 3px #000'
                          : '0 0 2px #cdf3fb, 0 0 3px #8fd8e6, 0 0 6px #4fb6cf, 0 1px 2px #000',
                        animation: 'db-pop 0.18s ease-out',
                        transform: isSel ? 'scale(1.12)' : undefined,
                        transition: 'transform 0.12s',
                        filter: isMated ? 'drop-shadow(0 0 8px #FF477E)' : undefined,
                      }}
                    >
                      {GLYPH[piece.toUpperCase()]}{'︎'}
                    </span>
                  )}
                  {target && (
                    <div
                      className="pointer-events-none absolute"
                      style={piece
                        ? { inset: '6%', borderRadius: '50%', border: '4px solid #00E5A0', boxShadow: '0 0 12px #00E5A0' }
                        : { width: '30%', height: '30%', borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 12px #00E5A0', opacity: 0.9 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div
          className="flex w-full max-w-[280px] shrink-0 flex-col gap-3 rounded-lg p-4 md:w-[260px]"
          style={{ background: 'rgba(12,13,18,0.9)', border: `1px solid ${ACCENT}88`, boxShadow: `0 0 24px ${ACCENT}22` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded"
              style={{ border: `1px solid ${ACCENT}88`, background: '#000' }}
            >
              <img
                src="./assets/puzzles/deepblue/kasparov.png"
                alt="Kasparov"
                style={{ position: 'absolute', width: 157, height: 157, left: -47, top: -10, maxWidth: 'none' }}
              />
            </div>
            <div className="font-rajdhani text-sm italic leading-snug" style={{ color: 'var(--text-secondary)' }}>
              "{quote}"
            </div>
          </div>

          <div>
            <div className="font-mono-data text-[10px] tracking-[0.25em]" style={{ color: 'var(--text-tertiary)' }}>
              {puzzle.theme.toUpperCase()}
            </div>
            <div className="font-orbitron text-lg font-black leading-tight md:text-xl" style={{ color: '#FFF4C2' }}>
              {phase === 'solved' ? 'CHECKMATE!' : whiteToPlayPrompt}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}>MISTAKES</span>
            {Array.from({ length: MAX_MISTAKES }, (_, i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-full transition-all"
                style={{
                  background: i < mistakes ? '#FF477E' : '#1a1d28',
                  border: `1px solid ${i < mistakes ? '#FF477E' : 'var(--border-light)'}`,
                  boxShadow: i < mistakes ? '0 0 8px #FF477E' : 'none',
                }}
              />
            ))}
          </div>

          <div
            className="min-h-[44px] font-rajdhani text-[15px] font-semibold leading-snug"
            style={{ color: phase === 'wrong' ? '#FF477E' : phase === 'solved' ? '#00E5A0' : 'var(--text-primary)' }}
          >
            {phase === 'wrong' && 'That does not force mate. Resetting the position...'}
            {phase === 'reply' && 'Black answers with its best defence...'}
            {phase === 'solved' && 'The champion has no answer.'}
            {phase === 'failed' && (
              <span style={{ color: '#FFB84D' }}>
                Solution: <span className="font-mono-data">{solutionText}</span>
              </span>
            )}
            {phase === 'play' && (selected === null ? 'Click one of your cream pieces.' : 'Pick a green square.')}
          </div>

          {(phase === 'solved' || phase === 'failed') && (
            <button
              autoFocus
              onClick={advance}
              className="animate-pulse-glow rounded py-2.5 font-orbitron text-sm font-bold tracking-wider transition-all hover:brightness-125"
              style={{ background: `${ACCENT}22`, color: ACCENT, border: `2px solid ${ACCENT}` }}
            >
              {idx + 1 >= TOTAL ? 'FINISH ▶' : 'NEXT PUZZLE ▶'}
            </button>
          )}

          <div className="font-mono-data text-[10px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            <span style={{ color: '#00E5A0' }}>●</span> legal move &nbsp; <span style={{ color: '#00E5A0' }}>◯</span> capture<br />
            Pawns promote to a queen.
          </div>
        </div>

        {phase === 'done' && result && (
          <MinigameResultCard meta={meta} result={result} onDone={() => finish(result)} />
        )}
      </div>
    </MinigameShell>
  );
}
