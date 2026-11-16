import { toNumber } from './googleSheets';
import { normalizeNegeriName } from './geoNames';

function normKey(str) {
  return String(str || '').trim().toUpperCase();
}

// The Pemborongan page's own choropleth map is registered from a different
// community geojson (loaded ad-hoc in Pemborongan.jsx) than the rest of the
// app's maps, and its region property uses plain "Kuala Lumpur" rather than
// the "W.P. Kuala Lumpur" canonical name geoNames.js normally returns —
// this keeps that one page's map lookups working.
function normalizeNegeriForMap(raw) {
  const canonical = normalizeNegeriName(raw);
  return canonical.replace(/^W\.P\.\s*/i, '');
}

const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'May', 'Jun', 'July', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
const MONTH_LABELS = ['JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN', 'JUL', 'OGO', 'SEP', 'OKT', 'NOV', 'DIS'];

function isForeign(rawCountry) {
  const v = String(rawCountry || '').trim().toLowerCase();
  return v !== '' && v !== 'malaysia';
}

/** Builds the { tahun, negeri, daerah, jenisPremis } dynamic filter option lists from the profiling tab. */
export function computePemborongonFilterOptions(profilingRows) {
  const tahun = new Set(), negeri = new Set(), daerah = new Set(), jenisPremis = new Set();
  for (const row of profilingRows || []) {
    if (row.Tahun) tahun.add(String(row.Tahun).trim());
    if (row.Negeri) negeri.add(normalizeNegeriName(row.Negeri));
    if (row.Daerah) daerah.add(String(row.Daerah).trim());
    if (row.Jenis_Premis_Perniagaan) jenisPremis.add(String(row.Jenis_Premis_Perniagaan).trim());
  }
  return {
    tahun: ['All', ...[...tahun].sort()],
    negeri: ['All', ...[...negeri].sort()],
    daerah: ['All', ...[...daerah].sort()],
    jenisPremis: ['All', ...[...jenisPremis].sort()],
  };
}

function matchesProfilingFilters(row, filters) {
  if (filters.tahun !== 'All' && String(row.Tahun || '').trim() !== filters.tahun) return false;
  if (filters.negeri !== 'All' && normalizeNegeriName(row.Negeri) !== filters.negeri) return false;
  if (filters.daerah !== 'All' && String(row.Daerah || '').trim() !== filters.daerah) return false;
  if (filters.jenisPremis !== 'All' && String(row.Jenis_Premis_Perniagaan || '').trim() !== filters.jenisPremis) return false;
  return true;
}

/** Groups rows by a category key, weighting each by a numeric value, and returns sorted [{name, pct, total}]. */
function groupByPct(rows, keyFn, valFn) {
  const totals = new Map();
  let grand = 0;
  for (const row of rows) {
    const key = keyFn(row);
    const val = valFn(row);
    if (!key || !(val > 0)) continue;
    totals.set(key, (totals.get(key) || 0) + val);
    grand += val;
  }
  if (grand <= 0) return [];
  return [...totals.entries()]
    .map(([name, total]) => ({ name, pct: (total / grand) * 100, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Computes every value the Pemborongan page needs from the 4 real sheet
 * tabs (profiling, keperluan bekalan, sumber bekalan, saluran pasaran),
 * scoped to the given { tahun, negeri, daerah, jenisPremis } filters.
 * Returns null for a section when the tab(s) it depends on haven't loaded
 * any rows yet, so the page can show its "no data" placeholder instead of
 * a fabricated number.
 */
export function computePemborongan({ profiling, keperluan, sumber, saluran }, filters) {
  const profilingReady = Array.isArray(profiling) && profiling.length > 0;
  const keperluanReady = Array.isArray(keperluan) && keperluan.length > 0;
  const sumberReady = Array.isArray(sumber) && sumber.length > 0;
  const saluranReady = Array.isArray(saluran) && saluran.length > 0;

  const filteredProfiling = profilingReady ? profiling.filter((r) => matchesProfilingFilters(r, filters)) : [];
  const formIds = new Set(filteredProfiling.map((r) => normKey(r.No_Siri_Borang)));

  const filteredKeperluan = keperluanReady ? keperluan.filter((r) => formIds.has(normKey(r.No_Siri_Borang))) : [];
  const filteredSumber = sumberReady ? sumber.filter((r) => formIds.has(normKey(r.No_Siri_Borang))) : [];
  const filteredSaluran = saluranReady ? saluran.filter((r) => formIds.has(normKey(r.No_Siri_Borang))) : [];

  // --- Profiling-derived sections ---
  const bilanganPremis = profilingReady ? filteredProfiling.length : null;

  const premis = profilingReady
    ? (() => {
        const counts = new Map();
        for (const row of filteredProfiling) {
          const jenis = String(row.Jenis_Premis_Perniagaan || '').trim();
          if (!jenis) continue;
          counts.set(jenis, (counts.get(jenis) || 0) + 1);
        }
        const total = [...counts.values()].reduce((a, b) => a + b, 0);
        return [...counts.entries()]
          .map(([name, val]) => ({ name, val, pct: total > 0 ? (val / total) * 100 : 0 }))
          .sort((a, b) => b.val - a.val);
      })()
    : [];

  const demografi = profilingReady
    ? (() => {
        const byState = new Map(); // name -> { value, pb, op }
        for (const row of filteredProfiling) {
          const name = normalizeNegeriForMap(row.Negeri);
          if (!name) continue;
          const jenis = String(row.Jenis_Premis_Perniagaan || '').trim().toLowerCase();
          if (!byState.has(name)) byState.set(name, { name, value: 0, pb: 0, op: 0 });
          const entry = byState.get(name);
          entry.value += 1;
          if (jenis === 'pasar borong') entry.pb += 1;
          else if (jenis === 'outlet pemborongan') entry.op += 1;
        }
        return [...byState.values()].sort((a, b) => b.value - a.value);
      })()
    : [];

  // --- Keperluan Bekalan (per-commodity annual supply requirement) ---
  const komoditi = keperluanReady
    ? (() => {
        const totals = new Map();
        let grand = 0;
        for (const row of filteredKeperluan) {
          const name = String(row.Jenis_Komoditi || row.Kumpulan_Komoditi || '').trim();
          const val = toNumber(row.Anggaran_Keperluan_Bekalan_Setahun);
          if (!name || !(val > 0)) continue;
          totals.set(name, (totals.get(name) || 0) + val);
          grand += val;
        }
        const max = Math.max(0, ...totals.values());
        return [...totals.entries()]
          .map(([name, val]) => ({ name, val, pct: max > 0 ? (val / max) * 100 : 0 }))
          .sort((a, b) => b.val - a.val)
          .slice(0, 10);
      })()
    : [];

  const kuantitiBekalan = keperluanReady
    ? filteredKeperluan.reduce((sum, row) => sum + toNumber(row.Anggaran_Keperluan_Bekalan_Setahun), 0)
    : null;

  // Monthly trend (Jan-Dec) split by Tahun, from the same tab.
  const trend = keperluanReady
    ? (() => {
        const byYear = {}; // year -> [12 sums]
        for (const row of filteredKeperluan) {
          const year = String(row.Tahun || '').trim();
          if (!year) continue;
          if (!byYear[year]) byYear[year] = new Array(12).fill(0);
          MONTHS.forEach((m, i) => { byYear[year][i] += toNumber(row[m]); });
        }
        return { labels: MONTH_LABELS, series: byYear };
      })()
    : { labels: MONTH_LABELS, series: {} };

  // --- Sumber Bekalan (supply source detail) ---
  const kuantitiSumberTotal = sumberReady
    ? filteredSumber.reduce((sum, row) => sum + toNumber(row.Jumlah_Sumber_Bekalan_Lokasi), 0)
    : null;

  const sumberBekalan = sumberReady
    ? groupByPct(
        filteredSumber,
        (r) => String(r.Sumber_Bekalan_v2 || r.Sumber_Bekalan || '').trim(),
        (r) => toNumber(r.Jumlah_Sumber_Bekalan_Lokasi)
      ).map(({ name, pct }) => ({ name, pct }))
    : [];

  const lokasiSumber = sumberReady
    ? groupByPct(
        filteredSumber,
        (r) => String(r.Lokasi_Sumber_Bekalan || '').trim(),
        (r) => toNumber(r.Jumlah_Sumber_Bekalan_Lokasi)
      ).map(({ name, pct }) => ({ name, pct }))
    : [];

  const dependencyMatrix = sumberReady
    ? (() => {
        const byLoc = new Map(); // name -> { vol, luar }
        for (const row of filteredSumber) {
          const name = String(row.Nama_Lokasi_Bekalan || '').trim();
          const vol = toNumber(row.Jumlah_Sumber_Bekalan_Lokasi);
          if (!name || !(vol > 0)) continue;
          const lokasi = String(row.Lokasi_Sumber_Bekalan || '').trim().toLowerCase();
          const isLuar = lokasi.includes('luar');
          if (!byLoc.has(name)) byLoc.set(name, { vol: 0, luar: 0 });
          const entry = byLoc.get(name);
          entry.vol += vol;
          if (isLuar) entry.luar += vol;
        }
        return [...byLoc.entries()]
          .map(([name, { vol, luar }]) => ({ name, vol, dep: vol > 0 ? (luar / vol) * 100 : 0 }))
          .sort((a, b) => b.vol - a.vol)
          .slice(0, 12);
      })()
    : [];

  // --- Saluran Pasaran (market channel detail) ---
  const kuantitiPasaran = saluranReady
    ? filteredSaluran.reduce((sum, row) => sum + toNumber(row.Jumlah_Saluran_Pasaran_Lokasi), 0)
    : null;

  const saluranPasaran = saluranReady
    ? groupByPct(
        filteredSaluran,
        (r) => String(r.Saluran_Pasaran_v2 || r.Saluran_Pasaran || '').trim(),
        (r) => toNumber(r.Jumlah_Saluran_Pasaran_Lokasi)
      ).map(({ name, pct }) => ({ name, pct }))
    : [];

  const lokasiPasaran = saluranReady
    ? groupByPct(
        filteredSaluran,
        (r) => String(r.Lokasi_Saluran_Pasaran || '').trim(),
        (r) => toNumber(r.Jumlah_Saluran_Pasaran_Lokasi)
      ).map(({ name, pct }) => ({ name, pct }))
    : [];

  // --- Trade balance (import via Sumber Bekalan's foreign Negara_Bekalan,
  // export via Saluran Pasaran's foreign Negara_Pasaran), grouped by
  // Kategori_Komoditi, expressed in "Juta" units of whatever the sheet's
  // own Unit column records. ---
  const tradeBalanceReady = sumberReady || saluranReady;
  let tradeBalance = { categories: [], import: [], eksport: [] };
  if (tradeBalanceReady) {
    const cats = new Set();
    const importByCat = new Map();
    const eksportByCat = new Map();
    for (const row of filteredSumber) {
      if (!isForeign(row.Negara_Bekalan)) continue;
      const cat = String(row.Kategori_Komoditi || '').trim();
      const val = toNumber(row.Jumlah_Sumber_Bekalan_Lokasi);
      if (!cat || !(val > 0)) continue;
      cats.add(cat);
      importByCat.set(cat, (importByCat.get(cat) || 0) + val);
    }
    for (const row of filteredSaluran) {
      if (!isForeign(row.Negara_Pasaran)) continue;
      const cat = String(row.Kategori_Komoditi || '').trim();
      const val = toNumber(row.Jumlah_Saluran_Pasaran_Lokasi);
      if (!cat || !(val > 0)) continue;
      cats.add(cat);
      eksportByCat.set(cat, (eksportByCat.get(cat) || 0) + val);
    }
    const categories = [...cats].sort(
      (a, b) => (importByCat.get(b) || 0) + (eksportByCat.get(b) || 0) - ((importByCat.get(a) || 0) + (eksportByCat.get(a) || 0))
    ).reverse();
    tradeBalance = {
      categories,
      import: categories.map((c) => -((importByCat.get(c) || 0) / 1_000_000)),
      eksport: categories.map((c) => (eksportByCat.get(c) || 0) / 1_000_000),
    };
  }

  return {
    profilingReady, keperluanReady, sumberReady, saluranReady, tradeBalanceReady,
    kpi: { bilanganPremis, kuantitiBekalan, kuantitiPasaran },
    premis, demografi, komoditi, trend,
    sumberBekalan, lokasiSumber, saluranPasaran, lokasiPasaran,
    dependencyMatrix, tradeBalance,
    kuantitiSumberTotal,
  };
}
