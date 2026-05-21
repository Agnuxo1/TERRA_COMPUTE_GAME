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

const techPuzzleIds = ['turing', 'perceptron', 'lisp', 'moore', 'deepblue', 'alphago', 'transformers'];
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
const AGI_NEXUS_BASE = '/assets/AGI_Nexus_Final';
const ALPHAGO_BG = '/assets/puzzles/alphago/bg_alphago.png';
const DEEPBLUE_BASE = '/assets/puzzles/deepblue';
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

type AgiNexusCardId = 'attention' | 'data' | 'processing' | 'weights' | 'activation' | 'backprop';

const AGI_NEXUS_CARDS: Record<AgiNexusCardId, {
  title: string;
  label: string;
  image: string;
  accent: string;
}> = {
  attention: {
    title: 'ATTENTION',
    label: 'focus weights',
    image: `${AGI_NEXUS_BASE}/1card_Attention.png`,
    accent: '#D7B16A',
  },
  data: {
    title: 'DATA',
    label: 'input tokens',
    image: `${AGI_NEXUS_BASE}/2card_Data.png`,
    accent: '#C4A265',
  },
  processing: {
    title: 'PROCESSING',
    label: 'compute pass',
    image: `${AGI_NEXUS_BASE}/3card_processing.png`,
    accent: '#FFB84D',
  },
  weights: {
    title: 'WEIGHTS',
    label: 'learned links',
    image: `${AGI_NEXUS_BASE}/4card_weights.png`,
    accent: '#C4A265',
  },
  activation: {
    title: 'ACTIVATION',
    label: 'threshold gate',
    image: `${AGI_NEXUS_BASE}/5card_Activation.png`,
    accent: '#FF6B35',
  },
  backprop: {
    title: 'BACKPROP',
    label: 'error return',
    image: `${AGI_NEXUS_BASE}/6card_Backprop.png`,
    accent: '#FF477E',
  },
};

const AGI_NEXUS_LEVELS: Array<{
  title: string;
  hint: string;
  system: string;
  slots: AgiNexusCardId[];
  deck: AgiNexusCardId[];
}> = [
  {
    title: 'SELF-ATTENTION BOOT',
    hint: 'Initialize the forward signal: tokens become weighted attention, then activation.',
    system: 'STABLE',
    slots: ['data', 'weights', 'attention', 'processing', 'activation'],
    deck: ['attention', 'processing', 'data', 'activation', 'weights'],
  },
  {
    title: 'TRAINING CORRECTION LOOP',
    hint: 'After activation, error travels backward and updates the learned weights.',
    system: 'LEARNING',
    slots: ['data', 'processing', 'activation', 'backprop', 'weights', 'attention'],
    deck: ['backprop', 'attention', 'data', 'weights', 'activation', 'processing'],
  },
  {
    title: 'TRANSFORMER PROTOCOL',
    hint: 'Assemble the complete AGI Nexus cycle from information to correction.',
    system: 'OMEGA',
    slots: ['data', 'weights', 'attention', 'processing', 'activation', 'backprop'],
    deck: ['activation', 'data', 'backprop', 'attention', 'processing', 'weights'],
  },
];

export function AgiNexusPuzzle({ onSolved }: { onSolved: () => void }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [selected, setSelected] = useState<AgiNexusCardId[]>([]);
  const [feedback, setFeedback] = useState<'success' | 'failure' | null>(null);
  const [score, setScore] = useState(0);
  const level = AGI_NEXUS_LEVELS[levelIndex];
  const complete = selected.length === level.slots.length;
  const isCorrect = complete && selected.every((card, index) => card === level.slots[index]);

  const resetLevel = () => {
    play('click', 0.35);
    setSelected([]);
    setFeedback(null);
  };

  const selectCard = (card: AgiNexusCardId) => {
    if (selected.includes(card) || selected.length >= level.slots.length || feedback) return;
    play('click', 0.42);
    setSelected(prev => [...prev, card]);
  };

  const removeSlot = (index: number) => {
    if (feedback) return;
    play('click', 0.3);
    setSelected(prev => prev.filter((_, slotIndex) => slotIndex !== index));
  };

  const execute = () => {
    if (!complete || feedback) return;
    if (!isCorrect) {
      play('click', 0.25);
      setFeedback('failure');
      window.setTimeout(() => setFeedback(null), 1100);
      return;
    }

    play('victory');
    setFeedback('success');
    setScore(prev => prev + 100);
    window.setTimeout(() => {
      if (levelIndex < AGI_NEXUS_LEVELS.length - 1) {
        setLevelIndex(prev => prev + 1);
        setSelected([]);
        setFeedback(null);
      } else {
        onSolved();
      }
    }, 1200);
  };

  return (
    <PuzzleShell title="AGI NEXUS: THE TRANSFORMER PROTOCOL" subtitle="Sequence the neural cards to stabilize the machine." accent="#D7B16A">
      <div
        className="relative w-full select-none overflow-hidden"
        style={{
          width: 'min(calc(100vw - 32px), calc((100dvh - 122px) * 16 / 9))',
          aspectRatio: '16 / 9',
          border: '2px solid rgba(215,177,106,0.82)',
          background: '#050505',
          boxShadow: '0 0 70px rgba(0,0,0,0.95), inset 0 0 80px rgba(0,0,0,0.82)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${AGI_NEXUS_BASE}/game_dashboard.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.82) contrast(1.08) saturate(0.92)',
          }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 110px rgba(0,0,0,0.9)' }} />

        <div className="absolute left-[6%] top-[39%] z-20 flex w-[17.8%] justify-around font-mono-data text-[clamp(18px,2.9vw,46px)]"
          style={{ color: '#FF6B35', textShadow: '0 0 10px #FF3300, 0 0 22px rgba(255,69,0,0.8)' }}>
          <span>1</span>
          <span>{levelIndex + 1}</span>
          <span>{String(score).padStart(3, '0')[0]}</span>
          <span>{String(score).padStart(3, '0')[1]}</span>
          <span>{String(score).padStart(3, '0')[2]}</span>
        </div>

        <div
          className="absolute left-[31%] top-[14%] z-10 flex h-[48%] w-[38%] flex-col overflow-hidden p-4"
          style={{
            background: 'rgba(6,10,8,0.91)',
            border: '2px solid rgba(255,69,0,0.36)',
            boxShadow: 'inset 0 0 28px rgba(255,69,0,0.22), 0 0 34px rgba(0,0,0,0.72)',
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-45" style={{
            background:
              'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.28) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))',
            backgroundSize: '100% 3px, 4px 100%',
          }} />
          <div className="relative border-b pb-2 text-center" style={{ borderColor: 'rgba(255,69,0,0.7)' }}>
            <div className="font-orbitron text-[clamp(13px,1.25vw,24px)] font-black tracking-[0.14em]" style={{ color: '#FF6B35', letterSpacing: 0 }}>
              AGI NEXUS v1.0
            </div>
            <div className="mt-1 flex justify-between font-mono-data text-[clamp(8px,0.72vw,13px)]" style={{ color: 'rgba(255,244,194,0.72)' }}>
              <span>LEVEL: {levelIndex + 1}/{AGI_NEXUS_LEVELS.length}</span>
              <span>SYSTEM: {feedback === 'failure' ? 'FAULT' : level.system}</span>
            </div>
          </div>

          <div className="relative mt-3 text-center font-mono-data text-[clamp(8px,0.72vw,13px)] uppercase tracking-[0.08em]" style={{ color: '#C4A265' }}>
            {level.title}
          </div>
          <div className="relative mt-1 text-center font-rajdhani text-[clamp(10px,0.9vw,15px)] font-semibold leading-tight" style={{ color: 'rgba(255,244,194,0.7)' }}>
            {level.hint}
          </div>

          <div className="relative mt-3 flex flex-1 items-center justify-center gap-2">
            {level.slots.map((_, index) => {
              const card = selected[index];
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => removeSlot(index)}
                  className="flex h-[clamp(42px,4.5vw,74px)] w-[clamp(34px,3.55vw,58px)] items-center justify-center border-2 font-orbitron text-[clamp(14px,1.5vw,24px)] font-black transition-all hover:brightness-125"
                  style={{
                    color: card ? '#050508' : 'rgba(215,177,106,0.52)',
                    background: card ? AGI_NEXUS_CARDS[card].accent : 'rgba(0,0,0,0.48)',
                    borderColor: card ? '#FF6B35' : 'rgba(215,177,106,0.42)',
                    borderStyle: card ? 'solid' : 'dashed',
                    boxShadow: card ? `0 0 16px ${AGI_NEXUS_CARDS[card].accent}88` : 'inset 0 0 14px rgba(0,0,0,0.82)',
                  }}
                >
                  {card ? AGI_NEXUS_CARDS[card].title.slice(0, 1) : ''}
                </button>
              );
            })}
          </div>

          <div className="relative grid grid-cols-6 gap-2">
            {level.deck.map(card => {
              const meta = AGI_NEXUS_CARDS[card];
              const used = selected.includes(card);
              return (
                <button
                  key={card}
                  type="button"
                  onClick={() => selectCard(card)}
                  className="group relative aspect-[2/3] overflow-visible rounded-sm transition-all hover:z-10 hover:-translate-y-2 hover:scale-110"
                  style={{
                    opacity: used ? 0.28 : 1,
                    filter: used ? 'grayscale(1)' : 'none',
                    cursor: used ? 'default' : 'pointer',
                    boxShadow: used ? 'none' : '0 8px 16px rgba(0,0,0,0.55)',
                  }}
                >
                  <img src={meta.image} alt={meta.title} className="h-full w-full object-cover" draggable={false} />
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono-data text-[clamp(6px,0.55vw,9px)] uppercase" style={{ color: '#AAA' }}>
                    {meta.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Reset AGI Nexus protocol"
          onClick={resetLevel}
          className="absolute left-[37%] top-[84%] z-30 h-[5%] w-[10%] rounded-sm transition-all hover:brightness-125"
          style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.16)' }}
        />
        <button
          type="button"
          aria-label="Execute AGI Nexus protocol"
          onClick={execute}
          className="absolute left-[55%] top-[84%] z-30 h-[5%] w-[10%] rounded-sm transition-all hover:brightness-125"
          style={{ background: complete ? 'rgba(255,69,0,0.24)' : 'rgba(255,69,0,0.08)', border: '1px solid rgba(255,69,0,0.18)' }}
        />

        {feedback && (
          <div
            className="absolute left-0 top-[39%] z-40 w-full text-center font-orbitron text-[clamp(22px,2vw,40px)] font-black tracking-[0.18em]"
            style={{
              color: feedback === 'success' ? '#33FF33' : '#FF223A',
              textShadow: feedback === 'success' ? '0 0 24px #33FF33' : '0 0 24px #FF223A',
            }}
          >
            {feedback === 'success' ? 'PROTOCOL ACCEPTED' : 'CRITICAL FAILURE'}
          </div>
        )}
      </div>
    </PuzzleShell>
  );
}

type GoStone = 'black' | 'white' | null;
type AlphaGoDifficulty = 'amateur' | 'professional' | 'world';
const ALPHAGO_SIZE = 9;

function makeGoBoard(): GoStone[][] {
  return Array.from({ length: ALPHAGO_SIZE }, () => Array.from({ length: ALPHAGO_SIZE }, () => null));
}

function cloneGoBoard(board: GoStone[][]) {
  return board.map(row => [...row]);
}

function getGoGroup(board: GoStone[][], row: number, col: number) {
  const color = board[row]?.[col];
  if (!color) return { stones: [] as Array<[number, number]>, liberties: 0 };
  const seen = new Set<string>();
  const liberties = new Set<string>();
  const stones: Array<[number, number]> = [];
  const queue: Array<[number, number]> = [[row, col]];

  while (queue.length) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    stones.push([r, c]);
    [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
      if (nr < 0 || nr >= ALPHAGO_SIZE || nc < 0 || nc >= ALPHAGO_SIZE) return;
      const next = board[nr][nc];
      if (!next) liberties.add(`${nr},${nc}`);
      else if (next === color && !seen.has(`${nr},${nc}`)) queue.push([nr, nc]);
    });
  }

  return { stones, liberties: liberties.size };
}

function playGoStone(board: GoStone[][], row: number, col: number, color: Exclude<GoStone, null>) {
  if (board[row][col]) return { board, legal: false, captured: 0 };
  const next = cloneGoBoard(board);
  next[row][col] = color;
  const opponent = color === 'black' ? 'white' : 'black';
  let captured = 0;

  [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].forEach(([nr, nc]) => {
    if (nr < 0 || nr >= ALPHAGO_SIZE || nc < 0 || nc >= ALPHAGO_SIZE) return;
    if (next[nr][nc] !== opponent) return;
    const group = getGoGroup(next, nr, nc);
    if (group.liberties === 0) {
      group.stones.forEach(([gr, gc]) => {
        next[gr][gc] = null;
        captured += 1;
      });
    }
  });

  if (getGoGroup(next, row, col).liberties === 0) return { board, legal: false, captured: 0 };
  return { board: next, legal: true, captured };
}

function scoreGoBoard(board: GoStone[][]) {
  let black = 0;
  let white = 0;
  let blackInfluence = 0;
  let whiteInfluence = 0;
  const center = (ALPHAGO_SIZE - 1) / 2;
  for (let row = 0; row < ALPHAGO_SIZE; row++) {
    for (let col = 0; col < ALPHAGO_SIZE; col++) {
      const stone = board[row][col];
      if (!stone) continue;
      const influence = 1 + Math.max(0, 4 - (Math.abs(row - center) + Math.abs(col - center))) * 0.18;
      if (stone === 'black') {
        black += 1;
        blackInfluence += influence;
      } else {
        white += 1;
        whiteInfluence += influence;
      }
    }
  }
  return { black, white, blackInfluence, whiteInfluence };
}

type DeepBluePieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
type DeepBlueSide = 'machine' | 'human';
type DeepBluePiece = {
  id: string;
  type: DeepBluePieceType;
  side: DeepBlueSide;
  row: number;
  col: number;
};
type DeepBlueMove = {
  pieceId: string;
  to: [number, number];
  note: string;
  reply?: { pieceId: string; to: [number, number] };
};
type DeepBlueLevel = {
  title: string;
  subtitle: string;
  objective: string;
  pieces: DeepBluePiece[];
  solution: DeepBlueMove[];
};

const DEEPBLUE_FILES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const DEEPBLUE_SYMBOLS: Record<DeepBluePieceType, string> = {
  pawn: '♟',
  rook: '♜',
  knight: '♞',
  bishop: '♝',
  queen: '♛',
  king: '♚',
};

const DEEPBLUE_LEVELS: DeepBlueLevel[] = [
  {
    title: 'LEVEL 1: OPENING BOOK',
    subtitle: 'Deep Blue leaves the book and claims the center.',
    objective: 'Move the e-pawn two squares. Engines begin by buying space for calculation.',
    pieces: [
      { id: 'wk', type: 'king', side: 'machine', row: 7, col: 4 },
      { id: 'wp', type: 'pawn', side: 'machine', row: 6, col: 4 },
      { id: 'bk', type: 'king', side: 'human', row: 0, col: 4 },
      { id: 'bp', type: 'pawn', side: 'human', row: 1, col: 4 },
    ],
    solution: [
      { pieceId: 'wp', to: [4, 4], note: '1. e4. The machine opens the search tree from the center.', reply: { pieceId: 'bp', to: [3, 4] } },
    ],
  },
  {
    title: 'LEVEL 2: CENTER PRESSURE',
    subtitle: 'A search engine improves each piece before it attacks.',
    objective: 'Develop the knight, then push the queen pawn to occupy the center.',
    pieces: [
      { id: 'wk', type: 'king', side: 'machine', row: 7, col: 4 },
      { id: 'wn', type: 'knight', side: 'machine', row: 7, col: 6 },
      { id: 'wpd', type: 'pawn', side: 'machine', row: 6, col: 3 },
      { id: 'bk', type: 'king', side: 'human', row: 0, col: 4 },
      { id: 'bn', type: 'knight', side: 'human', row: 0, col: 1 },
      { id: 'bpd', type: 'pawn', side: 'human', row: 1, col: 3 },
    ],
    solution: [
      { pieceId: 'wn', to: [5, 5], note: 'Nf3. The knight attacks the center without blocking the queen.', reply: { pieceId: 'bn', to: [2, 2] } },
      { pieceId: 'wpd', to: [4, 3], note: 'd4. Two central files are now under machine control.', reply: { pieceId: 'bpd', to: [3, 3] } },
    ],
  },
  {
    title: 'LEVEL 3: MATERIAL SACRIFICE',
    subtitle: 'The human sees material. The machine sees forced activity.',
    objective: 'Sacrifice the bishop on h7, then bring the queen to the attack.',
    pieces: [
      { id: 'wk', type: 'king', side: 'machine', row: 7, col: 6 },
      { id: 'wq', type: 'queen', side: 'machine', row: 7, col: 3 },
      { id: 'wb', type: 'bishop', side: 'machine', row: 3, col: 2 },
      { id: 'bk', type: 'king', side: 'human', row: 0, col: 6 },
      { id: 'br', type: 'rook', side: 'human', row: 0, col: 7 },
      { id: 'bhp', type: 'pawn', side: 'human', row: 1, col: 7 },
      { id: 'bgp', type: 'pawn', side: 'human', row: 1, col: 6 },
    ],
    solution: [
      { pieceId: 'wb', to: [1, 7], note: 'Bxh7+. A calculated sacrifice pulls the king line apart.', reply: { pieceId: 'bk', to: [1, 7] } },
      { pieceId: 'wq', to: [3, 7], note: 'Qh5+. The queen enters through the opened file.' },
    ],
  },
  {
    title: 'LEVEL 4: CHECKMATE NET',
    subtitle: '1997. Brute force and evaluation become a tactical weapon.',
    objective: 'Force mate by cutting the seventh rank, then deliver the queen.',
    pieces: [
      { id: 'wk', type: 'king', side: 'machine', row: 7, col: 6 },
      { id: 'wq', type: 'queen', side: 'machine', row: 4, col: 7 },
      { id: 'wr', type: 'rook', side: 'machine', row: 7, col: 0 },
      { id: 'bk', type: 'king', side: 'human', row: 0, col: 6 },
      { id: 'br', type: 'rook', side: 'human', row: 0, col: 5 },
      { id: 'bgp', type: 'pawn', side: 'human', row: 1, col: 6 },
      { id: 'bhp', type: 'pawn', side: 'human', row: 1, col: 7 },
    ],
    solution: [
      { pieceId: 'wr', to: [1, 0], note: 'Ra7. The rook locks the escape rank.', reply: { pieceId: 'br', to: [0, 4] } },
      { pieceId: 'wq', to: [1, 7], note: 'Qxh7#. The final node is selected.' },
    ],
  },
];

function deepBlueCoord(row: number, col: number) {
  return `${DEEPBLUE_FILES[col]}${8 - row}`;
}

function deepBluePieceAt(pieces: DeepBluePiece[], row: number, col: number) {
  return pieces.find(piece => piece.row === row && piece.col === col);
}

function deepBluePathClear(pieces: DeepBluePiece[], piece: DeepBluePiece, row: number, col: number) {
  const rowStep = Math.sign(row - piece.row);
  const colStep = Math.sign(col - piece.col);
  let r = piece.row + rowStep;
  let c = piece.col + colStep;
  while (r !== row || c !== col) {
    if (deepBluePieceAt(pieces, r, c)) return false;
    r += rowStep;
    c += colStep;
  }
  return true;
}

function deepBlueIsLegalMove(pieces: DeepBluePiece[], piece: DeepBluePiece, row: number, col: number) {
  if (row < 0 || row > 7 || col < 0 || col > 7) return false;
  if (piece.row === row && piece.col === col) return false;
  const target = deepBluePieceAt(pieces, row, col);
  if (target?.side === piece.side) return false;
  const dr = row - piece.row;
  const dc = col - piece.col;
  const absR = Math.abs(dr);
  const absC = Math.abs(dc);
  const forward = piece.side === 'machine' ? -1 : 1;

  if (piece.type === 'pawn') {
    if (!target && dc === 0 && dr === forward) return true;
    const startRow = piece.side === 'machine' ? 6 : 1;
    if (!target && piece.row === startRow && dc === 0 && dr === forward * 2 && !deepBluePieceAt(pieces, piece.row + forward, col)) return true;
    return !!target && absC === 1 && dr === forward;
  }
  if (piece.type === 'knight') return (absR === 2 && absC === 1) || (absR === 1 && absC === 2);
  if (piece.type === 'king') return absR <= 1 && absC <= 1;
  if (piece.type === 'bishop') return absR === absC && deepBluePathClear(pieces, piece, row, col);
  if (piece.type === 'rook') return (absR === 0 || absC === 0) && deepBluePathClear(pieces, piece, row, col);
  return (absR === absC || absR === 0 || absC === 0) && deepBluePathClear(pieces, piece, row, col);
}

function moveDeepBluePiece(pieces: DeepBluePiece[], pieceId: string, row: number, col: number) {
  const moving = pieces.find(piece => piece.id === pieceId);
  if (!moving) return pieces;
  return pieces
    .filter(piece => piece.id === pieceId || piece.row !== row || piece.col !== col)
    .map(piece => piece.id === pieceId ? { ...piece, row, col } : piece);
}

export function DeepBluePuzzle({ onSolved }: { onSolved: () => void }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [pieces, setPieces] = useState<DeepBluePiece[]>(() => DEEPBLUE_LEVELS[0].pieces);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('SELECT THE ENGINE MOVE. EVERY WRONG BRANCH WASTES SEARCH TIME.');
  const [errors, setErrors] = useState(0);
  const [locked, setLocked] = useState(false);
  const level = DEEPBLUE_LEVELS[levelIndex];
  const currentMove = level.solution[step];
  const selectedPiece = selected ? pieces.find(piece => piece.id === selected) : null;

  const resetLevel = (nextLevel = levelIndex) => {
    play('click', 0.35);
    setLevelIndex(nextLevel);
    setPieces(DEEPBLUE_LEVELS[nextLevel].pieces);
    setStep(0);
    setSelected(null);
    setLocked(false);
    setMessage('SELECT THE ENGINE MOVE. EVERY WRONG BRANCH WASTES SEARCH TIME.');
  };

  const selectPiece = (piece: DeepBluePiece) => {
    if (locked || piece.side !== 'machine') return;
    setSelected(piece.id === selected ? null : piece.id);
    play('click', 0.28);
  };

  const finishMove = (move: DeepBlueMove) => {
    const [row, col] = move.to;
    setPieces(prev => moveDeepBluePiece(prev, move.pieceId, row, col));
    setSelected(null);
    setMessage(move.note);
    play('click', 0.55);
    setLocked(true);

    window.setTimeout(() => {
      setPieces(prev => move.reply ? moveDeepBluePiece(prev, move.reply.pieceId, move.reply.to[0], move.reply.to[1]) : prev);
      const nextStep = step + 1;
      if (nextStep >= level.solution.length) {
        play('victory');
        setMessage(levelIndex >= DEEPBLUE_LEVELS.length - 1 ? 'CHECKMATE. DEEP BLUE PROTOCOL COMPLETE.' : 'LINE CONFIRMED. NEXT SEARCH DEPTH UNLOCKED.');
        if (levelIndex >= DEEPBLUE_LEVELS.length - 1) {
          window.setTimeout(onSolved, 1100);
        } else {
          window.setTimeout(() => resetLevel(levelIndex + 1), 1050);
        }
      } else {
        setStep(nextStep);
        setLocked(false);
      }
    }, move.reply ? 620 : 360);
  };

  const clickSquare = (row: number, col: number) => {
    if (locked || !selectedPiece) return;
    if (!deepBlueIsLegalMove(pieces, selectedPiece, row, col)) {
      setMessage('ILLEGAL CHESS MOVE. SEARCH BRANCH REJECTED.');
      setErrors(prev => prev + 1);
      play('click', 0.22);
      return;
    }
    if (selectedPiece.id === currentMove.pieceId && currentMove.to[0] === row && currentMove.to[1] === col) {
      finishMove(currentMove);
      return;
    }
    setMessage(`WRONG BRANCH: ${selectedPiece.type.toUpperCase()} TO ${deepBlueCoord(row, col)} DOES NOT FORCE THE LINE.`);
    setSelected(null);
    setErrors(prev => prev + 1);
    play('click', 0.22);
  };

  const legalTargets = selectedPiece
    ? new Set(Array.from({ length: 64 }, (_, index) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        return deepBlueIsLegalMove(pieces, selectedPiece, row, col) ? `${row},${col}` : '';
      }).filter(Boolean))
    : new Set<string>();

  return (
    <PuzzleShell title="DEEP BLUE vs KASPAROV: BRUTE FORCE CHECKMATE" subtitle="Solve engine lines from the 1997 machine chess rupture." accent="#E63946">
      <div
        className="relative w-full overflow-hidden"
        style={{
          width: 'min(calc(100vw - 32px), calc((100dvh - 116px) * 16 / 9))',
          aspectRatio: '16 / 9',
          border: '2px solid rgba(230,57,70,0.9)',
          background: '#09090d',
          boxShadow: '0 0 70px rgba(0,0,0,0.92), inset 0 0 80px rgba(0,0,0,0.82)',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(230,57,70,0.18), transparent 42%), linear-gradient(135deg, #060609 0%, #171112 45%, #050505 100%)' }} />
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(244,232,208,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(244,232,208,0.12) 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
        <img src={`${DEEPBLUE_BASE}/kasparov.png`} alt="" className="absolute bottom-0 left-0 h-[78%] opacity-35 mix-blend-luminosity" />
        <img src={`${DEEPBLUE_BASE}/deep_blue.png`} alt="" className="absolute bottom-0 right-0 h-[82%] opacity-38 mix-blend-luminosity" />

        <div className="absolute left-[3%] right-[3%] top-[3%] z-10 flex items-start justify-between border-b-4 pb-3" style={{ borderColor: '#E63946' }}>
          <div>
            <div className="font-mono-data text-[9px] tracking-[0.34em]" style={{ color: '#D4AF37' }}>NEW YORK 1997 - IBM RS/6000 SP</div>
            <div className="font-orbitron text-3xl font-black" style={{ color: '#E63946', textShadow: '3px 3px 0 #000, 0 0 24px rgba(230,57,70,0.46)', letterSpacing: 0 }}>DEEP BLUE</div>
          </div>
          <div className="flex gap-2">
            {DEEPBLUE_LEVELS.map((entry, index) => (
              <button
                key={entry.title}
                type="button"
                onClick={() => resetLevel(index)}
                className="h-8 w-8 font-orbitron text-[10px] font-black"
                style={{
                  color: levelIndex === index ? '#09090d' : '#F4E8D0',
                  background: levelIndex === index ? '#D4AF37' : 'rgba(0,0,0,0.62)',
                  border: '1px solid rgba(212,175,55,0.76)',
                }}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute left-[4%] top-[19%] z-10 w-[24%] border-2 p-4" style={{ borderColor: '#E63946', background: 'rgba(8,8,10,0.84)', boxShadow: '5px 5px 0 #000' }}>
          <div className="font-mono-data text-[9px] tracking-[0.22em]" style={{ color: '#FF6B35' }}>SEARCH DEPTH {levelIndex + 1}/4</div>
          <h2 className="mt-1 font-orbitron text-xl font-black leading-tight" style={{ color: '#F4E8D0', letterSpacing: 0 }}>{level.title}</h2>
          <p className="mt-3 font-rajdhani text-sm font-semibold leading-snug" style={{ color: 'rgba(244,232,208,0.78)' }}>{level.objective}</p>
          <div className="mt-4 grid gap-2 font-mono-data text-[8px]" style={{ color: '#D4AF37' }}>
            <div>NEXT PIECE: {pieces.find(piece => piece.id === currentMove?.pieceId)?.type.toUpperCase()}</div>
            <div>TARGET NODE: {currentMove ? deepBlueCoord(currentMove.to[0], currentMove.to[1]) : 'COMPLETE'}</div>
            <div>BAD BRANCHES: {errors}</div>
          </div>
        </div>

        <div className="absolute left-1/2 top-[17%] z-10 w-[min(58vh,43vw)] -translate-x-1/2">
          <div className="mb-3 border-2 p-3 text-center" style={{ borderColor: '#E63946', background: 'rgba(0,0,0,0.82)' }}>
            <div className="font-orbitron text-sm font-black" style={{ color: locked ? '#D4AF37' : '#F4E8D0', letterSpacing: 0 }}>{message}</div>
          </div>
          <div className="grid aspect-square grid-cols-8 border-[6px] p-3" style={{ borderColor: '#24120e', background: '#24120e', boxShadow: '10px 10px 0 #000, 0 0 48px rgba(230,57,70,0.36)' }}>
            {Array.from({ length: 64 }, (_, index) => {
              const row = Math.floor(index / 8);
              const col = index % 8;
              const piece = deepBluePieceAt(pieces, row, col);
              const light = (row + col) % 2 === 0;
              const target = currentMove?.to[0] === row && currentMove.to[1] === col;
              const legal = legalTargets.has(`${row},${col}`);
              const selectedHere = piece?.id === selected;
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  aria-label={`Chess ${deepBlueCoord(row, col)}`}
                  onClick={() => piece && piece.side === 'machine' ? selectPiece(piece) : clickSquare(row, col)}
                  className="relative flex aspect-square items-center justify-center transition-all hover:brightness-110"
                  style={{
                    background: light ? '#F4E8D0' : '#A9792F',
                    boxShadow: selectedHere ? 'inset 0 0 0 4px #E63946' : legal ? 'inset 0 0 0 3px rgba(255,107,53,0.75)' : undefined,
                  }}
                >
                  {(legal || target) && !piece && <span className="absolute h-3 w-3 rounded-full" style={{ background: target ? '#E63946' : 'rgba(10,14,39,0.42)' }} />}
                  {piece && (
                    <span
                      className="relative z-10 font-serif text-[clamp(24px,4.6vh,46px)] leading-none"
                      style={{
                        color: piece.side === 'machine' ? '#F4E8D0' : '#E63946',
                        WebkitTextStroke: piece.side === 'machine' ? '1px #0A0E27' : '1px #220405',
                        filter: selectedHere ? 'drop-shadow(0 0 14px #FF6B35)' : 'drop-shadow(2px 4px 4px rgba(0,0,0,0.7))',
                      }}
                    >
                      {DEEPBLUE_SYMBOLS[piece.type]}
                    </span>
                  )}
                  <span className="absolute bottom-1 right-1 font-mono-data text-[7px]" style={{ color: light ? 'rgba(10,14,39,0.35)' : 'rgba(244,232,208,0.42)' }}>
                    {deepBlueCoord(row, col)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute right-[4%] top-[19%] z-10 w-[24%] space-y-3">
          <div className="border-2 p-4" style={{ borderColor: '#D4AF37', background: 'rgba(0,0,0,0.76)', boxShadow: '5px 5px 0 #000' }}>
            <div className="font-orbitron text-base font-black" style={{ color: '#D4AF37', letterSpacing: 0 }}>ENGINE RECORD</div>
            <div className="mt-3 grid gap-2 font-rajdhani text-sm font-semibold leading-tight" style={{ color: 'rgba(244,232,208,0.78)' }}>
              <p>Deep Blue evaluated roughly 200 million chess positions per second.</p>
              <p>Kasparov's defeat in 1997 became the public symbol of machine search surpassing elite human intuition.</p>
              <p>This puzzle teaches candidate moves, forcing lines, sacrifices and mate nets.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => resetLevel()} className="py-2 font-orbitron text-[9px] font-bold" style={{ color: '#D4AF37', border: '1px solid #D4AF37', background: 'rgba(0,0,0,0.62)' }}>RESET</button>
            <button type="button" onClick={onSolved} className="py-2 font-orbitron text-[9px] font-bold" style={{ color: '#33FF33', border: '1px solid #33FF33', background: 'rgba(51,255,51,0.1)' }}>EXIT</button>
          </div>
        </div>
      </div>
    </PuzzleShell>
  );
}

export function AlphaGoPuzzle({ onSolved }: { onSolved: () => void }) {
  const [board, setBoard] = useState<GoStone[][]>(() => makeGoBoard());
  const [difficulty, setDifficulty] = useState<AlphaGoDifficulty>('world');
  const [thinking, setThinking] = useState(false);
  const [message, setMessage] = useState('YOU PLAY BLACK. CLAIM THE CENTER BEFORE THE MACHINE CONSOLIDATES.');
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [blackCaptures, setBlackCaptures] = useState(0);
  const [whiteCaptures, setWhiteCaptures] = useState(0);
  const [humanMoves, setHumanMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const score = scoreGoBoard(board);
  const protocolReady = humanMoves >= 8 && (score.blackInfluence + blackCaptures * 1.8) >= (score.whiteInfluence + whiteCaptures * 1.8 - 0.5);

  const reset = (nextDifficulty = difficulty) => {
    play('click', 0.35);
    setDifficulty(nextDifficulty);
    setBoard(makeGoBoard());
    setThinking(false);
    setLastMove(null);
    setBlackCaptures(0);
    setWhiteCaptures(0);
    setHumanMoves(0);
    setSolved(false);
    setMessage('YOU PLAY BLACK. CLAIM THE CENTER BEFORE THE MACHINE CONSOLIDATES.');
  };

  const chooseAiMove = (currentBoard: GoStone[][]) => {
    let best: { row: number; col: number; score: number } | null = null;
    const noise = difficulty === 'amateur' ? 1.15 : difficulty === 'professional' ? 0.55 : 0.22;
    const center = (ALPHAGO_SIZE - 1) / 2;
    for (let row = 0; row < ALPHAGO_SIZE; row++) {
      for (let col = 0; col < ALPHAGO_SIZE; col++) {
        if (currentBoard[row][col]) continue;
        const attempt = playGoStone(currentBoard, row, col, 'white');
        if (!attempt.legal) continue;
        const after = scoreGoBoard(attempt.board);
        const centerDist = Math.abs(row - center) + Math.abs(col - center);
        const neighborBonus = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
          .filter(([nr, nc]) => nr >= 0 && nr < ALPHAGO_SIZE && nc >= 0 && nc < ALPHAGO_SIZE && currentBoard[nr][nc]).length;
        const moveScore = after.whiteInfluence - after.blackInfluence + attempt.captured * 2.2 + (ALPHAGO_SIZE - centerDist) * 0.18 + neighborBonus * 0.28 + Math.random() * noise;
        if (!best || moveScore > best.score) best = { row, col, score: moveScore };
      }
    }
    return best;
  };

  const handleHumanMove = (row: number, col: number) => {
    if (thinking || solved) return;
    const attempt = playGoStone(board, row, col, 'black');
    if (!attempt.legal) {
      setMessage('ILLEGAL MOVE. THE GROUP HAS NO LIBERTIES.');
      play('click', 0.22);
      return;
    }

    play('click', 0.5);
    setBoard(attempt.board);
    setLastMove({ row, col });
    setBlackCaptures(prev => prev + attempt.captured);
    setHumanMoves(prev => prev + 1);
    setThinking(true);
    setMessage('ALPHAGO THINKING... POLICY NET SEARCHING VARIATIONS.');

    window.setTimeout(() => {
      const ai = chooseAiMove(attempt.board);
      if (!ai) {
        setThinking(false);
        setSolved(true);
        play('victory');
        setMessage('NO LEGAL MACHINE MOVE. HUMAN VARIATION ACCEPTED.');
        window.setTimeout(onSolved, 900);
        return;
      }
      const aiAttempt = playGoStone(attempt.board, ai.row, ai.col, 'white');
      setBoard(aiAttempt.board);
      setLastMove({ row: ai.row, col: ai.col });
      setWhiteCaptures(prev => prev + aiAttempt.captured);
      setThinking(false);
      const after = scoreGoBoard(aiAttempt.board);
      const ready = humanMoves + 1 >= 8 && (after.blackInfluence + (blackCaptures + attempt.captured) * 1.8) >= (after.whiteInfluence + (whiteCaptures + aiAttempt.captured) * 1.8 - 0.5);
      if (ready) {
        setSolved(true);
        play('victory');
        setMessage('MOVE 37 VARIATION ACCEPTED. HUMAN STRATEGY BREAKS THE MACHINE LINE.');
        window.setTimeout(onSolved, 1200);
      } else {
        setMessage('YOUR TURN. BUILD INFLUENCE, CONNECT GROUPS, PRESS THE CENTER.');
      }
    }, difficulty === 'world' ? 640 : 420);
  };

  return (
    <PuzzleShell title="ALPHAGO vs LEE SEDOL: OPERATION MIND GAME" subtitle="Play black on a 9x9 board and outmaneuver the machine." accent="#CC0000">
      <div
        className="relative w-full overflow-hidden"
        style={{
          width: 'min(calc(100vw - 32px), calc((100dvh - 116px) * 16 / 9))',
          aspectRatio: '16 / 9',
          border: '2px solid rgba(204,0,0,0.82)',
          background: '#050505',
          boxShadow: '0 0 60px rgba(0,0,0,0.9), inset 0 0 90px rgba(0,0,0,0.78)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${ALPHAGO_BG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.52) contrast(1.14) saturate(0.86)',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.66), rgba(35,0,0,0.28) 44%, rgba(0,0,0,0.88))' }} />
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,0,0,0.16) 5px)' }} />

        <div className="absolute left-[3%] right-[3%] top-[3%] z-10 flex items-center justify-between border-b-4 pb-3" style={{ borderColor: '#CC0000' }}>
          <div>
            <div className="font-mono-data text-[9px] tracking-[0.32em]" style={{ color: '#FFB84D' }}>15 MAR 2016 - SEOUL</div>
            <div className="font-orbitron text-3xl font-black tracking-[0.12em]" style={{ color: '#FF3333', textShadow: '3px 3px 0 #000, 0 0 28px rgba(255,0,0,0.42)', letterSpacing: 0 }}>
              ALPHAGO
            </div>
          </div>
          <div className="flex gap-2">
            {(['amateur', 'professional', 'world'] as AlphaGoDifficulty[]).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => reset(option)}
                className="px-3 py-2 font-orbitron text-[9px] font-bold uppercase tracking-wider transition-all hover:brightness-125"
                style={{
                  color: difficulty === option ? '#050508' : '#FFB84D',
                  background: difficulty === option ? '#FFB84D' : 'rgba(0,0,0,0.58)',
                  border: '1px solid rgba(255,184,77,0.68)',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute left-[4%] top-[20%] z-10 w-[23%] border-2 p-4" style={{ borderColor: '#CC0000', background: 'linear-gradient(135deg, rgba(12,12,12,0.92), rgba(46,8,8,0.86))', boxShadow: '5px 5px 0 #000' }}>
          <div className="font-mono-data text-[9px] tracking-[0.2em]" style={{ color: '#FF6666' }}>HUMAN - LEE SEDOL</div>
          <div className="mt-1 font-orbitron text-4xl font-black" style={{ color: '#FFF', textShadow: '2px 2px 0 #CC0000', letterSpacing: 0 }}>{score.black}</div>
          <div className="font-mono-data text-[9px]" style={{ color: '#888' }}>CAPTURES {blackCaptures}</div>
          <div className="my-4 text-center font-orbitron text-xl font-black" style={{ color: '#FFF', background: '#CC0000', transform: 'rotate(-4deg)', boxShadow: '3px 3px 0 #000' }}>VS</div>
          <div className="font-mono-data text-[9px] tracking-[0.2em]" style={{ color: '#FF6666' }}>MACHINE - ALPHAGO</div>
          <div className="mt-1 font-orbitron text-4xl font-black" style={{ color: '#FFF', textShadow: '2px 2px 0 #CC0000', letterSpacing: 0 }}>{score.white}</div>
          <div className="font-mono-data text-[9px]" style={{ color: '#888' }}>CAPTURES {whiteCaptures}</div>
          <div className="mt-4 h-2" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div className="h-full" style={{ width: `${Math.min(100, humanMoves / 8 * 100)}%`, background: protocolReady ? '#33FF33' : '#FFB84D', boxShadow: protocolReady ? '0 0 12px #33FF33' : 'none' }} />
          </div>
          <div className="mt-1 font-mono-data text-[8px]" style={{ color: protocolReady ? '#33FF33' : '#C4A265' }}>PROTOCOL {protocolReady ? 'READY' : `${Math.min(8, humanMoves)}/8`}</div>
        </div>

        <div className="absolute left-1/2 top-[18%] z-10 w-[min(52vh,40vw)] -translate-x-1/2">
          <div className="mb-3 border-2 p-3 text-center" style={{ borderColor: '#CC0000', background: 'rgba(0,0,0,0.78)' }}>
            <div className="font-orbitron text-sm font-black tracking-[0.18em]" style={{ color: thinking ? '#FF3333' : '#FFB84D', letterSpacing: 0 }}>
              {message}
            </div>
          </div>
          <div
            className="relative grid aspect-square grid-cols-9 p-[7%]"
            style={{
              backgroundColor: '#D7AA6D',
              backgroundImage: `
                linear-gradient(#2A1C11 1.4px, transparent 1.4px),
                linear-gradient(90deg, #2A1C11 1.4px, transparent 1.4px),
                radial-gradient(circle at 25% 25%, rgba(42,28,17,0.36), transparent 5%),
                radial-gradient(circle at 75% 25%, rgba(42,28,17,0.36), transparent 5%),
                radial-gradient(circle at 50% 50%, rgba(42,28,17,0.42), transparent 5%),
                radial-gradient(circle at 25% 75%, rgba(42,28,17,0.36), transparent 5%),
                radial-gradient(circle at 75% 75%, rgba(42,28,17,0.36), transparent 5%)
              `,
              backgroundSize: '12.5% 12.5%, 12.5% 12.5%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
              backgroundPosition: '6.25% 6.25%, 6.25% 6.25%, center, center, center, center, center',
              border: '5px solid #8B4513',
              boxShadow: 'inset 0 0 42px rgba(0,0,0,0.8), 10px 10px 0 #000, 0 0 46px rgba(204,0,0,0.34)',
            }}
          >
            {board.map((row, rowIndex) => row.map((stone, colIndex) => {
              const isLast = lastMove?.row === rowIndex && lastMove.col === colIndex;
              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  aria-label={`Go ${rowIndex + 1}-${colIndex + 1}`}
                  onClick={() => handleHumanMove(rowIndex, colIndex)}
                  className="relative flex aspect-square items-center justify-center transition-all hover:bg-black/10"
                  style={{ background: 'transparent' }}
                >
                  {stone && (
                    <span
                      className="relative z-10 h-[72%] w-[72%] rounded-full"
                      style={{
                        background: stone === 'black'
                          ? 'radial-gradient(circle at 30% 30%, #4a4a4a, #000)'
                          : 'radial-gradient(circle at 30% 30%, #fff, #cfcfcf)',
                        boxShadow: isLast
                          ? `0 0 0 3px #CC0000, 0 0 18px ${stone === 'black' ? '#000' : '#fff'}`
                          : '2px 2px 5px rgba(0,0,0,0.7)',
                      }}
                    />
                  )}
                </button>
              );
            }))}
          </div>
        </div>

        <div className="absolute right-[4%] top-[20%] z-10 w-[24%] space-y-3">
          <div className="border-2 p-4" style={{ borderColor: '#CC0000', background: 'rgba(0,0,0,0.76)', boxShadow: '5px 5px 0 #000' }}>
            <div className="font-orbitron text-base font-black" style={{ color: '#FF3333', letterSpacing: 0 }}>HISTORICAL RECORD</div>
            <div className="mt-3 grid gap-2 font-rajdhani text-sm font-semibold leading-tight" style={{ color: 'rgba(255,255,255,0.74)' }}>
              <p>AlphaGo vencio 4-1 a Lee Sedol. La partida 4 fue la unica victoria humana.</p>
              <p>Go tiene mas posiciones legales que atomos en el universo observable.</p>
              <p>La maquina combino redes neuronales, aprendizaje por refuerzo y busqueda Monte Carlo.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => reset()} className="py-2 font-orbitron text-[9px] font-bold" style={{ color: '#FFB84D', border: '1px solid #FFB84D', background: 'rgba(0,0,0,0.62)' }}>RESET</button>
            <button type="button" onClick={() => handleHumanMove(4, 4)} className="py-2 font-orbitron text-[9px] font-bold" style={{ color: '#FFF', border: '1px solid #CC0000', background: 'rgba(204,0,0,0.24)' }}>CENTER</button>
            <button type="button" onClick={onSolved} className="py-2 font-orbitron text-[9px] font-bold" style={{ color: '#33FF33', border: '1px solid #33FF33', background: 'rgba(51,255,51,0.1)' }}>EXIT</button>
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
    if (evt.id === 'deepblue') return <DeepBluePuzzle onSolved={handlePuzzleSolved} />;
    if (evt.id === 'alphago') return <AlphaGoPuzzle onSolved={handlePuzzleSolved} />;
    if (evt.id === 'transformers') return <AgiNexusPuzzle onSolved={handlePuzzleSolved} />;
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
