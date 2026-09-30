import { useEffect, useRef } from 'react';
import { useGame } from '../../App';

const COLORS: Record<string, string> = { info: '#00F0FF', warning: '#FFB84D', danger: '#FF477E', success: '#00E5A0' };

export default function NotificationFeed() {
  const { state, dispatch } = useGame();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const live = new Set(state.notifications.map(n => n.id));
    for (const n of state.notifications) {
      if (!timers.current.has(n.id)) {
        timers.current.set(n.id, setTimeout(() => dispatch({ type: 'DISMISS_NOTIFICATION', id: n.id }), n.type === 'danger' ? 9000 : 6000));
      }
    }
    for (const [id, t] of timers.current) {
      if (!live.has(id)) { clearTimeout(t); timers.current.delete(id); }
    }
  }, [state.notifications, dispatch]);

  useEffect(() => () => { for (const t of timers.current.values()) clearTimeout(t); }, []);

  return (
    <div className="absolute top-11 left-2 flex flex-col gap-1.5 z-20 pointer-events-none" style={{ maxWidth: 320 }}>
      {state.notifications.slice(0, 5).map(n => (
        <div key={n.id} className="panel-elevated px-3 py-1.5 animate-fade-up pointer-events-auto cursor-pointer"
          onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', id: n.id })}
          style={{ borderLeft: `3px solid ${COLORS[n.type] || 'var(--cyan)'}`, background: 'rgba(12,13,18,0.9)' }}>
          <span className="font-rajdhani text-[13px] leading-snug font-medium" style={{ color: 'var(--text-primary)' }}>{n.text}</span>
        </div>
      ))}
    </div>
  );
}
