import { useState } from 'react';
import { useGame } from '../../App';
import { play } from '../../hooks/useSound';
import { isVideoPlayed, markVideoPlayed, getVideoUrl } from '../../hooks/useVideo';
import VideoPlayer from './VideoPlayer';
import { t } from '../../i18n';

interface CommandAction {
  key: string;
  label: string;
  iconImg: string;
  overlay: string | null;
  color: string;
  action?: string;
}

/** Built at render time (not module load) so the labels are translated in the loaded language. */
function buildActions(): CommandAction[] {
  return [
    { key: 'B', label: t('BUILD'), iconImg: './assets/cards/action-build.png', overlay: 'buildings', color: '#00E5A0' },
    { key: 'T', label: t('TECH'), iconImg: './assets/cards/action-tech.png', overlay: 'tech', color: '#00F0FF' },
    { key: 'D', label: t('DIPLO'), iconImg: './assets/cards/action-diplo.png', overlay: 'diplomacy', color: '#7B61FF' },
    { key: 'A', label: t('ATTACK'), iconImg: './assets/cards/action-attack.png', overlay: 'attack', color: '#FF477E' },
    { key: 'S', label: t('SPY'), iconImg: './assets/cards/action-spy.png', overlay: 'spy', color: '#FFB84D' },
    { key: 'E', label: t('ECONOMY'), iconImg: './assets/cards/action-automation.png', overlay: 'economy', color: '#FFD166' },
    { key: 'SPACE', label: t('PAUSE'), iconImg: './assets/cards/action-pause.png', overlay: null, color: '#FFB84D', action: 'pause' },
  ];
}

const actionVideoMap: Record<string, string> = {
  B: 'action-build',
  T: 'action-tech',
  D: 'action-diplo',
  A: 'action-attack',
  S: 'action-spy',
  E: 'action-automation',
  SPACE: 'action-pause',
};

export default function CommandCard() {
  const { state, dispatch } = useGame();
  const actions = buildActions();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
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
    const videoId = actionVideoMap[action.key];
    if (videoId && !isVideoPlayed(videoId)) {
      markVideoPlayed(videoId);
      setVideoSrc(getVideoUrl(videoId));
      setPendingAction(action);
    } else {
      executeAction(action);
    }
  };

  const handleVideoComplete = () => {
    setVideoSrc(null);
    if (pendingAction) {
      executeAction(pendingAction);
      setPendingAction(null);
    }
  };

  return (
    <div className="command-card-dock flex items-center justify-center gap-1.5 px-2 py-2" style={{
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      minHeight: '64px',
    }}>
      {actions.map(action => {
        const isActive = action.overlay && state.overlay === action.overlay;
        return (
          <button
            key={action.key}
            data-tutorial={`cmd-${action.overlay ?? action.action}`}
            onClick={() => handleAction(action)}
            className="command-card-button relative flex flex-col items-center justify-center rounded overflow-hidden transition-all hover:brightness-125 hover:scale-105"
            style={{
              width: '72px',
              height: '52px',
              border: `2px solid ${isActive ? action.color : 'var(--border)'}`,
              boxShadow: isActive ? `0 0 12px ${action.color}55` : '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            <div className="absolute inset-0" style={{
              backgroundImage: `url(${action.iconImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: isActive ? 'brightness(0.9) saturate(1.2)' : 'brightness(0.6) saturate(0.8)',
              transition: 'filter 0.2s ease',
            }} />
            <div className="absolute inset-0" style={{
              background: isActive
                ? `linear-gradient(to top, ${action.color}44, rgba(0,0,0,0.3))`
                : 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.2))',
            }} />
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

      {videoSrc && (
        <VideoPlayer src={videoSrc} onComplete={handleVideoComplete} />
      )}
    </div>
  );
}
