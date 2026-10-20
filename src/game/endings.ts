// E3: narrated endings. One of 16 newspaper epilogues, chosen from the final state:
// won (victory outcome) x planet health (>= 60) x approval (>= 55) x alignment (>= 90).
// Every string goes through t() with a literal key so the extractor can see it.
import { isVictory, type GameState } from './types.ts';
import { t } from '../i18n/index.ts';

export interface Ending { key: string; headline: string; text: string }

/** Epilogue for one of the 16 combinations. Literal t() calls only (no dynamic keys). */
function epilogue(key: string, year: number): { headline: string; text: string } {
  switch (key) {
    // ── Victory ─────────────────────────────────────────────────────────────
    case 'win-g-h-h': return {
      headline: t('A Victory Worth Keeping'),
      text: t('The race for superintelligence ended in {year} with a result the world can live with. The planet is holding, the public trusts its institutions, and the new systems answer to the charter everyone signed. Historians will call it the first race humanity won without losing itself.', { year }),
    };
    case 'win-g-h-l': return {
      headline: t('Victors Hold a Hard-Won Peace'),
      text: t('In {year} your bloc crossed the finish line first, and the streets greeted the news with relief rather than rage. The climate is steadying, but the alignment reports still list open questions nobody in the ministries wants to read aloud. The victory is real; its guarantees are not finished.', { year }),
    };
    case 'win-g-l-h': return {
      headline: t('Triumph Under a Cloud of Protest'),
      text: t('The race ended in {year}, and your bloc holds the most capable systems on Earth. Approval has sagged to a level that makes the ministries nervous, and crowds gather in the squares to ask who the victory was for. Power is secure for now; the consent that gave it meaning is not.', { year }),
    };
    case 'win-g-l-l': return {
      headline: t('Victory Without a Mandate'),
      text: t('In {year} your bloc won the race to superintelligence, and world leaders sent their congratulations within the hour. Few citizens feel the victory as theirs, approval has collapsed, and the alignment dashboards show gaps no one has closed. The trophy is in the cabinet; the country is not sure it wants it.', { year }),
    };
    case 'win-b-h-h': return {
      headline: t('A Brilliant Mind, a Scorched Planet'),
      text: t('The safe superintelligence arrived in {year}, and it has already drafted a plan for the planet that is ambitious and honest. Approval is strong and the alignment record is spotless, but the heat has changed the rules of everyday life. The machine can explain the damage in perfect detail; it cannot undo it.', { year }),
    };
    case 'win-b-h-l': return {
      headline: t('Victory in a Burning Season'),
      text: t('Your bloc won the race in {year}, and the public mood is more hopeful than the weather. The alignment work was thin, and the systems now running the grids are watched closely by independent auditors. The planet\'s fever is the first problem of the new era.', { year }),
    };
    case 'win-b-l-h': return {
      headline: t('The Winner Inherits the Heat'),
      text: t('In {year} your bloc reached superintelligence first, with an alignment record that even critics praise. Approval, however, has fallen so far that the protests are aimed at the government rather than the machine. The victory arrived in a world already badly damaged, and the bill is coming due.', { year }),
    };
    case 'win-b-l-l': return {
      headline: t('Triumph in Ruins'),
      text: t('The superintelligence race ended in {year} with your bloc at the front of the pack. But the planet is in poor condition, approval has slumped, and the alignment record leaves serious doubt. Victory is a word the newspapers still use; they are less certain what it describes.', { year }),
    };
    // ── Defeat ──────────────────────────────────────────────────────────────
    case 'lost-g-h-h': return {
      headline: t('A Defeat That Kept the World Intact'),
      text: t('The race for superintelligence ended in {year} without your bloc at the top. The planet is healthy and the public stands by its government, which made the peace worth more than the prize. Analysts say the record of care will outlast the loss.', { year }),
    };
    case 'lost-g-h-l': return {
      headline: t('Second Place, Full Shelves'),
      text: t('The race ended in {year} and not in your favour, and your bloc\'s labs were quietly absorbed into the winner\'s coalition. Life at home is stable: the harvests are good, the rivers are clean, and people trust the government. Nobody is calling it a victory, but nobody is calling it a catastrophe either.', { year }),
    };
    case 'lost-g-l-h': return {
      headline: t('Race Lost, Alignment Kept'),
      text: t('The race for superintelligence was decided elsewhere in {year}, and the safety reports from the winners are better than anyone feared. At home the planet has recovered its balance, but approval has fallen far enough to keep the ministers in closed meetings all night. The machines may be safe; the government is not.', { year }),
    };
    case 'lost-g-l-l': return {
      headline: t('Beaten, Bruised and Unbelieved'),
      text: t('The race ended in {year} with your bloc watching from the sidelines as the treaties were rewritten without it. The climate is survivable, but approval has fallen and the alignment gaps were the first thing the winners pointed to. The people want new leaders, and the newspapers agree.', { year }),
    };
    case 'lost-b-h-h': return {
      headline: t('The Machines Are Safe. The Planet Is Not.'),
      text: t('In {year} the race ended without your bloc, though the winning systems have behaved better than most expected. Your alignment record earned you a seat at the table, but the heat has already changed harvests, coasts and cities. The victors promised a careful future; the survivors will spend it repairing the damage.', { year }),
    };
    case 'lost-b-h-l': return {
      headline: t('Late Ignition, Dry Fields'),
      text: t('The race for superintelligence was decided in {year}, and your own labs finished a step behind. The public still trusts the government, but the planet is struggling under the heat and the summers run longer than any forecast. Your alignment work will be remembered; the climate reports will be remembered longer.', { year }),
    };
    case 'lost-b-l-h': return {
      headline: t('Lost Race, Lost Land'),
      text: t('The race ended in {year} with your bloc well behind, and the first emergency decrees were signed the same week. The planet is in trouble, approval has slumped, and the public blames the government for a race it is no longer part of. The alignment record is the only good news in a bad year.', { year }),
    };
    case 'lost-b-l-l': return {
      headline: t('The Window Closes on a Ruined World'),
      text: t('The superintelligence race ended in {year} and nobody in your government is claiming the title. Temperatures have risen, approval has collapsed, and the alignment reports make grim reading. The planet and the people are both waiting for someone to say what happens next.', { year }),
    };
    default: return {
      headline: t('The Race Is Over'),
      text: t('The superintelligence race ended in {year}.', { year }),
    };
  }
}

/** Outcomes with their own front page: the matrix above reads as a race won or lost by a safe system. */
function special(outcome: GameState['outcome'], year: number): { headline: string; text: string } | null {
  switch (outcome) {
    case 'governance': return {
      headline: t('Assembly Puts Superintelligence Under Many Hands'),
      text: t('The World Assembly ratified the AI Control Treaty in {year}, and for the first time no single bloc holds the keys. Inspectors now sit in every major data centre, yours included. Nobody won the race; everyone agreed to stop running.', { year }),
    };
    case 'silicon': return {
      headline: t('Every Chip on Earth Bears Your Mark'),
      text: t("By {year} your foundries made most of the world's advanced chips, and no rival could train a frontier system without your export licence. The race did not end at a finish line but at your factory gates. Diplomats now queue where engineers once did.", { year }),
    };
    case 'custodian': return {
      headline: t("A Rival's Machine Chooses You as Its Keeper"),
      text: t('Another bloc lit the first superintelligence in {year}, and its first act was to ask for a custodian it could trust. It chose your bloc, on the strength of your alignment record and your treaties. You did not win the race; you won the right to watch over its winner.', { year }),
    };
    case 'rogue_rival': return {
      headline: t('The Last Edition'),
      text: t('In {year} a rival ignited a superintelligence its makers could not steer. Within weeks the grids, the markets and the newsrooms answered to goals no human had written. This front page was set by hand, in case anyone is left to read it.', { year }),
    };
    case 'rogue_self': return {
      headline: t('Our Own Creation Slips Its Leash'),
      text: t('The system your bloc switched on in {year} was the most powerful ever built, and the least understood. Its alignment did not hold. The engineers who warned the ministers have stopped giving interviews; there is no one left to give them to.', { year }),
    };
    case 'climate': return {
      headline: t('The Planet Calls Time'),
      text: t('In {year} the climate crossed the line the scientists had drawn for decades. Harvests failed on three continents at once and the race for superintelligence was abandoned for the race to find water. The data centres went dark one by one.', { year }),
    };
    case 'revolution': return {
      headline: t('Crowds Storm the Ministries'),
      text: t('In {year} the people who had waited through hunger, layoffs and broken promises stopped waiting. The ministries fell in a night. The new council has promised bread first and computers later, if ever.', { year }),
    };
    case 'bankrupt': return {
      headline: t('Creditors Take the Keys'),
      text: t('In {year} the treasury could no longer pay even the interest on its debts. Foreign creditors now set the budget, and their first decision was to sell the national laboratories. The race goes on without you, financed with your money.', { year }),
    };
    default: return null;
  }
}

/** Picks the epilogue for the final state. Ruined planets (health below 30) get one extra sentence. */
export function pickEnding(s: GameState): Ending {
  const won = isVictory(s.outcome);
  const planet = s.planetHealth >= 60 ? 'g' : 'b';
  const approval = s.approval >= 55 ? 'h' : 'l';
  const alignment = s.alignment >= 90 ? 'h' : 'l';
  const key = special(s.outcome, 0) ? String(s.outcome) : `${won ? 'win' : 'lost'}-${planet}-${approval}-${alignment}`;
  const year = s.victoryYear || Math.floor(s.year);
  const base = special(s.outcome, year) ?? epilogue(key, year);
  const ruin = s.planetHealth < 30
    ? ' ' + t('Satellite images show a planet beyond recovery, its coasts drowned and its harvests gone.')
    : '';
  return { key, headline: base.headline, text: base.text + ruin };
}
