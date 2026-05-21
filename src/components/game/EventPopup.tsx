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
  perceptron: '/assets/puzzles/perceptron-weight-board.png',
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

const puzzleBackgroundMap: Record<string, string> = {
  perceptron: '/assets/puzzles/perceptron-weight-board.png',
};

const techPuzzleIds = ['turing', 'perceptron', 'lisp', 'moore'];
const puzzleEvents = new Set(techPuzzleIds);

type ClassicPuzzleConfig =
  | {
      kind: 'sequence';
      title: string;
      subtitle: string;
      accent: string;
      panel: string;
      nodes: string[];
      solution: number[];
    }
  | {
      kind: 'switchboard';
      title: string;
      subtitle: string;
      accent: string;
      panel: string;
      nodes: string[];
      initial: boolean[];
      target: boolean[];
      masks: number[][];
    }
  | {
      kind: 'hanoi';
      title: string;
      subtitle: string;
      accent: string;
      panel: string;
      disks: number;
    };

export const classicPuzzleMap: Record<string, ClassicPuzzleConfig> = {
  perceptron: {
    kind: 'switchboard',
    title: 'PERCEPTRON RELAY MACHINE',
    subtitle: 'Tune the six physical relays inside the machine sockets until the neural output fires.',
    accent: '#33FF33',
    panel: 'perceptron relay',
    nodes: ['X1', 'X2', 'X3', 'W1', 'W2', 'OUT'],
    initial: [false, true, false, false, true, false],
    target: [true, false, true, false, true, true],
    masks: [[0, 1], [0, 2, 3], [1, 2, 4], [2, 3, 5], [0, 4, 5], [1, 3, 5]],
  },
};

export type PerceptronDifficultyId = 1 | 2 | 3 | 4 | 5;
export type LispDifficultyId = 1 | 2 | 3 | 4 | 5;

export const PERCEPTRON_LEVELS: Record<PerceptronDifficultyId, Extract<ClassicPuzzleConfig, { kind: 'switchboard' }>> = {
  1: {
    kind: 'switchboard',
    title: 'PERCEPTRON RELAY MACHINE: LEVEL 1',
    subtitle: 'One independent input relay. Learn how a single neuron socket switches on.',
    accent: '#33FF33',
    panel: 'single relay',
    nodes: ['X1', 'X2', 'X3', 'W1', 'W2', 'OUT'],
    initial: [false, false, false, false, false, false],
    target: [true, false, false, false, false, false],
    masks: [[0], [1], [2], [3], [4], [5]],
  },
  2: {
    kind: 'switchboard',
    title: 'PERCEPTRON RELAY MACHINE: LEVEL 2',
    subtitle: 'Two relays are mechanically linked. One switch can move two sockets.',
    accent: '#33FF33',
    panel: 'paired relays',
    nodes: ['X1', 'X2', 'X3', 'W1', 'W2', 'OUT'],
    initial: [false, false, false, false, false, false],
    target: [true, true, false, false, false, false],
    masks: [[0, 1], [1], [2], [3], [4], [5]],
  },
  3: {
    kind: 'switchboard',
    title: 'PERCEPTRON RELAY MACHINE: LEVEL 3',
    subtitle: 'A three-socket training chain introduces drift between input relays.',
    accent: '#33FF33',
    panel: 'training chain',
    nodes: ['X1', 'X2', 'X3', 'W1', 'W2', 'OUT'],
    initial: [false, true, false, false, false, false],
    target: [true, true, false, true, false, false],
    masks: [[0, 1], [1, 2], [2, 3], [3], [4], [5]],
  },
  4: {
    kind: 'switchboard',
    title: 'PERCEPTRON RELAY MACHINE: LEVEL 4',
    subtitle: 'Inputs and weights are cross-coupled. Tune the hidden layer before the output.',
    accent: '#33FF33',
    panel: 'weighted layer',
    nodes: ['X1', 'X2', 'X3', 'W1', 'W2', 'OUT'],
    initial: [true, false, true, false, true, false],
    target: [false, true, true, true, false, true],
    masks: [[0, 3], [1, 3], [2, 4], [3, 5], [0, 4, 5], [1, 2, 5]],
  },
  5: {
    kind: 'switchboard',
    title: 'PERCEPTRON RELAY MACHINE: LEVEL 5',
    subtitle: 'Full six-relay perceptron. Coupled inputs, weights and output must all match.',
    accent: '#33FF33',
    panel: 'full perceptron',
    nodes: ['X1', 'X2', 'X3', 'W1', 'W2', 'OUT'],
    initial: [false, true, false, false, true, false],
    target: [false, false, false, true, false, true],
    masks: [[0, 1], [0, 2, 3], [1, 2, 4], [2, 3, 5], [0, 4, 5], [1, 3, 5]],
  },
};

type LispBlockId = 'CAR' | 'CDR' | 'CONS' | 'COND' | 'RECURSION';
type LispValue = string | string[];

const LISP_BLOCKS: Record<LispBlockId, { label: string; description: string; color: string }> = {
  CAR: { label: 'CAR', description: 'FIRST', color: '#00F0FF' },
  CDR: { label: 'CDR', description: 'REST', color: '#33FF33' },
  CONS: { label: 'CONS', description: 'JOIN', color: '#C4A265' },
  COND: { label: 'COND', description: 'BRANCH', color: '#FFB84D' },
  RECURSION: { label: 'RECURSION', description: 'LOOP', color: '#FF477E' },
};

export const LISP_LEVELS: Record<LispDifficultyId, {
  title: string;
  subtitle: string;
  mission: string;
  output: string;
  input: string[];
  target: string;
  slots: number;
  solution: LispBlockId[];
}> = {
  1: {
    title: 'PROTOCOLO McCARTHY: LISP LEVEL 1',
    subtitle: 'Extract the first symbol from an intelligence list.',
    mission: 'GENESIS OF SYMBOLIC PROCESSING',
    output: 'HYPOTHESIS GENERATION',
    input: ['LOGIC', 'LIST', 'ATOM'],
    target: 'LOGIC',
    slots: 1,
    solution: ['CAR'],
  },
  2: {
    title: 'PROTOCOLO McCARTHY: LISP LEVEL 2',
    subtitle: 'Discard the decoy header and isolate the next symbol.',
    mission: 'LIST DECOMPOSITION',
    output: 'SIGNAL EXTRACTION',
    input: ['DECOY', 'RADAR', 'NOISE'],
    target: 'RADAR',
    slots: 2,
    solution: ['CDR', 'CAR'],
  },
  3: {
    title: 'PROTOCOLO McCARTHY: LISP LEVEL 3',
    subtitle: 'Pattern classifier: isolate SATELLITE from the intercepted Soviet stream.',
    mission: 'PATTERN CLASSIFIER',
    output: 'PATTERN RECOGNITION',
    input: ['AMENAZA', 'SPUTNIK', 'SATELLITE', 'RADAR'],
    target: 'SATELLITE',
    slots: 3,
    solution: ['CDR', 'CDR', 'CAR'],
  },
  4: {
    title: 'PROTOCOLO McCARTHY: LISP LEVEL 4',
    subtitle: 'Traverse deeper into the symbolic list before reading the cognitive atom.',
    mission: 'DEEP SYMBOL SEARCH',
    output: 'COGNITIVE ROUTING',
    input: ['NOISE', 'TELEMETRY', 'RADAR', 'AGI'],
    target: 'AGI',
    slots: 4,
    solution: ['CDR', 'CDR', 'CDR', 'CAR'],
  },
  5: {
    title: 'PROTOCOLO McCARTHY: LISP LEVEL 5',
    subtitle: 'Use conditional routing before extraction to recover the AGI architecture symbol.',
    mission: 'ARCHITECTURE AGI',
    output: 'AGI ARCHITECTURE',
    input: ['DECOY', 'NOISE', 'SPUTNIK', 'AGI', 'NIL'],
    target: 'AGI',
    slots: 3,
    solution: ['CDR', 'COND', 'CAR'],
  },
};
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
const LISP_BG = '/assets/puzzles/lisp-dartmouth-lab.png';
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

type MooreRoute = 'block' | 'straight' | 'up' | 'down';
type MooreDestination = number | 'out' | 'sink';
type MooreSwitch = {
  x: number;
  y: number;
  routes: Partial<Record<MooreRoute, MooreDestination>>;
};

const MOORE_ROUTE_ORDER: MooreRoute[] = ['block', 'straight', 'up', 'down'];
const MOORE_ROUTE_LABELS: Record<MooreRoute, string> = {
  block: 'STOP',
  straight: 'FLOW',
  up: 'UP',
  down: 'DOWN',
};

const MOORE_MAZES: Record<MooreDifficultyId, {
  title: string;
  subtitle: string;
  target: string;
  switches: MooreSwitch[];
}> = {
  1: {
    title: 'MOORE CURRENT MAZE: DRILL 1',
    subtitle: 'One transistor-valve. Open the path from source to output.',
    target: 'SOURCE TO OUT',
    switches: [
      { x: 230, y: 180, routes: { straight: 'out' } },
    ],
  },
  2: {
    title: 'MOORE CURRENT MAZE: DRILL 2',
    subtitle: 'The first valve must choose the live upper branch.',
    target: 'FIND THE POWERED BRANCH',
    switches: [
      { x: 170, y: 180, routes: { up: 1, down: 2 } },
      { x: 430, y: 112, routes: { straight: 'out' } },
      { x: 430, y: 248, routes: { straight: 'sink' } },
    ],
  },
  3: {
    title: 'MOORE CURRENT MAZE: DRILL 3',
    subtitle: 'Route through a two-stage transistor channel.',
    target: 'UP THEN DOWN',
    switches: [
      { x: 150, y: 210, routes: { up: 1, straight: 2 } },
      { x: 330, y: 110, routes: { down: 3, straight: 'sink' } },
      { x: 330, y: 210, routes: { straight: 'sink' } },
      { x: 540, y: 210, routes: { straight: 'out' } },
    ],
  },
  4: {
    title: 'MOORE CURRENT MAZE: DRILL 4',
    subtitle: 'A denser chip adds detours. Avoid the dead buses.',
    target: 'ZIGZAG TO OUT',
    switches: [
      { x: 130, y: 180, routes: { straight: 1, up: 2 } },
      { x: 270, y: 180, routes: { down: 3, straight: 'sink' } },
      { x: 270, y: 94, routes: { straight: 'sink' } },
      { x: 430, y: 260, routes: { up: 4, straight: 'sink' } },
      { x: 570, y: 150, routes: { straight: 'out' } },
    ],
  },
  5: {
    title: 'MOORE CURRENT MAZE: DRILL 5',
    subtitle: 'Moore-style density: many transistor gates, one valid current path.',
    target: 'COMPLETE THE CHIP BUS',
    switches: [
      { x: 115, y: 182, routes: { up: 1, straight: 2, down: 3 } },
      { x: 250, y: 92, routes: { straight: 'sink', down: 4 } },
      { x: 250, y: 182, routes: { straight: 'sink', up: 1 } },
      { x: 250, y: 272, routes: { straight: 4 } },
      { x: 430, y: 272, routes: { up: 5, straight: 'sink' } },
      { x: 555, y: 138, routes: { down: 6, straight: 'sink' } },
      { x: 640, y: 220, routes: { straight: 'out' } },
    ],
  },
};

function traceMooreCurrent(switches: MooreSwitch[], states: MooreRoute[]) {
  const activeNodes = new Set<number>();
  const activeRoutes = new Set<string>();
  let current: MooreDestination = 0;
  let reachedOut = false;
  const guard = switches.length + 4;

  for (let step = 0; step < guard; step++) {
    if (current === 'out') {
      reachedOut = true;
      break;
    }
    if (current === 'sink' || typeof current !== 'number' || activeNodes.has(current)) break;
    const route = states[current];
    activeNodes.add(current);
    if (route === 'block') break;
    const next = switches[current].routes[route];
    if (next === undefined) break;
    activeRoutes.add(`${current}-${route}`);
    current = next;
  }

  return { activeNodes, activeRoutes, reachedOut };
}

function moorePipePath(from: MooreSwitch, route: MooreRoute, to: MooreSwitch | 'out' | 'sink') {
  const exit = route === 'up' ? { x: from.x, y: from.y - 58 } : route === 'down' ? { x: from.x, y: from.y + 58 } : { x: from.x + 58, y: from.y };
  const target = to === 'out'
    ? { x: 705, y: from.y }
    : to === 'sink'
      ? { x: Math.min(from.x + 150, 690), y: from.y + (route === 'up' ? -70 : route === 'down' ? 70 : 0) }
      : { x: to.x - 58, y: to.y };
  return `M ${from.x} ${from.y} L ${exit.x} ${exit.y} H ${target.x} V ${target.y}`;
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
      className="fixed inset-0 z-[80] flex items-stretch justify-stretch"
      style={{ background: 'rgba(5,5,8,0.92)', backdropFilter: 'blur(5px)' }}
    >
      <div
        className="relative flex h-[100dvh] w-full overflow-hidden"
        style={{
          boxShadow: `inset 0 0 72px ${accent}22, inset 0 0 36px rgba(255,255,255,0.04)`,
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
        <div className="relative z-10 flex h-full min-h-0 w-full flex-col p-4 md:p-5">
          <div className="flex shrink-0 items-start justify-between gap-4">
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
          <div className="relative mt-3 flex min-h-0 flex-1 items-center justify-center">
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
      <div className="relative w-full overflow-hidden" style={{ width: 'min(calc(100vw - 32px), calc((100dvh - 122px) * 16 / 9))', aspectRatio: '16 / 9', border: '2px solid #C4A265', background: '#050508' }}>
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
  const config = MOORE_MAZES[difficulty];
  const [states, setStates] = useState<MooreRoute[]>(
    () => config.switches.map(() => 'block')
  );
  const [solved, setSolved] = useState(false);
  const flow = traceMooreCurrent(config.switches, states);

  useEffect(() => {
    if (!flow.reachedOut || solved) return;
    setSolved(true);
    play('victory');
    window.setTimeout(onSolved, 1100);
  }, [flow.reachedOut, solved, onSolved]);

  const cycleSwitch = (index: number) => {
    if (solved) return;
    play('click', 0.45);
    setStates(prev => prev.map((state, i) => {
      if (i !== index) return state;
      const currentIndex = MOORE_ROUTE_ORDER.indexOf(state);
      return MOORE_ROUTE_ORDER[(currentIndex + 1) % MOORE_ROUTE_ORDER.length];
    }));
  };

  return (
    <PuzzleShell
      title={config.title}
      subtitle={config.subtitle}
      accent="#00F0FF"
    >
      <div className="relative w-full overflow-hidden" style={{ width: 'min(calc(100vw - 32px), calc((100dvh - 122px) * 16 / 9))', aspectRatio: '16 / 9', border: '2px solid #123B4A', background: '#071015' }}>
        <img
          src={MOORE_BG}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          style={{ filter: solved ? 'brightness(1.08) saturate(1.1)' : 'brightness(0.58) saturate(0.88)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(0,240,255,0.16), transparent 34%), linear-gradient(180deg, rgba(7,16,21,0.1), rgba(7,16,21,0.48))',
          }}
        />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: flow.reachedOut ? '#33FF33' : '#00F0FF', boxShadow: `0 0 16px ${flow.reachedOut ? '#33FF33' : '#00F0FF'}` }} />
          <div className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#050508', background: flow.reachedOut ? '#33FF33' : '#00F0FF', border: '1px solid #FFF4C2' }}>
            {flow.reachedOut ? 'CURRENT REACHED OUTPUT' : config.target}
          </div>
        </div>

        <svg viewBox="0 0 760 360" className="absolute inset-[6%] h-[86%] w-[88%]" role="img" aria-label="Moore current routing maze">
          <defs>
            <filter id="moore-current-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="moore-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 7 3 L 0 6 z" fill="#00F0FF" />
            </marker>
          </defs>

          <rect x="46" y="34" width="668" height="292" fill="rgba(5,9,12,0.4)" stroke="#C4A265" strokeWidth="2" />
          <text x="72" y="70" fill="#00F0FF" fontFamily="monospace" fontSize="13" fontWeight="700">SOURCE</text>
          <text x="688" y="70" fill={flow.reachedOut ? '#33FF33' : '#C4A265'} fontFamily="monospace" fontSize="13" fontWeight="700" textAnchor="end">OUT</text>
          <path d={`M 76 180 H ${config.switches[0].x - 58}`} stroke="#00F0FF" strokeWidth="9" strokeLinecap="round" filter="url(#moore-current-glow)" markerEnd="url(#moore-arrow)" />

          {config.switches.map((node, index) => (
            Object.entries(node.routes).map(([route, destination]) => {
              const routeKey = `${index}-${route}`;
              const destNode = typeof destination === 'number' ? config.switches[destination] : destination;
              const active = flow.activeRoutes.has(routeKey);
              return (
                <path
                  key={routeKey}
                  d={moorePipePath(node, route as MooreRoute, destNode)}
                  fill="none"
                  stroke={active ? '#00F0FF' : destination === 'sink' ? '#3A3030' : '#4B535B'}
                  strokeWidth={active ? 10 : 7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={active ? 1 : 0.62}
                  filter={active ? 'url(#moore-current-glow)' : undefined}
                  markerEnd={active ? 'url(#moore-arrow)' : undefined}
                />
              );
            })
          ))}

          <path d="M 706 70 V 300" stroke="#33FF3344" strokeWidth="2" strokeDasharray="8 10" />
          <circle cx="706" cy="180" r="18" fill={flow.reachedOut ? '#33FF33' : '#15161A'} stroke="#FFF4C2" strokeWidth="2" filter={flow.reachedOut ? 'url(#moore-current-glow)' : undefined} />

          {config.switches.map((node, index) => {
            const state = states[index];
            const powered = flow.activeNodes.has(index);
            const arm = state === 'up'
              ? { x2: 0, y2: -32 }
              : state === 'down'
                ? { x2: 0, y2: 32 }
                : state === 'straight'
                  ? { x2: 34, y2: 0 }
                  : { x2: 0, y2: 0 };
            return (
              <g key={index} onClick={() => cycleSwitch(index)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="34"
                  fill={powered ? '#0B3540' : '#111318'}
                  stroke={powered ? '#00F0FF' : '#C4A265'}
                  strokeWidth="3"
                  filter={powered ? 'url(#moore-current-glow)' : undefined}
                />
                <circle cx={node.x} cy={node.y} r="13" fill="#050508" stroke="#FFF4C2" strokeWidth="2" />
                {state === 'block' ? (
                  <path d={`M ${node.x - 15} ${node.y - 15} L ${node.x + 15} ${node.y + 15} M ${node.x + 15} ${node.y - 15} L ${node.x - 15} ${node.y + 15}`} stroke="#FF477E" strokeWidth="4" strokeLinecap="round" />
                ) : (
                  <path
                    d={`M ${node.x} ${node.y} L ${node.x + arm.x2} ${node.y + arm.y2}`}
                    stroke={powered ? '#00F0FF' : '#FFF4C2'}
                    strokeWidth="7"
                    strokeLinecap="round"
                    markerEnd={powered ? 'url(#moore-arrow)' : undefined}
                  />
                )}
                <text x={node.x} y={node.y + 51} fill={powered ? '#00F0FF' : '#C4A265'} fontFamily="monospace" fontSize="9" textAnchor="middle">
                  {MOORE_ROUTE_LABELS[state]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </PuzzleShell>
  );
}

export function ClassicTechPuzzle({
  eventId,
  difficulty = 5,
  onSolved,
}: {
  eventId: string;
  difficulty?: PerceptronDifficultyId;
  onSolved: () => void;
}) {
  const config = eventId === 'perceptron' ? PERCEPTRON_LEVELS[difficulty] : classicPuzzleMap[eventId];
  const [solved, setSolved] = useState(false);
  const cardImage = puzzleBackgroundMap[eventId] || eventCardMap[eventId];

  const finish = () => {
    if (solved) return;
    setSolved(true);
    play('victory');
    window.setTimeout(onSolved, 900);
  };

  if (!config) return null;

  return (
    <PuzzleShell title={config.title} subtitle={config.subtitle} accent={config.accent}>
      <div
        className="relative w-full overflow-hidden"
        style={{
          width: 'min(calc(100vw - 32px), calc((100dvh - 122px) * 16 / 9))',
          aspectRatio: '16 / 9',
          border: `2px solid ${config.accent}`,
          background: '#07090D',
        }}
      >
        {cardImage && (
          <img
            src={cardImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
            style={{ filter: puzzleBackgroundMap[eventId] ? 'brightness(0.72) contrast(1.12) saturate(0.95)' : 'grayscale(0.85) brightness(0.36) contrast(1.3) saturate(0.8)' }}
          />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              `radial-gradient(circle at 50% 48%, ${config.accent}22, transparent 34%), repeating-linear-gradient(0deg, transparent, transparent 23px, ${config.accent}18 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(255,244,194,0.08) 24px), linear-gradient(180deg, rgba(5,5,8,0.18), rgba(5,5,8,0.72))`,
            mixBlendMode: 'screen',
          }}
        />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: solved ? '#33FF33' : config.accent, boxShadow: `0 0 16px ${solved ? '#33FF33' : config.accent}` }} />
          <div className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#050508', background: solved ? '#33FF33' : config.accent }}>
            {solved ? 'SYSTEM SOLVED' : config.panel.toUpperCase()}
          </div>
        </div>
        {config.kind === 'sequence' && (
          <SequencePuzzle config={config} solved={solved} onSolved={finish} />
        )}
        {config.kind === 'switchboard' && (
          <SwitchboardPuzzle config={config} solved={solved} onSolved={finish} />
        )}
        {config.kind === 'hanoi' && (
          <HanoiPuzzle config={config} solved={solved} onSolved={finish} />
        )}
      </div>
    </PuzzleShell>
  );
}

function formatLispValue(value: LispValue) {
  return Array.isArray(value) ? `(${value.join(' ') || 'NIL'})` : value;
}

function applyLispBlock(block: LispBlockId, value: LispValue): LispValue {
  const list = Array.isArray(value) ? value : [value];
  if (block === 'CAR') return list[0] || 'NIL';
  if (block === 'CDR') return list.slice(1);
  if (block === 'CONS') return ['AGI', ...list.filter(item => item !== 'NIL')];
  if (block === 'COND') {
    const agiIndex = list.indexOf('AGI');
    const satelliteIndex = list.indexOf('SATELLITE');
    const targetIndex = agiIndex >= 0 ? agiIndex : satelliteIndex;
    return targetIndex >= 0 ? list.slice(targetIndex) : list;
  }
  if (block === 'RECURSION') return list.length > 1 ? [list[list.length - 1]] : list;
  return value;
}

function evaluateLispPipeline(input: string[], pipeline: Array<LispBlockId | null>) {
  const trace: LispValue[] = [input];
  let value: LispValue = input;
  for (const block of pipeline) {
    if (!block) break;
    value = applyLispBlock(block, value);
    trace.push(value);
  }
  return { value, trace };
}

export function LispPuzzle({
  onSolved,
  difficulty = 3,
}: {
  onSolved: () => void;
  difficulty?: LispDifficultyId;
}) {
  const config = LISP_LEVELS[difficulty];
  const [slots, setSlots] = useState<Array<LispBlockId | null>>(() => Array.from({ length: config.slots }, () => null));
  const [selectedBlock, setSelectedBlock] = useState<LispBlockId | null>(null);
  const [solved, setSolved] = useState(false);
  const [threat, setThreat] = useState(12);
  const { value, trace } = evaluateLispPipeline(config.input, slots);
  const isCorrect = value === config.target && slots.every(Boolean);
  const agiPotential = Math.round((slots.filter(Boolean).length / config.slots) * 82 + (isCorrect ? 18 : 0));
  const slotPositions = config.slots === 1
    ? ['50.2%']
    : config.slots === 2
      ? ['44.6%', '55.8%']
      : config.slots === 3
        ? ['41.0%', '51.4%', '62.0%']
        : ['36.8%', '46.4%', '56.0%', '65.6%'];
  const dataPipeWidth = config.slots === 3 ? '34%' : config.slots === 4 ? '39%' : '28%';

  useEffect(() => {
    setSlots(Array.from({ length: config.slots }, () => null));
    setSelectedBlock(null);
    setSolved(false);
    setThreat(12);
  }, [config.slots, difficulty]);

  useEffect(() => {
    if (solved) return;
    const timer = window.setInterval(() => {
      setThreat(prev => Math.min(100, prev + 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [solved]);

  useEffect(() => {
    if (!isCorrect || solved) return;
    setSolved(true);
    play('victory');
    window.setTimeout(onSolved, 950);
  }, [isCorrect, solved, onSolved]);

  const placeBlock = (index: number, block: LispBlockId | null = selectedBlock) => {
    if (!block || solved) return;
    play('click', 0.45);
    setSlots(prev => prev.map((slot, i) => i === index ? block : slot));
    setSelectedBlock(null);
  };

  const clearSlot = (index: number) => {
    if (solved) return;
    play('click', 0.35);
    setSlots(prev => prev.map((slot, i) => i === index ? null : slot));
  };

  return (
    <PuzzleShell title={config.title} subtitle={config.subtitle} accent="#C4A265">
      <div
        className="relative w-full select-none overflow-hidden"
        style={{
          width: 'min(calc(100vw - 32px), calc((100dvh - 122px) * 16 / 9))',
          aspectRatio: '16 / 9',
          border: '2px solid rgba(196,162,101,0.88)',
          background: '#050506',
          boxShadow: '0 0 46px rgba(0,0,0,0.78), inset 0 0 44px rgba(196,162,101,0.16)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${LISP_BG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.72) contrast(1.16) saturate(0.92)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 51% 42%, rgba(0,240,255,0.14), transparent 24%), radial-gradient(circle at 50% 58%, rgba(51,255,51,0.12), transparent 16%), linear-gradient(90deg, rgba(5,5,8,0.44), rgba(5,5,8,0.08) 48%, rgba(5,5,8,0.36)), repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px)',
          }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 90px rgba(0,0,0,0.86)' }} />

        <div className="absolute left-[2.3%] right-[2.3%] top-[2.2%] z-20 flex items-center justify-between border px-4 py-2"
          style={{ borderColor: 'rgba(196,162,101,0.62)', background: 'linear-gradient(90deg, rgba(6,7,8,0.86), rgba(20,18,14,0.72), rgba(6,7,8,0.86))' }}>
          <div>
            <div className="font-mono-data text-[8px] tracking-[0.36em]" style={{ color: '#FFB84D' }}>DARTMOUTH SYMBOLIC PROCESSING TERMINAL</div>
            <div className="font-orbitron text-lg font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>PROJECT LISP 1958</div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="h-2 w-2 rounded-full" style={{ background: '#33FF33', boxShadow: '0 0 12px #33FF33' }} />
            <span className="font-mono-data text-[9px] tracking-[0.22em]" style={{ color: '#C4A265' }}>SECURITY OMEGA</span>
          </div>
        </div>

        <div className="absolute left-[8.1%] top-[10.7%] z-10 w-[21.4%]">
          <div className="border px-3 py-2" style={{ borderColor: 'rgba(196,162,101,0.46)', background: 'rgba(5,5,8,0.58)', boxShadow: 'inset 0 0 22px rgba(196,162,101,0.10)' }}>
            <div className="font-mono-data text-[8px] tracking-[0.24em]" style={{ color: '#C4A265' }}>CODE BLOCK BANK</div>
            <div className="mt-1 font-rajdhani text-xs font-semibold leading-tight" style={{ color: 'rgba(255,244,194,0.72)' }}>
              Drag cartridges into the machine sockets.
            </div>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1.5">
            {(Object.keys(LISP_BLOCKS) as LispBlockId[]).map(block => {
              const meta = LISP_BLOCKS[block];
              const selected = selectedBlock === block;
              return (
                <button
                  key={block}
                  type="button"
                  draggable
                  onDragStart={event => event.dataTransfer.setData('text/plain', block)}
                  onClick={() => {
                    play('click', 0.4);
                    setSelectedBlock(block);
                  }}
                  className="group relative overflow-hidden px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:brightness-125"
                  style={{
                    color: selected ? '#050508' : '#FFF4C2',
                    background: selected
                      ? `linear-gradient(90deg, ${meta.color}, #FFF4C2)`
                      : 'linear-gradient(90deg, rgba(5,5,8,0.84), rgba(38,31,21,0.72))',
                    border: `1px solid ${selected ? '#FFF4C2' : meta.color}`,
                    boxShadow: selected ? `0 0 22px ${meta.color}AA` : '0 8px 18px rgba(0,0,0,0.48), inset 4px 0 0 rgba(196,162,101,0.35)',
                  }}
                >
                  <div className="absolute right-2 top-1 h-2 w-8" style={{ borderTop: `2px solid ${selected ? '#050508' : meta.color}`, borderBottom: `2px solid ${selected ? '#050508' : meta.color}` }} />
                  <div className="font-orbitron text-sm font-black" style={{ letterSpacing: 0 }}>{meta.label}</div>
                  <div className="font-mono-data text-[8px] tracking-[0.18em]" style={{ color: selected ? '#050508' : meta.color }}>{meta.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute left-[33.9%] top-[23.6%] z-10 w-[34.8%]">
          <div className="flex items-start justify-between gap-3 rounded-sm border px-3 py-2"
            style={{ borderColor: 'rgba(196,162,101,0.56)', background: 'rgba(5,5,8,0.66)', boxShadow: '0 14px 24px rgba(0,0,0,0.32)' }}>
            <div>
              <div className="font-mono-data text-[8px] tracking-[0.22em]" style={{ color: '#00F0FF' }}>SYMBOLIC CIRCUIT</div>
              <div className="font-orbitron text-sm font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>{config.mission}</div>
            </div>
            <div className="shrink-0 px-2 py-1 font-mono-data text-[8px]" style={{ color: '#050508', background: isCorrect ? '#33FF33' : '#C4A265' }}>
              TARGET {config.target}
            </div>
          </div>
        </div>

        <svg className="absolute left-[31.6%] top-[48.7%] z-[8] h-[22%] w-[39%] overflow-visible" viewBox="0 0 640 180" aria-hidden="true">
          <defs>
            <filter id="lisp-flow-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M 0 92 H 68" stroke="#00F0FF" strokeWidth="8" strokeLinecap="round" filter="url(#lisp-flow-glow)" opacity="0.86" />
          <path d="M 570 92 H 640" stroke={isCorrect ? '#33FF33' : '#C4A265'} strokeWidth="8" strokeLinecap="round" filter="url(#lisp-flow-glow)" opacity="0.9" />
          <path d="M 70 92 C 155 20, 258 20, 320 92 C 395 170, 480 164, 570 92" fill="none" stroke={isCorrect ? '#33FF33' : '#C4A265'} strokeWidth="3" strokeDasharray="7 10" opacity="0.72" />
        </svg>

        <div className="absolute left-[31%] top-[63.8%] z-[9] h-[2px]" style={{ width: dataPipeWidth, background: isCorrect ? '#33FF33' : '#00F0FF', boxShadow: `0 0 18px ${isCorrect ? '#33FF33' : '#00F0FF'}` }} />

        {slots.map((slot, index) => (
          <button
            key={index}
            type="button"
            onClick={() => slot ? clearSlot(index) : placeBlock(index)}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault();
              const block = event.dataTransfer.getData('text/plain') as LispBlockId;
              if (LISP_BLOCKS[block]) placeBlock(index, block);
            }}
            className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center transition-all hover:brightness-125"
            style={{
              left: slotPositions[index],
              top: config.slots <= 3 ? '52.7%' : '54.5%',
              width: config.slots <= 3 ? 'clamp(64px, 6.2vw, 94px)' : 'clamp(56px, 5.35vw, 82px)',
              height: config.slots <= 3 ? 'clamp(86px, 8.1vw, 122px)' : 'clamp(76px, 7.1vw, 108px)',
              color: slot ? '#050508' : '#C4A265',
              background: slot
                ? `linear-gradient(180deg, #FFF4C2 0%, ${LISP_BLOCKS[slot].color} 34%, ${LISP_BLOCKS[slot].color} 100%)`
                : 'linear-gradient(180deg, rgba(12,12,10,0.30), rgba(5,5,8,0.72))',
              border: `2px solid ${slot ? LISP_BLOCKS[slot].color : 'rgba(196,162,101,0.76)'}`,
              boxShadow: slot
                ? `0 0 28px ${LISP_BLOCKS[slot].color}99, inset 0 0 14px rgba(255,244,194,0.30)`
                : 'inset 0 0 24px rgba(0,0,0,0.78), 0 0 16px rgba(196,162,101,0.18)',
            }}
          >
            <span className="font-orbitron text-sm font-black" style={{ letterSpacing: 0 }}>{slot || `S${index + 1}`}</span>
            <span className="mt-1 h-1 w-9" style={{ background: slot ? '#050508' : '#C4A265', opacity: 0.8 }} />
          </button>
        ))}

        <div className="absolute bottom-[8.8%] left-[31.7%] z-20 grid w-[37%] grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="p-2" style={{ background: 'rgba(5,5,8,0.74)', border: '1px solid rgba(0,240,255,0.72)', boxShadow: '0 0 18px rgba(0,240,255,0.16)' }}>
            <div className="font-mono-data text-[8px] tracking-[0.18em]" style={{ color: '#00F0FF' }}>RAW DATA REEL</div>
            <div className="mt-1 font-mono-data text-[10px]" style={{ color: '#FFF4C2' }}>{formatLispValue(config.input)}</div>
          </div>
          <div className="font-orbitron text-lg font-black" style={{ color: '#C4A265' }}>{'>'}</div>
          <div className="p-2" style={{ background: 'rgba(5,5,8,0.74)', border: `1px solid ${isCorrect ? '#33FF33' : 'rgba(196,162,101,0.72)'}`, boxShadow: isCorrect ? '0 0 18px rgba(51,255,51,0.22)' : 'none' }}>
            <div className="font-mono-data text-[8px] tracking-[0.18em]" style={{ color: isCorrect ? '#33FF33' : '#C4A265' }}>{config.output}</div>
            <div className="mt-1 font-mono-data text-[10px]" style={{ color: isCorrect ? '#33FF33' : '#FFF4C2' }}>{formatLispValue(value)}</div>
          </div>
        </div>

        <div className="absolute right-[6.4%] top-[14.2%] z-10 w-[21%]">
          <div className="border px-3 py-2" style={{ borderColor: 'rgba(196,162,101,0.52)', background: 'rgba(5,5,8,0.58)', boxShadow: 'inset 0 0 24px rgba(0,240,255,0.10)' }}>
            <div className="font-mono-data text-[8px] tracking-[0.22em]" style={{ color: '#C4A265' }}>STATUS INDICATORS</div>
            <div className="mt-1 font-orbitron text-xs font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>COUNTER-AI WATCH</div>
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1 flex justify-between font-mono-data text-[8px]" style={{ color: '#00F0FF' }}><span>AGI POTENTIAL</span><span>{agiPotential}%</span></div>
              <div className="h-3" style={{ background: 'rgba(0,240,255,0.15)', border: '1px solid #00F0FF' }}>
                <div className="h-full" style={{ width: `${agiPotential}%`, background: '#00F0FF', boxShadow: '0 0 16px #00F0FF' }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between font-mono-data text-[8px]" style={{ color: '#FF477E' }}><span>SOVIET COUNTER-AI</span><span>{threat}%</span></div>
              <div className="h-3" style={{ background: 'rgba(255,71,126,0.15)', border: '1px solid #FF477E' }}>
                <div className="h-full" style={{ width: `${threat}%`, background: '#FF477E', boxShadow: '0 0 16px #FF477E' }} />
              </div>
            </div>
          </div>
          <div className="mt-4 p-3" style={{ background: 'rgba(5,5,8,0.70)', border: '1px solid rgba(196,162,101,0.55)', boxShadow: '0 12px 24px rgba(0,0,0,0.34)' }}>
            <div className="font-mono-data text-[8px] tracking-[0.18em]" style={{ color: '#C4A265' }}>SYMBOL TRACE</div>
            <div className="mt-2 space-y-1">
              {trace.map((step, index) => (
                <div key={index} className="font-mono-data text-[8px]" style={{ color: index === trace.length - 1 ? '#FFF4C2' : 'var(--text-secondary)' }}>
                  {index}: {formatLispValue(step)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PuzzleShell>
  );
}
function SequencePuzzle({
  config,
  solved,
  onSolved,
}: {
  config: Extract<ClassicPuzzleConfig, { kind: 'sequence' }>;
  solved: boolean;
  onSolved: () => void;
}) {
  const [progress, setProgress] = useState<number[]>([]);
  const nextTarget = config.solution[progress.length];

  const press = (index: number) => {
    if (solved) return;
    play('click', 0.45);
    if (index !== nextTarget) {
      setProgress([]);
      return;
    }
    const next = [...progress, index];
    setProgress(next);
    if (next.length === config.solution.length) onSolved();
  };

  const positions = [
    { x: '18%', y: '58%' },
    { x: '34%', y: '34%' },
    { x: '50%', y: '58%' },
    { x: '66%', y: '34%' },
    { x: '82%', y: '58%' },
  ];

  return (
    <div className="absolute inset-[10%]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        {config.solution.slice(0, -1).map((nodeIndex, i) => {
          const a = positions[nodeIndex] || positions[0];
          const b = positions[config.solution[i + 1]] || positions[0];
          const active = i < progress.length - 1;
          return (
            <line
              key={`${nodeIndex}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? config.accent : '#4B535B'}
              strokeWidth={active ? 1.4 : 0.9}
              strokeDasharray={active ? undefined : '2 2'}
            />
          );
        })}
      </svg>
      {config.nodes.map((label, index) => {
        const pos = positions[index] || positions[positions.length - 1];
        const active = progress.includes(index);
        const next = index === nextTarget;
        return (
          <button
            key={label}
            type="button"
            onClick={() => press(index)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-orbitron text-xs font-black"
            style={{
              left: pos.x,
              top: pos.y,
              width: 'clamp(76px, 11vw, 124px)',
              height: 'clamp(76px, 11vw, 124px)',
              color: active ? '#050508' : '#FFF4C2',
              background: active ? config.accent : 'rgba(5,5,8,0.84)',
              border: `2px solid ${next || active ? config.accent : '#C4A265'}`,
              boxShadow: active || next ? `0 0 24px ${config.accent}88` : '0 12px 28px rgba(0,0,0,0.65)',
            }}
          >
            {label}
          </button>
        );
      })}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
        {config.solution.map((_, index) => (
          <div
            key={index}
            className="h-2 w-10"
            style={{ background: index < progress.length ? config.accent : '#3A3D45', boxShadow: index < progress.length ? `0 0 10px ${config.accent}` : 'none' }}
          />
        ))}
      </div>
    </div>
  );
}

function SwitchboardPuzzle({
  config,
  solved,
  onSolved,
}: {
  config: Extract<ClassicPuzzleConfig, { kind: 'switchboard' }>;
  solved: boolean;
  onSolved: () => void;
}) {
  const [states, setStates] = useState(config.initial);
  const socketPositions = [
    { x: 37.4, y: 16.4 },
    { x: 50.2, y: 16.4 },
    { x: 63.0, y: 16.4 },
    { x: 37.4, y: 60.4 },
    { x: 50.2, y: 60.4 },
    { x: 63.0, y: 60.4 },
  ];
  const perceptronLines = [
    [0, 3], [0, 4], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5],
    [3, 5], [4, 5],
  ];

  const toggle = (index: number) => {
    if (solved) return;
    play('click', 0.45);
    setStates(prev => {
      const next = prev.map((state, i) => config.masks[index].includes(i) ? !state : state);
      if (next.every((state, i) => state === config.target[i])) window.setTimeout(onSolved, 120);
      return next;
    });
  };

  return (
    <div className="absolute inset-0">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <filter id="perceptron-glow">
            <feGaussianBlur stdDeviation="0.9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {perceptronLines.map(([from, to]) => {
          const a = socketPositions[from];
          const b = socketPositions[to];
          const active = states[from] && states[to];
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? '#33FF33' : '#1C2E24'}
              strokeWidth={active ? 0.52 : 0.28}
              strokeOpacity={active ? 0.78 : 0.45}
              filter={active ? 'url(#perceptron-glow)' : undefined}
            />
          );
        })}
        <path
          d="M 68 38 C 76 38, 79 38, 87 38"
          fill="none"
          stroke={states[5] ? '#33FF33' : '#4B535B'}
          strokeWidth="0.55"
          strokeLinecap="round"
          strokeDasharray={states[5] ? undefined : '1 1'}
          filter={states[5] ? 'url(#perceptron-glow)' : undefined}
        />
      </svg>
      {config.nodes.map((label, index) => {
        const pos = socketPositions[index];
        const matched = states[index] === config.target[index];
        const active = states[index];
        return (
          <button
            key={label}
            type="button"
            onClick={() => toggle(index)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-orbitron text-xs font-black"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: 'clamp(60px, 7.2vw, 102px)',
              height: 'clamp(60px, 7.2vw, 102px)',
              color: active ? '#050508' : '#FFF4C2',
              background: active
                ? 'radial-gradient(circle, #33FF33 0 31%, #9CFF9C 32% 42%, #112315 43% 100%)'
                : 'radial-gradient(circle, #050508 0 36%, #15161A 37% 58%, #111318 59% 100%)',
              border: `2px solid ${matched ? '#33FF33' : '#C4A265'}`,
              boxShadow: active
                ? '0 0 28px rgba(51,255,51,0.72), inset 0 0 18px rgba(5,5,8,0.65)'
                : '0 0 18px rgba(0,0,0,0.8), inset 0 0 18px rgba(0,0,0,0.92)',
            }}
          >
            <span>{label}</span>
          </button>
        );
      })}
      <div
        className="absolute bottom-[7%] left-1/2 grid -translate-x-1/2 grid-cols-6 gap-2 px-3 py-2"
        style={{ background: 'rgba(5,5,8,0.78)', border: `1px solid ${config.accent}`, boxShadow: `0 0 18px ${config.accent}33` }}
      >
        {config.nodes.map((label, index) => (
          <div key={label} className="text-center font-mono-data text-[8px]" style={{ color: '#FFF4C2' }}>
            <div style={{ color: config.target[index] ? '#33FF33' : '#FF477E' }}>{config.target[index] ? 'ON' : 'OFF'}</div>
            <div style={{ color: '#C4A265' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HanoiPuzzle({
  config,
  solved,
  onSolved,
}: {
  config: Extract<ClassicPuzzleConfig, { kind: 'hanoi' }>;
  solved: boolean;
  onSolved: () => void;
}) {
  const [towers, setTowers] = useState<number[][]>(() => [
    Array.from({ length: config.disks }, (_, index) => config.disks - index),
    [],
    [],
  ]);
  const [selected, setSelected] = useState<number | null>(null);

  const pressTower = (towerIndex: number) => {
    if (solved) return;
    play('click', 0.45);
    if (selected === null) {
      if (towers[towerIndex].length) setSelected(towerIndex);
      return;
    }
    if (selected === towerIndex) {
      setSelected(null);
      return;
    }
    setTowers(prev => {
      const moving = prev[selected][prev[selected].length - 1];
      const targetTop = prev[towerIndex][prev[towerIndex].length - 1];
      if (!moving || (targetTop && targetTop < moving)) return prev;
      const next = prev.map(tower => [...tower]);
      next[selected].pop();
      next[towerIndex].push(moving);
      setSelected(null);
      if (next[2].length === config.disks) window.setTimeout(onSolved, 120);
      return next;
    });
  };

  return (
    <div className="absolute inset-[11%] grid grid-cols-3 gap-5">
      {towers.map((tower, towerIndex) => (
        <button
          key={towerIndex}
          type="button"
          onClick={() => pressTower(towerIndex)}
          className="relative overflow-hidden"
          style={{
            background: 'rgba(5,5,8,0.72)',
            border: `2px solid ${selected === towerIndex ? config.accent : '#C4A265'}`,
            boxShadow: selected === towerIndex ? `0 0 24px ${config.accent}77` : '0 14px 32px rgba(0,0,0,0.65)',
          }}
        >
          <div className="absolute bottom-[16%] left-1/2 h-[68%] w-2 -translate-x-1/2" style={{ background: '#C4A265' }} />
          <div className="absolute bottom-[15%] left-[12%] right-[12%] h-2" style={{ background: '#C4A265' }} />
          <div className="absolute bottom-[18%] left-0 right-0 flex flex-col-reverse items-center gap-2">
            {tower.map(disk => (
              <div
                key={disk}
                className="h-8"
                style={{
                  width: `${28 + disk * 12}%`,
                  background: disk % 2 ? config.accent : '#FFF4C2',
                  border: '2px solid rgba(5,5,8,0.78)',
                  boxShadow: `0 0 18px ${config.accent}55`,
                }}
              />
            ))}
          </div>
          <div className="absolute left-0 right-0 top-4 text-center font-mono-data text-[10px]" style={{ color: towerIndex === 2 ? '#33FF33' : config.accent }}>
            {towerIndex === 0 ? 'ORIGIN' : towerIndex === 1 ? 'BUFFER' : 'TARGET'}
          </div>
        </button>
      ))}
    </div>
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
    if (evt.id === 'lisp') return <LispPuzzle onSolved={handlePuzzleSolved} difficulty={3} />;
    if (classicPuzzleMap[evt.id]) return <ClassicTechPuzzle eventId={evt.id} onSolved={handlePuzzleSolved} />;
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
