// MalaysiaFlowMap.jsx only draws a fixed set of 12 countries (it has no
// world geo lookup beyond these coordinates), using short display names.
// The sheet's IMPORT/EXPORT tabs use full customs names instead (e.g.
// "CHINA, PEOPLE'S REPUBLIC OF", "UNITED STATES OF AMERICA"), so this maps
// each display name to the uppercase substring(s) that identify it in the
// sheet's "Negara" column.
export const FLOW_MAP_COUNTRY_KEYWORDS = {
  Singapura: ['SINGAPORE'],
  Jepun: ['JAPAN'],
  China: ['CHINA'],
  India: ['INDIA'],
  Vietnam: ['VIETNAM'],
  Indonesia: ['INDONESIA'],
  Thailand: ['THAILAND'],
  Filipina: ['PHILIPPINES'],
  Brunei: ['BRUNEI'],
  Australia: ['AUSTRALIA'],
  'Amerika Syarikat': ['UNITED STATES'],
};
