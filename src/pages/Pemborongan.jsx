
import React, { useState, useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
  Store, MapPin, TrendingUp, Users, Package, ShoppingCart, RotateCcw,
  Leaf, Truck, ArrowRightLeft, BarChart4, AlertTriangle, TrendingDown, Target
} from 'lucide-react';
import { formatFixed } from '../lib/formatters';
import { usePemborongan } from '../hooks/usePemborongan';
import { computePemborongan, computePemborongonFilterOptions } from '../lib/pemborongan';
import { getCountryCoords } from '../config/countryCoordinates';
import { normalizeNegeriName } from '../lib/geoNames';
import { toNumber } from '../lib/googleSheets';
import SearchableSelect from '../components/common/SearchableSelect';

const fmtInt = (v) => (v === null || v === undefined) ? '–' : v.toLocaleString();
const fmtDec = (v) => (v === null || v === undefined) ? '–' : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EmptyState = ({ label = 'Tiada data tersedia buat masa ini' }) => (
  <div className="flex-1 flex items-center justify-center text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-6 px-4">
    {label}
  </div>
);

export default function Pemborongan({ isDarkMode = false }) {
  const { profiling, keperluan, sumber, saluran, loading: sheetsLoading, error: sheetsError } = usePemborongan();

  const [selectedTahun, setSelectedTahun] = useState("All");
  const [selectedNegeri, setSelectedNegeri] = useState("All");
  const [selectedDaerah, setSelectedDaerah] = useState("All");
  const [selectedJenisPremis, setSelectedJenisPremis] = useState("All");

  const [mapLoaded, setMapLoaded] = useState(false);

  // --- FIXED & ROBUST MAP LOADER ---
  useEffect(() => {
    const loadMaps = async () => {
      // 1. Load World Map
      try {
        const resWorld = await fetch('https://unpkg.com/echarts@4.9.0/map/json/world.json');
        if (resWorld.ok) {
          const jsonWorld = await resWorld.json();
          echarts.registerMap('world', jsonWorld);
        }
      } catch (err) { console.warn('Gagal memuatkan peta dunia', err); }

      // 2. Load Malaysia Map (Dengan Fallback Automatik)
      const malaysiaMapUrls = [
        'https://raw.githubusercontent.com/mizaniady/malaysia-geojson/master/malaysia.geojson',
        'https://raw.githubusercontent.com/macrojaguar/malaysia-geojson/master/malaysia.geojson',
        '/malaysia_state.geojson',    // Jika anda letakkan fail secara lokal kelak
        '/malaysia_district.geojson'  // Fallback terakhir guna peta daerah sedia ada anda
      ];

      for (const url of malaysiaMapUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const jsonMy = await res.json();
            echarts.registerMap('malaysia_states', jsonMy);
            break; // Berhenti mencuba URL lain jika berjaya
          }
        } catch (err) {
          console.warn(`URL gagal: ${url}, mencuba link seterusnya...`);
        }
      }

      setMapLoaded(true);
    };

    loadMaps();
  }, []);

  const handleGlobalReset = () => {
    setSelectedTahun("All");
    setSelectedNegeri("All");
    setSelectedDaerah("All");
    setSelectedJenisPremis("All");
  };

  // --- DYNAMIC FILTER OPTIONS (from the real Profiling tab) ---
  const filterOptions = useMemo(() => computePemborongonFilterOptions(profiling), [profiling]);

  // Daerah options narrow to the selected Negeri, like the rest of the app.
  const daerahOptions = useMemo(() => {
    if (!profiling || profiling.length === 0) return ['All'];
    if (selectedNegeri === 'All') return filterOptions.daerah;
    const set = new Set();
    for (const row of profiling) {
      if (normalizeNegeriName(row.Negeri) === selectedNegeri && row.Daerah) {
        set.add(String(row.Daerah).trim());
      }
    }
    return ['All', ...[...set].sort()];
  }, [profiling, selectedNegeri, filterOptions]);

  // --- REAL DATA ENGINE ---
  const filters = useMemo(() => ({
    tahun: selectedTahun, negeri: selectedNegeri, daerah: selectedDaerah, jenisPremis: selectedJenisPremis,
  }), [selectedTahun, selectedNegeri, selectedDaerah, selectedJenisPremis]);

  const data = useMemo(
    () => computePemborongan({ profiling, keperluan, sumber, saluran }, filters),
    [profiling, keperluan, sumber, saluran, filters]
  );

  // --- ECHARTS OPTIONS ---
  const trendYears = Object.keys(data.trend.series).sort();
  const trendColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
  const trendLineOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', width: 2 } },
      valueFormatter: (v) => formatFixed(v, 2),
    },
    legend: { data: trendYears, icon: 'circle', textStyle: { color: isDarkMode ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: 'bold' }, bottom: 0 },
    grid: { left: '3%', right: '3%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
        type: 'category', boundaryGap: false, data: data.trend.labels,
        axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 'bold' },
        axisLine: { lineStyle: { color: isDarkMode ? '#1e293b' : '#f1f5f9' } }, axisTick: { show: false }
    },
    yAxis: { type: 'value', axisLabel: { color: isDarkMode ? '#94a3b8' : '#94a3b8', formatter: (v) => formatFixed(v / 1000, 2) + 'k' }, splitLine: { lineStyle: { color: isDarkMode ? '#1e293b' : '#f1f5f9', type: 'dashed' } } },
    series: trendYears.map((year, i) => ({
      name: year, type: 'line', smooth: true, symbol: 'none', data: data.trend.series[year],
      lineStyle: { width: 3, color: trendColors[i % trendColors.length] },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: trendColors[i % trendColors.length] + '33' }, { offset: 1, color: trendColors[i % trendColors.length] + '00' }]) }
    }))
  };

  const divergingBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: function (params) {
        let tooltip = `<div style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:5px; margin-bottom:5px;">${params[0].name}</div>`;
        params.forEach(p => {
          const val = formatFixed(Math.abs(p.value), 2);
          tooltip += `<div><span style="color:${p.color}; font-weight:bold;">${p.seriesName}</span>: ${val} Juta</div>`;
        });
        const baki = formatFixed(params[0].value + params[1].value, 2);
        const bakiColor = baki >= 0 ? '#10b981' : '#ef4444';
        tooltip += `<div style="margin-top:5px; padding-top:5px; border-top:1px solid #ccc; font-weight:bold;">Baki: <span style="color:${bakiColor}">${baki > 0 ? '+' : ''}${baki} Juta</span></div>`;
        return tooltip;
      }
    },
    legend: { data: ['Import (Juta)', 'Eksport (Juta)'], bottom: 0, icon: 'circle', textStyle: { color: isDarkMode ? '#cbd5e1' : '#64748b', fontWeight: 'bold', fontSize: 10 } },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: [ { type: 'value', axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold', fontSize: 9, formatter: (v) => Math.abs(v) }, splitLine: { lineStyle: { type: 'dashed', color: isDarkMode ? '#1e293b' : '#e2e8f0' } } } ],
    yAxis: [ { type: 'category', axisTick: { show: false }, data: data.tradeBalance.categories, axisLabel: { color: isDarkMode ? '#cbd5e1' : '#475569', fontWeight: 'bold', fontSize: 9 }, axisLine: { show: false } } ],
    series: [
      { name: 'Import (Juta)', type: 'bar', stack: 'Total', barWidth: '40%', itemStyle: { color: '#ef4444', borderRadius: [4, 0, 0, 4] }, label: { show: true, position: 'left', color: '#ef4444', fontWeight: 'bold', fontSize: 9, formatter: (p) => formatFixed(Math.abs(p.value), 1) }, data: data.tradeBalance.import },
      { name: 'Eksport (Juta)', type: 'bar', stack: 'Total', barWidth: '40%', itemStyle: { color: '#10b981', borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: '#10b981', fontWeight: 'bold', fontSize: 9, formatter: (p) => p.value > 0 ? formatFixed(p.value, 1) : '' }, data: data.tradeBalance.eksport }
    ]
  };

  const scatterMatrixOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      formatter: function (params) {
        return `<div style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:5px; margin-bottom:5px;">${params.data.name}</div>
                <div style="font-size: 11px;">Kebergantungan Luar: <b style="color:${params.color}">${formatFixed(params.data.value[1], 2)}%</b></div>
                <div style="font-size: 11px;">Jumlah Bekalan: <b>${formatFixed(params.data.value[0], 2)}</b></div>`;
      }
    },
    grid: { left: '10%', right: '5%', bottom: '15%', top: '10%', containLabel: false },
    xAxis: {
      type: 'value', name: 'Jumlah Bekalan', nameLocation: 'middle', nameGap: 25,
      splitLine: { show: false }, axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9, formatter: (v) => (v/1000) + 'k' },
      axisLine: { lineStyle: { color: isDarkMode ? '#334155' : '#cbd5e1' } }
    },
    yAxis: {
      type: 'value', name: 'Kebergantungan Luar (%)', nameLocation: 'middle', nameGap: 30, min: 0, max: 100,
      splitLine: { lineStyle: { type: 'dashed', color: isDarkMode ? '#1e293b' : '#f1f5f9' } },
      axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9, formatter: (v) => formatFixed(v, 2) }
    },
    visualMap: { show: false, min: 0, max: 100, dimension: 1, inRange: { color: ['#10b981', '#f59e0b', '#ef4444'] } },
    series: [{
      type: 'scatter',
      // Scale bubble size relative to the actual data range (8px-40px)
      // rather than a fixed formula, so real sheet volumes — whatever
      // scale they turn out to be — never blow up into overlapping blobs.
      symbolSize: (d) => {
        const maxVol = Math.max(1, ...data.dependencyMatrix.map((m) => m.vol));
        return 8 + (Math.sqrt(d[0]) / Math.sqrt(maxVol)) * 32;
      },
      itemStyle: { opacity: 0.75, shadowBlur: 6, shadowColor: 'rgba(0, 0, 0, 0.15)' },
      data: data.dependencyMatrix.map(item => ({ name: item.name, value: [item.vol, item.dep] }))
    }]
  };

  const maxRespondents = Math.max(1, ...data.demografi.map(d => d.value));
  const demographicsMapOption = mapLoaded ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item', backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', borderColor: '#3b82f6', padding: 10,
      formatter: function (params) {
        if (!params.data) return params.name;
        return `<div style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:5px; margin-bottom:5px; text-transform: uppercase;">${params.name}</div>
                <div style="font-size: 11px; margin-bottom: 2px;">Jumlah Responden: <b style="color:#3b82f6">${params.data.value}</b></div>
                <div style="font-size: 11px; margin-bottom: 2px;">Pasar Borong: <b>${params.data.pb}</b></div>
                <div style="font-size: 11px;">Outlet Pemborongan: <b>${params.data.op}</b></div>`;
      }
    },
    visualMap: { left: 'right', bottom: '0%', min: 0, max: maxRespondents, inRange: { color: ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'] }, show: false },
    series: [{
      name: 'Responden', type: 'map', map: 'malaysia_states', roam: true, zoom: 1.2,
      itemStyle: { borderColor: isDarkMode ? '#1e293b' : '#cbd5e1', borderWidth: 0.5 },
      emphasis: { itemStyle: { areaColor: '#fcd34d' }, label: { show: false } },
      data: data.demografi
    }]
  } : {};

  const createMiniMapOption = (color, dataPoints) => ({
    backgroundColor: 'transparent',
    geo: { map: 'world', roam: true, zoom: 4.5, center: [105.0, 10.0], itemStyle: { areaColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: isDarkMode ? '#334155' : '#e2e8f0', borderWidth: 1 }, emphasis: { label: { show: false }, itemStyle: { areaColor: isDarkMode ? '#334155' : '#e2e8f0' } } },
    series: [{ type: 'effectScatter', coordinateSystem: 'geo', rippleEffect: { brushType: 'stroke', scale: 4 }, itemStyle: { color: color, shadowBlur: 10, shadowColor: color }, data: dataPoints }]
  });

  // Real mini-map points — top foreign Negara_Bekalan/Negara_Pasaran by
  // volume from Sumber Bekalan / Saluran Pasaran, plus a Malaysia point for
  // the domestic share. Empty when the underlying tab isn't ready.
  const bekalanMapData = useMemo(() => {
    if (!data.sumberReady) return [];
    const byCountry = new Map();
    let domestic = 0;
    for (const row of sumber) {
      const country = String(row.Negara_Bekalan || '').trim();
      const vol = toNumber(row.Jumlah_Sumber_Bekalan_Lokasi);
      if (!(vol > 0)) continue;
      if (!country || country.toLowerCase() === 'malaysia') { domestic += vol; continue; }
      byCountry.set(country, (byCountry.get(country) || 0) + vol);
    }
    const points = [];
    if (domestic > 0) points.push({ name: 'Malaysia', value: [101.68, 3.13, domestic] });
    for (const [name, vol] of [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      const coords = getCountryCoords(name);
      if (coords) points.push({ name, value: [...coords, vol] });
    }
    return points;
  }, [sumber, data.sumberReady]);

  const pasaranMapData = useMemo(() => {
    if (!data.saluranReady) return [];
    const byCountry = new Map();
    for (const row of saluran) {
      const country = String(row.Negara_Pasaran || '').trim();
      const vol = toNumber(row.Jumlah_Saluran_Pasaran_Lokasi);
      if (!(vol > 0)) continue;
      if (!country || country.toLowerCase() === 'malaysia') continue;
      byCountry.set(country, (byCountry.get(country) || 0) + vol);
    }
    const points = [];
    for (const [name, vol] of [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
      const coords = getCountryCoords(name);
      if (coords) points.push({ name, value: [...coords, vol] });
    }
    return points;
  }, [saluran, data.saluranReady]);

  // Dynamic insight sentences (replace the old hardcoded "53.3%" / "-172.7
  // Juta KG" copy) — null when there isn't enough real data to say them.
  const highDepPct = data.dependencyMatrix.length > 0
    ? (data.dependencyMatrix.filter((d) => d.dep >= 80).length / data.dependencyMatrix.length) * 100
    : null;

  const tradeDeficit = data.tradeBalanceReady && data.tradeBalance.categories.length > 0
    ? (() => {
        const bakiByCat = data.tradeBalance.categories.map((cat, i) => ({
          cat, baki: (data.tradeBalance.import[i] || 0) + (data.tradeBalance.eksport[i] || 0),
        }));
        const total = bakiByCat.reduce((sum, b) => sum + b.baki, 0);
        const worst = bakiByCat.reduce((min, b) => (b.baki < min.baki ? b : min), bakiByCat[0]);
        return { total, worstCategory: worst.cat };
      })()
    : null;

  // --- UI COMPONENTS ---
  const ModernProgressList = ({ title, items, colorClass, bgClass, isCurrency = false }) => (
    <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm flex flex-col transition-all hover:shadow-md">
      <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-5 border-b pb-2">{title}</h3>
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-2 group">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.name}</span>
                <div className="flex items-baseline gap-2">
                  {item.val != null && <span className="text-[10px] font-bold text-slate-400">{isCurrency ? 'RM ' : ''}{item.val.toLocaleString(undefined, {minimumFractionDigits: isCurrency ? 2 : 1, maximumFractionDigits: isCurrency ? 2 : 1})}</span>}
                  <span className={`text-xs font-black ${colorClass}`}>{item.pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700`}>
                <div className={`h-full rounded-full ${colorClass.replace('text-', 'bg-')} opacity-80 group-hover:opacity-100 transition-all`} style={{ width: `${item.pct}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 h-full w-full relative bg-slate-50 dark:bg-slate-900 p-2 md:p-6 rounded-xl">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 flex items-center justify-center font-black rounded-xl shadow-sm"><Store className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">PEMBORONGAN</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Prestasi Kuantiti & Aliran Rantaian Pemborong</p>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col gap-5 min-h-0 overflow-y-auto pr-1">

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row gap-2 items-end">
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            {[
              { label: 'TAHUN', val: selectedTahun, set: setSelectedTahun, options: filterOptions.tahun, searchable: false },
              { label: 'NEGERI', val: selectedNegeri, set: setSelectedNegeri, options: filterOptions.negeri.map((n) => ({ value: n, label: n.toUpperCase() })) },
              { label: 'DAERAH', val: selectedDaerah, set: setSelectedDaerah, options: daerahOptions.map((d) => ({ value: d, label: d.toUpperCase() })) },
              { label: 'JENIS PREMIS', val: selectedJenisPremis, set: setSelectedJenisPremis, options: filterOptions.jenisPremis, searchable: false }
            ].map((f, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">{f.label}</label>
                <SearchableSelect
                  value={f.val}
                  onChange={f.set}
                  options={f.options}
                  searchable={f.searchable !== false}
                  triggerClassName="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-all"
                />
              </div>
            ))}
          </div>
          <button onClick={handleGlobalReset} className="shrink-0 h-[60px] w-[60px] bg-white hover:bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-red-500"><RotateCcw className="w-5 h-5" /></button>
        </div>

        {sheetsError && (
          <div className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl p-3">
            Ralat memuatkan data Pemborongan: {sheetsError}
          </div>
        )}

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
                { title: "JUMLAH KUANTITI BEKALAN", val: data.kpi.kuantitiBekalan, icon: Package, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
                { title: "JUMLAH KUANTITI PASARAN", val: data.kpi.kuantitiPasaran, icon: ShoppingCart, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" }
            ].map((kpi, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 md:p-6 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${kpi.bg} ${kpi.color}`}><kpi.icon className="w-6 h-6" /></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.title}</span>
                            <span className={`text-2xl md:text-3xl font-black ${kpi.color}`}>{fmtDec(kpi.val)}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* SECTION 1: INSIGHTS & DIVERGING BAR CHART */}
        <div className="flex flex-col xl:flex-row gap-4 h-auto xl:h-[350px]">
          <div className="flex-[0.8] flex flex-col gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-3xl p-5 flex flex-col items-start shadow-sm flex-1 justify-center relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10"><AlertTriangle className="w-32 h-32 text-red-600" /></div>
              <div className="bg-red-100 dark:bg-red-900/50 p-2.5 rounded-full mb-3 relative z-10"><AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
              <h4 className="text-[11px] font-black text-red-800 dark:text-red-400 uppercase tracking-widest mb-1 relative z-10">Amaran Rantaian Bekalan</h4>
              {highDepPct !== null ? (
                <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed relative z-10">
                  Sebanyak <strong className="text-red-900 dark:text-red-200 text-sm">{highDepPct.toFixed(1)}%</strong> daripada keseluruhan lokasi bekalan menghadapi isu kebergantungan yang sangat tinggi terhadap sumber luar.
                </p>
              ) : (
                <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed relative z-10">Tiada data mencukupi buat masa ini.</p>
              )}
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-3xl p-5 flex flex-col items-start shadow-sm flex-1 justify-center relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingDown className="w-32 h-32 text-amber-600" /></div>
              <div className="bg-amber-100 dark:bg-amber-900/50 p-2.5 rounded-full mb-3 relative z-10"><TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
              <h4 className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-1 relative z-10">Imbangan Dagangan Agromakanan</h4>
              {tradeDeficit !== null ? (
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed relative z-10">
                  {tradeDeficit.total < 0 ? 'Defisit' : 'Lebihan'} berjumlah <strong className="text-amber-900 dark:text-amber-200 text-sm">{tradeDeficit.total >= 0 ? '+' : ''}{formatFixed(tradeDeficit.total, 1)} Juta</strong> didorong oleh sektor {tradeDeficit.worstCategory}.
                </p>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed relative z-10">Tiada data mencukupi buat masa ini.</p>
              )}
            </div>
          </div>
          <div className="flex-[1.2] bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex flex-col relative">
            <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-center mb-2">IMBANGAN DAGANGAN MENGIKUT KOMODITI UTAMA</h3>
            {data.tradeBalance.categories.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex-1 w-full relative mt-2">
                  <div className="absolute top-0 bottom-8 left-[50%] border-l border-dashed border-slate-300 dark:border-slate-600 z-0"></div>
                  <ReactECharts option={divergingBarOption} style={{ height: '100%', minHeight: '250px', width: '100%' }} notMerge={true} />
              </div>
            )}
          </div>
        </div>

        {/* --- DEMOGRAPHICS & DEPENDENCY MATRIX --- */}
        <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[400px]">
            {/* Left: Demographics Choropleth Map */}
            <div className="flex-[1] bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex flex-col relative min-h-[300px]">
                <div className="flex items-center gap-2 mb-2 z-10 relative">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">PROFIL DEMOGRAFI RESPONDEN</h3>
                </div>
                <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden relative">
                    {!mapLoaded && <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs animate-pulse">Memuatkan Peta...</div>}
                    {mapLoaded && <ReactECharts option={demographicsMapOption} style={{ height: '100%', minHeight: '250px', width: '100%', position: 'absolute', top: 0, left: 0 }} notMerge={true} />}
                </div>
            </div>

            {/* Right: Dependency Scatter Plot Matrix */}
            <div className="flex-[1.5] bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex flex-col min-h-[300px]">
                <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">MATRIKS KEBERGANTUNGAN BEKALAN (RISIKO PASARAN)</h3>
                </div>
                {data.dependencyMatrix.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="flex-1 w-full relative">
                      <div className="absolute top-[10%] left-[10%] right-[5%] bottom-[15%] pointer-events-none flex flex-col z-0">
                          <div className="flex-1 border-b border-dashed border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10 flex items-start justify-end p-2"><span className="text-[8px] font-bold text-red-400 uppercase">Zon Berisiko</span></div>
                          <div className="flex-1 border-b border-dashed border-amber-200 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-900/10"></div>
                          <div className="flex-1 bg-emerald-50/20 dark:bg-emerald-900/10 flex items-end justify-end p-2"><span className="text-[8px] font-bold text-emerald-400 uppercase">Zon Selamat</span></div>
                      </div>
                      <ReactECharts option={scatterMatrixOption} style={{ height: '100%', minHeight: '250px', width: '100%', position: 'relative', zIndex: 10 }} notMerge={true} />
                  </div>
                )}
            </div>
        </div>

        {/* SECTION 2: TREND & PREMIS */}
        <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[350px]">
          <div className="flex-[1.5] bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col p-6 min-h-[300px]">
            <div className="flex items-center gap-2 mb-4"><BarChart4 className="w-5 h-5 text-blue-500" /><h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">TREND KEPERLUAN BEKALAN</h3></div>
            {trendYears.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex-1 w-full"><ReactECharts option={trendLineOption} style={{ height: '100%', minHeight: '200px', width: '100%' }} notMerge={true} /></div>
            )}
          </div>
          <div className="flex-[0.5] flex flex-col gap-4">
             <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
                <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">BILANGAN PREMIS</span><span className="text-2xl font-black text-slate-800 dark:text-white">{fmtInt(data.kpi.bilanganPremis)}</span></div>
             </div>
             <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                 <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-6 border-b pb-2">JENIS PREMIS</h3>
                 {data.premis.length === 0 ? (
                   <EmptyState />
                 ) : (
                   <div className="flex flex-col gap-6 justify-center flex-1">
                      {data.premis.map((p, i) => (
                      <div key={i} className="flex flex-col gap-2 group">
                          <div className="flex justify-between items-end">
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">{p.name}</span>
                              <span className="text-lg font-black text-slate-800 dark:text-white">{p.val}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden"><div className="h-full bg-indigo-500 rounded-full group-hover:bg-indigo-600 transition-all" style={{ width: `${p.pct}%` }}></div></div>
                      </div>
                      ))}
                   </div>
                 )}
             </div>
          </div>
        </div>

        {/* SECTION 3: SUPPLY & MARKET */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/30"><Leaf className="w-5 h-5 text-emerald-600" /><h2 className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">RANTAIAN SUMBER BEKALAN</h2></div>
                <div className="flex flex-col xl:flex-row gap-4 h-auto xl:h-[280px]">
                    <ModernProgressList title="SUMBER BEKALAN" items={data.sumberBekalan} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/30" />
                    <div className="flex-[0.8] bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-3 flex flex-col min-h-[250px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-2">PETA LOKASI SUMBER</span>
                        <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden">{mapLoaded && <ReactECharts option={createMiniMapOption('#10b981', bekalanMapData)} style={{ height: '100%', minHeight: '200px', width: '100%' }} />}</div>
                    </div>
                </div>
                <div className="h-[200px]"><ModernProgressList title="LOKASI SUMBER BEKALAN" items={data.lokasiSumber} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/30" /></div>
            </div>
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl border border-amber-100 dark:border-amber-800/30"><ArrowRightLeft className="w-5 h-5 text-amber-600" /><h2 className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">RANTAIAN SALURAN PASARAN</h2></div>
                <div className="flex flex-col xl:flex-row gap-4 h-auto xl:h-[280px]">
                    <ModernProgressList title="SALURAN PASARAN" items={data.saluranPasaran} colorClass="text-amber-600 dark:text-amber-500" bgClass="bg-amber-50 dark:bg-amber-900/30" />
                    <div className="flex-[0.8] bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-3 flex flex-col min-h-[250px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-2">PETA LOKASI PASARAN</span>
                        <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden">{mapLoaded && <ReactECharts option={createMiniMapOption('#f59e0b', pasaranMapData)} style={{ height: '100%', minHeight: '200px', width: '100%' }} />}</div>
                    </div>
                </div>
                <div className="h-[200px]"><ModernProgressList title="LOKASI SALURAN PASARAN" items={data.lokasiPasaran} colorClass="text-amber-600 dark:text-amber-500" bgClass="bg-amber-50 dark:bg-amber-900/30" /></div>
            </div>
        </div>

        {/* SECTION 4: COMMODITY LIST */}
        <div className="w-full mt-2 mb-8"><ModernProgressList title="KEPERLUAN BEKALAN MENGIKUT KOMODITI" items={data.komoditi} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/30" /></div>

      </div>
    </div>
  );
}
