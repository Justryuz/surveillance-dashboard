import { toNumber } from './googleSheets';
import { matchesYear } from './sheetFilters';
import { normalizeMonth } from './monthUtils';
import { normalizeNegeriName } from './geoNames';

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

/** Builds a lookup from Malaysian port code -> the state it's in, using
 * REF_PORT's "State" column. */
function buildPortToStateMap(refPortRows) {
  const map = new Map();
  for (const row of refPortRows) {
    const codes = [row['Port Raw'], row['Port Raw Clean']]
      .filter(Boolean)
      .map((c) => String(c).trim().toUpperCase());
    const state = normalizeNegeriName(row.State);
    for (const code of codes) {
      if (code && state) map.set(code, state);
    }
  }
  return map;
}

function buildPortToNameMap(refPortRows) {
  const map = new Map();
  for (const row of refPortRows) {
    const codes = [row['Port Raw'], row['Port Raw Clean']].filter(Boolean).map((c) => String(c).trim().toUpperCase());
    const name = String(row['Port Clean'] || '').trim();
    for (const code of codes) if (code && name) map.set(code, name);
  }
  return map;
}

function normKey(str) {
  return String(str || '').trim().toUpperCase();
}

/** Exact (normalized) match. TRADE_LOGISTIC's JENIS_KOMODITI field is now
 * standardized through REF_KOMODITI before this ever runs (see
 * komoditiStandardization.js), so it carries the same canonical name as
 * every other sheet — an exact match is correct and safer than the old
 * "loose" one (which matched on a shared leading word, e.g. "CILI MERAH"
 * / "CILI KERING" both starting with "CILI") that used to also falsely
 * match genuinely different commodities sharing a word, like "Durian"
 * and "Durian Belanda" (soursop — not a variety of durian at all). */
function looselyMatchesCommodity(rowValue, keyword) {
  if (!keyword) return true;
  const a = normKey(rowValue);
  const b = normKey(keyword);
  if (!a) return false;
  return a === b;
}

/** Shared row-level filter for TRADE_LOGISTIC: year, month, commodity
 * (via the real JENIS_KOMODITI column — the same Malay taxonomy used by
 * PRODUCTION/IMPORT/EXPORT, matched loosely in both directions since the
 * two tabs don't always use the same granularity), and trade type
 * (IMPORT/EXPORT, or omit to allow both). */
function filterTradeLogistic(rows, { year, monthCode, commodityKeyword, tradeType }) {
  return rows.filter((row) => {
    if (!matchesYear(row, year, 'YEAR')) return false;
    if (monthCode && normalizeMonth(row.MONTH_NAME) !== monthCode) return false;
    if (!looselyMatchesCommodity(row.JENIS_KOMODITI, commodityKeyword)) return false;
    if (tradeType && String(row.TRADE_TYPE || '').trim().toUpperCase() !== tradeType) return false;
    return true;
  });
}

/**
 * Builds { importRoutes, exportRoutes } — each an array of
 * { value: percent, name: 'Laut' | 'Darat' | 'Udara' } summing to 100 —
 * by joining TRADE_LOGISTIC rows to REF_PORT via the Malaysian port code.
 */
export function computeRouteSplits(tradeLogisticRows, refPortRows, filters) {
  const portToRoute = buildPortToRouteMap(refPortRows);
  const rows = filterTradeLogistic(tradeLogisticRows, filters);

  const totals = { IMPORT: { Laut: 0, Darat: 0, Udara: 0 }, EXPORT: { Laut: 0, Darat: 0, Udara: 0 } };

  for (const row of rows) {
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

  const importResult = toPercentArray(totals.IMPORT);
  const exportResult = toPercentArray(totals.EXPORT);

  if ((!exportResult || !importResult) && tradeLogisticRows.length > 0) {
    // Deeper diagnostic: `rows` already came back empty (or with no
    // matched ports) for one or both sides — walk the UNFILTERED sheet
    // stage by stage (year -> month -> commodity -> trade type) so a
    // mismatched column name/value on a newly-swapped source sheet shows
    // up directly, instead of just "0 rows after everything".
    const sample = tradeLogisticRows[0] || {};
    const passYear = tradeLogisticRows.filter((r) => matchesYear(r, filters.year, 'YEAR'));
    const passMonth = passYear.filter((r) => !filters.monthCode || normalizeMonth(r.MONTH_NAME) === filters.monthCode);
    const passCommodity = passMonth.filter((r) => looselyMatchesCommodity(r.JENIS_KOMODITI, filters.commodityKeyword));
    const knownPortCodes = [...portToRoute.keys()];
    const portCodesSeenAfterCommodity = [...new Set(passCommodity.map((r) => String(r.MALAYSIA_PORT || '').trim().toUpperCase()))];
    console.warn(
      '[logisticsAggregation] computeRouteSplits: import and/or export routes empty.\n' +
      'filters: ' + JSON.stringify(filters) + '\n' +
      'totalRowsInSheet: ' + tradeLogisticRows.length + '\n' +
      'sampleKeys: ' + JSON.stringify(Object.keys(sample)) + '\n' +
      'sampleRow: ' + JSON.stringify(sample) + '\n' +
      'afterYearFilter: ' + passYear.length + ' (distinctYEARvalues: ' + JSON.stringify([...new Set(tradeLogisticRows.slice(0, 500).map((r) => r.YEAR))]) + ')\n' +
      'afterMonthFilter: ' + passMonth.length + '\n' +
      'afterCommodityFilter: ' + passCommodity.length + ' (distinctJENIS_KOMODITI sample: ' + JSON.stringify([...new Set(passMonth.slice(0, 30).map((r) => r.JENIS_KOMODITI))]) + ')\n' +
      'distinctTRADE_TYPEafterCommodity: ' + JSON.stringify([...new Set(passCommodity.map((r) => r.TRADE_TYPE))]) + '\n' +
      'portCodesSeenAfterCommodity: ' + JSON.stringify(portCodesSeenAfterCommodity.slice(0, 20)) + '\n' +
      'knownPortCodesInRefPort: ' + JSON.stringify(knownPortCodes.slice(0, 20)) + ' (total ' + knownPortCodes.length + ')'
    );
  }

  return {
    importRoutes: importResult,
    exportRoutes: exportResult,
  };
}

/**
 * External-supply/-demand quantity+value attributed to each Malaysian
 * state, by joining TRADE_LOGISTIC's port code to REF_PORT's "State"
 * column (i.e. "how much import/export passes through ports located in
 * this state"). tradeType: 'IMPORT' (default) or 'EXPORT'.
 * Returns null if nothing matched.
 */
export function computeImportByEntryState(tradeLogisticRows, refPortRows, filters, tradeType = 'IMPORT') {
  const portToState = buildPortToStateMap(refPortRows);
  const rows = filterTradeLogistic(tradeLogisticRows, { ...filters, tradeType });

  const totals = new Map(); // state -> { value, qty }
  for (const row of rows) {
    const portCode = String(row.MALAYSIA_PORT || '').trim().toUpperCase();
    const state = portToState.get(portCode);
    if (!state) continue; // unmatched port — skip rather than guess

    const entry = totals.get(state) || { value: 0, qty: 0 };
    entry.value += toNumber(row.TOTAL_VALUE_MYR);
    entry.qty += toNumber(row.TOTAL_QUANTITY_MT);
    totals.set(state, entry);
  }

  if (totals.size === 0) return null;
  return [...totals.entries()].map(([name, { value, qty }]) => ({ name, value, qty }));
}

/**
 * Top-N Malaysian ports by import/export quantity (MT), as { pelabuhan,
 * pct }. Joins TRADE_LOGISTIC's port code to REF_PORT's clean display name
 * ("Port Clean"). tradeType: 'IMPORT' (default) or 'EXPORT'.
 */
export function computeTopPorts(tradeLogisticRows, refPortRows, filters, limit = 10, tradeType = 'IMPORT') {
  const portToName = buildPortToNameMap(refPortRows);
  const rows = filterTradeLogistic(tradeLogisticRows, { ...filters, tradeType });

  const totals = new Map(); // port name -> qty
  for (const row of rows) {
    const portCode = String(row.MALAYSIA_PORT || '').trim().toUpperCase();
    const name = portToName.get(portCode);
    if (!name) continue;
    totals.set(name, (totals.get(name) || 0) + toNumber(row.TOTAL_QUANTITY_MT));
  }

  const grandTotal = [...totals.values()].reduce((s, v) => s + v, 0);
  if (grandTotal === 0) return null;
  return [...totals.entries()]
    .map(([pelabuhan, qty]) => ({ pelabuhan, pct: Math.round((qty / grandTotal) * 1000) / 10 }))
    .sort((a, b) => a.pct - b.pct) // ascending, matching the original mock's bottom-to-top bar order
    .slice(-limit);
}

/**
 * Real import/export transaction detail rows for the BUTIRAN TRANSAKSI
 * table — joins TRADE_LOGISTIC to REF_PORT for the state/port/route
 * columns. "komoditi" uses the real JENIS_KOMODITI column, falling back to
 * the English HS_CODE_DESCRIPTION only if that's ever blank for a row.
 * "negara" is the trade partner country — ORIGIN_COUNTRY for imports,
 * DESTINATION_COUNTRY for exports.
 * Returns { rows, totalQty, totalRM } (rows limited to `limit`, but the
 * totals reflect ALL matching rows, not just the ones shown), or null if
 * nothing matched.
 */
export function computeImportTransactionDetails(tradeLogisticRows, refPortRows, filters, limit = 20, tradeType = 'IMPORT') {
  const portToState = buildPortToStateMap(refPortRows);
  const portToName = buildPortToNameMap(refPortRows);
  const portToRoute = buildPortToRouteMap(refPortRows);
  const rows = filterTradeLogistic(tradeLogisticRows, { ...filters, tradeType });
  const countryField = tradeType === 'EXPORT' ? 'DESTINATION_COUNTRY' : 'ORIGIN_COUNTRY';

  if (rows.length === 0 && tradeLogisticRows.length > 0) {
    // Diagnostic: nothing matched even though the sheet loaded rows —
    // log what a raw row actually looks like as plain text (not a
    // collapsible object) so a column-name/format mismatch can be spotted
    // directly by reading the console, no clicking-to-expand needed.
    const sample = tradeLogisticRows[0] || {};
    console.warn(
      '[logisticsAggregation] computeImportTransactionDetails matched 0 rows.\n' +
      'totalRows: ' + tradeLogisticRows.length + '\n' +
      'filters: ' + JSON.stringify({ ...filters, tradeType }) + '\n' +
      'sampleKeys: ' + JSON.stringify(Object.keys(sample)) + '\n' +
      'sampleRow: ' + JSON.stringify(sample) + '\n' +
      'distinctTradeTypes: ' + JSON.stringify([...new Set(tradeLogisticRows.slice(0, 500).map((r) => r.TRADE_TYPE))]) + '\n' +
      'distinctYears: ' + JSON.stringify([...new Set(tradeLogisticRows.slice(0, 500).map((r) => r.YEAR))])
    );
  }

  // Group rows that share the same commodity/country/state/port/route into
  // one summed line — several sheet rows can represent the same real-world
  // combination (e.g. multiple Thailand -> Perak -> Kroh Checkpoint durian
  // shipments), and the table should show one combined total for those
  // rather than a separate line per underlying sheet row.
  const grouped = new Map(); // "KOMODITI|NEGARA|NEGERI|PELABUHAN|JENIS" -> aggregated entry
  let totalQty = 0;
  let totalRM = 0;

  for (const row of rows) {
    const portCode = String(row.MALAYSIA_PORT || '').trim().toUpperCase();
    const qty = toNumber(row.TOTAL_QUANTITY_MT);
    const rm = toNumber(row.TOTAL_VALUE_MYR);
    totalQty += qty;
    totalRM += rm;

    const komoditi = row.JENIS_KOMODITI || row.HS_CODE_DESCRIPTION || 'Tidak Diketahui';
    const negara = row[countryField] || 'Tidak Diketahui';
    const negeri = portToState.get(portCode) || '—';
    const pelabuhan = portToName.get(portCode) || row.MALAYSIA_PORT || '—';
    const jenis = (portToRoute.get(portCode) || '—').toUpperCase();

    const key = [komoditi, negara, negeri, pelabuhan, jenis].join('|').toUpperCase();
    const entry = grouped.get(key);
    if (entry) {
      entry.qty += qty;
      entry.rm += rm;
    } else {
      grouped.set(key, { komoditi, negara, qty, rm, negeri, pelabuhan, jenis });
    }
  }

  if (grouped.size === 0) return null;
  const matched = [...grouped.values()].sort((a, b) => b.qty - a.qty);
  return { rows: matched.slice(0, limit), totalQty, totalRM };
}

/**
 * Top N real (Malaysian entry/exit state -> trade partner country) flows,
 * by value — e.g. Thailand mostly entering via Kedah, Indonesia via Johor
 * (import), or Singapore mostly exiting via Johor (export). Replaces the
 * old fixed/decorative country-to-state lines with real ones.
 * tradeType: 'IMPORT' (default) or 'EXPORT'. Returns null if nothing matched.
 */
export function computeTopCountryStateFlows(tradeLogisticRows, refPortRows, filters, limit = 5, tradeType = 'IMPORT') {
  const portToState = buildPortToStateMap(refPortRows);
  const rows = filterTradeLogistic(tradeLogisticRows, { ...filters, tradeType });
  const countryField = tradeType === 'EXPORT' ? 'DESTINATION_COUNTRY' : 'ORIGIN_COUNTRY';

  const totals = new Map(); // "COUNTRY|STATE" -> { country, state, value }
  for (const row of rows) {
    const portCode = String(row.MALAYSIA_PORT || '').trim().toUpperCase();
    const state = portToState.get(portCode);
    const country = String(row[countryField] || '').trim();
    if (!state || !country) continue;

    const key = `${country}|${state}`;
    const entry = totals.get(key) || { country, state, value: 0 };
    entry.value += toNumber(row.TOTAL_VALUE_MYR);
    totals.set(key, entry);
  }

  if (totals.size === 0) return null;
  return [...totals.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}
