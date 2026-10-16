import type { ComponentType } from 'react';
import { lazyRetry } from '../ChunkBoundary';
import type { MinigameMeta, MinigameProps } from './types';
import { alphago, attention, deepblue, lisp, moore, perceptron, samuel, turing } from './meta';

export interface MinigameEntry {
  meta: MinigameMeta;
  Component: ComponentType<MinigameProps>;
}

/** Chronological list of every breakthrough exercise. Each game's code is fetched the first time it opens. */
export const MINIGAMES: MinigameEntry[] = [
  { meta: turing, Component: lazyRetry(() => import('./TuringGame')) },
  { meta: perceptron, Component: lazyRetry(() => import('./PerceptronGame')) },
  { meta: lisp, Component: lazyRetry(() => import('./LispGame')) },
  { meta: samuel, Component: lazyRetry(() => import('./SamuelGame')) },
  { meta: moore, Component: lazyRetry(() => import('./MooreGame')) },
  { meta: deepblue, Component: lazyRetry(() => import('./DeepBlueGame')) },
  { meta: alphago, Component: lazyRetry(() => import('./AlphaGoGame')) },
  { meta: attention, Component: lazyRetry(() => import('./AttentionGame')) },
];

export function minigameById(id: string): MinigameEntry | undefined {
  return MINIGAMES.find(m => m.meta.id === id);
}

/** Warms the browser cache with every exercise so a flaky connection cannot interrupt one later. */
export function preloadMinigames() {
  void Promise.allSettled([import('./TuringGame'), import('./PerceptronGame'), import('./LispGame'), import('./SamuelGame'), import('./MooreGame'), import('./DeepBlueGame'), import('./AlphaGoGame'), import('./AttentionGame')]);
}
