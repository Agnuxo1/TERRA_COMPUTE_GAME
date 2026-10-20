import { useState, type ReactNode } from 'react';
import { useGame } from '../../../App';
import { techById } from '../../../game/data';
import { marketPrice, marketSpread, pol, policyAvailability } from '../../../game/engine';
import { fmtMoney, fmtSigned } from '../../../game/format';
import { basePrice, GOOD_INFO, type Good } from '../../../game/market';
import { POLICIES, POLICY_COOLDOWN, POLICY_GDP_COST, policyById, policySlots, type PolicyDef } from '../../../game/policies';
import type { GameState } from '../../../game/types';
import { play } from '../../../hooks/useSound';
import { t } from '../../../i18n';
import { KV, PanelHeader, Section } from './common';

const GOLD = '#FFD166';
const CREAM = '#FFF4C2';
/** Stock kept back when selling "all surplus". */
const RESERVE = 50;
const SLOT_YEARS = [1971, 1990, 2012];

type Tab = 'decrees' | 'market';

const fmtPrice = (p: number) => `$${p.toFixed(p < 10 ? 2 : 1)}B`;
const fmtQty = (v: number) => (Math.abs(v) >= 10000 ? `${(v / 1000).toFixed(0)}k` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(Math.abs(v) < 10 && v !== 0 ? 1 : 0));

export default function EconomyPanel() {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState<Tab>('decrees');
  const slots = policySlots(state.year);
  const shortage = state.eco.chipFactor < 0.999;

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title={t('STATE ECONOMY')} accent={GOLD} onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        right={<span className="font-mono-data text-[10px]" style={{ color: state.budget < 0 ? 'var(--rose)' : 'var(--green)' }}>{fmtMoney(state.budget)}</span>} />
      <div className="grid grid-cols-2 gap-1 p-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }} role="tablist">
        {([
          ['decrees', t('☭ DECREES {used}/{slots}', { used: state.policies.length, slots })],
          ['market', t('⚖ WORLD MARKET')],
        ] as Array<[Tab, string]>).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { play('click'); setTab(id); }}
            className="relative font-mono-data text-[9.5px] tracking-wider py-1.5 rounded transition-all hover:brightness-125"
            style={{ color: tab === id ? '#050508' : GOLD, background: tab === id ? GOLD : 'transparent', border: `1px solid ${GOLD}66` }}>
            {label}
            {id === 'market' && shortage && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse-glow" style={{ background: 'var(--rose)', boxShadow: '0 0 6px var(--rose)' }} title={t('Chip shortage')} />
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {tab === 'decrees' ? <Decrees /> : <Market />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  DECREES
// ═══════════════════════════════════════════════════════════════════════════

function Decrees() {
  const { state, dispatch } = useGame();
  const slots = policySlots(state.year);
  const nextSlotYear = SLOT_YEARS.find(y => y > state.year);
  const cooldown = state.policyCooldown;
  const active = state.policies.map(id => policyById[id]).filter(Boolean);
  const inactive = POLICIES.filter(p => !state.policies.includes(p.id));
  const gdpCost = (id: string) => (POLICY_GDP_COST[id] ?? 0) * state.eco.gdp;

  const sign = (p: PolicyDef, on: boolean) => {
    play(on ? 'coin' : 'click');
    dispatch({ type: 'SET_POLICY', policyId: p.id, on });
  };

  return (
    <>
      <div className="px-3 py-2 font-rajdhani text-[12px] leading-snug" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
        {t('Slots grow with each era. Changing decrees reshuffles the government for {years} years.', { years: POLICY_COOLDOWN })}
      </div>

      {/* Slots + cooldown */}
      <Section title={t('POLITBURO')} accent={GOLD}
        right={<span className="font-mono-data text-[9.5px]" style={{ color: CREAM }}>{t('{used}/{slots} SLOTS', { used: state.policies.length, slots })}</span>}>
        <div className="flex gap-1 mb-1.5" aria-label={t('{used} of {slots} decree slots used', { used: state.policies.length, slots })}>
          {Array.from({ length: 4 }, (_, i) => {
            const open = i < slots;
            const used = i < state.policies.length;
            const p = used ? policyById[state.policies[i]] : null;
            return (
              <div key={i} className="flex-1 h-7 rounded-sm grid place-items-center font-rajdhani text-[14px]"
                title={p ? t(p.name) : open ? t('Free slot') : t('Unlocks in {year}', { year: SLOT_YEARS[i - 1] ?? '' })}
                style={{
                  background: used ? `${GOLD}26` : open ? 'rgba(255,255,255,0.03)' : 'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 4px, transparent 4px 8px)',
                  border: `1px ${open ? 'solid' : 'dashed'} ${used ? GOLD : open ? 'var(--border-light)' : 'var(--border)'}`,
                  color: used ? GOLD : 'var(--text-tertiary)',
                  boxShadow: used ? `inset 0 0 10px ${GOLD}33` : 'none',
                }}>
                {p ? p.icon : open ? '+' : '🔒'}
              </div>
            );
          })}
        </div>
        {cooldown > 0 ? (
          <div>
            <div className="flex justify-between font-mono-data text-[9.5px] mb-0.5" style={{ color: 'var(--amber)' }}>
              <span>{t('GOVERNMENT RESHUFFLE')}</span><span>{t('{years} yrs', { years: cooldown.toFixed(1) })}</span>
            </div>
            <div className="h-1.5 rounded-sm overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full" style={{ width: `${Math.min(100, (cooldown / POLICY_COOLDOWN) * 100)}%`, background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)', transition: 'width 300ms ease' }} />
            </div>
          </div>
        ) : (
          <KV k={t('Government')} v={t('ready to sign')} tone="good" />
        )}
        {nextSlotYear && <KV k={t('Next slot')} v={`${nextSlotYear}`} tone="dim" />}
        {state.eco.policyCost > 0 && <KV k={t('Decree spending')} v={t('−{cost}/yr', { cost: fmtMoney(state.eco.policyCost) })} tone="bad" />}
      </Section>

      {/* Active decrees */}
      <Section title={t('IN FORCE')} accent="var(--green)">
        {active.length === 0 ? (
          <div className="font-rajdhani text-[12px] italic" style={{ color: 'var(--text-tertiary)' }}>{t('No decree signed. Pick one below.')}</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {active.map(p => {
              const av = policyAvailability(state, p.id, false);
              return (
                <PolicyCard key={p.id} p={p} active cost={gdpCost(p.id)}
                  action={
                    <DecreeButton color="var(--rose)" disabled={!av.ok} title={av.reason ?? t('Repeal this decree')} onClick={() => sign(p, false)}>
                      {t('REPEAL')}
                    </DecreeButton>
                  }
                  note={!av.ok && av.reason ? <span style={{ color: 'var(--amber)' }}>⏳ {av.reason}</span> : undefined} />
              );
            })}
          </div>
        )}
      </Section>

      {/* Catalogue */}
      <Section title={t('ALL DECREES')} accent={GOLD}>
        <div className="flex flex-col gap-1.5">
          {inactive.map(p => {
            const av = policyAvailability(state, p.id, true);
            const clash = (p.excludes ?? []).find(x => state.policies.includes(x));
            const locked = !!p.requiresTech && !state.unlockedTechs.includes(p.requiresTech);
            const note = clash ? <span style={{ color: 'var(--rose)' }}>⊘ {t('Excluded by {name}', { name: t(policyById[clash].name) })}</span>
              : locked ? <span style={{ color: 'var(--amber)' }}>🔒 {t('Requires {tech}', { tech: t(techById[p.requiresTech!]?.name ?? '') })}</span>
              : !av.ok && av.reason ? <span style={{ color: 'var(--text-tertiary)' }}>{av.reason}</span>
              : undefined;
            return (
              <PolicyCard key={p.id} p={p} cost={gdpCost(p.id)} excluded={!!clash} locked={locked} note={note}
                action={
                  <DecreeButton color={GOLD} disabled={!av.ok} title={av.reason ?? t('Sign {name}', { name: t(p.name) })} onClick={() => sign(p, true)}>
                    {t('ADOPT')}
                  </DecreeButton>
                } />
            );
          })}
        </div>
      </Section>
    </>
  );
}

function PolicyCard({ p, active, excluded, locked, cost, note, action }: {
  p: PolicyDef; active?: boolean; excluded?: boolean; locked?: boolean; cost: number; note?: ReactNode; action: ReactNode;
}) {
  const accent = active ? 'var(--green)' : excluded ? 'var(--rose)' : locked ? 'var(--text-tertiary)' : GOLD;
  return (
    <div className="relative rounded overflow-hidden"
      style={{
        border: `1px ${excluded ? 'dashed' : 'solid'} ${active ? 'color-mix(in srgb, var(--green), transparent 40%)' : excluded ? 'color-mix(in srgb, var(--rose), transparent 45%)' : 'var(--border-light)'}`,
        borderLeft: `3px solid ${accent}`,
        background: excluded
          ? 'repeating-linear-gradient(135deg, rgba(255,71,126,0.07) 0 6px, rgba(255,71,126,0.015) 6px 12px)'
          : active ? 'linear-gradient(90deg, rgba(0,229,160,0.08), rgba(0,0,0,0.2))' : 'rgba(255,255,255,0.025)',
        opacity: excluded || locked ? 0.72 : 1,
      }}>
      <div className="flex gap-2 p-2">
        <div className="shrink-0 w-8 h-8 rounded grid place-items-center text-[16px]"
          style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${accent}`, color: active || !excluded ? GOLD : 'var(--rose)', filter: locked ? 'grayscale(1)' : 'none' }}>
          {p.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1">
            <span className="font-rajdhani text-[14px] font-bold leading-tight truncate" style={{ color: CREAM, textDecoration: excluded ? 'line-through' : 'none', textDecorationColor: 'var(--rose)' }}>{t(p.name)}</span>
            {cost > 0 && <span className="font-mono-data text-[9px] whitespace-nowrap" style={{ color: 'var(--amber)' }} title={t('{pct}% of GDP per year', { pct: ((POLICY_GDP_COST[p.id] ?? 0) * 100).toFixed(1) })}>{t('≈{cost}/yr', { cost: fmtMoney(cost) })}</span>}
          </div>
          <div className="font-rajdhani text-[11.5px] italic leading-tight" style={{ color: 'var(--text-tertiary)' }}>“{t(p.motto)}”</div>
          <div className="font-mono-data text-[9.5px] leading-snug mt-1" style={{ color: 'var(--green)' }}>▲ {t(p.pro)}</div>
          <div className="font-mono-data text-[9.5px] leading-snug" style={{ color: 'var(--rose)' }}>▼ {t(p.con)}</div>
          {p.excludes?.length ? (
            <div className="font-mono-data text-[8.5px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              ⇄ {t('excludes {names}', { names: p.excludes.map(x => t(policyById[x]?.name ?? '')).join(', ') })}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-2 py-1" style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--border)' }}>
        <span className="font-mono-data text-[9px] leading-tight min-w-0">{note ?? (active ? <span style={{ color: 'var(--green)' }}>● {t('IN FORCE')}</span> : <span style={{ color: 'var(--text-tertiary)' }}>{t('available')}</span>)}</span>
        {action}
      </div>
    </div>
  );
}

function DecreeButton({ children, color, disabled, title, onClick }: { children: ReactNode; color: string; disabled?: boolean; title?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`shrink-0 font-orbitron text-[8.5px] font-bold tracking-widest px-2.5 py-1 rounded transition-all ${disabled ? 'opacity-35 cursor-not-allowed' : 'hover:brightness-125 active:scale-95'}`}
      style={{ color: disabled ? 'var(--text-tertiary)' : color, border: `1px solid ${disabled ? 'var(--border-light)' : color}`, background: disabled ? 'transparent' : `color-mix(in srgb, ${color}, transparent 86%)` }}>
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MARKET
// ═══════════════════════════════════════════════════════════════════════════

function Market() {
  const { state } = useGame();
  const e = state.eco;
  const autarky = pol(state, 'autarky');
  const chipGap = Math.max(0, e.chipUse - e.chipProd);
  return (
    <>
      <div className="px-3 py-2 font-rajdhani text-[12px] leading-snug" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
        {t('Buildings cost steel and chips. Whatever you lack is imported at the buy price when you build. Spread {spread}%{openTrade}.', {
          spread: Math.round(marketSpread(state) * 100),
          openTrade: pol(state, 'open_trade') ? t(' (Open Trade)') : '',
        })}
      </div>

      {autarky && (
        <Alert color="var(--amber)" title={t('⛓ AUTARKY IN FORCE')}>
          {t('Buying abroad is banned, and missing goods are not imported. You can still sell surplus. Repeal Autarky in Decrees to trade freely.')}
        </Alert>
      )}
      {e.imports > 0 && (
        <Alert color="var(--amber)" title={t('AUTO-IMPORTS −{cost}/yr', { cost: fmtMoney(e.imports) })}>
          {t('Your chip stock is empty: the {qty} M chips/yr your hardware burns beyond production are bought automatically at {price} each.', { qty: fmtQty(chipGap), price: fmtPrice(marketPrice(state, 'chips', 'buy')) })}
        </Alert>
      )}
      {e.chipFactor < 0.999 && (
        <Alert color="var(--rose)" title={t('COMPUTE THROTTLED TO {pct}%', { pct: Math.round(e.chipFactor * 100) })} pulse>
          {autarky ? t('Chip shortage and no imports allowed.') : state.budget < 0 ? t('The treasury is in debt and cannot pay for chip imports.') : t('Chip shortage.')} {autarky ? t('Build Chip Foundries.') : t('Build Chip Foundries or buy chips.')}
        </Alert>
      )}

      <GoodCard good="steel" />
      <GoodCard good="chips" />

      <Section title={t('FIELD MANUAL')}>
        <ul className="font-rajdhani text-[12px] leading-snug flex flex-col gap-0.5" style={{ color: 'var(--text-secondary)' }}>
          <li>⛓ <b style={{ color: GOOD_INFO.steel.color }}>{t('Kombinats')}</b> {t('make steel; the Five-Year Plan boosts them.')}</li>
          <li>◆ <b style={{ color: GOOD_INFO.chips.color }}>{t('Chip Foundries')}</b> {t('make chips; education makes them better.')}</li>
          <li>⚖ {t('Prices move when you trade a lot, then drift back (~25%/yr).')}</li>
        </ul>
      </Section>
    </>
  );
}

function Alert({ color, title, children, pulse }: { color: string; title: string; children: ReactNode; pulse?: boolean }) {
  return (
    <div className="mx-2 mt-2 rounded px-2 py-1.5" style={{ border: `1px solid ${color}`, background: `color-mix(in srgb, ${color}, transparent 90%)` }}>
      <div className={`font-mono-data text-[9.5px] tracking-wider ${pulse ? 'animate-pulse-glow' : ''}`} style={{ color }}>{title}</div>
      <div className="font-rajdhani text-[12px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  );
}

function goodFlows(s: GameState, good: Good) {
  const prod = good === 'steel' ? s.eco.steelProd : s.eco.chipProd;
  const use = good === 'steel' ? s.eco.steelUse : s.eco.chipUse;
  return { prod, use, net: prod - use };
}

function GoodCard({ good }: { good: Good }) {
  const { state, dispatch } = useGame();
  const info = GOOD_INFO[good];
  const stock = Math.floor(state[good]);
  const { prod, use, net } = goodFlows(state, good);
  const buy = marketPrice(state, good, 'buy');
  const sell = marketPrice(state, good, 'sell');
  const autarky = pol(state, 'autarky');
  const mod = state.priceMod[good];
  const trend = mod > 1.01 ? 'up' : mod < 0.99 ? 'down' : 'flat';
  const surplus = Math.max(0, stock - RESERVE);
  const runway = good === 'chips' && net < 0 ? state.chips / -net : Infinity;
  const danger = good === 'chips' && net < 0 && runway < 1;

  const trade = (amount: number) => {
    play('coin');
    dispatch({ type: 'TRADE', good, amount });
  };

  return (
    <Section title={`${info.icon} ${t(info.name).toUpperCase()}`} accent={info.color}
      right={<span className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{t('unit:')} {info.unit}</span>}>
      <div className="flex items-end justify-between mb-1">
        <div>
          <div className="font-rajdhani text-[26px] font-bold leading-none" style={{ color: danger ? 'var(--rose)' : CREAM, textShadow: `0 0 10px ${danger ? 'var(--rose)' : info.color}55` }}>
            {fmtQty(stock)}
          </div>
          <div className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{t('IN STOCK')}</div>
        </div>
        <div className="text-right">
          <div className="font-mono-data text-[13px]" style={{ color: net > 0.05 ? 'var(--green)' : net < -0.05 ? 'var(--rose)' : 'var(--text-secondary)' }}>
            {t('{value}/yr', { value: fmtSigned(net, Math.abs(net) < 10 ? 1 : 0) })}
          </div>
          <div className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
            {Number.isFinite(runway) ? t('lasts {years} yrs', { years: runway < 0.1 ? '<0.1' : runway.toFixed(1) }) : t('NET FLOW')}
          </div>
        </div>
      </div>

      <KV k={t('Own production')} v={t('+{qty}/yr', { qty: fmtQty(prod) })} tone={prod > 0 ? 'good' : 'dim'} />
      {good === 'chips' && <KV k={t('Hardware consumption')} v={t('−{qty}/yr', { qty: fmtQty(use) })} tone={use > prod ? 'bad' : 'dim'} />}
      {good === 'steel' && prod <= 0 && <KV k={t('No Kombinat online')} v={t('build one')} tone="warn" />}
      {good === 'chips' && prod <= 0 && use > 0 && <KV k={t('No Chip Foundry online')} v={t('build one')} tone="warn" />}

      <div className="grid grid-cols-2 gap-1.5 my-1.5">
        <PriceBox label={t('BUY')} price={buy} color="var(--rose)" muted={autarky} />
        <PriceBox label={t('SELL')} price={sell} color="var(--green)" />
      </div>
      <PriceSpark good={good} year={state.year} current={(buy + sell) / 2} color={info.color} trend={trend} mod={mod} />

      <div className="grid grid-cols-2 gap-1 mt-1.5">
        {[10, 50].map(n => {
          const cost = n * buy;
          const reason = autarky ? t('Autarky bans imports') : state.budget < cost ? t('Needs {cost}', { cost: fmtMoney(cost) }) : undefined;
          return (
            <TradeButton key={`b${n}`} color="var(--cyan)" disabled={!!reason} title={reason ?? t('Buy {n} {unit} for {cost}', { n, unit: info.unit, cost: fmtMoney(cost) })} onClick={() => trade(n)}
              label={t('BUY {n}', { n })} sub={`−${fmtMoney(cost)}`} />
          );
        })}
        {[10, 50].map(n => {
          const gain = n * sell;
          const reason = stock < n ? t('Only {stock} in stock', { stock }) : undefined;
          return (
            <TradeButton key={`s${n}`} color={GOLD} disabled={!!reason} title={reason ?? t('Sell {n} {unit} for {gain}', { n, unit: info.unit, gain: fmtMoney(gain) })} onClick={() => trade(-n)}
              label={t('SELL {n}', { n })} sub={`+${fmtMoney(gain)}`} />
          );
        })}
      </div>
      <div className="mt-1">
        <TradeButton color="var(--green)" disabled={surplus <= 0} wide
          title={surplus > 0 ? t('Sell {qty} {unit}, keeping a reserve of {reserve}', { qty: surplus, unit: info.unit, reserve: RESERVE }) : t('Nothing above the {reserve} reserve', { reserve: RESERVE })}
          onClick={() => trade(-surplus)}
          label={surplus > 0 ? t('SELL ALL SURPLUS · {qty}', { qty: fmtQty(surplus) }) : t('SELL ALL SURPLUS')}
          sub={surplus > 0 ? t('+{gain} · keeps {reserve}', { gain: fmtMoney(surplus * sell), reserve: RESERVE }) : t('keeps a reserve of {reserve}', { reserve: RESERVE })} />
      </div>
      {autarky && <div className="font-mono-data text-[9px] mt-1" style={{ color: 'var(--amber)' }}>{t('Buying disabled: Autarky decree forbids imports.')}</div>}
    </Section>
  );
}

function PriceBox({ label, price, color, muted }: { label: string; price: number; color: string; muted?: boolean }) {
  return (
    <div className="rounded px-2 py-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', opacity: muted ? 0.45 : 1 }}>
      <div className="font-mono-data text-[8.5px] tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{label} / {t('UNIT')}</div>
      <div className="font-mono-data text-[13px]" style={{ color }}>{fmtPrice(price)}</div>
    </div>
  );
}

/** Historical base-price curve 1960–2040 with "now" marker; the dot is today's real price (trades push it off the curve). */
function PriceSpark({ good, year, current, color, trend, mod }: { good: Good; year: number; current: number; color: string; trend: 'up' | 'down' | 'flat'; mod: number }) {
  const W = 260, H = 34, Y0 = 1960, Y1 = 2040;
  const ys: number[] = [];
  for (let y = Y0; y <= Y1; y += 4) ys.push(y);
  const vals = ys.map(y => basePrice(good, y));
  const lo = Math.min(...vals, current) * 0.9;
  const hi = Math.max(...vals, current) * 1.05;
  const x = (y: number) => ((y - Y0) / (Y1 - Y0)) * W;
  const yy = (v: number) => H - 2 - ((v - lo) / (hi - lo)) * (H - 4);
  const path = ys.map((y, i) => `${i ? 'L' : 'M'}${x(y).toFixed(1)},${yy(vals[i]).toFixed(1)}`).join(' ');
  const nx = x(Math.min(Y1, Math.max(Y0, year)));
  const past = ys.filter(y => y <= year);
  const pastPath = past.length > 1 ? past.map((y, i) => `${i ? 'L' : 'M'}${x(y).toFixed(1)},${yy(basePrice(good, y)).toFixed(1)}`).join(' ') + ` L${nx.toFixed(1)},${yy(basePrice(good, year)).toFixed(1)}` : '';
  const pctVsBase = (mod - 1) * 100;
  const tColor = trend === 'up' ? 'var(--rose)' : trend === 'down' ? 'var(--green)' : 'var(--text-tertiary)';
  return (
    <div className="rounded px-1.5 pt-1 pb-0.5" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}>
      <div className="flex justify-between font-mono-data text-[8.5px]" style={{ color: 'var(--text-tertiary)' }}>
        <span>{t('WORLD PRICE 1960–2040')}</span>
        <span style={{ color: tColor }} title={t('Your trades push prices; the push fades about 25% per year')}>
          {trend === 'up' ? t('▲ RISING') : trend === 'down' ? t('▼ FALLING') : t('■ STABLE')} {trend !== 'flat' ? `${fmtSigned(pctVsBase, 0)}%` : ''}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: H }} preserveAspectRatio="none" aria-hidden="true">
        <path d={path} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.2} strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
        {pastPath && <path d={pastPath} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />}
        <line x1={nx} x2={nx} y1={0} y2={H} stroke={CREAM} strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <circle cx={nx} cy={yy(current)} r={2.6} fill={tColor === 'var(--text-tertiary)' ? color : tColor} stroke="#050508" strokeWidth={0.8} />
      </svg>
    </div>
  );
}

function TradeButton({ label, sub, color, disabled, title, onClick, wide }: { label: string; sub: string; color: string; disabled?: boolean; title?: string; onClick: () => void; wide?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`${wide ? 'w-full' : ''} rounded px-1.5 py-1 flex flex-col items-center leading-tight transition-all ${disabled ? 'opacity-35 cursor-not-allowed' : 'hover:brightness-125 active:scale-[0.97]'}`}
      style={{ color: disabled ? 'var(--text-tertiary)' : color, border: `1px solid ${disabled ? 'var(--border-light)' : color}`, background: disabled ? 'transparent' : `color-mix(in srgb, ${color}, transparent 88%)` }}>
      <span className="font-orbitron text-[8.5px] font-bold tracking-wider">{label}</span>
      <span className="font-mono-data text-[8.5px]" style={{ opacity: 0.8 }}>{sub}</span>
    </button>
  );
}
