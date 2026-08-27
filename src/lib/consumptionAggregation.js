import { toNumber } from './googleSheets';
import { normalizeNegeriName } from './geoNames';
import { matchesYear, matchesCommodityKeyword, matchesCategoryKeyword, matchesNegeri } from './sheetFilters';

// Note: this tab has no "Bulan" (month) column — it's state-level annual
// data — so month filters don't apply here.
function filterConsumption(rows, { year, commodityKeyword, categoryKeyword, negeriLabel }) {
  return rows.filter((row) =>
    matchesYear(row, year) &&
    matchesCommodityKeyword(row, commodityKeyword, 'Jenis Komoditi') &&
    matchesCategoryKeyword(row, categoryKeyword, 'Kategori Komoditi') &&
    matchesNegeri(row, negeriLabel, 'Negeri')
  );
}

/** Total consumption in KG across all filtered rows. Returns null (not 0)
 * when nothing matched, so the caller can fall back to the mock value. */
export function computeConsumptionTotalKg(consumptionRows, filters) {
  const rows = filterConsumption(consumptionRows, filters);
  if (rows.length === 0) return null;
  return rows.reduce((sum, row) => sum + toNumber(row['Penggunaan/Kg']), 0);
}

/**
 * Builds the "Penggunaan Utama" top-5 list, in the same unit (MT) as the
 * production list so the two are visually comparable.
 * This tab only has state-level rows (no Daerah/district column), so when
 * a state is selected we distribute that state's real total across its
 * districts using the same weighting the page used before — the state-level
 * number itself is real, only the intra-state split is estimated.
 * Returns null when nothing matched at all, so the caller falls back to mock.
 */
export function computeTop5Penggunaan(consumptionRows, filters, selectedRegion, stateDistrictsMap) {
  const rows = filterConsumption(consumptionRows, filters);
  if (rows.length === 0) return null;
  const totals = new Map();
  for (const row of rows) {
    const negeri = normalizeNegeriName(row.Negeri);
    if (!negeri) continue;
    totals.set(negeri, (totals.get(negeri) || 0) + toNumber(row['Penggunaan/Kg']));
  }

  const toMT = (kg) => Math.round(kg / 1000);

  if (selectedRegion) {
    const stateTotalMT = toMT(totals.get(selectedRegion) || 0);
    const districts = stateDistrictsMap[selectedRegion] || [];
    // No district-level consumption source exists yet — split the real
    // state total across its districts with a mild, deterministic variation
    // (rather than an even split) purely for display purposes.
    const list = districts
      .map((dist, i) => {
        const hash = dist.charCodeAt(0) + dist.charCodeAt(dist.length - 1);
        const weight = 0.28 - i * 0.03 + (hash % 10) / 200;
        return { name: dist, value: Math.round(stateTotalMT * weight) };
      })
      .sort((a, b) => b.value - a.value);
    return { top5Level: 'daerah', list, estimatedSplit: true };
  }

  const list = [...totals.entries()]
    .map(([name, kg]) => ({ name, value: toMT(kg) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  return { top5Level: 'negeri', list, estimatedSplit: false };
}
