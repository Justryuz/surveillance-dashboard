import { toNumber } from './googleSheets';
import { matchesYear } from './sheetFilters';
import { normalizeMonth } from './monthUtils';

/** Builds a lookup from Malaysian port code -> route mode (LAUT/DARAT/UDARA)
 * using the REF_PORT tab's "Port Group Malay" column. */
function buildPortToRouteMap(refPortRows) {
  const map = new Map();
  for (const row of refPortRows) {
    const codes = [row['Port Raw'], row['Port Raw Clean']]
      .filter(Boolean)
      .map((c) => String(c).trim().toUpperCase());
    const route = String(row['Port Group Malay'] || '').trim();
    for (const code of codes) {
      if (code) map.set(code, route);
    }
  }
  return map;
}

function matchesCommodity(row, commodityCode, commodityKeywords) {
  if (!commodityCode) return true;
  const config = commodityKeywords[commodityCode];
  if (!config) return true;
  const text = String(row.HS_CODE_DESCRIPTION || '').toLowerCase();
  return config.english.some((kw) => text.includes(kw.toLowerCase()));
}

/**
 * Builds { importRoutes, exportRoutes } — each an array of
 * { value: percent, name: 'Laut' | 'Darat' | 'Udara' } summing to 100 —
 * by joining TRADE_LOGISTIC rows to REF_PORT via the Malaysian port code.
 */
export function computeRouteSplits(tradeLogisticRows, refPortRows, filters, commodityKeywords) {
  const portToRoute = buildPortToRouteMap(refPortRows);
  const { year, monthCode, commodityCode } = filters;

  const totals = { IMPORT: { Laut: 0, Darat: 0, Udara: 0 }, EXPORT: { Laut: 0, Darat: 0, Udara: 0 } };

  for (const row of tradeLogisticRows) {
    if (!matchesYear(row, year, 'YEAR')) continue;
    if (monthCode && normalizeMonth(row.MONTH_NAME) !== monthCode) continue;
    if (!matchesCommodity(row, commodityCode, commodityKeywords)) continue;

    const tradeType = String(row.TRADE_TYPE || '').trim().toUpperCase();
    if (tradeType !== 'IMPORT' && tradeType !== 'EXPORT') continue;

    const portCode = String(row.MALAYSIA_PORT || '').trim().toUpperCase();
    const routeRaw = (portToRoute.get(portCode) || '').toUpperCase();
    const routeName = routeRaw === 'LAUT' ? 'Laut' : routeRaw === 'DARAT' ? 'Darat' : routeRaw === 'UDARA' ? 'Udara' : null;
    if (!routeName) continue; // unmatched port code — skip rather than guess

    totals[tradeType][routeName] += toNumber(row.TOTAL_VALUE_MYR);
  }

  const toPercentArray = (bucket) => {
    const sum = bucket.Laut + bucket.Darat + bucket.Udara;
    if (sum === 0) return null;
    const pct = (v) => Math.round((v / sum) * 1000) / 10;
    return [
      { value: pct(bucket.Laut), name: 'Laut' },
      { value: pct(bucket.Darat), name: 'Darat' },
      { value: pct(bucket.Udara), name: 'Udara' },
    ];
  };

  return {
    importRoutes: toPercentArray(totals.IMPORT),
    exportRoutes: toPercentArray(totals.EXPORT),
  };
}
