import { useState } from 'react';
import { useGame } from '../App';
import { AgiNexusPuzzle, AlphaGoPuzzle, ClassicTechPuzzle, DeepBluePuzzle, LispPuzzle, MoorePuzzle, TuringPuzzle, LISP_LEVELS, PERCEPTRON_LEVELS } from '../components/game/EventPopup';
import type { LispDifficultyId, MooreDifficultyId, PerceptronDifficultyId, TuringDifficultyId } from '../components/game/EventPopup';
import { play } from '../hooks/useSound';

const LOGIC_CARD = '/assets/cards/LOGIC.png';
const LISP_CARD = '/assets/puzzles/lisp-dartmouth-lab.png';
const MOORE_CARD = '/assets/puzzles/moore-logic-machine.png';
const PERCEPTRON_CARD = '/assets/puzzles/perceptron-weight-board.png';
const AGI_NEXUS_CARD = '/assets/AGI_Nexus_Final/card_sprite.png';
const AGI_NEXUS_DASHBOARD = '/assets/AGI_Nexus_Final/game_dashboard.png';
const ALPHAGO_CARD = '/assets/puzzles/alphago/bg_alphago.png';
const DEEPBLUE_CARD = '/assets/puzzles/deepblue/deep_blue.png';

type ActivePuzzle =
  | { kind: 'turing'; difficulty: TuringDifficultyId }
  | { kind: 'lisp'; difficulty: LispDifficultyId }
  | { kind: 'moore'; difficulty: MooreDifficultyId }
  | { kind: 'deepblue' }
  | { kind: 'alphago' }
  | { kind: 'agi-nexus' }
  | { kind: 'classic'; eventId: string; difficulty: PerceptronDifficultyId };

const turingDifficulties: Array<{
  id: TuringDifficultyId;
  label: string;
  name: string;
  description: string;
  linkLabel: string;
}> = [
  {
    id: 1,
    label: 'I',
    name: 'OPEN ROTORS',
    description: 'Four independent rotors. Set each digit directly to 1943.',
    linkLabel: '0 linked rotors',
  },
  {
    id: 2,
    label: 'II',
    name: 'PAIR LOCK',
    description: 'The first two rotors move together, then separate correction is needed.',
    linkLabel: '2 linked rotors',
  },
  {
    id: 3,
    label: 'III',
    name: 'TRIPLE TRAIN',
    description: 'Three rotors are chained, forcing planned adjustment order.',
    linkLabel: '3 linked rotors',
  },
  {
    id: 4,
    label: 'IV',
    name: 'FULL BOMBE',
    description: 'The complete coupled machine. This is the historical event puzzle.',
    linkLabel: 'Full coupling',
  },
];

const mooreDifficulties: Array<{
  id: MooreDifficultyId;
  label: string;
  name: string;
  description: string;
  gateLabel: string;
}> = [
  {
    id: 1,
    label: 'I',
    name: 'SINGLE VALVE',
    description: 'One transistor valve. Turn the arm until current reaches the output.',
    gateLabel: 'SOURCE',
  },
  {
    id: 2,
    label: 'II',
    name: 'BRANCH CHOICE',
    description: 'Choose the powered branch and avoid the dead bus.',
    gateLabel: 'BRANCH',
  },
  {
    id: 3,
    label: 'III',
    name: 'TWO STAGE BUS',
    description: 'Route current through two transistor decisions in sequence.',
    gateLabel: '2 STAGE',
  },
  {
    id: 4,
    label: 'IV',
    name: 'ZIGZAG ARRAY',
    description: 'A denser chip adds detours. Follow the current visually.',
    gateLabel: 'ZIGZAG',
  },
  {
    id: 5,
    label: 'V',
    name: 'DENSE CHIP MAZE',
    description: 'Many transistor valves, one valid route from source to output.',
    gateLabel: 'DENSE',
  },
];

export default function LogicModeScreen() {
  const { dispatch } = useGame();
  const [activePuzzle, setActivePuzzle] = useState<ActivePuzzle | null>(null);
  const [solved, setSolved] = useState<string[]>([]);

  const handleBack = () => {
    play('click');
    dispatch({ type: 'SET_SCREEN', screen: 'mode' });
  };

  const handlePlay = (difficulty: TuringDifficultyId) => {
    play('click');
    setActivePuzzle({ kind: 'turing', difficulty });
  };

  const handleMoorePlay = (difficulty: MooreDifficultyId) => {
    play('click');
    setActivePuzzle({ kind: 'moore', difficulty });
  };

  const handleLispPlay = (difficulty: LispDifficultyId) => {
    play('click');
    setActivePuzzle({ kind: 'lisp', difficulty });
  };

  const handleClassicPlay = (eventId: string, difficulty: PerceptronDifficultyId) => {
    play('click');
    setActivePuzzle({ kind: 'classic', eventId, difficulty });
  };

  const handleAgiNexusPlay = () => {
    play('click');
    setActivePuzzle({ kind: 'agi-nexus' });
  };

  const handleAlphaGoPlay = () => {
    play('click');
    setActivePuzzle({ kind: 'alphago' });
  };

  const handleDeepBluePlay = () => {
    play('click');
    setActivePuzzle({ kind: 'deepblue' });
  };

  const handleSolved = () => {
    if (activePuzzle) {
      const solvedId = activePuzzle.kind === 'classic'
        ? `classic-${activePuzzle.eventId}-${activePuzzle.difficulty}`
        : activePuzzle.kind === 'agi-nexus'
          ? 'agi-nexus'
          : activePuzzle.kind === 'deepblue'
            ? 'deepblue'
          : activePuzzle.kind === 'alphago'
            ? 'alphago'
        : `${activePuzzle.kind}-${activePuzzle.difficulty}`;
      setSolved(prev => prev.includes(solvedId) ? prev : [...prev, solvedId]);
    }
    setActivePuzzle(null);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-y-auto overflow-x-hidden" style={{ background: '#050508' }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${LOGIC_CARD})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.36) saturate(0.82)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 24%, rgba(51,255,51,0.18), transparent 34%), linear-gradient(180deg, rgba(5,5,8,0.62), rgba(5,5,8,0.96))',
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(51,255,51,0.14) 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(255,244,194,0.08) 32px)',
        }}
      />

      <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-start gap-5 p-5 py-8">
        <div className="w-full max-w-3xl text-center">
          <div className="font-mono-data text-[10px] tracking-[0.34em]" style={{ color: '#33FF33' }}>
            HISTORICAL INTELLIGENCE ARCHIVE
          </div>
          <h1 className="font-orbitron text-4xl font-black tracking-wider" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
            LOGIC
          </h1>
          <p className="mx-auto mt-2 max-w-2xl font-rajdhani text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Puzzle-only mode. Solve historical technology systems as real logic machines.
          </p>
        </div>

        <section className="w-full max-w-6xl">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono-data text-[9px] tracking-[0.28em]" style={{ color: '#33FF33' }}>
                CRYPTOGRAPHIC ROTOR TRAIN
              </div>
              <h2 className="font-orbitron text-lg font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                TURING BOMBE
              </h2>
            </div>
            <div className="font-mono-data text-[9px]" style={{ color: '#C4A265' }}>
              TARGET 1943
            </div>
          </div>
        <div className="grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {turingDifficulties.map((difficulty) => {
            const solvedId = `turing-${difficulty.id}`;
            const isSolved = solved.includes(solvedId);
            return (
              <button
                key={difficulty.id}
                type="button"
                onClick={() => handlePlay(difficulty.id)}
                className="group relative overflow-hidden text-left transition-all hover:scale-[1.02] hover:brightness-110"
                style={{
                  height: 390,
                  border: `2px solid ${isSolved ? '#33FF33' : '#FFF4C2'}`,
                  boxShadow: isSolved
                    ? '0 0 28px rgba(51,255,51,0.28)'
                    : '0 0 24px rgba(255,244,194,0.22)',
                  background: '#090A0D',
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${LOGIC_CARD})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: `brightness(${0.48 + difficulty.id * 0.06})`,
                  }}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.96), rgba(0,0,0,0.2))' }} />
                <div className="relative z-10 flex h-full flex-col p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#050508', background: '#FFF4C2' }}>
                      DRILL {difficulty.label}
                    </span>
                    <span className="font-mono-data text-[9px]" style={{ color: isSolved ? '#33FF33' : '#C4A265' }}>
                      {isSolved ? 'SOLVED' : difficulty.linkLabel}
                    </span>
                  </div>
                  <div className="flex-1" />
                  <h2 className="font-orbitron text-lg font-black tracking-wider" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                    {difficulty.name}
                  </h2>
                  <div className="mt-1 font-mono-data text-[9px]" style={{ color: '#33FF33' }}>
                    TARGET 1943
                  </div>
                  <p className="mt-2 font-rajdhani text-sm font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
                    {difficulty.description}
                  </p>
                  <div
                    className="mt-4 py-2 text-center font-orbitron text-[10px] font-bold tracking-wider"
                    style={{ color: '#33FF33', border: '1px solid rgba(51,255,51,0.55)', background: 'rgba(51,255,51,0.12)' }}
                  >
                    PLAY PUZZLE
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        </section>

        <section className="w-full max-w-6xl">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono-data text-[9px] tracking-[0.28em]" style={{ color: '#D4AF37' }}>
                MACHINE CHESS SEARCH
              </div>
              <h2 className="font-orbitron text-lg font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                DEEP BLUE vs KASPAROV
              </h2>
            </div>
            <div className="font-mono-data text-[9px]" style={{ color: solved.includes('deepblue') ? '#33FF33' : '#C4A265' }}>
              {solved.includes('deepblue') ? 'SOLVED' : '4 ENGINE LINES'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDeepBluePlay}
            className="group relative min-h-[320px] w-full overflow-hidden text-left transition-all hover:scale-[1.01] hover:brightness-110"
            style={{
              border: `2px solid ${solved.includes('deepblue') ? '#33FF33' : '#E63946'}`,
              boxShadow: solved.includes('deepblue')
                ? '0 0 30px rgba(51,255,51,0.26)'
                : '0 0 28px rgba(230,57,70,0.28)',
              background: '#080808',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${DEEPBLUE_CARD})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.48) contrast(1.15) saturate(0.9)',
              }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.94), rgba(80,8,8,0.42), rgba(0,0,0,0.7))' }} />
            <div className="relative z-10 flex min-h-[320px] max-w-3xl flex-col justify-end p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#09090d', background: '#D4AF37' }}>
                  NEW YORK 1997
                </span>
                <span className="font-mono-data text-[9px]" style={{ color: solved.includes('deepblue') ? '#33FF33' : '#FFB84D' }}>
                  {solved.includes('deepblue') ? 'CHECKMATE LINE ACCEPTED' : 'SEARCH TREE PROTOCOL'}
                </span>
              </div>
              <h2 className="font-orbitron text-2xl font-black tracking-wider" style={{ color: '#E63946', textShadow: '3px 3px 0 #000, 0 0 24px rgba(230,57,70,0.5)', letterSpacing: 0 }}>
                BRUTE FORCE CHECKMATE
              </h2>
              <p className="mt-2 max-w-2xl font-rajdhani text-base font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
                Resuelve cuatro lineas tacticas de ajedrez: apertura, control central, sacrificio calculado y red de mate. Cada movimiento incorrecto representa una rama falsa del arbol de busqueda.
              </p>
              <div
                className="mt-5 w-full max-w-xs py-2 text-center font-orbitron text-[10px] font-bold tracking-wider"
                style={{ color: '#FFB84D', border: '1px solid rgba(255,184,77,0.66)', background: 'rgba(230,57,70,0.16)' }}
              >
                ENTER CHESS ENGINE
              </div>
            </div>
          </button>
        </section>

        <section className="w-full max-w-6xl">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono-data text-[9px] tracking-[0.28em]" style={{ color: '#FF3333' }}>
                REINFORCEMENT LEARNING ARENA
              </div>
              <h2 className="font-orbitron text-lg font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                ALPHAGO vs LEE SEDOL
              </h2>
            </div>
            <div className="font-mono-data text-[9px]" style={{ color: solved.includes('alphago') ? '#33FF33' : '#C4A265' }}>
              {solved.includes('alphago') ? 'SOLVED' : '9x9 GO'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAlphaGoPlay}
            className="group relative min-h-[320px] w-full overflow-hidden text-left transition-all hover:scale-[1.01] hover:brightness-110"
            style={{
              border: `2px solid ${solved.includes('alphago') ? '#33FF33' : '#CC0000'}`,
              boxShadow: solved.includes('alphago')
                ? '0 0 30px rgba(51,255,51,0.26)'
                : '0 0 28px rgba(204,0,0,0.26)',
              background: '#080808',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${ALPHAGO_CARD})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.45) contrast(1.16) saturate(0.9)',
              }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.94), rgba(42,0,0,0.44), rgba(0,0,0,0.72))' }} />
            <div className="relative z-10 flex min-h-[320px] max-w-3xl flex-col justify-end p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#FFF', background: '#CC0000' }}>
                  SEOUL 2016
                </span>
                <span className="font-mono-data text-[9px]" style={{ color: solved.includes('alphago') ? '#33FF33' : '#FFB84D' }}>
                  {solved.includes('alphago') ? 'HUMAN LINE ACCEPTED' : 'MOVE 37 PROTOCOL'}
                </span>
              </div>
              <h2 className="font-orbitron text-2xl font-black tracking-wider" style={{ color: '#FF3333', textShadow: '3px 3px 0 #000, 0 0 24px rgba(255,0,0,0.45)', letterSpacing: 0 }}>
                OPERATION MIND GAME
              </h2>
              <p className="mt-2 max-w-2xl font-rajdhani text-base font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
                Juega negras en un tablero Go 9x9 contra una IA heuristica inspirada en AlphaGo. Reclama el centro, conecta grupos y supera la linea de la maquina.
              </p>
              <div
                className="mt-5 w-full max-w-xs py-2 text-center font-orbitron text-[10px] font-bold tracking-wider"
                style={{ color: '#FFB84D', border: '1px solid rgba(255,184,77,0.66)', background: 'rgba(204,0,0,0.16)' }}
              >
                ENTER GO ARENA
              </div>
            </div>
          </button>
        </section>

        <section className="w-full max-w-6xl">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono-data text-[9px] tracking-[0.28em]" style={{ color: '#FFB84D' }}>
                CLASSIC INTELLIGENCE MACHINES
              </div>
              <h2 className="font-orbitron text-lg font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                PERCEPTRON RELAY MACHINE
              </h2>
            </div>
            <div className="font-mono-data text-[9px]" style={{ color: '#C4A265' }}>
              5 LEVELS
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(PERCEPTRON_LEVELS).map(([difficultyId, puzzle]) => {
              const difficulty = Number(difficultyId) as PerceptronDifficultyId;
              const solvedId = `classic-perceptron-${difficulty}`;
              const isSolved = solved.includes(solvedId);
              return (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => handleClassicPlay('perceptron', difficulty)}
                  className="group relative overflow-hidden text-left transition-all hover:scale-[1.02] hover:brightness-110"
                  style={{
                    height: 320,
                    border: `2px solid ${isSolved ? '#33FF33' : puzzle.accent}`,
                    boxShadow: isSolved
                      ? '0 0 28px rgba(51,255,51,0.28)'
                      : `0 0 24px ${puzzle.accent}33`,
                    background: '#090A0D',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${PERCEPTRON_CARD})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: `brightness(${0.38 + difficulty * 0.05}) saturate(0.88)`,
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        `radial-gradient(circle at 50% 30%, ${puzzle.accent}33, transparent 36%), linear-gradient(to top, rgba(0,0,0,0.96), rgba(0,0,0,0.24))`,
                    }}
                  />
                  <div className="relative z-10 flex h-full flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#050508', background: puzzle.accent }}>
                        LEVEL {difficulty}
                      </span>
                      <span className="font-mono-data text-[9px]" style={{ color: isSolved ? '#33FF33' : '#C4A265' }}>
                        {isSolved ? 'SOLVED' : puzzle.panel.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1" />
                    <h2 className="font-orbitron text-sm font-black tracking-wider" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                      {puzzle.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 font-rajdhani text-sm font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
                      {puzzle.subtitle}
                    </p>
                    <div
                      className="mt-4 py-2 text-center font-orbitron text-[10px] font-bold tracking-wider"
                      style={{ color: puzzle.accent, border: `1px solid ${puzzle.accent}88`, background: `${puzzle.accent}1F` }}
                    >
                      PLAY PUZZLE
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="w-full max-w-6xl">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono-data text-[9px] tracking-[0.28em]" style={{ color: '#C4A265' }}>
                SYMBOLIC PROCESSING TERMINAL
              </div>
              <h2 className="font-orbitron text-lg font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                McCARTHY LISP PROTOCOL
              </h2>
            </div>
            <div className="font-mono-data text-[9px]" style={{ color: '#C4A265' }}>
              5 LEVELS
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(LISP_LEVELS).map(([difficultyId, puzzle]) => {
              const difficulty = Number(difficultyId) as LispDifficultyId;
              const solvedId = `lisp-${difficulty}`;
              const isSolved = solved.includes(solvedId);
              return (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => handleLispPlay(difficulty)}
                  className="group relative overflow-hidden text-left transition-all hover:scale-[1.02] hover:brightness-110"
                  style={{
                    height: 320,
                    border: `2px solid ${isSolved ? '#33FF33' : '#C4A265'}`,
                    boxShadow: isSolved
                      ? '0 0 28px rgba(51,255,51,0.28)'
                      : '0 0 24px rgba(196,162,101,0.24)',
                    background: '#090A0D',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${LISP_CARD})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: `grayscale(0.35) brightness(${0.38 + difficulty * 0.04}) contrast(1.12) sepia(0.16)`,
                    }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.96), rgba(0,0,0,0.22))' }} />
                  <div className="relative z-10 flex h-full flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#050508', background: '#C4A265' }}>
                        LEVEL {difficulty}
                      </span>
                      <span className="font-mono-data text-[9px]" style={{ color: isSolved ? '#33FF33' : '#C4A265' }}>
                        {isSolved ? 'SOLVED' : puzzle.output}
                      </span>
                    </div>
                    <div className="flex-1" />
                    <h2 className="font-orbitron text-sm font-black tracking-wider" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                      {puzzle.mission}
                    </h2>
                    <div className="mt-1 font-mono-data text-[9px]" style={{ color: '#33FF33' }}>
                      TARGET {puzzle.target}
                    </div>
                    <p className="mt-2 line-clamp-3 font-rajdhani text-sm font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
                      {puzzle.subtitle}
                    </p>
                    <div
                      className="mt-4 py-2 text-center font-orbitron text-[10px] font-bold tracking-wider"
                      style={{ color: '#C4A265', border: '1px solid rgba(196,162,101,0.66)', background: 'rgba(196,162,101,0.13)' }}
                    >
                      OPEN TERMINAL
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="w-full max-w-6xl">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono-data text-[9px] tracking-[0.28em]" style={{ color: '#D7B16A' }}>
                TRANSFORMER CONTROL MACHINE
              </div>
              <h2 className="font-orbitron text-lg font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                AGI NEXUS PROTOCOL
              </h2>
            </div>
            <div className="font-mono-data text-[9px]" style={{ color: solved.includes('agi-nexus') ? '#33FF33' : '#C4A265' }}>
              {solved.includes('agi-nexus') ? 'SOLVED' : '3 STAGES'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAgiNexusPlay}
            className="group relative grid min-h-[360px] w-full overflow-hidden text-left transition-all hover:scale-[1.01] hover:brightness-110 md:grid-cols-[1.1fr_0.9fr]"
            style={{
              border: `2px solid ${solved.includes('agi-nexus') ? '#33FF33' : '#D7B16A'}`,
              boxShadow: solved.includes('agi-nexus')
                ? '0 0 30px rgba(51,255,51,0.26)'
                : '0 0 28px rgba(215,177,106,0.22)',
              background: '#080808',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${AGI_NEXUS_DASHBOARD})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.48) contrast(1.1) saturate(0.88)',
              }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.92), rgba(0,0,0,0.38), rgba(0,0,0,0.86))' }} />
            <div className="relative z-10 flex h-full flex-col justify-end p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#050508', background: '#D7B16A' }}>
                  TRANSFORMERS 2017
                </span>
                <span className="font-mono-data text-[9px]" style={{ color: solved.includes('agi-nexus') ? '#33FF33' : '#C4A265' }}>
                  {solved.includes('agi-nexus') ? 'PROTOCOL ACCEPTED' : 'NEXUS SEQUENCE'}
                </span>
              </div>
              <h2 className="font-orbitron text-2xl font-black tracking-wider" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                AGI NEXUS: THE TRANSFORMER PROTOCOL
              </h2>
              <p className="mt-2 max-w-2xl font-rajdhani text-base font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
                Ordena cartas de Data, Weights, Attention, Processing, Activation y Backprop para estabilizar una maquina sovietica de control neural.
              </p>
              <div
                className="mt-5 w-full max-w-xs py-2 text-center font-orbitron text-[10px] font-bold tracking-wider"
                style={{ color: '#D7B16A', border: '1px solid rgba(215,177,106,0.66)', background: 'rgba(215,177,106,0.12)' }}
              >
                OPEN NEXUS MACHINE
              </div>
            </div>
            <div className="relative z-10 hidden items-center justify-center p-5 md:flex">
              <div
                className="h-[290px] w-[290px]"
                style={{
                  backgroundImage: `url(${AGI_NEXUS_CARD})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid rgba(215,177,106,0.44)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                }}
              />
            </div>
          </button>
        </section>

        <div
          className="grid w-full max-w-4xl grid-cols-4 gap-2 px-1"
          aria-label="Turing difficulty progress"
        >
          {turingDifficulties.map((difficulty) => (
            <div
              key={difficulty.id}
              className="h-1.5"
              style={{
                background: solved.includes(`turing-${difficulty.id}`) ? '#33FF33' : 'rgba(196,162,101,0.32)',
                boxShadow: solved.includes(`turing-${difficulty.id}`) ? '0 0 12px rgba(51,255,51,0.65)' : 'none',
              }}
            />
          ))}
        </div>

        <section className="w-full max-w-6xl">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono-data text-[9px] tracking-[0.28em]" style={{ color: '#00F0FF' }}>
                SEMICONDUCTOR LOGIC LAB
              </div>
              <h2 className="font-orbitron text-lg font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                MOORE'S LAW CIRCUITS
              </h2>
            </div>
            <div className="font-mono-data text-[9px]" style={{ color: '#C4A265' }}>
              TRANSISTOR GATES
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {mooreDifficulties.map((difficulty) => {
              const solvedId = `moore-${difficulty.id}`;
              const isSolved = solved.includes(solvedId);
              return (
                <button
                  key={difficulty.id}
                  type="button"
                  onClick={() => handleMoorePlay(difficulty.id)}
                  className="group relative overflow-hidden text-left transition-all hover:scale-[1.02] hover:brightness-110"
                  style={{
                    height: 320,
                    border: `2px solid ${isSolved ? '#33FF33' : '#00F0FF'}`,
                    boxShadow: isSolved
                      ? '0 0 28px rgba(51,255,51,0.28)'
                      : '0 0 24px rgba(0,240,255,0.2)',
                    background: '#071015',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${MOORE_CARD})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: `brightness(${0.42 + difficulty.id * 0.05}) saturate(0.92)`,
                    }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.96), rgba(0,0,0,0.22))' }} />
                  <div className="relative z-10 flex h-full flex-col p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#050508', background: '#00F0FF' }}>
                        CELL {difficulty.label}
                      </span>
                      <span className="font-mono-data text-[9px]" style={{ color: isSolved ? '#33FF33' : '#C4A265' }}>
                        {isSolved ? 'SOLVED' : difficulty.gateLabel}
                      </span>
                    </div>
                    <div className="flex-1" />
                    <h2 className="font-orbitron text-base font-black tracking-wider" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                      {difficulty.name}
                    </h2>
                    <div className="mt-1 font-mono-data text-[9px]" style={{ color: '#00F0FF' }}>
                      {difficulty.gateLabel}
                    </div>
                    <p className="mt-2 font-rajdhani text-sm font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
                      {difficulty.description}
                    </p>
                    <div
                      className="mt-4 py-2 text-center font-orbitron text-[10px] font-bold tracking-wider"
                      style={{ color: '#00F0FF', border: '1px solid rgba(0,240,255,0.55)', background: 'rgba(0,240,255,0.12)' }}
                    >
                      PLAY CIRCUIT
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 font-orbitron text-[10px] font-bold tracking-wider transition-all hover:brightness-125"
          style={{ color: '#33FF33', background: 'rgba(9,10,13,0.82)', border: '1px solid rgba(51,255,51,0.42)' }}
        >
          BACK TO MODES
        </button>
      </main>

      {activePuzzle?.kind === 'turing' && (
        <TuringPuzzle
          difficulty={activePuzzle.difficulty}
          onSolved={handleSolved}
        />
      )}
      {activePuzzle?.kind === 'lisp' && (
        <LispPuzzle
          difficulty={activePuzzle.difficulty}
          onSolved={handleSolved}
        />
      )}
      {activePuzzle?.kind === 'moore' && (
        <MoorePuzzle
          difficulty={activePuzzle.difficulty}
          onSolved={handleSolved}
        />
      )}
      {activePuzzle?.kind === 'deepblue' && (
        <DeepBluePuzzle
          onSolved={handleSolved}
        />
      )}
      {activePuzzle?.kind === 'alphago' && (
        <AlphaGoPuzzle
          onSolved={handleSolved}
        />
      )}
      {activePuzzle?.kind === 'agi-nexus' && (
        <AgiNexusPuzzle
          onSolved={handleSolved}
        />
      )}
      {activePuzzle?.kind === 'classic' && (
        <ClassicTechPuzzle
          eventId={activePuzzle.eventId}
          difficulty={activePuzzle.difficulty}
          onSolved={handleSolved}
        />
      )}
    </div>
  );
}
