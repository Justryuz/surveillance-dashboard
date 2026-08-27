import React, { useEffect, useState, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { RotateCcw } from 'lucide-react';

export default function MalaysiaChoroplethMap({ 
  mapViewMode, 
  setMapViewMode, 
  mapData, 
  onRegionClick, 
  onResetMap,
  selectedRegion,     
  isDarkMode = false  
}) {
  const chartRef = useRef(null); // We bring ref back for the silver-bullet fix!
  const [mapsLoaded, setMapsLoaded] = useState({ state: false, district: false });

  useEffect(() => {
    fetch('/malaysia_state.geojson')
      .then((res) => res.json())
      .then((geoJson) => {
        echarts.registerMap('malaysia_states', geoJson);
        setMapsLoaded(prev => ({ ...prev, state: true }));
      });

    fetch('/malaysia_district.geojson')
      .then((res) => res.json())
      .then((geoJson) => {
        echarts.registerMap('malaysia_districts', geoJson);
        setMapsLoaded(prev => ({ ...prev, district: true }));
      });
  }, []);

  const currentMap = mapViewMode === 'state' ? 'malaysia_states' : 'malaysia_districts';
  const isReady = mapsLoaded.state && mapsLoaded.district;

  // THE FIX: Explicitly target the selected region by NAME and force it to turn off
  const handleReset = () => {
    if (chartRef.current && selectedRegion) {
      chartRef.current.getEchartsInstance().dispatchAction({
        type: 'mapUnSelect',
        seriesIndex: 0,
        name: selectedRegion // Targeting by name forces ECharts to un-highlight even if it's an empty district!
      });
    }
    if (onResetMap) onResetMap(); 
  };

  const option = isReady ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>Bekalan: {c} MT',
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: isDarkMode ? '#0ea5e9' : '#3b82f6',
      textStyle: { color: isDarkMode ? '#f8fafc' : '#1e293b' }
    },
    visualMap: {
      left: 'right',
      bottom: '10%',
      min: 0,
      max: Math.max(...mapData.map(d => d.value), 100), 
      text: ['Tinggi', 'Rendah'],
      textStyle: { color: isDarkMode ? '#cbd5e1' : '#475569', fontSize: 10, fontWeight: 'bold' },
      inRange: { color: isDarkMode ? ['#0f172a', '#0284c7', '#0ea5e9', '#10b981'] : ['#e0f2fe', '#0284c7', '#0ea5e9', '#10b981'] },
      calculable: true,
      itemWidth: 10,
      itemHeight: 80
    },
    series: [
      {
        name: 'Status Bekalan',
        type: 'map',
        map: currentMap,
        selectedMode: 'single', 
        roam: true,
        zoom: 1.2,
        center: [109.0, 4.0],
        itemStyle: {
          areaColor: isDarkMode ? '#1e293b' : '#f8fafc',
          borderColor: isDarkMode ? '#38bdf8' : '#3b82f6', 
          borderWidth: mapViewMode === 'state' ? 1.5 : 0.6,
          shadowColor: isDarkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.8)',
          shadowBlur: mapViewMode === 'state' ? 8 : 2 
        },
        emphasis: {
          itemStyle: { areaColor: '#fcd34d', borderColor: '#fbbf24', shadowColor: 'rgba(251, 191, 36, 1)', shadowBlur: 15 },
          label: { show: true, color: '#0f172a', fontWeight: 'bold' }
        },
        select: {
          itemStyle: { areaColor: '#f59e0b' },
          label: { show: true, color: '#fff' }
        },
        label: { show: false },
        data: mapData.map(item => ({ ...item, selected: item.name === selectedRegion }))
      }
    ]
  } : {};

  const onEvents = {
    click: (params) => {
      if (params.name) onRegionClick(params.name);
    }
  };

  return (
    <div className="w-full h-full flex flex-col pt-1 relative">
      <div className="absolute top-2 right-2 md:right-4 z-10 flex gap-1">
         <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg shadow-inner border border-slate-300 dark:border-slate-700 transition-colors">
           <button onClick={() => setMapViewMode('state')} className={`text-[9px] md:text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${mapViewMode === 'state' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Negeri</button>
           <button onClick={() => setMapViewMode('district')} className={`text-[9px] md:text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${mapViewMode === 'district' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Daerah</button>
         </div>
         <button onClick={handleReset} className="flex items-center justify-center p-1.5 px-2.5 rounded-lg border transition-all bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 active:bg-emerald-600 active:border-emerald-500 active:text-white" title="Reset Lokasi">
           <RotateCcw className="w-3.5 h-3.5" />
         </button>
      </div>
      
      {!isReady && <div className="flex-1 flex items-center justify-center text-slate-400 text-xs animate-pulse mt-8">Memuatkan Peta...</div>}
      
      {isReady && (
        <div className="absolute inset-0 top-8 left-0 right-0 bottom-0">
          <ReactECharts ref={chartRef} echarts={echarts} option={option} style={{ height: '100%', width: '100%' }} notMerge={true} onEvents={onEvents} />
        </div>
      )}
    </div>
  );
}