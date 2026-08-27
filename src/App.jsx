import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HalamanUtama from './pages/HalamanUtama';
import Pembekalan from './pages/Pembekalan';
import Permintaan from './pages/Permintaan';
import Pemborongan from './pages/Pemborongan';

function AppContent() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className={`${isDarkMode ? 'dark' : ''} font-sans relative h-full w-full`}>
      
      <div className="h-full w-full bg-slate-50 dark:bg-slate-950 p-0 flex flex-col transition-colors duration-300">
        
        <div className="flex-1 min-h-0 w-full bg-white dark:bg-slate-900 rounded-none p-1.5 flex flex-col relative transition-colors duration-300 overflow-hidden">

          {/* Main Content Area — takes full height */}
          <div className="flex-1 min-h-0 w-full text-slate-800 dark:text-slate-200 overflow-hidden">
            <div className="h-full w-full">
              <Routes>
                <Route path="/" element={<HalamanUtama isDarkMode={isDarkMode} isEmbedded={true} />} />
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