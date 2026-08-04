import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Package, Truck, Ship, Plane, Factory as FactoryIcon, MapPin, RotateCcw,
  Wallet, Banknote, Landmark, Box, Layers, BarChart4, Home, Hotel, Building2
} from 'lucide-react';
import MalaysiaFlowMap from '../components/charts/MalaysiaFlowMap';
import MalaysiaPenggunaanMap from '../components/charts/MalaysiaPenggunaanMap';

export default function Permintaan({ isDarkMode = false }) {
  const [activeTab, setActiveTab] = useState(0); 

  // --- GLOBAL FILTERS ---
  const [selectedTahun, setSelectedTahun] = useState("All");
  const [selectedBulan, setSelectedBulan] = useState("All");
  const [selectedNegeri, setSelectedNegeri] = useState("All");
  const [selectedDaerah, setSelectedDaerah] = useState("All");
  const [selectedKomoditi, setSelectedKomoditi] = useState("Semua Komoditi");

  const [chartViewMode, setChartViewMode] = useState('yearly');
  const [mapToggle, setMapToggle] = useState('eksport'); 
  const [pasaranToggle, setPasaranToggle] = useState('Negeri'); 

  const handleGlobalReset = () => {
    setSelectedTahun("All");
    setSelectedBulan("All");
    setSelectedNegeri("All");
    setSelectedDaerah("All");
    setSelectedKomoditi("Semua Komoditi");
    setMapToggle('eksport');
    setChartViewMode('yearly');
    setPasaranToggle('Negeri');
  };

  const isCili = selectedKomoditi === 'Cili';
  const isTembikai = selectedKomoditi === 'Tembikai';
  const isKubis = selectedKomoditi === 'Kubis';

  // --- MOCK DATA ENGINE (PERMINTAAN) ---
  const data = useMemo(() => {
    let baseEksportRM = 11234567890.00;
    let baseEksportMT = 5123456.78;
    let basePenggunaanMT = 4890123.45;
    let basePenggunaanRM = 12560888200.00; 

    if (isTembikai) {
      baseEksportRM = 80000000.00; baseEksportMT = 45000; basePenggunaanMT = 150000; basePenggunaanRM = 170000000;
    } else if (isCili) {
      baseEksportRM = 45000000.00; baseEksportMT = 15000; basePenggunaanMT = 45000; basePenggunaanRM = 210000000;
    } else if (isKubis) {
      baseEksportRM = 60000000.00; baseEksportMT = 25000; basePenggunaanMT = 95000; basePenggunaanRM = 120000000;
    }

    let filterMult = 1.0;
    if (selectedTahun === "2024") filterMult *= 0.85;
    if (selectedTahun === "2025") filterMult *= 1.15;
    if (selectedBulan !== "All") filterMult *= 0.10; 
    if (selectedNegeri !== "All") filterMult *= 0.25; 
    if (selectedDaerah !== "All") filterMult *= 0.15; 

    const nilaiEksportRM = baseEksportRM * filterMult;
    const eksportMT = baseEksportMT * filterMult;
    const penggunaanMT = basePenggunaanMT * filterMult;
    const nilaiPenggunaanRM = basePenggunaanRM * filterMult;

    const jumlahPasaranMT = eksportMT + penggunaanMT;
    const jumlahNilaiPasaranRM = nilaiEksportRM + nilaiPenggunaanRM;

    const months = ['JANUARI', 'FEBRUARI', 'MAC', 'APRIL', 'MEI', 'JUN', 'JULAI', 'OGOS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DISEMBER'];
    const pFactors = [0.85, 0.90, 1.10, 1.05, 1.15, 0.95, 1.00, 0.90, 1.05, 1.10, 0.95, 1.00];
    const eFactors = [0.95, 1.00, 0.85, 0.90, 1.10, 1.05, 0.95, 1.00, 1.15, 0.90, 1.05, 1.10];
    
    const monthlyData = months.map((m, i) => ({
        month: m,
        penggunaan: (penggunaanMT / 12) * pFactors[i],
        eksport: (eksportMT / 12) * eFactors[i]
    }));

    const activeNegeriName = selectedNegeri !== 'All' ? selectedNegeri.toUpperCase() : 'NEGERI';
    const mockPenggunaanNegeri = [
      { lokasi: "SELANGOR", qty: 448330.37 * filterMult, pct: 15.97 },
      { lokasi: "W.P. KUALA LUMPUR", qty: 344200.26 * filterMult, pct: 12.99 },
      { lokasi: "JOHOR", qty: 338025.87 * filterMult, pct: 11.81 },
      { lokasi: "PULAU PINANG", qty: 251022.95 * filterMult, pct: 8.32 },
      { lokasi: "PERAK", qty: 141662.47 * filterMult, pct: 5.05 }
    ];
    const mockPenggunaanDaerah = [
      { lokasi: `${activeNegeriName} - DAERAH UTAMA`, qty: 150000 * filterMult, pct: 45.0 },
      { lokasi: `${activeNegeriName} - DAERAH KEDUA`, qty: 80000 * filterMult, pct: 25.0 },
      { lokasi: `${activeNegeriName} - DAERAH KETIGA`, qty: 50000 * filterMult, pct: 15.0 },
      { lokasi: `${activeNegeriName} - DAERAH KEEMPAT`, qty: 30000 * filterMult, pct: 10.0 },
      { lokasi: `${activeNegeriName} - DAERAH KELIMA`, qty: 15000 * filterMult, pct: 5.0 }
    ];
    const mockPenggunaanSatuDaerah = [ { lokasi: `${activeNegeriName} - ${selectedDaerah.toUpperCase()}`, qty: 150000 * filterMult, pct: 100.0 } ];

    const top5Penggunaan = selectedDaerah !== "All" ? mockPenggunaanSatuDaerah : selectedNegeri !== "All" ? mockPenggunaanDaerah : mockPenggunaanNegeri;

    return {
      filterMultiplier: filterMult, 
      kpi: { nilaiEksportRM, nilaiPenggunaanRM, jumlahNilaiPasaranRM, eksportMT, penggunaanMT, jumlahPasaranMT },
      transport: { darat: 24.50, laut: 70.20, udara: 5.30 },
      segmen: { isirumah: 65.4, hospitaliti: 22.1, kilang: 12.5 },
      top5Eksport: [
        { negara: "SINGAPURA", qty: 950000.11 * filterMult, qtyPct: 28.55, nilai: 4100164920.00 * filterMult },
        { negara: "CHINA", qty: 450909.03 * filterMult, qtyPct: 15.74, nilai: 1035406930.00 * filterMult },
        { negara: "JEPUN", qty: 380615.19 * filterMult, qtyPct: 11.91, nilai: 898069908.00 * filterMult },
        { negara: "BRUNEI", qty: 159309.98 * filterMult, qtyPct: 5.73, nilai: 538039200.00 * filterMult },
        { negara: "AUSTRALIA", qty: 111098.62 * filterMult, qtyPct: 3.44, nilai: 359478031.00 * filterMult }
      ],
      top5Penggunaan, 
      pasaranGlobal: [
        { lokasi: "SINGAPURA", qty: 45000 * filterMult, pct: 40.5 }, { lokasi: "CHINA", qty: 30000 * filterMult, pct: 27.0 },
        { lokasi: "JEPUN", qty: 15000 * filterMult, pct: 13.5 }, { lokasi: "THAILAND", qty: 12000 * filterMult, pct: 10.8 }, { lokasi: "BRUNEI", qty: 9000 * filterMult, pct: 8.2 }
      ],
      pasaranNegeriList: [
        { lokasi: "SELANGOR", qty: 85000 * filterMult, pct: 35.0 }, { lokasi: "W.P. KUALA LUMPUR", qty: 65000 * filterMult, pct: 26.8 },
        { lokasi: "JOHOR", qty: 45000 * filterMult, pct: 18.5 }, { lokasi: "PULAU PINANG", qty: 25000 * filterMult, pct: 10.3 }, { lokasi: "PERAK", qty: 22000 * filterMult, pct: 9.4 }
      ],
      pasaranDaerahList: [
        { lokasi: "SELANGOR - PETALING", qty: 40000 * filterMult, pct: 25.5 }, { lokasi: "W.P. KUALA LUMPUR", qty: 35000 * filterMult, pct: 22.3 },
        { lokasi: "JOHOR - JOHOR BAHRU", qty: 30000 * filterMult, pct: 19.1 }, { lokasi: "SELANGOR - KLANG", qty: 28000 * filterMult, pct: 17.8 }, { lokasi: "SELANGOR - HULU LANGAT", qty: 24000 * filterMult, pct: 15.3 }
      ],
      saluranPasaran: [
        { name: 'Luar Negeri', value: 54.23 }, { name: 'Dalam Daerah', value: 29.09 }, { name: 'Luar Daerah', value: 10.86 },
        { name: 'Luar Negara', value: 3.13 }, { name: 'Dalam Negeri', value: 2.69 }
      ],
      yearlyChart: { 
        y2024: { 
          penggunaan: 4595402.94 * filterMult * (selectedTahun === "All" || selectedTahun === "2024" ? 1 : 0), 
          eksport: 4730994.27 * filterMult * (selectedTahun === "All" || selectedTahun === "2024" ? 1 : 0) 
        }, 
        y2025: { 
          penggunaan: 4890123.45 * filterMult * (selectedTahun === "All" || selectedTahun === "2025" ? 1 : 0), 
          eksport: 5123456.78 * filterMult * (selectedTahun === "All" || selectedTahun === "2025" ? 1 : 0) 
        } 
      },
      monthlyChart: monthlyData,
      eksportPelabuhan: [
        { pelabuhan: 'KEDAH CHECKPOINT', pct: 0.55 }, { pelabuhan: 'JOHOR CHECKPOINT', pct: 0.62 },
        { pelabuhan: 'TANJUNG PELEPAS PORT', pct: 0.66 }, { pelabuhan: 'PERLIS LAND BORDER', pct: 1.67 },
        { pelabuhan: 'RANTAU PANJANG', pct: 2.32 }, { pelabuhan: 'PASIR GUDANG', pct: 2.65 },
        { pelabuhan: 'PENANG PORT', pct: 3.70 }, { pelabuhan: 'BUKIT KAYU HITAM', pct: 9.08 },
        { pelabuhan: 'BATU PAHAT', pct: 21.89 }, { pelabuhan: 'PORT KLANG', pct: 55.55 }
      ],
      eksportTableDetails: [
        { komoditi: 'KELAPA', negara: 'SINGAPURA', qty: 555658.33 * filterMult, rm: 663313283.80 * filterMult, negeri: 'JOHOR', pelabuhan: 'BATU PAHAT', jenis: 'LAUT' },
        { komoditi: 'BAWANG', negara: 'CHINA', qty: 360176.36 * filterMult, rm: 586472174.69 * filterMult, negeri: 'SELANGOR', pelabuhan: 'PORT KLANG', jenis: 'LAUT' },
        { komoditi: 'KUBIS', negara: 'JEPUN', qty: 233073.20 * filterMult, rm: 319251703.45 * filterMult, negeri: 'SELANGOR', pelabuhan: 'PORT KLANG', jenis: 'LAUT' },
        { komoditi: 'CILI', negara: 'THAILAND', qty: 89648.05 * filterMult, rm: 279427251.40 * filterMult, negeri: 'KEDAH', pelabuhan: 'BUKIT KAYU HITAM', jenis: 'DARAT' }
      ]
    };
  }, [selectedTahun, selectedBulan, selectedKomoditi, isCili, isTembikai, selectedNegeri, selectedDaerah]); 

  // --- VARIABLES RE-ADDED FOR TAB 1 ---
  const top5Pasaran = pasaranToggle === 'Global' ? data.pasaranGlobal : pasaranToggle === 'Negeri' ? data.pasaranNegeriList : data.pasaranDaerahList;

  const funnelOption = {
    backgroundColor: 'transparent', tooltip: { trigger: 'item', formatter: '{b} : {c}%' },
    series: [
      { name: 'Saluran Pasaran', type: 'funnel', left: '35%', width: '50%', top: '5%', bottom: '5%', minSize: '10%', maxSize: '100%', sort: 'descending', gap: 2, label: { show: true, position: 'inside', formatter: '{c}%', color: '#fff', fontWeight: 'bold', fontSize: 10 }, labelLine: { show: false }, itemStyle: { color: '#8b5cf6', borderColor: isDarkMode ? '#1e293b' : '#fff', borderWidth: 1 }, data: data.saluranPasaran },
      { type: 'funnel', left: '35%', width: '50%', top: '5%', bottom: '5%', minSize: '10%', maxSize: '100%', sort: 'descending', gap: 2, zlevel: 2, itemStyle: { color: 'transparent', borderColor: 'transparent' }, label: { show: true, position: 'left', formatter: '{b}', color: isDarkMode ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: 'bold' }, labelLine: { show: false }, data: data.saluranPasaran }
    ]
  };
  // ------------------------------------

  // --- ECHARTS: MODERNIZED OPTIONS ---
  const ssrPercentage = data.kpi.jumlahPasaranMT > 0 ? (data.kpi.penggunaanMT / data.kpi.jumlahPasaranMT) * 100 : 0;
  const gaugeChartOption = {
    backgroundColor: 'transparent',
    series: [{
        type: 'gauge', startAngle: 180, endAngle: 0, center: ['50%', '85%'], radius: '140%', min: 0, max: 100,
        axisLine: { lineStyle: { width: 14, color: [[ssrPercentage / 100, '#3b82f6'], [1, '#f97316']] } },
        pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        detail: { formatter: (v) => `{a|${v.toFixed(1)}%}\n{b|Syer Penggunaan}`, rich: { a: { fontSize: 18, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#1e293b' }, b: { fontSize: 9, fontWeight: 'bold', color: isDarkMode ? '#94a3b8' : '#64748b', padding: [5,0,0,0] } }, offsetCenter: [0, '-10%'] },
        data: [{ value: ssrPercentage }]
    }]
  };

  const barChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['JUMLAH PENGGUNAAN (MT)', 'JUMLAH EKSPORT (MT)'], icon: 'circle', textStyle: { color: isDarkMode ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: '600' }, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '5%', top: '25%', containLabel: true },
    xAxis: { 
        type: 'category', data: chartViewMode === 'yearly' ? ['2024', '2025'] : data.monthlyChart.map(m => m.month),
        axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold', fontSize: chartViewMode === 'yearly' ? 12 : 9 },
        axisLine: { lineStyle: { color: isDarkMode ? '#334155' : '#cbd5e1' } },
        axisTick: { show: false } 
    },
    yAxis: { 
      type: 'value', 
      axisLabel: { color: isDarkMode ? '#94a3b8' : '#94a3b8', formatter: (val) => `${(val / 1000000).toFixed(1)}M` }, 
      splitLine: { lineStyle: { color: isDarkMode ? '#1e293b' : '#f1f5f9', type: 'dashed' } } 
    },
    series: [
      { name: 'JUMLAH PENGGUNAAN (MT)', type: 'bar', barWidth: chartViewMode === 'yearly' ? '20%' : '35%', data: chartViewMode === 'yearly' ? [data.yearlyChart.y2024.penggunaan, data.yearlyChart.y2025.penggunaan] : data.monthlyChart.map(m => m.penggunaan), itemStyle: { color: '#3b82f6', borderRadius: [6, 6, 0, 0] }, label: { show: chartViewMode === 'yearly', position: 'top', formatter: (p) => p.value > 0 ? (p.value/1000000).toFixed(2) + 'M' : '', fontSize: 10, color: '#3b82f6', fontWeight: 'bold' } },
      { name: 'JUMLAH EKSPORT (MT)', type: 'bar', barWidth: chartViewMode === 'yearly' ? '20%' : '35%', data: chartViewMode === 'yearly' ? [data.yearlyChart.y2024.eksport, data.yearlyChart.y2025.eksport] : data.monthlyChart.map(m => m.eksport), itemStyle: { color: '#f97316', borderRadius: [6, 6, 0, 0] }, label: { show: chartViewMode === 'yearly', position: 'top', formatter: (p) => p.value > 0 ? (p.value/1000000).toFixed(2) + 'M' : '', fontSize: 10, color: '#f97316', fontWeight: 'bold' } }
    ]
  };

  const portBarOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '15%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: { 
      type: 'category', 
      data: data.eksportPelabuhan.map(s => s.pelabuhan),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: isDarkMode ? '#cbd5e1' : '#64748b', fontWeight: 'bold', fontSize: 9 }
    },
    series: [{
      type: 'bar', data: data.eksportPelabuhan.map(s => s.pct), itemStyle: { color: '#3b82f6', borderRadius: [0, 6, 6, 0] }, barWidth: '50%',
      label: { show: true, position: 'right', formatter: '{c}%', color: isDarkMode ? '#cbd5e1' : '#475569', fontSize: 10, fontWeight: 'bold' }
    }]
  };

  // Modern Component Builder for Progress Tables
  const renderProgressTable = (title, columns, tableData, valKey, pctKey, showRM = true) => (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
        <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[400px]">
          <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 font-bold">{columns[0]}</th>
              {showRM && <th className="py-3 px-4 text-right font-bold">{columns[1]}</th>}
              <th className="py-3 px-4 text-right font-bold">{columns[2]}</th>
              <th className="py-3 px-4 text-right font-bold">{columns[3]}</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {tableData.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{row.negara || row.lokasi}</td>
                {showRM && <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">{row.nilai?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>}
                <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">{row[valKey]?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-3">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{row[pctKey]?.toFixed(2)}%</span>
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row[pctKey]}%` }}></div>
                      </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 h-full w-full relative bg-slate-50 dark:bg-slate-900 p-2 md:p-6 rounded-xl">
      <style>{`@keyframes scroll-left { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } } .animate-scroll { display: inline-block; white-space: nowrap; animation: scroll-left 20s linear infinite; }`}</style>

      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 flex items-center justify-center font-black rounded-xl shadow-sm text-xs">LOGO</div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{activeTab === 0 ? "EKSPORT & PENGGUNAAN" : activeTab === 1 ? "PENGGUNAAN" : "PEMANTAUAN EKSPORT"}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Prestasi Keseluruhan Rantaian Permintaan</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          {['UTAMA', 'PENGGUNAAN', 'EKSPORT'].map((tab, idx) => (
            <button key={idx} onClick={() => setActiveTab(idx)} className={`flex-1 md:flex-none py-1.5 px-4 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all ${activeTab === idx ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{tab}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
        
        {/* FILTERS */}
        <div className="flex flex-col md:flex-row gap-2 items-end">
          <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 w-full bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            {[
              { label: 'TAHUN', val: selectedTahun, set: setSelectedTahun, options: ['All', '2024', '2025'] },
              { label: 'BULAN', val: selectedBulan, set: setSelectedBulan, options: ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
              { label: 'NEGERI', val: selectedNegeri, set: setSelectedNegeri, options: ['All', 'Johor', 'Pahang', 'Kelantan', 'Perak', 'Selangor', 'Sabah'] },
              { label: 'DAERAH', val: selectedDaerah, set: setSelectedDaerah, options: ['All', 'Batu Pahat', 'Kluang', 'Tangkak', 'Cameron Highlands', 'Sabak Bernam'] },
              { label: 'KOMODITI', val: selectedKomoditi, set: setSelectedKomoditi, options: ['Semua Komoditi', 'Cili', 'Kubis', 'Tembikai'] }
            ].map((f, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">{f.label}</label>
                <select value={f.val} onChange={(e) => f.set(e.target.value)} className="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all">
                  {f.options ? f.options.map(o => <option key={o} value={o}>{o}</option>) : <option value="All">All</option>}
                </select>
              </div>
            ))}
          </div>
          <button onClick={handleGlobalReset} className="shrink-0 h-[60px] w-[60px] bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center transition-all shadow-sm text-slate-400 hover:text-red-500"><RotateCcw className="w-5 h-5" /></button>
        </div>

        {/* MODERN KPI CARDS (2 ROWS + 1 GAUGE) */}
        <div className="flex flex-col lg:flex-row gap-4">
            
            {/* Gauge on the Left */}
            <div className="w-full lg:w-56 xl:w-64 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center p-4 relative shrink-0">
                <h3 className="absolute top-4 left-0 w-full text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest z-10">Nisbah Pasaran</h3>
                <div className="flex-1 w-full mt-6"><ReactECharts option={gaugeChartOption} style={{ height: '100%', width: '100%' }} notMerge={true} /></div>
            </div>

            {/* KPI Rows on the Right */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Row 1: RM KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: "NILAI EKSPORT (RM)", val: data.kpi.nilaiEksportRM, icon: Wallet, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
                        { title: "NILAI PENGGUNAAN (RM)", val: data.kpi.nilaiPenggunaanRM, icon: Banknote, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
                        { title: "JUMLAH NILAI (RM)", val: data.kpi.jumlahNilaiPasaranRM, icon: Landmark, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" }
                    ].map((kpi, i) => (
                        <div key={`rm-${i}`} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kpi.bg} ${kpi.color}`}><kpi.icon className="w-4 h-4" /></div>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                            </div>
                            <span className={`text-lg md:text-xl font-black ${kpi.color}`}>{kpi.val ? (kpi.val/1000000).toFixed(2) + 'M' : "0.00"}</span>
                        </div>
                    ))}
                </div>

                {/* Row 2: MT KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: "KUANTITI EKSPORT (MT)", val: data.kpi.eksportMT, icon: Package, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30" },
                        { title: "KUANTITI PENGGUNAAN (MT)", val: data.kpi.penggunaanMT, icon: Box, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30" },
                        { title: "JUMLAH KUANTITI (MT)", val: data.kpi.jumlahPasaranMT, icon: Layers, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" }
                    ].map((kpi, i) => (
                        <div key={`mt-${i}`} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kpi.bg} ${kpi.color}`}><kpi.icon className="w-4 h-4" /></div>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                            </div>
                            <span className={`text-lg md:text-xl font-black ${kpi.color}`}>{kpi.val ? (kpi.val/1000).toFixed(1) + 'k' : "0.0"}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* MODERN BAR CHART, TRANSPORT & SEGMEN */}
        <div className="flex flex-col md:flex-row gap-4 h-[300px]">
          
          <div className="flex-[0.35] flex flex-col gap-3">
             <div className="bg-white dark:bg-slate-800 py-3 px-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"><span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">EKSPORT (MOD)</span></div>
             <div className="flex-1 flex flex-col gap-3">
                {[{ icon: Truck, label: "DARAT", val: `${data.transport.darat}%` }, { icon: Ship, label: "LAUT", val: `${data.transport.laut}%` }, { icon: Plane, label: "UDARA", val: `${data.transport.udara}%` }].map((t, i) => (
                  <div key={i} className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center p-3 transition-colors hover:border-blue-200">
                     <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-500 mr-3 border border-slate-100 dark:border-slate-600"><t.icon className="w-4 h-4" /></div>
                     <div className="flex flex-col flex-1">
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.label}</span>
                       <span className="text-sm md:text-base font-black text-slate-700 dark:text-slate-200">{t.val}</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="flex-[1.25] bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col p-4 relative">
            <div className="flex justify-between items-center mb-2 z-10">
                <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2"><BarChart4 className="w-4 h-4 text-emerald-500"/> PENGGUNAAN VS EKSPORT (MT)</h3>
                <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-100 dark:border-slate-700">
                    <button onClick={() => setChartViewMode('yearly')} className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${chartViewMode === 'yearly' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>TAHUNAN</button>
                    <button onClick={() => setChartViewMode('monthly')} className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${chartViewMode === 'monthly' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>BULANAN</button>
                </div>
            </div>
            <div className="flex-1 w-full"><ReactECharts option={barChartOption} style={{ height: '100%', width: '100%' }} notMerge={true} /></div>
          </div>

          <div className="flex-[0.4] flex flex-col gap-3">
             <div className="bg-white dark:bg-slate-800 py-3 px-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"><span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">SEGMEN</span></div>
             <div className="flex-1 flex flex-col gap-3">
                {[
                  { icon: Home, label: "ISI RUMAH", val: `${data.segmen.isirumah}%`, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
                  { icon: Hotel, label: "HOSPITALITI", val: `${data.segmen.hospitaliti}%`, color: "text-orange-600 dark:text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/30" },
                  { icon: Building2, label: "KILANG", val: `${data.segmen.kilang}%`, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" }
                ].map((s, i) => (
                  <div key={i} className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center p-3">
                     <div className={`p-2 rounded-lg mr-3 ${s.bg} ${s.color}`}>
                       <s.icon className="w-4 h-4" />
                     </div>
                     <div className="flex flex-col">
                       <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">{s.label}</span>
                       <span className={`text-sm md:text-base font-black ${s.color}`}>{s.val}</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* SUB TAB 0: UTAMA (KESELURUHAN) MAP & TABLES                               */}
        {/* ========================================================================= */}
        {activeTab === 0 && (
          <>
            <div className="flex flex-col md:flex-row gap-4">
              {renderProgressTable("5 NEGARA UTAMA EKSPORT", ["Negara", "Nilai (RM)", "Kuantiti (MT)", "% Syer"], data.top5Eksport, "qty", "qtyPct")}
              {renderProgressTable("5 LOKASI UTAMA PENGGUNAAN", ["Negeri", null, "Kuantiti (MT)", "% Syer"], data.top5Penggunaan, "qty", "pct", false)}
            </div>

            <div className="h-[450px] min-h-[450px] w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col p-2">
                <div className="absolute top-4 left-4 z-20 flex bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-100 shadow-sm backdrop-blur">
                  <button onClick={() => setMapToggle('eksport')} className={`text-[10px] font-bold uppercase px-4 py-2 rounded-lg transition-all ${mapToggle === 'eksport' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-slate-500 hover:bg-slate-50'}`}>Aliran Eksport</button>
                  <button onClick={() => setMapToggle('penggunaan')} className={`text-[10px] font-bold uppercase px-4 py-2 rounded-lg transition-all ${mapToggle === 'penggunaan' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-500 hover:bg-slate-50'}`}>Peta Penggunaan</button>
                </div>
                
                <div className="w-full h-full relative mt-12 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                  {mapToggle === 'eksport' ? (
                    <MalaysiaFlowMap selectedCommodity={selectedKomoditi === "Semua Komoditi" ? "" : selectedKomoditi.toLowerCase()} selectedYear={selectedTahun === "All" ? "2024" : selectedTahun} forceMode="eksport" filterMultiplier={data.filterMultiplier} />
                  ) : (
                    <MalaysiaPenggunaanMap selectedCommodity={selectedKomoditi === "Semua Komoditi" ? "" : selectedKomoditi.toLowerCase()} selectedYear={selectedTahun === "All" ? "2024" : selectedTahun} selectedNegeri={selectedNegeri} isDarkMode={isDarkMode} filterMultiplier={data.filterMultiplier} />
                  )}
                </div>
            </div>
          </>
        )}

        {/* --- SUB TAB 1: PENGGUNAAN --- */}
        {activeTab === 1 && (
          <div className="flex flex-col gap-4">
             <div className="flex flex-col md:flex-row gap-4">
              {renderProgressTable("5 LOKASI UTAMA PENGGUNAAN", ["Lokasi", "", "Kuantiti (MT)", "% Syer"], data.top5Penggunaan, "qty", "pct", false)}

              <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center relative z-10">
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">5 LOKASI UTAMA DIPASARKAN</span>
                  <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-100 dark:border-slate-700">
                      <button onClick={() => setPasaranToggle('Global')} className={`px-2 py-1 rounded-md text-[8px] font-bold transition-all ${pasaranToggle === 'Global' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>GLOBAL</button>
                      <button onClick={() => setPasaranToggle('Negeri')} className={`px-2 py-1 rounded-md text-[8px] font-bold transition-all ${pasaranToggle === 'Negeri' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>NEGERI</button>
                      <button onClick={() => setPasaranToggle('Daerah')} className={`px-2 py-1 rounded-md text-[8px] font-bold transition-all ${pasaranToggle === 'Daerah' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>DAERAH</button>
                  </div>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse min-w-[400px]">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[9px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 font-bold">{pasaranToggle === 'Global' ? 'Negara' : pasaranToggle === 'Negeri' ? 'Negeri' : 'Negeri - Daerah'}</th>
                        <th className="py-3 px-4 text-right font-bold">Pasaran (MT)</th>
                        <th className="py-3 px-4 text-right font-bold">% Syer</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {top5Pasaran.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{row.lokasi}</td>
                          <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">{row.qty.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-3">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{row.pct.toFixed(2)}%</span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.pct}%` }}></div>
                                </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 min-h-[400px]">
              <div className="flex-[0.4] bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm flex flex-col">
                <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-center mb-2">SALURAN PASARAN</h3>
                <div className="flex-1 w-full"><ReactECharts option={funnelOption} style={{ height: '100%', width: '100%' }} notMerge={true} /></div>
              </div>
              <div className="flex-[1.6] bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-2 shadow-sm relative overflow-hidden flex flex-col min-h-[400px]">
                <div className="flex-1 relative w-full h-full bg-slate-50/50 dark:bg-slate-900/50 rounded-xl">
                  <MalaysiaPenggunaanMap selectedCommodity={selectedKomoditi === "Semua Komoditi" ? "" : selectedKomoditi.toLowerCase()} selectedYear={selectedTahun === "All" ? "2024" : selectedTahun} selectedNegeri={selectedNegeri} isDarkMode={isDarkMode} filterMultiplier={data.filterMultiplier} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SUB TAB 2: PEMANTAUAN EKSPORT --- */}
        {activeTab === 2 && (
          <div className="flex flex-col gap-4">
             <div className="flex flex-col lg:flex-row gap-4 h-[450px]">
                <div className="flex-[0.6] bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm flex flex-col">
                  <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-center mb-2">EKSPORT (MT) MENGIKUT PELABUHAN</h3>
                  <div className="flex-1 w-full"><ReactECharts option={portBarOption} style={{ height: '100%', width: '100%' }} notMerge={true} /></div>
                </div>

                <div className="flex-[1.4] bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-2 shadow-sm relative overflow-hidden flex flex-col">
                    <div className="w-full h-full relative bg-slate-50/50 dark:bg-slate-900/50 rounded-xl overflow-hidden">
                        <MalaysiaFlowMap selectedCommodity={selectedKomoditi === "Semua Komoditi" ? "" : selectedKomoditi.toLowerCase()} selectedYear={selectedTahun === "All" ? "2024" : selectedTahun} forceMode="eksport" showTransportToggle={true} filterMultiplier={data.filterMultiplier} />
                    </div>
                </div>
             </div>

             <div className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-50 dark:border-slate-700/50"><h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">BUTIRAN TRANSAKSI EKSPORT</h3></div>
                <div className="overflow-x-auto flex-1 p-2">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[9px] uppercase tracking-wider rounded-lg">
                      <tr>
                        <th className="p-3 font-bold rounded-l-lg">KOMODITI</th>
                        <th className="p-3 font-bold">NEGARA ASAL</th>
                        <th className="p-3 text-right font-bold">KUANTITI (MT) ▼</th>
                        <th className="p-3 text-right font-bold">NILAI (RM)</th>
                        <th className="p-3 font-bold">NEGERI PELABUHAN</th>
                        <th className="p-3 font-bold">PELABUHAN</th>
                        <th className="p-3 font-bold rounded-r-lg">JENIS</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {data.eksportTableDetails.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-bold text-slate-700 dark:text-slate-300 uppercase">{row.komoditi}</td>
                          <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{row.negara}</td>
                          <td className="p-3 text-right font-bold text-slate-800 dark:text-white">{row.qty.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="p-3 text-right font-medium text-slate-600 dark:text-slate-400">{row.rm.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{row.negeri}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{row.pelabuhan}</td>
                          <td className="p-3"><span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[9px] font-bold">{row.jenis}</span></td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50/50 dark:bg-emerald-900/10 font-bold border-t-2 border-emerald-100 dark:border-emerald-800/30">
                        <td className="p-3 text-emerald-700 dark:text-emerald-400" colSpan="2">JUMLAH</td>
                        <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 text-sm">{(2549409.24 * data.filterMultiplier).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 text-sm">{(6821098907.96 * data.filterMultiplier).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td colSpan="3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        )}

      </div>
    </div>
  );
}