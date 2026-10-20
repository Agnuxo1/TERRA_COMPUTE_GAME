// LISP Pipeline: list-transform puzzles, evaluation and BFS solver (no React/DOM).
import { mulberry32 } from './rng.ts';
import { t } from '../../../i18n/index.ts';

export type Difficulty = 1 | 2 | 3;
export type Atom = number; // 0..7 -> A..H
export type List = readonly Atom[];

export const LEVELS = 3;
export const MAX_WRONG_EVALS = 6;
export const MAX_LEN = 10;

export const atomLabel = (a: Atom): string => String.fromCharCode(65 + a);
export const listText = (l: List): string => `(${l.map(atomLabel).join(' ')})`;

export interface OpDef {
  id: string;
  label: string;
  desc: string;
}

interface FixedOp {
  id: string;
  label: string;
  /** Translated when read (not at import), so the active language is used. */
  desc: () => string;
}

/** Fixed operations; CONS tiles are added per level as `cons:<atom>`. */
export const FIXED_OPS: readonly FixedOp[] = [
  { id: 'car', label: 'CAR', desc: () => t('Keep only the first element') },
  { id: 'cdr', label: 'CDR', desc: () => t('Drop the first element') },
  { id: 'reverse', label: 'REVERSE', desc: () => t('Flip the list around') },
  { id: 'sort', label: 'SORT', desc: () => t('Order A to H') },
  { id: 'double', label: 'DOUBLE', desc: () => t('Write the list twice') },
  { id: 'last', label: 'LAST', desc: () => t('Keep only the last element') },
  { id: 'take2', label: 'TAKE-2', desc: () => t('Keep the first two elements') },
  { id: 'droplast', label: 'DROP-LAST', desc: () => t('Remove the last element') },
];

export function opDef(id: string): OpDef {
  if (id.startsWith('cons:')) {
    const a = Number(id.slice(5));
    return { id, label: `CONS ${atomLabel(a)}`, desc: t('Put {atom} at the front', { atom: atomLabel(a) }) };
  }
  const d = FIXED_OPS.find(o => o.id === id);
  if (!d) throw new Error(`unknown op ${id}`);
  return { id: d.id, label: d.label, desc: d.desc() };
}

export function applyOp(id: string, l: List): Atom[] {
  if (id.startsWith('cons:')) return [Number(id.slice(5)), ...l];
  switch (id) {
    case 'car': return l.slice(0, 1);
    case 'cdr': return l.slice(1);
    case 'reverse': return l.slice().reverse();
    case 'sort': return l.slice().sort((a, b) => a - b);
    case 'double': return [...l, ...l];
    case 'last': return l.slice(-1);
    case 'take2': return l.slice(0, 2);
    case 'droplast': return l.slice(0, -1);
    default: throw new Error(`unknown op ${id}`);
  }
}

/** Runs a pipeline left to right; null entries are empty slots (pass-through). Returns each stage. */
export function evalStages(input: List, slots: readonly (string | null)[]): Atom[][] {
  const out: Atom[][] = [];
  let cur: Atom[] = input.slice();
  for (const s of slots) {
    if (s) cur = applyOp(s, cur);
    out.push(cur);
  }
  return out;
}

export const sameList = (a: List, b: List): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

export interface Level {
  input: Atom[];
  target: Atom[];
  ops: string[]; // palette
  slots: number; // L + 1
  par: number; // minimum pipeline length
  solution: string[]; // one optimal pipeline
}

/** BFS for the shortest pipeline (<= maxDepth) turning input into target. */
export function solveMin(input: List, target: List, ops: readonly string[], maxDepth: number): string[] | null {
  const key = (l: List) => l.join(',');
  if (sameList(input, target)) return [];
  const seen = new Map<string, string[]>([[key(input), []]]);
  let frontier: { l: Atom[]; path: string[] }[] = [{ l: input.slice(), path: [] }];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: { l: Atom[]; path: string[] }[] = [];
    for (const f of frontier) {
      for (const op of ops) {
        const r = applyOp(op, f.l);
        if (r.length > MAX_LEN * 2) continue;
        const k = key(r);
        if (seen.has(k)) continue;
        const path = [...f.path, op];
        if (sameList(r, target)) return path;
        seen.set(k, path);
        next.push({ l: r, path });
      }
    }
    frontier = next;
  }
  return null;
}

export function generateLevel(d: Difficulty, seed: number): Level {
  const L = d + 1;
  const rng = mulberry32(seed * 104729 + d * 31);
  const ri = (n: number) => Math.floor(rng() * n);
  for (let attempt = 0; attempt < 5000; attempt++) {
    const inLen = 4 + ri(2);
    const input: Atom[] = Array.from({ length: inLen }, () => ri(8));
    // hidden pipeline with up to 2 distinct CONS atoms
    const consAtoms: Atom[] = [];
    const pipeline: string[] = [];
    for (let i = 0; i < L; i++) {
      const pickCons = rng() < 0.3;
      if (pickCons) {
        let a = ri(8);
        if (consAtoms.length >= 2 && !consAtoms.includes(a)) a = consAtoms[ri(consAtoms.length)];
        if (!consAtoms.includes(a)) consAtoms.push(a);
        pipeline.push(`cons:${a}`);
      } else {
        pipeline.push(FIXED_OPS[ri(FIXED_OPS.length)].id);
      }
    }
    // evaluate; intermediates must stay non-empty and short
    let cur: Atom[] = input;
    let ok = true;
    for (const op of pipeline) {
      cur = applyOp(op, cur);
      if (cur.length === 0 || cur.length > MAX_LEN) { ok = false; break; }
    }
    if (!ok || sameList(cur, input)) continue;
    // palette: two CONS atoms (hidden ones first, then decoys)
    while (consAtoms.length < 2) {
      const a = ri(8);
      if (!consAtoms.includes(a)) consAtoms.push(a);
    }
    const ops = [...FIXED_OPS.map(o => o.id), ...consAtoms.map(a => `cons:${a}`)];
    const best = solveMin(input, cur, ops, L);
    if (!best) continue; // cannot happen (pipeline itself is a solution) but stay safe
    if (best.length < Math.max(2, L - 1)) continue; // trivially reducible
    return { input, target: cur, ops, slots: L + 1, par: best.length, solution: best };
  }
  throw new Error('could not generate level');
}

/** Points for one level: 0 (lost) or 1..3. */
export function levelPoints(used: number, par: number, wrongEvals: number): 1 | 2 | 3 {
  return (1 + (used <= par ? 1 : 0) + (wrongEvals <= 1 ? 1 : 0)) as 1 | 2 | 3;
}

export function finalStars(points: readonly number[]): 0 | 1 | 2 | 3 {
  const sum = points.reduce((a, b) => a + b, 0);
  return sum >= 8 ? 3 : sum >= 6 ? 2 : sum >= 1 ? 1 : 0;
}
