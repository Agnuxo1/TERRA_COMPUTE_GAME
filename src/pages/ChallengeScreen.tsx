import { useState } from 'react';
import { useGame } from '../App';
import { play } from '../hooks/useSound';
import { continentById } from '../game/data';
import {
  bestFor, challengeSpec, dailyId, weeklyId, verifyCode, finishChallengeGame, FREE_ID, type ChallengeSpec, type CodeCheck,
} from '../game/challenge';
import { outcomeLabel } from '../game/dossier';
import type { Difficulty, GameState } from '../game/types';
import { t } from '../i18n';

function difficultyLabel(d: Difficulty): string {
  if (d === 'easy') return t('EASY');
  if (d === 'hard') return t('HARD');
  return t('NORMAL');
}

interface CardProps {
  spec: ChallengeSpec;
  title: string;
  subtitle: string;
  accent: string;
  onStart: (spec: ChallengeSpec) => void;
}

function ChallengeCard({ spec, title, subtitle, accent, onStart }: CardProps) {
  const continent = continentById(spec.continentId);
  const best = bestFor(spec.id);
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-3 font-mono-data text-[10px]">
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl w-full"
      style={{ maxWidth: '380px', background: 'var(--surface)', border: `2px solid ${accent}66`, boxShadow: `0 0 20px ${accent}18` }}>
      <div className="font-mono-data text-[9px] tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</div>
      <h2 className="font-orbitron text-base font-bold tracking-wider" style={{ color: accent, textShadow: `0 0 10px ${accent}44` }}>
        {title}
      </h2>
      <div className="flex flex-col gap-1.5">
        {row(t('Faction'), t(continent?.name ?? spec.continentId))}
        {row(t('Difficulty'), difficultyLabel(spec.difficulty))}
        {row(t('Seed'), String(spec.seed))}
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-orbitron text-[9px] tracking-wider" style={{ color: accent }}>{t('RULES')}</span>
        <div className="flex flex-wrap gap-1.5">
          {spec.modLabels.map(label => (
            <span key={label} className="font-rajdhani text-[11px] px-2 py-0.5 rounded"
              style={{ background: accent + '18', color: accent, border: `1px solid ${accent}55` }}>
              {t(label)}
            </span>
          ))}
        </div>
      </div>
      <div className="font-rajdhani text-xs" style={{ color: 'var(--text-secondary)' }}>
        {best
          ? t('Your best: {score} points · {outcome}', { score: best.score, outcome: outcomeLabel(best.outcome) })
          : t('No attempt yet on this device.')}
      </div>
      <button onClick={() => onStart(spec)}
        className="py-2.5 rounded font-orbitron text-[11px] font-bold tracking-wider transition-all hover:brightness-125"
        style={{ background: accent + '22', color: accent, border: `1px solid ${accent}` }}>
        ▶ {t('START CHALLENGE')}
      </button>
    </div>
  );
}

export default function ChallengeScreen() {
  const { dispatch } = useGame();
  const [ids] = useState(() => ({ daily: dailyId(), weekly: weeklyId() }));
  const daily = challengeSpec(ids.daily);
  const weekly = challengeSpec(ids.weekly);
  const [code, setCode] = useState('');
  const [check, setCheck] = useState<CodeCheck | null>(null);

  // Challenges always run the COMPLETE campaign so every player plays the same timeline.
  const start = (spec: ChallengeSpec) => {
    play('coin');
    dispatch({ type: 'SET_MODE', mode: 'complete' });
    dispatch({ type: 'START_GAME', continentId: spec.continentId, seed: spec.seed, difficulty: spec.difficulty, mods: spec.mods, challenge: spec.id });
  };

  const verify = () => {
    play('click');
    setCheck(verifyCode(code));
  };

  const handleBack = () => {
    play('click');
    dispatch({ type: 'SET_SCREEN', screen: 'title' });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-4 relative overflow-y-auto"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <h1 className="font-orbitron text-2xl md:text-3xl font-bold tracking-wider"
          style={{ color: '#33FF33', textShadow: '0 0 20px rgba(51,255,51,0.3)' }}>
          {t('DAILY CHALLENGE')}
        </h1>
        <p className="font-rajdhani text-sm mt-1 max-w-md" style={{ color: 'var(--text-tertiary)' }}>
          {t('The same world, seed and rules for everyone. Share your result code and check a friend’s.')}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center md:items-stretch justify-center w-full">
        <ChallengeCard spec={daily} accent="#33FF33" onStart={start}
          title={t('TODAY')} subtitle={t('Daily · {date}', { date: ids.daily.slice(6) })} />
        <ChallengeCard spec={weekly} accent="#00F0FF" onStart={start}
          title={t('THIS WEEK')} subtitle={t('Weekly · {week}', { week: ids.weekly.slice(7) })} />
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xl p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="font-orbitron text-[10px] tracking-wider" style={{ color: '#33FF33' }}>{t('VERIFY A RESULT CODE')}</span>
        <div className="flex gap-2">
          <input value={code} onChange={e => { setCode(e.target.value); setCheck(null); }}
            placeholder={t('Paste a code such as TC1:…')}
            className="flex-1 min-w-0 px-2 py-1.5 rounded font-mono-data text-[11px]"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <button onClick={verify} disabled={!code.trim()}
            className="px-3 py-1.5 rounded font-orbitron text-[10px] font-bold tracking-wider disabled:opacity-40"
            style={{ background: 'rgba(51,255,51,0.1)', color: '#33FF33', border: '1px solid rgba(51,255,51,0.4)' }}>
            {t('VERIFY')}
          </button>
        </div>
        {check && check.ok && (
          <div className="font-rajdhani text-xs flex flex-col gap-0.5" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: '#33FF33' }}>{t('Valid code: the checksum matches.')}</span>
            <span>{check.id === FREE_ID ? t('Free game, no challenge') : t('Challenge: {id}', { id: check.id })}</span>
            <span>{t('Outcome: {outcome}', { outcome: outcomeLabel(check.outcome) })}</span>
            <span>{t('Final year {year} · score {score}', { year: check.year, score: check.score })}</span>
          </div>
        )}
        {check && !check.ok && (
          <span className="font-rajdhani text-xs" style={{ color: 'var(--rose)' }}>
            {check.reason === 'checksum'
              ? t('Checksum mismatch: the code was edited or mistyped.')
              : t('This is not a TERRA COMPUTE result code.')}
          </span>
        )}
      </div>

      <button onClick={handleBack}
        className="px-4 py-1.5 rounded font-orbitron text-[9px] font-bold tracking-wider transition-all hover:brightness-125"
        style={{ background: 'var(--surface-elevated)', color: '#33FF33', border: '1px solid rgba(51,255,51,0.3)',
          textShadow: '0 0 6px rgba(51,255,51,0.3)' }}>
        ← {t('BACK TO MENU')}
      </button>
    </div>
  );
}

/** Result panel shown on the victory and defeat screens for challenge games (renders nothing otherwise). */
export function ChallengeResultBox({ state }: { state: GameState }) {
  const [res] = useState(() => finishChallengeGame(state));
  const [copied, setCopied] = useState(false);
  if (!res) return null;

  const copy = async () => {
    play('click');
    try {
      await navigator.clipboard.writeText(res.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="panel-elevated px-5 py-3 flex flex-col items-center gap-2 w-full" style={{ maxWidth: '640px' }}>
      <div className="font-orbitron text-[10px] tracking-wider" style={{ color: 'var(--cyan)' }}>{t('CHALLENGE RESULT')}</div>
      <div className="font-mono-data text-[10px] break-all text-center" style={{ color: 'var(--text-secondary)' }}>{res.code}</div>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {res.best && <span className="font-mono-data text-[9px]" style={{ color: 'var(--green)' }}>{t('NEW BEST FOR THIS CHALLENGE')}</span>}
        <button onClick={copy}
          className="px-3 py-1 rounded font-orbitron text-[9px] tracking-wider hover:brightness-125"
          style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          {copied ? t('CODE COPIED') : t('COPY CODE')}
        </button>
      </div>
      <p className="font-rajdhani text-[11px] text-center" style={{ color: 'var(--text-tertiary)' }}>
        {t('Friends can paste this code on the Daily Challenge screen to check your result.')}
      </p>
    </div>
  );
}
