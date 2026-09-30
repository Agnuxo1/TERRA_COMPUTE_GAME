// "Attention Is All You Need": pronoun-resolution items + fake attention weights. No React/DOM.
import { mulberry32, shuffle } from './rng.ts';
import type { Rng } from './rng.ts';

export interface AttentionItem {
  id: number;
  /** Display tokens (punctuation stays attached to its word). */
  tokens: string[];
  query: number;
  answer: number;
  /** Plausible wrong referents (they receive some attention mass). */
  distractors: number[];
  explain: string;
}

// Markup: *word = query token, ^word = correct referent, ~word = distractor referent.
const RAW: [string, string][] = [
  ["The ^trophy didn't fit in the ~suitcase because *it was too big.", "Something too big fails to fit: the trophy is the big one."],
  ["The ~trophy didn't fit in the ^suitcase because *it was too small.", "Something too small fails to hold the trophy: the suitcase."],
  ["The ^councilmen refused the ~demonstrators a permit because *they feared violence.", "The ones who fear violence are the officials refusing the permit."],
  ["The ~councilmen refused the ^demonstrators a permit because *they advocated violence.", "The ones advocating violence are the demonstrators."],
  ["The ^ball crashed through the ~table because *it was made of steel.", "A steel object breaks through: the heavy ball."],
  ["The ~ball crashed through the ^table because *it was made of cardboard.", "A cardboard object gives way: the table."],
  ["Paul tried to call ^George on the phone, but *he wasn't available.", "Being unavailable explains a failed call: it is George, the one called."],
  ["^Paul tried to call ~George on the phone, but *he wasn't successful.", "The caller is the one who fails to succeed: Paul."],
  ["The ^man couldn't lift his ~son because *he was so weak.", "Weakness stops the lifter: the man."],
  ["The ~man couldn't lift his ^son because *he was so heavy.", "Heaviness belongs to the one being lifted: the son."],
  ["I poured water from the ^bottle into the ~cup until *it was empty.", "What gets emptied is the source: the bottle."],
  ["I poured water from the ~bottle into the ^cup until *it was full.", "What gets filled is the destination: the cup."],
  ["The ^delivery truck zoomed by the ~school bus because *it was going so fast.", "Only the faster vehicle can zoom past the other: the truck."],
  ["The ~delivery truck zoomed by the ^school bus because *it was going so slowly.", "The slow vehicle gets overtaken: the bus."],
  ["The ~sculpture rolled off the ^shelf because *it wasn't level.", "Levelness is a property of the shelf, not the sculpture."],
  ["The ^sculpture rolled off the ~shelf because *it wasn't anchored.", "An object that rolls off was not anchored: the sculpture."],
  ["The ~teacher scolded the ^student because *he had not done the homework.", "Homework is the student's job, and 'he' points to the student."],
  ["The ^teacher scolded the ~student because *she was tired of excuses.", "The one tired of excuses is the scolding teacher ('she')."],
  ["The ~cat chased the ^mouse, so *it ran into a hole.", "Running into a hole is what the chased mouse does."],
  ["The ^cat chased the ~mouse because *it was hungry.", "Hunger motivates the hunter: the cat."],
  ["The ~piano wouldn't fit through the ^door because *it was too narrow.", "Narrowness blocks the passage: the door."],
  ["The ^piano wouldn't fit through the ~door because *it was too wide.", "Width makes the piano stick in the doorway."],
  ["Kate handed the keys to ^Liam because *he was driving.", "The person who needs the keys is the driver: Liam."],
  ["^Kate handed the keys to ~Liam because *she was tired.", "The one handing over the keys is the tired one: Kate."],
  ["Tom fixed the ^radio, *which had been silent for years.", "'Which' attaches to the thing that was silent: the radio."],
  ["The farmer sold the ^cows, *which were too old to give milk.", "'Which' points back to the cows, the things too old to give milk."],
  ["I grew up in ^Lisbon, and my parents still live *there.", "'There' is a place word; it refers back to Lisbon."],
  ["The hikers reached the ^summit and planted a flag *there.", "'There' refers to the location just reached: the summit."],
  ["~Sam thanked ^Ali because *his help saved the project.", "The possessive 'his' refers to the helper, Ali."],
  ["The ^robot shut down when *its battery overheated.", "'Its' marks possession by the robot."],
  ["The ~committee rejected the ^proposal because *it lacked funding.", "A proposal can lack funding; a committee rejecting it cannot."],
  ["The ^engineers showed the ~managers the prototype because *they had built it.", "The builders of the prototype are the engineers."],
  ["The ~engineers showed the ^managers the prototype because *they had to approve it.", "The approvers are the managers."],
  ["Mia dropped the ^vase on the ~tile floor and *it shattered.", "Fragile things shatter: the vase."],
  ["The ~children thanked the ^firefighters because *they had saved the house.", "The rescuers are the firefighters."],
  ["Nora gave her ^brother a puzzle because *he loved solving them.", "'He' can only be the brother, the puzzle lover."],
  ["The ^wolf stalked the ~deer until *it was close enough to spring.", "The one who springs is the stalking wolf."],
  ["The ~bee landed on the ^flower because *it was full of nectar.", "Nectar is inside the flower."],
];

function parse(raw: string, id: number): AttentionItem {
  const tokens: string[] = [];
  let query = -1, answer = -1;
  const distractors: number[] = [];
  raw.split(' ').forEach((word, i) => {
    const mark = word[0];
    const w = mark === '*' || mark === '^' || mark === '~' ? word.slice(1) : word;
    if (mark === '*') query = i;
    if (mark === '^') answer = i;
    if (mark === '~') distractors.push(i);
    tokens.push(w);
  });
  return { id, tokens, query, answer, distractors, explain: '' };
}

export const ITEMS: AttentionItem[] = RAW.map(([raw, explain], i) => ({ ...parse(raw, i), explain }));

/** Draw `count` distinct items (no repeats inside one game). */
export function drawItems(seed: number, count = 8): AttentionItem[] {
  const rng = mulberry32(seed);
  return shuffle(rng, ITEMS).slice(0, count);
}

/**
 * Fake-but-plausible attention row from the query token to every token.
 * The correct referent always gets the largest share; distractors get a visible secondary share.
 */
export function attentionWeights(item: AttentionItem, rng: Rng): number[] {
  const n = item.tokens.length;
  const w = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) w[i] = 0.02 + rng() * 0.05;
  for (const d of item.distractors) w[d] = 0.22 + rng() * 0.18;
  w[item.query] = 0.03 + rng() * 0.04;
  w[item.answer] = 1.0 + rng() * 0.6;
  for (let i = 0; i < n; i++) {
    if (i === item.answer || item.distractors.includes(i) || i === item.query) continue;
    if (item.tokens[i].length > 4) w[i] += 0.05;
  }
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / sum);
}

/** Streak multiplier: x1, then x2 from a streak of 3, x3 from 5. */
export function streakMultiplier(streak: number): 1 | 2 | 3 {
  return streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
}

export function secondsPerItem(difficulty: 1 | 2 | 3): number {
  return difficulty === 1 ? 20 : difficulty === 2 ? 14 : 9;
}

export function scoreAttention(correct: number): 0 | 1 | 2 | 3 {
  return correct >= 7 ? 3 : correct >= 5 ? 2 : correct >= 3 ? 1 : 0;
}
