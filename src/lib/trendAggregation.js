import { toNumber } from './googleSheets';
import { matchesCommodityKeyword, matchesCategoryKeyword, matchesNegeri } from './sheetFilters';
import { normalizeMonth } from './monthUtils';
import { isIsiRumahSegment, daerahOf, districtKey, POPULASI_COLUMN } from './consumptionAggregation';
import { normalizeNegeriName } from './geoNames';

function matchesDaerah(row, daerahLabel, field = 'Daerah') {
  if (!daerahLabel) return true;
  return String(row[field] || '').trim().toUpperCase() === String(daerahLabel).trim().toUpperCase();
}

/**
 * Yearly production-vs-import trend (in MT) for the given years, applying
 * commodity/category/negeri/daerah filters but ignoring year/month (since
 * this IS the year-over-year comparison). Returns null if neither year has
 * any matching rows in either tab, so the caller can fall back to mock.
 */
export function computeYearlyTrend(productionRows, importRows, years, filters) {
  const { commodityKeyword, categoryKeyword, negeriLabel, daerahLabel } = filters;
  const result = {};
  let anyMatch = false;

  for (const year of years) {
    const prodRows = productionRows.filter((row) =>
      String(row.Tahun).trim() === String(year) &&
      matchesCommodityKeyword(row, commodityKeyword, 'Jenis Komoditi') &&
      matchesCategoryKeyword(row, categoryKeyword, 'Kategori Komoditi') &&
      matchesNegeri(row, negeriLabel, 'Negeri') &&
      matchesDaerah(row, daerahLabel, 'Daerah')
    );
    const impRows = importRows.filter((row) =>
      String(row.Tahun).trim() === String(year) &&
      matchesCommodityKeyword(row, commodityKeyword, 'Standard Jenis Komoditi')
      // Note: IMPORT tab has no Negeri/Daerah (it's a country-of-origin
      // tab), so negeri/daerah filters only narrow the production side here.
    );
    if (prodRows.length > 0 || impRows.length > 0) anyMatch = true;

    result[`y${year}`] = {
      pengeluaran: prodRows.reduce((s, r) => s + toNumber(r.Pengeluaran), 0),
      import: impRows.reduce((s, r) => s + toNumber(r.Kuantiti), 0),
    };
  }

  return anyMatch ? result : null;
}

/**
 * Monthly production-vs-import trend (in MT) for a single year — returns
 * an array of 12 { month, pengeluaran, import } entries (month = the Malay
 * month name used elsewhere, e.g. "JANUARI"), or null if nothing matched.
 */
export function computeMonthlyTrend(productionRows, importRows, year, filters) {
  const { commodityKeyword, categoryKeyword, negeriLabel, daerahLabel } = filters;
  const MONTHS = ['JANUARI', 'FEBRUARI', 'MAC', 'APRIL', 'MEI', 'JUN', 'JULAI', 'OGOS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DISEMBER'];
  const CODES = ['jan', 'feb', 'mac', 'apr', 'mei', 'jun', 'jul', 'ogo', 'sep', 'okt', 'nov', 'dis'];

  const prodRows = productionRows.filter((row) =>
    String(row.Tahun).trim() === String(year) &&
    matchesCommodityKeyword(row, commodityKeyword, 'Jenis Komoditi') &&
    matchesCategoryKeyword(row, categoryKeyword, 'Kategori Komoditi') &&
    matchesNegeri(row, negeriLabel, 'Negeri') &&
    matchesDaerah(row, daerahLabel, 'Daerah')
  );
  const impRows = importRows.filter((row) =>
    String(row.Tahun).trim() === String(year) &&
    matchesCommodityKeyword(row, commodityKeyword, 'Standard Jenis Komoditi')
  );

  if (prodRows.length === 0 && impRows.length === 0) return null;

  return MONTHS.map((label, i) => {
    const code = CODES[i];
    const pengeluaran = prodRows
      .filter((r) => normalizeMonth(r.Bulan) === code)
      .reduce((s, r) => s + toNumber(r.Pengeluaran), 0);
    const importQty = impRows
      .filter((r) => normalizeMonth(r.Bulan) === code)
      .reduce((s, r) => s + toNumber(r.Kuantiti), 0);
    return { month: label, pengeluaran, import: importQty };
  });
}

/**
 * Yearly consumption-vs-export trend (in MT) — the demand-side equivalent
 * of computeYearlyTrend. CONSUMPTION_BY_STATE has no month/negeri-vs-daerah
 * distinction issue here since it's already annual; EXPORT uses the same
 * Kuantiti/Bulan/Tahun columns as IMPORT.
 */
export function computeYearlyTrendDemand(consumptionRows, exportRows, years, filters, monthConsumptionRows = null) {
  const { commodityKeyword, categoryKeyword, negeriLabel } = filters;
  const result = {};
  let anyMatch = false;

  for (const year of years) {
    const consRows = consumptionRows.filter((row) =>
      String(row.Tahun).trim() === String(year) &&
      matchesCommodityKeyword(row, commodityKeyword, 'Standard Jenis Komoditi') &&
      matchesCategoryKeyword(row, categoryKeyword, 'Standard Kategori Komoditi') &&
      matchesNegeri(row, negeriLabel, 'Negeri') &&
      // "Penggunaan" = Isi Rumah (household) segment only, same business
      // rule the Penggunaan KPI card uses — without this, the chart summed
      // Isi Rumah + Hospitaliti + Kilang together, well above the KPI figure.
      isIsiRumahSegment(row)
      // Note: CONSUMPTION_BY_STATE has no Daerah column, so daerahLabel
      // can't narrow this side — only the export side would, and EXPORT
      // itself has no Negeri/Daerah either, so daerahLabel is unused here.
    );
    const expRows = exportRows.filter((row) =>
      String(row.Tahun).trim() === String(year) &&
      matchesCommodityKeyword(row, commodityKeyword, 'Standard Jenis Komoditi')
    );
    // Same source as the Bulanan chart (PCC/Bulan x Populasi), so the
    // yearly bar is exactly the sum of that year's 12 monthly bars. Falls
    // back to CONSUMPTION_BY_STATE's own yearly total when nothing joins.
    const realMonthly = monthlyPenggunaanFromMonthSheet(monthConsumptionRows, consumptionRows, year, filters);
    const penggunaanMT = realMonthly
      ? Object.values(realMonthly).reduce((a, b) => a + b, 0) / 1000
      : consRows.reduce((s, r) => s + toNumber(r['Penggunaan/Kg']), 0) / 1000;
    if (consRows.length > 0 || expRows.length > 0 || realMonthly) anyMatch = true;

    result[`y${year}`] = {
      penggunaan: penggunaanMT,
      eksport: expRows.reduce((s, r) => s + toNumber(r.Kuantiti), 0),
    };
  }

  return anyMatch ? result : null;
}

/** Finds a real column name in a row, tolerating case/spacing differences. */
function findKey(row, candidates) {
  const norm = (x) => String(x).replace(/\s+/g, ' ').trim().toLowerCase();
  const keys = Object.keys(row || {});
  for (const c of candidates) {
    const hit = keys.find((k) => norm(k) === norm(c));
    if (hit) return hit;
  }
  return null;
}

// Monthly kg = PCC/Bulan x Populasi (no household-size divisor). Kept as a
// constant so a divisor (e.g. 3.9) can be reintroduced in one place if needed.
export const PCC_DIVISOR = 1;

const MONTHLY_PENGGUNAAN_COLUMNS = ['Penggunaan (PCC/Bulan/Kg)', 'Penggunaan (PCC/Bulan/KG)'];

const norm = (x) => String(x ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Real monthly Penggunaan (kg, by month code) from the two consumption sheets,
 * joined on Tahun + Standard Jenis Komoditi:
 *   1. CONSUMPTION_BY_MONTH: for the year and each komoditi, the
 *      "Penggunaan (PCC/Bulan/Kg)" of all its varieties (Isi Rumah segment
 *      only when the sheet has a Segment column) is AVERAGED per month.
 *   2. CONSUMPTION_BY_STATE: each district (Negeri + Populasi
 *      Daerah) contributes its "Populasi Daerah/Kilang/Hospitaliti"
 *      (falls back to Weightedge if that column is missing/non-numeric).
 *   3. monthly kg = average PCC x Populasi, summed over districts.
 * Weightedge rows of the same district + komoditi (one per variety) are
 * combined as WEIGHTEDGE_MODE says. Returns null when nothing joins, so the
 * caller can fall back to the even-spread estimate.
 */
// Population is a district figure that repeats on every variety row, so by
// default one value is used per district + komoditi (the largest):
// 'once' : single Populasi per district/komoditi
// 'sum'  : add the Populasi of every variety row (only if each row holds a
//          different share of the population)
export const WEIGHTEDGE_MODE = 'once';

function monthlyPenggunaanFromMonthSheet(monthRows, stateRows, year, filters, debug = false) {
  if (!monthRows || monthRows.length === 0 || !stateRows || stateRows.length === 0) return null;
  const { commodityKeyword, categoryKeyword, negeriLabel, daerahLabel } = filters;
  const sample = monthRows[0];
  const valueKey = findKey(sample, MONTHLY_PENGGUNAAN_COLUMNS);
  if (!valueKey) return null;
  const yearKey = findKey(sample, ['Tahun']) || 'Tahun';
  const monthKey = findKey(sample, ['Bulan', 'Month', 'Month Name', 'Month_Name']) || 'Bulan';
  const segKey = findKey(sample, ['Segment']);
  const popKey = findKey(stateRows[0], [POPULASI_COLUMN]);
  const weightKey = findKey(stateRows[0], ['Weightedge', 'Weighted']);
  if (!popKey && !weightKey) return null;

  // 1. average PCC per komoditi + month across its varieties
  const pccAcc = new Map(); // komoditi -> { code: { sum, n } }
  for (const row of monthRows) {
    if (String(row[yearKey] || '').trim() !== String(year)) continue;
    if (segKey && !isIsiRumahSegment(row)) continue;
    const code = normalizeMonth(row[monthKey]);
    if (!code) continue;
    const k = norm(row['Standard Jenis Komoditi']);
    if (!k) continue;
    const cur = pccAcc.get(k) || {};
    const c = cur[code] || { sum: 0, n: 0 };
    c.sum += toNumber(row[valueKey]);
    c.n += 1;
    cur[code] = c;
    pccAcc.set(k, cur);
  }
  if (pccAcc.size === 0) return null;

  // 2. Populasi per district + komoditi
  const wantDaerah = daerahLabel ? districtKey(daerahLabel) : null;
  const dbg = { year, commodityKeyword, negeriLabel, daerahLabel, stateRows: stateRows.length, afterIsiRumah: 0, noPccMatch: [], districts: [] };
  const wByDistrict = new Map(); // negeri|daerah|komoditi -> { negeri, daerah, komoditi, weights: [] }
  for (const row of stateRows) {
    if (String(row.Tahun || '').trim() !== String(year)) continue;
    if (!matchesCommodityKeyword(row, commodityKeyword, 'Standard Jenis Komoditi')) continue;
    if (!matchesCategoryKeyword(row, categoryKeyword, 'Standard Kategori Komoditi')) continue;
    if (!matchesNegeri(row, negeriLabel, 'Negeri')) continue;
    if (!isIsiRumahSegment(row)) continue;
    dbg.afterIsiRumah += 1;
    const negeri = normalizeNegeriName(row.Negeri);
    const daerah = daerahOf(row, negeri) || '';
    if (wantDaerah && districtKey(daerah) !== wantDaerah) continue;
    const komoditi = norm(row['Standard Jenis Komoditi']);
    const id = `${negeri}|${districtKey(daerah)}|${komoditi}`;
    const cur = wByDistrict.get(id) || { negeri, daerah: daerah || '(tiada daerah)', komoditi, weights: [] };
    // Populasi when it holds a number, otherwise the older Weightedge column
    const pop = popKey ? toNumber(row[popKey]) : 0;
    cur.weights.push(pop > 0 ? pop : (weightKey ? toNumber(row[weightKey]) : 0));
    wByDistrict.set(id, cur);
  }

  // 3. average PCC x Populasi
  const byMonth = {};
  let joined = 0;
  for (const d of wByDistrict.values()) {
    const pcc = pccAcc.get(d.komoditi);
    if (!pcc) { if (dbg.noPccMatch.length < 5) dbg.noPccMatch.push(d.komoditi); continue; }
    const weight = WEIGHTEDGE_MODE === 'once' ? Math.max(...d.weights) : d.weights.reduce((a, b) => a + b, 0);
    joined += 1;
    for (const [code, { sum, n }] of Object.entries(pcc)) {
      byMonth[code] = (byMonth[code] || 0) + ((sum / n) / PCC_DIVISOR) * weight;
    }
    if (debug && dbg.districts.length < 20) {
      const row = { negeri: d.negeri, daerah: d.daerah, komoditi: d.komoditi, varietyRows: d.weights.length, populasiRows: d.weights.join(' | '), populasi: weight };
      for (const [code, { sum, n }] of Object.entries(pcc)) {
        row[`${code} PCC(avg of ${n})`] = sum / n;
        row[`${code} MT`] = (((sum / n) / PCC_DIVISOR) * weight) / 1000;
      }
      dbg.districts.push(row);
    }
  }
  if (debug && joined > 0 && typeof console !== 'undefined') {
    console.groupCollapsed(`[Penggunaan bulanan] join debug — ${joined} district/komoditi joined (Populasi mode: ${WEIGHTEDGE_MODE})`);
    console.table(dbg.districts);
    console.groupEnd();
  }
  if (joined === 0 && typeof console !== 'undefined') {
    console.warn('[Penggunaan bulanan] no CONSUMPTION_BY_STATE row joined to CONSUMPTION_BY_MONTH', dbg,
      'month-sheet komoditi keys:', [...pccAcc.keys()].slice(0, 5));
  }
  return joined > 0 ? byMonth : null;
}

/**
 * Monthly consumption-vs-export trend for a single year. "penggunaan" now
 * comes from the real CONSUMPTION_BY_MONTH sheet (Penggunaan (PCC/Bulan/Kg),
 * converted to MT) when monthConsumptionRows has matching rows; otherwise it
 * falls back to the old estimate (CONSUMPTION_BY_STATE yearly total spread
 * evenly over 12 months). "eksport" uses EXPORT's real Bulan column.
 */
export function computeMonthlyTrendDemand(consumptionRows, exportRows, year, filters, monthConsumptionRows = null) {
  const { commodityKeyword, categoryKeyword, negeriLabel } = filters;
  const MONTHS = ['JANUARI', 'FEBRUARI', 'MAC', 'APRIL', 'MEI', 'JUN', 'JULAI', 'OGOS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DISEMBER'];
  const CODES = ['jan', 'feb', 'mac', 'apr', 'mei', 'jun', 'jul', 'ogo', 'sep', 'okt', 'nov', 'dis'];

  const consRows = consumptionRows.filter((row) =>
    String(row.Tahun).trim() === String(year) &&
    matchesCommodityKeyword(row, commodityKeyword, 'Standard Jenis Komoditi') &&
    matchesCategoryKeyword(row, categoryKeyword, 'Standard Kategori Komoditi') &&
    matchesNegeri(row, negeriLabel, 'Negeri') &&
    isIsiRumahSegment(row) // Penggunaan = Isi Rumah only — see computeYearlyTrendDemand's note
  );
  const expRows = exportRows.filter((row) =>
    String(row.Tahun).trim() === String(year) &&
    matchesCommodityKeyword(row, commodityKeyword, 'Standard Jenis Komoditi')
  );

  const realMonthly = monthlyPenggunaanFromMonthSheet(monthConsumptionRows, consumptionRows, year, filters, true);

  if (consRows.length === 0 && expRows.length === 0 && !realMonthly) return null;

  const yearlyPenggunaanMT = consRows.reduce((s, r) => s + toNumber(r['Penggunaan/Kg']), 0) / 1000;
  const monthlyPenggunaanEstimate = yearlyPenggunaanMT / 12; // spread evenly — no real monthly source

  if (realMonthly && typeof console !== 'undefined') {
    const monthSumMT = Object.values(realMonthly).reduce((a, b) => a + b, 0) / 1000;
    if (yearlyPenggunaanMT > 0 && Math.abs(monthSumMT - yearlyPenggunaanMT) / yearlyPenggunaanMT > 0.05) {
      console.warn(`[Penggunaan bulanan] 12-month total ${monthSumMT.toFixed(2)} MT differs from CONSUMPTION_BY_STATE yearly ${yearlyPenggunaanMT.toFixed(2)} MT by more than 5% — check Populasi / PCC join.`);
    }
  }

  return MONTHS.map((label, i) => {
    const code = CODES[i];
    const eksport = expRows
      .filter((r) => normalizeMonth(r.Bulan) === code)
      .reduce((s, r) => s + toNumber(r.Kuantiti), 0);
    const penggunaan = realMonthly ? (realMonthly[code] || 0) / 1000 : monthlyPenggunaanEstimate;
    return { month: label, penggunaan, eksport };
  });
}
