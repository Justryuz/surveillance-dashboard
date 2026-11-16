import { useEffect, useState, useCallback } from 'react';
import { fetchSheetCSV, clearSheetCache } from '../lib/googleSheets';
import { SHEET_URLS } from '../config/sheetsConfig';

/**
 * Loads the GLOBAL_TRADE_FLOW tab (a separate, much larger Google Sheet —
 * worldwide bilateral trade data across ~200 countries) on its own, rather
 * than bundling it into useDashboardData. It's only needed for the world
 * flow map's supply-chain lines, so keeping it separate means the rest of
 * the page doesn't wait on this much bigger fetch/parse.
 */
export function useGlobalTradeFlow() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => {
    clearSheetCache();
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSheetCSV(SHEET_URLS.GLOBAL_TRADE_FLOW);
        // This sheet's commodity column is published as lowercase
        // "jenis_komoditi" rather than the "Jenis_Komoditi" every other tab
        // (and all the aggregation code) uses — normalize it here, once,
        // right after fetch, rather than special-casing it everywhere.
        const normalized = data.map((row) => (
          row.Jenis_Komoditi === undefined && row.jenis_komoditi !== undefined
            ? { ...row, Jenis_Komoditi: row.jenis_komoditi }
            : row
        ));
        if (!cancelled) setRows(normalized);
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [reloadToken]);

  return { rows, loading, error, refresh };
}
