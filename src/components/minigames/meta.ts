// Static descriptions of the breakthrough exercises (the games themselves load on demand).
import type { MinigameMeta } from './types';

export const turing: MinigameMeta = {
  id: 'turing',
  eventId: 'turing',
  year: 1950,
  title: 'BOMBE CODEBREAKER',
  subtitle: 'Turing machine room - find the day\'s rotor setting',
  accent: '#FFB84D',
  background: './assets/puzzles/turing-bombe-background.png',
  rewardLabel: 'Research + Education',
  howTo: [
    'The enemy machine is set to a secret of 4 rotor letters. Find it.',
    'Set the 4 rotors (click, arrow keys or type letters) and press TEST.',
    'Green lamp = right letter on the right rotor. Amber lamp = right letter on the wrong rotor.',
    'Use the lamps to deduce the secret. Cross out letters you rule out on the note pad. Fewer tests = more stars.',
  ],
};

export const perceptron: MinigameMeta = {
  id: 'perceptron',
  eventId: 'perceptron',
  year: 1957,
  title: 'PERCEPTRON TRAINER',
  subtitle: 'Rosenblatt weight board - teach the machine to tell the two signals apart',
  accent: '#33FF33',
  background: './assets/puzzles/perceptron-weight-board.png',
  rewardLabel: 'Compute efficiency',
  howTo: [
    'Red and cyan signals are scattered on the plot. Draw a line that puts all red on one side and all cyan on the other.',
    'The line is w1·x + w2·y + b = 0. The weights w1, w2 tilt it, the bias b slides it. Red must be on the red-shaded side.',
    'Points that are on the wrong side blink. Fix them all to clear the round. 3 rounds per exercise.',
    'TRAIN STEP runs one real Rosenblatt update on the first wrong point (costs 1 energy). Thinking first beats trial and error: fewer adjustments = more stars.',
  ],
};

export const lisp: MinigameMeta = {
  id: 'lisp',
  eventId: 'lisp',
  year: 1958,
  title: 'LISP PIPELINE',
  subtitle: 'Dartmouth lab - compose list functions to reach the target',
  accent: '#00F0FF',
  background: './assets/puzzles/lisp-dartmouth-lab.png',
  rewardLabel: 'Research points',
  howTo: [
    'Turn the INPUT list into the TARGET list by filling the pipeline slots with function cards.',
    'Cards run left to right. Under each slot you see the list after that step, so you can watch it change.',
    'Click a card to drop it in the next empty slot (or drag it onto a slot). Click a filled slot to remove its card. Empty slots do nothing.',
    'In this lab CAR and LAST return a one-element list, not a bare atom. Press EVAL when the last step matches the target. Fewer cards and fewer wrong EVALs = more stars.',
  ],
};

export const samuel: MinigameMeta = {
  id: 'samuel',
  eventId: 'ml',
  year: 1959,
  title: "SAMUEL'S CHECKERS",
  subtitle: 'Find the winning combination',
  accent: '#FF477E',
  background: './assets/puzzles/samuel/samuel-1959-lab.png',
  howTo: [
    'You are Red and move up the board. Each puzzle shows a target, for example "Capture 3".',
    'Click one of your glowing pieces, then click the glowing dots to jump over enemy pieces one after another.',
    'You must keep jumping while a capture is available. Kings (crowned) may jump backwards too.',
    'Reach the target count in one turn. A wrong or short chain costs a try: you have 2 tries per puzzle.',
  ],
  rewardLabel: 'Education + Research',
};

export const moore: MinigameMeta = {
  id: 'moore',
  eventId: 'moore',
  year: 1965,
  title: 'INTEGRATED CIRCUIT ROUTER',
  subtitle: 'Moore\'s law fab - route power to every chip on the die',
  accent: '#00E5A0',
  background: './assets/puzzles/moore-logic-machine.png',
  rewardLabel: 'Compute + Materials',
  howTo: [
    'Every tile is a piece of circuit trace. Rotate tiles until power reaches every tile and no trace is left dangling.',
    'Click a tile to rotate it clockwise. Right-click or Shift-click rotates it back.',
    'Power flows out of the POWER tile (amber core). Traces that are live glow green; chips light up when powered.',
    'The board is always solvable. Start from the dead ends at the edges. LOCK mode pins tiles you are sure about. Fewer rotations = more stars.',
  ],
};

export const deepblue: MinigameMeta = {
  id: 'deepblue',
  eventId: 'deepblue',
  year: 1997,
  title: 'DEEP BLUE',
  subtitle: 'Mate the champion',
  accent: '#00F0FF',
  background: './assets/puzzles/deepblue/deep_blue.png',
  howTo: [
    'You play White (cream pieces, moving up). In every puzzle you must deliver checkmate.',
    'Click one of your pieces, then click a highlighted square to move it.',
    '"Mate in 1" means one move ends the game. In "mate in 2" you move, Black answers with its best defence, then you mate.',
    'A wrong move costs a mistake and the position resets. Three mistakes on one puzzle reveals the solution.',
  ],
  rewardLabel: 'Compute + Research',
};

export const alphago: MinigameMeta = {
  id: 'alphago',
  eventId: 'alphago',
  year: 2016,
  title: 'ATARI GO VS. PROTO-ALPHAGO',
  subtitle: 'First capture wins',
  accent: '#FFD166',
  background: './assets/puzzles/alphago/bg_alphago.png',
  howTo: [
    'You are Black and move first. Click an intersection to place a stone.',
    'A group of stones needs empty neighbouring points, its liberties. A group with no liberties is captured.',
    'The first player to capture any stone wins. A group with one liberty is in ATARI and glows: attack the white ones, save the black ones.',
    'You have 2 lives. If the board fills with no capture, the side with more total liberties wins (ties go to you).',
  ],
  rewardLabel: 'AI capability',
};

export const attention: MinigameMeta = {
  id: 'attention',
  eventId: 'transformers',
  year: 2017,
  title: 'ATTENTION IS ALL YOU NEED',
  subtitle: 'Point the query at the right word',
  accent: '#B388FF',
  background: './assets/AGI_Nexus_Final/game_dashboard.png',
  howTo: [
    'Each round shows a sentence split into tokens. One token is the QUERY, usually a pronoun such as "it" or "they".',
    'Click the token the query refers to, using common sense: who or what does the sentence mean?',
    'After you answer, the attention arcs show how strongly the query "looks at" every token.',
    'Answer before the timer runs out. Chains of correct answers build a score multiplier. 8 sentences per game.',
  ],
  rewardLabel: 'Algorithmic efficiency',
};
