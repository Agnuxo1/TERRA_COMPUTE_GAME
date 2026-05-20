import { useState } from 'react';
import { useGame } from '../App';
import { TuringPuzzle } from '../components/game/EventPopup';
import { play } from '../hooks/useSound';

const LOGIC_CARD = '/assets/cards/LOGIC.png';

export default function LogicModeScreen() {
  const { dispatch } = useGame();
  const [activePuzzle, setActivePuzzle] = useState<'turing' | null>('turing');
  const [solved, setSolved] = useState<string[]>([]);

  const handleBack = () => {
    play('click');
    dispatch({ type: 'SET_SCREEN', screen: 'mode' });
  };

  const handleReplay = () => {
    play('click');
    setActivePuzzle('turing');
  };

  const handleSolved = () => {
    setSolved(prev => prev.includes('turing') ? prev : [...prev, 'turing']);
    setActivePuzzle(null);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden" style={{ background: '#050508' }}>
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

      <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center gap-5 p-5">
        <div className="w-full max-w-3xl text-center">
          <div className="font-mono-data text-[10px] tracking-[0.34em]" style={{ color: '#33FF33' }}>
            HISTORICAL INTELLIGENCE ARCHIVE
          </div>
          <h1 className="font-orbitron text-4xl font-black tracking-wider" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
            LOGIC
          </h1>
          <p className="mx-auto mt-2 max-w-xl font-rajdhani text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Puzzle-only mode. Solve the historical technology challenges without economy, rivals, or timers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReplay}
          className="group relative w-full max-w-[360px] overflow-hidden text-left transition-all hover:scale-[1.02] hover:brightness-110"
          style={{
            height: 420,
            border: `2px solid ${solved.includes('turing') ? '#33FF33' : '#FFF4C2'}`,
            boxShadow: solved.includes('turing')
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
              filter: 'brightness(0.72)',
            }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.96), rgba(0,0,0,0.18))' }} />
          <div className="relative z-10 flex h-full flex-col p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono-data text-[9px] px-2 py-1" style={{ color: '#050508', background: '#FFF4C2' }}>
                PUZZLE 01
              </span>
              <span className="font-mono-data text-[9px]" style={{ color: solved.includes('turing') ? '#33FF33' : '#C4A265' }}>
                {solved.includes('turing') ? 'SOLVED' : 'ACTIVE'}
              </span>
            </div>
            <div className="flex-1" />
            <h2 className="font-orbitron text-xl font-black tracking-wider" style={{ color: '#FFF4C2', letterSpacing: 0 }}>
              TURING BOMBE
            </h2>
            <p className="mt-2 font-rajdhani text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Align coupled rotors to break the 1943 cipher sequence.
            </p>
            <div
              className="mt-4 py-2 text-center font-orbitron text-[10px] font-bold tracking-wider"
              style={{ color: '#33FF33', border: '1px solid rgba(51,255,51,0.55)', background: 'rgba(51,255,51,0.12)' }}
            >
              PLAY PUZZLE
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 font-orbitron text-[10px] font-bold tracking-wider transition-all hover:brightness-125"
          style={{ color: '#33FF33', background: 'rgba(9,10,13,0.82)', border: '1px solid rgba(51,255,51,0.42)' }}
        >
          BACK TO MODES
        </button>
      </main>

      {activePuzzle === 'turing' && <TuringPuzzle onSolved={handleSolved} />}
    </div>
  );
}
