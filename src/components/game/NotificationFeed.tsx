import { useGame } from '../../App';
import { useEffect } from 'react';

export default function NotificationFeed() {
  const { state, dispatch } = useGame();

  useEffect(() => {
    const timers = state.notifications.map(n =>
      setTimeout(() => {
        dispatch({ type: 'DISMISS_NOTIFICATION', id: n.id });
      }, 6000)
    );
    return () => timers.forEach(t => clearTimeout(t));
  }, [state.notifications.length]);

  const typeColors: Record<string, string> = {
    info: '#00F0FF',
    warning: '#FFB84D',
    danger: '#FF477E',
  };

  return (
    <div
      className="absolute top-3 left-[152px] flex flex-col gap-1.5 max-md:left-[112px] max-md:top-2"
      style={{ zIndex: 10, maxWidth: '280px' }}
    >
      {state.notifications.slice(0, 5).map((n, i) => (
        <div
          key={n.id}
          className="panel-elevated px-3 py-2 animate-slide-in-right"
          style={{
            animationDelay: `${i * 0.05}s`,
            borderLeft: `3px solid ${typeColors[n.type] || 'var(--cyan)'}`,
          }}
        >
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{
              background: typeColors[n.type] || 'var(--cyan)'
            }}/>
            <span className="font-mono-data text-[10px] leading-snug" style={{color:'var(--text-secondary)'}}>
              {n.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
