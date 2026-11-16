// Y-axis helper for MT bar charts: picks one unit (M / k / plain) from the
// data and a "nice" step, so tick labels are always distinct (no 0.01M, 0.01M…)
// and small values are shown in thousands (or as plain numbers) rather than millions.
import { formatFixed } from './formatters';

export function computeMtAxis(values) {
  const max = Math.max(0, ...values.map((v) => Number(v) || 0));
  const unit = max >= 1e6 ? { div: 1e6, suf: 'M' } : max >= 1e3 ? { div: 1e3, suf: 'k' } : { div: 1, suf: '' };
  const target = max > 0 ? max / 5 : 1;
  const mag = Math.pow(10, Math.floor(Math.log10(target)));
  const norm = target / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const axisMax = max > 0 ? Math.ceil(max / step) * step : step * 5;
  const stepInUnit = step / unit.div;
  const decimals = stepInUnit >= 1 ? 0 : stepInUnit >= 0.1 ? 1 : 2;
  return {
    max: axisMax,
    interval: step,
    axisLabel: (v) => `${formatFixed(v / unit.div, decimals)}${unit.suf}`,
    valueLabel: (v) => (v > 0 ? `${formatFixed(v / unit.div, 2)}${unit.suf}` : ''),
  };
}
