import { useSearchParams } from 'react-router-dom';

/**
 * True when the dashboard runs inside an iframe (e.g. a SISDA grid widget).
 * Detected automatically so it survives SubNav navigation, which drops query
 * params; ?embed=1 forces it on and ?embed=0 forces it off.
 */
export function useIsEmbedded() {
  const [searchParams] = useSearchParams();
  const embedParam = searchParams.get('embed');
  return embedParam === '1' || (embedParam !== '0' && typeof window !== 'undefined' && window.self !== window.top);
}
