import { useState } from 'react';
import { useGame } from '../App';
import { play } from '../hooks/useSound';
import { isVideoPlayed, markVideoPlayed, getVideoUrl } from '../hooks/useVideo';
import VideoPlayer from '../components/game/VideoPlayer';

const modes = [
  {
    id: 'pioneer' as const,
    name: 'PIONEER',
    startYear: 1960,
    color: '#33FF33',
    description: 'Learn the economy and build your first Safe ASI without rivals or hard defeat states.',
    features: ['No AI rivals', 'Cannot lose', 'ZF Safe ASI goal', 'Unlocks: Estratega'],
    gradient: 'from-green-900 to-green-700',
    accent: '#33FF33',
    unlocked: true,
    cardImage: '/assets/cards/PIONEER.jpg',
  },
  {
    id: 'strategist' as const,
    name: 'ESTRATEGA',
    startYear: 1980,
    color: '#00F0FF',
    description: 'The real race begins with a working industrial-tech base, rivals, and a reachable Safe AGI endgame.',
    features: ['Start in 1980', '7 AI rivals', 'AGI + 3ZF goal', 'Unlocks: Completo'],
    gradient: 'from-cyan-900 to-cyan-700',
    accent: '#00F0FF',
    unlocked: true,
    cardImage: '/assets/cards/ESTRATEGA.jpg',
  },
  {
    id: 'complete' as const,
    name: 'COMPLETO',
    startYear: 1960,
    color: '#7B61FF',
    description: 'Complete Estratega to unlock',
    features: ['Full timeline 1960+', 'All systems active', 'Full rival competition', 'The ultimate race'],
    gradient: 'from-purple-900 to-purple-700',
    accent: '#7B61FF',
    unlocked: false,
    cardImage: '/assets/cards/COMPLETE.jpg',
  },
  {
    id: 'logic' as const,
    name: 'LOGIC',
    startYear: 1950,
    startLabel: 'PUZZLES',
    color: '#FFF4C2',
    description: 'Standalone intelligence exercises based on the historical technology events.',
    features: ['Puzzle-only mode', 'Turing Bombe challenge', 'No economy pressure', 'More events coming'],
    gradient: 'from-amber-950 to-green-950',
    accent: '#FFF4C2',
    unlocked: true,
    cardImage: '/assets/cards/LOGIC.png',
  },
];

const videoMap: Record<string, string> = {
  pioneer: 'mode-pioneer',
  strategist: 'mode-estratega',
  complete: 'mode-completo',
};

export default function ModeSelect() {
  const { dispatch } = useGame();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<string | null>(null);

  const handleSelectMode = (modeId: string) => {
    play('click');
    const videoId = videoMap[modeId];
    if (videoId && !isVideoPlayed(videoId)) {
      markVideoPlayed(videoId);
      setVideoSrc(getVideoUrl(videoId));
      setPendingMode(modeId);
    } else {
      dispatch({ type: 'SET_MODE', mode: modeId });
    }
  };

  const handleVideoComplete = () => {
    setVideoSrc(null);
    if (pendingMode) {
      dispatch({ type: 'SET_MODE', mode: pendingMode });
      setPendingMode(null);
    }
  };

  const handleBack = () => {
    play('click');
    dispatch({ type: 'SET_SCREEN', screen: 'title' });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-4 relative overflow-y-auto"
      style={{ background: 'var(--bg-primary)' }}>

      <div className="text-center mb-2">
        <h1 className="font-orbitron text-2xl md:text-3xl font-bold tracking-wider"
          style={{ color: '#33FF33', textShadow: '0 0 20px rgba(51,255,51,0.3)' }}>
          SELECT MODE
        </h1>
        <p className="font-rajdhani text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Three paths to superintelligence
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
        {modes.map((mode, index) => (
          <button
            key={mode.id}
            onClick={() => mode.unlocked && handleSelectMode(mode.id)}
            disabled={!mode.unlocked}
            className={`relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:brightness-110 group ${!mode.unlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{
              border: `2px solid ${mode.unlocked ? mode.accent : '#555'}`,
              boxShadow: mode.unlocked ? `0 0 20px ${mode.accent}22` : 'none',
              height: '420px',
              animation: `fadeSlideUp 0.6s ease ${index * 0.15}s both`,
            }}
          >
            <div className="absolute inset-0" style={{
              backgroundImage: `url(${mode.cardImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.5)',
            }} />
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)` }} />
            <div className="relative z-10 flex flex-col h-full p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-orbitron text-[9px] tracking-wider px-2 py-0.5 rounded"
                  style={{ background: mode.accent + '22', color: mode.accent, border: `1px solid ${mode.accent}44` }}>
                  {index + 1}
                </span>
                {!mode.unlocked && (
                  <span className="font-orbitron text-[8px] tracking-wider" style={{ color: '#888' }}>
                    🔒 LOCKED
                  </span>
                )}
              </div>
              <div className="flex-1" />
              <div>
                <h2 className="font-orbitron text-lg font-bold tracking-wider mb-1"
                  style={{ color: mode.accent, textShadow: `0 0 10px ${mode.accent}44` }}>
                  {mode.name}
                </h2>
                <div className="font-mono-data text-[9px] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  START: {'startLabel' in mode ? mode.startLabel : mode.startYear}
                </div>
                <p className="font-rajdhani text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {mode.description}
                </p>
                <div className="flex flex-col gap-1 mb-3">
                  {mode.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span style={{ color: mode.accent, fontSize: '8px' }}>◆</span>
                      <span className="font-rajdhani text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                {mode.unlocked ? (
                  <div className="font-orbitron text-[10px] font-bold tracking-wider py-2 rounded text-center
                    transition-all group-hover:brightness-125"
                    style={{ background: mode.accent + '22', color: mode.accent, border: `1px solid ${mode.accent}` }}>
                    ▶ PLAY
                  </div>
                ) : (
                  <div className="font-orbitron text-[9px] tracking-wider py-2 rounded text-center"
                    style={{ background: 'rgba(100,100,100,0.1)', color: '#666', border: '1px solid #333' }}>
                    Complete Estratega to unlock
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button onClick={handleBack}
        className="px-4 py-1.5 rounded font-orbitron text-[9px] font-bold tracking-wider transition-all hover:brightness-125"
        style={{ background: 'var(--surface-elevated)', color: '#33FF33', border: '1px solid rgba(51,255,51,0.3)',
          textShadow: '0 0 6px rgba(51,255,51,0.3)' }}>
        ← BACK TO MENU
      </button>

      {videoSrc && (
        <VideoPlayer src={videoSrc} onComplete={handleVideoComplete} />
      )}
    </div>
  );
}
