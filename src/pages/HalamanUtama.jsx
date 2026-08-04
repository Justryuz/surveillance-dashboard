import React, { useState, useMemo } from 'react';
import { 
  Globe, Factory, Store, AlertTriangle, CheckCircle2, 
  ChevronLeft, ChevronRight, XCircle, Home, Utensils, Factory as FactoryIcon, MapPin, Map, ArrowRightFromLine, Package, TrendingUp
} from 'lucide-react';
import MarketPieChart from '../components/charts/MarketPieChart';
import MalaysiaFlowMap from '../components/charts/MalaysiaFlowMap';
import MalaysiaChoroplethMap from '../components/charts/MalaysiaChoroplethMap';
import TradeDonutChart from '../components/charts/TradeDonutChart';

export default function HalamanUtama({ isDarkMode = false }) {
  const [currentView, setCurrentView] = useState(0); 
  const handlePrev = () => setCurrentView((prev) => (prev === 0 ? 1 : prev - 1));
  const handleNext = () => setCurrentView((prev) => (prev === 1 ? 0 : prev + 1));
  const viewTitles = ["Insight Perdagangan", "Insight Pembekalan"];

  // --- FILTERS ---
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedNegeri, setSelectedNegeri] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState("");
  
  // Map States
  const [mapViewMode, setMapViewMode] = useState('state');
  const [selectedRegion, setSelectedRegion] = useState(null); 
  const [selectedCountry, setSelectedCountry] = useState(null); 

  // --- TOP-LEVEL SCOPED COMMODITY BOOLEANS ---
  const isCili = selectedCommodity === 'cili';
  const isTembikai = selectedCommodity === 'tembikai';
  const isKubis = selectedCommodity === 'kubis';

  // --- MOCK DATABASE ENGINE ---
  const dashboardData = useMemo(() => {
    // Base Values
    let baseBekalan = 1500000; 
    let basePasaran = 1400000;
    
    // Sub-metric splits
    let basePengeluaran = 1200000;
    let importQty = 300000;
    let penggunaanQty = 1050000;
    let eksportQty = 350000;

    let pDalam = 35, pLuar = 30, pNegeri = 20, pEksport = 15;

    if (isTembikai) {
      baseBekalan = 165000; basePasaran = 150000; 
      basePengeluaran = 130000; importQty = 35000;
      penggunaanQty = 115000; eksportQty = 35000;
      pDalam = 45; pLuar = 35; pNegeri = 15; pEksport = 5;
    } else if (isCili) {
      baseBekalan = 55000; basePasaran = 75000; 
      basePengeluaran = 20000; importQty = 35000;
      penggunaanQty = 70000; eksportQty = 5000;
      pDalam = 60; pLuar = 30; pNegeri = 10; pEksport = 0; 
    } else if (isKubis) {
      baseBekalan = 110000; basePasaran = 105000; 
      basePengeluaran = 75000; importQty = 35000;
      penggunaanQty = 95000; eksportQty = 10000;
      pDalam = 20; pLuar = 40; pNegeri = 30; pEksport = 10;
    }

    const yearMult = selectedYear === "2024" ? 0.85 : 1.0;
    const monthMult = selectedMonth ? 0.085 : 1.0;
    const negeriMult = selectedNegeri ? 0.25 : 1.0;
    const filterMult = yearMult * monthMult * negeriMult;
    baseBekalan *= filterMult; basePasaran *= filterMult; basePengeluaran *= filterMult;
    importQty *= filterMult; penggunaanQty *= filterMult; eksportQty *= filterMult;

    if (selectedYear === "2024") { pEksport -= 2; pDalam += 2; }

    if (selectedRegion) {
      const hash = selectedRegion.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const shift = (hash % 12) - 6; 
      pDalam += shift; pLuar -= shift; pNegeri += (shift > 0 ? -2 : 2); pEksport += (shift > 0 ? 2 : -2);
    }

    const allStates = ['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'W.P. Kuala Lumpur'];
    let mapData = [];
    if (mapViewMode === 'state') {
      mapData = allStates.map(state => {
        let weight = 0.05; 
        if (isTembikai && ['Kelantan', 'Terengganu'].includes(state)) weight = 0.3;
        else if (isCili && ['Perak', 'Johor', 'Terengganu'].includes(state)) weight = 0.2;
        else if (isKubis && state === 'Pahang') weight = 0.6;
        return { name: state, value: Math.round(baseBekalan * weight) };
      });
    } else {
      const districts = ['Cameron Highlands', 'Ranau', 'Kinta', 'Kluang', 'Besut', 'Pasir Mas', 'Belaga', 'Jerantut', 'Hulu Perak'];
      mapData = districts.map(dist => {
        let weight = 0.02;
        if (isKubis && dist === 'Cameron Highlands') weight = 0.55;
        if (isCili && dist === 'Kinta') weight = 0.15; 
        if (isTembikai && dist === 'Besut') weight = 0.20; 
        return { name: dist, value: Math.round(baseBekalan * weight) };
      });
    }

    // --- DRILL DOWN LOGIC FOR TOP 5 LISTS ---
    let displayTop5Pengeluaran = [];
    let displayTop5Penggunaan = [];
    let top5Level = 'negeri'; 

    // If user clicked a state, drill down into its districts
    if (selectedRegion && allStates.includes(selectedRegion)) {
      top5Level = 'daerah';
      
      const stateDistrictsMap = {
          'Johor': ['Kluang', 'Batu Pahat', 'Muar', 'Segamat', 'Pontian'],
          'Kedah': ['Baling', 'Sik', 'Kota Setar', 'Kuala Muda', 'Kubang Pasu'],
          'Kelantan': ['Pasir Mas', 'Gua Musang', 'Tumpat', 'Tanah Merah', 'Kuala Krai'],
          'Melaka': ['Alor Gajah', 'Jasin', 'Melaka Tengah', 'Ayer Keroh', 'Masjid Tanah'],
          'Negeri Sembilan': ['Jempol', 'Kuala Pilah', 'Tampin', 'Seremban', 'Rembau'],
          'Pahang': ['Cameron Highlands', 'Jerantut', 'Bentong', 'Raub', 'Temerloh'],
          'Perak': ['Kinta', 'Hulu Perak', 'Manjung', 'Batang Padang', 'Hilir Perak'],
          'Perlis': ['Padang Besar', 'Arau', 'Kangar', 'Kaki Bukit', 'Simpang Empat'],
          'Pulau Pinang': ['Seberang Perai Utara', 'S.P. Selatan', 'S.P. Tengah', 'Barat Daya', 'Timur Laut'],
          'Sabah': ['Ranau', 'Kundasang', 'Papar', 'Keningau', 'Tambunan'],
          'Sarawak': ['Belaga', 'Miri', 'Bintulu', 'Kapit', 'Sibu'],
          'Selangor': ['Hulu Langat', 'Kuala Selangor', 'Gombak', 'Klang', 'Sepang'],
          'Terengganu': ['Besut', 'Setiu', 'Hulu Terengganu', 'Dungun', 'Kemaman'],
          'W.P. Kuala Lumpur': ['Kepong', 'Cheras', 'Wangsa Maju', 'Seputeh', 'Setiawangsa']
      };
      
      const localDistricts = stateDistrictsMap[selectedRegion] || ['Daerah 1', 'Daerah 2', 'Daerah 3', 'Daerah 4', 'Daerah 5'];
      
      // Calculate a base value from the state to distribute amongst its districts
      let stateVal = baseBekalan * 0.1; 
      if (mapViewMode === 'state') {
        stateVal = mapData.find(d => d.name === selectedRegion)?.value || stateVal;
      }

      displayTop5Pengeluaran = localDistricts.map((dist, i) => {
        return { name: dist, value: Math.round(stateVal * (0.4 - (i * 0.05))) }; // Spreads value like 40%, 35%, 30%...
      }).sort((a,b) => b.value - a.value);

      displayTop5Penggunaan = localDistricts.map((dist, i) => {
        let hash = dist.charCodeAt(0);
        let shift = (hash % 5) * 0.02;
        return { name: dist, value: Math.round(stateVal * (0.35 - (i * 0.04) + shift)) };
      }).sort((a,b) => b.value - a.value);

    } else {
      // Default: Show Top 5 States
      let stateDataForList = allStates.map(state => {
        let weight = 0.05; 
        if (isTembikai && ['Kelantan', 'Terengganu'].includes(state)) weight = 0.3;
        else if (isCili && ['Perak', 'Johor', 'Terengganu'].includes(state)) weight = 0.2;
        else if (isKubis && state === 'Pahang') weight = 0.6;
        return { name: state, value: Math.round(baseBekalan * weight) };
      });
      
      displayTop5Pengeluaran = [...stateDataForList].sort((a, b) => b.value - a.value).slice(0, 5);
      
      displayTop5Penggunaan = stateDataForList.map(d => {
        let hash = d.name.charCodeAt(0) + d.name.charCodeAt(d.name.length - 1);
        let multiplier = 0.7 + ((hash % 10) / 20); 
        return { name: d.name, value: Math.round(d.value * multiplier) };
      }).sort((a, b) => b.value - a.value).slice(0, 5);
    }
    // ----------------------------------------

    const importRoutes = isCili ? [{ value: 45, name: 'Laut' }, { value: 50, name: 'Darat' }, { value: 5, name: 'Udara' }] : isTembikai ? [{ value: 80, name: 'Laut' }, { value: 15, name: 'Darat' }, { value: 5, name: 'Udara' }] : [{ value: 65, name: 'Laut' }, { value: 25, name: 'Darat' }, { value: 10, name: 'Udara' }];
    const exportRoutes = isCili ? [{ value: 30, name: 'Laut' }, { value: 65, name: 'Darat' }, { value: 5, name: 'Udara' }] : isTembikai ? [{ value: 85, name: 'Laut' }, { value: 10, name: 'Darat' }, { value: 5, name: 'Udara' }] : [{ value: 80, name: 'Laut' }, { value: 15, name: 'Udara' }, { value: 5, name: 'Darat' }];

    const countryView = selectedCountry && selectedCountry !== 'MALAYSIA' ? selectedCountry : 'MALAYSIA';
    let globalTradeStats = {};

    if (countryView === 'MALAYSIA') {
      globalTradeStats = {
        perspective: 'MALAYSIA', countryName: 'Malaysia',
        import: {
          total: (isCili ? 24.5 : isTembikai ? 18.2 : isKubis ? 35.4 : 125.4) * yearMult,
          top5: [
            { rank: 1, name: isCili ? 'Thailand' : 'Amerika Syarikat', value: (isCili ? 12.8 : 24.5) * yearMult, percent: 52.2 },
            { rank: 2, name: 'China', value: (isCili ? 4.2 : 18.2) * yearMult, percent: 17.1 },
            { rank: 3, name: isCili ? 'Vietnam' : 'Jerman', value: (isCili ? 3.1 : 12.1) * yearMult, percent: 12.6 },
            { rank: 4, name: 'Jepun', value: (isCili ? 2.5 : 9.5) * yearMult, percent: 10.2 },
            { rank: 5, name: 'Singapura', value: (isCili ? 1.8 : 7.2) * yearMult, percent: 7.9 }
          ],
          others: { value: (isCili ? 0.1 : 1.4) * yearMult, percent: 2.0 }
        },
        export: {
          total: (isCili ? 25.1 : isTembikai ? 19.0 : isKubis ? 32.1 : 130.2) * yearMult,
          top5: [
            { rank: 1, name: isCili ? 'Singapura' : 'China', value: (isCili ? 14.1 : 28.5) * yearMult, percent: 56.1 },
            { rank: 2, name: isTembikai ? 'Jepun' : 'Sepanyol', value: (isCili ? 4.8 : 15.4) * yearMult, percent: 19.1 },
            { rank: 3, name: 'Belanda', value: (isCili ? 3.5 : 11.2) * yearMult, percent: 13.9 },
            { rank: 4, name: 'Mexico', value: (isCili ? 2.8 : 8.5) * yearMult, percent: 11.1 },
            { rank: 5, name: 'Thailand', value: (isCili ? 1.9 : 7.1) * yearMult, percent: 7.5 }
          ],
          others: { value: (isCili ? 0.1 : 1.2) * yearMult, percent: 2.0 }
        }
      };
    } else {
      const mockMultiplier = (countryView.charCodeAt(0) % 5 + 2) * 10 * yearMult;
      const globalRankImp = (countryView.charCodeAt(0) % 12) + 3;
      const globalRankExp = (countryView.charCodeAt(1) % 12) + 3;

      globalTradeStats = {
        perspective: 'FOREIGN', countryName: countryView, globalRankImp, globalRankExp,
        globalSyerImp: ((countryView.charCodeAt(0) % 6) + 2).toFixed(1) + '%',
        globalSyerExp: ((countryView.charCodeAt(1) % 6) + 2).toFixed(1) + '%',
        import: {
          total: mockMultiplier * 7.5,
          top5: [
            { rank: 1, name: 'China', value: mockMultiplier * 3.1, percent: 41.3 },
            { rank: 2, name: 'Amerika Syarikat', value: mockMultiplier * 1.8, percent: 24.0 },
            { rank: 3, name: 'India', value: mockMultiplier * 1.2, percent: 16.0 },
            { rank: 4, name: 'Australia', value: mockMultiplier * 0.7, percent: 9.3 },
            { rank: 5, name: 'Indonesia', value: mockMultiplier * 0.4, percent: 5.3 }
          ],
          others: { value: mockMultiplier * 0.1, percent: 1.4 },
          malaysiaStanding: { rank: (countryView === 'Singapura' ? 2 : 7), value: mockMultiplier * 0.2, percent: 2.7 }
        },
        export: {
          total: mockMultiplier * 8.2,
          top5: [
            { rank: 1, name: 'Jepun', value: mockMultiplier * 3.4, percent: 41.5 },
            { rank: 2, name: 'Hong Kong', value: mockMultiplier * 2.1, percent: 25.6 },
            { rank: 3, name: 'Vietnam', value: mockMultiplier * 1.3, percent: 15.9 },
            { rank: 4, name: 'Jerman', value: mockMultiplier * 0.8, percent: 9.8 },
            { rank: 5, name: 'Kemboja', value: mockMultiplier * 0.4, percent: 4.9 }
          ],
          others: { value: mockMultiplier * 0.05, percent: 0.6 },
          malaysiaStanding: { rank: (countryView === 'Singapura' ? 1 : 9), value: mockMultiplier * 0.15, percent: 1.8 }
        }
      };
    }

    let utilHousehold = 48, utilHoreca = 22, utilIndustry = 30;
    if (isCili) { utilHousehold = 35; utilHoreca = 45; utilIndustry = 20; }
    if (isKubis) { utilHousehold = 50; utilHoreca = 40; utilIndustry = 10; }
    if (isTembikai) { utilHousehold = 65; utilHoreca = 30; utilIndustry = 5; }

    let originDD = 25, originLD = 20, originLN = 25, originImp = 30;
    let destDD = 20, destLD = 15, destLN = 15, destExp = 50;

    if (isCili) { originDD = 10; originLD = 10; originLN = 20; originImp = 60; destDD = 15; destLD = 10; destLN = 10; destExp = 65; }
    if (isKubis) { originDD = 40; originLD = 25; originLN = 20; originImp = 15; destDD = 25; destLD = 15; destLN = 15; destExp = 45; }
    if (isTembikai) { originDD = 55; originLD = 30; originLN = 10; originImp = 5; destDD = 30; destLD = 20; destLN = 20; destExp = 30; }

    const borongSupply = Math.round(baseBekalan * 0.6); 
    const borongDemand = Math.round(basePasaran * 0.65);

    const calcMT = (pct) => Math.round((borongSupply * pct) / 100).toLocaleString();

    const marketStats = {
      borongSupply, borongDemand, currentJumlahBekalan: borongSupply,
      utilization: { household: utilHousehold, horeca: utilHoreca, industry: utilIndustry },
      flowSplits: {
        origins: { dd: { pct: originDD, val: calcMT(originDD) }, ld: { pct: originLD, val: calcMT(originLD) }, ln: { pct: originLN, val: calcMT(originLN) }, imp: { pct: originImp, val: calcMT(originImp) } },
        destinations: { dd: { pct: destDD, val: calcMT(destDD) }, ld: { pct: destLD, val: calcMT(destLD) }, ln: { pct: destLN, val: calcMT(destLN) }, exp: { pct: destExp, val: calcMT(destExp) } }
      }
    };

    return { 
      bekalan: Math.round(baseBekalan), pasaran: Math.round(basePasaran), 
      pengeluaran: Math.round(basePengeluaran), importQty: Math.round(importQty), 
      penggunaanQty: Math.round(penggunaanQty), eksportQty: Math.round(eksportQty),
      pieData: [Math.abs(pDalam), Math.abs(pLuar), Math.abs(pNegeri), Math.abs(pEksport)],
      mapData, importRoutes, exportRoutes, globalTradeStats, marketStats,
      displayTop5Pengeluaran, displayTop5Penggunaan, top5Level // Exported mapped drill-down data
    };
  }, [selectedYear, selectedMonth, selectedNegeri, selectedCategory, selectedCommodity, mapViewMode, selectedRegion, selectedCountry, isCili, isTembikai, isKubis]);

  const { 
    bekalan: bekalanSemasa, pasaran: pasaranSemasa, 
    pengeluaran: jumlahPengeluaran, importQty, penggunaanQty, eksportQty, 
    pieData, mapData, importRoutes, exportRoutes, globalTradeStats, marketStats, 
    displayTop5Pengeluaran, displayTop5Penggunaan, top5Level 
  } = dashboardData;

  const isSurplus = bekalanSemasa >= pasaranSemasa;
  const isDeficit = pasaranSemasa > bekalanSemasa;
  const diffValue = Math.abs(bekalanSemasa - pasaranSemasa);
  const diffPercent = pasaranSemasa > 0 ? Math.round((diffValue / pasaranSemasa) * 100) : 0; 
  const StatusIcon = isSurplus ? CheckCircle2 : AlertTriangle;
  const statusTitle = isSurplus ? "LEBIHAN BEKALAN" : "KEKURANGAN BEKALAN";
  const statusSubtitle = isSurplus ? `Bekalan mencukupi sebanyak ${diffPercent}%` : `Keperluan bekalan tambahan sebanyak ${diffPercent}%`;
  const statusColor = isSurplus ? "text-emerald-500" : "text-red-500";
  const statusBorder = isSurplus ? "border-emerald-500/50" : "border-red-500/50";
  const statusShadow = isSurplus ? "shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "shadow-[0_0_20px_rgba(239,68,68,0.2)]";
  const bekalanTextColor = isSurplus ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-cyan-400";
  const pasaranTextColor = isDeficit ? "text-red-600 dark:text-red-500" : "text-orange-600 dark:text-orange-400";

  const isBorongStable = marketStats.borongSupply >= marketStats.borongDemand;
  const borongStatusColor = isBorongStable ? "text-emerald-500" : "text-red-500";
  const borongStatusBorder = isBorongStable ? "border-emerald-500/50" : "border-red-500/50";
  const borongStatusBg = isBorongStable ? "bg-emerald-500/10" : "bg-red-500/10";
  const BorongIcon = isBorongStable ? CheckCircle2 : AlertTriangle;

  const TradeRankingCard = ({ title, data, type, themeClass }) => {
    const isMalaysiaMode = globalTradeStats.perspective === 'MALAYSIA';
    const countryLabel = isMalaysiaMode ? "Malaysia" : globalTradeStats.countryName;
    return (
      <div className="flex flex-col bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700/50 p-2 md:p-3 flex-1 h-full w-full min-h-0 shadow-sm transition-all">
        <h4 className={`text-[9px] md:text-[10px] xl:text-xs uppercase tracking-wider mb-1.5 md:mb-2 font-bold border-b border-slate-200 dark:border-slate-700 pb-1 ${themeClass}`}>{isMalaysiaMode ? title : `${title} - ${countryLabel}`}</h4>
        <div className="flex flex-col flex-1 text-[9px] md:text-[10px]">
          <div className="flex text-slate-400 font-semibold mb-1 px-1"><span className="w-4 text-center">#</span><span className="flex-1">Negara</span><span className="w-14 text-right">Nilai (RM)</span><span className="w-9 text-right">Syer</span></div>
          <div className="flex flex-col gap-1 md:gap-1.5">
            {data.top5.map((item) => (
              <div key={item.rank} className="flex items-center px-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded transition-colors"><span className="w-4 text-center font-bold text-slate-500">{item.rank}</span><span className="flex-1 font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</span><span className="w-14 text-right font-bold text-slate-800 dark:text-slate-200">{item.value.toFixed(1)}M</span><span className="w-9 text-right text-slate-500">{item.percent.toFixed(1)}%</span></div>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-700/50 my-0.5"></div>
            {!isMalaysiaMode ? (
              <div className="flex items-center px-1 py-1 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800/50 shadow-sm"><span className="w-4 text-center font-bold text-blue-600 dark:text-cyan-400">{data.malaysiaStanding.rank}</span><span className="flex-1 font-bold text-blue-700 dark:text-blue-300">Kedudukan Malaysia</span><span className="w-14 text-right font-bold text-blue-700 dark:text-blue-300">{data.malaysiaStanding.value.toFixed(1)}M</span><span className="w-9 text-right font-bold text-blue-600 dark:text-cyan-400">{data.malaysiaStanding.percent.toFixed(1)}%</span></div>
            ) : (
              <div className="flex items-center px-1 py-1 opacity-25 italic text-slate-400"><span className="w-4 text-center">-</span><span className="flex-1">Syer Domestik</span><span className="w-14 text-right">-</span><span className="w-9 text-right">-</span></div>
            )}
            <div className="flex items-center px-1 opacity-70"><span className="w-4 text-center text-slate-400">-</span><span className="flex-1 text-slate-600 dark:text-slate-400 italic">Lain-lain Negara</span><span className="w-14 text-right text-slate-600 dark:text-slate-400">{data.others.value.toFixed(1)}M</span><span className="w-9 text-right text-slate-600 dark:text-slate-400">{data.others.percent.toFixed(1)}%</span></div>
            <div className="flex items-center px-1 pt-1 border-t-2 border-slate-300 dark:border-slate-600 mt-0.5"><span className="w-4 text-center"></span><span className="flex-1 font-black text-[9px] md:text-[10px] text-slate-800 dark:text-white uppercase tracking-wider truncate">Dagangan {countryLabel}</span><span className="w-14 text-right font-black text-[9px] md:text-[10px] text-slate-800 dark:text-white">{data.total.toFixed(1)}M</span><span className="w-9 text-right font-black text-[9px] md:text-[10px] text-slate-800 dark:text-white">100%</span></div>
            {!isMalaysiaMode && (
              <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[8px] text-slate-600 dark:text-slate-400 font-bold mt-1 border border-slate-200 dark:border-slate-700"><span className="italic">Kedudukan Pasaran Global:</span><div className="flex gap-2"><span>Rank: #{type === 'import' ? globalTradeStats.globalRankImp : globalTradeStats.globalRankExp}</span><span>Syer Global: {type === 'import' ? globalTradeStats.globalSyerImp : globalTradeStats.globalSyerExp}</span></div></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 h-full w-full relative">
      <div className="shrink-0 flex flex-col items-center justify-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-blue-500/30 rounded-xl p-2 md:p-3 shadow-sm dark:shadow-[0_0_15px_rgba(59,130,246,0.1)]">
        <h2 className="text-lg md:text-xl font-bold text-blue-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-cyan-300 uppercase tracking-widest text-center">PENGAWASAN BEKALAN & PASARAN NASIONAL</h2>
      </div>

      <div className="flex items-center justify-between gap-3 flex-1 min-h-0 mt-1">
        <button onClick={handlePrev} className="shrink-0 p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-blue-500/30 rounded-full text-slate-600 dark:text-blue-400 hover:bg-slate-100 hover:text-blue-600 transition-all"><ChevronLeft className="w-6 h-6 md:w-8 md:h-8" /></button>

        <div className="flex-1 w-full h-full min-h-0 transition-all duration-500">
          
          {/* VIEW 0: INSIGHT PERDAGANGAN */}
          {currentView === 0 && (
            <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-500/20 rounded-xl p-4 md:p-6 shadow-sm dark:shadow-[inset_0_0_30px_rgba(59,130,246,0.1)] animate-in fade-in zoom-in-95 duration-500">
              <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-blue-500/30 pb-3 mb-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded text-blue-600 dark:text-blue-400"><Globe className="w-5 h-5" /></div>
                  <h3 className="font-bold text-base md:text-lg tracking-wider uppercase text-slate-800 dark:text-blue-100">Insight Perdagangan {globalTradeStats.perspective !== 'MALAYSIA' && <span className="text-blue-500">({globalTradeStats.countryName})</span>}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors"><option value="2025">2025</option><option value="2024">2024</option></select>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors"><option value="">Semua Bulan</option><option value="jan">Januari</option><option value="feb">Februari</option><option value="mac">Mac</option><option value="apr">April</option><option value="mei">Mei</option><option value="jun">Jun</option><option value="jul">Julai</option><option value="ogo">Ogos</option><option value="sep">September</option><option value="okt">Oktober</option><option value="nov">November</option><option value="dis">Disember</option></select>
                  <select value={selectedNegeri} onChange={(e) => setSelectedNegeri(e.target.value)} className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors"><option value="">Semua Negeri</option><option value="johor">Johor</option><option value="kedah">Kedah</option><option value="kelantan">Kelantan</option><option value="melaka">Melaka</option><option value="negeri_sembilan">Negeri Sembilan</option><option value="pahang">Pahang</option><option value="perak">Perak</option><option value="perlis">Perlis</option><option value="pulau_pinang">Pulau Pinang</option><option value="sabah">Sabah</option><option value="sarawak">Sarawak</option><option value="selangor">Selangor</option><option value="terengganu">Terengganu</option><option value="kl">W.P. Kuala Lumpur</option></select>
                  <select value={selectedCategory} onChange={(e) => {setSelectedCategory(e.target.value); setSelectedCommodity("");}} className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors"><option value="">Semua Kategori</option><option value="buah">Buah-Buahan</option><option value="sayur">Sayur-Sayuran</option></select>
                  <select value={selectedCommodity} onChange={(e) => setSelectedCommodity(e.target.value)} disabled={!selectedCategory} className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors disabled:opacity-50"><option value="">Semua Komoditi</option>{selectedCategory === "buah" && <option value="tembikai">Tembikai</option>}{selectedCategory === "sayur" && <><option value="cili">Cili</option><option value="kubis">Kubis</option></>}</select>
                </div>
              </div>
              <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-4">
                <div className="flex-[1.1] w-full bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col relative overflow-hidden min-h-0 shadow-sm">
                  <MalaysiaFlowMap selectedCommodity={selectedCommodity} selectedYear={selectedYear} onCountryClick={(country) => setSelectedCountry(country)} onResetMap={() => setSelectedCountry(null)} />
                </div>
                <div className="flex-[0.9] flex flex-col gap-3 min-h-0 h-full">
                  <div className="flex-[1.1] flex gap-3 min-h-0 w-full"><TradeRankingCard title="Sumber Utama (Import)" data={globalTradeStats.import} type="import" themeClass="text-blue-600 dark:text-cyan-400 border-blue-200 dark:border-cyan-800" /><TradeRankingCard title="Pasaran Utama (Eksport)" data={globalTradeStats.export} type="export" themeClass="text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800" /></div>
                  <div className="flex-1 flex gap-3 min-h-0 w-full">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col relative overflow-hidden min-h-0 shadow-sm h-full w-full">
                      <h4 className="flex items-center justify-center gap-2 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold shrink-0"><div className="w-3.5 md:w-20 shrink-0" /><span>NILAI IMPORT</span><div className="w-3.5 h-3.5 md:w-5 md:h-5 rounded-full overflow-hidden shrink-0 shadow-sm border border-slate-200 dark:border-slate-700"><img src="https://flagcdn.com/my.svg" alt="Malaysia" className="w-full h-full object-cover scale-125" /></div></h4>
                      <TradeDonutChart isDarkMode={isDarkMode} colors={['#3b82f6', '#0ea5e9', '#6366f1']} legendPos="left" centerValue={`RM ${isCili ? '24.5' : isTembikai ? '18.2' : isKubis ? '35.4' : '125.4'}M`} centerLabel="NILAI IMPORT" data={importRoutes} />
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col relative overflow-hidden min-h-0 shadow-sm h-full w-full">
                        <h4 className="flex items-center justify-center text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold shrink-0"><div className="flex items-center justify-center gap-2 -translate-x-2 md:-translate-x-10"><span>NILAI EKSPORT</span><div className="w-3.5 h-3.5 md:w-5 md:h-5 rounded-full overflow-hidden shrink-0 shadow-sm border border-slate-200 dark:border-slate-700"><img src="https://flagcdn.com/my.svg" alt="Malaysia" className="w-full h-full object-cover scale-125" /></div></div></h4>
                      <TradeDonutChart isDarkMode={isDarkMode} colors={['#f97316', '#f59e0b', '#ef4444']} legendPos="right" centerValue={`RM ${isCili ? '25.1' : isTembikai ? '19.0' : isKubis ? '32.1' : '130.2'}M`} centerLabel="NILAI EKSPORT" data={exportRoutes} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 1: INSIGHT PEMBEKALAN */}
          {currentView === 1 && (
            <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-500/20 rounded-xl p-4 md:p-6 shadow-sm dark:shadow-[inset_0_0_30px_rgba(16,185,129,0.1)] animate-in fade-in zoom-in-95 duration-500">
              
              <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-emerald-500/30 pb-3 mb-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded text-emerald-600 dark:text-emerald-400"><Factory className="w-5 h-5" /></div>
                  <h3 className="font-bold text-base md:text-lg tracking-wider uppercase text-slate-800 dark:text-emerald-100">Insight Pembekalan {selectedRegion && <span className="text-emerald-500">({selectedRegion})</span>}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer shadow-sm"><option value="2025">2025</option><option value="2024">2024</option></select>
                  <select value={selectedCategory} onChange={(e) => {setSelectedCategory(e.target.value); setSelectedCommodity("");}} className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer shadow-sm"><option value="">Semua Kategori</option><option value="buah">Buah-Buahan</option><option value="sayur">Sayur-Sayuran</option></select>
                  <select value={selectedCommodity} onChange={(e) => setSelectedCommodity(e.target.value)} disabled={!selectedCategory} className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer shadow-sm disabled:opacity-50"><option value="">Semua Komoditi</option>{selectedCategory === "buah" && <option value="tembikai">Tembikai</option>}{selectedCategory === "sayur" && <><option value="cili">Cili</option><option value="kubis">Kubis</option></>}</select>
                </div>
              </div>

              <div className="flex flex-col flex-1 min-h-0 gap-3">
                
                {/* TOP KPI CARDS */}
                <div className="flex gap-4 shrink-0">
                  <div className="flex-[1.2] flex items-center bg-slate-50 dark:bg-slate-950 px-6 py-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                    
                    {/* Left Side: BEKALAN TAHUNAN */}
                    <div className="flex-[1.1] border-r border-slate-200 dark:border-slate-800 pr-6 flex flex-col justify-center">
                      <div className="flex justify-center mb-1">
                        <span className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-extrabold">Bekalan Tahunan</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1 mb-3">
                        <p className={`text-xl md:text-3xl font-black tracking-tight leading-none ${bekalanTextColor}`}>{bekalanSemasa.toLocaleString()}</p>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">MT</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                         <div className="flex flex-col items-center">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Pengeluaran</span>
                           <span className="text-[11px] md:text-sm font-bold text-emerald-600 dark:text-emerald-500">{jumlahPengeluaran.toLocaleString()} <span className="text-[8px] text-emerald-400/70">MT</span></span>
                         </div>
                         <div className="w-px h-6 bg-slate-200 dark:border-slate-800"></div>
                         <div className="flex flex-col items-center">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Import</span>
                           <span className="text-[11px] md:text-sm font-bold text-emerald-600 dark:text-emerald-500">{importQty.toLocaleString()} <span className="text-[8px] text-emerald-400/70">MT</span></span>
                         </div>
                      </div>
                    </div>
                    
                    {/* Right Side: PASARAN */}
                    <div className="flex-[0.9] pl-6 flex flex-col justify-center">
                      <div className="flex justify-center mb-1">
                        <span className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-extrabold">Pasaran</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1 mb-3">
                        <p className={`text-xl md:text-3xl font-black tracking-tight leading-none ${pasaranTextColor}`}>{pasaranSemasa.toLocaleString()}</p>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">MT</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                         <div className="flex flex-col items-center">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Penggunaan</span>
                           <span className="text-[11px] md:text-sm font-bold text-orange-600 dark:text-orange-500">{penggunaanQty.toLocaleString()} <span className="text-[8px] text-orange-400/70">MT</span></span>
                         </div>
                         <div className="w-px h-6 bg-slate-200 dark:border-slate-800"></div>
                         <div className="flex flex-col items-center">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Eksport</span>
                           <span className="text-[11px] md:text-sm font-bold text-orange-600 dark:text-orange-500">{eksportQty.toLocaleString()} <span className="text-[8px] text-orange-400/70">MT</span></span>
                         </div>
                      </div>
                    </div>

                  </div>

                  {/* Status Bar */}
                  <div className={`flex-[1.2] bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border ${statusBorder} flex flex-col justify-center shadow-sm dark:${statusShadow}`}>
                    <div className="flex justify-between items-center w-full mb-1">
                      <div className="flex flex-col">
                        <span className={`font-bold text-sm md:text-base tracking-widest uppercase ${statusColor}`}>{statusTitle}</span>
                        <span className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400 font-medium">{statusSubtitle}</span>
                      </div>
                      <StatusIcon className={`w-8 h-8 md:w-10 h-10 ${statusColor}`} />
                    </div>
                    <div className="w-full mt-2">
                      <div className="flex w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full shadow-inner relative overflow-hidden border border-slate-300/50 dark:border-slate-700/50">
                        <div className="absolute top-0 left-1/2 w-[2px] h-full bg-slate-400 dark:bg-slate-500 z-10 -translate-x-1/2"></div>
                        <div className="w-1/2 h-full flex justify-end">
                          <div className="h-full bg-gradient-to-l from-red-400 to-red-600 transition-all duration-1000" style={{ width: isDeficit ? `${Math.min(diffPercent, 100)}%` : '0%' }}/>
                        </div>
                        <div className="w-1/2 h-full flex justify-start">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000" style={{ width: isSurplus ? `${Math.min(diffPercent, 100)}%` : '0%' }}/>
                        </div>
                      </div>
                      <div className="flex justify-between w-full text-[8px] text-slate-500 dark:text-slate-400 mt-1 font-bold px-1 uppercase tracking-wider">
                        <span>-100% (Kritikal)</span><span className="translate-x-[5%]">0%</span><span>+100% (Lebihan)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM MAP, LISTS, PIE LAYOUT */}
                <div className="flex gap-4 flex-1 min-h-0">
                  
                  {/* Left: Map */}
                  <div className="flex-[1.2] bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col relative overflow-hidden min-h-0 shadow-sm">
                    <MalaysiaChoroplethMap isDarkMode={isDarkMode} mapViewMode={mapViewMode} setMapViewMode={setMapViewMode} mapData={mapData} onRegionClick={(region) => setSelectedRegion(region)} onResetMap={() => setSelectedRegion(null)} selectedRegion={selectedRegion} />
                  </div>

                  {/* NEW CENTER: Top 5 Lists */}
                  <div className="flex-[0.7] flex flex-col gap-3 min-h-0">
                    
                    {/* List 1: Pengeluaran */}
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/50 p-3 flex flex-col min-h-0 shadow-sm">
                      <div className="border-b border-slate-200 dark:border-slate-700/50 pb-1 mb-2">
                        <h4 className="text-[10px] md:text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-500">Pengeluaran Utama</h4>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 uppercase">
                            ({top5Level === 'daerah' ? `Mengikut Daerah di ${selectedRegion}` : 'Mengikut Negeri'})
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1">
                        {displayTop5Pengeluaran.map((item, i) => (
                          <div key={i} className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate pr-2">{i+1}. {item.name}</span>
                              <span className="text-[9px] font-black text-slate-800 dark:text-white shrink-0">{item.value.toLocaleString()} <span className="text-[8px] text-slate-500 font-normal">MT</span></span>
                            </div>
                            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${(item.value / displayTop5Pengeluaran[0].value) * 100}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* List 2: Penggunaan */}
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/50 p-3 flex flex-col min-h-0 shadow-sm">
                      <div className="border-b border-slate-200 dark:border-slate-700/50 pb-1 mb-2">
                        <h4 className="text-[10px] md:text-xs uppercase tracking-wider font-bold text-orange-600 dark:text-orange-500">Penggunaan Utama</h4>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 uppercase">
                            ({top5Level === 'daerah' ? `Mengikut Daerah di ${selectedRegion}` : 'Mengikut Negeri'})
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1">
                        {displayTop5Penggunaan.map((item, i) => (
                          <div key={i} className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate pr-2">{i+1}. {item.name}</span>
                              <span className="text-[9px] font-black text-slate-800 dark:text-white shrink-0">{item.value.toLocaleString()} <span className="text-[8px] text-slate-500 font-normal">MT</span></span>
                            </div>
                            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500" style={{ width: `${(item.value / displayTop5Penggunaan[0].value) * 100}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Pie Chart */}
                  <div className="flex-[0.9] bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col relative overflow-hidden min-h-0 shadow-sm">
                    <MarketPieChart totalPengeluaran={jumlahPengeluaran} unit="MT" isDarkMode={isDarkMode} pieData={pieData} />
                  </div>

                </div>
              </div>
            </div>
          )}
  
        </div>

        <button onClick={handleNext} ><ChevronRight className="w-6 h-6 md:w-8 md:h-8" /></button>
      </div>

      <div className="shrink-0 flex items-center justify-between mt-1 pb-1 px-4 md:px-15">
        <div className="flex flex-col text-[8px] md:text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold"><span>Sumber Data: KPKM | DOA | FAMA | Tridge</span><span>Data Rujukan: Data Perdagangan | Data Pengeluaran | Data Penggunaan | Data KPASM | Data Kajian Profiling | Tridge</span></div>
        <div className="flex gap-3">{[0, 1].map((index) => (<div key={index} onClick={() => setCurrentView(index)} className={`cursor-pointer w-3 h-3 rounded-full transition-all duration-300 ${currentView === index ? 'bg-blue-600 dark:bg-cyan-400 shadow-sm scale-125' : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'}`} title={viewTitles[index]} />))}</div>
      </div>
    </div>
  );
}