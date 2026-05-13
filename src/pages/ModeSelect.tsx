import { useState } from 'react';
import { useGame } from '../App';
import { play } from '../hooks/useSound';
import { useVideoPlayer } from '../hooks/useVideo';
import VideoPlayer from '../components/game/VideoPlayer';

interface GameMode {
  id: 'pioneer' | 'strategist' | 'complete';
  title: string;
  year: string;
  description: string;
  features: string[];
  color: string;
  glowColor: string;
  locked: boolean;
  unlockMessage?: string;
  cardImg: string;
  cardImgLocked?: string;
}

const modes: GameMode[] = [
  {
    id: 'pioneer',
    title: 'PIONEER',
    year: '1960',
    description: 'Learn the ropes. No rivals. No defeat. Just you and the march of technology.',
    features: ['No AI rivals', 'Cannot lose', 'Guided tutorials', 'Unlocks: Estratega'],
    color: '#33FF33',
    glowColor: 'rgba(51,255,51,0.3)',
    locked: false,
    cardImg: '/assets/cards/mode-pioneer.jpg',
  },
  {
    id: 'strategist',
    title: 'ESTRATEGA',
    year: '1980',
    description: 'The real race begins. Rivals compete. Technology explodes. Every decision matters.',
    features: ['Start in 1980', '7 AI rivals', 'Full tech tree', 'Unlocks: Completo'],
    color: '#00F0FF',
    glowColor: 'rgba(0,240,255,0.3)',
    locked: false,
    cardImg: '/assets/cards/mode-estratega.jpg',
  },
  {
    id: 'complete',
    title: 'COMPLETO',
    year: '1960',
    description: 'The full experience. Start from nothing. Everything active. Before the AI does.',
    features: ['Full timeline 1960+', 'All systems active', 'Full rival competition', 'The ultimate race'],
    color: '#FFB84D',
    glowColor: 'rgba(255,184,77,0.3)',
    locked: true,
    unlockMessage: 'Complete Estratega to unlock',
    cardImg: '/assets/cards/mode-completo.jpg',
    cardImgLocked: '/assets/cards/mode-completo-locked.jpg',
  },
];

export default function ModeSelect() {
  const { dispatch } = useGame();
  const { activeVideo, playVideo, clearVideo } = useVideoPlayer();
  const [pendingMode, setPendingMode] = useState<'pioneer' | 'strategist' | 'complete' | null>(null);

  const handleSelectMode = (modeId: 'pioneer' | 'strategist' | 'complete') => {
    const mode = modes.find(m => m.id === modeId);
    if (mode?.locked) { play('alert'); return; }
    play('click');

    // Try to play cinematic video first
    const videoPlayed = playVideo(`mode-${modeId}`, false);
    if (videoPlayed) {
      setPendingMode(modeId); // Video will complete then dispatch
    } else {
      // Video already played or doesn't exist, go directly
      dispatch({ type: 'SET_MODE', mode: modeId });
    }
  };

  const handleVideoComplete = () => {
    clearVideo();
    if (pendingMode) {
      dispatch({ type: 'SET_MODE', mode: pendingMode });
      setPendingMode(null);
    }
  };

  const handleBack = () => { play('click'); dispatch({ type: 'SET_SCREEN', screen: 'title' }); };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-6" style={{ background: 'var(--void)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(51,255,51,0.05) 0%, transparent 60%)' }} />

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <h1 className="font-orbitron font-black tracking-widest uppercase"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', color: '#33FF33',
            textShadow: '0 0 20px rgba(51,255,51,0.4), 0 2px 4px rgba(0,0,0,0.8)', letterSpacing: '0.15em' }}>
          SELECT MODE
        </h1>
        <p className="font-orbitron text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.3em' }}>
          Three paths to superintelligence
        </p>
        <div style={{ width: '200px', height: '1px', background: 'linear-gradient(to right, transparent, #33FF33, transparent)', opacity: 0.4, marginTop: '4px' }} />
      </div>

      {/* Mode Cards */}
      <div className="relative z-10 flex flex-col md:flex-row gap-4 px-4 items-stretch">
        {modes.map((mode, idx) => {
          const cardImage = mode.locked && mode.cardImgLocked ? mode.cardImgLocked : mode.cardImg;
          return (
            <button key={mode.id} onClick={() => handleSelectMode(mode.id)}
              className="relative flex flex-col items-start gap-3 p-5 rounded w-64 text-left transition-all
                hover:scale-[1.03] hover:brightness-110 overflow-hidden"
              style={{
                border: `2px solid ${mode.locked ? 'var(--border)' : mode.color + '66'}`,
                boxShadow: mode.locked ? 'none' : `0 0 20px ${mode.glowColor}, 0 4px 12px rgba(0,0,0,0.3)`,
                opacity: mode.locked ? 0.6 : 1,
                cursor: mode.locked ? 'not-allowed' : 'pointer',
                minHeight: '320px',
              }}>

              {/* Card background image */}
              <div className="absolute inset-0" style={{
                backgroundImage: `url(${cardImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: mode.locked ? 'brightness(0.3) saturate(0.3)' : 'brightness(0.4) saturate(0.8)',
              }} />

              {/* Dark overlay */}
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(10,10,15,0.85) 0%, rgba(10,10,15,0.7) 40%, rgba(10,10,15,0.9) 100%)' }} />

              {/* Mode number badge */}
              <div className="relative z-10 absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center font-orbitron text-[10px] font-bold"
                style={{ background: mode.locked ? 'var(--border)' : mode.color + '22', color: mode.locked ? 'var(--text-tertiary)' : mode.color,
                  border: `1px solid ${mode.locked ? 'var(--border)' : mode.color + '44'}` }}>
                {idx + 1}
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col gap-2 w-full flex-1">
                {/* Title */}
                <h2 className="font-orbitron text-sm font-bold tracking-wider mt-3"
                  style={{ color: mode.locked ? 'var(--text-tertiary)' : mode.color, textShadow: `0 0 8px ${mode.glowColor}` }}>
                  {mode.title}
                </h2>

                {/* Year badge */}
                <div className="px-2 py-0.5 rounded font-mono-data text-[8px] self-start"
                  style={{ background: mode.color + '15', color: mode.color, border: `1px solid ${mode.color}33` }}>
                  START: {mode.year}
                </div>

                {/* Description */}
                <p className="font-rajdhani text-xs leading-relaxed"
                  style={{ color: mode.locked ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                  {mode.locked && mode.unlockMessage ? mode.unlockMessage : mode.description}
                </p>

                {/* Features */}
                <div className="flex flex-col gap-1 w-full mt-auto">
                  {mode.features.map(f => (
                    <div key={f} className="flex items-start gap-1.5">
                      <span style={{ color: mode.locked ? 'var(--text-tertiary)' : mode.color, fontSize: '8px', marginTop: '2px' }}>◆</span>
                      <span className="font-mono-data text-[8px]"
                        style={{ color: mode.locked ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* Play / Locked button */}
                <div className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded font-orbitron text-[9px] font-bold tracking-wider"
                  style={{ background: mode.locked ? 'var(--border)' : mode.color + '15',
                    color: mode.locked ? 'var(--text-tertiary)' : mode.color,
                    border: `1px solid ${mode.locked ? 'var(--border)' : mode.color + '44'}` }}>
                  {mode.locked ? <>🔒 LOCKED</> : <>▶ PLAY</>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Back button */}
      <button onClick={handleBack}
        className="relative z-10 px-4 py-1.5 rounded font-orbitron text-[9px] font-bold tracking-wider transition-all hover:brightness-125"
        style={{ background: 'var(--surface-elevated)', color: '#33FF33', border: '1px solid rgba(51,255,51,0.3)',
          textShadow: '0 0 6px rgba(51,255,51,0.3)' }}>
        ← BACK TO MENU
      </button>

      {/* Cinematic Video Player */}
      {activeVideo && (
        <VideoPlayer
          src={activeVideo}
          onComplete={handleVideoComplete}
          onSkip={handleVideoComplete}
        />
      )}
    </div>
  );
}
