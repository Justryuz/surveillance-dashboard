import { toNumber } from './googleSheets';
import { matchesYear, matchesCommodityKeyword, matchesCategoryKeyword } from './sheetFilters';

// Note: this tab has no "Bulan" (month) column, so month filters don't
// apply here — only year, category, and commodity.
function filterMarketFlow(rows, { year, commodityKeyword, categoryKeyword }) {
  return rows.filter((row) =>
    matchesYear(row, year) &&
    matchesCommodityKeyword(row, commodityKeyword, 'Jenis_Komoditi') &&
    matchesCategoryKeyword(row, categoryKeyword, 'Kategori_Komoditi')
  );
}

/**
 * Builds the 4-value pieData array [Dalam Daerah, Luar Daerah, Luar Negeri,
 * Eksport] (as percentages summing to 100) that MarketPieChart expects,
 * from the sheet's Lokasi_Saluran_Pasaran / Negara_Pasaran columns.
 * A row counts as "Eksport" if its market destination country isn't
 * Malaysia; otherwise it's bucketed by its Lokasi_Saluran_Pasaran label.
 */
export function computePieData(marketFlowRows, filters) {
  const rows = filterMarketFlow(marketFlowRows, filters);

  let dalam = 0, luar = 0, luarNegeri = 0, eksport = 0;

  for (const row of rows) {
    const weight = toNumber(row.Jumlah_Saluran_Pasaran_Lokasi);
    const negara = String(row.Negara_Pasaran || '').trim().toUpperCase();
    const lokasi = String(row.Lokasi_Saluran_Pasaran || '').trim().toLowerCase();

    if (negara && negara !== 'MALAYSIA') {
      eksport += weight;
    } else if (lokasi.includes('dalam daerah')) {
      dalam += weight;
    } else if (lokasi.includes('luar daerah')) {
      luar += weight;
    } else if (lokasi.includes('luar negeri')) {
      luarNegeri += weight;
    }
    // Rows matching none of the above are left out of the pie rather than
    // guessed into a bucket.
  }

  const total = dalam + luar + luarNegeri + eksport;
  if (total === 0) return null;

  const pct = (v) => Math.round((v / total) * 1000) / 10; // one decimal place
  return [pct(dalam), pct(luar), pct(luarNegeri), pct(eksport)];
}
