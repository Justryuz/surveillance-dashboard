// -----------------------------------------------------------------------------
// Google Sheets data source configuration
// -----------------------------------------------------------------------------
// This dashboard reads its data from a Google Sheet that has been "Published
// to the web" as CSV, one tab at a time — the zero-backend way to expose a
// tab as a plain CSV URL that `fetch()` can read directly from the browser.
//
// IMPORT and EXPORT still need their own published URLs (they use different
// sharing than the rest, since they came from the original "share" link
// rather than "Publish to web"). To get one:
//   1. Open the sheet -> File -> Share -> Publish to web
//   2. Pick the specific tab (e.g. "IMPORT") in the first dropdown — not
//      "Entire document" — and "Comma-separated values (.csv)" in the second
//   3. Click Publish, then copy the URL and paste it below
//
// Note: publishing makes that tab's data readable by anyone with the URL,
// and it can take a minute or two to reflect edits made in the sheet.
// -----------------------------------------------------------------------------

export const SHEET_URLS = {
  // Required for the "Insight Perdagangan" (trade) view on the home page.
  IMPORT: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0rKXqWi4LPur--LAjJ2S3oZsYKvo19EmC-RsebtlhOY6MVufdcsMzG7JMXXrOMAMh5AkD8GJDk5Lc/pub?gid=0&single=true&output=csv',
  EXPORT: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0rKXqWi4LPur--LAjJ2S3oZsYKvo19EmC-RsebtlhOY6MVufdcsMzG7JMXXrOMAMh5AkD8GJDk5Lc/pub?gid=1755772581&single=true&output=csv',

  // Powers the map, top-5 lists, pie chart, route donuts, and KPI totals.
  PRODUCTION: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0rKXqWi4LPur--LAjJ2S3oZsYKvo19EmC-RsebtlhOY6MVufdcsMzG7JMXXrOMAMh5AkD8GJDk5Lc/pub?gid=643161734&single=true&output=csv',
  CONSUMPTION_BY_STATE: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0rKXqWi4LPur--LAjJ2S3oZsYKvo19EmC-RsebtlhOY6MVufdcsMzG7JMXXrOMAMh5AkD8GJDk5Lc/pub?gid=1661592167&single=true&output=csv',
  CONSUMPTION_BY_MONTH: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0rKXqWi4LPur--LAjJ2S3oZsYKvo19EmC-RsebtlhOY6MVufdcsMzG7JMXXrOMAMh5AkD8GJDk5Lc/pub?gid=1742082107&single=true&output=csv',
  MARKET_FLOW: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0rKXqWi4LPur--LAjJ2S3oZsYKvo19EmC-RsebtlhOY6MVufdcsMzG7JMXXrOMAMh5AkD8GJDk5Lc/pub?gid=561041031&single=true&output=csv',
  TRADE_LOGISTIC: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0rKXqWi4LPur--LAjJ2S3oZsYKvo19EmC-RsebtlhOY6MVufdcsMzG7JMXXrOMAMh5AkD8GJDk5Lc/pub?gid=707957764&single=true&output=csv',
  REF_PORT: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0rKXqWi4LPur--LAjJ2S3oZsYKvo19EmC-RsebtlhOY6MVufdcsMzG7JMXXrOMAMh5AkD8GJDk5Lc/pub?gid=1894625263&single=true&output=csv',
};

// UI commodity codes mapped to keywords used to match rows in each tab.
// Different tabs describe commodities in different fields/languages, so
// each code carries both a Malay keyword (for Jenis Komoditi columns) and
// an English keyword (for TRADE_LOGISTIC's HS_CODE_DESCRIPTION column).
export const COMMODITY_KEYWORDS = {
  cili: { malay: 'cili', english: ['chilli', 'chili', 'pepper'] },
  tembikai: { malay: 'tembikai', english: ['watermelon'] },
  kubis: { malay: 'kubis', english: ['cabbage'] },
};

// Kept for any code still importing the old name — same lookup as
// COMMODITY_KEYWORDS[x].malay, used where only the Malay keyword is needed.
export const COMMODITY_CODE_TO_KEYWORD = {
  cili: 'cili',
  tembikai: 'tembikai',
  kubis: 'kubis',
};

// UI negeri (state) filter codes mapped to the canonical state name used
// by the geojson maps — see src/lib/geoNames.js for the matching logic
// that maps raw sheet values (e.g. "SABAH", "W.P Kuala Lumpur") onto these
// same canonical names.
export const NEGERI_CODE_TO_LABEL = {
  johor: 'Johor',
  kedah: 'Kedah',
  kelantan: 'Kelantan',
  melaka: 'Melaka',
  negeri_sembilan: 'Negeri Sembilan',
  pahang: 'Pahang',
  perak: 'Perak',
  perlis: 'Perlis',
  pulau_pinang: 'Pulau Pinang',
  sabah: 'Sabah',
  sarawak: 'Sarawak',
  selangor: 'Selangor',
  terengganu: 'Terengganu',
  kl: 'W.P. Kuala Lumpur',
};

