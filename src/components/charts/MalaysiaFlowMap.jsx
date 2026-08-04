import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { RotateCcw } from 'lucide-react';

export default function MalaysiaFlowMap({ 
  selectedCommodity = "", 
  selectedYear = "2025", 
  onCountryClick, 
  onResetMap, 
  forceMode = null,
  showTransportToggle = false,
  filterMultiplier = 1.0 // NEW: Connects map data to all dashboard filters
}) {
  const chartRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tradeMode, setTradeMode] = useState('all'); 
  const [transportMode, setTransportMode] = useState('all'); 

  const activeMode = forceMode || tradeMode;

  const locs = {
    malaysia: [101.6869, 3.1390], singapore: [103.8198, 1.3521], japan: [139.6917, 35.6895],     
    china: [121.4737, 31.2304], australia: [151.2093, -33.8688], india: [78.9629, 20.5937],      
    vietnam: [108.2772, 14.0583], indonesia: [113.9213, -0.7893], thailand: [100.9925, 15.8700],
    philippines: [121.7740, 12.8797], brunei: [114.7277, 4.5353], usa: [-118.2437, 34.0522] 
  };

  useEffect(() => {
    fetch('https://unpkg.com/echarts@4.9.0/map/json/world.json')
      .then((response) => response.json())
      .then((geoJson) => {
        echarts.registerMap('world', geoJson);
        setMapLoaded(true);
      })
      .catch((error) => console.error("Error loading map:", error));
  }, []);

  const chartData = useMemo(() => {
    const isCili = selectedCommodity === 'cili';

    let importFlows = [
      { coords: [locs.india, locs.malaysia], transport: 'laut', from: 'India', lineStyle: { color: '#0ea5e9', width: 2.5, opacity: 0.9, curveness: 0.2 } },
      { coords: [locs.china, locs.malaysia], transport: 'laut', from: 'China', lineStyle: { color: '#0ea5e9', width: 2.5, opacity: 0.9, curveness: 0.3 } },
      { coords: [locs.indonesia, locs.malaysia], transport: 'laut', from: 'Indonesia', lineStyle: { color: '#0ea5e9', width: 2.5, opacity: 0.9, curveness: 0.2 } },
      { coords: [locs.vietnam, locs.malaysia], transport: 'laut', from: 'Vietnam', lineStyle: { color: '#0ea5e9', width: 2, opacity: 0.8, curveness: 0.1 } },
      { coords: [locs.thailand, locs.malaysia], transport: 'darat', from: 'Thailand', lineStyle: { color: '#10b981', width: 2.5, opacity: 0.9, curveness: 0.15 } },
      { coords: [locs.singapore, locs.malaysia], transport: 'darat', from: 'Singapura', lineStyle: { color: '#10b981', width: 2.5, opacity: 0.9, curveness: -0.1 } },
      { coords: [locs.usa, locs.malaysia], transport: 'udara', from: 'Amerika Syarikat', lineStyle: { color: '#f97316', width: 1.5, opacity: 0.8, curveness: 0.4 } },
      { coords: [locs.japan, locs.malaysia], transport: 'udara', from: 'Jepun', lineStyle: { color: '#f97316', width: 1.5, opacity: 0.8, curveness: 0.3 } },
      { coords: [locs.philippines, locs.malaysia], transport: 'udara', from: 'Filipina', lineStyle: { color: '#f97316', width: 1.5, opacity: 0.8, curveness: 0.2 } },
      { coords: [locs.china, locs.vietnam], transport: 'laut', from: 'China ke Vietnam (Transit)', lineStyle: { color: '#0ea5e9', width: 1.5, opacity: 0.5, curveness: 0.2, type: 'dashed' } },
      { coords: [locs.india, locs.singapore], transport: 'laut', from: 'India ke Singapura (Transit)', lineStyle: { color: '#0ea5e9', width: 1.5, opacity: 0.5, curveness: 0.2, type: 'dashed' } },
      { coords: [locs.australia, locs.indonesia], transport: 'laut', from: 'Australia ke Indonesia (Transit)', lineStyle: { color: '#0ea5e9', width: 1.5, opacity: 0.4, curveness: 0.1, type: 'dashed' } },
      { coords: [locs.china, locs.thailand], transport: 'darat', from: 'China ke Thailand (Transit)', lineStyle: { color: '#10b981', width: 1.5, opacity: 0.5, curveness: 0.15, type: 'dashed' } },
      { coords: [locs.usa, locs.japan], transport: 'udara', from: 'Amerika Syarikat ke Jepun (Transit)', lineStyle: { color: '#f97316', width: 1.2, opacity: 0.5, curveness: 0.3, type: 'dashed' } },
      { coords: [locs.japan, locs.philippines], transport: 'udara', from: 'Jepun ke Filipina (Transit)', lineStyle: { color: '#f97316', width: 1.2, opacity: 0.5, curveness: 0.15, type: 'dashed' } }
    ];

    let exportFlows = [
      { coords: [locs.malaysia, locs.singapore], lineStyle: { color: '#f97316', width: 2.5, opacity: 0.9, curveness: -0.2 } },
      { coords: [locs.malaysia, locs.china], lineStyle: { color: '#f97316', width: 2.5, opacity: 0.9, curveness: 0.1 } },
      { coords: [locs.malaysia, locs.japan], lineStyle: { color: '#f97316', width: 2.5, opacity: 0.9, curveness: 0.2 } },
      { coords: [locs.singapore, locs.brunei], lineStyle: { color: '#fcd34d', width: 1, opacity: 0.3, curveness: 0.2 } },
      { coords: [locs.singapore, locs.australia], lineStyle: { color: '#fcd34d', width: 1, opacity: 0.3, curveness: 0.1 } },
      { coords: [locs.china, locs.japan], lineStyle: { color: '#fcd34d', width: 1, opacity: 0.3, curveness: 0.3 } },
      { coords: [locs.japan, locs.usa], lineStyle: { color: '#fcd34d', width: 1, opacity: 0.3, curveness: 0.4 } }
    ];

    if (isCili) {
      importFlows = importFlows.filter(flow => flow.coords[0] !== locs.usa && flow.coords[1] !== locs.usa);
      exportFlows = exportFlows.filter(flow => flow.coords[1] !== locs.usa);
    }

    const generateStats = (name) => {
      const base = name.charCodeAt(0) + name.charCodeAt(name.length-1) + (selectedCommodity ? selectedCommodity.charCodeAt(0) : 0);
      
      // Calculate base values and then scale them by the global filter multiplier
      const imp = (((base * 17) % 800) + 150) * filterMultiplier; 
      const exp = (((base * 23) % 800) + 150) * filterMultiplier;
      
      const qtyImp = imp * 1250; 
      const qtyExp = exp * 1100;

      return { 
        imp: imp.toFixed(1), 
        exp: exp.toFixed(1), 
        bal: (exp - imp).toFixed(1),
        qtyImp: qtyImp.toLocaleString(undefined, {maximumFractionDigits: 0}),
        qtyExp: qtyExp.toLocaleString(undefined, {maximumFractionDigits: 0})
      };
    };

    const countries = [
      { name: 'MALAYSIA', coords: locs.malaysia, color: '#ef4444', labelPos: 'left' },
      { name: 'Singapura', coords: locs.singapore }, { name: 'Jepun', coords: locs.japan },
      { name: 'China', coords: locs.china }, { name: 'India', coords: locs.india },
      { name: 'Vietnam', coords: locs.vietnam }, { name: 'Indonesia', coords: locs.indonesia },
      { name: 'Thailand', coords: locs.thailand }, { name: 'Filipina', coords: locs.philippines },
      { name: 'Brunei', coords: locs.brunei }, { name: 'Australia', coords: locs.australia },
      { name: 'Amerika Syarikat', coords: locs.usa }
    ];

    const nodeData = countries.map(c => ({
      name: c.name, value: c.coords, tradeStats: generateStats(c.name),
      itemStyle: { color: c.color || '#94a3b8' },
      label: { position: c.labelPos || 'right', color: c.name === 'MALAYSIA' ? '#fff' : '#cbd5e1' }
    }));

    return { importFlows, exportFlows, nodeData };
  }, [selectedCommodity, selectedYear, filterMultiplier]); // Reacts to multiplier changes

  const filteredImportFlows = useMemo(() => {
    if (transportMode === 'all') return chartData.importFlows;
    return chartData.importFlows.filter(f => f.transport === transportMode);
  }, [chartData.importFlows, transportMode]);

  const buildSeries = () => {
    const seriesArr = [];
    if (activeMode === 'import' || activeMode === 'all') {
      seriesArr.push({ name: 'Aliran Import', type: 'lines', zlevel: 1, effect: { show: true, period: 4, trailLength: 0.5, color: '#fff', symbolSize: 3 }, data: filteredImportFlows });
    }
    if (activeMode === 'eksport' || activeMode === 'all') {
      seriesArr.push({ name: 'Aliran Eksport', type: 'lines', zlevel: 2, effect: { show: true, period: 5, trailLength: 0.5, color: '#f97316', symbolSize: 3 }, data: chartData.exportFlows });
    }
    seriesArr.push({
      name: 'Hab Perdagangan', type: 'effectScatter', coordinateSystem: 'geo', zlevel: 3,
      rippleEffect: { brushType: 'stroke', scale: 3 }, label: { show: true, fontSize: 9, fontWeight: 'bold' },
      itemStyle: { shadowBlur: 5, shadowColor: '#000' }, data: chartData.nodeData
    });
    return seriesArr;
  };

  const option = mapLoaded ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#3b82f6', borderWidth: 1, padding: [10, 14],
      formatter: function (params) {
        if (params.seriesType === 'effectScatter') {
          const data = params.data;
          if (!data.tradeStats) return data.name;
          const { imp, exp, bal, qtyImp, qtyExp } = data.tradeStats;
          let tooltipContent = '';
          if (activeMode === 'import') {
            tooltipContent = `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: #cbd5e1;">Nilai Import:</span> <span style="font-weight: bold; color: #38bdf8;">RM ${imp}M</span></div>
                              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: #cbd5e1;">Kuantiti Import:</span> <span style="font-weight: bold; color: #38bdf8;">${qtyImp} MT</span></div>`;
          } else if (activeMode === 'eksport') {
            tooltipContent = `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: #cbd5e1;">Nilai Eksport:</span> <span style="font-weight: bold; color: #f97316;">RM ${exp}M</span></div>
                              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: #cbd5e1;">Kuantiti Eksport:</span> <span style="font-weight: bold; color: #f97316;">${qtyExp} MT</span></div>`;
          } else {
            const isSurplus = parseFloat(bal) >= 0; const balColor = isSurplus ? '#10b981' : '#ef4444'; 
            tooltipContent = `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: #cbd5e1;">Nilai Import:</span> <span style="font-weight: bold; color: #38bdf8;">RM ${imp}M</span></div>
                              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;"><span style="color: #cbd5e1;">Nilai Eksport:</span> <span style="font-weight: bold; color: #f97316;">RM ${exp}M</span></div>
                              <div style="display: flex; justify-content: space-between; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 6px; font-size: 11px;"><span style="color: #cbd5e1;">Baki Dagangan:</span> <span style="font-weight: 900; color: ${balColor};">${isSurplus ? '+' : ''}${bal}M</span></div>`;
          }
          return `<div style="font-family: sans-serif; min-width: 160px;"><div style="font-weight: bold; font-size: 12px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 6px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">${data.name}</div>${tooltipContent}</div>`;
        }
        if (params.seriesType === 'lines' && params.data.from) {
            return `<span style="color:#cbd5e1; font-weight:bold; font-size:10px;">Aliran: ${params.data.from} (${params.data.transport.toUpperCase()})</span>`;
        }
        return `<span style="color:#cbd5e1; font-weight:bold; font-size:10px;">${params.seriesName}</span>`;
      }
    },
    geo: {
      map: 'world', roam: true, zoom: 4.5, center: [115.0, 15.0], 
      itemStyle: { areaColor: '#0f172a', borderColor: '#3b82f6', borderWidth: 0.5 },
      emphasis: { itemStyle: { areaColor: '#1e293b', borderColor: '#0ea5e9', borderWidth: 1 }, label: { show: false } }
    },
    series: buildSeries()
  } : {};

  return (
    <div className="w-full h-full flex flex-col relative min-h-[350px]">
      <div className="absolute top-2 right-2 md:right-4 z-10 flex gap-1">
         {!forceMode ? (
           <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg shadow-inner border border-slate-300 dark:border-slate-700 transition-colors">
             <button onClick={() => setTradeMode('all')} className={`text-[9px] md:text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${tradeMode === 'all' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
             <button onClick={() => setTradeMode('import')} className={`text-[9px] md:text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${tradeMode === 'import' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Import</button>
             <button onClick={() => setTradeMode('eksport')} className={`text-[9px] md:text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${tradeMode === 'eksport' ? 'bg-white dark:bg-slate-600 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Eksport</button>
           </div>
         ) 
         : (forceMode === 'import' && showTransportToggle) ? (
           <div className="flex bg-white/90 dark:bg-slate-800/90 p-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 backdrop-blur">
             <button onClick={() => setTransportMode('all')} className={`text-[9px] md:text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${transportMode === 'all' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Semua</button>
             <button onClick={() => setTransportMode('darat')} className={`text-[9px] md:text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${transportMode === 'darat' ? 'bg-[#10b981] text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Darat</button>
             <button onClick={() => setTransportMode('laut')} className={`text-[9px] md:text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${transportMode === 'laut' ? 'bg-[#0ea5e9] text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Laut</button>
             <button onClick={() => setTransportMode('udara')} className={`text-[9px] md:text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${transportMode === 'udara' ? 'bg-[#f97316] text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Udara</button>
           </div>
         ) : null}
         <button onClick={() => { if (chartRef.current) chartRef.current.getEchartsInstance().dispatchAction({ type: 'unselect', seriesIndex: 0 }); if (!forceMode) setTradeMode('all'); setTransportMode('all'); if (onResetMap) onResetMap(); }} className={`flex items-center justify-center p-1.5 px-2.5 rounded-lg border transition-all ${tradeMode === 'all' && transportMode === 'all' && !forceMode ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400'}`} title="Reset Pilihan"><RotateCcw className="w-3.5 h-3.5" /></button>
      </div>
      {!mapLoaded && <div className="flex-1 flex items-center justify-center text-slate-400 text-xs animate-pulse mt-8">Memuatkan Peta Global...</div>}
      {mapLoaded && <div className="flex-1 w-full h-full min-h-[350px]"><ReactECharts ref={chartRef} echarts={echarts} option={option} style={{ height: '100%', width: '100%' }} notMerge={true} /></div>}
    </div>
  );
}