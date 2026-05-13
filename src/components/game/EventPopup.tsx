import { useGame, events } from '../../App';
import { play } from '../../hooks/useSound';
import { useEffect, useState, useRef } from 'react';
import { useVideoPlayer } from '../../hooks/useVideo';
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

export default function EventPopup() {
  const { state, dispatch } = useGame();
  const { activeVideo, playVideo, clearVideo } = useVideoPlayer();
  const [videoCompleted, setVideoCompleted] = useState(false);
  const lastEventRef = useRef<string | null>(null);

  const evt = events.find(e => e.id === state.showEvent);

  useEffect(() => {
    const eventId = state.showEvent;
    if (eventId && eventId !== lastEventRef.current) {
      lastEventRef.current = eventId;
      setVideoCompleted(false);
      play('alert');
      const videoId = `event-${eventId}`;
      const videoPlayed = playVideo(videoId, true);
      if (!videoPlayed) {
        setVideoCompleted(true);
      }
    }
    if (!eventId) {
      lastEventRef.current = null;
      setVideoCompleted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showEvent]);

  const handleVideoComplete = () => {
    clearVideo();
    setVideoCompleted(true);
  };

  const handleAcknowledge = () => {
    play('click');
    clearVideo();
    dispatch({ type: 'DISMISS_EVENT' });
  };

  if (!evt) return null;

  if (!videoCompleted && activeVideo) {
    return (
      <VideoPlayer
        src={activeVideo}
        onComplete={handleVideoComplete}
        onSkip={handleVideoComplete}
      />
    );
  }

  const cardImage = eventCardMap[evt.id];
  const hasCard = !!cardImage;

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

  if (hasCard) {
    return (
      <div
        className="absolute inset-0 z-[60] flex items-center justify-center"
        style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(4px)' }}
      >
        <div
          className="animate-fade-up relative overflow-hidden"
          style={{
            width: '85vw', height: '85vh', maxWidth: '680px', maxHeight: '880px',
            borderRadius: '12px', boxShadow: `0 0 40px ${typeColor}33`,
          }}
        >
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${cardImage})`, backgroundSize: 'cover',
            backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
          }} />
          <div className="absolute inset-0" style={{ background: 'rgba(10,10,15,0.72)' }} />
          <div className="relative z-10 flex flex-col gap-4" style={{
            padding: 'clamp(24px, 5vh, 48px)', height: '100%', justifyContent: 'flex-end',
          }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: typeColor }} />
              <span className="font-orbitron text-[10px] tracking-wider" style={{ color: typeColor }}>
                {evt.type.toUpperCase()} — {evt.year}
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
                  <span key={i} className="font-mono-data text-[9px] px-2 py-0.5 rounded"
                    style={{ background: eff.includes('-') ? 'var(--rose-dim)' : 'var(--green-dim)',
                      color: eff.includes('-') ? 'var(--rose)' : 'var(--green)' }}>
                    {eff}
                  </span>
                ))}
              </div>
            )}
            <button onClick={handleAcknowledge}
              className="w-full py-2.5 mt-1 rounded font-orbitron text-sm font-bold tracking-wider transition-all hover:brightness-120"
              style={{ background: typeColor + '22', color: typeColor, border: `2px solid ${typeColor}` }}>
              ACKNOWLEDGE
            </button>
            <div className="text-center">
              <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
                Press ENTER to dismiss
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Fallback layout (events without card art) ──
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(4px)' }}>
      <div className="panel-elevated p-5 flex flex-col gap-3 animate-fade-up"
        style={{ maxWidth: '420px', width: '85%', border: `2px solid ${typeColor}`, boxShadow: `0 0 30px ${typeColor}22` }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: typeColor }} />
          <span className="font-orbitron text-[10px] tracking-wider" style={{ color: typeColor }}>
            {evt.type.toUpperCase()} — {evt.year}
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
              <span key={i} className="font-mono-data text-[9px] px-2 py-0.5 rounded"
                style={{ background: eff.includes('-') ? 'var(--rose-dim)' : 'var(--green-dim)',
                  color: eff.includes('-') ? 'var(--rose)' : 'var(--green)' }}>
                {eff}
              </span>
            ))}
          </div>
        )}
        <button onClick={handleAcknowledge}
          className="w-full py-2.5 mt-1 rounded font-orbitron text-sm font-bold tracking-wider transition-all hover:brightness-120"
          style={{ background: typeColor + '22', color: typeColor, border: `2px solid ${typeColor}` }}>
          ACKNOWLEDGE
        </button>
        <div className="text-center">
          <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
            Press ENTER to dismiss
          </span>
        </div>
      </div>
    </div>
  );
}
