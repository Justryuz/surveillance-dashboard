import { useEffect, useState, useCallback } from 'react';
import { fetchSheetCSV, clearSheetCache } from '../lib/googleSheets';
import { SHEET_URLS } from '../config/sheetsConfig';

/**
 * Loads the IMPORT and EXPORT tabs from the published Google Sheet.
 * Returns raw row arrays — filtering/aggregation happens separately in
 * src/lib/tradeAggregation.js so it can be unit-tested and reused.
 */
export function useTradeData() {
  const [importRows, setImportRows] = useState([]);
  const [exportRows, setExportRows] = useState([]);
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
        const [imports, exports] = await Promise.all([
          fetchSheetCSV(SHEET_URLS.IMPORT),
          fetchSheetCSV(SHEET_URLS.EXPORT),
        ]);
        if (!cancelled) {
          setImportRows(imports);
          setExportRows(exports);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { importRows, exportRows, loading, error, refresh };
}
