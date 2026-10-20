// Keeps a multiplayer game in sync: the host's clock, everyone's national snapshot, the AI blocs and the outbox.
// Renders nothing; mounted once inside the GameProvider.
import { useEffect, useRef } from 'react';
import { useGame } from '../App';
import { YEARS_PER_TICK, gameReducer, giftCost, initialState, ownDefense } from '../game/engine';

const clampN = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
import { aiStates, makeSnapshot, type MPPlayer } from '../game/mp';
import type { GameState, ZoneId, ZoneState } from '../game/types';
import { zoneById } from '../game/zones';

/** Host zone broadcast, validated: known zone ids, influence clamped to 0..100. */
function cleanZones(z: unknown): GameState['zones'] {
  if (!z || typeof z !== 'object') return undefined;
  const out: Partial<Record<ZoneId, ZoneState>> = {};
  for (const [id, v] of Object.entries(z as Record<string, ZoneState>)) {
    if (!zoneById(id as ZoneId) || !v || typeof v.influence !== 'object') continue;
    const influence: Record<string, number> = {};
    for (const [b, n] of Object.entries(v.influence)) if (typeof n === 'number' && Number.isFinite(n)) influence[String(b).slice(0, 4)] = Math.max(0, Math.min(100, n));
    out[id as ZoneId] = { influence, holder: typeof v.holder === 'string' ? v.holder.slice(0, 4) : null };
  }
  return Object.keys(out).length === 6 ? out as Record<ZoneId, ZoneState> : undefined;
}
import { session, readMPSave, writeMPSave, type LobbyState } from './session';
import type { Deal, DealSide } from '../game/deals';

const TREATIES = ['trade', 'research', 'climate', 'safety'];
/** A peer's deal, rebuilt field by field: numbers clamped, unknown fields dropped, sender and target pinned. */
function cleanDeal(raw: unknown, from: string, to: string): Deal | null {
  const d = raw as Deal | undefined;
  if (!d || typeof d.id !== 'string' || d.from !== from || d.to !== to || !d.terms) return null;
  const side = (x: DealSide | undefined): DealSide => ({
    money: clampN(x?.money ?? 0, 0, 1e6), chips: clampN(x?.chips ?? 0, 0, 1e6), steel: clampN(x?.steel ?? 0, 0, 1e6), intel: x?.intel === true,
  });
  const treaty = TREATIES.includes(String(d.terms.treaty)) ? d.terms.treaty : undefined;
  return {
    id: d.id.slice(0, 40), from, to, year: clampN(d.year, 1900, 2100), status: 'open',
    terms: { give: side(d.terms.give), get: side(d.terms.get), treaty, napYears: clampN(d.terms.napYears ?? 0, 0, 10), penalty: clampN(d.terms.penalty ?? 0, 0, 1e6) },
  };
}

/** Builds this player's opening state from the lobby the host started. */
export function startMultiplayer(lobby: LobbyState, selfId: string): GameState | null {
  const me = lobby.players.find(p => p.peerId === selfId);
  if (!me?.faction) return null;
  let s = gameReducer({ ...initialState, gameMode: lobby.mode }, { type: 'START_GAME', continentId: me.faction, seed: lobby.seed, difficulty: lobby.difficulty });
  const players: MPPlayer[] = lobby.players.filter(p => p.faction).map(p => ({ peerId: p.peerId, name: p.name, faction: p.faction!, online: p.online }));
  s = { ...s, mp: { role: lobby.hostId === selfId ? 'host' : 'guest', me: me.faction, room: lobby.code, players }, mpOutbox: [], chat: [], paused: false, speed: 1 };
  return s;
}

/**
 * Reopens this player's local save of a running (or resumed) game with the roster taken from the lobby.
 * Returns null when there is no save, or the lobby seats me on a different bloc than the save.
 */
export function stateFromSave(lobby: LobbyState, selfId: string): GameState | null {
  const raw = readMPSave(lobby.code);
  const me = lobby.players.find(p => p.peerId === selfId);
  if (!raw || !me?.faction) return null;
  let saved: GameState;
  try { saved = JSON.parse(raw) as GameState; } catch { return null; }
  if (!saved.mp || saved.mp.me !== me.faction) return null;
  const players: MPPlayer[] = lobby.players.filter(p => p.faction).map(p => ({ peerId: p.peerId, name: String(p.name).slice(0, 18), faction: p.faction!, online: p.online || p.peerId === selfId }));
  const role = lobby.hostId === selfId ? 'host' : 'guest';
  return { ...saved, mp: { role, me: me.faction, room: lobby.code, players }, mpOutbox: [], screen: 'game', paused: role === 'host' ? true : saved.paused };
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
        case 'ai': if (s.mp.role === 'guest' && fromHost && Array.isArray(w.a)) dispatch({ type: 'MP_AI', ai: w.a, zones: cleanZones(w.zones) }); return;
        case 'msg': {
          const m = w.m;
          if (!sender || !m) return;
          if ('from' in m && m.from !== sender.faction) return;          // no impersonation
          if ((m.t === 'end' && m.human && m.who !== sender.faction) || (m.t === 'end' && !m.human && !fromHost)) return;
          if ((m.t === 'first' || m.t === 'defcon1') && !(m.t === 'first' && m.who === sender.faction) && !fromHost) return;
          if (m.t === 'diplo' && m.amount !== undefined) m.amount = clampN(m.amount, 0, 3 * giftCost(s));
          if (m.t === 'op' && !Number.isFinite(m.tn)) return;
          if (m.t === 'zone') { if (!Number.isFinite(m.delta)) return; m.delta = clampN(m.delta, -15, 15); }
          if (m.t === 'deal') { const d = cleanDeal(m.deal, m.from, m.to); if (!d) return; m.deal = d; }
          if (m.t === 'dealr' && (typeof m.id !== 'string' || typeof m.accept !== 'boolean')) return;
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
      // The host owns the roster: a returning player has a new peer id in the lobby.
      const lob = session.lobby;
      const base: MPPlayer[] = s.mp.role === 'host' && lob?.started && lob.hostId === session.selfId
        ? lob.players.filter(p => p.faction).map(p => ({ peerId: p.peerId, name: p.name, faction: p.faction!, online: p.online }))
        : s.mp.players;
      const players = base.map(p => ({ ...p, online: p.peerId === session.selfId || session.peers.has(p.peerId) }));
      const changed = players.length !== s.mp.players.length || players.some((p, i) => p.online !== s.mp!.players[i].online || p.peerId !== s.mp!.players[i].peerId);
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
      if (s.mp.role === 'host') session.broadcast({ k: 'ai', a: aiStates(s), ...(s.zones ? { zones: s.zones } : {}) });
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

  // Rolling local save, once per in-game year (reconnection and resume).
  const saveYear = Math.floor(state.year);
  useEffect(() => {
    const s = ref.current;
    if (!active || !s.mp || s.screen !== 'game') return;
    try {
      const json = JSON.stringify({ ...s, mpOutbox: [] });
      const lob = session.lobby;
      const tokens = new Map((lob?.players ?? []).map(p => [p.faction, p.token]));
      writeMPSave(json, {
        code: s.mp.room, year: saveYear, savedAt: Date.now(), role: s.mp.role, me: s.mp.me,
        players: s.mp.players.map(p => ({ name: p.name, faction: p.faction, ...(s.mp!.role === 'host' && tokens.get(p.faction) ? { token: tokens.get(p.faction) } : {}) })),
        mode: s.gameMode === 'strategist' ? 'strategist' : 'complete', difficulty: s.difficulty, seed: s.seed,
      });
    } catch { /* unserialisable or storage full: skip this year */ }
  }, [active, saveYear]);

  // Leaving the game screen for good closes the room.
  useEffect(() => {
    if (state.screen === 'title' && session.room) void session.leave();
  }, [state.screen]);

  return null;
}
