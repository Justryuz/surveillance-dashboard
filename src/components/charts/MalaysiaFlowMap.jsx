import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { RotateCcw, Plus, Minus } from 'lucide-react';
import { getCountryCoords } from '../../config/countryCoordinates';
import { toTradeCountryName } from '../../config/mapCountryNames';
import { formatFixed } from '../../lib/formatters';

export default function MalaysiaFlowMap({
  selectedCommodity = "",
  selectedYear = "2025",
  onCountryClick,
  onResetMap,
  forceMode = null,
  showTransportToggle = false,
  showSupplyChainLine = true, // set false to hide the "Rantaian Bekalan Sebenar" fan-out lines
  filterMultiplier = 1.0, // NEW: Connects map data to all dashboard filters
  realCountryStats = null, // Real { imp, exp, qtyImp, qtyExp } per country from the sheet; a country with no real data just gets no trade-stats tooltip (see generateStats below).
  flowAnchorCountry = 'MALAYSIA', // Which country's top partners to draw the dashed lines for — the map's display name for whichever country is selected/clicked (defaults to Malaysia).
  realTopImportPartners = null, // Real top-10 import partners of flowAnchorCountry from GLOBAL_TRADE_FLOW, e.g. [{partner:'Viet Nam', value}, ...] — flowAnchorCountry buys this commodity FROM these.
  realTopExportPartners = null, // Real top-10 export partners of flowAnchorCountry from GLOBAL_TRADE_FLOW — flowAnchorCountry sells this commodity TO these.
  realTopGlobalExportFlows = null, // Major worldwide export flows for the commodity, independent of any selected/clicked country, e.g. [{reporter:'Thailand', partner:'Bangladesh', value}, ...] — shown as soon as a commodity is picked, not only when a country is clicked.
}) {
  const chartRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tradeMode, setTradeMode] = useState('all');
  const [transportMode, setTransportMode] = useState('all');

  const activeMode = forceMode || tradeMode;

  // Zoom buttons read the live geo zoom straight off the echarts instance
  // and push a new absolute value back with a direct (merging) setOption
  // call — deliberately NOT through React state, and NOT through
  // dispatchAction('geoRoam') either (that action is meant to be driven by
  // an actual mouse/wheel event with a pixel origin; dispatched
  // programmatically with no origin it doesn't reliably move the view).
  // `option` below is memoized so it only rebuilds when the actual chart
  // data changes — if zoom lived in React state instead, every click (and
  // every manual scroll-zoom/drag, which fires many events per second)
  // would trigger a re-render that recreates `option` and gets pushed back
  // into the chart with notMerge, tearing down the geo component mid-
  // gesture. Going through the echarts instance directly avoids all of
  // that, the same way the reset button below already does.
  const handleZoom = (factor) => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) return;
    const current = instance.getOption();
    const currentZoom = current?.geo?.[0]?.zoom ?? 4.5;
    const nextZoom = Math.min(20, Math.max(1, currentZoom * factor));
    instance.setOption({ geo: { zoom: nextZoom } });
  };

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
      // The hardcoded "(Transit)" dashed lines that used to live here
      // (China->Vietnam, India->Singapore, etc.) were decorative — not
      // backed by any real data. Real third-country transit/upstream
      // sourcing is now drawn by the "Rantaian Bekalan Sebenar" dashed
      // series below, built from the real GLOBAL_TRADE_FLOW sheet.
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

    // Real sheet-derived totals only — a country with no real data returns
    // null, so its tooltip just shows the country name (see the
    // `if (!data.tradeStats) return data.name;` branch in the tooltip
    // formatter below) instead of a fabricated hash-based number.
    const generateStats = (name) => {
      const real = realCountryStats && realCountryStats[name];
      if (!real || (real.imp == null && real.exp == null)) return null;
      const imp = real.imp ?? 0;
      const exp = real.exp ?? 0;
      const qtyImp = real.qtyImp ?? 0;
      const qtyExp = real.qtyExp ?? 0;
      return {
        imp: formatFixed(imp, 2),
        exp: formatFixed(exp, 2),
        bal: formatFixed(exp - imp, 2),
        qtyImp: formatFixed(qtyImp, 2),
        qtyExp: formatFixed(qtyExp, 2),
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

    // --- Real top-10 partner fan-out lines (GLOBAL_TRADE_FLOW) ---
    // Anchored on whichever country is currently selected on the map
    // (flowAnchorCountry, defaulting to Malaysia). For each of the
    // anchor's top 10 EXPORT partners, a dashed line runs FROM the anchor
    // TO that partner (the anchor is selling to them). For each of the
    // anchor's top 10 IMPORT partners, a dashed line runs FROM that
    // partner TO the anchor (the anchor is buying from them). Both are
    // real ranked totals from the sheet, not illustrative/hardcoded data.
    const supplyChainFlows = [];
    const extraNodes = [];
    const seenExtraNodes = new Set(countries.map((c) => c.name.toUpperCase()));

    const addExtraNode = (name) => {
      const key = String(name || '').trim().toUpperCase();
      if (!key || seenExtraNodes.has(key)) return;
      const coords = getCountryCoords(name);
      if (!coords) return; // no known coordinates — skip rather than guess
      seenExtraNodes.add(key);
      extraNodes.push({ name, coords });
    };

    // Resolve the anchor's own marker coordinates: first check the fixed
    // 12-country list (handles Malay display names like "Jepun" directly),
    // otherwise translate to the trade-sheet spelling and look it up.
    const anchorKey = String(flowAnchorCountry || 'MALAYSIA').trim().toUpperCase();
    const anchorFixed = countries.find((c) => c.name.toUpperCase() === anchorKey);
    const anchorCoords = anchorFixed ? anchorFixed.coords : getCountryCoords(toTradeCountryName(flowAnchorCountry));

    if (showSupplyChainLine && anchorCoords) {
      if (realTopExportPartners && realTopExportPartners.length > 0) {
        for (const { partner } of realTopExportPartners) {
          const coords = getCountryCoords(partner);
          if (!coords) continue;
          addExtraNode(partner);
          supplyChainFlows.push({
            coords: [anchorCoords, coords], // movement FROM anchor TO partner (anchor exports to them)
            transport: 'laut',
            from: `${flowAnchorCountry} ke ${partner} (Eksport Sebenar)`,
            lineStyle: { color: '#14b8a6', width: 2, opacity: 0.8, curveness: -0.15, type: 'dashed' },
          });
        }
      }
      if (realTopImportPartners && realTopImportPartners.length > 0) {
        for (const { partner } of realTopImportPartners) {
          const coords = getCountryCoords(partner);
          if (!coords) continue;
          addExtraNode(partner);
          supplyChainFlows.push({
            coords: [coords, anchorCoords], // movement FROM partner TO anchor (anchor imports from them)
            transport: 'laut',
            from: `${partner} ke ${flowAnchorCountry} (Import Sebenar)`,
            lineStyle: { color: '#a855f7', width: 2, opacity: 0.8, curveness: 0.2, type: 'dashed' },
          });
        }
      }
    }

    // --- Worldwide flow lines, independent of the selected/clicked anchor ---
    // As soon as a commodity is picked, this surfaces major real flows that
    // don't necessarily touch the anchor country at all — e.g. Thailand's
    // top Cili export destinations (Thailand -> Bangladesh), shown even
    // when Malaysia (not Thailand) is the current anchor.
    const globalFlows = [];
    if (showSupplyChainLine && realTopGlobalExportFlows && realTopGlobalExportFlows.length > 0) {
      for (const { reporter, partner } of realTopGlobalExportFlows) {
        const reporterKey = String(reporter || '').trim().toUpperCase();
        const reporterFixed = countries.find((c) => c.name.toUpperCase() === reporterKey);
        const reporterCoords = reporterFixed ? reporterFixed.coords : getCountryCoords(reporter);
        const partnerCoords = getCountryCoords(partner);
        if (!reporterCoords || !partnerCoords) continue;
        addExtraNode(reporter);
        addExtraNode(partner);
        globalFlows.push({
          coords: [reporterCoords, partnerCoords], // movement FROM reporter/exporter TO partner
          transport: 'laut',
          from: `${reporter} ke ${partner} (Aliran Global)`,
          lineStyle: { color: '#eab308', width: 1.5, opacity: 0.65, curveness: 0.15, type: 'dashed' },
        });
      }
    }

    const nodeData = [
      ...countries.map(c => ({
        name: c.name, value: c.coords, tradeStats: generateStats(c.name),
        itemStyle: { color: c.color || '#94a3b8' },
        label: { position: c.labelPos || 'right', color: c.name === 'MALAYSIA' ? '#fff' : '#cbd5e1' }
      })),
      ...extraNodes.map(n => ({
        name: n.name, value: n.coords, tradeStats: null,
        itemStyle: { color: '#a855f7' },
        label: { position: 'right', color: '#cbd5e1' }
      })),
    ];

    return { importFlows, exportFlows, supplyChainFlows, globalFlows, nodeData };
  }, [selectedCommodity, selectedYear, filterMultiplier, realCountryStats, flowAnchorCountry, realTopImportPartners, realTopExportPartners, realTopGlobalExportFlows, showSupplyChainLine]); // Reacts to multiplier changes

  const filteredImportFlows = useMemo(() => {
    if (transportMode === 'all') return chartData.importFlows;
    return chartData.importFlows.filter(f => f.transport === transportMode);
  }, [chartData.importFlows, transportMode]);

  const buildSeries = () => {
    const seriesArr = [];
    if (activeMode === 'import' || activeMode === 'all') {
      seriesArr.push({ name: 'Aliran Import', type: 'lines', zlevel: 1, tooltip: { show: false }, effect: { show: true, period: 4, trailLength: 0.5, color: '#fff', symbolSize: 3 }, data: filteredImportFlows });
    }
    if (activeMode === 'eksport' || activeMode === 'all') {
      seriesArr.push({ name: 'Aliran Eksport', type: 'lines', zlevel: 2, tooltip: { show: false }, effect: { show: true, period: 5, trailLength: 0.5, color: '#f97316', symbolSize: 3 }, data: chartData.exportFlows });
    }
    seriesArr.push({
      name: 'Hab Perdagangan', type: 'effectScatter', coordinateSystem: 'geo', zlevel: 3,
      rippleEffect: { brushType: 'stroke', scale: 3 }, label: { show: true, fontSize: 9, fontWeight: 'bold', formatter: '{b}' },
      itemStyle: { shadowBlur: 5, shadowColor: '#000' }, data: chartData.nodeData
    });
    if (showSupplyChainLine && chartData.supplyChainFlows.length > 0) {
      // symbol: ['none', 'arrow'] draws an arrowhead at the line's END
      // point, so with `coords` always ordered [source, destination] above,
      // the arrow makes the real trade direction visually unambiguous —
      // on top of the animated effect dot, which also travels start->end.
      seriesArr.push({
        name: 'Rantaian Bekalan Sebenar', type: 'lines', zlevel: 4, tooltip: { show: false },
        symbol: ['none', 'arrow'], symbolSize: [0, 8],
        effect: { show: true, period: 6, trailLength: 0.4, color: '#e879f9', symbolSize: 3 },
        data: chartData.supplyChainFlows,
      });
    }
    if (showSupplyChainLine && chartData.globalFlows.length > 0) {
      // Worldwide context layer — dimmer/thinner amber lines so they read
      // as background context and don't compete visually with the
      // anchor-specific purple/teal lines above.
      seriesArr.push({
        name: 'Aliran Global Utama', type: 'lines', zlevel: 3.5, tooltip: { show: false },
        symbol: ['none', 'arrow'], symbolSize: [0, 6],
        effect: { show: true, period: 8, trailLength: 0.3, color: '#eab308', symbolSize: 2 },
        data: chartData.globalFlows,
      });
    }
    return seriesArr;
  };

  // Also memoized for a stable reference — echarts-for-react shallow-
  // compares props, so a fresh inline object here would defeat the
  // `option` memoization above just as easily.
  const chartStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const chartEvents = useMemo(() => ({
    click: (params) => {
      // Only country markers ("Hab Perdagangan") select a country;
      // clicking a flow line or empty map area does nothing here.
      if (params.componentType === 'series' && params.seriesName === 'Hab Perdagangan' && params.data?.name) {
        if (onCountryClick) onCountryClick(params.data.name);
      }
    },
  }), [onCountryClick]);

  // Memoized so this object keeps the same reference across re-renders
  // that don't actually change the chart's data — critical, because
  // echarts-for-react re-applies `option` (with notMerge) whenever the
  // prop reference changes, which would otherwise tear down and rebuild
  // the geo component (and reset any zoom/pan/drag in progress) on every
  // unrelated re-render of this component or its parent page.
  const option = useMemo(() => (!mapLoaded ? {} : {
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
  }), [mapLoaded, activeMode, filteredImportFlows, chartData, showSupplyChainLine]);

  return (
    <div className="w-full h-full flex flex-col relative min-h-[200px]">
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
         <button onClick={() => { const instance = chartRef.current?.getEchartsInstance(); if (instance) { instance.dispatchAction({ type: 'unselect', seriesIndex: 0 }); instance.setOption({ geo: { zoom: 4.5, center: [115.0, 15.0] } }); } if (!forceMode) setTradeMode('all'); setTransportMode('all'); if (onResetMap) onResetMap(); }} className={`flex items-center justify-center p-1.5 px-2.5 rounded-lg border transition-all ${tradeMode === 'all' && transportMode === 'all' && !forceMode ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400'}`} title="Reset Pilihan"><RotateCcw className="w-3.5 h-3.5" /></button>
      </div>
      <div className="absolute bottom-2 right-2 md:right-4 z-10 flex flex-col bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 backdrop-blur overflow-hidden">
        <button onClick={() => handleZoom(1.3)} className="flex items-center justify-center w-7 h-7 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border-b border-slate-200 dark:border-slate-700" title="Zoom In"><Plus className="w-3.5 h-3.5" /></button>
        <button onClick={() => handleZoom(1 / 1.3)} className="flex items-center justify-center w-7 h-7 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" title="Zoom Out"><Minus className="w-3.5 h-3.5" /></button>
      </div>
      {!mapLoaded && <div className="flex-1 flex items-center justify-center text-slate-400 text-xs animate-pulse mt-8">Memuatkan Peta Global...</div>}
      {/* absolute inset-0: chart fills the container instead of growing with the iframe document */}
      {mapLoaded && (
        <div className="absolute inset-0">
          <ReactECharts
            ref={chartRef}
            echarts={echarts}
            option={option}
            style={chartStyle}
            notMerge={true}
            onEvents={chartEvents}
          />
        </div>
      )}
    </div>
  );
}