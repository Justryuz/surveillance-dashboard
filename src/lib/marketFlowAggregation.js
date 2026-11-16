import { toNumber } from './googleSheets';
import { matchesYear, matchesCommodityKeyword, matchesCategoryKeyword } from './sheetFilters';
import { normalizeNegeriName } from './geoNames';

// Note: this tab has no "Bulan" (month) column, so month filters don't
// apply here — only year, category, and commodity. producerNegeriLabel /
// formToNegeriMap (and producerDaerahLabel / formToDaerahMap), built from
// PROFILING_PENGELUAR, let rows be filtered by the real PRODUCER's state and
// district via the shared No_Siri_Borang key, since this tab only otherwise
// records the market DESTINATION's state.
function filterMarketFlow(rows, { year, commodityKeyword, categoryKeyword, producerNegeriLabel, formToNegeriMap, producerDaerahLabel, formToDaerahMap }) {
  return rows.filter((row) =>
    matchesYear(row, year) &&
    matchesCommodityKeyword(row, commodityKeyword, 'Jenis_Komoditi') &&
    matchesCategoryKeyword(row, categoryKeyword, 'Kategori_Komoditi') &&
    matchesProducerNegeri(row, producerNegeriLabel, formToNegeriMap) &&
    matchesProducerDaerah(row, producerDaerahLabel, formToDaerahMap)
  );
}

function matchesProducerDaerah(row, producerDaerahLabel, formToDaerahMap) {
  if (!producerDaerahLabel) return true;
  if (!formToDaerahMap) return true; // join data not loaded yet — don't zero everything out
  const formId = String(row.No_Siri_Borang || '').trim().toUpperCase();
  const daerah = String(formToDaerahMap.get(formId) || '').trim().toUpperCase();
  return daerah === String(producerDaerahLabel).trim().toUpperCase();
}

function matchesProducerNegeri(row, producerNegeriLabel, formToNegeriMap) {
  if (!producerNegeriLabel) return true;
  if (!formToNegeriMap) return true; // join data not loaded yet — don't zero everything out
  const formId = String(row.No_Siri_Borang || '').trim().toUpperCase();
  return formToNegeriMap.get(formId) === producerNegeriLabel;
}

// The only Lokasi_Saluran_Pasaran categories shown in Saluran Pasaran (donut
// and funnels). Any other value in the sheet (e.g. "Tiada Pasaran", "Belum
// Dipasarkan/Baru Bertanam/Belum Berhasil") is left out, and the remaining
// slices are re-scaled to sum to 100. The array order is the display order.
const SALURAN_ORDER = [
  'Dalam Daerah',
  'Luar Daerah',
  'Dalam Negeri',
  'Luar Negeri',
  'Luar Negara',
];
const SALURAN_ALLOWED = new Set(SALURAN_ORDER.map((o) => o.toLowerCase()));

/** Trims and title-cases each "/"-separated part of a raw Lokasi_Saluran_
 * Pasaran value, so inconsistent sheet casing/spacing (e.g. "Baru Bertanam/
 * belum berhasil" with a stray leading space) doesn't create near-duplicate
 * slices that should really be the same category. */
function normalizeLokasiLabel(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  return trimmed
    .split('/')
    .map((part) => part.trim().replace(/\b\w/g, (c) => c.toUpperCase()))
    .join('/');
}

/**
 * Builds the SALURAN PASARAN slices from the sheet's Lokasi_Saluran_Pasaran
 * column, keeping only the five categories in SALURAN_ORDER ("Dalam Daerah",
 * "Luar Daerah", "Dalam Negeri", "Luar Negeri", "Luar Negara") — each one
 * that has matching rows gets a slice. Returns
 * [{ name, value }] with value as a percentage (one decimal place,
 * summing to 100), or null if nothing matched.
 */
export function computePieData(marketFlowRows, filters) {
  const rows = filterMarketFlow(marketFlowRows, filters);

  const totals = new Map();
  for (const row of rows) {
    const label = normalizeLokasiLabel(row.Lokasi_Saluran_Pasaran);
    if (!label || !SALURAN_ALLOWED.has(label.toLowerCase())) continue;
    const weight = toNumber(row.Jumlah_Saluran_Pasaran_Lokasi);
    totals.set(label, (totals.get(label) || 0) + weight);
  }

  const grandTotal = [...totals.values()].reduce((s, v) => s + v, 0);
  if (grandTotal === 0) return null;

  const orderRank = (name) => {
    const idx = SALURAN_ORDER.findIndex((o) => o.toLowerCase() === name.toLowerCase());
    return idx === -1 ? SALURAN_ORDER.length : idx;
  };

  return [...totals.entries()]
    .map(([name, value]) => ({ name, value: Math.round((value / grandTotal) * 1000) / 10 }))
    .sort((a, b) => orderRank(a.name) - orderRank(b.name) || a.name.localeCompare(b.name));
}

/** Same breakdown as computePieData, kept as its own export since the
 * SALURAN PASARAN funnel chart on Pembekalan.jsx/Permintaan.jsx imports it
 * by this name — both now return the identical [{ name, value }] shape. */
export function computeSaluranPasaranFunnel(marketFlowRows, filters) {
  return computePieData(marketFlowRows, filters);
}

/** True when a row's Lokasi_Saluran_Pasaran marks it as sold abroad. Using
 * this field (rather than trusting Negara_Pasaran to say "Malaysia" on
 * every domestic row) is what actually separates foreign vs. domestic
 * rows reliably — some domestic rows carry other text (e.g. a negeri
 * name) in Negara_Pasaran instead of "Malaysia", which previously leaked
 * them into the GLOBAL list. */
function isForeignLokasi(raw) {
  return normalizeLokasiLabel(raw).toLowerCase() === 'luar negara';
}

/** True when a row's Lokasi_Saluran_Pasaran marks it as sold domestically
 * (within Malaysia, at daerah/negeri level). "Luar Negeri" means sold in a
 * different Malaysian state — still domestic — distinct from "Luar Negara"
 * (sold outside Malaysia), which isForeignLokasi handles above. */
function isDomesticLokasi(raw) {
  const label = normalizeLokasiLabel(raw).toLowerCase();
  return label === 'dalam daerah' || label === 'dalam negeri' || label === 'luar daerah' || label === 'luar negeri';
}

/**
 * Top-N foreign countries this commodity is marketed to (rows where
 * Lokasi_Saluran_Pasaran = "Luar Negara"), as { lokasi, qty, pct } to
 * match Pembekalan.jsx's pasaranGlobal shape. "qty" here is the sheet's
 * own Jumlah_Saluran_Pasaran_Lokasi weight, not a physical MT figure.
 */
export function computeTopMarketCountries(marketFlowRows, filters, limit = 5) {
  const rows = filterMarketFlow(marketFlowRows, filters).filter(
    (row) => isForeignLokasi(row.Lokasi_Saluran_Pasaran) && row.Negara_Pasaran
  );
  return topByKey(rows, (row) => String(row.Negara_Pasaran).trim().toUpperCase(), limit);
}

/**
 * Top-N Malaysian states this commodity is marketed to domestically
 * (Lokasi_Saluran_Pasaran = "Dalam Daerah"/"Dalam Negeri"/"Luar Daerah"),
 * grouped by Negeri_Pasaran.
 */
export function computeTopMarketStates(marketFlowRows, filters, limit = 5) {
  const rows = filterMarketFlow(marketFlowRows, filters).filter(
    (row) => isDomesticLokasi(row.Lokasi_Saluran_Pasaran) && row.Negeri_Pasaran
  );
  return topByKey(rows, (row) => normalizeNegeriName(row.Negeri_Pasaran), limit);
}

/**
 * Top-N Malaysian (state - district) combinations this commodity is
 * marketed to domestically, e.g. "Selangor - Petaling".
 */
export function computeTopMarketDistricts(marketFlowRows, filters, limit = 5) {
  const rows = filterMarketFlow(marketFlowRows, filters).filter(
    (row) => isDomesticLokasi(row.Lokasi_Saluran_Pasaran) && row.Negeri_Pasaran && row.Daerah_Pasaran
  );
  return topByKey(
    rows,
    (row) => `${normalizeNegeriName(row.Negeri_Pasaran)} - ${String(row.Daerah_Pasaran).trim()}`,
    limit
  );
}

function topByKey(rows, keyFn, limit) {
  if (rows.length === 0) return null;
  const totals = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    totals.set(key, (totals.get(key) || 0) + toNumber(row.Jumlah_Saluran_Pasaran_Lokasi));
  }
  const grandTotal = [...totals.values()].reduce((s, v) => s + v, 0);
  if (grandTotal === 0) return null;
  return [...totals.entries()]
    .map(([lokasi, qty]) => ({ lokasi: toTitleCase(lokasi), qty, pct: (qty / grandTotal) * 100 }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

function toTitleCase(str) {
  return String(str || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
