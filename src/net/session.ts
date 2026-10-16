// Peer-to-peer war room: WebRTC data channels between browsers, no game server.
// Peers find each other through free public Nostr relays (Trystero); after that every message goes browser to browser.
// The room code doubles as the password that encrypts the connection handshake.
import type { Room } from 'trystero';
import type { Difficulty } from '../game/types';
import type { AIState, MPMsg, Snapshot } from '../game/mp';

export interface LobbyPlayer { peerId: string; name: string; faction: string | null; online: boolean }
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
  | { k: 'hi'; name: string; host: boolean }
  | { k: 'lobby'; lobby: LobbyState }
  | { k: 'claim'; faction: string | null }
  | { k: 'start'; lobby: LobbyState }
  | { k: 'clk'; y: number; sp: number; p: boolean; tn: number }
  | { k: 'snap'; s: Snapshot }
  | { k: 'ai'; a: AIState[] }
  | { k: 'msg'; m: MPMsg }
  | { k: 'preq' }
  | { k: 'lchat'; name: string; text: string };

export type SessionStatus = 'idle' | 'connecting' | 'open' | 'error';
type JsonWire = { [key: string]: import('trystero').JsonValue };
type Listener = () => void;
type WireListener = (w: Wire, from: string) => void;

const APP_ID = 'terra-compute-war-room-v1';
export const FACTION_IDS = ['na', 'eu', 'su', 'cn', 'af', 'sa', 'in', 'oc'];

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
  private send: ((w: Wire, target?: string | string[]) => void) | null = null;
  private listeners = new Set<Listener>();
  private wireListeners = new Set<WireListener>();

  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  onWire(fn: WireListener) { this.wireListeners.add(fn); return () => { this.wireListeners.delete(fn); }; }
  private changed() { for (const fn of this.listeners) fn(); }

  get me(): LobbyPlayer | undefined { return this.lobby?.players.find(p => p.peerId === this.selfId); }

  async open(code: string, name: string, host: boolean) {
    await this.leave();
    this.status = 'connecting'; this.error = ''; this.isHost = host; this.name = name; this.hostGone = false; this.lobbyChat = [];
    this.changed();
    try {
      const { joinRoom, selfId } = await import('trystero');
      this.selfId = selfId;
      const room = joinRoom({ appId: APP_ID, password: code }, code, {
        onJoinError: d => { this.status = 'error'; this.error = d.error; this.changed(); },
      });
      this.room = room;
      // Messages are plain JSON; the cast only satisfies the library's structural JSON type.
      const action = room.makeAction<JsonWire>('w');
      this.send = (w, target) => { void action.send(w as unknown as JsonWire, target ? { target } : undefined).catch(() => { /* peer gone */ }); };
      action.onMessage = (w, ctx) => this.handle(w as unknown as Wire, ctx.peerId);
      room.onPeerJoin = id => {
        this.peers.add(id);
        this.send?.({ k: 'hi', name: this.name, host: this.isHost }, id);
        if (this.isHost && this.lobby) this.send?.({ k: 'lobby', lobby: this.lobby }, id);
        this.changed();
      };
      room.onPeerLeave = id => {
        this.peers.delete(id);
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
        this.lobby = { code, hostId: selfId, players: [{ peerId: selfId, name, faction: null, online: true }], mode: 'complete', difficulty: 'normal', started: false, seed: Math.floor(Math.random() * 1e9) };
      } else {
        this.lobby = null;
      }
      this.status = 'open';
    } catch (e) {
      this.status = 'error';
      this.error = e instanceof Error ? e.message : String(e);
    }
    this.changed();
  }

  async leave() {
    const r = this.room;
    this.room = null; this.send = null; this.peers.clear(); this.lobby = null; this.status = 'idle'; this.hostGone = false;
    if (r) { try { await r.leave(); } catch { /* already closed */ } }
    this.changed();
  }

  private setLobby(l: LobbyState) {
    this.lobby = l;
    this.send?.({ k: 'lobby', lobby: l });
    this.changed();
  }

  private handle(w: Wire, from: string) {
    switch (w.k) {
      case 'hi':
        if (this.isHost && this.lobby && !this.lobby.started && !this.lobby.players.some(p => p.peerId === from)) {
          if (this.lobby.players.length >= 8) { this.send?.({ k: 'lobby', lobby: { ...this.lobby, started: true } }, from); return; }
          this.setLobby({ ...this.lobby, players: [...this.lobby.players, { peerId: from, name: w.name.slice(0, 18) || 'Comrade', faction: null, online: true }] });
        } else if (this.isHost && this.lobby?.started) {
          this.send?.({ k: 'lobby', lobby: this.lobby }, from);
        }
        break;
      case 'lobby':
        if (!this.isHost) { this.lobby = w.lobby; this.changed(); }
        break;
      case 'claim':
        if (this.isHost && this.lobby && !this.lobby.started) this.applyClaim(from, w.faction);
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
    else this.send?.({ k: 'claim', faction });
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
    this.send?.({ k: 'start', lobby });
    this.changed();
    return lobby;
  }

  broadcast(w: Wire, target?: string) { this.send?.(w, target); }
}

export const session = new Session();
