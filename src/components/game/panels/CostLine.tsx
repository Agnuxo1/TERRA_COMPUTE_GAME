import type { CostQuote } from '../../../game/engine';
import { fmtMoney } from '../../../game/format';
import { GOOD_INFO } from '../../../game/market';

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
        <span style={{ color: goodTone(q.importSteel) }} title={`${q.steel} ${GOOD_INFO.steel.unit} steel${q.importSteel ? ` (${q.importSteel} imported)` : ''}`}>
          {' + '}{GOOD_INFO.steel.icon}{q.steel}
        </span>
      )}
      {q.chips > 0 && (
        <span style={{ color: q.importChips > 0 ? 'var(--amber)' : dimGoods ? 'var(--text-secondary)' : GOOD_INFO.chips.color }} title={`${q.chips} ${GOOD_INFO.chips.unit} chips${q.importChips ? ` (${q.importChips} imported)` : ''}`}>
          {' + '}{GOOD_INFO.chips.icon}{q.chips}
        </span>
      )}
      {showImport && q.importCost > 0 && (
        <span style={{ color: 'var(--amber)' }} title="Missing goods are bought on the world market at the current buy price">
          {' '}(+{fmtMoney(q.importCost)} import)
        </span>
      )}
    </span>
  );
}
