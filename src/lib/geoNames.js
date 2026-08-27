export const ALL_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
  'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
  'Terengganu', 'W.P. Kuala Lumpur',
];

// Maps assorted raw spellings found in sheet data (any case, with/without
// abbreviations) onto the canonical state names above, which are what the
// geojson map files and the UI's negeri filter both use.
const RAW_TO_CANONICAL = {
  JOHOR: 'Johor',
  KEDAH: 'Kedah',
  KELANTAN: 'Kelantan',
  MELAKA: 'Melaka', MALACCA: 'Melaka',
  'NEGERI SEMBILAN': 'Negeri Sembilan', 'N. SEMBILAN': 'Negeri Sembilan', N9: 'Negeri Sembilan',
  PAHANG: 'Pahang',
  PERAK: 'Perak',
  PERLIS: 'Perlis',
  'PULAU PINANG': 'Pulau Pinang', PENANG: 'Pulau Pinang',
  SABAH: 'Sabah',
  SARAWAK: 'Sarawak',
  SELANGOR: 'Selangor',
  TERENGGANU: 'Terengganu',
  'KUALA LUMPUR': 'W.P. Kuala Lumpur',
  'WP KUALA LUMPUR': 'W.P. Kuala Lumpur',
  'W.P. KUALA LUMPUR': 'W.P. Kuala Lumpur',
  'WILAYAH PERSEKUTUAN KUALA LUMPUR': 'W.P. Kuala Lumpur',
};

/** Normalizes a raw "Negeri" value from the sheet into one of ALL_STATES,
 * or returns the original title-cased text if it isn't recognized (e.g. an
 * unmapped federal territory like Labuan or Putrajaya). */
export function normalizeNegeriName(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (RAW_TO_CANONICAL[upper]) return RAW_TO_CANONICAL[upper];
  return trimmed
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
