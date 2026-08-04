import { Link, useLocation } from 'react-router-dom';
import { Home, ArrowDownLeft, ArrowUpRight, Store } from 'lucide-react';

export default function SubNav() {
  const location = useLocation();

  const menuItems = [
    { name: 'Halaman Utama', path: '/', icon: Home },
    { name: 'Pembekalan', path: '/pembekalan', icon: ArrowDownLeft },
    { name: 'Permintaan', path: '/permintaan', icon: ArrowUpRight },
  ];

  return (
    <div className="w-full flex justify-center mb-4">
      <nav className="inline-flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-full shadow-inner border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? 'bg-white dark:bg-blue-600 text-blue-700 dark:text-white shadow-sm scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}