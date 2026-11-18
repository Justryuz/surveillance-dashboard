import { useState, useRef, useLayoutEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
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
  const ref = useRef(null);
  const [box, setBox] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    // ResizeObserver also fires once right after observe(), which gives the
    // initial size.
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Never enlarge (max 1); shrink just enough that the canvas is at least
  // FIT_BASE_WIDTH wide and FIT_MIN_HEIGHT tall. The canvas then takes the
  // frame's own aspect ratio, so the scaled result fills the frame exactly.
  const scale = box && box.w > 0 && box.h > 0
    ? Math.min(1, box.w / FIT_BASE_WIDTH, box.h / FIT_MIN_HEIGHT)
    : null;

  return (
    <div ref={ref} className="h-full w-full overflow-hidden">
      {scale && (
        <div style={{ width: box.w / scale, height: box.h / scale, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
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
