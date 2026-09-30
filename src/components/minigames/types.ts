// Shared contract for every historical minigame.
// A minigame never blocks the campaign: the player can always abandon it (0 stars).

export type Stars = 0 | 1 | 2 | 3;

export type MinigameDifficulty = 1 | 2 | 3;

export interface MinigameResult {
  stars: Stars;
  /** Short line shown on the result card, e.g. "Cracked in 4 attempts". */
  summary: string;
}

export interface MinigameProps {
  /** 1 = gentle, 2 = standard, 3 = expert. Campaign picks it from the game mode. */
  difficulty: MinigameDifficulty;
  /** Called exactly once when the player finishes (win, lose or abandon). */
  onComplete: (result: MinigameResult) => void;
}

export interface MinigameMeta {
  id: string;
  /** Campaign event id that launches this minigame. */
  eventId: string;
  year: number;
  title: string;
  subtitle: string;
  accent: string;
  background: string;
  /** One-sentence rules shown before play. */
  howTo: string[];
  /** What the campaign reward is themed as. */
  rewardLabel: string;
}
