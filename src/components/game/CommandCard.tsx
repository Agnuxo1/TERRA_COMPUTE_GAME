import { useState } from 'react';
import { useGame } from '../../App';
import { play } from '../../hooks/useSound';
import { useVideoPlayer } from '../../hooks/useVideo';
import VideoPlayer from './VideoPlayer';

interface CommandAction {
  key: string;
  label: string;
  iconImg: string;
  overlay: string | null;
  color: string;
  action?: string;
}

const actions: CommandAction[] = [
  { key: 'B', label: 'BUILD', iconImg: '/assets/cards/action-build.png', overlay: 'buildings', color: '#00E5A0' },
  { key: 'T', label: 'TECH', iconImg: '/assets/cards/action-tech.png', overlay: 'tech', color: '#00F0FF' },
  { key: 'D', label: 'DIPLO', iconImg: '/assets/cards/action-diplo.png', overlay: 'diplomacy', color: '#7B61FF' },
  { key: 'A', label: 'ATTACK', iconImg: '/assets/cards/action-attack.png', overlay: 'attack', color: '#FF477E' },
  { key: 'S', label: 'SPY', iconImg: '/assets/cards/action-spy.png', overlay: 'spy', color: '#FFB84D' },
  { key: 'SPACE', label: 'PAUSE', iconImg: '/assets/cards/action-pause.png', overlay: null, color: '#FFB84D', action: 'pause' },
];

export default function CommandCard() {
  const { state, dispatch } = useGame();
  const { activeVideo, playVideo, clearVideo } = useVideoPlayer();
  const [pendingAction, setPendingAction] = useState<CommandAction | null>(null);

  const executeAction = (action: CommandAction) => {
    if (action.action === 'pause') {
      dispatch({ type: 'TOGGLE_PAUSE' });
      return;
    }
    if (action.overlay) {
      if (state.overlay === action.overlay) {
        dispatch({ type: 'CLOSE_OVERLAY' });
      } else {
        dispatch({ type: 'OPEN_OVERLAY', overlay: action.overlay });
      }
    }
  };

  const handleAction = (action: CommandAction) => {
    play('click');

    // Try to play action cinematic video first
    const videoId = `action-${action.key.toLowerCase()}`;
    const videoPlayed = playVideo(videoId, false);
    if (videoPlayed) {
      setPendingAction(action); // Video will complete then execute
    } else {
      // Video already played or doesn't exist, execute directly
      executeAction(action);
    }
  };

  const handleVideoComplete = () => {
    clearVideo();
    if (pendingAction) {
      executeAction(pendingAction);
      setPendingAction(null);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5 px-2 py-2" style={{
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      minHeight: '64px',
    }}>
      {actions.map(action => {
        const isActive = action.overlay && state.overlay === action.overlay;
        return (
          <button
            key={action.key}
            onClick={() => handleAction(action)}
            className="relative flex flex-col items-center justify-center rounded overflow-hidden transition-all hover:brightness-125 hover:scale-105"
            style={{
              width: '72px',
              height: '52px',
              border: `2px solid ${isActive ? action.color : 'var(--border)'}`,
              boxShadow: isActive ? `0 0 12px ${action.color}55` : '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {/* Card background */}
            <div className="absolute inset-0" style={{
              backgroundImage: `url(${action.iconImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: isActive ? 'brightness(0.9) saturate(1.2)' : 'brightness(0.6) saturate(0.8)',
              transition: 'filter 0.2s ease',
            }} />
            {/* Dark overlay */}
            <div className="absolute inset-0" style={{
              background: isActive
                ? `linear-gradient(to top, ${action.color}44, rgba(0,0,0,0.3))`
                : 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.2))',
            }} />
            {/* Text */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
              <span className="font-orbitron text-[8px] font-bold tracking-wider" style={{
                color: isActive ? action.color : '#FFFFFF',
                textShadow: `0 1px 3px rgba(0,0,0,0.9), 0 0 6px ${action.color}44`,
              }}>
                {action.label}
              </span>
              <span className="font-mono-data text-[7px]" style={{
                color: isActive ? action.color + 'CC' : '#FFFFFF88',
                textShadow: '0 1px 2px rgba(0,0,0,0.9)',
              }}>
                [{action.key === 'SPACE' ? '\u2423' : action.key}]
              </span>
            </div>
          </button>
        );
      })}

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
