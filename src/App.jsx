import { useState, useRef, useLayoutEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import SubNav from './components/layout/SubNav';
import ErrorBoundary from './components/common/ErrorBoundary';

// Home page loads with the main bundle; the other pages are split into their
// own chunks and only downloaded when the user opens them.
import HalamanUtama from './pages/HalamanUtama';
const Pembekalan = lazy(() => import('./pages/Pembekalan'));
const Permintaan = lazy(() => import('./pages/Permintaan'));
const Pemborongan = lazy(() => import('./pages/Pemborongan'));

const PageLoading = () => (
  <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs animate-pulse">
    Memuatkan halaman...
  </div>
);

// Embedded (iframe) mode: the dashboard is laid out on a desktop-sized
// canvas and the whole thing is scaled down to the frame, so it looks the
// same as the standalone site instead of reflowing into a cramped layout.
// Measured: the home page fits with no inner scrolling at 1440 x 900.
const FIT_BASE_WIDTH = 1440;
const FIT_MIN_HEIGHT = 900;

function FitToFrame({ children }) {
  const frameRef = useRef(null);
  const contentRef = useRef(null);
  const [box, setBox] = useState(null);
  const [contentH, setContentH] = useState(0);
  // Halaman Utama is a one-screen layout that fills whatever height it gets.
  // The other pages are long (about 1,700px at 1440px wide); in an iframe
  // they're laid out at their full natural height — so they never scroll
  // inside the frame — and the whole page is shrunk to fit.
  const { pathname } = useLocation();
  const fitWholePage = pathname !== '/';

  useLayoutEffect(() => {
    const el = frameRef.current;
    // ResizeObserver also fires once right after observe(), which gives the
    // initial size.
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // How much of the frame is actually on screen: from the frame's top edge
  // to the bottom of the browser window. A SISDA grid widget can be taller
  // than the window, so fitting to the frame alone leaves the bottom of the
  // dashboard below the fold. IntersectionObserver with the implicit root
  // measures against the top-level window, and works in cross-origin
  // iframes. Only readings where the frame's top is visible are used, so
  // scrolling the host page doesn't make the dashboard shrink and grow.
  const [visibleH, setVisibleH] = useState(null);
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const thresholds = Array.from({ length: 101 }, (_, i) => i / 100);
    const io = new IntersectionObserver(([entry]) => {
      const target = entry.boundingClientRect;
      const seen = entry.intersectionRect;
      if (!entry.isIntersecting || seen.height <= 0) return;
      if (Math.abs(seen.top - target.top) > 1) return; // top edge scrolled away
      setVisibleH(Math.round(seen.bottom - target.top));
    }, { threshold: thresholds });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Track the long page's natural height as its data loads and it reflows.
  // offsetHeight is the untransformed layout height (unaffected by scale).
  const hasBox = box !== null;
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!fitWholePage || !el) return undefined;
    const ro = new ResizeObserver(() => setContentH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitWholePage, hasBox]);

  let view = null; // { outerW, outerH, canvasW, canvasH (null = auto), scale }
  if (box && box.w > 0 && box.h > 0) {
    // Usable height: the frame, cut down to the part that's on screen.
    const availH = visibleH && visibleH > 100 ? Math.min(box.h, visibleH) : box.h;
    if (fitWholePage) {
      // Canvas is at least FIT_BASE_WIDTH wide with auto height; shrink so
      // both its width and its full height fit inside the usable area.
      const canvasW = Math.max(FIT_BASE_WIDTH, box.w);
      const naturalH = contentH || FIT_MIN_HEIGHT;
      const scale = Math.min(1, box.w / canvasW, availH / naturalH);
      view = { outerW: canvasW * scale, outerH: naturalH * scale, canvasW, canvasH: null, scale };
    } else {
      // The visible area is the frame's full width, and at most 16:10 tall
      // (FIT_BASE_WIDTH x FIT_MIN_HEIGHT). A frame taller than that keeps
      // the dashboard at 16:10 at the top instead of stretching the
      // map/charts; a shorter one (or a frame running past the bottom of the
      // window) uses just the usable height.
      const outerW = box.w;
      const outerH = Math.min(availH, (box.w * FIT_MIN_HEIGHT) / FIT_BASE_WIDTH);
      // Never enlarge (max 1); shrink just enough that the canvas is at
      // least FIT_BASE_WIDTH wide and FIT_MIN_HEIGHT tall.
      const scale = Math.min(1, outerW / FIT_BASE_WIDTH, outerH / FIT_MIN_HEIGHT);
      view = { outerW, outerH, canvasW: outerW / scale, canvasH: outerH / scale, scale };
    }
  }

  return (
    <div ref={frameRef} className="h-full w-full overflow-hidden">
      {view && (
        <div style={{ width: view.outerW, height: view.outerH, margin: '0 auto', overflow: 'hidden' }}>
          <div
            ref={contentRef}
            style={{
              width: view.canvasW,
              ...(view.canvasH != null ? { height: view.canvasH } : {}),
              transform: `scale(${view.scale})`,
              transformOrigin: 'top left',
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Embedded = running inside an iframe (detected automatically, so it
  // survives SubNav navigation, which drops query params) or ?embed=1.
  // ?embed=0 turns it off.
  const [searchParams] = useSearchParams();
  const embedParam = searchParams.get('embed');
  const isEmbedded = embedParam === '1' || (embedParam !== '0' && window.self !== window.top);

  const dashboard = (
    <div className={`${isDarkMode ? 'dark' : ''} font-sans relative h-full w-full`}>
      
      {/* h-full instead of h-screen so it respects iframe/container height */}
      <div className="h-full w-full bg-slate-50 dark:bg-slate-950 p-2 md:p-4 flex flex-col transition-colors duration-300">
        
        {/* Card Container */}
        <div className="flex-1 min-h-0 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 md:p-4 flex flex-col relative transition-colors duration-300 overflow-hidden">
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="absolute top-3 right-4 md:top-4 md:right-5 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-50 shrink-0"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Menu Header (Fixed Height) */}
          <div className="shrink-0">
            <SubNav />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 w-full text-slate-800 dark:text-slate-200 mt-1 overflow-hidden">
            <div className="h-full w-full">
              <ErrorBoundary>
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    {/* Propagating theme parameter to HalamanUtama component */}
                    <Route path="/" element={<HalamanUtama isDarkMode={isDarkMode} />} />
                    <Route path="/pembekalan" element={<Pembekalan />} />
                    <Route path="/permintaan" element={<Permintaan />} />
                    <Route path="/pemborongan" element={<Pemborongan />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );

  return isEmbedded ? <FitToFrame>{dashboard}</FitToFrame> : dashboard;
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
