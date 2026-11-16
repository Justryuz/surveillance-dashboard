export const ALL_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
  'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
  'Terengganu', 'W.P. Kuala Lumpur', 'W.P. Putrajaya', 'W.P. Labuan',
];

// Maps assorted raw spellings found in sheet data (any case, with/without
// abbreviations) onto the canonical state names above, which are what the
// geojson map files and the UI's negeri filter both use.
// Keys are compared with every non-letter/digit removed and upper-cased, so
// "W.P. Kuala Lumpur", "WP Kuala Lumpur", "W.P Kuala Lumpur" and "wp-kuala-lumpur"
// all collapse to the same key.
const RAW_TO_CANONICAL = {
  JOHOR: 'Johor',
  KEDAH: 'Kedah',
  KELANTAN: 'Kelantan',
  MELAKA: 'Melaka', MALACCA: 'Melaka',
  NEGERISEMBILAN: 'Negeri Sembilan', NSEMBILAN: 'Negeri Sembilan', N9: 'Negeri Sembilan',
  PAHANG: 'Pahang',
  PERAK: 'Perak',
  PERLIS: 'Perlis',
  PULAUPINANG: 'Pulau Pinang', PENANG: 'Pulau Pinang',
  SABAH: 'Sabah',
  SARAWAK: 'Sarawak',
  SELANGOR: 'Selangor',
  TERENGGANU: 'Terengganu',
  KUALALUMPUR: 'W.P. Kuala Lumpur', WPKUALALUMPUR: 'W.P. Kuala Lumpur',
  WILAYAHPERSEKUTUANKUALALUMPUR: 'W.P. Kuala Lumpur',
  PUTRAJAYA: 'W.P. Putrajaya', WPPUTRAJAYA: 'W.P. Putrajaya',
  WILAYAHPERSEKUTUANPUTRAJAYA: 'W.P. Putrajaya',
  LABUAN: 'W.P. Labuan', WPLABUAN: 'W.P. Labuan',
  WILAYAHPERSEKUTUANLABUAN: 'W.P. Labuan',
};

/** Normalizes a raw "Negeri" value from the sheet into one of ALL_STATES,
 * or returns the original title-cased text if it isn't recognized (an unrecognised value). */
export function normalizeNegeriName(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const key = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (RAW_TO_CANONICAL[key]) return RAW_TO_CANONICAL[key];
  return trimmed
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
