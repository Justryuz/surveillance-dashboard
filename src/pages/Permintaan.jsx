import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Package, Truck, Ship, Plane, Factory as FactoryIcon, MapPin, RotateCcw,
  Wallet, Banknote, Landmark, Box, Layers, BarChart4, Home, Hotel, Building2
} from 'lucide-react';
import MalaysiaFlowMap from '../components/charts/MalaysiaFlowMap';
import MalaysiaPenggunaanMap from '../components/charts/MalaysiaPenggunaanMap';
import SearchableSelect from '../components/common/SearchableSelect';
import { useTradeData } from '../hooks/useTradeData';
import { useDashboardData } from '../hooks/useDashboardData';
import { useGlobalTradeFlow } from '../hooks/useGlobalTradeFlow';
import { useProfilingPengeluar } from '../hooks/useProfilingPengeluar';
import { computeQuantityTotal, computeValueTotal, computeTop5CountriesDetailed, computeCountryTradeStats } from '../lib/tradeAggregation';
import { computeCountryNameMap, standardizeRowsCountryFields } from '../lib/countryStandardization';
import { computeKomoditiNameMap, standardizeRowsKomoditiFields } from '../lib/komoditiStandardization';
import { computeConsumptionTotalKg, computeTop5PenggunaanDetailed, computeConsumptionByState, computeConsumptionByStateDistrict, computeConsumptionSegmentBreakdown } from '../lib/consumptionAggregation';
import { computeProductionByStateDistrict, computeNegeriDaerahTree, computeAllCommodities } from '../lib/productionAggregation';
import { computeRouteSplits, computeTopPorts, computeImportTransactionDetails, computeTopCountryStateFlows } from '../lib/logisticsAggregation';
import { computeYearlyTrendDemand, computeMonthlyTrendDemand } from '../lib/trendAggregation';
import { computeSaluranPasaranFunnel, computeTopMarketCountries, computeTopMarketStates, computeTopMarketDistricts } from '../lib/marketFlowAggregation';
import { computeTopPartners } from '../lib/globalTradeFlowAggregation';
import { computeFormToNegeriMap, computeFormToDaerahMap } from '../lib/profilingAggregation';
import { FLOW_MAP_COUNTRY_KEYWORDS } from '../config/countryKeywords';
import { STATE_DISTRICTS_MAP } from '../config/regions';
import { formatFixed } from '../lib/formatters';
import { computeMtAxis } from '../lib/chartAxis';

// Permintaan's own month filter uses 3-letter English abbreviations as the
// underlying value (matched against BULAN_ABBR_TO_CODE below), unlike the
// mixed Malay/English codes used elsewhere in the app — but is displayed
// with full, uppercased Malay month names for consistency with the rest
// of the filter bar.
const BULAN_ABBR_TO_CODE = {
  Jan: 'jan', Feb: 'feb', Mar: 'mac', Apr: 'apr', May: 'mei', Jun: 'jun',
  Jul: 'jul', Aug: 'ogo', Sep: 'sep', Oct: 'okt', Nov: 'nov', Dec: 'dis',
};
const BULAN_OPTIONS = [
  { value: 'All', label: 'ALL' },
  { value: 'Jan', label: 'JANUARI' }, { value: 'Feb', label: 'FEBRUARI' }, { value: 'Mar', label: 'MAC' },
  { value: 'Apr', label: 'APRIL' }, { value: 'May', label: 'MEI' }, { value: 'Jun', label: 'JUN' },
  { value: 'Jul', label: 'JULAI' }, { value: 'Aug', label: 'OGOS' }, { value: 'Sep', label: 'SEPTEMBER' },
  { value: 'Oct', label: 'OKTOBER' }, { value: 'Nov', label: 'NOVEMBER' }, { value: 'Dec', label: 'DISEMBER' },
];

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

  // --- LIVE DATA FROM GOOGLE SHEET ---
  const { importRows: rawImportRows, exportRows: rawExportRows, loading: tradeLoading, error: tradeError } = useTradeData();
  const {
    PRODUCTION: rawProductionRows,
    CONSUMPTION_BY_STATE: rawConsumptionRows,
    CONSUMPTION_BY_MONTH: rawConsumptionMonthRows,
    MARKET_FLOW: rawMarketFlowRows,
    TRADE_LOGISTIC: tradeLogisticRows,
    REF_PORT: refPortRows,
    REF_COUNTRY: refCountryRows,
    REF_KOMODITI: refKomoditiRows,
    loading: dashboardLoading,
    error: dashboardError,
  } = useDashboardData();
  const { rows: globalTradeFlowRows, loading: globalTradeFlowLoading, error: globalTradeFlowError } = useGlobalTradeFlow();

  // Standardize country names (via REF_COUNTRY) before they're used for
  // any grouping/matching, so different raw spellings of the same country
  // merge correctly instead of being treated as separate countries.
  const countryNameMap = useMemo(() => {
    if (dashboardLoading || dashboardError || refCountryRows.length === 0) return null;
    return computeCountryNameMap(refCountryRows);
  }, [dashboardLoading, dashboardError, refCountryRows]);

  const importRowsCountryStd = useMemo(
    () => standardizeRowsCountryFields(rawImportRows, countryNameMap, ['Negara']),
    [rawImportRows, countryNameMap]
  );
  const exportRowsCountryStd = useMemo(
    () => standardizeRowsCountryFields(rawExportRows, countryNameMap, ['Negara']),
    [rawExportRows, countryNameMap]
  );
  const standardizedTradeLogisticRowsCountryStd = useMemo(
    () => standardizeRowsCountryFields(tradeLogisticRows, countryNameMap, ['ORIGIN_COUNTRY', 'DESTINATION_COUNTRY']),
    [tradeLogisticRows, countryNameMap]
  );
  const globalTradeFlowRowsCountryStd = useMemo(
    () => standardizeRowsCountryFields(globalTradeFlowRows, countryNameMap, ['Reporter', 'Partner']),
    [globalTradeFlowRows, countryNameMap]
  );
  const { rows: profilingRows, loading: profilingLoading, error: profilingError } = useProfilingPengeluar();

  // Standardize commodity names/categories (via REF_KOMODITI), the same
  // way country names are standardized above.
  const komoditiMap = useMemo(() => {
    if (dashboardLoading || dashboardError || refKomoditiRows.length === 0) return null;
    return computeKomoditiNameMap(refKomoditiRows);
  }, [dashboardLoading, dashboardError, refKomoditiRows]);

  const productionRows = useMemo(
    () => standardizeRowsKomoditiFields(rawProductionRows, komoditiMap, 'Standard Jenis Komoditi', 'Kategori Komoditi'),
    [rawProductionRows, komoditiMap]
  );
  const consumptionRows = useMemo(
    () => standardizeRowsKomoditiFields(rawConsumptionRows, komoditiMap, 'Standard Jenis Komoditi', 'Standard Kategori Komoditi'),
    [rawConsumptionRows, komoditiMap]
  );
  const marketFlowRows = useMemo(
    () => standardizeRowsKomoditiFields(rawMarketFlowRows, komoditiMap, 'Jenis_Komoditi', 'Kategori_Komoditi'),
    [rawMarketFlowRows, komoditiMap]
  );
  const importRows = useMemo(
    () => standardizeRowsKomoditiFields(importRowsCountryStd, komoditiMap, 'Standard Jenis Komoditi', 'Kumpulan Barangan'),
    [importRowsCountryStd, komoditiMap]
  );
  const exportRows = useMemo(
    () => standardizeRowsKomoditiFields(exportRowsCountryStd, komoditiMap, 'Standard Jenis Komoditi', 'Kumpulan Barangan'),
    [exportRowsCountryStd, komoditiMap]
  );
  const standardizedTradeLogisticRows = useMemo(
    () => standardizeRowsKomoditiFields(standardizedTradeLogisticRowsCountryStd, komoditiMap, 'JENIS_KOMODITI'),
    [standardizedTradeLogisticRowsCountryStd, komoditiMap]
  );
  const standardizedGlobalTradeFlowRows = useMemo(
    () => standardizeRowsKomoditiFields(globalTradeFlowRowsCountryStd, komoditiMap, 'Jenis_Komoditi'),
    [globalTradeFlowRowsCountryStd, komoditiMap]
  );

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

  // Shared filter translations for the real-data aggregations below.
  const commodityKeyword = selectedKomoditi !== 'Semua Komoditi' ? selectedKomoditi : undefined;
  const negeriLabel = selectedNegeri !== 'All' ? selectedNegeri : undefined;
  const daerahLabel = selectedDaerah !== 'All' ? selectedDaerah : undefined;
  const monthCode = selectedBulan !== 'All' ? BULAN_ABBR_TO_CODE[selectedBulan] : undefined;
  const effectiveYear = selectedTahun !== 'All' ? selectedTahun : undefined;

  const productionReady = !dashboardLoading && !dashboardError && productionRows.length > 0;
  const consumptionMonthRows = useMemo(
    () => standardizeRowsKomoditiFields(rawConsumptionMonthRows, komoditiMap, 'Standard Jenis Komoditi', 'Standard Kategori Komoditi'),
    [rawConsumptionMonthRows, komoditiMap]
  );

  const consumptionReady = !dashboardLoading && !dashboardError && consumptionRows.length > 0;
  const tradeReady = !tradeLoading && !tradeError && exportRows.length > 0;
  const logisticsReady = !dashboardLoading && !dashboardError && tradeLogisticRows.length > 0 && refPortRows.length > 0;
  const marketFlowReady = !dashboardLoading && !dashboardError && marketFlowRows.length > 0;
  const profilingReady = !profilingLoading && !profilingError && profilingRows.length > 0;
  const globalTradeFlowReady = !globalTradeFlowLoading && !globalTradeFlowError && globalTradeFlowRows.length > 0;

  // Real filter dropdown options, built from PRODUCTION (same taxonomy is
  // shared across PRODUCTION/CONSUMPTION_BY_STATE/EXPORT).
  const realNegeriDaerahTree = useMemo(() => {
    if (!productionReady) return null;
    return computeNegeriDaerahTree(productionRows, consumptionRows);
  }, [productionReady, productionRows, consumptionRows]);

  const realCommodityList = useMemo(() => {
    if (!productionReady) return null;
    return computeAllCommodities(productionRows);
  }, [productionReady, productionRows]);

  const MOCK_NEGERI_LIST = ['Johor', 'Pahang', 'Kelantan', 'Perak', 'Selangor', 'Sabah'];
  const MOCK_DAERAH_LIST = ['Batu Pahat', 'Kluang', 'Tangkak', 'Cameron Highlands', 'Sabak Bernam'];
  const MOCK_KOMODITI_LIST = ['Cili', 'Kubis', 'Tembikai'];

  const negeriOptions = realNegeriDaerahTree ? realNegeriDaerahTree.negeriList : MOCK_NEGERI_LIST;
  const daerahOptions = realNegeriDaerahTree
    ? (selectedNegeri !== 'All' ? (realNegeriDaerahTree.daerahByNegeri[selectedNegeri] || []) : Object.values(realNegeriDaerahTree.daerahByNegeri).flat().sort())
    : MOCK_DAERAH_LIST;
  const komoditiOptions = realCommodityList || MOCK_KOMODITI_LIST;

  // --- KPI: EXPORT (tab 0/2) ---
  const realEksportMT = useMemo(() => {
    if (!tradeReady) return null;
    return computeQuantityTotal(exportRows, { year: effectiveYear, monthCode, commodityKeyword });
  }, [tradeReady, exportRows, effectiveYear, monthCode, commodityKeyword]);

  const realNilaiEksportRM = useMemo(() => {
    if (!tradeReady) return null;
    return computeValueTotal(exportRows, { year: effectiveYear, monthCode, commodityKeyword });
  }, [tradeReady, exportRows, effectiveYear, monthCode, commodityKeyword]);

  const realTop5Eksport = useMemo(() => {
    if (!tradeReady) return null;
    return computeTop5CountriesDetailed(exportRows, { year: effectiveYear, monthCode, commodityKeyword });
  }, [tradeReady, exportRows, effectiveYear, monthCode, commodityKeyword]);

  // --- KPI: PENGGUNAAN (tab 0/1) ---
  const realPenggunaanTotalKg = useMemo(() => {
    if (!consumptionReady) return null;
    return computeConsumptionTotalKg(consumptionRows, { year: effectiveYear, commodityKeyword, negeriLabel });
  }, [consumptionReady, consumptionRows, effectiveYear, commodityKeyword, negeriLabel]);

  // --- Map data (PRODUCTION) — computed here (ahead of realTop5Penggunaan
  // below) so the table can use the same real per-district production
  // shares the map uses to split a selected state's consumption total.
  const realProductionByStateDistrict = useMemo(() => {
    if (!productionReady) return null;
    return computeProductionByStateDistrict(productionRows, { year: effectiveYear, monthCode, commodityKeyword });
  }, [productionReady, productionRows, effectiveYear, monthCode, commodityKeyword]);

  const realTop5Penggunaan = useMemo(() => {
    if (!consumptionReady) return null;
    // Pass the same real production-by-district data the map uses to
    // spread a selected state's total across its districts, so the "5
    // Lokasi Utama Penggunaan" table and the map agree on each district's
    // figure instead of using two different estimated splits.
    return computeTop5PenggunaanDetailed(consumptionRows, { year: effectiveYear, commodityKeyword, negeriLabel }, negeriLabel, STATE_DISTRICTS_MAP, realProductionByStateDistrict);
  }, [consumptionReady, consumptionRows, effectiveYear, commodityKeyword, negeriLabel, realProductionByStateDistrict]);

  const realSegmen = useMemo(() => {
    if (!consumptionReady) return null;
    return computeConsumptionSegmentBreakdown(consumptionRows, { year: effectiveYear, commodityKeyword, negeriLabel });
  }, [consumptionReady, consumptionRows, effectiveYear, commodityKeyword, negeriLabel]);

  // --- Map data (CONSUMPTION_BY_STATE) ---
  const realConsumptionByState = useMemo(() => {
    if (!consumptionReady) return null;
    return computeConsumptionByState(consumptionRows, { year: effectiveYear, commodityKeyword });
  }, [consumptionReady, consumptionRows, effectiveYear, commodityKeyword]);

  // Per-district Isi Rumah consumption from CONSUMPTION_BY_STATE's district
  // column — real figures that drive Peta Penggunaan - Isi Rumah.
  const realConsumptionByStateDistrict = useMemo(() => {
    if (!consumptionReady) return null;
    return computeConsumptionByStateDistrict(consumptionRows, { year: effectiveYear, commodityKeyword });
  }, [consumptionReady, consumptionRows, effectiveYear, commodityKeyword]);

  // --- Transport split (TRADE_LOGISTIC + REF_PORT, export side) ---
  const realTransportSplit = useMemo(() => {
    if (!logisticsReady) return null;
    const { exportRoutes } = computeRouteSplits(standardizedTradeLogisticRows, refPortRows, { year: effectiveYear, monthCode, commodityKeyword });
    if (!exportRoutes) return null;
    const byName = Object.fromEntries(exportRoutes.map((r) => [r.name.toLowerCase(), r.value]));
    return { darat: byName.darat || 0, laut: byName.laut || 0, udara: byName.udara || 0 };
  }, [logisticsReady, standardizedTradeLogisticRows, refPortRows, effectiveYear, monthCode, commodityKeyword]);

  // --- Yearly/monthly trend (CONSUMPTION_BY_STATE + EXPORT) ---
  const realYearlyTrend = useMemo(() => {
    if (!consumptionReady && !tradeReady) return null;
    return computeYearlyTrendDemand(consumptionRows, exportRows, ['2024', '2025'], { commodityKeyword, categoryKeyword: undefined, negeriLabel, daerahLabel }, consumptionMonthRows);
  }, [consumptionReady, tradeReady, consumptionRows, consumptionMonthRows, exportRows, commodityKeyword, negeriLabel, daerahLabel]);

  const realMonthlyTrend = useMemo(() => {
    if (!consumptionReady && !tradeReady) return null;
    return computeMonthlyTrendDemand(consumptionRows, exportRows, effectiveYear || '2025', { commodityKeyword, categoryKeyword: undefined, negeriLabel, daerahLabel }, consumptionMonthRows);
  }, [consumptionReady, tradeReady, consumptionRows, consumptionMonthRows, exportRows, effectiveYear, commodityKeyword, negeriLabel, daerahLabel]);

  // --- Real per-country stats + supply chain for the MalaysiaFlowMap toggle ---
  const realCountryStats = useMemo(() => {
    if (!tradeReady) return null;
    return computeCountryTradeStats(importRows, exportRows, { year: effectiveYear, monthCode, commodityKeyword }, FLOW_MAP_COUNTRY_KEYWORDS);
  }, [tradeReady, importRows, exportRows, effectiveYear, monthCode, commodityKeyword]);

  // Top-10 real export partners for Malaysia (this page has no map
  // country-selection, so the anchor is always Malaysia).
  const realTopExportPartners = useMemo(() => {
    if (!globalTradeFlowReady || !commodityKeyword) return null;
    return computeTopPartners(standardizedGlobalTradeFlowRows, { year: effectiveYear, commodity: commodityKeyword, reporter: 'Malaysia', tradeType: 'Export', limit: 10 });
  }, [globalTradeFlowReady, standardizedGlobalTradeFlowRows, effectiveYear, commodityKeyword]);

  // --- Market flow (MARKET_FLOW + PROFILING_PENGELUAR for real producer-state join) ---
  const formToNegeriMap = useMemo(() => {
    if (!profilingReady) return null;
    return computeFormToNegeriMap(profilingRows);
  }, [profilingReady, profilingRows]);

  const formToDaerahMap = useMemo(() => {
    if (!profilingReady) return null;
    return computeFormToDaerahMap(profilingRows);
  }, [profilingReady, profilingRows]);

  const marketFlowFilters = { year: effectiveYear, commodityKeyword, categoryKeyword: undefined, producerNegeriLabel: negeriLabel, formToNegeriMap, producerDaerahLabel: daerahLabel, formToDaerahMap };

  const realSaluranPasaran = useMemo(() => {
    if (!marketFlowReady) return null;
    return computeSaluranPasaranFunnel(marketFlowRows, marketFlowFilters);
  }, [marketFlowReady, marketFlowRows, effectiveYear, commodityKeyword, negeriLabel, formToNegeriMap, daerahLabel, formToDaerahMap]);

  const realPasaranGlobal = useMemo(() => {
    if (!marketFlowReady) return null;
    return computeTopMarketCountries(marketFlowRows, marketFlowFilters, 5);
  }, [marketFlowReady, marketFlowRows, effectiveYear, commodityKeyword, negeriLabel, formToNegeriMap, daerahLabel, formToDaerahMap]);

  const realPasaranNegeriList = useMemo(() => {
    if (!marketFlowReady) return null;
    return computeTopMarketStates(marketFlowRows, marketFlowFilters, 5);
  }, [marketFlowReady, marketFlowRows, effectiveYear, commodityKeyword, negeriLabel, formToNegeriMap, daerahLabel, formToDaerahMap]);

  const realPasaranDaerahList = useMemo(() => {
    if (!marketFlowReady) return null;
    return computeTopMarketDistricts(marketFlowRows, marketFlowFilters, 5);
  }, [marketFlowReady, marketFlowRows, effectiveYear, commodityKeyword, negeriLabel, formToNegeriMap, daerahLabel, formToDaerahMap]);

  // --- Tab 2: Pemantauan Eksport (TRADE_LOGISTIC + REF_PORT, export side) ---
  const realEksportPelabuhan = useMemo(() => {
    if (!logisticsReady) return null;
    return computeTopPorts(standardizedTradeLogisticRows, refPortRows, { year: effectiveYear, monthCode, commodityKeyword }, 10, 'EXPORT');
  }, [logisticsReady, standardizedTradeLogisticRows, refPortRows, effectiveYear, monthCode, commodityKeyword]);

  const realEksportTransactionDetails = useMemo(() => {
    if (!logisticsReady) return null;
    return computeImportTransactionDetails(standardizedTradeLogisticRows, refPortRows, { year: effectiveYear, monthCode, commodityKeyword }, 20, 'EXPORT');
  }, [logisticsReady, standardizedTradeLogisticRows, refPortRows, effectiveYear, monthCode, commodityKeyword]);

  // --- MERGE: real sheet-derived values are used wherever available.
  // Nothing here has a fabricated fallback number any more — a KPI whose
  // sheet isn't ready is null (rendered as "–" in the KPI cards below);
  // everything else falls back to the same real-empty shape (0 / [] /
  // zeroed object) the code already uses for a genuine real zero-result.
  // nilaiPenggunaanRM has no real source at all (CONSUMPTION_BY_STATE has
  // no RM column) so it's always null/"–" until a source exists. ---
  const data = useMemo(() => {
    const eksportMT = tradeReady ? Math.round(realEksportMT ?? 0) : null;
    const nilaiEksportRM = tradeReady ? (realNilaiEksportRM ?? 0) : null;
    const penggunaanMT = consumptionReady ? (realPenggunaanTotalKg ?? 0) / 1000 : null;
    const nilaiPenggunaanRM = null; // CONSUMPTION_BY_STATE has no RM column — no real source yet
    const jumlahPasaranMT = (consumptionReady || tradeReady) ? Math.round((eksportMT ?? 0) + (penggunaanMT ?? 0)) : null;
    // "Jumlah Nilai" is meant to be eksport + penggunaan RM combined; since
    // penggunaan RM has no real source at all, a partial sum would be
    // mislabeled as a total, so this stays "–" rather than showing half a
    // number under a "Jumlah" (total) label.
    const jumlahNilaiPasaranRM = null;

    return {
      kpi: { nilaiEksportRM, nilaiPenggunaanRM, jumlahNilaiPasaranRM, eksportMT, penggunaanMT, jumlahPasaranMT },
      transport: logisticsReady ? (realTransportSplit ?? { darat: 0, laut: 0, udara: 0 }) : { darat: 0, laut: 0, udara: 0 },
      segmen: consumptionReady ? (realSegmen ?? { isirumah: 0, hospitaliti: 0, kilang: 0, isirumahMT: 0, hospitalitiMT: 0, kilangMT: 0 }) : { isirumah: 0, hospitaliti: 0, kilang: 0, isirumahMT: 0, hospitalitiMT: 0, kilangMT: 0 },
      top5Eksport: tradeReady ? (realTop5Eksport ?? []) : [],
      top5Penggunaan: consumptionReady ? (realTop5Penggunaan ?? []) : [],
      yearlyChart: (consumptionReady || tradeReady) ? (realYearlyTrend ?? { y2024: { penggunaan: 0, eksport: 0 }, y2025: { penggunaan: 0, eksport: 0 } }) : { y2024: { penggunaan: 0, eksport: 0 }, y2025: { penggunaan: 0, eksport: 0 } },
      monthlyChart: (consumptionReady || tradeReady) ? (realMonthlyTrend ?? []) : [],
      saluranPasaran: marketFlowReady ? (realSaluranPasaran ?? []) : [],
      pasaranGlobal: marketFlowReady ? (realPasaranGlobal ?? []) : [],
      pasaranNegeriList: marketFlowReady ? (realPasaranNegeriList ?? []) : [],
      pasaranDaerahList: marketFlowReady ? (realPasaranDaerahList ?? []) : [],
      eksportPelabuhan: logisticsReady ? (realEksportPelabuhan ?? []) : [],
      eksportTableDetails: logisticsReady ? (realEksportTransactionDetails ? realEksportTransactionDetails.rows : []) : [],
      eksportTableTotals: logisticsReady
        ? { qty: realEksportTransactionDetails?.totalQty ?? 0, rm: realEksportTransactionDetails?.totalRM ?? 0 }
        : { qty: 0, rm: 0 },
      liveFlags: {
        eksport: tradeReady,
        penggunaan: consumptionReady,
        transport: logisticsReady,
        top5Eksport: tradeReady,
        top5Penggunaan: consumptionReady,
        trend: consumptionReady || tradeReady,
        pasaran: marketFlowReady,
        eksportDetail: logisticsReady,
      },
    };
  }, [
    tradeReady, consumptionReady, logisticsReady, marketFlowReady,
    realEksportMT, realNilaiEksportRM, realPenggunaanTotalKg, realTransportSplit, realSegmen,
    realTop5Eksport, realTop5Penggunaan, realYearlyTrend, realMonthlyTrend,
    realSaluranPasaran, realPasaranGlobal, realPasaranNegeriList, realPasaranDaerahList,
    realEksportPelabuhan, realEksportTransactionDetails,
  ]);

  // --- VARIABLES RE-ADDED FOR TAB 1 ---
  const top5Pasaran = pasaranToggle === 'Global' ? data.pasaranGlobal : pasaranToggle === 'Negeri' ? data.pasaranNegeriList : data.pasaranDaerahList;

  const funnelOption = {
    backgroundColor: 'transparent', tooltip: { trigger: 'item', formatter: (p) => `${p.name} : ${formatFixed(p.value, 2)}%` },
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
        type: 'gauge', startAngle: 180, endAngle: 0, center: ['50%', '72%'], radius: '105%', min: 0, max: 100,
        axisLine: { lineStyle: { width: 14, color: [[ssrPercentage / 100, '#3b82f6'], [1, '#f97316']] } },
        pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        detail: { formatter: (v) => `{a|${v.toFixed(1)}%}\n{b|Syer Penggunaan}`, rich: { a: { fontSize: 18, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#1e293b' }, b: { fontSize: 9, fontWeight: 'bold', color: isDarkMode ? '#94a3b8' : '#64748b', padding: [5,0,0,0] } }, offsetCenter: [0, '-18%'] },
        data: [{ value: ssrPercentage }]
    }]
  };

  const mtAxis = computeMtAxis(chartViewMode === 'yearly'
    ? [data.yearlyChart.y2024.penggunaan, data.yearlyChart.y2025.penggunaan, data.yearlyChart.y2024.eksport, data.yearlyChart.y2025.eksport]
    : data.monthlyChart.flatMap((m) => [m.penggunaan, m.eksport]));

  const barChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => formatFixed(v, 2) },
    legend: { data: ['JUMLAH PENGGUNAAN (MT)', 'JUMLAH EKSPORT (MT)'], icon: 'circle', textStyle: { color: isDarkMode ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: '600' }, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '5%', top: '25%', containLabel: true },
    xAxis: { 
        type: 'category', data: chartViewMode === 'yearly' ? ['2024', '2025'] : data.monthlyChart.map(m => m.month),
        axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold', fontSize: chartViewMode === 'yearly' ? 12 : 9 },
        axisLine: { lineStyle: { color: isDarkMode ? '#334155' : '#cbd5e1' } },
        axisTick: { show: false } 
    },
    yAxis: { 
      type: 'value', min: 0, max: mtAxis.max, interval: mtAxis.interval,
      axisLabel: { color: isDarkMode ? '#94a3b8' : '#94a3b8', formatter: mtAxis.axisLabel }, 
      splitLine: { lineStyle: { color: isDarkMode ? '#1e293b' : '#f1f5f9', type: 'dashed' } } 
    },
    series: [
      { name: 'JUMLAH PENGGUNAAN (MT)', type: 'bar', barWidth: chartViewMode === 'yearly' ? '20%' : '35%', data: chartViewMode === 'yearly' ? [data.yearlyChart.y2024.penggunaan, data.yearlyChart.y2025.penggunaan] : data.monthlyChart.map(m => m.penggunaan), itemStyle: { color: '#3b82f6', borderRadius: [6, 6, 0, 0] }, label: { show: chartViewMode === 'yearly', position: 'top', formatter: (p) => mtAxis.valueLabel(p.value), fontSize: 10, color: '#3b82f6', fontWeight: 'bold' } },
      { name: 'JUMLAH EKSPORT (MT)', type: 'bar', barWidth: chartViewMode === 'yearly' ? '20%' : '35%', data: chartViewMode === 'yearly' ? [data.yearlyChart.y2024.eksport, data.yearlyChart.y2025.eksport] : data.monthlyChart.map(m => m.eksport), itemStyle: { color: '#f97316', borderRadius: [6, 6, 0, 0] }, label: { show: chartViewMode === 'yearly', position: 'top', formatter: (p) => mtAxis.valueLabel(p.value), fontSize: 10, color: '#f97316', fontWeight: 'bold' } }
    ]
  };

  const portBarOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => formatFixed(v, 2) + '%' },
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
            {(dashboardLoading || tradeLoading) && <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 animate-pulse mt-0.5">Memuatkan data...</p>}
            {(dashboardError || tradeError) && <p className="text-[9px] font-bold uppercase tracking-wider text-red-500 mt-0.5" title={dashboardError || tradeError}>Sebahagian data sheet tidak disambung</p>}
            {!dashboardLoading && !tradeLoading && !dashboardError && !tradeError && (data.liveFlags.eksport || data.liveFlags.penggunaan) && <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 mt-0.5">● Data Langsung</p>}
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
              { label: 'TAHUN', val: selectedTahun, set: setSelectedTahun, options: ['All', '2024', '2025'], searchable: false },
              { label: 'BULAN', val: selectedBulan, set: setSelectedBulan, options: BULAN_OPTIONS, searchable: false },
              { label: 'NEGERI', val: selectedNegeri, set: (v) => { setSelectedNegeri(v); setSelectedDaerah('All'); }, options: [{ value: 'All', label: 'ALL' }, ...negeriOptions.map((n) => ({ value: n, label: n.toUpperCase() }))] },
              { label: 'DAERAH', val: selectedDaerah, set: setSelectedDaerah, options: [{ value: 'All', label: 'ALL' }, ...daerahOptions.map((d) => ({ value: d, label: d.toUpperCase() }))] },
              { label: 'KOMODITI', val: selectedKomoditi, set: setSelectedKomoditi, options: [{ value: 'Semua Komoditi', label: 'SEMUA KOMODITI' }, ...komoditiOptions.map((k) => ({ value: k, label: k.toUpperCase() }))] }
            ].map((f, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">{f.label}</label>
                <SearchableSelect
                  value={f.val}
                  onChange={f.set}
                  options={f.options || ['All']}
                  searchable={f.searchable !== false}
                  triggerClassName="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
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
                        { title: "NILAI EKSPORT (RM)", source: "SUMBER DATA: KPKM", val: data.kpi.nilaiEksportRM, icon: Wallet, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
                        { title: "NILAI PENGGUNAAN - ISI RUMAH (RM)", val: data.kpi.nilaiPenggunaanRM, icon: Banknote, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
                        { title: "JUMLAH NILAI (RM)", val: data.kpi.jumlahNilaiPasaranRM, icon: Landmark, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" }
                    ].map((kpi, i) => (
                        <div key={`rm-${i}`} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kpi.bg} ${kpi.color}`}><kpi.icon className="w-4 h-4" /></div>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                            </div>
                            <span className={`text-lg md:text-xl font-black ${kpi.color}`}>{kpi.val != null ? formatFixed(kpi.val/1000000, 2) + 'M' : "–"}</span>
                            {kpi.source && <span className="mt-1 text-[8px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider">{kpi.source}</span>}
                        </div>
                    ))}
                </div>

                {/* Row 2: MT KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: "KUANTITI EKSPORT (MT)", source: "SUMBER DATA: KPKM", val: data.kpi.eksportMT, icon: Package, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30" },
                        { title: "KUANTITI PENGGUNAAN - ISI RUMAH (MT)", val: data.kpi.penggunaanMT, icon: Box, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30" },
                        { title: "JUMLAH KUANTITI (MT)", val: data.kpi.jumlahPasaranMT, icon: Layers, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" }
                    ].map((kpi, i) => (
                        <div key={`mt-${i}`} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kpi.bg} ${kpi.color}`}><kpi.icon className="w-4 h-4" /></div>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                            </div>
                            <span className={`text-lg md:text-xl font-black ${kpi.color}`}>{kpi.val != null ? formatFixed(kpi.val/1000, 1) + 'k' : "–"}</span>
                            {kpi.source && <span className="mt-1 text-[8px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider">{kpi.source}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* MODERN BAR CHART, TRANSPORT & SEGMEN */}
        <div className="flex flex-col md:flex-row gap-4 h-[300px]">
          
          <div className="flex-[0.35] flex flex-col gap-3">
             <div className="bg-white dark:bg-slate-800 py-3 px-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2"><span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">EKSPORT</span><span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider">SUMBER DATA: DATA KASTAM</span></div>
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
             <div className="bg-white dark:bg-slate-800 py-2.5 px-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-1 shrink-0">
               <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">SEGMEN PENGGUNAAN DOMESTIK</span>
               <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase leading-tight">Jumlah Penggunaan (Isi Rumah + Hospitaliti + Kilang)</span>
               <span className="text-base md:text-lg font-black leading-tight text-emerald-600 dark:text-emerald-400">
                 {formatFixed((data.segmen.isirumahMT ?? 0) + (data.segmen.hospitalitiMT ?? 0) + (data.segmen.kilangMT ?? 0), 2)} <span className="text-[10px] font-bold opacity-70">MT</span>
               </span>
             </div>
             <div className="flex-1 min-h-0 flex flex-col gap-2">
                {[
                  { icon: Home, label: "ISI RUMAH", val: `${data.segmen.isirumah}%`, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
                  { icon: Hotel, label: "HOSPITALITI", val: `${data.segmen.hospitaliti}%`, color: "text-orange-600 dark:text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/30" },
                  { icon: Building2, label: "KILANG", val: `${data.segmen.kilang}%`, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" }
                ].map((s, i) => (
                  <div key={i} className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center px-3 py-1.5">
                     <div className={`p-1.5 rounded-lg mr-3 ${s.bg} ${s.color}`}>
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
              {renderProgressTable("5 LOKASI UTAMA PENGGUNAAN (ISI RUMAH)", ["Negeri", null, "Kuantiti (MT)", "% Syer"], data.top5Penggunaan, "qty", "pct", false)}
            </div>

            <div className="h-[450px] min-h-[450px] w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col p-2">
                <div className="absolute top-4 left-4 z-20 flex bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-100 shadow-sm backdrop-blur">
                  <button onClick={() => setMapToggle('eksport')} className={`text-[10px] font-bold uppercase px-4 py-2 rounded-lg transition-all ${mapToggle === 'eksport' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-slate-500 hover:bg-slate-50'}`}>Aliran Eksport</button>
                  <button onClick={() => setMapToggle('penggunaan')} className={`text-[10px] font-bold uppercase px-4 py-2 rounded-lg transition-all ${mapToggle === 'penggunaan' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-500 hover:bg-slate-50'}`}>Peta Penggunaan - Isi Rumah</button>
                </div>
                
                <div className="w-full h-full relative mt-12 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                  {mapToggle === 'eksport' ? (
                    <MalaysiaFlowMap selectedCommodity={selectedKomoditi === "Semua Komoditi" ? "" : selectedKomoditi.toLowerCase()} selectedYear={selectedTahun === "All" ? "2024" : selectedTahun} forceMode="eksport" filterMultiplier={data.filterMultiplier} realCountryStats={realCountryStats} flowAnchorCountry="MALAYSIA" realTopExportPartners={realTopExportPartners} />
                  ) : (
                    <MalaysiaPenggunaanMap selectedCommodity={selectedKomoditi === "Semua Komoditi" ? "" : selectedKomoditi.toLowerCase()} selectedYear={selectedTahun === "All" ? "2024" : selectedTahun} selectedNegeri={selectedNegeri} isDarkMode={isDarkMode} filterMultiplier={data.filterMultiplier} realConsumptionByState={realConsumptionByState} realConsumptionByStateDistrict={realConsumptionByStateDistrict} realProductionByStateDistrict={realProductionByStateDistrict} />
                  )}
                </div>
            </div>
          </>
        )}

        {/* --- SUB TAB 1: PENGGUNAAN --- */}
        {activeTab === 1 && (
          <div className="flex flex-col gap-4">
             <div className="flex flex-col md:flex-row gap-4">
              {renderProgressTable("5 LOKASI UTAMA PENGGUNAAN (ISI RUMAH)", ["Lokasi", "", "Kuantiti (MT)", "% Syer"], data.top5Penggunaan, "qty", "pct", false)}

              <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center relative z-10">
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">5 PASARAN UTAMA DIPASARKAN</span>
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
                  <MalaysiaPenggunaanMap selectedCommodity={selectedKomoditi === "Semua Komoditi" ? "" : selectedKomoditi.toLowerCase()} selectedYear={selectedTahun === "All" ? "2024" : selectedTahun} selectedNegeri={selectedNegeri} isDarkMode={isDarkMode} filterMultiplier={data.filterMultiplier} realConsumptionByState={realConsumptionByState} realConsumptionByStateDistrict={realConsumptionByStateDistrict} realProductionByStateDistrict={realProductionByStateDistrict} />
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
                  <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-center">EKSPORT (MT) MENGIKUT PELABUHAN</h3>
                  <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider text-center mb-2">SUMBER DATA: DATA KASTAM</span>
                  <div className="flex-1 w-full"><ReactECharts option={portBarOption} style={{ height: '100%', width: '100%' }} notMerge={true} /></div>
                </div>

                <div className="flex-[1.4] bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-2 shadow-sm relative overflow-hidden flex flex-col">
                    <div className="w-full h-full relative bg-slate-50/50 dark:bg-slate-900/50 rounded-xl overflow-hidden">
                        <MalaysiaFlowMap selectedCommodity={selectedKomoditi === "Semua Komoditi" ? "" : selectedKomoditi.toLowerCase()} selectedYear={selectedTahun === "All" ? "2024" : selectedTahun} forceMode="eksport" showTransportToggle={true} filterMultiplier={data.filterMultiplier} realCountryStats={realCountryStats} flowAnchorCountry="MALAYSIA" realTopExportPartners={realTopExportPartners} />
                    </div>
                </div>
             </div>

             <div className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between gap-2"><h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">BUTIRAN TRANSAKSI EKSPORT</h3><span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider">SUMBER DATA: DATA KASTAM</span></div>
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
                        <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 text-sm">{data.eksportTableTotals.qty.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 text-sm">{data.eksportTableTotals.rm.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
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