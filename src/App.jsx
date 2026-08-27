import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import SubNav from './components/layout/SubNav';

import HalamanUtama from './pages/HalamanUtama';
import Pembekalan from './pages/Pembekalan';
import Permintaan from './pages/Permintaan';
import Pemborongan from './pages/Pemborongan';

function AppContent() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchParams] = useSearchParams();
  const isEmbedded = searchParams.get('embed') === '1';

  return (
    <div className={`${isDarkMode ? 'dark' : ''} font-sans relative h-full w-full`}>
      
      <div className={`h-full w-full bg-slate-50 dark:bg-slate-950 ${isEmbedded ? 'p-0' : 'p-1 md:p-2'} flex flex-col transition-colors duration-300`}>
        
        <div className={`flex-1 min-h-0 w-full bg-white dark:bg-slate-900 ${isEmbedded ? 'rounded-none border-0 p-1.5' : 'rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-2 md:p-3'} flex flex-col relative transition-colors duration-300 overflow-hidden`}>
          
          {!isEmbedded && (
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="absolute top-2 right-3 md:top-3 md:right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-50 shrink-0"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* Menu Header — always visible */}
          <div className="shrink-0">
            <SubNav />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 w-full text-slate-800 dark:text-slate-200 overflow-hidden">
            <div className="h-full w-full">
              <Routes>
                <Route path="/" element={<HalamanUtama isDarkMode={isDarkMode} isEmbedded={isEmbedded} />} />
                <Route path="/pembekalan" element={<Pembekalan />} />
                <Route path="/permintaan" element={<Permintaan />} />
                <Route path="/pemborongan" element={<Pemborongan />} />
              </Routes>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}