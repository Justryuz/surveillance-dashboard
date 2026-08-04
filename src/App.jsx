import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import SubNav from './components/layout/SubNav';

import HalamanUtama from './pages/HalamanUtama';
import Pembekalan from './pages/Pembekalan';
import Permintaan from './pages/Permintaan';
import Pemborongan from './pages/Pemborongan';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <Router>
      <div className={`${isDarkMode ? 'dark' : ''} font-sans relative`}>
        
        {/* STRICT 100VH FULLSCREEN WRAPPER - NO SCROLLING */}
        <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 md:p-4 flex flex-col transition-colors duration-300">
          
          {/* Card Container stretches to exact limits */}
          <div className="flex-1 w-full h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 md:p-4 flex flex-col relative transition-colors duration-300 overflow-hidden">
            
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
            <div className="flex-1 min-h-0 w-full text-slate-800 dark:text-slate-200 mt-1">
              <Routes>
                {/* Propagating theme parameter to HalamanUtama component */}
                <Route path="/" element={<HalamanUtama isDarkMode={isDarkMode} />} />
                <Route path="/pembekalan" element={<Pembekalan />} />
                <Route path="/permintaan" element={<Permintaan />} />
                <Route path="/pemborongan" element={<Pemborongan />} />
              </Routes>
            </div>
            
          </div>
        </div>
      </div>
    </Router>
  );
}