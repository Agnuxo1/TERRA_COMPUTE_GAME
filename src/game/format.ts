export function fmtFlops(flops: number): string {
  if (!isFinite(flops) || flops <= 0) return '0 FLOPS';
  const units: Array<[number, string]> = [
    [1e24, 'YFLOPS'], [1e21, 'ZFLOPS'], [1e18, 'EFLOPS'], [1e15, 'PFLOPS'], [1e12, 'TFLOPS'], [1e9, 'GFLOPS'], [1e6, 'MFLOPS'], [1e3, 'kFLOPS'],
  ];
  for (const [v, u] of units) if (flops >= v) return `${(flops / v).toFixed(flops / v >= 100 ? 0 : 1)} ${u}`;
  return `${flops.toFixed(0)} FLOPS`;
}

export function capabilityLabel(c: number): string {
  if (c >= 24) return 'Yotta';
  if (c >= 21) return 'Zetta';
  if (c >= 18) return 'Exa';
  if (c >= 15) return 'Peta';
  if (c >= 12) return 'Tera';
  if (c >= 9) return 'Giga';
  return 'Mega';
}

export function fmtMoney(b: number): string {
  const sign = b < 0 ? '-' : '';
  const a = Math.abs(b);
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)}T`;
  return `${sign}$${a.toFixed(0)}B`;
}

export function fmtSigned(v: number, digits = 0): string {
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}

export function fmtPop(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)}B`;
  return `${m.toFixed(0)}M`;
}

export function pct(v: number, digits = 0): string {
  return `${(v * 100).toFixed(digits)}%`;
}
