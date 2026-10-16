// Keeps a multiplayer game in sync: the host's clock, everyone's national snapshot, the AI blocs and the outbox.
// Renders nothing; mounted once inside the GameProvider.
import { useEffect, useRef } from 'react';
import { useGame } from '../App';
import { YEARS_PER_TICK, gameReducer, giftCost, initialState, ownDefense } from '../game/engine';

const clampN = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
import { aiStates, makeSnapshot, type MPPlayer } from '../game/mp';
import type { GameState } from '../game/types';
import { session, type LobbyState } from './session';

/** Builds this player's opening state from the lobby the host started. */
export function startMultiplayer(lobby: LobbyState, selfId: string): GameState | null {
  const me = lobby.players.find(p => p.peerId === selfId);
  if (!me?.faction) return null;
  let s = gameReducer({ ...initialState, gameMode: lobby.mode }, { type: 'START_GAME', continentId: me.faction, seed: lobby.seed, difficulty: lobby.difficulty });
  const players: MPPlayer[] = lobby.players.filter(p => p.faction).map(p => ({ peerId: p.peerId, name: p.name, faction: p.faction!, online: p.online }));
  s = { ...s, mp: { role: lobby.hostId === selfId ? 'host' : 'guest', me: me.faction, room: lobby.code, players }, mpOutbox: [], chat: [], paused: false, speed: 1 };
  return s;
}

export default function MPBridge() {
  const { state, dispatch } = useGame();
  const ref = useRef(state);
  ref.current = state;
  const active = !!state.mp && !state.mp.offline;

  // Incoming traffic
  useEffect(() => {
    if (!active) return;
    return session.onWire((w, from) => {
      const s = ref.current;
      if (!s.mp) return;
      // Peers are not trusted: a message must come from the player it claims to be, and only the host speaks for the clock and the AI.
      const sender = s.mp.players.find(p => p.peerId === from);
      const fromHost = s.mp.players[0]?.peerId === from || (s.mp.role === 'guest' && session.lobby?.hostId === from);
      switch (w.k) {
        case 'clk': {
          if (s.mp.role !== 'guest' || s.screen !== 'game' || !fromHost) return;
          if (!Number.isFinite(w.y) || !Number.isFinite(w.tn) || ![1, 2, 3].includes(w.sp)) return;
          if (s.speed !== w.sp || s.paused !== !!w.p) dispatch({ type: 'MP_CLOCK', speed: w.sp, paused: !!w.p });
          if (Math.abs((s.tension ?? 0) - w.tn) > 0.5) dispatch({ type: 'MP_CLOCK_TENSION', tension: Math.max(0, Math.min(100, w.tn)) });
          const step = YEARS_PER_TICK * w.sp;
          const n = Math.min(12, Math.round((w.y - s.year) / step));
          for (let i = 0; i < n; i++) dispatch({ type: 'TICK' });
          return;
        }
        case 'snap':
          if (!sender || w.s?.f !== sender.faction || !Number.isFinite(w.s.cap)) return;
          dispatch({ type: 'MP_SNAPSHOT', snap: { ...w.s, cap: clampN(w.s.cap, 0, 30), al: clampN(w.s.al, 0, 100), app: clampN(w.s.app, 0, 100), def: clampN(w.s.def, 0, 0.6), em: clampN(w.s.em, 0, 1e5), gdp: clampN(w.s.gdp, 0, 1e7), pop: clampN(w.s.pop, 0, 1e5) } });
          return;
        case 'ai': if (s.mp.role === 'guest' && fromHost && Array.isArray(w.a)) dispatch({ type: 'MP_AI', ai: w.a }); return;
        case 'msg': {
          const m = w.m;
          if (!sender || !m) return;
          if ('from' in m && m.from !== sender.faction) return;          // no impersonation
          if ((m.t === 'end' && m.human && m.who !== sender.faction) || (m.t === 'end' && !m.human && !fromHost)) return;
          if ((m.t === 'first' || m.t === 'defcon1') && !(m.t === 'first' && m.who === sender.faction) && !fromHost) return;
          if (m.t === 'diplo' && m.amount !== undefined) m.amount = clampN(m.amount, 0, 3 * giftCost(s));
          if (m.t === 'op' && !Number.isFinite(m.tn)) return;
          if (m.t === 'op') m.tn = clampN(m.tn, 0, 15);
          if (m.t === 'aiop') { m.lag = clampN(m.lag ?? 0, -1.5, 3); m.align = clampN(m.align ?? 0, -15, 25); m.stability = clampN(m.stability ?? 0, -30, 10); m.clean = clampN(m.clean ?? 0, -0.1, 0.3); }
          dispatch({ type: 'MP_RECV', msg: m });
          return;
        }
        case 'preq': if (s.mp.role === 'host' && s.screen === 'game' && sender) dispatch({ type: 'TOGGLE_PAUSE' }); return;
        case 'lobby': {
          if (!fromHost) return;
          // Presence changes during the game (someone dropped).
          const players = w.lobby.players.filter(p => p.faction).map(p => ({ peerId: p.peerId, name: String(p.name).slice(0, 18), faction: p.faction!, online: p.online && (p.peerId === session.selfId || session.peers.has(p.peerId)) }));
          dispatch({ type: 'MP_PLAYERS', players });
          return;
        }
        default: return;
      }
    });
  }, [active, dispatch]);

  // Presence: peers leaving, host gone
  useEffect(() => {
    if (!active) return;
    return session.subscribe(() => {
      const s = ref.current;
      if (!s.mp || s.mp.offline) return;
      const players = s.mp.players.map(p => ({ ...p, online: p.peerId === session.selfId || session.peers.has(p.peerId) }));
      const changed = players.some((p, i) => p.online !== s.mp!.players[i].online);
      if (changed || session.hostGone) dispatch({ type: 'MP_PLAYERS', players, offline: s.mp.role === 'guest' && session.hostGone });
    });
  }, [active, dispatch]);

  // Host clock: every tick
  useEffect(() => {
    if (!active || state.mp?.role !== 'host' || state.screen !== 'game') return;
    session.broadcast({ k: 'clk', y: state.year, sp: state.speed, p: state.paused, tn: state.tension ?? 20 });
  }, [active, state.mp?.role, state.year, state.speed, state.paused, state.tension, state.screen]);

  // Snapshots and AI blocs: once a second
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const s = ref.current;
      if (!s.mp || s.screen !== 'game') return;
      session.broadcast({ k: 'snap', s: makeSnapshot(s, ownDefense(s)) });
      if (s.mp.role === 'host') session.broadcast({ k: 'ai', a: aiStates(s) });
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  // Outbox
  useEffect(() => {
    const out = state.mpOutbox;
    if (!active || !out?.length) return;
    for (const m of out) session.broadcast({ k: 'msg', m });
    dispatch({ type: 'MP_OUTBOX_CLEAR', n: out.length });
  }, [active, state.mpOutbox, dispatch]);

  // Leaving the game screen for good closes the room.
  useEffect(() => {
    if (state.screen === 'title' && session.room) void session.leave();
  }, [state.screen]);

  return null;
}
