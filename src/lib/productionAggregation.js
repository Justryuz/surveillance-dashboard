import { toNumber } from './googleSheets';
import { normalizeNegeriName, ALL_STATES } from './geoNames';
import { matchesYear, matchesMonth, matchesCommodityKeyword, matchesCategoryKeyword, matchesNegeri } from './sheetFilters';

function filterProduction(rows, { year, monthCode, commodityKeyword, categoryKeyword, negeriLabel }) {
  return rows.filter((row) =>
    matchesYear(row, year) &&
    matchesMonth(row, monthCode) &&
    matchesCommodityKeyword(row, commodityKeyword, 'Jenis Komoditi') &&
    matchesCategoryKeyword(row, categoryKeyword, 'Kategori Komoditi') &&
    matchesNegeri(row, negeriLabel, 'Negeri')
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
 * Builds the real category -> commodities tree straight from the sheet,
 * for populating the Kategori / Komoditi filter dropdowns dynamically
 * instead of the old fixed 2-category/3-commodity list.
 * Returns { categories: string[], commoditiesByCategory: { [category]: string[] } },
 * or null if productionRows hasn't loaded yet.
 */
export function computeCategoryCommodityTree(productionRows) {
  if (!productionRows || productionRows.length === 0) return null;

  const commoditiesByCategory = {};
  for (const row of productionRows) {
    const category = String(row['Kategori Komoditi'] || '').trim();
    const commodity = String(row['Jenis Komoditi'] || '').trim();
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
