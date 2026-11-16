function normKey(str) {
  return String(str || '').trim().toUpperCase();
}

/**
 * Builds a raw-country-name -> standardized-name lookup from REF_COUNTRY
 * (columns: "Country" = a raw spelling, "Standardized Country" = the
 * canonical uppercase name every variant should map to).
 */
export function computeCountryNameMap(refCountryRows) {
  const map = new Map();
  for (const row of refCountryRows) {
    const raw = normKey(row.Country);
    const standard = normKey(row['Standardized Country']);
    if (raw && standard) map.set(raw, standard);
  }
  return map;
}

/**
 * Standardizes a raw country name using the REF_COUNTRY map. Falls back to
 * the raw name itself (trimmed + uppercased) when the map is missing/not
 * loaded yet, or when this particular spelling isn't in REF_COUNTRY —
 * this keeps the app from breaking or zeroing out data over a country the
 * reference table doesn't cover, it just won't be merged with other
 * variants of that same country until it's added.
 */
export function standardizeCountry(countryNameMap, rawName) {
  const key = normKey(rawName);
  if (!key) return '';
  if (countryNameMap && countryNameMap.has(key)) return countryNameMap.get(key);
  return key;
}

/**
 * Returns a new array of rows with the given field name(s) rewritten to
 * their standardized country name. Lets existing aggregation functions
 * (which group/join by these fields) work unchanged — just feed them
 * these standardized rows instead of the raw sheet rows.
 * If countryNameMap isn't loaded yet, returns the original rows untouched.
 */
export function standardizeRowsCountryFields(rows, countryNameMap, fields) {
  if (!countryNameMap || !rows || rows.length === 0) return rows;
  return rows.map((row) => {
    const next = { ...row };
    for (const field of fields) {
      if (row[field] != null) next[field] = standardizeCountry(countryNameMap, row[field]);
    }
    return next;
  });
}
