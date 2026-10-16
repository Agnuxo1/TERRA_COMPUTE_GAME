import { lazy, type ComponentType } from 'react';
import type { MinigameMeta, MinigameProps } from './types';
import { alphago, attention, deepblue, lisp, moore, perceptron, samuel, turing } from './meta';

export interface MinigameEntry {
  meta: MinigameMeta;
  Component: ComponentType<MinigameProps>;
}

/** Chronological list of every breakthrough exercise. Each game's code is fetched the first time it opens. */
export const MINIGAMES: MinigameEntry[] = [
  { meta: turing, Component: lazy(() => import('./TuringGame')) },
  { meta: perceptron, Component: lazy(() => import('./PerceptronGame')) },
  { meta: lisp, Component: lazy(() => import('./LispGame')) },
  { meta: samuel, Component: lazy(() => import('./SamuelGame')) },
  { meta: moore, Component: lazy(() => import('./MooreGame')) },
  { meta: deepblue, Component: lazy(() => import('./DeepBlueGame')) },
  { meta: alphago, Component: lazy(() => import('./AlphaGoGame')) },
  { meta: attention, Component: lazy(() => import('./AttentionGame')) },
];

export function minigameById(id: string): MinigameEntry | undefined {
  return MINIGAMES.find(m => m.meta.id === id);
}
