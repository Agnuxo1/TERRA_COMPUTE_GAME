import { useState } from 'react';
import { useGame } from '../../../App';
import { buildings, CATEGORY_COLOR, CATEGORY_LABEL, techById } from '../../../game/data';
import { buildQuote, countBuildings, evaluatePlacement, isUnlocked, popScale, suggestTile } from '../../../game/engine';
import { fmtMoney } from '../../../game/format';
import type { BuildingCategory } from '../../../game/types';
import { play } from '../../../hooks/useSound';
import { t } from '../../../i18n';
import { PanelHeader } from './common';
import CostLine from './CostLine';

const CATS: BuildingCategory[] = ['people', 'economy', 'energy', 'science', 'compute', 'safety'];

export default function BuildPanel() {
  const { state, dispatch } = useGame();
  const [cat, setCat] = useState<BuildingCategory>('people');
  const ps = popScale(state.playerContinent);
  const list = buildings.filter(b => b.category === cat);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title={t('CONSTRUCTION')} accent="var(--green)" onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        right={<span className="font-mono-data text-[10px]" style={{ color: 'var(--green)' }}>{fmtMoney(state.budget)}</span>} />
      <div className="grid grid-cols-3 gap-1 p-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {CATS.map(c => (
          <button key={c} onClick={() => { play('click'); setCat(c); }}
            className="font-mono-data text-[9px] tracking-wider py-1 rounded transition-all hover:brightness-125"
            style={{ color: cat === c ? '#050508' : CATEGORY_COLOR[c], background: cat === c ? CATEGORY_COLOR[c] : 'transparent', border: `1px solid ${CATEGORY_COLOR[c]}66` }}>
            {t(CATEGORY_LABEL[c])}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2 [&>*]:shrink-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        {list.map(b => {
          const unlocked = isUnlocked(state, b.id);
          const q = buildQuote(state, b.id);
          const afford = q.ok;
          const tone = CATEGORY_COLOR[b.category];
          const active = state.placing === b.id;
          const best = unlocked ? suggestTile(state, b.id) : null;
          const bestMult = best !== null ? evaluatePlacement(state, state.map!.tiles[best], b.id).mult : 0;
          const owned = countBuildings(state, b.id);
          return (
            <div key={b.id} className="shrink-0 rounded overflow-hidden transition-all"
              style={{ border: `1px solid ${active ? tone : 'var(--border-light)'}`, boxShadow: active ? `0 0 14px ${tone}55` : 'none', opacity: unlocked ? 1 : 0.55 }}>
              <button
                disabled={!unlocked}
                onClick={() => { play('click'); dispatch({ type: 'SET_PLACING', building: active ? null : b.id }); dispatch({ type: 'SELECT_TILE', tileId: null }); }}
                className="relative w-full text-left"
                title={unlocked ? t('Click, then click a tile on the map') : undefined}
              >
                <div className="relative h-16 overflow-hidden">
                  <img src={`./assets/cards/build-${b.id === 'fusion' ? 'nuclear' : b.id}.png`} alt="" className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: `brightness(${active ? 0.8 : 0.5}) saturate(${unlocked ? 1 : 0})${b.id === 'fusion' ? ' hue-rotate(200deg)' : ''}` }} draggable={false} />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(11,12,16,0.92) 35%, transparent)` }} />
                  <div className="absolute left-2 top-1.5 right-2">
                    <div className="flex items-center justify-between">
                      <span className="font-rajdhani text-[14px] font-bold" style={{ color: tone }}>{b.icon} {t(b.name)}</span>
                      {owned > 0 && <span className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>×{owned}</span>}
                    </div>
                    <div className="font-mono-data text-[9.5px] mt-0.5 truncate">
                      <CostLine q={q} showImport={false} /> <span style={{ color: 'var(--text-tertiary)' }}>{t('· {upkeep}B/yr · {years}y', { upkeep: `$${b.upkeep}`, years: b.buildTime })}</span>
                    </div>
                    <div className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                      {b.energyProduce ? <span style={{ color: 'var(--green)' }}>+{b.energyProduce} GW </span> : b.energyUse ? <span>−{b.energyUse} GW </span> : null}
                      · {t('{jobs}M jobs', { jobs: (b.jobs * ps).toFixed(1) })}{b.emissions >= 3 ? <span style={{ color: 'var(--rose)' }}> · {b.emissions} Mt CO₂</span> : null}
                    </div>
                  </div>
                </div>
              </button>
              <div className="px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="font-rajdhani text-[12px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{t(b.description)}</div>
                <div className="font-rajdhani text-[11.5px] leading-snug mt-0.5" style={{ color: 'var(--text-tertiary)' }}>▸ {t(b.placement)}</div>
                {!unlocked && b.requiresTech && (
                  <div className="font-mono-data text-[9.5px] mt-1" style={{ color: 'var(--amber)' }}>🔒 {t('Research: {tech}', { tech: t(techById[b.requiresTech].name) })}</div>
                )}
                {unlocked && q.importCost > 0 && (
                  <div className="font-mono-data text-[9.5px] mt-1" style={{ color: 'var(--amber)' }}
                    title={t('Goods missing from your stock are bought on the world market at the current buy price')}>
                    {t('(+{cost} import{steel}{chips})', {
                      cost: fmtMoney(q.importCost),
                      steel: q.importSteel ? t(' · {n} steel', { n: q.importSteel }) : '',
                      chips: q.importChips ? t(' · {n} chips', { n: q.importChips }) : '',
                    })}
                  </div>
                )}
                {unlocked && !q.ok && q.reason && (
                  <div className="font-mono-data text-[9.5px] mt-0.5" style={{ color: 'var(--rose)' }}>✕ {q.reason}</div>
                )}
                {unlocked && (
                  <div className="flex gap-1 mt-1.5">
                    <button onClick={() => { play('click'); dispatch({ type: 'SET_PLACING', building: active ? null : b.id }); }}
                      className="flex-1 font-mono-data text-[9.5px] py-1 rounded hover:brightness-125"
                      style={{ color: tone, border: `1px solid ${tone}`, background: active ? `${tone}22` : 'transparent' }}>
                      {active ? t('CANCEL') : t('PLACE ON MAP')}
                    </button>
                    <button disabled={best === null || !afford}
                      onClick={() => { if (best !== null) { play('build'); dispatch({ type: 'BUILD', tileId: best, building: b.id }); dispatch({ type: 'SET_PLACING', building: null }); } }}
                      className={`flex-1 font-mono-data text-[9.5px] py-1 rounded ${best === null || !afford ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-125'}`}
                      style={{ color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
                      title={!afford && q.reason ? q.reason : t('Build immediately on the best available tile · {total} total{imports}', {
                        total: fmtMoney(q.total),
                        imports: q.importCost ? t(' incl. {cost} imports', { cost: fmtMoney(q.importCost) }) : '',
                      })}>
                      {best === null ? t('NO FREE TILE') : t('BEST SPOT ×{mult}', { mult: bestMult.toFixed(2) })}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
