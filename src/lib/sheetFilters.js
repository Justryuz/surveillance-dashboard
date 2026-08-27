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

/** commodityKeyword: a plain lowercase keyword matched as a substring
 * against the row's commodity-name field (case-insensitive). */
export function matchesCommodityKeyword(row, commodityKeyword, field = 'Jenis Komoditi') {
  if (!commodityKeyword) return true;
  return String(row[field] || '').toLowerCase().includes(commodityKeyword.toLowerCase());
}

/** categoryKeyword: same idea as matchesCommodityKeyword, but for the
 * broader category field (e.g. "Kategori Komoditi" / "Kumpulan Barangan"). */
export function matchesCategoryKeyword(row, categoryKeyword, field = 'Kategori Komoditi') {
  if (!categoryKeyword) return true;
  return String(row[field] || '').toLowerCase().includes(categoryKeyword.toLowerCase());
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
