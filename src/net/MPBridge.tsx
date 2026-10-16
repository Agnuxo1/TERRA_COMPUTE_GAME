// Keeps a multiplayer game in sync: the host's clock, everyone's national snapshot, the AI blocs and the outbox.
// Renders nothing; mounted once inside the GameProvider.
import { useEffect, useRef } from 'react';
import { useGame } from '../App';
import { YEARS_PER_TICK, gameReducer, initialState, ownDefense } from '../game/engine';
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
      switch (w.k) {
        case 'clk': {
          if (s.mp.role !== 'guest' || s.screen !== 'game') return;
          if (s.speed !== w.sp || s.paused !== w.p) dispatch({ type: 'MP_CLOCK', speed: w.sp, paused: w.p });
          if (Math.abs((s.tension ?? 0) - w.tn) > 0.5) dispatch({ type: 'MP_CLOCK_TENSION', tension: w.tn });
          const step = YEARS_PER_TICK * Math.max(1, w.sp);
          const n = Math.min(12, Math.round((w.y - s.year) / step));
          for (let i = 0; i < n; i++) dispatch({ type: 'TICK' });
          return;
        }
        case 'snap': dispatch({ type: 'MP_SNAPSHOT', snap: w.s }); return;
        case 'ai': if (s.mp.role === 'guest') dispatch({ type: 'MP_AI', ai: w.a }); return;
        case 'msg': dispatch({ type: 'MP_RECV', msg: w.m }); return;
        case 'preq': if (s.mp.role === 'host' && s.screen === 'game') dispatch({ type: 'TOGGLE_PAUSE' }); return;
        case 'lobby': {
          // Presence changes during the game (someone dropped).
          const players = w.lobby.players.filter(p => p.faction).map(p => ({ peerId: p.peerId, name: p.name, faction: p.faction!, online: p.online && (p.peerId === session.selfId || session.peers.has(p.peerId)) }));
          dispatch({ type: 'MP_PLAYERS', players });
          return;
        }
        default: void from;
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
