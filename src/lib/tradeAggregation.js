import { toNumber } from './googleSheets';
import { matchesYear, matchesMonth, matchesCommodityKeyword, matchesCategoryKeyword } from './sheetFilters';

/**
 * Filters raw sheet rows by year / month / category / commodity keyword.
 * IMPORT/EXPORT don't have a "Kategori Komoditi" column like the supply
 * tabs — "Kumpulan Barangan" is the closest equivalent broad grouping.
 * @param {Array<Object>} rows
 * @param {{ year?: string, monthCode?: string, commodityKeyword?: string, categoryKeyword?: string }} filters
 */
function filterRows(rows, { year, monthCode, commodityKeyword, categoryKeyword }) {
  return rows.filter((row) =>
    matchesYear(row, year, 'Tahun') &&
    matchesMonth(row, monthCode, 'Bulan') &&
    matchesCommodityKeyword(row, commodityKeyword, 'Jenis Komoditi') &&
    matchesCategoryKeyword(row, categoryKeyword, 'Kumpulan Barangan')
  );
}

/**
 * Aggregates filtered rows into a { total, top5, others } shape by country,
 * matching what HalamanUtama.jsx's globalTradeStats.import / .export expects.
 * Values are converted from raw RM to RM millions to match the existing
 * `.toFixed(1)}M` display in the UI.
 */
function aggregateByCountry(rows) {
  const totalsByCountry = new Map();
  let grandTotal = 0;

  for (const row of rows) {
    const country = row.Negara || 'TIDAK DIKETAHUI';
    const value = toNumber(row['Nilai (RM)']);
    totalsByCountry.set(country, (totalsByCountry.get(country) || 0) + value);
    grandTotal += value;
  }

  const sorted = [...totalsByCountry.entries()].sort((a, b) => b[1] - a[1]);
  const top5Entries = sorted.slice(0, 5);
  const otherEntries = sorted.slice(5);
  const othersTotal = otherEntries.reduce((sum, [, v]) => sum + v, 0);

  const toMillions = (v) => v / 1_000_000;
  const pct = (v) => (grandTotal > 0 ? (v / grandTotal) * 100 : 0);

  return {
    total: toMillions(grandTotal),
    top5: top5Entries.map(([name, value], i) => ({
      rank: i + 1,
      name: toTitleCase(name),
      value: toMillions(value),
      percent: pct(value),
    })),
    others: {
      value: toMillions(othersTotal),
      percent: pct(othersTotal),
    },
  };
}

function toTitleCase(str) {
  return String(str)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Builds the same shape HalamanUtama.jsx already renders for the
 * "MALAYSIA perspective" (default) view of Insight Perdagangan, computed
 * from real IMPORT/EXPORT rows instead of mock numbers.
 *
 * @param {Array<Object>} importRows
 * @param {Array<Object>} exportRows
 * @param {{ year: string, monthLabel?: string, commodityKeyword?: string }} filters
 */
export function computeGlobalTradeStats(importRows, exportRows, filters) {
  const filteredImports = filterRows(importRows, filters);
  const filteredExports = filterRows(exportRows, filters);

  return {
    perspective: 'MALAYSIA',
    countryName: 'Malaysia',
    import: aggregateByCountry(filteredImports),
    export: aggregateByCountry(filteredExports),
  };
}

/**
 * Total quantity (converted to MT) across filtered rows — used for the
 * "Import" / "Eksport" KPI numbers. The sheet's Kuantiti is already in the
 * unit given by its "Unit" column, which is consistently TONNE in the
 * sample data; if your sheet mixes units this sums them as-is. */
export function computeQuantityTotal(rows, filters) {
  const filtered = filterRows(rows, filters);
  return filtered.reduce((sum, row) => sum + toNumber(row.Kuantiti), 0);
}

function sumByCountryRaw(rows) {
  const value = new Map(); // uppercased raw "Negara" -> RM
  const qty = new Map(); // uppercased raw "Negara" -> quantity
  for (const row of rows) {
    const country = String(row.Negara || '').trim().toUpperCase();
    if (!country) continue;
    value.set(country, (value.get(country) || 0) + toNumber(row['Nilai (RM)']));
    qty.set(country, (qty.get(country) || 0) + toNumber(row.Kuantiti));
  }
  return { value, qty };
}

/**
 * Builds real per-country { imp, exp, qtyImp, qtyExp } stats for the world
 * flow map (MalaysiaFlowMap), keyed by the display names that component
 * already uses (e.g. "China", "Amerika Syarikat"). `countryKeywordMap` maps
 * each display name to an array of uppercase substrings to match against
 * the sheet's raw "Negara" values (which use full customs names like
 * "CHINA, PEOPLE'S REPUBLIC OF").
 * A country is omitted entirely if neither IMPORT nor EXPORT has any
 * matching rows, so the map can fall back to its own mock for that one
 * country rather than showing a fake zero.
 */
export function computeCountryTradeStats(importRows, exportRows, filters, countryKeywordMap) {
  const impTotals = sumByCountryRaw(filterRows(importRows, filters));
  const expTotals = sumByCountryRaw(filterRows(exportRows, filters));

  const findTotal = (totals, keywords) => {
    let sum = 0;
    let matched = false;
    for (const [rawName, val] of totals.entries()) {
      if (keywords.some((kw) => rawName.includes(kw))) {
        sum += val;
        matched = true;
      }
    }
    return matched ? sum : null;
  };

  const result = {};
  for (const [displayName, keywords] of Object.entries(countryKeywordMap)) {
    const impValue = findTotal(impTotals.value, keywords);
    const expValue = findTotal(expTotals.value, keywords);
    if (impValue == null && expValue == null) continue;
    result[displayName] = {
      imp: impValue != null ? impValue / 1_000_000 : null,
      exp: expValue != null ? expValue / 1_000_000 : null,
      qtyImp: findTotal(impTotals.qty, keywords),
      qtyExp: findTotal(expTotals.qty, keywords),
    };
  }
  return result;
}
