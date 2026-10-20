import { useState } from 'react';
import { useGame } from '../../../App';
import { continentById } from '../../../game/data';
import { TREATY_INFO } from '../../../game/engine';
import { aiEvaluate, describeTerms, MAX_NAP_YEARS, playerBloc, validateDeal, type Deal, type DealSide, type DealTerms } from '../../../game/deals';
import { fmtMoney } from '../../../game/format';
import { isHuman } from '../../../game/mp';
import type { GameState, TreatyId } from '../../../game/types';
import { play } from '../../../hooks/useSound';
import { t } from '../../../i18n';
import { ActionButton, PanelHeader, Section } from './common';

const TREATY_OPTIONS: TreatyId[] = ['trade', 'research', 'climate', 'safety'];
const DEAL_COLOR = '#7B61FF';

/** Number input that never goes below zero; the caps are shown next to it and checked by validateDeal. */
function AmountInput({ value, onChange, placeholder, step = 1, max, title }: { value: number | undefined; onChange: (v: number) => void; placeholder?: string; step?: number; max?: number; title?: string }) {
  return (
    <input
      type="number"
      min={0}
      step={step}
      max={max}
      value={value || ''}
      placeholder={placeholder ?? '0'}
      title={title}
      onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
      className="w-full font-mono-data text-[11px] px-1.5 py-1 rounded bg-transparent"
      style={{ color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
    />
  );
}

function SideFields({ side, onChange, stock }: {
  side: DealSide;
  onChange: (next: DealSide) => void;
  stock: { money: string; chips: string; steel: string };
}) {
  const label = 'font-mono-data text-[9px] tracking-wider';
  const hint = 'font-mono-data text-[8.5px]';
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <div className={label} style={{ color: 'var(--text-secondary)' }}>{t('MONEY $B')}</div>
        <AmountInput value={side.money} onChange={money => onChange({ ...side, money })} step={0.5} />
        <div className={hint} style={{ color: 'var(--text-tertiary)' }}>{stock.money}</div>
      </div>
      <div>
        <div className={label} style={{ color: 'var(--text-secondary)' }}>{t('CHIPS M')}</div>
        <AmountInput value={side.chips} onChange={chips => onChange({ ...side, chips })} step={0.5} />
        <div className={hint} style={{ color: 'var(--text-tertiary)' }}>{stock.chips}</div>
      </div>
      <div>
        <div className={label} style={{ color: 'var(--text-secondary)' }}>{t('STEEL KT')}</div>
        <AmountInput value={side.steel} onChange={steel => onChange({ ...side, steel })} step={1} />
        <div className={hint} style={{ color: 'var(--text-tertiary)' }}>{stock.steel}</div>
      </div>
      <label className="flex items-center gap-1.5 font-mono-data text-[10px] cursor-pointer" style={{ color: 'var(--text-primary)' }}>
        <input type="checkbox" checked={!!side.intel} onChange={e => onChange({ ...side, intel: e.target.checked })} />
        {t('Intel')}
      </label>
    </div>
  );
}

export default function DealPanel({ rivalId }: { rivalId: string }) {
  const { state, dispatch } = useGame();
  const send = dispatch;

  const [give, setGive] = useState<DealSide>({});
  const [get, setGet] = useState<DealSide>({});
  const [treaty, setTreaty] = useState<TreatyId | ''>('');
  const [nap, setNap] = useState(0);
  const [penalty, setPenalty] = useState(0);

  const me = playerBloc(state);
  const rival = state.rivals.find(r => r.id === rivalId);
  const c = continentById(rivalId);
  const deals: Deal[] = (state as GameState & { deals?: Deal[] }).deals ?? [];

  if (!rival) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader title={t('PROPOSE A DEAL')} accent={DEAL_COLOR} onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
        <div className="p-3 font-mono-data text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{t('Unknown bloc.')}</div>
      </div>
    );
  }

  const terms: DealTerms = {
    give,
    get,
    treaty: treaty || undefined,
    napYears: nap > 0 ? nap : undefined,
    penalty: nap > 0 && penalty > 0 ? penalty : undefined,
  };
  const draft: Deal = { id: 'draft', from: me, to: rivalId, terms, year: state.year, status: 'open' };
  const check = validateDeal(state, draft, 'both');
  const ai = !isHuman(state, rivalId) && !!rival.nation;
  const preview = ai && check.ok ? aiEvaluate(state, rival, terms) : null;
  const lines = describeTerms(terms);

  const myCash = state.budget;
  const myCap = Math.max(0, 3 * (state.eco?.income ?? 0));
  const theirCash = rival.nation?.budget ?? 0;
  const theirCap = 3 * rival.gdp * 0.05;

  const related = deals.filter(d => d.status === 'open' && (d.from === rivalId || d.to === rivalId));
  const relColor = rival.relation >= 30 ? '#00E5A0' : rival.relation >= 0 ? '#FFB84D' : '#FF477E';
  const title = t('DEAL WITH {name}', { name: c ? t(c.name) : rivalId });

  const propose = () => {
    play('click');
    send({ type: 'PROPOSE_DEAL', to: rivalId, terms });
    setGive({});
    setGet({});
    setTreaty('');
    setNap(0);
    setPenalty(0);
  };

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title={title}
        accent={DEAL_COLOR}
        onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        right={
          <button onClick={() => { play('click'); dispatch({ type: 'OPEN_OVERLAY', overlay: 'diplomacy' }); }}
            className="font-mono-data text-[9px] px-1.5 rounded hover:brightness-150" style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-light)' }}>
            {t('← DIPLOMACY')}
          </button>
        }
      />
      <div className="px-3 py-2 font-mono-data text-[10px] shrink-0" style={{ color: relColor, borderBottom: '1px solid var(--border)' }}>
        {t('Relation {value}', { value: Math.round(rival.relation) })}
        {ai && <span style={{ color: 'var(--text-tertiary)' }}> · {t('AI bloc: cash {cash}', { cash: fmtMoney(theirCash) })}</span>}
      </div>

      <div className="flex-1 overflow-auto">
        <Section title={t('YOU GIVE / YOU GET')} accent={DEAL_COLOR}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="font-mono-data text-[9px] tracking-[0.2em] mb-1.5" style={{ color: 'var(--rose)' }}>{t('YOU GIVE')}</div>
              <SideFields side={give} onChange={setGive} stock={{
                money: t('stock {amount} · cap {cap}', { amount: fmtMoney(myCash), cap: fmtMoney(myCap) }),
                chips: t('stock {amount}M', { amount: Math.floor(state.chips) }),
                steel: t('stock {amount} kt', { amount: Math.floor(state.steel) }),
              }} />
            </div>
            <div>
              <div className="font-mono-data text-[9px] tracking-[0.2em] mb-1.5" style={{ color: 'var(--green)' }}>{t('YOU GET')}</div>
              <SideFields side={get} onChange={setGet} stock={{
                money: ai ? t('their cash {amount} · cap {cap}', { amount: fmtMoney(theirCash), cap: fmtMoney(theirCap) }) : t('their cash not shown'),
                chips: t('their stock not tracked'),
                steel: t('their stock not tracked'),
              }} />
            </div>
          </div>
        </Section>

        <Section title={t('TREATY AND PACT')} accent={DEAL_COLOR}>
          <div className="flex flex-col gap-1.5">
            <select value={treaty} onChange={e => setTreaty(e.target.value as TreatyId | '')}
              className="w-full font-mono-data text-[10px] px-1.5 py-1 rounded"
              style={{ background: '#0a0a12', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}>
              <option value="">{t('No treaty')}</option>
              {TREATY_OPTIONS.map(tid => <option key={tid} value={tid}>{t(TREATY_INFO[tid].name)}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="font-mono-data text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                {t('NON-AGGRESSION YEARS 0–{max}', { max: MAX_NAP_YEARS })}
                <AmountInput value={nap} onChange={v => setNap(Math.min(MAX_NAP_YEARS, Math.round(v)))} max={MAX_NAP_YEARS} />
              </label>
              {nap > 0 && (
                <label className="font-mono-data text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                  {t('PENALTY $B IF BROKEN')}
                  <AmountInput value={penalty} onChange={setPenalty} step={1} />
                </label>
              )}
            </div>
          </div>
        </Section>

        <Section title={t('SUMMARY')} accent={DEAL_COLOR}>
          {lines.length === 0
            ? <div className="font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('Nothing on the table yet.')}</div>
            : <ul className="font-mono-data text-[10px] leading-[1.6] list-disc pl-4" style={{ color: 'var(--text-primary)' }}>{lines.map(l => <li key={l}>{l}</li>)}</ul>}
          <div className="mt-2 font-mono-data text-[10px]" style={{ color: check.ok ? 'var(--text-secondary)' : 'var(--rose)' }}>
            {!check.ok
              ? check.reason
              : preview
                ? (preview.accept
                  ? <span style={{ color: 'var(--green)' }}>{t('Likely to accept.')}</span>
                  : <span style={{ color: 'var(--rose)' }}>{t('Likely to refuse: {reason}', { reason: preview.reason })}</span>)
                : t('Ready to send.')}
          </div>
          <div className="mt-2">
            <ActionButton color={DEAL_COLOR} disabled={!check.ok} onClick={propose} title={check.ok ? undefined : check.reason}>
              {t('SEND DEAL')}
            </ActionButton>
          </div>
        </Section>

        <Section title={t('OPEN DEALS')} accent="var(--text-tertiary)">
          {related.length === 0 && <div className="font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('No open deals with this bloc.')}</div>}
          <div className="flex flex-col gap-2">
            {related.map(d => {
              const incoming = d.to === me;
              return (
                <div key={d.id} className="rounded p-2" style={{ border: `1px solid ${DEAL_COLOR}55`, background: 'rgba(255,255,255,0.02)' }}>
                  <div className="font-mono-data text-[9px] mb-1" style={{ color: incoming ? 'var(--amber)' : 'var(--text-tertiary)' }}>
                    {incoming ? t('INCOMING') : t('AWAITING ANSWER')} · {t('year {year}', { year: Math.floor(d.year) })}
                  </div>
                  <ul className="font-mono-data text-[10px] leading-[1.5] list-disc pl-4 mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {describeTerms(d.terms).map(l => <li key={l}>{l}</li>)}
                  </ul>
                  {incoming && (
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={() => { play('click'); send({ type: 'ANSWER_DEAL', id: d.id, accept: true }); }}
                        className="font-mono-data text-[9px] py-1 rounded hover:brightness-125" style={{ color: '#050508', background: 'var(--green)' }}>
                        {t('ACCEPT')}
                      </button>
                      <button onClick={() => { play('click'); send({ type: 'ANSWER_DEAL', id: d.id, accept: false }); }}
                        className="font-mono-data text-[9px] py-1 rounded hover:brightness-125" style={{ color: 'var(--rose)', border: '1px solid var(--rose)' }}>
                        {t('DECLINE')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}
