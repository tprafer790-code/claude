import Decimal from 'break_infinity.js';

export { Decimal };
export type DecimalSource = Decimal | number | string;

export const D = (v: DecimalSource): Decimal => (v instanceof Decimal ? v : new Decimal(v));
export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

/**
 * Formats a large number for display: 999, 1.23K, 45.6M ... Vg, then scientific.
 * Values below 1000 keep up to `smallDecimals` decimals (useful for income/s like 0.4).
 */
export function fmt(value: DecimalSource, smallDecimals = 0): string {
  const d = D(value);
  if (d.lt(0)) return '-' + fmt(d.neg(), smallDecimals);
  if (d.lt(1000)) {
    const n = d.toNumber();
    if (smallDecimals > 0 && n < 100 && n % 1 !== 0) return trimZeros(n.toFixed(smallDecimals));
    return Math.floor(n).toLocaleString('en-US');
  }
  const exp = Math.floor(d.log10());
  const group = Math.floor(exp / 3);
  if (group < SUFFIXES.length) {
    const scaled = d.div(Decimal.pow(10, group * 3)).toNumber();
    const digits = scaled >= 100 ? 1 : 2;
    return trimZeros(truncate(scaled, digits).toFixed(digits)) + SUFFIXES[group];
  }
  const mantissa = d.mantissa;
  return `${truncate(mantissa, 2).toFixed(2)}e${d.exponent}`;
}

/** Money with currency sign. */
export const money = (v: DecimalSource, smallDecimals = 0) => '$' + fmt(v, smallDecimals);

function truncate(n: number, digits: number) {
  const f = Math.pow(10, digits);
  return Math.floor(n * f + 1e-9) / f;
}
function trimZeros(s: string) {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export function fmtDuration(seconds: number): string {
  seconds = Math.max(0, Math.floor(seconds));
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
