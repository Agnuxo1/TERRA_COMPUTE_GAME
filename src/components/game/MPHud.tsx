// Multiplayer overlay: DEFCON, the heads of state in the room, and the hotline (room chat).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../App';
import { continentById } from '../../game/data';
import { defcon, hasIntel } from '../../game/engine';
import { capabilityLabel } from '../../game/format';
import { play } from '../../hooks/useSound';
import { t } from '../../i18n';

export const DEFCON_COLOR = ['', '#FF2D2D', '#FF7A2D', '#FFB84D', '#00F0FF', '#00E5A0'];

export default function MPHud() {
  const { state, dispatch } = useGame();
  const mp = state.mp!;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [seen, setSeen] = useState(0);
  const [ticker, setTicker] = useState<string | null>(null);
  const chat = useMemo(() => state.chat ?? [], [state.chat]);
  const lastLen = useRef(chat.length);
  const d = defcon(state.tension);

  useEffect(() => {
    if (chat.length > lastLen.current) {
      const m = chat[chat.length - 1];
      if (m.from !== mp.me) {
        play('click');
        const who = mp.players.find(p => p.faction === m.from)?.name ?? m.from;
        setTicker(`${who}: ${m.text}`);
        const id = setTimeout(() => setTicker(null), 6000);
        lastLen.current = chat.length;
        return () => clearTimeout(id);
      }
    }
    lastLen.current = chat.length;
  }, [chat, mp]);
  useEffect(() => { if (open) setSeen(chat.length); }, [open, chat.length]);

  const send = () => {
    const t = text.trim().slice(0, 160);
    if (!t) return;
    dispatch({ type: 'MP_RECV', msg: { t: 'chat', from: mp.me, text: t } });
    void import('../../net/session').then(({ session }) => session.broadcast({ k: 'msg', m: { t: 'chat', from: mp.me, text: t } }));
    setText('');
  };
  const unread = Math.max(0, chat.length - seen);
  const guest = mp.role === 'guest' && !mp.offline;

  return (
    <>
      {/* Situation strip */}
      <div className="absolute z-[40] left-1/2 -translate-x-1/2 top-[92px] flex items-center gap-1.5 px-2 py-1 rounded-lg max-w-[min(860px,70vw)] overflow-x-auto"
        style={{ background: 'rgba(8,9,12,0.88)', border: `1px solid ${DEFCON_COLOR[d]}66`, boxShadow: `0 4px 18px rgba(0,0,0,0.6)` }}>
        <span className={`font-orbitron text-[11px] font-black tracking-[0.15em] px-2 py-0.5 rounded shrink-0 ${d <= 2 ? 'animate-pulse' : ''}`}
          style={{ color: '#050608', background: DEFCON_COLOR[d] }}
          title={t('World tension {tension}/100. Covert operations raise it; treaties and time lower it. At DEFCON 1 every nation loses two years of growth.', { tension: Math.round(state.tension ?? 0) })}>
          DEFCON {d}
        </span>
        {mp.offline && <span className="font-mono-data text-[9px] shrink-0" style={{ color: 'var(--amber)' }}>{t('OFFLINE · vs AI')}</span>}
        {mp.players.map(p => {
          const c = continentById(p.faction);
          const meP = p.faction === mp.me;
          const r = state.rivals.find(x => x.id === p.faction);
          const cap = meP ? state.capability : r?.capability ?? 0;
          const exact = meP || (r && hasIntel(state, r));
          return (
            <span key={p.peerId} className="flex items-center gap-1 px-1.5 py-0.5 rounded shrink-0 font-mono-data text-[9.5px]"
              style={{ border: `1px solid ${c?.color ?? '#555'}${meP ? 'CC' : '55'}`, opacity: p.online ? 1 : 0.45 }}
              title={p.online
                ? t('{player} · {faction}', { player: p.name, faction: t(c?.name ?? '') })
                : t('{player} · {faction} · disconnected (AI government)', { player: p.name, faction: t(c?.name ?? '') })}>
              <span style={{ width: 6, height: 6, borderRadius: 6, background: p.online ? 'var(--green)' : '#666', boxShadow: p.online ? '0 0 6px var(--green)' : 'none' }} />
              <span style={{ color: c?.color }}>{p.name}{p.peerId === mp.players[0]?.peerId && mp.role === 'host' && meP ? ' ★' : ''}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{exact ? `${capabilityLabel(cap)} ${cap.toFixed(1)}` : `≈${capabilityLabel(Math.round(cap))}`}</span>
            </span>
          );
        })}
        {guest && state.paused && <span className="font-mono-data text-[9px] shrink-0 animate-pulse" style={{ color: 'var(--amber)' }}>{t('PAUSED BY HOST')}</span>}
        <button onClick={() => { play('click'); setOpen(o => !o); }}
          className="font-mono-data text-[9.5px] px-2 py-0.5 rounded shrink-0 hover:brightness-125"
          style={{ color: '#050608', background: unread ? 'var(--amber)' : 'var(--text-secondary)' }}>
          ✉ {t('HOTLINE')}{unread ? ` (${unread})` : ''}
        </button>
      </div>

      {ticker && !open && (
        <div className="absolute z-[40] left-1/2 -translate-x-1/2 top-[124px] px-3 py-1 rounded font-mono-data text-[11px] animate-fade-up"
          style={{ background: 'rgba(8,9,12,0.92)', color: 'var(--amber)', border: '1px solid var(--amber)' }}>✉ {ticker}</div>
      )}

      {open && (
        <div className="absolute z-[45] left-1/2 -translate-x-1/2 top-[124px] w-[min(440px,90vw)] rounded-lg p-2 flex flex-col gap-1.5"
          style={{ background: 'rgba(8,9,12,0.96)', border: '1px solid var(--amber)', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}>
          <div className="flex items-center justify-between">
            <span className="font-mono-data text-[10px] tracking-[0.3em]" style={{ color: 'var(--amber)' }}>{t('HOTLINE')} · {mp.room}</span>
            <button onClick={() => setOpen(false)} className="font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}>✕</button>
          </div>
          <div className="flex flex-col gap-0.5 overflow-auto font-mono-data text-[10.5px]" style={{ maxHeight: 180 }}>
            {chat.length === 0 && <span style={{ color: 'var(--text-tertiary)' }}>{t('Threaten, bargain, betray. Everything you type reaches every head of state.')}</span>}
            {chat.map((m, i) => {
              const c = continentById(m.from);
              return <span key={i}><span style={{ color: 'var(--text-tertiary)' }}>{m.year} </span><span style={{ color: c?.color }}>{mp.players.find(p => p.faction === m.from)?.name ?? m.from}:</span> <span style={{ color: 'var(--text-secondary)' }}>{m.text}</span></span>;
            })}
          </div>
          <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-1">
            <input autoFocus value={text} onChange={e => setText(e.target.value.slice(0, 160))} placeholder={t('Message every head of state…')}
              onKeyDown={e => e.stopPropagation()}
              className="flex-1 min-w-0 font-mono-data text-[11px] px-2 py-1 rounded outline-none" style={{ background: '#050608', color: '#F2E9DC', border: '1px solid var(--border-light)' }} />
            <button className="font-mono-data text-[10px] px-3 rounded" style={{ color: '#050608', background: 'var(--amber)' }}>{t('SEND')}</button>
          </form>
        </div>
      )}
    </>
  );
}
