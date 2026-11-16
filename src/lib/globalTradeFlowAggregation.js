import { toNumber } from './googleSheets';

const WORLD = 'WORLD';

function normKey(str) {
  return String(str || '').trim().toUpperCase();
}

/** Exact (normalized) match. GLOBAL_TRADE_FLOW's Jenis_Komoditi field is
 * now standardized through REF_KOMODITI before this ever runs (see
 * komoditiStandardization.js), so it carries the same canonical name as
 * every other sheet — an exact match is correct here.
 *
 * This used to be a "loose" match (either string containing the other, or
 * both sharing a leading word) specifically to bridge PRODUCTION's
 * fine-grained commodity names (e.g. "Durian Belanda") against
 * GLOBAL_TRADE_FLOW's supposedly broader ones (e.g. "Durian"). That
 * assumption was wrong — "Durian" and "Durian Belanda" (soursop) are
 * different commodities, not a base/variety pair, so the loose match was
 * merging two genuinely different fruits. */
function looselyMatchesCommodity(a, b) {
  if (!a || !b) return true; // no filter requested on one side
  return normKey(a) === normKey(b);
}

function filterRows(rows, { year, commodity, tradeType }) {
  return rows.filter((row) =>
    (!year || String(row.Year).trim() === String(year).trim()) &&
    (!commodity || looselyMatchesCommodity(row.Jenis_Komoditi, commodity)) &&
    (!tradeType || normKey(row['Trade Type']) === normKey(tradeType))
  );
}

/**
 * Top N reporters for a commodity/year (e.g. "top 10 importers of Pisang
 * in 2024") — uses each reporter's Partner="World" row, which is the
 * sheet's own aggregate total for that reporter, rather than summing
 * individual partner rows ourselves (avoids double-counting).
 */
export function computeTopReporters(rows, { year, commodity, tradeType = 'Import', limit = 10 }) {
  const filtered = filterRows(rows, { year, commodity, tradeType }).filter(
    (row) => normKey(row.Partner) === WORLD
  );
  return filtered
    .map((row) => ({ reporter: String(row.Reporter || '').trim(), value: toNumber(row['Value (usd)']) }))
    .filter((r) => r.reporter)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * The single largest specific partner (excluding the "World" aggregate
 * row) for a given reporter + commodity + year — i.e. "who does this
 * country mainly trade this commodity with".
 */
export function computeTopPartner(rows, { year, commodity, reporter, tradeType = 'Import' }) {
  const filtered = filterRows(rows, { year, commodity, tradeType }).filter(
    (row) =>
      normKey(row.Reporter) === normKey(reporter) &&
      normKey(row.Partner) !== WORLD &&
      normKey(row.Partner) !== normKey(reporter) // skip self-referential rows if any
  );
  if (filtered.length === 0) return null;

  const totals = new Map();
  for (const row of filtered) {
    const partner = String(row.Partner || '').trim();
    if (!partner) continue;
    totals.set(partner, (totals.get(partner) || 0) + toNumber(row['Value (usd)']));
  }
  let best = null;
  for (const [partner, value] of totals.entries()) {
    if (!best || value > best.value) best = { partner, value };
  }
  return best;
}

/**
 * Major worldwide flows for a commodity, independent of any single anchor
 * country — the top N reporters (biggest exporters, by default) and, for
 * each, their own top few partners. E.g. for Cili exports this surfaces
 * things like Thailand -> Bangladesh even when nothing on the map has been
 * clicked (Thailand doesn't have to be the selected/anchor country for its
 * real flow to show).
 */
export function computeTopGlobalFlows(rows, { year, commodity, tradeType = 'Export', topReportersLimit = 6, partnersPerReporterLimit = 2 }) {
  const topReporters = computeTopReporters(rows, { year, commodity, tradeType, limit: topReportersLimit });
  const flows = [];
  for (const { reporter } of topReporters) {
    const partners = computeTopPartners(rows, { year, commodity, reporter, tradeType, limit: partnersPerReporterLimit });
    for (const { partner, value } of partners) {
      flows.push({ reporter, partner, value });
    }
  }
  return flows;
}

/**
 * Full ranked list of partners (top N by value) for a given reporter +
 * commodity + year + trade type, excluding the "World" aggregate row and
 * any self-referential row.
 *
 * For Trade Type = 'Export', `reporter` is the EXPORTER and each returned
 * partner is a destination country it sells this commodity to (e.g.
 * Thailand exporting cili to China, Malaysia, Myanmar...).
 * For Trade Type = 'Import', `reporter` is the IMPORTER and each returned
 * partner is a source country it buys this commodity from.
 */
export function computeTopPartners(rows, { year, commodity, reporter, tradeType = 'Import', limit = 10 }) {
  const filtered = filterRows(rows, { year, commodity, tradeType }).filter(
    (row) =>
      normKey(row.Reporter) === normKey(reporter) &&
      normKey(row.Partner) !== WORLD &&
      normKey(row.Partner) !== normKey(reporter) // skip self-referential rows if any
  );
  if (filtered.length === 0) return [];

  const totals = new Map();
  for (const row of filtered) {
    const partner = String(row.Partner || '').trim();
    if (!partner) continue;
    totals.set(partner, (totals.get(partner) || 0) + toNumber(row['Value (usd)']));
  }
  return [...totals.entries()]
    .map(([partner, value]) => ({ partner, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * Walks a real upstream sourcing chain starting from `startCountry`
 * (default Malaysia): finds startCountry's top IMPORT partner for this
 * commodity, then that country's top IMPORT partner, and so on — e.g.
 * Malaysia -> Vietnam -> Japan, meaning Malaysia's biggest supplier is
 * Vietnam, and Vietnam's own biggest supplier (for the same commodity) is
 * Japan. Stops at maxHops, or if a country repeats (cycle), or if a link
 * in the chain has no data.
 */
export function computeSupplyChain(rows, { year, commodity, startCountry = 'Malaysia', maxHops = 3 }) {
  const chain = [{ country: startCountry, value: null }];
  const seen = new Set([normKey(startCountry)]);
  let current = startCountry;

  for (let hop = 0; hop < maxHops; hop++) {
    const top = computeTopPartner(rows, { year, commodity, reporter: current, tradeType: 'Import' });
    if (!top || seen.has(normKey(top.partner))) break;
    chain.push({ country: top.partner, value: top.value });
    seen.add(normKey(top.partner));
    current = top.partner;
  }

  return chain; // length 1 means no upstream data found at all
}

/**
 * The downstream / customer side: among the top N importers of this
 * commodity worldwide, which ones have `sourceCountry` (default Malaysia)
 * as their single largest import partner — e.g. Singapore and Brunei both
 * importing Pisang mainly from Malaysia.
 */
export function computeTopCustomers(rows, { year, commodity, sourceCountry = 'Malaysia', candidatePoolSize = 30, limit = 10 }) {
  const topImporters = computeTopReporters(rows, { year, commodity, tradeType: 'Import', limit: candidatePoolSize });

  const customers = [];
  for (const { reporter, value: importTotal } of topImporters) {
    if (normKey(reporter) === normKey(sourceCountry)) continue;
    const top = computeTopPartner(rows, { year, commodity, reporter, tradeType: 'Import' });
    if (top && normKey(top.partner) === normKey(sourceCountry)) {
      customers.push({ country: reporter, value: top.value, totalImport: importTotal });
    }
  }
  return customers.sort((a, b) => b.value - a.value).slice(0, limit);
}

/** Distinct commodity values available in this tab, for populating a
 * commodity picker specific to the supply-chain view. */
export function computeAvailableCommodities(rows) {
  const set = new Set();
  for (const row of rows) {
    const c = String(row.Jenis_Komoditi || '').trim();
    if (c) set.add(c);
  }
  return [...set].sort();
}

/** Distinct years available in this tab. */
export function computeAvailableYears(rows) {
  const set = new Set();
  for (const row of rows) {
    const y = String(row.Year || '').trim();
    if (y) set.add(y);
  }
  return [...set].sort();
}
