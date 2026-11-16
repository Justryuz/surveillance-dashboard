import { toNumber } from './googleSheets';
import { normalizeNegeriName } from './geoNames';
import { matchesYear, matchesCommodityKeyword, matchesCategoryKeyword, matchesNegeri } from './sheetFilters';

// Note: this tab has no "Bulan" (month) column — it's state-level annual
// data — so month filters don't apply here.
function filterConsumption(rows, { year, commodityKeyword, categoryKeyword, negeriLabel }) {
  return rows.filter((row) =>
    matchesYear(row, year) &&
    matchesCommodityKeyword(row, commodityKeyword, 'Standard Jenis Komoditi') &&
    matchesCategoryKeyword(row, categoryKeyword, 'Standard Kategori Komoditi') &&
    matchesNegeri(row, negeriLabel, 'Negeri')
  );
}

/** Same keyword set used by computeConsumptionSegmentBreakdown's "isirumah"
 * bucket, kept here so the Penggunaan KPI (and everything derived from it —
 * top-5 list, state map) restricts to household consumption only, per
 * business definition: "Penggunaan" = Isi Rumah, not total consumption
 * across all segments (Isi Rumah + Hospitaliti + Kilang). */
export function isIsiRumahSegment(row) {
  const segment = String(row.Segment || '').trim().toLowerCase();
  return segment.includes('rumah') || segment.includes('household') || segment.includes('runcit');
}

function filterConsumptionIsiRumah(rows, filters) {
  return filterConsumption(rows, filters).filter(isIsiRumahSegment);
}

// CONSUMPTION_BY_STATE now has a dedicated "Daerah" column (Isi Rumah rows).
// "Populasi Daerah/Kilang/Hospitaliti" is the population figure used in the
// monthly calculation. Older copies of the sheet kept the district name in
// that population column (or in "Populasi Pertubuhan Kilang/Negeri"), so
// those are still tried, but only when their cell is text, not a number.
export const DAERAH_COLUMN = 'Daerah';
export const POPULASI_COLUMN = 'Populasi Daerah/Kilang/Hospitaliti';
const DAERAH_COLUMN_CANDIDATES = [DAERAH_COLUMN, POPULASI_COLUMN, 'Populasi Pertubuhan Kilang/Negeri'];

/** Case/space/punctuation-insensitive key for matching a district name
 * from the sheet against the geojson's (e.g. "Sabak Bernam" ~ "SABAK  BERNAM"). */
export function districtKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toTitleCaseDaerah(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The row's district name, or '' when the cell is blank or just repeats the
 * state name (a state-level row, not a real district). W.P. territories
 * legitimately have a district named after themselves, so those are kept. */
export function daerahOf(row, negeri) {
  let raw = '';
  for (const col of DAERAH_COLUMN_CANDIDATES) {
    const v = String(row[col] ?? '').trim();
    if (v && !/^[\d.,\s]+$/.test(v)) { raw = v; break; } // skip blanks and pure numbers
  }
  if (!raw) return '';
  if (!negeri.startsWith('W.P.') && districtKey(raw) === districtKey(negeri)) return '';
  return raw;
}

/** Total consumption in KG across all filtered rows, restricted to the
 * Isi Rumah (household) segment — Penggunaan is defined as household
 * consumption only, not the sheet's full Isi Rumah + Hospitaliti + Kilang
 * total. Returns null (not 0) when nothing matched, so the caller can fall
 * back to the mock value. */
export function computeConsumptionTotalKg(consumptionRows, filters) {
  const rows = filterConsumptionIsiRumah(consumptionRows, filters);
  if (rows.length === 0) return null;
  return rows.reduce((sum, row) => sum + toNumber(row['Penggunaan/Kg']), 0);
}

/**
 * Builds the "Penggunaan Utama" top-5 list, in the same unit (MT) as the
 * production list so the two are visually comparable.
 * This tab only has state-level rows (no Daerah/district column), so when
 * a state is selected we distribute that state's real total across its
 * districts — the state-level number itself is real, only the intra-state
 * split is estimated.
 * Restricted to the Isi Rumah (household) segment, same as
 * computeConsumptionTotalKg — see that function's note.
 * Returns null when nothing matched at all, so the caller falls back to mock.
 *
 * @param {Array|null} productionByStateDistrict - [{negeri, daerah, value}]
 *   from PRODUCTION (computeProductionByStateDistrict). When given, each
 *   district's share of the split is weighted by its real production share
 *   of the state — the SAME weighting MalaysiaPenggunaanMap uses to spread
 *   consumption across districts, so the table and the map agree. Without
 *   it, falls back to the old deterministic pseudo-split (kept only so a
 *   caller that hasn't wired production data through yet still shows
 *   something, rather than nothing).
 */
export function computeTop5Penggunaan(consumptionRows, filters, selectedRegion, stateDistrictsMap, productionByStateDistrict = null) {
  const rows = filterConsumptionIsiRumah(consumptionRows, filters);
  if (rows.length === 0) return null;
  const totals = new Map();
  for (const row of rows) {
    const negeri = normalizeNegeriName(row.Negeri);
    if (!negeri) continue;
    totals.set(negeri, (totals.get(negeri) || 0) + toNumber(row['Penggunaan/Kg']));
  }

  const toMT = (kg) => Math.round(kg / 1000);

  // "5 Lokasi Utama": keep only the 5 largest districts, but remember the
  // state's full district total so % Syer stays a share of the whole state
  // (not of just the 5 shown).
  const districtResult = (fullList, estimatedSplit) => ({
    top5Level: 'daerah',
    list: fullList.slice(0, 5),
    total: fullList.reduce((s, r) => s + r.value, 0),
    estimatedSplit,
  });

  if (selectedRegion) {
    // Preferred: the sheet's own district rows (Isi Rumah only, already
    // filtered above) — real figures, no estimation. Same source and same
    // numbers the Peta Penggunaan map uses.
    const districtKg = new Map(); // districtKey -> { name, kg }
    for (const row of rows) {
      if (normalizeNegeriName(row.Negeri) !== selectedRegion) continue;
      const daerah = daerahOf(row, selectedRegion);
      if (!daerah) continue;
      const key = districtKey(daerah);
      const cur = districtKg.get(key) || { name: toTitleCaseDaerah(daerah), kg: 0 };
      cur.kg += toNumber(row['Penggunaan/Kg']);
      districtKg.set(key, cur);
    }
    if (districtKg.size > 0) {
      const list = [...districtKg.values()]
        .filter((d) => d.kg > 0)
        .map((d) => ({ name: d.name, value: Math.round(d.kg / 10) / 100 })) // MT, 2 dp
        .sort((a, b) => b.value - a.value);
      if (list.length > 0) return districtResult(list, false);
    }

    const stateTotalMT = toMT(totals.get(selectedRegion) || 0);

    // Fallback (state has no district rows in the sheet): weighting by each district's real production share — same
    // method the map uses — so the two views show the same number.
    if (productionByStateDistrict) {
      const matches = productionByStateDistrict.filter((d) => d.negeri === selectedRegion);
      const stateProdTotal = matches.reduce((s, d) => s + d.value, 0);
      if (matches.length > 0 && stateProdTotal > 0) {
        const list = matches
          .map((d) => ({ name: d.daerah, value: Math.round(stateTotalMT * (d.value / stateProdTotal)) }))
          .sort((a, b) => b.value - a.value);
        return districtResult(list, true);
      }
    }

    // Fallback: no real production-by-district data for this state — split
    // the real state total across its districts with a mild, deterministic
    // variation (rather than an even split) purely for display purposes.
    const districts = stateDistrictsMap[selectedRegion] || [];
    const list = districts
      .map((dist, i) => {
        const hash = dist.charCodeAt(0) + dist.charCodeAt(dist.length - 1);
        const weight = 0.28 - i * 0.03 + (hash % 10) / 200;
        return { name: dist, value: Math.round(stateTotalMT * weight) };
      })
      .sort((a, b) => b.value - a.value);
    return districtResult(list, true);
  }

  const list = [...totals.entries()]
    .map(([name, kg]) => ({ name, value: toMT(kg) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  return { top5Level: 'negeri', list, estimatedSplit: false };
}

/**
 * Full per-state consumption totals (MT) — the CONSUMPTION_BY_STATE
 * equivalent of computeProductionByState, used to drive
 * MalaysiaPenggunaanMap. Restricted to the Isi Rumah (household) segment,
 * same as computeConsumptionTotalKg — see that function's note.
 * Returns null if nothing matched.
 */
export function computeConsumptionByState(consumptionRows, filters) {
  const rows = filterConsumptionIsiRumah(consumptionRows, filters);
  if (rows.length === 0) return null;
  const totals = new Map();
  for (const row of rows) {
    const negeri = normalizeNegeriName(row.Negeri);
    if (!negeri) continue;
    totals.set(negeri, (totals.get(negeri) || 0) + toNumber(row['Penggunaan/Kg']));
  }
  return [...totals.entries()]
    .filter(([, kg]) => kg > 0)
    .map(([name, kg]) => ({ name, value: Math.round(kg / 1000) })); // MT
}

/**
 * Per-district consumption (MT, unrounded) from CONSUMPTION_BY_STATE's
 * district column, Isi Rumah segment only — drives MalaysiaPenggunaanMap.
 * Returns [{ negeri, daerah, value }] or null when no row carries a district.
 */
export function computeConsumptionByStateDistrict(consumptionRows, filters) {
  const rows = filterConsumptionIsiRumah(consumptionRows, filters);
  const totals = new Map(); // `${negeri}|${districtKey}` -> { negeri, daerah, kg }
  for (const row of rows) {
    const negeri = normalizeNegeriName(row.Negeri);
    if (!negeri) continue;
    const daerah = daerahOf(row, negeri);
    if (!daerah) continue;
    const id = `${negeri}|${districtKey(daerah)}`;
    const cur = totals.get(id) || { negeri, daerah: toTitleCaseDaerah(daerah), kg: 0 };
    cur.kg += toNumber(row['Penggunaan/Kg']);
    totals.set(id, cur);
  }
  const list = [...totals.values()]
    .filter((d) => d.kg > 0)
    .map((d) => ({ negeri: d.negeri, daerah: d.daerah, value: d.kg / 1000 }));
  return list.length > 0 ? list : null;
}

/**
 * Same top-5 state/district breakdown as computeTop5Penggunaan, but
 * shaped as { lokasi, qty, pct } to match Permintaan.jsx's table (no RM
 * value — CONSUMPTION_BY_STATE has no price/value column at all).
 * Returns null when nothing matched.
 */
export function computeTop5PenggunaanDetailed(consumptionRows, filters, selectedRegion, stateDistrictsMap, productionByStateDistrict = null) {
  const result = computeTop5Penggunaan(consumptionRows, filters, selectedRegion, stateDistrictsMap, productionByStateDistrict);
  if (!result) return null;
  const grandTotal = result.total ?? result.list.reduce((s, r) => s + r.value, 0);
  return result.list.map((r) => ({
    lokasi: r.name,
    qty: r.value,
    pct: grandTotal > 0 ? (r.value / grandTotal) * 100 : 0,
  }));
}

/**
 * Household / Hospitaliti / Kilang consumption split, from
 * CONSUMPTION_BY_STATE's "Segment" column. Percentages are normalized
 * across only these 3 recognized buckets — any segment value that doesn't
 * match one of these keywords is left out rather than guessed into a
 * bucket, so the 3 numbers may not always sum to exactly 100.
 * Returns null when nothing matched.
 */
export function computeConsumptionSegmentBreakdown(consumptionRows, filters) {
  const rows = filterConsumption(consumptionRows, filters);
  if (rows.length === 0) return null;

  let isirumah = 0, hospitaliti = 0, kilang = 0;
  for (const row of rows) {
    const segment = String(row.Segment || '').trim().toLowerCase();
    const weight = toNumber(row['Penggunaan/Kg']);
    if (!segment) continue;
    if (segment.includes('rumah') || segment.includes('household') || segment.includes('runcit')) {
      isirumah += weight;
    } else if (segment.includes('hospitaliti') || segment.includes('horeca') || segment.includes('katering') || segment.includes('restoran')) {
      hospitaliti += weight;
    } else if (segment.includes('kilang') || segment.includes('industri')) {
      kilang += weight;
    }
  }

  const total = isirumah + hospitaliti + kilang;
  if (total === 0) return null;
  const pct = (v) => Math.round((v / total) * 1000) / 10;
  const mt = (kg) => kg / 1000; // absolute consumption per segment, in MT
  return {
    isirumah: pct(isirumah), hospitaliti: pct(hospitaliti), kilang: pct(kilang),
    isirumahMT: mt(isirumah), hospitalitiMT: mt(hospitaliti), kilangMT: mt(kilang),
  };
}
