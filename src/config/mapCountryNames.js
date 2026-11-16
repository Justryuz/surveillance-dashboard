// MalaysiaFlowMap's fixed 12-country globe uses Malay display names for a
// few countries (Singapura, Jepun, Filipina, Amerika Syarikat, and the
// all-caps MALAYSIA label). GLOBAL_TRADE_FLOW's Reporter/Partner columns
// and countryCoordinates.js instead use UN Comtrade-style English spellings
// (Singapore, Japan, Philippines, USA, Malaysia, and notably "Viet Nam" not
// "Vietnam"). This table translates a map display name to the matching
// trade-sheet/coordinate name before it's used to query GLOBAL_TRADE_FLOW
// or look up a marker position.
//
// Any name not listed here (China, India, Indonesia, Thailand, Brunei,
// Australia, or any dynamically-added "extra" node that already comes
// straight from the sheet) is assumed to already be in the canonical form
// and is passed through unchanged.
const MAP_DISPLAY_TO_TRADE_NAME = {
  MALAYSIA: 'Malaysia',
  Singapura: 'Singapore',
  Jepun: 'Japan',
  Vietnam: 'Viet Nam',
  Filipina: 'Philippines',
  'Amerika Syarikat': 'USA',
};

export function toTradeCountryName(displayName) {
  const name = String(displayName || '').trim();
  return MAP_DISPLAY_TO_TRADE_NAME[name] || name;
}
