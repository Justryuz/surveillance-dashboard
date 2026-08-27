import { useEffect, useState, useCallback } from 'react';
import { fetchSheetCSV, clearSheetCache } from '../lib/googleSheets';
import { SHEET_URLS } from '../config/sheetsConfig';

const TABS = ['PRODUCTION', 'CONSUMPTION_BY_STATE', 'MARKET_FLOW', 'TRADE_LOGISTIC', 'REF_PORT'];

/**
 * Loads every sheet tab needed to drive the map, top-5 lists, pie chart,
 * and route donuts on the home page (everything except IMPORT/EXPORT,
 * which useTradeData.js already covers).
 */
export function useDashboardData() {
  const [data, setData] = useState({
    PRODUCTION: [], CONSUMPTION_BY_STATE: [], MARKET_FLOW: [], TRADE_LOGISTIC: [], REF_PORT: [],
  });
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
        const results = await Promise.all(TABS.map((tab) => fetchSheetCSV(SHEET_URLS[tab])));
        if (!cancelled) {
          const next = {};
          TABS.forEach((tab, i) => { next[tab] = results[i]; });
          setData(next);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [reloadToken]);

  return { ...data, loading, error, refresh };
}
