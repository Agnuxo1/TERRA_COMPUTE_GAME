import { useGame } from '../../../App';
import { buildingById, buildings, CATEGORY_COLOR, depositInfo, MAX_LEVEL, terrainInfo } from '../../../game/data';
import { buildQuote, buildTime, describeOutput, evaluatePlacement, housingComfort, isUnlocked, regionCost, upgradeQuote } from '../../../game/engine';
import { fmtMoney } from '../../../game/format';
import { play } from '../../../hooks/useSound';
import { t } from '../../../i18n';
import { ActionButton, KV, PanelHeader, Section } from './common';
import CostLine from './CostLine';

export default function TilePanel() {
  const { state, dispatch } = useGame();
  const tile = state.selectedTile !== null ? state.map!.tiles[state.selectedTile] : null;
  if (!tile) return null;
  const close = () => dispatch({ type: 'SELECT_TILE', tileId: null });
  const region = state.map!.regions.find(r => r.id === tile.region);
  const owned = !!tile.region && state.ownedRegions.includes(tile.region);
  const info = terrainInfo[tile.terrain];
  const b = tile.building;

  // ── Undeveloped region ──
  if (!owned && region) {
    const cost = regionCost(state, region.id);
    const deposits = region.tiles.map(id => state.map!.tiles[id]).filter(dt => dt.deposit);
    return (
      <div className="flex flex-col">
        <PanelHeader title={t(region.name).toUpperCase()} accent="var(--amber)" onClose={close} />
        <Section title={t('UNDEVELOPED REGION')} accent="var(--amber)">
          <p className="font-rajdhani text-[13px] leading-snug mb-2" style={{ color: 'var(--text-secondary)' }}>
            {t('Roads, power lines and administration are needed before you can build here. Development opens {tiles} new tiles.', { tiles: region.tiles.length })}
          </p>
          <KV k={t('Tiles')} v={region.tiles.length} />
          <KV k={t('Coast tiles')} v={region.tiles.filter(id => state.map!.tiles[id].coast).length} />
          <KV k={t('River valleys')} v={region.tiles.filter(id => state.map!.tiles[id].terrain === 'fertile').length} />
          {deposits.map(dt => <KV key={dt.id} k={t(depositInfo[dt.deposit!].name)} v={depositInfo[dt.deposit!].icon} />)}
          <div className="mt-2">
            <ActionButton color="var(--amber)" disabled={state.budget < cost} onClick={() => { play('build'); dispatch({ type: 'DEVELOP_REGION', regionId: region.id }); }}>
              {t('DEVELOP REGION · {cost}', { cost: fmtMoney(cost) })}
            </ActionButton>
          </div>
        </Section>
      </div>
    );
  }

  // ── Existing building ──
  if (b) {
    const def = buildingById[b.type];
    const tone = CATEGORY_COLOR[def.category];
    const pl = evaluatePlacement(state, tile, b.type, true);
    const out = describeOutput(state, tile);
    const next = b.level < MAX_LEVEL && b.progress >= 1 && !b.upgrading ? describeOutput(state, tile, b.type, b.level + 1) : null;
    const upQ = upgradeQuote(state, tile);
    const refund = Math.round(def.cost * 0.25);
    return (
      <div className="flex flex-col">
        <PanelHeader title={t(def.name).toUpperCase()} accent={tone} onClose={close} />
        <div className="relative h-24 shrink-0 overflow-hidden" style={{ borderBottom: '1px solid var(--border)' }}>
          <img src={`./assets/cards/build-${b.type === 'fusion' ? 'nuclear' : b.type}.png`} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'brightness(0.55) saturate(0.9)' }} draggable={false} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(11,12,16,0.95), transparent 70%)' }} />
          <div className="absolute bottom-1.5 left-3 right-3 flex justify-between items-end">
            <span className="font-mono-data text-[10px]" style={{ color: tone }}>{t('LEVEL {level}{upgrading} · {region}', { level: b.level, upgrading: b.upgrading ? t(' (upgrading)') : '', region: region ? t(region.name) : '' })}</span>
            <span className="font-mono-data text-[12px]" style={{ color: '#FFD166' }}>{'◆'.repeat(b.level)}{'◇'.repeat(MAX_LEVEL - b.level)}</span>
          </div>
        </div>
        {b.progress < 1 && (
          <Section title={b.upgrading ? t('UPGRADING') : t('UNDER CONSTRUCTION')} accent="var(--amber)">
            <div className="h-2 rounded-sm overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full" style={{ width: `${b.progress * 100}%`, background: 'var(--amber)' }} />
            </div>
            <div className="font-mono-data text-[9.5px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {t('{pct}% · about {years} years left', { pct: Math.floor(b.progress * 100), years: ((1 - b.progress) * buildTime(state, b.type) * (b.upgrading ? 0.8 : 1)).toFixed(1) })}
            </div>
          </Section>
        )}
        <Section title={t('OUTPUT')} accent={tone}>
          {out.map(o => <KV key={o.label} k={t(o.label)} v={o.value} />)}
          {b.type === 'housing' && <KV k={t('Neighbourhood comfort')} v={housingComfort(state, tile).toFixed(1)} tone={housingComfort(state, tile) >= 0 ? 'good' : 'bad'} />}
        </Section>
        <Section title={t('LOCATION BONUSES')}>
          {pl.ok && pl.notes.length ? pl.notes.map((n, i) => <KV key={i} k={t(n.label)} v={n.value} tone={n.good ? 'good' : 'bad'} />) : <KV k={t('No modifiers')} v="×1.00" tone="dim" />}
          <KV k={t('Total multiplier')} v={`×${(pl.ok ? pl.mult : 1).toFixed(2)}`} />
          <div className="font-rajdhani text-[11.5px] leading-snug mt-1" style={{ color: 'var(--text-tertiary)' }}>{t(def.placement)}</div>
        </Section>
        <Section title={t('ACTIONS')}>
          <div className="flex flex-col gap-1.5">
            {next && (
              <>
                <ActionButton color="#FFD166" disabled={!upQ.ok} title={upQ.reason} onClick={() => { play('build'); dispatch({ type: 'UPGRADE', tileId: tile.id }); }}>
                  ▲ {t('UPGRADE TO LEVEL {level}', { level: b.level + 1 })}
                </ActionButton>
                <div className="font-mono-data text-[9.5px] leading-snug text-center">
                  <CostLine q={upQ} />
                  {!upQ.ok && upQ.reason && <div style={{ color: 'var(--rose)' }}>✕ {upQ.reason}</div>}
                </div>
                <div className="font-mono-data text-[9px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                  {t('Level {level}: {effects}', {
                    level: b.level + 1,
                    effects: next.filter(o => !['Upkeep', 'Jobs'].includes(o.label)).slice(0, 2).map(o => t('{label} {value}', { label: t(o.label), value: o.value })).join(' · '),
                  })}
                </div>
              </>
            )}
            <ActionButton color="var(--rose)" small onClick={() => { play('click'); dispatch({ type: 'DEMOLISH', tileId: tile.id }); }} title={t('Frees the tile. Refunds 25% of the base cost.')}>
              {t('DEMOLISH · refund {amount}', { amount: fmtMoney(refund) })}
            </ActionButton>
          </div>
        </Section>
      </div>
    );
  }

  // ── Empty owned tile: quick build list sorted by suitability ──
  const options = buildings
    .filter(d => isUnlocked(state, d.id))
    .map(d => ({ d, pl: evaluatePlacement(state, tile, d.id), q: buildQuote(state, d.id) }))
    .filter(o => o.pl.ok)
    .sort((a, b2) => b2.pl.mult - a.pl.mult);
  return (
    <div className="flex flex-col">
      <PanelHeader title={t(info.name).toUpperCase()} accent="var(--green)" onClose={close} />
      <Section title={t('TERRAIN')}>
        <div className="font-rajdhani text-[12.5px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{t(info.note)}</div>
        {tile.coast && <KV k={t('Coast')} v={t('seaports, cooling')} tone="good" />}
        {tile.river && <KV k={t('River')} v={t('farms, nuclear cooling')} tone="good" />}
        {tile.deposit && <KV k={t(depositInfo[tile.deposit].name)} v={t(depositInfo[tile.deposit].note)} tone="good" />}
        <KV k={t('Region')} v={region ? t(region.name) : '—'} />
      </Section>
      <Section title={t('BUILD HERE')} accent="var(--green)">
        <div className="flex flex-col gap-1">
          {options.map(({ d, pl, q }) => {
            const tone = CATEGORY_COLOR[d.category];
            const afford = q.ok;
            return (
              <button key={d.id} disabled={!afford}
                onClick={() => { play('build'); dispatch({ type: 'BUILD', tileId: tile.id, building: d.id }); }}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-left transition-all ${afford ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${pl.mult >= 1.15 ? tone : 'var(--border)'}` }}
                title={afford ? t(d.description) : `${t(d.description)}
✕ ${q.reason}`}>
                <span className="flex flex-col min-w-0">
                  <span className="font-rajdhani text-[13px] font-semibold truncate" style={{ color: tone }}>{d.icon} {t(d.short)}</span>
                  {!afford && q.reason && <span className="font-mono-data text-[8.5px] truncate" style={{ color: 'var(--rose)' }}>{q.reason}</span>}
                </span>
                <span className="font-mono-data text-[9.5px] whitespace-nowrap text-right flex flex-col items-end">
                  <span style={{ color: pl.mult >= 1.05 ? 'var(--green)' : pl.mult < 0.9 ? 'var(--rose)' : 'var(--text-secondary)' }}>×{pl.mult.toFixed(2)}</span>
                  <CostLine q={q} dimGoods />
                </span>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
