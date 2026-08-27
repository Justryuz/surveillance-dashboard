import Papa from 'papaparse';

// Simple in-memory cache so that switching filters/pages doesn't re-fetch
// and re-parse the same CSV over and over. Keyed by URL.
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches a Google Sheet tab that has been "Published to the web" as CSV,
 * and parses it into an array of row objects keyed by the sheet's header
 * row (e.g. row.Tahun, row.Negara, row['Nilai (RM)']).
 *
 * @param {string} url - the published CSV URL (see src/config/sheetsConfig.js)
 * @returns {Promise<Array<Object>>}
 */
export async function fetchSheetCSV(url) {
  if (!url || url.startsWith('PASTE_')) {
    throw new Error(
      'This sheet tab has no published CSV URL yet — see src/config/sheetsConfig.js for setup steps.'
    );
  }

  const cached = cache.get(url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rows;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet (${response.status}): ${url}`);
  }
  const csvText = await response.text();

  const { data, errors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // we coerce numbers ourselves — Google Sheets CSV
    // numbers can have thousands separators / blanks that dynamicTyping
    // handles inconsistently.
  });

  if (errors && errors.length > 0) {
    // PapaParse reports row-level parse issues (e.g. a stray comma) without
    // necessarily failing the whole parse — log them but keep going.
    console.warn('CSV parse warnings for', url, errors);
  }

  cache.set(url, { rows: data, fetchedAt: Date.now() });
  return data;
}

/** Parses a sheet cell into a number, treating blanks/non-numeric as 0. */
export function toNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const cleaned = String(value).replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Clears the in-memory CSV cache (useful for a manual "refresh data" button). */
export function clearSheetCache() {
  cache.clear();
}
