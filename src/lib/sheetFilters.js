import { normalizeMonth } from './monthUtils';
import { normalizeNegeriName } from './geoNames';

export function matchesYear(row, year, yearField = 'Tahun') {
  if (!year) return true;
  return String(row[yearField] || '').trim() === String(year).trim();
}

export function matchesMonth(row, monthCode, monthField = 'Bulan') {
  if (!monthCode) return true;
  return normalizeMonth(row[monthField]) === monthCode;
}

/** Exact (trimmed, case-insensitive) match. Every sheet's commodity/
 * category fields are now standardized through REF_KOMODITI before any
 * filtering happens (see komoditiStandardization.js), so an exact match
 * is both correct and safer than a loose one here.
 *
 * This used to be a "loose" match — matching when either string contained
 * the other, OR when both shared the same leading word (e.g. "CILI MERAH"
 * / "CILI KERING" both starting with "CILI") — to bridge PRODUCTION's
 * fine-grained variety names against other tabs' different granularity.
 * That heuristic is retired now that REF_KOMODITI standardizes every
 * sheet to the same name, and it also produced false positives on
 * commodities that only coincidentally share a leading word but are
 * genuinely different things — e.g. "Durian" and "Durian Belanda" (a
 * completely different fruit, soursop) both start with "Durian" but were
 * being treated as the same commodity. */
function exactMatch(rowValue, keyword) {
  if (!keyword) return true;
  const a = String(rowValue || '').trim().toLowerCase();
  const b = String(keyword).trim().toLowerCase();
  if (!a) return false;
  return a === b;
}

/** commodityKeyword: matched against the row's commodity-name field —
 * see exactMatch() above for exactly how. */
export function matchesCommodityKeyword(row, commodityKeyword, field = 'Jenis Komoditi') {
  return exactMatch(row[field], commodityKeyword);
}

/** categoryKeyword: same idea as matchesCommodityKeyword, but for the
 * broader category field (e.g. "Kategori Komoditi" / "Kumpulan Barangan"). */
export function matchesCategoryKeyword(row, categoryKeyword, field = 'Kategori Komoditi') {
  return exactMatch(row[field], categoryKeyword);
}

/** englishKeywords: array of English substrings, any of which may match —
 * used for TRADE_LOGISTIC's HS_CODE_DESCRIPTION column. */
export function matchesAnyKeyword(row, englishKeywords, field) {
  if (!englishKeywords || englishKeywords.length === 0) return true;
  const text = String(row[field] || '').toLowerCase();
  return englishKeywords.some((kw) => text.includes(kw.toLowerCase()));
}

export function matchesNegeri(row, negeriLabel, field = 'Negeri') {
  if (!negeriLabel) return true;
  return normalizeNegeriName(row[field]) === negeriLabel;
}
