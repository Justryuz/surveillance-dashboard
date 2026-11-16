import { toNumber } from './googleSheets';
import { normalizeNegeriName, ALL_STATES } from './geoNames';
import { daerahOf } from './consumptionAggregation';
import { matchesYear, matchesMonth, matchesCommodityKeyword, matchesCategoryKeyword, matchesNegeri } from './sheetFilters';

function matchesDaerah(row, daerahLabel, field = 'Daerah') {
  if (!daerahLabel) return true;
  return String(row[field] || '').trim().toUpperCase() === String(daerahLabel).trim().toUpperCase();
}

function filterProduction(rows, { year, monthCode, commodityKeyword, categoryKeyword, negeriLabel, daerahLabel }) {
  return rows.filter((row) =>
    matchesYear(row, year) &&
    matchesMonth(row, monthCode) &&
    matchesCommodityKeyword(row, commodityKeyword, 'Standard Jenis Komoditi') &&
    matchesCategoryKeyword(row, categoryKeyword, 'Kategori Komoditi') &&
    matchesNegeri(row, negeriLabel, 'Negeri') &&
    matchesDaerah(row, daerahLabel, 'Daerah')
  );
}

function sumBy(rows, keyFn, valueField = 'Pengeluaran') {
  const totals = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    totals.set(key, (totals.get(key) || 0) + toNumber(row[valueField]));
  }
  return totals;
}

/** Total production (MT) across all filtered rows — used for the
 * "Pengeluaran" KPI number and the pie chart's center total.
 * Returns null (rather than 0) when nothing matched, so the caller can
 * fall back to the mock value instead of displaying a dead zero. */
export function computeProductionTotal(productionRows, filters) {
  const rows = filterProduction(productionRows, filters);
  if (rows.length === 0) return null;
  return rows.reduce((sum, row) => sum + toNumber(row.Pengeluaran), 0);
}

/** The unit ("MT" or "JUTA BIJI") for the filtered production rows, read
 * from PRODUCTION's own "Unit" column rather than assumed — different
 * commodities are recorded in different units (e.g. fruit by weight vs.
 * coconuts/eggs by count). When the current filters span rows with more
 * than one unit (e.g. "Semua Komoditi" mixing weight- and count-based
 * commodities), the most common unit among the matched rows is returned.
 * Returns null when nothing matched, so the caller can fall back to a
 * default label. */
export function computeProductionUnit(productionRows, filters) {
  const rows = filterProduction(productionRows, filters);
  if (rows.length === 0) return null;
  const counts = new Map();
  for (const row of rows) {
    const unit = String(row.Unit || '').trim();
    if (!unit) continue;
    counts.set(unit, (counts.get(unit) || 0) + 1);
  }
  if (counts.size === 0) return null;
  let best = null;
  for (const [unit, count] of counts.entries()) {
    if (!best || count > best.count) best = { unit, count };
  }
  return best.unit;
}

/** Builds map data (name/value pairs) for the choropleth map — grouped by
 * state, or by district when mapViewMode === 'district'.
 * Returns null when no rows matched the current filters at all (e.g. the
 * selected year/month/commodity combo doesn't exist yet in this tab), so
 * the page falls back to the mock map instead of showing every state at 0. */
export function computeMapData(productionRows, filters, mapViewMode) {
  const rows = filterProduction(productionRows, filters);
  if (rows.length === 0) return null;

  if (mapViewMode === 'district') {
    const totals = sumBy(rows, (row) => row.Daerah?.trim(), 'Pengeluaran');
    return [...totals.entries()].map(([name, value]) => ({
      name: toTitleCase(name),
      value: Math.round(value),
    }));
  }
  const totals = sumBy(rows, (row) => normalizeNegeriName(row.Negeri), 'Pengeluaran');
  // Always include all 14 states (even at 0) so the map doesn't look broken
  // for states with no matching production rows under the current filters.
  return ALL_STATES.map((name) => ({
    name,
    value: Math.round(totals.get(name) || 0),
  }));
}

/** Total production VALUE (RM) across all filtered rows — the "Nilai
 * Pengeluaran" KPI. Returns null when nothing matched. */
export function computeProductionValueTotal(productionRows, filters) {
  const rows = filterProduction(productionRows, filters);
  if (rows.length === 0) return null;
  return rows.reduce((sum, row) => sum + toNumber(row.Nilai), 0);
}

/**
 * Real per-state production values for MalaysiaPengeluaranMap's bubbles —
 * { name, value } for every state with any production, using the same
 * PRODUCTION-tab filtering as the rest of the app. Returns null if nothing
 * matched, so the caller falls back to mock.
 */
export function computeProductionByState(productionRows, filters) {
  const rows = filterProduction(productionRows, filters);
  if (rows.length === 0) return null;
  const totals = sumBy(rows, (row) => normalizeNegeriName(row.Negeri), 'Pengeluaran');
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value: Math.round(value) }));
}

/**
 * Builds a top-5 production list with qty (MT), qty share %, and RM value
 * — matching the { lokasi, qty, qtyPct, nilai } shape Pembekalan.jsx uses.
 * Grouped by Negeri, or by Daerah when a single negeri is already filtered
 * to (so drilling into one state shows its districts instead).
 * Returns null when nothing matched.
 */
export function computeTop5PengeluaranDetailed(productionRows, filters) {
  const rows = filterProduction(productionRows, filters);
  if (rows.length === 0) return null;

  const groupByDaerah = !!filters.negeriLabel;
  const totals = new Map(); // key -> { qty, nilai }
  for (const row of rows) {
    const key = groupByDaerah ? row.Daerah?.trim() : normalizeNegeriName(row.Negeri);
    if (!key) continue;
    const entry = totals.get(key) || { qty: 0, nilai: 0 };
    entry.qty += toNumber(row.Pengeluaran);
    entry.nilai += toNumber(row.Nilai);
    totals.set(key, entry);
  }

  const grandTotalQty = [...totals.values()].reduce((s, e) => s + e.qty, 0);
  const list = [...totals.entries()]
    .map(([name, { qty, nilai }]) => ({
      lokasi: groupByDaerah ? toTitleCase(name) : name,
      qty,
      qtyPct: grandTotalQty > 0 ? (qty / grandTotalQty) * 100 : 0,
      nilai,
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return list;
}

/**
 * Builds the "Pengeluaran Utama" top-5 list.
 * - Default (no state selected): top 5 states by production.
 * - Drilled into a state (selectedRegion set): top 5 districts within it.
 * Returns null when no rows matched at all, so the caller falls back to mock.
 */
export function computeTop5Pengeluaran(productionRows, filters, selectedRegion) {
  const rows = filterProduction(productionRows, filters);
  if (rows.length === 0) return null;

  if (selectedRegion) {
    const inState = rows.filter((row) => normalizeNegeriName(row.Negeri) === selectedRegion);
    const totals = sumBy(inState, (row) => row.Daerah?.trim(), 'Pengeluaran');
    return {
      top5Level: 'daerah',
      list: [...totals.entries()]
        .map(([name, value]) => ({ name: toTitleCase(name), value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    };
  }

  const totals = sumBy(rows, (row) => normalizeNegeriName(row.Negeri), 'Pengeluaran');
  return {
    top5Level: 'negeri',
    list: [...totals.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
  };
}

function toTitleCase(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Builds the real negeri -> daerah tree straight from PRODUCTION, for
 * populating the NEGERI / DAERAH filter dropdowns dynamically instead of
 * a fixed hardcoded list (Pembekalan.jsx originally only listed 6
 * states / 5 districts as an example set).
 * Returns { negeriList: string[], daerahByNegeri: { [negeri]: string[] } }.
 */
export function computeNegeriDaerahTree(productionRows, extraRows = []) {
  if (!productionRows || productionRows.length === 0) return null;

  // Every canonical Negeri is always offered (so W.P. Kuala Lumpur, W.P.
  // Putrajaya and W.P. Labuan show even when PRODUCTION has no rows for
  // them); real Daerah values come from the data. extraRows (e.g. the
  // consumption sheet) add Negeri/Daerah pairs PRODUCTION doesn't have.
  const daerahByNegeri = {};
  for (const name of ALL_STATES) daerahByNegeri[name] = new Set();
  const add = (rawNegeri, rawDaerah) => {
    const negeri = normalizeNegeriName(rawNegeri);
    if (!negeri) return;
    if (!daerahByNegeri[negeri]) daerahByNegeri[negeri] = new Set();
    const daerah = String(rawDaerah || '').trim();
    if (daerah) daerahByNegeri[negeri].add(toTitleCase(daerah));
  };
  for (const row of productionRows) add(row.Negeri, row.Daerah);
  for (const row of extraRows || []) add(row.Negeri, daerahOf(row, normalizeNegeriName(row.Negeri)));

  const negeriList = Object.keys(daerahByNegeri).sort();
  const result = {};
  for (const negeri of negeriList) {
    result[negeri] = [...daerahByNegeri[negeri]].sort();
  }
  return { negeriList, daerahByNegeri: result };
}

/** Flat, de-duplicated, sorted list of every commodity in PRODUCTION —
 * for the KOMODITI dropdown (Pembekalan.jsx has no separate Kategori
 * selector, so this doesn't need the category grouping). */
export function computeAllCommodities(productionRows) {
  if (!productionRows || productionRows.length === 0) return null;
  const set = new Set();
  for (const row of productionRows) {
    const c = String(row['Standard Jenis Komoditi'] || '').trim();
    if (c) set.add(c);
  }
  return [...set].sort();
}

/**
 * Builds the real category -> commodities tree straight from the sheet,
 * for populating the Kategori / Komoditi filter dropdowns dynamically
 * instead of the old fixed 2-category/3-commodity list.
 * Returns { categories: string[], commoditiesByCategory: { [category]: string[] } },
 * or null if productionRows hasn't loaded yet.
 */
export function computeCategoryCommodityTree(productionRows, filters = {}) {
  if (!productionRows || productionRows.length === 0) return null;

  // Scope the tree to the currently selected Tahun/Bulan/Negeri (but not
  // Kategori/Komoditi — those are what this tree itself decides) so the
  // Kategori/Komoditi dropdowns never offer a combination that has zero
  // PRODUCTION rows under the filters already in effect.
  const scopedRows = filterProduction(productionRows, {
    year: filters.year,
    monthCode: filters.monthCode,
    negeriLabel: filters.negeriLabel,
    daerahLabel: filters.daerahLabel,
  });

  if (filters.year && scopedRows.length < productionRows.length * 0.2) {
    // Diagnostic: the Tahun filter alone dropped most/all PRODUCTION rows —
    // log the actual distinct Tahun values in the sheet as plain text so a
    // genuine data gap (most rows simply aren't tagged with this year) can
    // be told apart from a format mismatch (e.g. "2025" vs "2025.0").
    console.warn(
      '[productionAggregation] computeCategoryCommodityTree scoped down to ' + scopedRows.length + ' of ' + productionRows.length + ' rows.\n' +
      'filters: ' + JSON.stringify(filters) + '\n' +
      'distinctYears: ' + JSON.stringify([...new Set(productionRows.map((r) => r.Tahun))]) + '\n' +
      'categoriesInScopedRows: ' + JSON.stringify([...new Set(scopedRows.map((r) => r['Kategori Komoditi']))])
    );
  }

  const commoditiesByCategory = {};
  for (const row of scopedRows) {
    const category = String(row['Kategori Komoditi'] || '').trim();
    const commodity = String(row['Standard Jenis Komoditi'] || '').trim();
    if (!category || !commodity) continue;
    if (!commoditiesByCategory[category]) commoditiesByCategory[category] = new Set();
    commoditiesByCategory[category].add(commodity);
  }

  const categories = Object.keys(commoditiesByCategory).sort();
  const result = {};
  for (const category of categories) {
    result[category] = [...commoditiesByCategory[category]].sort();
  }
  return { categories, commoditiesByCategory: result };
}

/**
 * Flat (negeri, daerah, value) production list — used to weight how a
 * state's real consumption total should be distributed across its real
 * districts on MalaysiaPenggunaanMap (no direct consumption-by-district
 * source exists, so district-level production share is used as the best
 * available real proxy for local economic/agricultural activity).
 * Returns null if nothing matched.
 */
export function computeProductionByStateDistrict(productionRows, filters) {
  const rows = filterProduction(productionRows, filters);
  if (rows.length === 0) return null;

  const totals = new Map(); // "NEGERI|DAERAH" -> value
  for (const row of rows) {
    const negeri = normalizeNegeriName(row.Negeri);
    const daerah = row.Daerah?.trim();
    if (!negeri || !daerah) continue;
    const key = `${negeri}|${daerah}`;
    totals.set(key, (totals.get(key) || 0) + toNumber(row.Pengeluaran));
  }

  if (totals.size === 0) return null;
  return [...totals.entries()].map(([key, value]) => {
    const [negeri, daerah] = key.split('|');
    return { negeri, daerah: toTitleCase(daerah), value };
  });
}
