/**
 * Shared number-formatting helpers.
 *
 * Anywhere a large value is shown compactly (e.g. "RM 8618.7M"), it should
 * still carry thousand separators on the whole-number part — "RM 8,618.7M".
 * `toFixed()` never adds separators, so this wraps `toLocaleString` with a
 * fixed decimal-place count as a drop-in replacement for `.toFixed(n)`.
 */
export function formatFixed(value, decimals = 1) {
  const num = Number(value);
  if (value === null || value === undefined || Number.isNaN(num)) return (0).toFixed(decimals);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
