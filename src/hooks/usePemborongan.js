import { useEffect, useState, useCallback } from 'react';
import { fetchSheetCSV, clearSheetCache } from '../lib/googleSheets';
import { SHEET_URLS } from '../config/sheetsConfig';

const TABS = ['PEMBORONGAN_PROFILING', 'PEMBORONGAN_KEPERLUAN', 'PEMBORONGAN_SUMBER', 'PEMBORONGAN_SALURAN'];

/**
 * Loads the 4 tabs behind the "Pemborongan" (wholesaler) page: the
 * respondent-profile tab (one row per premise) plus the supply-need,
 * supply-source, and market-channel detail tabs, which join back to the
 * profile tab via No_Siri_Borang.
 */
export function usePemborongan() {
  const [data, setData] = useState({
    PEMBORONGAN_PROFILING: [], PEMBORONGAN_KEPERLUAN: [], PEMBORONGAN_SUMBER: [], PEMBORONGAN_SALURAN: [],
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

  return {
    profiling: data.PEMBORONGAN_PROFILING,
    keperluan: data.PEMBORONGAN_KEPERLUAN,
    sumber: data.PEMBORONGAN_SUMBER,
    saluran: data.PEMBORONGAN_SALURAN,
    loading, error, refresh,
  };
}
