// WAR ROOM — peer-to-peer multiplayer lobby: up to eight heads of state, one per bloc, no game server.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useGame } from '../App';
import { continents } from '../game/data';
import { newRoomCode, ROOM_ALPHABET } from '../game/mp';
import type { Difficulty } from '../game/types';
import { play } from '../hooks/useSound';
import { session, FACTION_IDS, listMPSaves } from '../net/session';
import { startMultiplayer, stateFromSave } from '../net/MPBridge';
import { RIVAL_LEADERS } from '../game/dynamic-events';
import { t } from '../i18n';

const PUBLIC_URL = 'https://agnuxo1.github.io/TERRA_COMPUTE_GAME/';

const CARD: Record<string, string> = {
  na: './assets/cards/continent-usa.png', eu: './assets/cards/continent-europe.png', su: './assets/cards/continent-ussr.png',
  cn: './assets/cards/continent-china.png', af: './assets/cards/continent-africa.png', sa: './assets/cards/continent-southamerica.png',
  in: './assets/cards/continent-india.png', oc: './assets/cards/continent-oceania.png',
};
const NAME_KEY = 'terra_compute_callsign';
const RED = '#FF3B3B';
const AMBER = '#FFB84D';

function useSession() {
  const [, force] = useState(0);
  useEffect(() => session.subscribe(() => force(n => n + 1)), []);
  return session;
}

// Built at render time so the copy follows the active language.
function briefing(): Array<[string, string]> {
  return [
    [t('☢ DEFCON'), t('Every covert strike raises world tension. Push it to DEFCON 1 and every nation — you included — loses two years of growth.')],
    [t('🏁 WORLD FIRSTS'), t('First to the TeraFLOP, PetaFLOP, ExaFLOP and ZettaFLOP takes the research bonus and the glory. Second place gets nothing.')],
    [t('⚡ COVERT WAR'), t('Sabotage their data centres, black out their grid, steal their research, flood them with propaganda. Get caught and the whole room knows.')],
    [t('🛡 DEFENCE'), t('AI Safety Institutes and counter-intelligence sweeps turn their operations into exposed failures.')],
    [t('✍ DIPLOMACY'), t('Send real money, propose treaties they must accept, sign safety pacts — or tear them up at the worst moment.')],
    [t('🤖 THE REST OF THE WORLD'), t('Unclaimed blocs are run by AI governments. Anyone can still lose the race to them.')],
  ];
}

export default function LobbyScreen() {
  const { dispatch } = useGame();
  const ses = useSession();
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } });
  const [code, setCode] = useState(() => (new URLSearchParams(window.location.search).get('room') || '').toUpperCase().slice(0, 6));
  const [chat, setChat] = useState('');
  const [copied, setCopied] = useState(false);
  const online = useSyncExternalStore(cb => { window.addEventListener('online', cb); window.addEventListener('offline', cb); return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); }; }, () => navigator.onLine);
  const lobby = ses.lobby;
  const inRoom = ses.status !== 'idle';
  const me = ses.me;
  const startedRef = useRef(false);
  /** Room code of the save this session is being opened from: guests reload their save, the host resumes its own. */
  const rejoinRef = useRef<string | null>(null);
  const resumeRef = useRef<string | null>(null);
  const saves = useMemo(() => (inRoom ? [] : listMPSaves()), [inRoom]);

  const callsign = name.trim() || 'Comrade';
  const saveName = (v: string) => { setName(v); try { localStorage.setItem(NAME_KEY, v); } catch { /* storage unavailable */ } };

  // Everyone (host included) enters the game when the host starts it.
  useEffect(() => session.onWire((w, from) => {
    if (w.k !== 'start' || startedRef.current || from !== session.lobby?.hostId) return;
    const s = rejoinRef.current === w.lobby.code ? stateFromSave(w.lobby, session.selfId) : startMultiplayer(w.lobby, session.selfId);
    if (s) { startedRef.current = true; play('alert'); dispatch({ type: 'LOAD_STATE', state: s }); }
  }), [dispatch]);

  // Rejoining a game that is already running: the host seats me again (same token) and sends the started lobby.
  useEffect(() => {
    if (startedRef.current || !rejoinRef.current || !lobby?.started || lobby.code !== rejoinRef.current) return;
    const s = stateFromSave(lobby, session.selfId);
    if (s) { startedRef.current = true; play('alert'); dispatch({ type: 'LOAD_STATE', state: s }); }
  }, [lobby, dispatch]);

  const create = () => { play('click'); rejoinRef.current = null; resumeRef.current = null; void ses.open(newRoomCode(), callsign, true); };
  const join = () => { if (code.length === 6) { play('click'); rejoinRef.current = null; resumeRef.current = null; void ses.open(code, callsign, false); } };
  const rejoin = (c: string) => { play('click'); rejoinRef.current = c; resumeRef.current = null; void ses.open(c, callsign, false, { rejoin: true }); };
  const resume = (c: string) => { play('click'); rejoinRef.current = null; resumeRef.current = c; void ses.resume(c, callsign); };
  const leave = () => { play('click'); void ses.leave(); };
  const begin = () => {
    const l = ses.start();
    if (!l) return;
    const s = resumeRef.current === l.code ? stateFromSave(l, ses.selfId) : startMultiplayer(l, ses.selfId);
    if (s) { startedRef.current = true; play('alert'); dispatch({ type: 'LOAD_STATE', state: s }); }
  };
  // Packaged builds (desktop file://, Android https://localhost) invite friends to the public web version.
  const link = useMemo(() => {
    if (!lobby) return '';
    const { protocol, hostname, origin, pathname } = window.location;
    const local = !/^https?:$/.test(protocol) || hostname === 'localhost' && !import.meta.env.DEV;
    return `${local ? PUBLIC_URL : origin + pathname}?room=${lobby.code}`;
  }, [lobby]);
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } };

  const claimed = (f: string) => lobby?.players.find(p => p.faction === f);
  const humans = lobby?.players.filter(p => p.faction).length ?? 0;

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#07080B' }}>
      {/* Situation-room backdrop */}
      {/* The war table: a 1943 military survey map under red plotting light */}
      <div className="absolute inset-0" style={{ backgroundImage: 'url(./assets/map-1940.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'sepia(0.5) saturate(0.7) brightness(0.3) contrast(1.25)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(rgba(255,59,59,0.06) 1px, transparent 1px) 0 0 / 64px 64px, linear-gradient(90deg, rgba(255,59,59,0.06) 1px, transparent 1px) 0 0 / 64px 64px, repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px), radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.88) 100%), linear-gradient(180deg, rgba(7,8,11,0.96) 0, rgba(7,8,11,0.7) 9%, transparent 20%)' }} />
      <div className="absolute pointer-events-none rounded-full" style={{ width: 'min(70vw, 760px)', aspectRatio: '1', left: '50%', top: '55%', transform: 'translate(-50%, -50%)', border: '1px solid rgba(255,59,59,0.12)', boxShadow: 'inset 0 0 0 80px rgba(255,59,59,0.015), 0 0 0 1px rgba(255,59,59,0.04)', background: 'conic-gradient(from 0deg, rgba(255,59,59,0.10), transparent 18%)', animation: 'warroom-sweep 6s linear infinite' }} />
      <style>{'@keyframes warroom-sweep { to { transform: translate(-50%, -50%) rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="warroom-sweep"] { animation: none !important; } }'}</style>
      <div className="absolute inset-0 overflow-auto">
        <div className="min-h-full w-full max-w-[1180px] mx-auto px-4 py-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <button onClick={() => { void ses.leave(); dispatch({ type: 'SET_SCREEN', screen: 'title' }); }}
              className="font-mono-data text-[11px] px-3 py-1.5 rounded hover:brightness-125" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.5)' }}>{t('← MENU')}</button>
            <div className="flex flex-col items-center text-center">
              <span className="font-mono-data text-[10px] tracking-[0.5em]" style={{ color: RED }}>{t('TOP SECRET · EYES ONLY')}</span>
              <h1 className="font-orbitron font-black tracking-[0.2em]" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)', color: '#F2E9DC', textShadow: `0 0 24px ${RED}66, 0 3px 0 #000` }}>{t('WAR ROOM')}</h1>
              <span className="font-mono-data text-[10.5px] tracking-[0.3em]" style={{ color: AMBER }}>{t('UP TO 8 HEADS OF STATE · DIRECT LINK · NO SERVERS')}</span>
            </div>
            <span className="font-mono-data text-[10px] px-2 py-1 rounded" style={{ color: online ? 'var(--green)' : RED, border: `1px solid ${online ? 'var(--green)' : RED}55` }}>{online ? t('● ONLINE') : t('● OFFLINE')}</span>
          </div>

          {!inRoom ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              {/* Credentials */}
              <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'rgba(12,13,18,0.92)', border: `2px solid ${RED}55`, boxShadow: `0 0 40px ${RED}18` }}>
                <label className="font-mono-data text-[10px] tracking-[0.3em]" style={{ color: 'var(--text-tertiary)' }}>{t('YOUR CALLSIGN')}</label>
                <input value={name} onChange={e => saveName(e.target.value.slice(0, 18))} placeholder={t('e.g. Volkov')}
                  className="font-orbitron text-lg px-3 py-2 rounded outline-none" style={{ background: '#050608', color: '#F2E9DC', border: '1px solid var(--border-light)' }} />
                <button onClick={create} disabled={!online}
                  className="font-orbitron font-black tracking-[0.2em] py-3 rounded transition-all hover:brightness-125 disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${RED}, #B3121C)`, color: '#fff', boxShadow: `0 0 24px ${RED}55` }}>{t('☢ ESTABLISH A WAR ROOM')}</button>
                <div className="flex items-center gap-2 font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}><span className="flex-1 h-px" style={{ background: 'var(--border-light)' }} />{t('OR')}<span className="flex-1 h-px" style={{ background: 'var(--border-light)' }} /></div>
                <div className="flex gap-2">
                  <input value={code} onChange={e => setCode(e.target.value.toUpperCase().split('').filter(c => ROOM_ALPHABET.includes(c)).join('').slice(0, 6))}
                    onKeyDown={e => { if (e.key === 'Enter') join(); }} placeholder={t('ROOM CODE')}
                    className="flex-1 min-w-0 font-orbitron text-lg tracking-[0.35em] px-3 py-2 rounded outline-none text-center" style={{ background: '#050608', color: AMBER, border: `1px solid ${AMBER}55` }} />
                  <button onClick={join} disabled={code.length !== 6 || !online}
                    className="font-orbitron font-bold tracking-widest px-4 rounded hover:brightness-125 disabled:opacity-40" style={{ color: '#050608', background: AMBER }}>{t('JOIN')}</button>
                </div>
                {saves.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {saves.map(m => (
                      <button key={m.code} onClick={() => (m.role === 'host' ? resume(m.code) : rejoin(m.code))} disabled={!online}
                        className="font-mono-data text-[10.5px] tracking-wider py-2 rounded hover:brightness-125 disabled:opacity-40"
                        style={{ color: AMBER, border: `1px solid ${AMBER}`, background: 'rgba(255,184,77,0.08)' }}>
                        {m.role === 'host' ? t('↻ Resume game {code} ({year})', { code: m.code, year: m.year }) : t('↻ Rejoin room {code} ({year})', { code: m.code, year: m.year })}
                      </button>
                    ))}
                  </div>
                )}
                <p className="font-rajdhani text-[12px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                  {t('Browsers connect directly (WebRTC). Free public relays only introduce the players; the room code encrypts that handshake. Like any peer-to-peer game, the other players can see your IP address. A few very strict networks (some offices and mobile carriers) block direct links.')}
                </p>
              </div>
              {/* Briefing */}
              <div className="rounded-lg p-4 flex flex-col gap-2.5" style={{ background: 'rgba(12,13,18,0.85)', border: '1px solid var(--border-light)' }}>
                <span className="font-mono-data text-[10px] tracking-[0.4em]" style={{ color: AMBER }}>{t('BRIEFING · RULES OF ENGAGEMENT')}</span>
                {briefing().map(([heading, d]) => (
                  <div key={heading} className="flex flex-col">
                    <span className="font-orbitron text-[12.5px] font-bold" style={{ color: '#F2E9DC' }}>{heading}</span>
                    <span className="font-rajdhani text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Room bar */}
              <div className="rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2" style={{ background: 'rgba(12,13,18,0.92)', border: `2px solid ${RED}55` }}>
                <div className="flex flex-col">
                  <span className="font-mono-data text-[9px] tracking-[0.3em]" style={{ color: 'var(--text-tertiary)' }}>{t('ROOM CODE')}</span>
                  <span className="font-orbitron font-black text-3xl tracking-[0.35em]" style={{ color: AMBER, textShadow: `0 0 16px ${AMBER}66` }}>{lobby?.code ?? code}</span>
                </div>
                {lobby && ses.isHost && (
                  <button onClick={copy} className="font-mono-data text-[10.5px] px-3 py-1.5 rounded hover:brightness-125" style={{ color: AMBER, border: `1px solid ${AMBER}` }}>{copied ? t('✔ LINK COPIED') : t('⧉ COPY INVITE LINK')}</button>
                )}
                <div className="flex flex-col font-mono-data text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>
                  <span>{ses.status === 'error' ? <span style={{ color: RED }}>✖ {ses.error || t('Connection failed')}</span> : !lobby ? <span className="animate-pulse" style={{ color: AMBER }}>{t('● Locating the war room… (relays can take ~10 s)')}</span> : <span style={{ color: 'var(--green)' }}>{ses.peers.size === 1 ? t('● Linked · {count} other head of state connected', { count: ses.peers.size }) : t('● Linked · {count} other heads of state connected', { count: ses.peers.size })}</span>}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{ses.isHost ? t('You are the host: you set the rules and command the clock.') : t('The host sets the rules and commands the clock.')}</span>
                </div>
                <button onClick={leave} className="ml-auto font-mono-data text-[10.5px] px-3 py-1.5 rounded hover:brightness-125" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>{t('LEAVE ROOM')}</button>
              </div>

              {lobby?.started && !startedRef.current && (
                <div className="rounded p-3 font-mono-data text-[11px] text-center" style={{ color: RED, border: `1px solid ${RED}` }}>{rejoinRef.current ? t('Rejoining the game in room {code}…', { code: rejoinRef.current }) : t('This war room is full or its game has already begun.')}</div>
              )}

              {/* Faction table */}
              {lobby && (
                <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))' }}>
                  {FACTION_IDS.map(f => {
                    const c = continents.find(x => x.id === f)!;
                    const owner = claimed(f);
                    const mine = owner?.peerId === ses.selfId;
                    const free = !owner;
                    return (
                      <button key={f} onClick={() => { play('click'); ses.claim(mine ? null : f); }} disabled={(!free && !mine) || ses.resumed || !!rejoinRef.current}
                        className="relative rounded-lg overflow-hidden text-left transition-all"
                        style={{ aspectRatio: '3/4', border: `2px solid ${mine ? c.color : owner ? `${c.color}88` : 'var(--border-light)'}`, boxShadow: mine ? `0 0 24px ${c.color}77` : 'none', transform: mine ? 'translateY(-4px)' : 'none', cursor: free || mine ? 'pointer' : 'default' }}>
                        <div className="absolute inset-0" style={{ backgroundImage: `url(${CARD[f]})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: owner ? 'brightness(0.75)' : 'brightness(0.35) grayscale(0.7)' }} />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 35%, rgba(5,6,8,0.95) 78%)' }} />
                        <div className="absolute left-2 right-2 bottom-2 flex flex-col">
                          <span className="font-orbitron text-[12px] font-bold" style={{ color: c.color }}>{t(c.name)}</span>
                          <span className="font-mono-data text-[8.5px]" style={{ color: 'var(--text-tertiary)' }}>{t(c.specialBonus)}</span>
                          <span className="font-mono-data text-[10px] mt-1 truncate" style={{ color: owner ? '#F2E9DC' : 'var(--text-tertiary)' }}>
                            {owner ? `${mine ? '► ' : ''}${owner.name}${owner.peerId === lobby.hostId ? ' ★' : ''}` : t('AI · {title} {name}', { title: t(RIVAL_LEADERS[f]?.title ?? ''), name: RIVAL_LEADERS[f]?.name ?? '' })}
                          </span>
                        </div>
                        {free && <span className="absolute top-2 right-2 font-mono-data text-[8.5px] px-1.5 py-0.5 rounded" style={{ color: '#050608', background: AMBER }}>{t('CLAIM')}</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Orders + roster + chat */}
              {lobby && (
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                  <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(12,13,18,0.92)', border: '1px solid var(--border-light)' }}>
                    <span className="font-mono-data text-[10px] tracking-[0.3em]" style={{ color: AMBER }}>{t('CAMPAIGN ORDERS')}</span>
                    <div className="flex gap-1.5">
                      {([['complete', t('COMPLETE · 1960')], ['strategist', t('ESTRATEGA · 1980')]] as const).map(([m, label]) => (
                        <button key={m} disabled={!ses.isHost} onClick={() => ses.setOptions({ mode: m })}
                          className="flex-1 font-orbitron text-[10px] font-bold tracking-wider py-2 rounded disabled:cursor-default"
                          style={{ color: lobby.mode === m ? '#050608' : 'var(--text-secondary)', background: lobby.mode === m ? AMBER : 'transparent', border: `1px solid ${AMBER}66` }}>{label}</button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {(['easy', 'normal', 'hard', 'doomsday'] as Difficulty[]).map(d => (
                        <button key={d} disabled={!ses.isHost} onClick={() => ses.setOptions({ difficulty: d })}
                          className="flex-1 font-mono-data text-[10px] tracking-widest py-1.5 rounded disabled:cursor-default"
                          style={{ color: lobby.difficulty === d ? '#050608' : 'var(--text-secondary)', background: lobby.difficulty === d ? 'var(--cyan)' : 'transparent', border: '1px solid rgba(0,240,255,0.35)' }}>{t('{level} AI', { level: d.toUpperCase() })}</button>
                      ))}
                    </div>
                    <button disabled={!ses.isHost} onClick={() => ses.setOptions({ teams: !lobby.teams })}
                      title={t('Western Bloc (North America, Europe, South America, Oceania) against Eastern Bloc (Soviet Union, China, India, Africa): shared research, team chat (/t), joint victory.')}
                      className="font-mono-data text-[10px] tracking-widest py-1.5 rounded disabled:cursor-default"
                      style={{ color: lobby.teams ? '#050608' : 'var(--text-secondary)', background: lobby.teams ? AMBER : 'transparent', border: `1px solid ${AMBER}66` }}>
                      {lobby.teams ? t('TEAMS: WEST vs EAST') : t('FREE FOR ALL')}
                    </button>
                    {ses.isHost ? (
                      <button onClick={begin} disabled={!me?.faction || lobby.started}
                        className="mt-1 font-orbitron font-black tracking-[0.25em] py-3 rounded transition-all hover:brightness-125 disabled:opacity-40"
                        style={{ background: `linear-gradient(135deg, ${RED}, #B3121C)`, color: '#fff', boxShadow: `0 0 24px ${RED}55` }}>
                        {!me?.faction ? t('CLAIM A BLOC FIRST') : humans === 1 ? t('LAUNCH · {humans} HUMAN + {ai} AI', { humans, ai: 8 - humans }) : t('LAUNCH · {humans} HUMANS + {ai} AI', { humans, ai: 8 - humans })}
                      </button>
                    ) : (
                      <div className="mt-1 font-orbitron text-[11px] tracking-[0.25em] text-center py-3 rounded animate-pulse" style={{ color: AMBER, border: `1px dashed ${AMBER}66` }}>
                        {me?.faction ? t('AWAITING ORDERS FROM THE HOST') : t('CLAIM YOUR BLOC')}
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg p-3 flex flex-col gap-1.5 min-h-[160px]" style={{ background: 'rgba(12,13,18,0.92)', border: '1px solid var(--border-light)' }}>
                    <span className="font-mono-data text-[10px] tracking-[0.3em]" style={{ color: AMBER }}>{t('HOTLINE · ROOM CHAT')}</span>
                    <div className="flex-1 overflow-auto font-mono-data text-[10.5px] flex flex-col gap-0.5" style={{ maxHeight: 140 }}>
                      {ses.lobbyChat.length === 0 && <span style={{ color: 'var(--text-tertiary)' }}>{lobby.players.length === 1 ? t('{names} is in the room.', { names: lobby.players.map(p => p.name).join(', ') }) : t('{names} are in the room.', { names: lobby.players.map(p => p.name).join(', ') })}</span>}
                      {ses.lobbyChat.map((m, i) => <span key={i}><span style={{ color: AMBER }}>{m.name}:</span> <span style={{ color: 'var(--text-secondary)' }}>{m.text}</span></span>)}
                    </div>
                    <form onSubmit={e => { e.preventDefault(); ses.chat(chat); setChat(''); }} className="flex gap-1">
                      <input value={chat} onChange={e => setChat(e.target.value.slice(0, 160))} placeholder={t('Send a message…')}
                        className="flex-1 min-w-0 font-mono-data text-[11px] px-2 py-1.5 rounded outline-none" style={{ background: '#050608', color: '#F2E9DC', border: '1px solid var(--border-light)' }} />
                      <button className="font-mono-data text-[10px] px-3 rounded" style={{ color: '#050608', background: AMBER }}>{t('SEND')}</button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
