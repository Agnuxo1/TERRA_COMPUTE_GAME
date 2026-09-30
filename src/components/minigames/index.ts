import type { ComponentType } from 'react';
import type { MinigameMeta, MinigameProps } from './types';
import TuringGame, { meta as turing } from './TuringGame';
import PerceptronGame, { meta as perceptron } from './PerceptronGame';
import LispGame, { meta as lisp } from './LispGame';
import SamuelGame, { meta as samuel } from './SamuelGame';
import MooreGame, { meta as moore } from './MooreGame';
import DeepBlueGame, { meta as deepblue } from './DeepBlueGame';
import AlphaGoGame, { meta as alphago } from './AlphaGoGame';
import AttentionGame, { meta as attention } from './AttentionGame';

export interface MinigameEntry {
  meta: MinigameMeta;
  Component: ComponentType<MinigameProps>;
}

/** Chronological list of every breakthrough exercise. */
export const MINIGAMES: MinigameEntry[] = [
  { meta: turing, Component: TuringGame },
  { meta: perceptron, Component: PerceptronGame },
  { meta: lisp, Component: LispGame },
  { meta: samuel, Component: SamuelGame },
  { meta: moore, Component: MooreGame },
  { meta: deepblue, Component: DeepBlueGame },
  { meta: alphago, Component: AlphaGoGame },
  { meta: attention, Component: AttentionGame },
];

export function minigameById(id: string): MinigameEntry | undefined {
  return MINIGAMES.find(m => m.meta.id === id);
}
