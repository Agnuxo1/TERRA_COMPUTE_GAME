import { useState } from 'react';
import { useGame } from '../App';
import { ClassicTechPuzzle, MoorePuzzle, TuringPuzzle, classicPuzzleMap } from '../components/game/EventPopup';
import type { MooreDifficultyId, TuringDifficultyId } from '../components/game/EventPopup';
import { play } from '../hooks/useSound';

const LOGIC_CARD = '/assets/cards/LOGIC.png';
const MOORE_CARD = '/assets/puzzles/moore-logic-machine.png';

type ActivePuzzle =
  | { kind: 'turing'; difficulty: TuringDifficultyId }
  | { kind: 'moore'; difficulty: MooreDifficultyId }
  | { kind: 'classic'; eventId: string };

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

  const handleClassicPlay = (eventId: string) => {
    play('click');
    setActivePuzzle({ kind: 'classic', eventId });
  };

  const handleSolved = () => {
    if (activePuzzle) {
      const solvedId = activePuzzle.kind === 'classic'
        ? `classic-${activePuzzle.eventId}`
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
              <div className="font-mono-data text-[9px] tracking-[0.28em]" style={{ color: '#FFB84D' }}>
                CLASSIC INTELLIGENCE MACHINES
              </div>
              <h2 className="font-orbitron text-lg font-black" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
                HISTORICAL TECHNOLOGY PUZZLES
              </h2>
            </div>
            <div className="font-mono-data text-[9px]" style={{ color: '#C4A265' }}>
              {Object.keys(classicPuzzleMap).length} EVENT
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(classicPuzzleMap).map(([eventId, puzzle]) => {
              const solvedId = `classic-${eventId}`;
              const isSolved = solved.includes(solvedId);
              return (
                <button
                  key={eventId}
                  type="button"
                  onClick={() => handleClassicPlay(eventId)}
                  className="group relative overflow-hidden text-left transition-all hover:scale-[1.02] hover:brightness-110"
                  style={{
                    height: 280,
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
                      backgroundImage: `url(${LOGIC_CARD})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'brightness(0.36) saturate(0.8)',
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
                        {puzzle.kind.toUpperCase()}
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
      {activePuzzle?.kind === 'moore' && (
        <MoorePuzzle
          difficulty={activePuzzle.difficulty}
          onSolved={handleSolved}
        />
      )}
      {activePuzzle?.kind === 'classic' && (
        <ClassicTechPuzzle
          eventId={activePuzzle.eventId}
          onSolved={handleSolved}
        />
      )}
    </div>
  );
}
