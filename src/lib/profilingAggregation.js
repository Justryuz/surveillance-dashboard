import { normalizeNegeriName } from './geoNames';

function normKey(str) {
  return String(str || '').trim().toUpperCase();
}

/**
 * Builds a No_Siri_Borang -> producer Negeri lookup from PROFILING_PENGELUAR,
 * used to join MARKET_FLOW rows (which only record the market
 * DESTINATION's state) back to the actual PRODUCER's state.
 */
export function computeFormToNegeriMap(profilingRows) {
  const map = new Map();
  for (const row of profilingRows) {
    const formId = normKey(row.No_Siri_Borang);
    const negeri = normalizeNegeriName(row.Negeri);
    if (formId && negeri) map.set(formId, negeri);
  }
  return map;
}

/** Same idea, but for the producer's Daerah (district). */
export function computeFormToDaerahMap(profilingRows) {
  const map = new Map();
  for (const row of profilingRows) {
    const formId = normKey(row.No_Siri_Borang);
    const daerah = String(row.Daerah || '').trim();
    if (formId && daerah) map.set(formId, daerah);
  }
  return map;
}
