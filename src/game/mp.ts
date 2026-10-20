// Multiplayer (peer-to-peer) data model. Pure: no networking here — src/net/ moves these messages between browsers.
//
// Federated model: every human simulates their own nation (map, economy, research) exactly as in single player.
// The host owns the clock and simulates the AI blocs; everyone shares the race, the planet, diplomacy and covert
// operations through small messages. A human who disconnects becomes an AI bloc run by the host.
import type { GameState, Rival, TreatyId, ZoneId } from './types';

export type CovertKind = 'intel' | 'steal' | 'sabotage' | 'propaganda' | 'blackout';

export interface MPPlayer { peerId: string; name: string; faction: string; online: boolean }
export interface MPInfo {
  role: 'host' | 'guest';
  /** My faction id. */
  me: string;
  room: string;
  players: MPPlayer[];
  /** The host left: the game continues offline against AI blocs. */
  offline?: boolean;
}

/** Summary every human broadcasts about their own nation (~1 per second). */
export interface Snapshot { f: string; cap: number; al: number; em: number; gdp: number; pop: number; app: number; def: number }

/** World-level fields of an AI bloc, broadcast by the host. Relations and treaties stay personal to each player. */
export type AIState = Pick<Rival, 'id' | 'gdp' | 'population' | 'capability' | 'lag' | 'alignment' | 'emissions' | 'cleanShare' | 'stability' | 'asiLaunched' | 'project'>;

/** Messages produced by the reducer (outbox) or received from the network (MP_RECV). */
export type MPMsg =
  | { t: 'op'; from: string; to: string; op: CovertKind; ok: boolean; tn: number }
  | { t: 'diplo'; from: string; to: string; kind: 'gift' | 'propose' | 'accept' | 'decline' | 'cancel'; treaty?: TreatyId; amount?: number }
  | { t: 'aiop'; from: string; to: string; lag?: number; align?: number; stability?: number; clean?: number }
  | { t: 'end'; who: string; human: boolean; safe: boolean; year: number }
  | { t: 'chat'; from: string; text: string }
  | { t: 'first'; key: string; who: string; year: number }
  | { t: 'defcon1'; year: number; culprit?: string }
  /** Phase D1: a guest's influence (delta > 0) or successful coup (delta < 0 on target) in a zone, applied by the host. */
  | { t: 'zone'; from: string; zone: ZoneId; delta: number; target?: string }
  /** G4: a deal offered to another human, and that human's answer. */
  | { t: 'deal'; from: string; to: string; deal: import('./deals').Deal }
  | { t: 'dealr'; from: string; to: string; id: string; accept: boolean };

export const isHuman = (s: GameState, id: string) =>
  !!s.mp && !s.mp.offline && id !== s.mp.me && s.mp.players.some(p => p.faction === id && p.online);

/** True when this rival's world values (capability, alignment, emissions…) come from the network, not from local simulation. */
export const isRemote = (s: GameState, id: string) =>
  !!s.mp && !s.mp.offline && (isHuman(s, id) || s.mp.role === 'guest');

export const playerName = (s: GameState, faction: string) => s.mp?.players.find(p => p.faction === faction)?.name;

export function outbox(s: GameState, m: MPMsg) {
  if (s.mp && !s.mp.offline) s.mpOutbox = [...(s.mpOutbox ?? []), m];
}

export function makeSnapshot(s: GameState, defense: number): Snapshot {
  return {
    f: s.mp?.me ?? '', cap: +s.capability.toFixed(3), al: Math.round(s.alignment), em: Math.round(s.eco.emissions),
    gdp: Math.round(s.eco.gdp), pop: Math.round(s.population), app: Math.round(s.approval), def: +defense.toFixed(2),
  };
}

export function aiStates(s: GameState): AIState[] {
  return s.rivals.filter(r => !isHuman(s, r.id)).map(r => ({
    id: r.id, gdp: Math.round(r.gdp), population: Math.round(r.population), capability: +r.capability.toFixed(3), lag: +r.lag.toFixed(3),
    alignment: +r.alignment.toFixed(1), emissions: Math.round(r.emissions), cleanShare: +r.cleanShare.toFixed(3), stability: Math.round(r.stability),
    asiLaunched: r.asiLaunched, ...(r.project !== undefined ? { project: r.project } : {}),
  }));
}

/** Lag that puts a bloc's historical compute curve at `cap` in `year` (used when a disconnected human becomes AI). */
export function lagFor(cap: number, year: number, hist: (y: number) => number): number {
  let lo = 1900, hi = 2100;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (hist(mid) >= cap) hi = mid; else lo = mid; }
  return year - hi;
}

export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newRoomCode(): string {
  let c = '';
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  for (const v of buf) c += ROOM_ALPHABET[v % ROOM_ALPHABET.length];
  return c;
}
