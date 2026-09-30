import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { play } from '../../hooks/useSound';
import { MinigameShell, MinigameResultCard } from './MinigameShell';
import type { MinigameMeta, MinigameProps, MinigameResult } from './types';
import { mulberry32 } from './logic/rng.ts';
import {
  BLACK, WHITE, EMPTY, newGame, applyGameMove, aiMove, atariGroups, libertySum, other,
  boardSizeFor, threeStarMoves, scoreGo,
} from './logic/go.ts';
import type { GameState, GoOutcome } from './logic/go.ts';

export const meta: MinigameMeta = {
  id: 'alphago',
  eventId: 'alphago',
  year: 2016,
  title: 'ATARI GO VS. PROTO-ALPHAGO',
  subtitle: 'First capture wins',
  accent: '#FFD166',
  background: './assets/puzzles/alphago/bg_alphago.png',
  howTo: [
    'You are Black and move first. Click an intersection to place a stone.',
    'A group of stones needs empty neighbouring points, its liberties. A group with no liberties is captured.',
    'The first player to capture any stone wins. A group with one liberty is in ATARI and glows: attack the white ones, save the black ones.',
    'You have 2 lives. If the board fills with no capture, the side with more total liberties wins (ties go to you).',
  ],
  rewardLabel: 'AI capability',
};

const ACCENT = meta.accent;
const LIVES = 2;

type Phase = 'play' | 'ended';

export default function AlphaGoGame({ difficulty, onComplete }: MinigameProps) {
  const n = boardSizeFor(difficulty);
  const level = difficulty;
  const fastLimit = threeStarMoves(n);

  const [gameNo, setGameNo] = useState(1);
  const [st, setSt] = useState<GameState>(() => newGame(n));
  const [hover, setHover] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [lives, setLives] = useState(LIVES);
  const [thinking, setThinking] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<MinigameResult | null>(null);
  const [outcome, setOutcome] = useState<GoOutcome | null>(null);

  const rng = useMemo(() => mulberry32(Math.floor(Math.random() * 2 ** 31) + gameNo), [gameNo]);
  const finished = useRef(false);

  const finish = (r: MinigameResult) => {
    if (finished.current) return;
    finished.current = true;
    onComplete(r);
  };

  // AI turn
  useEffect(() => {
    if (phase !== 'play' || st.winner !== 0 || st.turn !== WHITE) return;
    setThinking(true);
    const t = setTimeout(() => {
      const mv = aiMove(st.board, WHITE, level, rng);
      setThinking(false);
      if (mv === null) return;
      const nx = applyGameMove(st, mv);
      if (nx) { play('build'); setSt(nx); }
    }, 650);
    return () => clearTimeout(t);
  }, [st, phase, level, rng]);

  // Game end handling
  useEffect(() => {
    if (st.winner === 0 || phase !== 'play') return;
    const playerWon = st.winner === BLACK;
    const t = setTimeout(() => {
      if (playerWon) {
        const o: GoOutcome = gameNo === 1 ? (st.playerMoves <= fastLimit ? 'win-fast' : 'win') : 'win-second';
        play('coin');
        setOutcome(o);
        const stars = scoreGo(o);
        setResult({
          stars,
          summary: o === 'win-fast'
            ? `Captured in ${st.playerMoves} moves. Proto-AlphaGo is shaken.`
            : o === 'win'
              ? `Captured in ${st.playerMoves} moves. Try for ${fastLimit} or fewer next time.`
              : 'You won the rematch on your second life.',
        });
        setPhase('ended');
      } else {
        play('alert');
        setPhase('ended');
        setOutcome('lose');
        if (lives - 1 <= 0) {
          setResult({ stars: 0, summary: 'Proto-AlphaGo won both games.' });
        }
      }
    }, 1100);
    return () => clearTimeout(t);
  }, [st.winner, phase, st.playerMoves, gameNo, fastLimit, lives]);

  const cell = (i: number) => ({ x: (i % n) + 1, y: Math.floor(i / n) + 1 });

  const onPoint = (i: number) => {
    if (phase !== 'play' || st.winner !== 0 || st.turn !== BLACK) return;
    if (st.board[i] !== EMPTY) { setNote('That point is taken.'); return; }
    const nx = applyGameMove(st, i);
    if (!nx) { setNote('Illegal: that stone would have no liberties and capture nothing.'); play('alert'); return; }
    setNote('');
    play('click');
    setSt(nx);
  };

  const next = () => {
    play('click');
    setLives(l => l - 1);
    setGameNo(g => g + 1);
    setSt(newGame(n));
    setOutcome(null);
    setNote('');
    setPhase('play');
  };

  const groups = useMemo(() => atariGroups(st.board), [st.board]);
  const atariBlack = groups.filter(g => g.color === BLACK);
  const atariWhite = groups.filter(g => g.color === WHITE);
  const atariStones = new Map<number, number>(); // stone idx -> color
  for (const g of groups) for (const s of g.stones) atariStones.set(s, g.color);
  const atariLiberties = new Set(groups.map(g => g.liberties[0]));

  const bLib = libertySum(st.board, BLACK);
  const wLib = libertySum(st.board, WHITE);

  const stars: number[] = [];
  for (let i = 0; i < n; i++) stars.push(i);
  const hoshi: [number, number][] = n === 9
    ? [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]]
    : [[3, 3]];

  const statusLine = st.winner !== 0
    ? (st.winner === BLACK ? 'CAPTURE! You win this game.' : 'White captured your stones.')
    : thinking || st.turn === WHITE ? 'Proto-AlphaGo is thinking...' : 'Your move, Black.';

  const hint = atariBlack.length > 0 && st.winner === 0
    ? 'DANGER: a black group is in atari. Extend it or capture first!'
    : atariWhite.length > 0 && st.winner === 0
      ? 'A white group is in atari. Capture it at the marked point!'
      : note || 'Reduce white liberties while keeping yours high.';

  return (
    <MinigameShell
      meta={meta}
      status={`GAME ${gameNo}/${LIVES} · LIVES ${lives}/${LIVES}`}
      onAbandon={() => finish({ stars: 0, summary: 'Exercise abandoned.' })}
    >
      <style>{`
        @keyframes go-atari { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
        @keyframes go-drop { 0% { transform: scale(1.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes go-gone { 0% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>
      <div className="relative flex h-full w-full flex-wrap items-center justify-center gap-4 md:gap-8">
        {/* Board */}
        <div
          className="relative shrink-0 rounded-md"
          style={{
            width: 'min(94vw, calc(100dvh - 180px), 720px)',
            aspectRatio: '1 / 1',
            background: 'radial-gradient(circle at 40% 35%, #e6b766, #b9823a 70%, #8f5f25)',
            border: `2px solid ${ACCENT}`,
            boxShadow: `0 0 30px ${ACCENT}44, inset 0 0 30px #5a3a1288`,
          }}
        >
          <svg viewBox={`0 0 ${n + 1} ${n + 1}`} className="h-full w-full" style={{ display: 'block' }}>
            <defs>
              <radialGradient id="go-black" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#6d6d78" />
                <stop offset="35%" stopColor="#22222a" />
                <stop offset="100%" stopColor="#000" />
              </radialGradient>
              <radialGradient id="go-white" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="55%" stopColor="#e9e6de" />
                <stop offset="100%" stopColor="#9d9886" />
              </radialGradient>
            </defs>
            {/* grid */}
            {stars.map(i => (
              <g key={i} stroke="#4a2f10" strokeWidth="0.035" strokeLinecap="round">
                <line x1={1} y1={i + 1} x2={n} y2={i + 1} />
                <line x1={i + 1} y1={1} x2={i + 1} y2={n} />
              </g>
            ))}
            {hoshi.map(([c, r]) => <circle key={`${c}${r}`} cx={c + 1} cy={r + 1} r={0.09} fill="#4a2f10" />)}

            {/* liberties of atari groups */}
            {[...atariLiberties].map(i => {
              const p = cell(i);
              return (
                <rect key={`l${i}`} x={p.x - 0.14} y={p.y - 0.14} width={0.28} height={0.28}
                  transform={`rotate(45 ${p.x} ${p.y})`} fill="none" stroke="#FF477E" strokeWidth={0.07}
                  style={{ animation: 'go-atari 0.9s ease-in-out infinite' }} />
              );
            })}

            {/* captured stones fading */}
            {st.captured.map(i => {
              const p = cell(i);
              const col = other(st.winner === 0 ? BLACK : st.winner);
              return (
                <circle key={`c${i}`} cx={p.x} cy={p.y} r={0.46} fill={col === BLACK ? 'url(#go-black)' : 'url(#go-white)'}
                  style={{ animation: 'go-gone 0.9s ease-out forwards' }} />
              );
            })}

            {/* stones */}
            {st.board.map((v, i) => {
              if (v === EMPTY) return null;
              const p = cell(i);
              const atari = atariStones.has(i);
              const isLast = st.lastMove === i;
              return (
                <g key={i} style={{ transformOrigin: `${p.x}px ${p.y}px`, animation: isLast ? 'go-drop 0.2s ease-out' : undefined }}>
                  <ellipse cx={p.x + 0.04} cy={p.y + 0.07} rx={0.46} ry={0.44} fill="#000" opacity={0.35} />
                  <circle cx={p.x} cy={p.y} r={0.46} fill={v === BLACK ? 'url(#go-black)' : 'url(#go-white)'} />
                  {atari && (
                    <circle cx={p.x} cy={p.y} r={0.5} fill="none" stroke={v === BLACK ? '#FF477E' : '#00E5A0'} strokeWidth={0.08}
                      style={{ animation: 'go-atari 0.9s ease-in-out infinite' }} />
                  )}
                  {isLast && <circle cx={p.x} cy={p.y} r={0.14} fill="none" stroke={v === BLACK ? '#FFD166' : '#c0392b'} strokeWidth={0.06} />}
                </g>
              );
            })}

            {/* hover ghost */}
            {hover !== null && st.board[hover] === EMPTY && phase === 'play' && st.turn === BLACK && st.winner === 0 && (
              <circle cx={cell(hover).x} cy={cell(hover).y} r={0.44} fill="url(#go-black)" opacity={0.45} pointerEvents="none" />
            )}

            {/* hit areas */}
            {st.board.map((_, i) => {
              const p = cell(i);
              return (
                <rect key={`h${i}`} x={p.x - 0.5} y={p.y - 0.5} width={1} height={1} fill="transparent"
                  style={{ cursor: st.board[i] === EMPTY && st.turn === BLACK && st.winner === 0 ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                  onClick={() => onPoint(i)} />
              );
            })}
          </svg>
        </div>

        {/* Side panel */}
        <div
          className="flex w-full max-w-[280px] shrink-0 flex-col gap-3 rounded-lg p-4 md:w-[260px]"
          style={{ background: 'rgba(12,13,18,0.9)', border: `1px solid ${ACCENT}88`, boxShadow: `0 0 24px ${ACCENT}22` }}
        >
          <div>
            <div className="font-mono-data text-[10px] tracking-[0.25em]" style={{ color: 'var(--text-tertiary)' }}>
              {n}x{n} BOARD · AI LEVEL {level}
            </div>
            <div className="font-orbitron text-lg font-black leading-tight md:text-xl" style={{ color: '#FFF4C2' }}>
              {statusLine}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}>LIVES</span>
            {Array.from({ length: LIVES }, (_, i) => (
              <span key={i} style={{ color: i < lives ? '#FF477E' : '#2A2E42', textShadow: i < lives ? '0 0 10px #FF477E' : 'none', fontSize: 18 }}>♥</span>
            ))}
          </div>

          <div className="font-mono-data text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            YOUR MOVES <span style={{ color: st.playerMoves <= fastLimit ? '#00E5A0' : '#FFB84D' }}>{st.playerMoves}</span> / {fastLimit} for ★★★
          </div>

          <div
            className="min-h-[52px] font-rajdhani text-[15px] font-semibold leading-snug"
            style={{ color: atariBlack.length > 0 ? '#FF477E' : atariWhite.length > 0 ? '#00E5A0' : 'var(--text-primary)' }}
          >
            {hint}
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono-data text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            <div className="rounded p-2" style={{ background: '#000A', border: '1px solid var(--border-light)' }}>
              <span style={{ color: '#fff' }}>● BLACK (you)</span><br />liberties {bLib}
            </div>
            <div className="rounded p-2" style={{ background: '#000A', border: '1px solid var(--border-light)' }}>
              <span style={{ color: '#ddd' }}>○ WHITE (AI)</span><br />liberties {wLib}
            </div>
          </div>

          <div className="font-mono-data text-[10px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            <span style={{ color: '#FF477E' }}>◇</span> last liberty of a group in atari<br />
            Board full, no capture: more total liberties wins (tie: Black).
          </div>
        </div>

        {phase === 'ended' && outcome === 'lose' && lives > 1 && (
          <Overlay>
            <div className="font-mono-data text-[10px] tracking-[0.3em] mb-1" style={{ color: '#FF477E' }}>LIFE LOST</div>
            <p className="font-rajdhani text-base mb-4" style={{ color: 'var(--text-primary)' }}>
              Proto-AlphaGo captured first. You have one life left: win the rematch to earn a star.
            </p>
            <OverlayButton onClick={next}>REMATCH ▶</OverlayButton>
          </Overlay>
        )}
        {phase === 'ended' && result && (
          <MinigameResultCard meta={meta} result={result} onDone={() => finish(result)} />
        )}
      </div>
    </MinigameShell>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4" style={{ background: 'rgba(5,5,8,0.78)' }}>
      <div
        className="animate-fade-up w-full max-w-sm rounded-lg p-5 text-center"
        style={{ background: 'rgba(12,13,18,0.96)', border: `2px solid ${ACCENT}`, boxShadow: `0 0 40px ${ACCENT}44` }}
      >
        {children}
      </div>
    </div>
  );
}

function OverlayButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      autoFocus
      onClick={onClick}
      className="w-full py-2.5 rounded font-orbitron text-sm font-bold tracking-wider transition-all hover:brightness-125"
      style={{ background: ACCENT + '22', color: ACCENT, border: `2px solid ${ACCENT}` }}
    >
      {children}
    </button>
  );
}
