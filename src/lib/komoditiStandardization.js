// Standardizes commodity ("Komoditi") names and categories across every
// sheet (PRODUCTION, IMPORT/EXPORT, CONSUMPTION_BY_STATE, MARKET_FLOW,
// TRADE_LOGISTIC) using the REF_KOMODITI reference tab, the same way
// countryStandardization.js does for country names via REF_COUNTRY.
//
// REF_KOMODITI columns (header spelling/spacing may vary slightly sheet to
// sheet, e.g. "Standard  Komoditi Name" with a double space — findHeaderKey
// below matches on normalized whitespace so small header differences don't
// break the mapping):
//   1. Raw Komoditi Name      — a raw spelling as it appears in any sheet
//   2. Standard Komoditi Name — the canonical name every variant maps to
//   3. Kategori                — the canonical category for that commodity

function normKey(str) {
  return String(str || '').trim().toUpperCase();
}

function normHeader(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Finds the actual column key in a sample row matching a target header,
 * tolerating extra/irregular whitespace (e.g. "Standard  Komoditi Name").
 * `targets` can be a single header string or an array of candidate
 * spellings to try in order (e.g. "Kategori Komoditi" as well as plain
 * "Kategori") — the first one that matches a real column wins. */
function findHeaderKey(sampleRow, targets) {
  const candidates = Array.isArray(targets) ? targets : [targets];
  const keys = Object.keys(sampleRow || {});
  for (const target of candidates) {
    const targetNorm = normHeader(target);
    const found = keys.find((key) => normHeader(key) === targetNorm);
    if (found) return found;
  }
  return null;
}

/**
 * Builds a raw-komoditi-name -> { standardName, kategori } lookup from
 * REF_KOMODITI. Returns null while the sheet hasn't loaded yet.
 */
export function computeKomoditiNameMap(refKomoditiRows) {
  if (!refKomoditiRows || refKomoditiRows.length === 0) return null;

  const sample = refKomoditiRows[0];
  const rawKey = findHeaderKey(sample, ['Raw Komoditi Name']) || 'Raw Komoditi Name';
  const standardKey = findHeaderKey(sample, ['Standard Komoditi Name']) || 'Standard Komoditi Name';
  const kategoriKey = findHeaderKey(sample, ['Kategori Komoditi', 'Kategori']) || 'Kategori Komoditi';

  const map = new Map();
  for (const row of refKomoditiRows) {
    const raw = normKey(row[rawKey]);
    const standardName = String(row[standardKey] || '').trim();
    const kategori = String(row[kategoriKey] || '').trim();
    if (!raw) continue;
    map.set(raw, { standardName: standardName || raw, kategori });
  }
  return map;
}

/**
 * Standardizes a single raw commodity name using the REF_KOMODITI map.
 * Falls back to the raw value itself (trimmed) when the map isn't loaded
 * yet, or this spelling isn't in REF_KOMODITI — so the app never breaks
 * or zeroes out data over a commodity the reference table doesn't (yet)
 * cover; it just won't be merged with other variants until it's added.
 */
export function standardizeKomoditi(komoditiMap, rawName) {
  const trimmed = String(rawName || '').trim();
  if (!trimmed) return '';
  const hit = komoditiMap && komoditiMap.get(normKey(trimmed));
  return hit ? hit.standardName : trimmed;
}

/** Looks up the canonical Kategori for a raw commodity name, or undefined
 * if it isn't in REF_KOMODITI (yet). */
export function lookupKategoriForKomoditi(komoditiMap, rawName) {
  const hit = komoditiMap && komoditiMap.get(normKey(rawName));
  return hit ? hit.kategori : undefined;
}

/**
 * Builds the Kategori -> Komoditi tree straight from REF_KOMODITI itself
 * (its Kategori + Standard Komoditi Name columns, deduped), rather than
 * from whatever happens to exist in any one dataset (PRODUCTION,
 * IMPORT/EXPORT, etc). This is the single Kategori/Komoditi option list
 * meant to be shared by every filter dropdown on a page, so a commodity is
 * offered consistently regardless of which sheet(s) currently have rows
 * for it — REF_KOMODITI is the canonical master list.
 * Returns { categories: string[], commoditiesByCategory: { [c]: string[] } },
 * or null while REF_KOMODITI hasn't loaded yet.
 */
export function computeKomoditiCategoryTree(refKomoditiRows) {
  if (!refKomoditiRows || refKomoditiRows.length === 0) return null;

  const sample = refKomoditiRows[0];
  const standardKey = findHeaderKey(sample, ['Standard Komoditi Name']) || 'Standard Komoditi Name';
  const kategoriKey = findHeaderKey(sample, ['Kategori Komoditi', 'Kategori']) || 'Kategori Komoditi';

  const commoditiesByCategory = {};
  for (const row of refKomoditiRows) {
    const category = String(row[kategoriKey] || '').trim();
    const commodity = String(row[standardKey] || '').trim();
    if (!category || !commodity) continue;
    if (!commoditiesByCategory[category]) commoditiesByCategory[category] = new Set();
    commoditiesByCategory[category].add(commodity);
  }

  const categories = Object.keys(commoditiesByCategory).sort();
  const result = {};
  for (const category of categories) {
    result[category] = [...commoditiesByCategory[category]].sort();
  }

  if (categories.length === 0) {
    // Diagnostic: REF_KOMODITI has rows but none produced a usable
    // Kategori+Komoditi pair — almost always a header-name mismatch (the
    // resolved column keys below won't be the sheet's real headers), so
    // log exactly what was resolved/seen as plain text.
    console.warn(
      '[komoditiStandardization] computeKomoditiCategoryTree found 0 categories.\n' +
      'totalRows: ' + refKomoditiRows.length + '\n' +
      'sampleKeys: ' + JSON.stringify(Object.keys(sample)) + '\n' +
      'sampleRow: ' + JSON.stringify(sample) + '\n' +
      'resolvedStandardKey: ' + JSON.stringify(standardKey) + '\n' +
      'resolvedKategoriKey: ' + JSON.stringify(kategoriKey)
    );
  }

  return { categories, commoditiesByCategory: result };
}

/**
 * Returns a new array of rows with `nameField` rewritten to the
 * standardized commodity name, and — when `categoryField` is given and
 * REF_KOMODITI has a Kategori for that commodity — `categoryField`
 * overwritten with the canonical Kategori too. This is what fixes
 * cross-tab category mismatches (e.g. Halia filed under "Rempah" in
 * PRODUCTION but "Sayur Sayuran" in IMPORT/EXPORT) at the data layer,
 * instead of needing a code-side workaround.
 * If komoditiMap isn't loaded yet, returns the original rows untouched.
 */
export function standardizeRowsKomoditiFields(rows, komoditiMap, nameField, categoryField) {
  if (!komoditiMap || !rows || rows.length === 0) return rows;
  return rows.map((row) => {
    if (row[nameField] == null) return row;
    const next = { ...row };
    const rawName = row[nameField];
    next[nameField] = standardizeKomoditi(komoditiMap, rawName);
    if (categoryField) {
      const kategori = lookupKategoriForKomoditi(komoditiMap, rawName);
      if (kategori) next[categoryField] = kategori;
    }
    return next;
  });
}
