import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../../App';
import { continentById } from '../../../game/data';
import { fmtMoney } from '../../../game/format';
import { coupCost, influenceCost, ZONES, zoneHolder, zoneOpen, type ZoneDef } from '../../../game/zones';
import type { GameState, ZoneId } from '../../../game/types';
import { play } from '../../../hooks/useSound';
import { t } from '../../../i18n';
import { ActionButton, Bar, PanelHeader } from './common';

const FALLBACK_COLOR = '#8A8A94';

function blocName(id: string): string {
  const c = continentById(id);
  return c ? t(c.name) : id;
}

function blocColor(id: string): string {
  return continentById(id)?.color ?? FALLBACK_COLOR;
}

export default function ZonePanel({ focus }: { focus?: ZoneId }) {
  const { state, dispatch } = useGame();
  const me = state.mp?.me ?? state.playerContinent ?? '';
  const cardRefs = useRef<Partial<Record<ZoneId, HTMLDivElement | null>>>({});

  useEffect(() => {
    if (!focus) return;
    cardRefs.current[focus]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focus]);

  const cost = influenceCost(state);
  const coup = coupCost(state);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title={t('STRATEGIC ZONES')} accent="#00F0FF" onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      <div className="px-3 py-2 font-mono-data text-[9.5px] leading-snug shrink-0" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
        <div>{t('Hold a zone with 40 influence and a 10-point lead. Influence fades 5% a year.')}</div>
        <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>{t('Budget {amount}', { amount: fmtMoney(state.budget) })}</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {ZONES.map(z => (
          <ZoneCard
            key={z.id}
            zone={z}
            state={state}
            me={me}
            cost={cost}
            coup={coup}
            focused={focus === z.id}
            cardRef={el => { cardRefs.current[z.id] = el; }}
            onInfluence={() => { play('coin'); dispatch({ type: 'INFLUENCE', zone: z.id }); }}
            onCoup={target => { play('click'); dispatch({ type: 'COUP', zone: z.id, target }); }}
          />
        ))}
      </div>
    </div>
  );
}

interface ZoneCardProps {
  zone: ZoneDef;
  state: GameState;
  me: string;
  cost: number;
  coup: number;
  focused: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  onInfluence: () => void;
  onCoup: (target: string) => void;
}

function ZoneCard({ zone, state, me, cost, coup, focused, cardRef, onInfluence, onCoup }: ZoneCardProps) {
  const [picked, setPicked] = useState('');
  const zs = state.zones?.[zone.id];
  const infl: Record<string, number> = zs?.influence ?? {};
  const open = zoneOpen(zone.id, state.year);
  const holder = zoneHolder(zs);
  const others = Object.entries(infl).filter(([b, v]) => b !== me && v > 0).sort((a, b) => b[1] - a[1]);
  const top = others.slice(0, 3);
  const target = others.some(([b]) => b === picked) ? picked : (others[0]?.[0] ?? '');
  const canInfluence = open && state.budget >= cost;
  const canCoup = open && target !== '' && state.budget >= coup;
  const rows: Array<[string, number]> = [[me, infl[me] ?? 0], ...top];
  const holderColor = holder ? blocColor(holder) : FALLBACK_COLOR;

  return (
    <div
      ref={cardRef}
      className="px-3 py-2.5"
      style={{
        borderBottom: '1px solid var(--border)',
        background: focused ? 'rgba(0,240,255,0.06)' : undefined,
        boxShadow: focused ? 'inset 2px 0 0 #00F0FF' : undefined,
        opacity: open ? 1 : 0.6,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-orbitron text-[11px] font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>{t(zone.name).toUpperCase()}</div>
          <div className="font-mono-data text-[9.5px]" style={{ color: 'var(--text-secondary)' }}>{t(zone.resource)} · {t(zone.bonus)}</div>
        </div>
        <span
          className="font-mono-data text-[9px] px-1.5 py-0.5 rounded shrink-0"
          style={{ color: holderColor, border: `1px solid ${holderColor}88`, background: `${holderColor}14`, whiteSpace: 'nowrap' }}
        >
          {holder ? blocName(holder) : t('Contested')}
        </span>
      </div>
      {!open && (
        <div className="font-mono-data text-[9.5px] mt-1" style={{ color: 'var(--amber)' }}>{t('Opens in {year}', { year: zone.from })}</div>
      )}

      <div className="mt-2 flex flex-col gap-1.5">
        {rows.map(([b, v]) => (
          <div key={b}>
            <div className="flex justify-between font-mono-data text-[9px]">
              <span style={{ color: blocColor(b) }}>{b === me ? t('You') : blocName(b)}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{Math.round(v)}</span>
            </div>
            <Bar value={v} color={blocColor(b)} height={4} />
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <ActionButton small color="#00F0FF" disabled={!canInfluence} onClick={onInfluence} title={t('Spend influence to gain this zone')}>
          {t('INFLUENCE ({cost})', { cost: fmtMoney(cost) })}
        </ActionButton>
        <ActionButton small color="#FF477E" disabled={!canCoup} onClick={() => onCoup(target)} title={t('Covert coup against the selected bloc')}>
          {t('COUP ({cost})', { cost: fmtMoney(coup) })}
        </ActionButton>
      </div>
      {others.length > 0 ? (
        <select
          value={target}
          onChange={e => setPicked(e.target.value)}
          aria-label={t('Coup target')}
          className="mt-1.5 w-full font-mono-data text-[9.5px] rounded px-1.5 py-1"
          style={{ background: 'rgba(5,5,8,0.8)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          {others.map(([b]) => (
            <option key={b} value={b}>{t('Target: {bloc}', { bloc: blocName(b) })}</option>
          ))}
        </select>
      ) : (
        <div className="mt-1.5 font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{t('No rival influence to undermine yet.')}</div>
      )}
    </div>
  );
}
