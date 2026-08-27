// The sheet's various tabs record months in different formats:
//   IMPORT / EXPORT           -> "JANUARI".."DISEMBER" (Malay, uppercase)
//   PRODUCTION                -> Malay month name, or blank for annual rows
//   CONSUMPTION_BY_MONTH      -> "January".."December" (English)
//   TRADE_LOGISTIC            -> MONTH_NAME "January".."December", plus a
//                                separate numeric MONTH_NUMBER
// This normalizes any of those into one of the same 3-letter codes used by
// the page's month <select> (jan, feb, mac, apr, mei, jun, jul, ogo, sep,
// okt, nov, dis), so one filter value works against every tab.

const NAME_TO_CODE = {
  JANUARI: 'jan', JANUARY: 'jan',
  FEBRUARI: 'feb', FEBRUARY: 'feb',
  MAC: 'mac', MARCH: 'mac',
  APRIL: 'apr',
  MEI: 'mei', MAY: 'mei',
  JUN: 'jun', JUNE: 'jun',
  JULAI: 'jul', JULY: 'jul',
  OGOS: 'ogo', AUGUST: 'ogo',
  SEPTEMBER: 'sep',
  OKTOBER: 'okt', OCTOBER: 'okt',
  NOVEMBER: 'nov',
  DISEMBER: 'dis', DECEMBER: 'dis',
};

const NUMBER_TO_CODE = {
  1: 'jan', 2: 'feb', 3: 'mac', 4: 'apr', 5: 'mei', 6: 'jun',
  7: 'jul', 8: 'ogo', 9: 'sep', 10: 'okt', 11: 'nov', 12: 'dis',
};

/** Normalizes a raw month value (name in any language, or a number) into
 * one of the page's 3-letter month codes, or null if blank/unrecognized. */
export function normalizeMonth(raw) {
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === '') return null;

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && NUMBER_TO_CODE[asNumber]) {
    return NUMBER_TO_CODE[asNumber];
  }
  return NAME_TO_CODE[trimmed.toUpperCase()] || null;
}
