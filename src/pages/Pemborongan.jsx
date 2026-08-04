
import React, { useState, useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { 
  Store, MapPin, TrendingUp, Users, Package, ShoppingCart, RotateCcw, 
  Leaf, Truck, ArrowRightLeft, BarChart4, AlertTriangle, TrendingDown, Target
} from 'lucide-react';

export default function Pemborongan({ isDarkMode = false }) {
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

  // --- MOCK DATA ENGINE ---
  const data = useMemo(() => {
    let filterMult = 1.0;
    if (selectedTahun === "2024") filterMult *= 0.85;
    if (selectedTahun === "2025") filterMult *= 1.15;
    if (selectedNegeri !== "All") filterMult *= 0.25; 
    if (selectedDaerah !== "All") filterMult *= 0.15; 
    if (selectedJenisPremis !== "All") filterMult *= 0.5;

    return {
      filterMultiplier: filterMult,
      kpi: {
        bilanganPremis: Math.ceil(26 * filterMult) || 1,
        kuantitiBekalan: 45234.12 * filterMult,
        kuantitiPasaran: 40300.32 * filterMult
      },
      premis: [
        { name: "Outlet Pemborongan", val: Math.ceil(22 * filterMult) || 1, pct: 78 },
        { name: "Pasar Borong", val: Math.ceil(6 * filterMult) || 1, pct: 22 }
      ],
      sumberBekalan: [
        { name: "Ladang Lain", pct: 41.4 }, { name: "Petani/Penternak/Nelayan", pct: 39.0 },
        { name: "Peraih/Pengumpul", pct: 16.2 }, { name: "Ladang Sendiri", pct: 3.1 }, { name: "Pengimport", pct: 0.3 }
      ],
      saluranPasaran: [
        { name: "Peruncit", pct: 54.2 }, { name: "Eksport", pct: 25.4 },
        { name: "Peraih/Pengumpul", pct: 20.0 }, { name: "Pengguna", pct: 0.4 }
      ],
      lokasiSumber: [
        { name: "Luar Daerah", pct: 48.4 }, { name: "Luar Negeri", pct: 28.0 },
        { name: "Dalam Daerah", pct: 23.1 }, { name: "Luar Negara", pct: 0.5 }
      ],
      lokasiPasaran: [
        { name: "Luar Daerah", pct: 51.6 }, { name: "Luar Negara", pct: 33.5 },
        { name: "Dalam Daerah", pct: 10.8 }, { name: "Luar Negeri", pct: 4.0 }
      ],
      komoditi: [
        { name: "Tembikai", val: 52468.6 * filterMult, pct: 100 }, { name: "Kacang Panjang", val: 8582.9 * filterMult, pct: 16.3 },
        { name: "Timun", val: 6956.3 * filterMult, pct: 13.2 }, { name: "Ketola", val: 4830.0 * filterMult, pct: 9.2 },
        { name: "Kacang Bendi", val: 4765.8 * filterMult, pct: 9.0 }, { name: "Cili", val: 4534.4 * filterMult, pct: 8.6 },
        { name: "Pisang", val: 3680.1 * filterMult, pct: 7.0 }
      ],
      tradeBalance: {
        categories: ['Sayur-sayuran', 'Buah-buahan', 'Tanaman Kontan', 'Hasil Perikanan', 'Ternakan', 'Herba & Rempah'].reverse(),
        import: [-119.31, -77.15, -1.85, -9.45, -0.68, -0.02].map(v => v * filterMult).reverse(),
        eksport: [11.74, 9.91, 1.30, 0.004, 12.75, 0].map(v => v * filterMult).reverse()
      },
      demografi: [
        { name: "Kuala Lumpur", value: Math.ceil(457 * filterMult), pb: 1, op: 0 },
        { name: "Selangor", value: Math.ceil(294 * filterMult), pb: 1, op: 1 },
        { name: "Perak", value: Math.ceil(256 * filterMult), pb: 2, op: 5 },
        { name: "Kelantan", value: Math.ceil(196 * filterMult), pb: 4, op: 1 },
        { name: "Negeri Sembilan", value: Math.ceil(147 * filterMult), pb: 1, op: 0 },
        { name: "Pulau Pinang", value: Math.ceil(139 * filterMult), pb: 2, op: 0 },
        { name: "Terengganu", value: Math.ceil(136 * filterMult), pb: 3, op: 1 },
        { name: "Johor", value: Math.ceil(118 * filterMult), pb: 1, op: 13 },
        { name: "Melaka", value: Math.ceil(97 * filterMult), pb: 1, op: 1 },
        { name: "Pahang", value: Math.ceil(85 * filterMult), pb: 1, op: 0 },
        { name: "Sarawak", value: Math.ceil(64 * filterMult), pb: 1, op: 1 },
        { name: "Sabah", value: Math.ceil(51 * filterMult), pb: 1, op: 0 },
        { name: "Kedah", value: Math.ceil(44 * filterMult), pb: 1, op: 1 },
        { name: "Perlis", value: Math.ceil(19 * filterMult), pb: 1, op: 0 }
      ],
      dependencyMatrix: [
        { name: "Kaw. Pem. Tambun", dep: 100, vol: 15000 }, { name: "Pasar Borong KL", dep: 86.2, vol: 120000 },
        { name: "Pasar Borong Pandan", dep: 91.3, vol: 65000 }, { name: "Kaw. Pem. Yong Peng", dep: 83.6, vol: 20000 },
        { name: "Pasar Borong Menglembu", dep: 31.6, vol: 45000 }, { name: "Pasar Borong Kuantan", dep: 26.2, vol: 55000 },
        { name: "Medan Niaga Satok", dep: 99.5, vol: 35000 }, { name: "Pasar Besar Meru", dep: 52.5, vol: 80000 },
        { name: "Pasar Borong Sri Kembangan", dep: 41.5, vol: 90000 }, { name: "Pasar Borong Alor Setar", dep: 16.0, vol: 25000 }
      ].map(d => ({ ...d, vol: d.vol * filterMult }))
    };
  }, [selectedTahun, selectedNegeri, selectedDaerah, selectedJenisPremis]);

  // --- ECHARTS OPTIONS ---
  const trendLineOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', width: 2 } } },
    legend: { data: ['2024', '2025'], icon: 'circle', textStyle: { color: isDarkMode ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: 'bold' }, bottom: 0 },
    grid: { left: '3%', right: '3%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: { 
        type: 'category', boundaryGap: false, data: ['JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN', 'JUL', 'OGO', 'SEP', 'OKT', 'NOV', 'DIS'],
        axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 'bold' },
        axisLine: { lineStyle: { color: isDarkMode ? '#1e293b' : '#f1f5f9' } }, axisTick: { show: false } 
    },
    yAxis: { type: 'value', axisLabel: { color: isDarkMode ? '#94a3b8' : '#94a3b8', formatter: (v) => (v/1000).toFixed(0) + 'k' }, splitLine: { lineStyle: { color: isDarkMode ? '#1e293b' : '#f1f5f9', type: 'dashed' } } },
    series: [
      { name: '2024', type: 'line', smooth: true, symbol: 'none', data: [2990, 3102, 3097, 2911, 2967, 2933, 2993, 3011, 2984, 2786, 2825, 2784].map(v => v * data.filterMultiplier), lineStyle: { width: 3, color: '#ef4444' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(239, 68, 68, 0.2)' }, { offset: 1, color: 'rgba(239, 68, 68, 0)' }]) } },
      { name: '2025', type: 'line', smooth: true, symbol: 'none', data: [4407, 4348, 4653, 4412, 4424, 4381, 4595, 4586, 4552, 3178, 3324, 3279].map(v => v * data.filterMultiplier), lineStyle: { width: 3, color: '#3b82f6' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(59, 130, 246, 0.2)' }, { offset: 1, color: 'rgba(59, 130, 246, 0)' }]) } }
    ]
  };

  const divergingBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: function (params) {
        let tooltip = `<div style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:5px; margin-bottom:5px;">${params[0].name}</div>`;
        params.forEach(p => {
          const val = Math.abs(p.value).toFixed(2);
          tooltip += `<div><span style="color:${p.color}; font-weight:bold;">${p.seriesName}</span>: ${val} Juta KG</div>`;
        });
        const baki = (params[0].value + params[1].value).toFixed(2);
        const bakiColor = baki >= 0 ? '#10b981' : '#ef4444';
        tooltip += `<div style="margin-top:5px; padding-top:5px; border-top:1px solid #ccc; font-weight:bold;">Baki: <span style="color:${bakiColor}">${baki > 0 ? '+' : ''}${baki} Juta KG</span></div>`;
        return tooltip;
      }
    },
    legend: { data: ['Import (Juta KG)', 'Eksport (Juta KG)'], bottom: 0, icon: 'circle', textStyle: { color: isDarkMode ? '#cbd5e1' : '#64748b', fontWeight: 'bold', fontSize: 10 } },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: [ { type: 'value', axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold', fontSize: 9, formatter: (v) => Math.abs(v) }, splitLine: { lineStyle: { type: 'dashed', color: isDarkMode ? '#1e293b' : '#e2e8f0' } } } ],
    yAxis: [ { type: 'category', axisTick: { show: false }, data: data.tradeBalance.categories, axisLabel: { color: isDarkMode ? '#cbd5e1' : '#475569', fontWeight: 'bold', fontSize: 9 }, axisLine: { show: false } } ],
    series: [
      { name: 'Import (Juta KG)', type: 'bar', stack: 'Total', barWidth: '40%', itemStyle: { color: '#ef4444', borderRadius: [4, 0, 0, 4] }, label: { show: true, position: 'left', color: '#ef4444', fontWeight: 'bold', fontSize: 9, formatter: (p) => Math.abs(p.value).toFixed(1) }, data: data.tradeBalance.import },
      { name: 'Eksport (Juta KG)', type: 'bar', stack: 'Total', barWidth: '40%', itemStyle: { color: '#10b981', borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: '#10b981', fontWeight: 'bold', fontSize: 9, formatter: (p) => p.value > 0 ? p.value.toFixed(1) : '' }, data: data.tradeBalance.eksport }
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
                <div style="font-size: 11px;">Kebergantungan Luar: <b style="color:${params.color}">${params.data.value[1]}%</b></div>
                <div style="font-size: 11px;">Kapasiti Pasaran: <b>${params.data.value[0].toLocaleString()} MT</b></div>`;
      }
    },
    grid: { left: '10%', right: '5%', bottom: '15%', top: '10%', containLabel: false },
    xAxis: { 
      type: 'value', name: 'Kapasiti Pasaran (MT)', nameLocation: 'middle', nameGap: 25,
      splitLine: { show: false }, axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9, formatter: (v) => (v/1000) + 'k' },
      axisLine: { lineStyle: { color: isDarkMode ? '#334155' : '#cbd5e1' } }
    },
    yAxis: { 
      type: 'value', name: 'Kebergantungan Luar (%)', nameLocation: 'middle', nameGap: 30, min: 0, max: 100,
      splitLine: { lineStyle: { type: 'dashed', color: isDarkMode ? '#1e293b' : '#f1f5f9' } },
      axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9 }
    },
    visualMap: { show: false, min: 0, max: 100, dimension: 1, inRange: { color: ['#10b981', '#f59e0b', '#ef4444'] } },
    series: [{
      type: 'scatter',
      symbolSize: (data) => Math.sqrt(data[0]) / 10 + 5, 
      itemStyle: { opacity: 0.8, shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.2)' },
      data: data.dependencyMatrix.map(item => ({ name: item.name, value: [item.vol, item.dep] }))
    }]
  };

  const maxRespondents = Math.max(...data.demografi.map(d => d.value));
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

  const bekalanMapData = [{ name: 'Malaysia', value: [101.68, 3.13, 100] }, { name: 'Thailand', value: [100.99, 15.87, 40] }, { name: 'Indonesia', value: [113.92, -0.78, 60] }, { name: 'Vietnam', value: [108.27, 14.05, 30] }];
  const pasaranMapData = [{ name: 'Singapura', value: [103.81, 1.35, 120] }, { name: 'China', value: [121.47, 31.23, 80] }, { name: 'Jepun', value: [139.69, 35.68, 50] }, { name: 'Australia', value: [151.20, -33.86, 20] }];

  // --- UI COMPONENTS ---
  const ModernProgressList = ({ title, items, colorClass, bgClass, isCurrency = false }) => (
    <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm flex flex-col transition-all hover:shadow-md">
      <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-5 border-b pb-2">{title}</h3>
      <div className="flex flex-col gap-4 overflow-y-auto pr-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-2 group">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.name}</span>
              <div className="flex items-baseline gap-2">
                {item.val && <span className="text-[10px] font-bold text-slate-400">{isCurrency ? 'RM ' : ''}{item.val.toLocaleString(undefined, {minimumFractionDigits: isCurrency ? 2 : 1})}</span>}
                <span className={`text-xs font-black ${colorClass}`}>{item.pct.toFixed(1)}%</span>
              </div>
            </div>
            <div className={`w-full h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700`}>
              <div className={`h-full rounded-full ${colorClass.replace('text-', 'bg-')} opacity-80 group-hover:opacity-100 transition-all`} style={{ width: `${item.pct}%` }}></div>
            </div>
          </div>
        ))}
      </div>
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
              { label: 'TAHUN', val: selectedTahun, set: setSelectedTahun, options: ['All', '2024', '2025'] },
              { label: 'NEGERI', val: selectedNegeri, set: setSelectedNegeri, options: ['All', 'Johor', 'Selangor', 'Pahang', 'Kedah'] },
              { label: 'DAERAH', val: selectedDaerah, set: setSelectedDaerah, options: ['All', 'Batu Pahat', 'Kluang', 'Klang'] },
              { label: 'JENIS PREMIS', val: selectedJenisPremis, set: setSelectedJenisPremis, options: ['All', 'Outlet Pemborongan', 'Pasar Borong'] }
            ].map((f, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">{f.label}</label>
                <select value={f.val} onChange={(e) => f.set(e.target.value)} className="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-all">
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button onClick={handleGlobalReset} className="shrink-0 h-[60px] w-[60px] bg-white hover:bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-red-500"><RotateCcw className="w-5 h-5" /></button>
        </div>

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
                { title: "JUMLAH KUANTITI BEKALAN (MT)", val: data.kpi.kuantitiBekalan, icon: Package, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
                { title: "JUMLAH KUANTITI PASARAN (MT)", val: data.kpi.kuantitiPasaran, icon: ShoppingCart, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" }
            ].map((kpi, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 md:p-6 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${kpi.bg} ${kpi.color}`}><kpi.icon className="w-6 h-6" /></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.title}</span>
                            <span className={`text-2xl md:text-3xl font-black ${kpi.color}`}>{kpi.val.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
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
              <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed relative z-10">
                Sebanyak <strong className="text-red-900 dark:text-red-200 text-sm">53.3%</strong> daripada keseluruhan lokasi pasaran borong menghadapi isu kebergantungan yang sangat tinggi terhadap sumber luar negeri.
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-3xl p-5 flex flex-col items-start shadow-sm flex-1 justify-center relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingDown className="w-32 h-32 text-amber-600" /></div>
              <div className="bg-amber-100 dark:bg-amber-900/50 p-2.5 rounded-full mb-3 relative z-10"><TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
              <h4 className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-1 relative z-10">Defisit Dagangan Agromakanan</h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed relative z-10">
                Terdapat defisit besar berjumlah <strong className="text-amber-900 dark:text-amber-200 text-sm">-172.7 Juta KG</strong> didorong oleh sektor Sayur-sayuran. Hanya sektor Ternakan merekodkan lebihan.
              </p>
            </div>
          </div>
          <div className="flex-[1.2] bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex flex-col relative">
            <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-center mb-2">IMBANGAN DAGANGAN MENGIKUT KOMODITI UTAMA</h3>
            <div className="flex-1 w-full relative mt-2">
                <div className="absolute top-0 bottom-8 left-[50%] border-l border-dashed border-slate-300 dark:border-slate-600 z-0"></div>
                {/* FIXED HEIGHT for safety */}
                <ReactECharts option={divergingBarOption} style={{ height: '100%', minHeight: '250px', width: '100%' }} notMerge={true} />
            </div>
          </div>
        </div>

        {/* --- NEW SECTION: DEMOGRAPHICS & DEPENDENCY MATRIX --- */}
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
                <div className="flex-1 w-full relative">
                    <div className="absolute top-[10%] left-[10%] right-[5%] bottom-[15%] pointer-events-none flex flex-col z-0">
                        <div className="flex-1 border-b border-dashed border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10 flex items-start justify-end p-2"><span className="text-[8px] font-bold text-red-400 uppercase">Zon Berisiko</span></div>
                        <div className="flex-1 border-b border-dashed border-amber-200 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-900/10"></div>
                        <div className="flex-1 bg-emerald-50/20 dark:bg-emerald-900/10 flex items-end justify-end p-2"><span className="text-[8px] font-bold text-emerald-400 uppercase">Zon Selamat</span></div>
                    </div>
                    {/* FIXED RELATIVE POSITIONING */}
                    <ReactECharts option={scatterMatrixOption} style={{ height: '100%', minHeight: '250px', width: '100%', position: 'relative', zIndex: 10 }} notMerge={true} />
                </div>
            </div>
        </div>

        {/* SECTION 2: TREND & PREMIS */}
        <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[350px]">
          <div className="flex-[1.5] bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col p-6 min-h-[300px]">
            <div className="flex items-center gap-2 mb-4"><BarChart4 className="w-5 h-5 text-blue-500" /><h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">TREND KEPERLUAN BEKALAN (MT)</h3></div>
            <div className="flex-1 w-full"><ReactECharts option={trendLineOption} style={{ height: '100%', minHeight: '200px', width: '100%' }} notMerge={true} /></div>
          </div>
          <div className="flex-[0.5] flex flex-col gap-4">
             <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
                <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">BILANGAN PREMIS</span><span className="text-2xl font-black text-slate-800 dark:text-white">{data.kpi.bilanganPremis}</span></div>
             </div>
             <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                 <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-6 border-b pb-2">JENIS PREMIS</h3>
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
        <div className="w-full mt-2 mb-8"><ModernProgressList title="KUANTITI BEKALAN (MT) MENGIKUT KOMODITI" items={data.komoditi} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/30" /></div>

      </div>
    </div>
  );
}
