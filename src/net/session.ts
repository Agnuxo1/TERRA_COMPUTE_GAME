// Peer-to-peer war room: WebRTC data channels between browsers, no game server.
// Peers find each other through free public Nostr relays (Trystero); after that every message goes browser to browser.
// The room code doubles as the password that encrypts the connection handshake.
import type { Room } from 'trystero';
import type { Difficulty, GameState } from '../game/types';
import type { AIState, MPMsg, Snapshot } from '../game/mp';
import { getSettings } from '../lib/settings';

/** `token` lives on the host only (reconnection identity); it is stripped from every lobby sent over the wire. */
export interface LobbyPlayer { peerId: string; name: string; faction: string | null; online: boolean; token?: string }
export interface LobbyState {
  code: string;
  hostId: string;
  players: LobbyPlayer[];
  mode: 'complete' | 'strategist';
  difficulty: Difficulty;
  started: boolean;
  seed: number;
}

export type Wire =
  | { k: 'hi'; name: string; host: boolean; token?: string }
  | { k: 'lobby'; lobby: LobbyState }
  | { k: 'claim'; faction: string | null }
  | { k: 'start'; lobby: LobbyState }
  | { k: 'clk'; y: number; sp: number; p: boolean; tn: number }
  | { k: 'snap'; s: Snapshot }
  | { k: 'ai'; a: AIState[]; zones?: GameState['zones'] }
  | { k: 'msg'; m: MPMsg }
  | { k: 'preq' }
  | { k: 'lchat'; name: string; text: string }
  | { k: 'ping'; t: number }
  | { k: 'pong'; t: number };

export type SessionStatus = 'idle' | 'connecting' | 'open' | 'error';
type JsonWire = { [key: string]: import('trystero').JsonValue };
type Listener = () => void;
type WireListener = (w: Wire, from: string) => void;

const APP_ID = 'terra-compute-war-room-v1';
export const FACTION_IDS = ['na', 'eu', 'su', 'cn', 'af', 'sa', 'in', 'oc'];

// ---- Persistent player token (reconnection identity) -------------------------------------------------------------
const TOKEN_KEY = 'terra_mp_token';
const TOKEN_RE = /^[A-Za-z0-9]{16,64}$/;
let memToken = '';
export function playerToken(): string {
  try {
    const old = localStorage.getItem(TOKEN_KEY);
    if (old && TOKEN_RE.test(old)) return old;
  } catch { /* storage unavailable */ }
  if (!memToken) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    memToken = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
  }
  try { localStorage.setItem(TOKEN_KEY, memToken); } catch { /* storage unavailable */ }
  return memToken;
}
const cleanToken = (v: unknown): string | undefined => (typeof v === 'string' && TOKEN_RE.test(v) ? v : undefined);

/** The lobby as sent to other peers: no tokens. */
const pub = (l: LobbyState): LobbyState => ({ ...l, players: l.players.map(p => ({ peerId: p.peerId, name: p.name, faction: p.faction, online: p.online })) });

// ---- Local MP saves (rolling, one per room, at most 3 rooms) ---------------------------------------------------
const SAVE_PREFIX = 'terra_mp_save_';
const META_PREFIX = 'terra_mp_meta_';
const SAVE_INDEX = 'terra_mp_saves';
const MAX_SAVES = 3;
export interface MPSaveMeta {
  code: string; year: number; savedAt: number; role: 'host' | 'guest'; me: string;
  players: Array<{ name: string; faction: string; token?: string }>;
  mode: LobbyState['mode']; difficulty: Difficulty; seed: number;
}
function readIndex(): string[] {
  try {
    const a = JSON.parse(localStorage.getItem(SAVE_INDEX) || '[]') as unknown;
    return Array.isArray(a) ? a.filter((c): c is string => typeof c === 'string') : [];
  } catch { return []; }
}
export function readMPMeta(code: string): MPSaveMeta | null {
  try {
    const m = JSON.parse(localStorage.getItem(META_PREFIX + code) || 'null') as MPSaveMeta | null;
    return m && m.code === code && Array.isArray(m.players) ? m : null;
  } catch { return null; }
}
export function readMPSave(code: string): string | null {
  try { return localStorage.getItem(SAVE_PREFIX + code); } catch { return null; }
}
/** Saves that exist in this browser, newest first. */
export function listMPSaves(): MPSaveMeta[] {
  return readIndex().map(readMPMeta).filter((m): m is MPSaveMeta => !!m && !!readMPSave(m.code)).sort((a, b) => b.savedAt - a.savedAt);
}
export function writeMPSave(json: string, meta: MPSaveMeta) {
  const drop = (c: string) => { try { localStorage.removeItem(SAVE_PREFIX + c); localStorage.removeItem(META_PREFIX + c); } catch { /* ignore */ } };
  let idx = readIndex().filter(c => c !== meta.code);
  idx.push(meta.code);
  while (idx.length > MAX_SAVES) drop(idx.shift()!);
  const put = () => {
    localStorage.setItem(SAVE_PREFIX + meta.code, json);
    localStorage.setItem(META_PREFIX + meta.code, JSON.stringify(meta));
    localStorage.setItem(SAVE_INDEX, JSON.stringify(idx));
  };
  try { put(); } catch {
    // quota: sacrifice the older rooms and retry once
    for (const c of idx.filter(x => x !== meta.code)) drop(c);
    idx = [meta.code];
    try { put(); } catch { /* storage full: skip this save */ }
  }
}

class Session {
  room: Room | null = null;
  selfId = '';
  name = '';
  isHost = false;
  status: SessionStatus = 'idle';
  error = '';
  lobby: LobbyState | null = null;
  peers = new Set<string>();
  lobbyChat: Array<{ name: string; text: string }> = [];
  hostGone = false;
  /** Host: this room was reopened from a save; the faction table is frozen. */
  resumed = false;
  /** Guest: opened to rejoin a running game. */
  private rejoin = false;
  /** Rolling round-trip times per peer, in ms. */
  private rttSamples = new Map<string, number[]>();
  private pinger: ReturnType<typeof setInterval> | null = null;
  /** Peer that announced itself as the host (guests accept lobby updates only from it). */
  private hostPeer = '';
  /** Guests repeat their greeting and claim until the host's lobby reflects them (a first message can be lost while links settle). */
  private pendingClaim: string | null | undefined = undefined;
  private retry: ReturnType<typeof setInterval> | null = null;
  private send: ((w: Wire, target?: string | string[]) => void) | null = null;
  private listeners = new Set<Listener>();
  private wireListeners = new Set<WireListener>();

  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  onWire(fn: WireListener) { this.wireListeners.add(fn); return () => { this.wireListeners.delete(fn); }; }
  private changed() { for (const fn of this.listeners) fn(); }

  get me(): LobbyPlayer | undefined { return this.lobby?.players.find(p => p.peerId === this.selfId); }

  /** Average round-trip time to a peer in ms, or undefined when unknown. */
  rtt(peerId: string): number | undefined {
    const a = this.rttSamples.get(peerId);
    return a?.length ? a.reduce((x, y) => x + y, 0) / a.length : undefined;
  }

  /** Host: reopen a saved room with the same code; every saved faction is reserved for its token. */
  async resume(code: string, name: string): Promise<boolean> {
    const meta = readMPMeta(code);
    if (!meta || meta.role !== 'host') return false;
    await this.open(code, name, true);
    if (!this.lobby) return false;
    const mine = playerToken();
    const others = meta.players.filter(p => p.faction !== meta.me && FACTION_IDS.includes(p.faction));
    this.resumed = true;
    this.lobby = {
      ...this.lobby, mode: meta.mode, difficulty: meta.difficulty, seed: meta.seed,
      players: [
        { peerId: this.selfId, name, faction: meta.me, online: true, token: mine },
        ...others.map(p => ({ peerId: 'off-' + p.faction, name: String(p.name).slice(0, 18), faction: p.faction, online: false, token: cleanToken(p.token) })),
      ],
    };
    this.changed();
    return true;
  }

  async open(code: string, name: string, host: boolean, opts?: { rejoin?: boolean }) {
    await this.leave();
    this.status = 'connecting'; this.error = ''; this.isHost = host; this.name = name; this.hostGone = false; this.lobbyChat = []; this.hostPeer = '';
    this.resumed = false; this.rejoin = !!opts?.rejoin; this.rttSamples.clear();
    this.changed();
    try {
      const { joinRoom, selfId } = await import('trystero');
      this.selfId = selfId;
      const cfg = getSettings();
      const turnUrl = cfg.turnUrl.trim();
      const room = joinRoom({
        appId: APP_ID, password: code,
        // Trystero keeps its default STUN servers when a TURN entry is added through turnConfig.
        ...(turnUrl ? { turnConfig: [{ urls: turnUrl, ...(cfg.turnUser ? { username: cfg.turnUser } : {}), ...(cfg.turnCred ? { credential: cfg.turnCred } : {}) }] } : {}),
      }, code, {
        onJoinError: d => { this.status = 'error'; this.error = d.error; this.changed(); },
      });
      this.room = room;
      // Messages are plain JSON; the cast only satisfies the library's structural JSON type.
      const action = room.makeAction<JsonWire>('w');
      this.send = (w, target) => { void action.send(w as unknown as JsonWire, target ? { target } : undefined).catch(() => { /* peer gone */ }); };
      action.onMessage = (w, ctx) => this.handle(w as unknown as Wire, ctx.peerId);
      room.onPeerJoin = id => {
        this.peers.add(id);
        this.send?.({ k: 'hi', name: this.name, host: this.isHost, token: playerToken() }, id);
        if (this.isHost && this.lobby) this.send?.({ k: 'lobby', lobby: pub(this.lobby) }, id);
        this.changed();
      };
      room.onPeerLeave = id => {
        this.peers.delete(id);
        this.rttSamples.delete(id);
        if (this.lobby) {
          if (this.isHost) {
            const players = this.lobby.started
              ? this.lobby.players.map(p => p.peerId === id ? { ...p, online: false } : p)
              : this.lobby.players.filter(p => p.peerId !== id);
            this.setLobby({ ...this.lobby, players });
          } else if (id === this.lobby.hostId) {
            this.hostGone = true;
          } else {
            this.lobby = { ...this.lobby, players: this.lobby.players.map(p => p.peerId === id ? { ...p, online: false } : p) };
          }
        }
        this.changed();
      };
      if (host) {
        this.lobby = { code, hostId: selfId, players: [{ peerId: selfId, name, faction: null, online: true, token: playerToken() }], mode: 'complete', difficulty: 'normal', started: false, seed: Math.floor(Math.random() * 1e9) };
      } else {
        this.lobby = null;
      }
      this.status = 'open';
      if (!host) {
        this.retry = setInterval(() => {
          const l = this.lobby;
          if (!this.send) return;
          const mine = l?.players.find(p => p.peerId === this.selfId);
          if (l?.started && (mine || !this.rejoin)) return;
          if (!mine) this.send({ k: 'hi', name: this.name, host: false, token: playerToken() }, this.hostPeer || undefined);
          else if (this.pendingClaim !== undefined && mine.faction !== this.pendingClaim) this.send({ k: 'claim', faction: this.pendingClaim }, this.hostPeer || undefined);
        }, 2000);
      }
      this.pinger = setInterval(() => this.send?.({ k: 'ping', t: performance.now() }), 3000);
    } catch (e) {
      this.status = 'error';
      this.error = e instanceof Error ? e.message : String(e);
    }
    this.changed();
  }

  async leave() {
    const r = this.room;
    if (this.retry) { clearInterval(this.retry); this.retry = null; }
    if (this.pinger) { clearInterval(this.pinger); this.pinger = null; }
    this.rttSamples.clear(); this.resumed = false; this.rejoin = false;
    this.pendingClaim = undefined;
    this.room = null; this.send = null; this.peers.clear(); this.lobby = null; this.status = 'idle'; this.hostGone = false;
    if (r) { try { await r.leave(); } catch { /* already closed */ } }
    this.changed();
  }

  private setLobby(l: LobbyState) {
    this.lobby = l;
    this.send?.({ k: 'lobby', lobby: pub(l) });
    this.changed();
  }

  private handle(w: Wire, from: string) {
    switch (w.k) {
      case 'hi': {
        if (w.host && !this.isHost && !this.hostPeer) this.hostPeer = from;
        if (!this.isHost || !this.lobby) break;
        const token = cleanToken(w.token);
        const name = (typeof w.name === 'string' ? w.name : '').slice(0, 18) || 'Comrade';
        // A returning player: the token (never sent to other peers) maps the new connection back to the old seat.
        const seat = token ? this.lobby.players.findIndex(p => p.token === token && p.peerId !== this.selfId && p.peerId !== from) : -1;
        if (seat >= 0) {
          const players = this.lobby.players.map((p, i) => i === seat ? { ...p, peerId: from, name: this.resumed ? p.name : name, online: true } : p);
          this.setLobby({ ...this.lobby, players });
          this.send?.({ k: 'lobby', lobby: pub(this.lobby) }, from);
        } else if (!this.lobby.started && !this.lobby.players.some(p => p.peerId === from)) {
          if (this.lobby.players.length >= 8) { this.send?.({ k: 'lobby', lobby: { ...pub(this.lobby), started: true } }, from); return; }
          this.setLobby({ ...this.lobby, players: [...this.lobby.players, { peerId: from, name, faction: null, online: true, ...(token ? { token } : {}) }] });
        } else {
          this.send?.({ k: 'lobby', lobby: pub(this.lobby) }, from);   // a repeated greeting: resend the current lobby
        }
        break;
      }
      case 'lobby':
        if (!this.isHost && from === this.hostPeer && w.lobby?.hostId === from) { this.lobby = w.lobby; this.changed(); }
        break;
      case 'start':
        if (this.isHost || from !== this.hostPeer) return;   // only the host can start the game
        break;
      case 'ping':
        if (Number.isFinite(w.t)) this.send?.({ k: 'pong', t: w.t }, from);
        return;
      case 'pong': {
        if (!Number.isFinite(w.t)) return;
        const rtt = performance.now() - w.t;
        if (rtt >= 0 && rtt < 60000) this.rttSamples.set(from, [...(this.rttSamples.get(from) ?? []), rtt].slice(-5));
        return;
      }
      case 'claim':
        if (this.isHost && this.lobby && !this.lobby.started && !this.resumed) this.applyClaim(from, w.faction);
        break;
      case 'lchat':
        this.lobbyChat = [...this.lobbyChat, { name: w.name.slice(0, 18), text: w.text.slice(0, 160) }].slice(-30);
        this.changed();
        break;
      default:
        break;
    }
    for (const fn of this.wireListeners) fn(w, from);
  }

  private applyClaim(peerId: string, faction: string | null) {
    if (!this.lobby) return;
    if (faction && this.lobby.players.some(p => p.faction === faction && p.peerId !== peerId)) return;
    this.setLobby({ ...this.lobby, players: this.lobby.players.map(p => p.peerId === peerId ? { ...p, faction } : p) });
  }

  claim(faction: string | null) {
    if (this.isHost) this.applyClaim(this.selfId, faction);
    else { this.pendingClaim = faction; this.send?.({ k: 'claim', faction }); }
  }

  setOptions(o: Partial<Pick<LobbyState, 'mode' | 'difficulty'>>) {
    if (this.isHost && this.lobby && !this.lobby.started) this.setLobby({ ...this.lobby, ...o });
  }

  chat(text: string) {
    const t = text.trim().slice(0, 160);
    if (!t) return;
    this.lobbyChat = [...this.lobbyChat, { name: this.name, text: t }].slice(-30);
    this.send?.({ k: 'lchat', name: this.name, text: t });
    this.changed();
  }

  /** Host: lock the lobby and start everyone's game. */
  start(): LobbyState | null {
    if (!this.isHost || !this.lobby) return null;
    const lobby = { ...this.lobby, started: true, players: this.lobby.players.filter(p => p.faction) };
    this.lobby = lobby;
    this.send?.({ k: 'start', lobby: pub(lobby) });
    this.changed();
    return lobby;
  }

  broadcast(w: Wire, target?: string) { this.send?.(w, target); }
}

export const session = new Session();
