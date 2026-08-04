import React from 'react';

export default function TrafficLight({ currentStatus }) {
  // Define our 3 traffic light states
  const lights = [
    { id: 'Kekurangan', color: 'bg-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.6)]', label: 'Kekurangan Bekalan' },
    { id: 'Lebihan', color: 'bg-amber-400', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.6)]', label: 'Lebihan Bekalan' },
    { id: 'Stabil', color: 'bg-green-500', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.6)]', label: 'Stabil' }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center h-full transition-colors duration-300">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6 w-full text-left">
        Status Pasaran
      </h3>
      
      <div className="flex items-center gap-8">
        {/* The Traffic Light Box */}
        <div className="bg-slate-800 dark:bg-slate-900 p-3 rounded-full flex flex-col gap-3 border-4 border-slate-700 dark:border-slate-950">
          {lights.map((light) => {
            const isActive = currentStatus === light.id;
            return (
              <div 
                key={light.id}
                className={`w-10 h-10 rounded-full transition-all duration-500 ${
                  isActive 
                    ? `${light.color} ${light.glow} scale-110 opacity-100` 
                    : 'bg-slate-600 dark:bg-slate-800 opacity-30'
                }`}
              />
            );
          })}
        </div>

        {/* The Text Label next to the light */}
        <div className="flex flex-col">
          <span className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Status Semasa:</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {lights.find(l => l.id === currentStatus)?.label}
          </span>
        </div>
      </div>
    </div>
  );
}