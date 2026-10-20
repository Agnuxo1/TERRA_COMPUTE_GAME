import type { CostQuote } from '../../../game/engine';
import { fmtMoney } from '../../../game/format';
import { GOOD_INFO } from '../../../game/market';
import { t } from '../../../i18n';

/**
 * Inline price tag for a CostQuote: "$money + ⛓steel + ◆chips (+$X import)".
 * Goods you cannot cover from stock are tinted amber; the whole tag turns rose when the quote is not affordable.
 */
export default function CostLine({ q, showImport = true, dimGoods = false }: { q: CostQuote; showImport?: boolean; dimGoods?: boolean }) {
  const base = q.ok ? 'var(--text-primary)' : 'var(--rose)';
  const goodTone = (missing: number) => (missing > 0 ? 'var(--amber)' : dimGoods ? 'var(--text-secondary)' : GOOD_INFO.steel.color);
  return (
    <span className="whitespace-nowrap" style={{ color: base }}>
      {fmtMoney(q.money)}
      {q.steel > 0 && (
        <span style={{ color: goodTone(q.importSteel) }} title={t('{qty} {unit} steel{imported}', {
          qty: q.steel,
          unit: GOOD_INFO.steel.unit,
          imported: q.importSteel ? t(' ({n} imported)', { n: q.importSteel }) : '',
        })}>
          {' + '}{GOOD_INFO.steel.icon}{q.steel}
        </span>
      )}
      {q.chips > 0 && (
        <span style={{ color: q.importChips > 0 ? 'var(--amber)' : dimGoods ? 'var(--text-secondary)' : GOOD_INFO.chips.color }} title={t('{qty} {unit} chips{imported}', {
          qty: q.chips,
          unit: GOOD_INFO.chips.unit,
          imported: q.importChips ? t(' ({n} imported)', { n: q.importChips }) : '',
        })}>
          {' + '}{GOOD_INFO.chips.icon}{q.chips}
        </span>
      )}
      {showImport && q.importCost > 0 && (
        <span style={{ color: 'var(--amber)' }} title={t('Missing goods are bought on the world market at the current buy price')}>
          {' '}{t('(+{cost} import)', { cost: fmtMoney(q.importCost) })}
        </span>
      )}
    </span>
  );
}
