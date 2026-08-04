import React from 'react';

export default function KpiCard({ title, value, icon: Icon, trend, trendValue }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </h3>
        {Icon && (
          <div className="p-2 bg-blue-50 dark:bg-slate-700 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">
          {value}
        </span>
      </div>

      {/* Optional Trend Indicator (e.g., "+5% dari bulan lepas") */}
      {trend && (
        <div className={`mt-3 text-sm font-medium ${trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {trend === 'up' ? '↑' : '↓'} {trendValue}
        </div>
      )}
    </div>
  );
}