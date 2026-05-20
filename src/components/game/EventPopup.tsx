import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { events, useGame } from '../../App';
import { play } from '../../hooks/useSound';
import { getVideoUrl } from '../../hooks/useVideo';
import VideoPlayer from './VideoPlayer';

const eventCardMap: Record<string, string> = {
  oil1973: '/assets/cards/event-oil1973.png',
  coldwar91: '/assets/cards/event-coldwar91.png',
  dotcom: '/assets/cards/event-dotcom.png',
  sep11: '/assets/cards/event-sep11.png',
  chinaWTO: '/assets/cards/event-chinawto.png',
  crisis08: '/assets/cards/event-crisis08.png',
  covid: '/assets/cards/event-covid.png',
  ukraine: '/assets/cards/event-ukraine.png',
  chipwar: '/assets/cards/event-chipwar.png',
  aiboom: '/assets/cards/event-aiboom.png',
  foodcrisis: '/assets/cards/event-foodcrisis.png',
  greenrev: '/assets/cards/event-greenrev.png',
  pandemic: '/assets/cards/event-swineflu.png',
  quantum: '/assets/cards/event-quantum.png',
  turing: '/assets/cards/event-turing.png',
  dartmouth: '/assets/cards/event-dartmouth.png',
  perceptron: '/assets/cards/event-perceptron.png',
  lisp: '/assets/cards/event-lisp.png',
  ml: '/assets/cards/event-ml.png',
  moore: '/assets/cards/event-moore.png',
  eliza: '/assets/cards/event-eliza.png',
  aiwinter1: '/assets/cards/event-aiwinter1.png',
  expert: '/assets/cards/event-expert.png',
  auto86: '/assets/cards/event-auto86.png',
  deepblue: '/assets/cards/event-deepblue.png',
  watson: '/assets/cards/event-watson.png',
  alexnet: '/assets/cards/event-alexnet.png',
  alphago: '/assets/cards/event-alphago.png',
  transformers: '/assets/cards/event-transformers.png',
  gpt3: '/assets/cards/event-gpt3.png',
  chatgpt: '/assets/cards/event-chatgpt.png',
  multimodal: '/assets/cards/event-multimodal.png',
  agents: '/assets/cards/event-agents.png',
  agentic: '/assets/cards/event-agentic.png',
  beyondmoore: '/assets/cards/event-beyondmoore.png',
};

const puzzleEvents = new Set(['turing', 'moore']);
const TURING_TARGET = [1, 9, 4, 3];
const TURING_BG = '/assets/puzzles/turing-bombe-background.png';
const TURING_ROTOR_POSITIONS = [
  { left: '24.2%', top: '63.4%' },
  { left: '40.8%', top: '63.4%' },
  { left: '57.4%', top: '63.4%' },
  { left: '74%', top: '63.4%' },
];
export type TuringDifficultyId = 1 | 2 | 3 | 4;

const TURING_DIFFICULTIES: Record<TuringDifficultyId, {
  name: string;
  subtitle: string;
  couplings: number[][];
}> = {
  1: {
    name: 'DRILL 1',
    subtitle: 'Independent rotors. Learn the 1943 target.',
    couplings: [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ],
  },
  2: {
    name: 'DRILL 2',
    subtitle: 'Two rotors are linked. Watch the paired drift.',
    couplings: [
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ],
  },
  3: {
    name: 'DRILL 3',
    subtitle: 'Three rotors are linked into a cipher train.',
    couplings: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [1, 0, 1, 0],
      [0, 0, 0, 1],
    ],
  },
  4: {
    name: 'DRILL 4',
    subtitle: 'Full coupled Bombe array.',
    couplings: [
      [1, 0, 2, 0],
      [3, 1, 1, 2],
      [1, 2, 1, 2],
      [3, 3, 2, 1],
    ],
  },
};

const MOORE_BG = '/assets/puzzles/moore-logic-machine.png';
export type MooreDifficultyId = 1 | 2 | 3 | 4 | 5;
type MooreSignal = 'A' | '!A' | 'B' | '!B' | 'C' | '!C';
type MooreInput = Record<'A' | 'B' | 'C', boolean>;

const MOORE_SIGNAL_OPTIONS: MooreSignal[] = ['A', '!A', 'B', '!B', 'C', '!C'];
const MOORE_LEVELS: Record<MooreDifficultyId, {
  title: string;
  subtitle: string;
  target: string;
  variables: Array<'A' | 'B' | 'C'>;
  branches: number[][];
  solution: MooreSignal[];
  rule: (input: MooreInput) => boolean;
}> = {
  1: {
    title: 'MOORE GATE ARRAY: DRILL 1',
    subtitle: 'Build a NOT gate. A transistor opens when its control condition is powered.',
    target: 'OUT = NOT A',
    variables: ['A'],
    branches: [[0]],
    solution: ['!A'],
    rule: input => !input.A,
  },
  2: {
    title: 'MOORE GATE ARRAY: DRILL 2',
    subtitle: 'Build an AND gate with two transistors in series.',
    target: 'OUT = A AND B',
    variables: ['A', 'B'],
    branches: [[0, 1]],
    solution: ['A', 'B'],
    rule: input => input.A && input.B,
  },
  3: {
    title: 'MOORE GATE ARRAY: DRILL 3',
    subtitle: 'Build an OR gate with two parallel transistor lanes.',
    target: 'OUT = A OR B',
    variables: ['A', 'B'],
    branches: [[0], [1]],
    solution: ['A', 'B'],
    rule: input => input.A || input.B,
  },
  4: {
    title: 'MOORE GATE ARRAY: DRILL 4',
    subtitle: 'Build XOR: two valid paths, but each path must block the matching pair.',
    target: 'OUT = A XOR B',
    variables: ['A', 'B'],
    branches: [[0, 1], [2, 3]],
    solution: ['A', '!B', '!A', 'B'],
    rule: input => input.A !== input.B,
  },
  5: {
    title: 'MOORE GATE ARRAY: DRILL 5',
    subtitle: 'Build a majority gate. Output turns on when at least two inputs are powered.',
    target: 'OUT = MAJORITY(A,B,C)',
    variables: ['A', 'B', 'C'],
    branches: [[0, 1], [2, 3], [4, 5]],
    solution: ['A', 'B', 'A', 'C', 'B', 'C'],
    rule: input => [input.A, input.B, input.C].filter(Boolean).length >= 2,
  },
};

function evaluateMooreSignal(signal: MooreSignal | null, input: MooreInput) {
  if (!signal) return false;
  if (signal.startsWith('!')) return !input[signal.slice(1) as 'A' | 'B' | 'C'];
  return input[signal];
}

function mooreRows(variables: Array<'A' | 'B' | 'C'>) {
  const count = 2 ** variables.length;
  return Array.from({ length: count }, (_, row) => {
    const input: MooreInput = { A: false, B: false, C: false };
    variables.forEach((variable, index) => {
      input[variable] = Boolean(row & (1 << (variables.length - index - 1)));
    });
    return input;
  });
}

function PuzzleShell({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,5,8,0.92)', backdropFilter: 'blur(5px)' }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: 'min(92vw, 920px)',
          minHeight: 'min(78vh, 620px)',
          border: `2px solid ${accent}`,
          boxShadow: `0 0 52px ${accent}33, inset 0 0 36px rgba(255,255,255,0.04)`,
          background: '#090A0D',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              `repeating-linear-gradient(0deg, transparent, transparent 27px, ${accent}14 28px), repeating-linear-gradient(90deg, transparent, transparent 27px, rgba(255,244,194,0.06) 28px)`,
            mixBlendMode: 'screen',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              `radial-gradient(circle at 50% 42%, ${accent}22, transparent 34%), linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.72))`,
          }}
        />
        <div className="relative z-10 flex h-full min-h-[inherit] flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono-data text-[9px] tracking-[0.28em]" style={{ color: accent }}>
                HISTORICAL INTELLIGENCE EXERCISE
              </div>
              <h2 className="font-orbitron text-2xl font-black tracking-wider" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                {title}
              </h2>
              <p className="font-rajdhani text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {subtitle}
              </p>
            </div>
            <div
              className="font-mono-data text-[9px] px-2 py-1"
              style={{ color: '#050508', background: accent, border: `1px solid ${accent}` }}
            >
              LOCKED UNTIL SOLVED
            </div>
          </div>
          <div className="relative mt-4 flex flex-1 items-center justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TuringPuzzle({
  onSolved,
  difficulty = 4,
}: {
  onSolved: () => void;
  difficulty?: TuringDifficultyId;
}) {
  const [rotors, setRotors] = useState([0, 0, 0, 0]);
  const [solved, setSolved] = useState(false);
  const config = TURING_DIFFICULTIES[difficulty];
  const isCorrect = rotors.every((value, i) => value === TURING_TARGET[i]);

  useEffect(() => {
    if (!isCorrect || solved) return;
    setSolved(true);
    play('victory');
    window.setTimeout(onSolved, 1100);
  }, [isCorrect, solved, onSolved]);

  const cycle = (index: number, direction: number) => {
    if (solved) return;
    play('click', 0.45);
    setRotors(prev => prev.map((value, i) => {
      const delta = config.couplings[index][i] * direction;
      return (value + delta + 10) % 10;
    }));
  };

  return (
    <PuzzleShell
      title={`BOMBE CIPHER VAULT: ${config.name}`}
      subtitle={config.subtitle}
      accent="#33FF33"
    >
      <div className="relative w-full max-w-[840px] overflow-hidden" style={{ aspectRatio: '16 / 9', border: '2px solid #C4A265', background: '#050508' }}>
        <img
          src={TURING_BG}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          style={{ filter: solved ? 'brightness(1.15) saturate(1.1)' : 'brightness(0.78) saturate(0.9)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(51,255,51,0.12), transparent 28%), linear-gradient(180deg, rgba(5,5,8,0.05), rgba(5,5,8,0.32))',
          }}
        />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: solved ? '#33FF33' : '#3A3D45', boxShadow: solved ? '0 0 18px #33FF33' : 'none' }} />
          <div className="font-mono-data text-[9px] px-2 py-1" style={{ color: solved ? '#050508' : '#33FF33', background: solved ? '#33FF33' : 'rgba(5,5,8,0.72)', border: '1px solid #33FF33' }}>
            {solved ? 'BOMBE RUNNING' : 'TARGET 1943'}
          </div>
        </div>
        <div className="absolute inset-0">
          {rotors.map((value, index) => {
            const matched = value === TURING_TARGET[index];
            const position = TURING_ROTOR_POSITIONS[index];
            return (
              <div
                key={index}
                className="absolute flex items-center justify-center"
                style={{
                  left: position.left,
                  top: position.top,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className="absolute left-1/2 top-[-24px] -translate-x-1/2 whitespace-nowrap font-mono-data text-[9px]"
                  style={{ color: matched ? '#33FF33' : '#C4A265', textShadow: '0 2px 4px #000' }}
                >
                  ROTOR {index + 1}
                </div>
                <div
                  className="relative"
                  style={{
                    width: 'clamp(62px, 10.4vw, 99px)',
                    height: 'clamp(62px, 10.4vw, 99px)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => cycle(index, -1)}
                    className="absolute left-[-18px] top-1/2 z-20 flex -translate-y-1/2 items-center justify-center font-orbitron text-xs font-black"
                    style={{
                      width: 20,
                      height: 30,
                      color: '#FFF4C2',
                      background: 'rgba(5,5,8,0.86)',
                      border: '1px solid #C4A265',
                    }}
                  >
                    -
                  </button>
                  <div
                    className="absolute inset-0 overflow-hidden rounded-full"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 50%, #050508 0 31%, #17110C 32% 42%, #6E5630 43% 48%, #15161A 49% 54%, #C4A265 55% 58%, #1B1A16 59% 100%)',
                      border: `2px solid ${matched ? '#33FF33' : '#C4A265'}`,
                      boxShadow: matched
                        ? '0 0 26px rgba(51,255,51,0.72), inset 0 0 26px rgba(0,0,0,0.9)'
                        : '0 10px 20px rgba(0,0,0,0.72), inset 0 0 24px rgba(0,0,0,0.9)',
                      transform: `rotate(${value * 36}deg)`,
                      transition: 'transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
                    }}
                  >
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
                      {Array.from({ length: 10 }).map((_, tick) => (
                        <line
                          key={tick}
                          x1="50"
                          y1={tick % 5 === 0 ? 7 : 10}
                          x2="50"
                          y2={tick % 5 === 0 ? 21 : 18}
                          transform={`rotate(${tick * 36} 50 50)`}
                          stroke={tick % 5 === 0 ? '#FFF4C2' : '#C4A265'}
                          strokeWidth={tick % 5 === 0 ? 2.1 : 1.4}
                          strokeLinecap="square"
                        />
                      ))}
                    </svg>
                  </div>
                  <div
                    className="absolute inset-[29%] z-10 flex items-center justify-center rounded-full font-orbitron text-3xl font-black"
                    style={{
                      color: matched ? '#33FF33' : '#FFF4C2',
                      background: 'radial-gradient(circle, #07090A, #111318)',
                      border: `2px solid ${matched ? '#33FF33' : '#C4A265'}`,
                      textShadow: matched ? '0 0 14px #33FF33' : '0 2px 4px #000',
                    }}
                  >
                    {value}
                  </div>
                  <button
                    type="button"
                    onClick={() => cycle(index, 1)}
                    className="absolute right-[-18px] top-1/2 z-20 flex -translate-y-1/2 items-center justify-center font-orbitron text-xs font-black"
                    style={{
                      width: 20,
                      height: 30,
                      color: '#FFF4C2',
                      background: 'rgba(5,5,8,0.86)',
                      border: '1px solid #C4A265',
                    }}
                  >
                    +
                  </button>
                </div>
                <div className="absolute left-1/2 top-[calc(100%+7px)] h-1.5 w-16 -translate-x-1/2" style={{ background: matched ? '#33FF33' : '#3A3D45', boxShadow: matched ? '0 0 12px #33FF33' : 'none' }} />
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-4 gap-2">
          {config.couplings.map((speeds, i) => (
            <div
              key={i}
              className="font-mono-data text-center text-[8px] py-1"
              style={{ color: '#C4A265', background: 'rgba(5,5,8,0.74)', border: '1px solid rgba(196,162,101,0.45)' }}
            >
              DRIVE {i + 1}: {speeds.join('-')}
            </div>
          ))}
        </div>
      </div>
    </PuzzleShell>
  );
}

export function MoorePuzzle({
  onSolved,
  difficulty = 5,
}: {
  onSolved: () => void;
  difficulty?: MooreDifficultyId;
}) {
  const config = MOORE_LEVELS[difficulty];
  const rows = mooreRows(config.variables);
  const [selectedRow, setSelectedRow] = useState(0);
  const [assignments, setAssignments] = useState<Array<MooreSignal | null>>(
    () => Array.from({ length: config.solution.length }, () => null)
  );
  const [solved, setSolved] = useState(false);
  const currentInput = rows[selectedRow];
  const signalOptions = MOORE_SIGNAL_OPTIONS.filter(signal => config.variables.includes(signal.replace('!', '') as 'A' | 'B' | 'C'));
  const branchActive = (branch: number[], input: MooreInput) => branch.every(slot => evaluateMooreSignal(assignments[slot], input));
  const outputFor = (input: MooreInput) => config.branches.some(branch => branchActive(branch, input));
  const isComplete = assignments.every(Boolean) && rows.every(input => outputFor(input) === config.rule(input));

  useEffect(() => {
    if (!isComplete || solved) return;
    setSolved(true);
    play('victory');
    window.setTimeout(onSolved, 1100);
  }, [isComplete, solved, onSolved]);

  const toggle = (index: number) => {
    if (solved) return;
    play('click', 0.45);
    setAssignments(prev => prev.map((value, i) => {
      if (i !== index) return value;
      const currentIndex = value ? signalOptions.indexOf(value) : -1;
      return signalOptions[(currentIndex + 1) % signalOptions.length];
    }));
  };

  return (
    <PuzzleShell
      title={config.title}
      subtitle={config.subtitle}
      accent="#00F0FF"
    >
      <div className="relative w-full max-w-[840px] overflow-hidden" style={{ aspectRatio: '16 / 9', border: '2px solid #123B4A', background: '#071015' }}>
        <img
          src={MOORE_BG}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          style={{ filter: solved ? 'brightness(1.05) saturate(1.08)' : 'brightness(0.62) saturate(0.9)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(0,240,255,0.14), transparent 34%), linear-gradient(180deg, rgba(7,16,21,0.08), rgba(7,16,21,0.42))',
          }}
        />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: solved ? '#33FF33' : '#00F0FF', boxShadow: `0 0 16px ${solved ? '#33FF33' : '#00F0FF'}` }} />
          <div className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#050508', background: solved ? '#33FF33' : '#00F0FF', border: '1px solid #FFF4C2' }}>
            {solved ? 'CIRCUIT STABLE' : config.target}
          </div>
        </div>
        <div
          className="absolute right-4 top-4 font-mono-data text-[8px] px-2 py-1"
          style={{ color: '#00F0FF', background: 'rgba(5,9,12,0.74)', border: '1px solid rgba(0,240,255,0.45)' }}
        >
          CLICK TRANSISTOR BLOCKS TO CHANGE CONTROL SIGNAL
        </div>
        <svg viewBox="0 0 760 360" className="absolute inset-x-[7%] top-[9%] h-[68%] w-[86%]" role="img" aria-label="Moore transistor logic maze">
          <defs>
            <filter id="circuit-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="48" y="36" width="664" height="288" fill="rgba(5,9,12,0.48)" stroke="#C4A265" strokeWidth="2" />
          <text x="70" y="74" fill="#00F0FF" fontFamily="monospace" fontSize="13" fontWeight="700">VCC</text>
          <text x="674" y="74" fill={outputFor(currentInput) ? '#33FF33' : '#C4A265'} fontFamily="monospace" fontSize="13" fontWeight="700" textAnchor="end">OUT</text>
          {config.branches.map((branch, branchIndex) => {
            const branchY = 122 + branchIndex * (config.branches.length > 2 ? 62 : 92);
            const isBranchActive = branchActive(branch, currentInput);
            const xStep = 430 / (branch.length + 1);
            const slotPoints = branch.map((slot, slotIndex) => ({
              slot,
              x: 165 + xStep * (slotIndex + 1),
              y: branchY,
            }));
            const wirePoints = [`M 82 ${branchY}`, ...slotPoints.map(point => `H ${point.x - 42} M ${point.x + 42} ${branchY}`), `H 678`].join(' ');
            return (
              <g key={branchIndex}>
                <path
                  d={wirePoints}
                  fill="none"
                  stroke={isBranchActive ? '#00F0FF' : '#49515A'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={isBranchActive ? 'url(#circuit-glow)' : undefined}
                />
                <path d={`M 82 ${branchY} H 678`} fill="none" stroke="#C4A26533" strokeWidth="2" strokeDasharray="9 10" />
                {slotPoints.map(({ slot, x, y }) => {
                  const signal = assignments[slot];
                  const open = evaluateMooreSignal(signal, currentInput);
                  return (
                    <g key={slot} onClick={() => toggle(slot)} style={{ cursor: 'pointer' }}>
                      <rect
                        x={x - 38}
                        y={y - 26}
                        width="76"
                        height="52"
                        rx="4"
                        fill={open ? '#0B3540' : '#111318'}
                        stroke={signal ? (open ? '#00F0FF' : '#C4A265') : '#755F3F'}
                        strokeWidth="2"
                        filter={open ? 'url(#circuit-glow)' : undefined}
                      />
                      <path d={`M ${x - 31} ${y + 14} H ${x + 31} M ${x} ${y - 21} V ${y + 20}`} stroke={open ? '#00F0FF' : '#C4A265'} strokeWidth="2" opacity="0.8" />
                      <circle cx={x - 29} cy={y + 14} r="4" fill={open ? '#00F0FF' : '#15161A'} stroke="#FFF4C2" strokeWidth="1" />
                      <circle cx={x + 29} cy={y + 14} r="4" fill={open ? '#00F0FF' : '#15161A'} stroke="#FFF4C2" strokeWidth="1" />
                      <circle cx={x} cy={y - 20} r="4" fill={signal ? '#FFF4C2' : '#15161A'} stroke="#C4A265" strokeWidth="1" />
                      <text x={x} y={y + 5} fill={signal ? '#FFF4C2' : '#C4A265'} fontFamily="Orbitron" fontSize="18" fontWeight="900" textAnchor="middle">
                        {signal || '?'}
                      </text>
                      <text x={x} y={y + 42} fill={open ? '#00F0FF' : '#C4A265'} fontFamily="monospace" fontSize="9" textAnchor="middle">
                        {open ? 'OPEN' : 'CLOSED'}
                      </text>
                      <text x={x} y={y - 36} fill="#C4A265" fontFamily="monospace" fontSize="8" textAnchor="middle">
                        T{slot + 1}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
          <circle cx="82" cy="122" r="12" fill="#00F0FF" stroke="#FFF4C2" strokeWidth="2" filter="url(#circuit-glow)" />
          <circle cx="678" cy="122" r="12" fill={outputFor(currentInput) ? '#33FF33' : '#242832'} stroke="#FFF4C2" strokeWidth="2" filter={outputFor(currentInput) ? 'url(#circuit-glow)' : undefined} />
        </svg>
        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-[1.05fr_1.55fr] gap-3">
          <div
            className="p-2"
            style={{ background: 'rgba(5,9,12,0.78)', border: '1px solid rgba(196,162,101,0.48)' }}
          >
            <div className="font-mono-data text-[8px] mb-1" style={{ color: '#C4A265' }}>
              GOAL
            </div>
            <div className="font-orbitron text-[12px] font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
              {config.target}
            </div>
            <div className="mt-1 font-rajdhani text-[11px] font-semibold leading-tight" style={{ color: 'var(--text-secondary)' }}>
              Set each transistor control on the circuit board. A branch conducts only when every transistor on that branch is open.
            </div>
            <button
              type="button"
              onClick={() => {
                play('click', 0.25);
                setSelectedRow((selectedRow + 1) % rows.length);
              }}
              className="mt-2 w-full py-1 font-mono-data text-[8px]"
              style={{ color: '#050508', background: '#00F0FF', border: '1px solid #FFF4C2' }}
            >
              TEST NEXT INPUT
            </button>
          </div>

          <div
            className="grid gap-1 p-2"
            style={{ background: 'rgba(5,9,12,0.78)', border: '1px solid rgba(0,240,255,0.36)' }}
          >
            <div className="grid grid-cols-[1.1fr_0.7fr_0.7fr] gap-1 font-mono-data text-[8px]" style={{ color: '#C4A265' }}>
              <div>INPUT</div>
              <div>WANTED</div>
              <div>NOW</div>
            </div>
            {rows.map((input, index) => {
              const target = config.rule(input);
              const actual = outputFor(input);
              const matches = actual === target;
              return (
                <div
                  key={index}
                  className="grid grid-cols-[1.1fr_0.7fr_0.7fr] gap-1 font-mono-data text-[8px] py-1 px-1 text-left"
                  style={{
                    color: index === selectedRow ? '#050508' : matches ? '#33FF33' : '#FF477E',
                    background: index === selectedRow ? '#00F0FF' : 'rgba(5,9,12,0.76)',
                    border: `1px solid ${matches ? '#33FF33' : '#FF477E'}`,
                  }}
                >
                  <span>{config.variables.map(variable => `${variable}=${input[variable] ? 1 : 0}`).join(' ')}</span>
                  <span>{target ? 'ON' : 'OFF'}</span>
                  <span>{actual ? 'ON' : 'OFF'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PuzzleShell>
  );
}

export default function EventPopup() {
  const { state, dispatch } = useGame();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [phase, setPhase] = useState<'video' | 'card' | 'puzzle'>('video');
  const lastEventRef = useRef<string | null>(null);

  const evt = events.find(e => e.id === state.showEvent);
  const hasPuzzle = !!evt && puzzleEvents.has(evt.id);

  useEffect(() => {
    const eventId = state.showEvent;
    if (eventId && eventId !== lastEventRef.current) {
      lastEventRef.current = eventId;
      setVideoCompleted(false);
      setPhase('video');
      play('alert');
      setVideoSrc(getVideoUrl(`event-${eventId}`));
    }
    if (!eventId) {
      lastEventRef.current = null;
      setVideoCompleted(false);
      setPhase('video');
      setVideoSrc(null);
    }
  }, [state.showEvent]);

  useEffect(() => {
    if (videoCompleted && phase === 'video') {
      setPhase('card');
    }
  }, [videoCompleted, phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!evt || phase !== 'card') return;
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        if (hasPuzzle) {
          play('click');
          setPhase('puzzle');
        } else {
          handleAcknowledge();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleVideoComplete = () => {
    setVideoSrc(null);
    setVideoCompleted(true);
  };

  const handleAcknowledge = () => {
    play('click');
    setVideoSrc(null);
    dispatch({ type: 'DISMISS_EVENT' });
  };

  const handleCardContinue = () => {
    if (hasPuzzle) {
      play('click');
      setPhase('puzzle');
    } else {
      handleAcknowledge();
    }
  };

  const handlePuzzleSolved = useCallback(() => {
    dispatch({ type: 'DISMISS_EVENT' });
  }, [dispatch]);

  if (!evt) return null;

  if (phase === 'video' && !videoCompleted && videoSrc) {
    return <VideoPlayer src={videoSrc} onComplete={handleVideoComplete} />;
  }

  if (phase === 'puzzle') {
    if (evt.id === 'turing') return <TuringPuzzle onSolved={handlePuzzleSolved} />;
    if (evt.id === 'moore') return <MoorePuzzle onSolved={handlePuzzleSolved} />;
  }

  const cardImage = eventCardMap[evt.id];
  const typeColors = {
    info: '#00F0FF',
    warning: '#FFB84D',
    danger: '#FF477E',
  };
  const typeColor = typeColors[evt.type] || '#FFB84D';

  const effects: string[] = [];
  if (evt.gdp && evt.gdp < 0) effects.push(`GDP ${(evt.gdp * 100).toFixed(0)}%`);
  if (evt.gdp && evt.gdp > 0) effects.push(`GDP +${(evt.gdp * 100).toFixed(0)}%`);
  if (evt.energy) effects.push(`Energy ${evt.energy > 0 ? '+' : ''}${evt.energy}`);
  if (evt.stability) effects.push(`Stability ${evt.stability > 0 ? '+' : ''}${evt.stability}`);
  if (evt.materials) effects.push(`Materials ${evt.materials > 0 ? '+' : ''}${evt.materials}`);
  if (evt.compute) effects.push(`Compute +${(evt.compute * 100).toFixed(0)}%`);

  if (cardImage) {
    return (
      <div
        className="absolute inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(4px)' }}
      >
        <div
          className="animate-fade-up relative flex flex-col items-center gap-3"
          style={{
            maxWidth: 'min(92vw, 760px)',
            maxHeight: 'calc(100vh - 32px)',
          }}
        >
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: '10px',
              border: `2px solid ${typeColor}`,
              boxShadow: `0 0 42px ${typeColor}44, 0 20px 60px rgba(0,0,0,0.62)`,
              background: '#050508',
            }}
          >
            <img
              src={cardImage}
              alt={evt.name}
              className="block"
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: 'min(92vw, 760px)',
                maxHeight: 'calc(100vh - 118px)',
                objectFit: 'contain',
              }}
              draggable={false}
            />
          </div>
          <div className="flex w-full flex-col gap-2 px-2" style={{ maxWidth: 'min(92vw, 760px)' }}>
            {effects.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {effects.map((eff, i) => (
                  <span
                    key={i}
                    className="font-mono-data text-[9px] px-2 py-0.5 rounded"
                    style={{
                      background: eff.includes('-') ? 'var(--rose-dim)' : 'var(--green-dim)',
                      color: eff.includes('-') ? 'var(--rose)' : 'var(--green)',
                    }}
                  >
                    {eff}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={handleCardContinue}
              className="w-full py-2.5 rounded font-orbitron text-sm font-bold tracking-wider transition-all hover:brightness-120"
              style={{ background: typeColor + '22', color: typeColor, border: `2px solid ${typeColor}` }}
            >
              {hasPuzzle ? 'BEGIN PUZZLE' : 'ACKNOWLEDGE'}
            </button>
            <div className="text-center">
              <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
                {hasPuzzle ? 'Press ENTER to begin puzzle' : 'Press ENTER to dismiss'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="panel-elevated p-5 flex flex-col gap-3 animate-fade-up"
        style={{ maxWidth: '420px', width: '85%', border: `2px solid ${typeColor}`, boxShadow: `0 0 30px ${typeColor}22` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: typeColor }} />
          <span className="font-orbitron text-[10px] tracking-wider" style={{ color: typeColor }}>
            {evt.type.toUpperCase()} - {evt.year}
          </span>
        </div>
        <h2 className="font-orbitron text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {evt.name}
        </h2>
        <p className="font-rajdhani text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {evt.description}
        </p>
        {effects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {effects.map((eff, i) => (
              <span
                key={i}
                className="font-mono-data text-[9px] px-2 py-0.5 rounded"
                style={{
                  background: eff.includes('-') ? 'var(--rose-dim)' : 'var(--green-dim)',
                  color: eff.includes('-') ? 'var(--rose)' : 'var(--green)',
                }}
              >
                {eff}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={handleCardContinue}
          className="w-full py-2.5 mt-1 rounded font-orbitron text-sm font-bold tracking-wider transition-all hover:brightness-120"
          style={{ background: typeColor + '22', color: typeColor, border: `2px solid ${typeColor}` }}
        >
          {hasPuzzle ? 'BEGIN PUZZLE' : 'ACKNOWLEDGE'}
        </button>
        <div className="text-center">
          <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
            {hasPuzzle ? 'Press ENTER to begin puzzle' : 'Press ENTER to dismiss'}
          </span>
        </div>
      </div>
    </div>
  );
}
