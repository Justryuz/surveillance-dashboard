import React, { useState, useMemo, useEffect } from 'react';
import { 
  Globe, Factory, Store, AlertTriangle, CheckCircle2, HelpCircle,
  ChevronLeft, ChevronRight, XCircle, Home, Utensils, Factory as FactoryIcon, MapPin, Map, ArrowRightFromLine, Package, TrendingUp
} from 'lucide-react';
import MarketPieChart from '../components/charts/MarketPieChart';
import MalaysiaFlowMap from '../components/charts/MalaysiaFlowMap';
import MalaysiaChoroplethMap from '../components/charts/MalaysiaChoroplethMap';
import TradeDonutChart from '../components/charts/TradeDonutChart';
import { useTradeData } from '../hooks/useTradeData';
import { useDashboardData } from '../hooks/useDashboardData';
import { useGlobalTradeFlow } from '../hooks/useGlobalTradeFlow';
import { computeGlobalTradeStats, computeQuantityTotal, computeCountryTradeStats } from '../lib/tradeAggregation';
import { computeCountryNameMap, standardizeRowsCountryFields } from '../lib/countryStandardization';
import { computeKomoditiNameMap, standardizeRowsKomoditiFields, computeKomoditiCategoryTree } from '../lib/komoditiStandardization';
import { computeMapData, computeTop5Pengeluaran, computeProductionTotal, computeProductionUnit } from '../lib/productionAggregation';
import { computeTop5Penggunaan, computeConsumptionTotalKg } from '../lib/consumptionAggregation';
import { computePieData } from '../lib/marketFlowAggregation';
import { computeRouteSplits } from '../lib/logisticsAggregation';
import { NEGERI_CODE_TO_LABEL } from '../config/sheetsConfig';
import { FLOW_MAP_COUNTRY_KEYWORDS } from '../config/countryKeywords';
import { computeTopPartners, computeTopGlobalFlows } from '../lib/globalTradeFlowAggregation';
import { toTradeCountryName } from '../config/mapCountryNames';
import SearchableSelect from '../components/common/SearchableSelect';
import { STATE_DISTRICTS_MAP } from '../config/regions';
import { formatFixed } from '../lib/formatters';

// Laut/Darat/Udara colors for the Nilai Import/Eksport donut charts — kept
// identical to the transport colors already used on the flow map (sky
// blue/emerald/orange) so the three routes are clearly distinguishable
// from each other (the old palette was 3 shades of blue for import and 3
// shades of orange/red for export, which was hard to tell apart at a
// glance) and consistent with the rest of the dashboard.
const ROUTE_COLORS = ['#0ea5e9', '#10b981', '#f97316']; // Laut, Darat, Udara

const MONTH_OPTIONS = [
  { value: '', label: 'ALL' },
  { value: 'jan', label: 'JANUARI' }, { value: 'feb', label: 'FEBRUARI' }, { value: 'mac', label: 'MAC' },
  { value: 'apr', label: 'APRIL' }, { value: 'mei', label: 'MEI' }, { value: 'jun', label: 'JUN' },
  { value: 'jul', label: 'JULAI' }, { value: 'ogo', label: 'OGOS' }, { value: 'sep', label: 'SEPTEMBER' },
  { value: 'okt', label: 'OKTOBER' }, { value: 'nov', label: 'NOVEMBER' }, { value: 'dis', label: 'DISEMBER' },
];
const NEGERI_OPTIONS = [
  { value: '', label: 'ALL' },
  ...Object.entries(NEGERI_CODE_TO_LABEL).map(([value, label]) => ({ value, label: label.toUpperCase() })),
];

export default function HalamanUtama({ isDarkMode = false }) {
  // --- LIVE DATA FROM GOOGLE SHEET ---
  // useTradeData -> IMPORT / EXPORT tabs (trade totals + top-5 countries)
  // useDashboardData -> PRODUCTION, CONSUMPTION_BY_STATE, MARKET_FLOW,
  //   TRADE_LOGISTIC, REF_PORT (map, top-5 lists, pie chart, route donuts)
  // Every value below is real — a sheet that's still loading, errored, or
  // has no matching rows renders a "Tiada data" placeholder instead of a
  // fabricated number (see fallbackEngine's comment further down for the
  // couple of pieces that still have no real sheet backing them at all).
  const { importRows: rawImportRows, exportRows: rawExportRows, loading: tradeLoading, error: tradeError } = useTradeData();
  const {
    PRODUCTION: rawProductionRows,
    CONSUMPTION_BY_STATE: rawConsumptionRows,
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
  // (e.g. "CHINA, PEOPLE'S REPUBLIC OF" vs "China") merge correctly
  // instead of being treated as separate countries.
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

  // Standardize commodity names/categories (via REF_KOMODITI) the same way
  // country names are standardized above — so e.g. "Cili Merah"/"Cili
  // Kering" and Halia's cross-tab "Rempah" vs "Sayur Sayuran" category
  // mismatch are resolved once, here, instead of needing loose-matching
  // workarounds in every aggregation function downstream.
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
  // These now do a loose substring check since selectedCommodity holds the
  // real "Jenis Komoditi" text from the sheet (e.g. "Cili Kering"), not a
  // fixed code — only used by fallbackEngine's still-mock marketStats
  // (Pasar Borong) below, which has no real sheet backing it yet.
  const commodityLower = selectedCommodity.toLowerCase();
  const isCili = commodityLower.includes('cili');
  const isTembikai = commodityLower.includes('tembikai');
  const isKubis = commodityLower.includes('kubis');

  // Shared filter values used across every real-data aggregation below.
  // selectedCategory / selectedCommodity are the standardized Kategori /
  // Komoditi text from REF_KOMODITI (see the komoditiCategoryTree memo
  // below), so they're used directly as substring-match keywords rather
  // than looked up from a fixed code list.
  const commodityMalayKeyword = selectedCommodity || undefined;
  const categoryKeyword = selectedCategory || undefined;
  // IMPORT/EXPORT and MARKET_FLOW use an approximate category field
  // ("Kumpulan Barangan" / "Kategori_Komoditi") that can be classified
  // inconsistently with PRODUCTION's own category for the same commodity
  // (e.g. Halia filed under "Sayur-Sayuran" there but "Rempah" here) — so
  // once a specific commodity is picked (already more precise), drop the
  // redundant category filter for those two tabs rather than risk a false
  // zero from a cross-tab labeling mismatch. PRODUCTION/CONSUMPTION_BY_STATE
  // keep the combined filter since their own category field is always
  // internally consistent with their own commodity list.
  const crossTabCategoryKeyword = commodityMalayKeyword ? undefined : categoryKeyword;
  const negeriLabel = selectedNegeri ? NEGERI_CODE_TO_LABEL[selectedNegeri] : undefined;

  // Named readiness flags — a sheet being "ready" means it's loaded and has
  // rows at all, NOT that the current filter combo returned any matches.
  // The merge step below uses these (not null-checks on the real values)
  // to decide mock-vs-real, so a genuinely empty result under a specific
  // filter shows as 0 rather than silently reverting to mock numbers.
  const tradeReady = !tradeLoading && !tradeError && importRows.length > 0;
  const logisticsReady = !dashboardLoading && !dashboardError && tradeLogisticRows.length > 0 && refPortRows.length > 0;
  const marketFlowReady = !dashboardLoading && !dashboardError && marketFlowRows.length > 0;

  // Real Kategori -> Komoditi options for both tabs' filter dropdowns,
  // built straight from REF_KOMODITI itself (its Kategori + Standard
  // Komoditi Name columns) rather than from whatever happens to exist in
  // PRODUCTION or IMPORT/EXPORT individually — REF_KOMODITI is the
  // canonical master list, so both tabs share one consistent option list
  // regardless of which dataset currently has rows for a given commodity.
  // Falls back to a small mock list while REF_KOMODITI is still loading.
  const komoditiCategoryTree = useMemo(() => {
    if (dashboardLoading || dashboardError || refKomoditiRows.length === 0) return null;
    return computeKomoditiCategoryTree(refKomoditiRows);
  }, [refKomoditiRows, dashboardLoading, dashboardError]);

  const MOCK_CATEGORY_TREE = {
    categories: ['Buah-Buahan', 'Sayur-Sayuran'],
    commoditiesByCategory: { 'Buah-Buahan': ['Tembikai'], 'Sayur-Sayuran': ['Cili', 'Kubis'] },
  };
  const activeCategoryTree = komoditiCategoryTree || MOCK_CATEGORY_TREE;
  const commodityOptionsForSelectedCategory = selectedCategory
    ? (activeCategoryTree.commoditiesByCategory[selectedCategory] || [])
    : [];
  // Both tabs share the exact same list — kept as separate names for the
  // trade tab's JSX below so its markup didn't need touching beyond this.
  const activeTradeCategoryTree = activeCategoryTree;
  const tradeCommodityOptionsForSelectedCategory = commodityOptionsForSelectedCategory;

  // If REF_KOMODITI changes (e.g. finishes loading) and the previously
  // selected Kategori/Komoditi turns out not to be in it, clear it rather
  // than leaving a stale selection in place. Filtering by Tahun/Bulan/
  // Negeri no longer prunes this list — REF_KOMODITI is a fixed master
  // list, not scoped to any one dataset's current rows — so a genuinely
  // empty result for a valid commodity under those filters now shows as a
  // real 0, same as it does for any other filter combination.
  useEffect(() => {
    if (!komoditiCategoryTree) return;
    if (selectedCategory && !komoditiCategoryTree.categories.includes(selectedCategory)) {
      setSelectedCategory("");
      setSelectedCommodity("");
      return;
    }
    if (selectedCommodity) {
      const validCommodities = komoditiCategoryTree.commoditiesByCategory[selectedCategory] || [];
      if (!validCommodities.includes(selectedCommodity)) {
        setSelectedCommodity("");
      }
    }
  }, [komoditiCategoryTree]);

  // --- Insight Perdagangan (IMPORT / EXPORT tabs) ---
  const realGlobalTradeStats = useMemo(() => {
    if (tradeLoading || tradeError || importRows.length === 0) return null;
    return computeGlobalTradeStats(importRows, exportRows, {
      year: selectedYear,
      monthCode: selectedMonth || undefined,
      commodityKeyword: commodityMalayKeyword,
      categoryKeyword: crossTabCategoryKeyword,
    });
  }, [importRows, exportRows, tradeLoading, tradeError, selectedYear, selectedMonth, commodityMalayKeyword, crossTabCategoryKeyword]);

  const realImportQty = useMemo(() => {
    if (tradeLoading || tradeError || importRows.length === 0) return null;
    return computeQuantityTotal(importRows, { year: selectedYear, monthCode: selectedMonth || undefined, commodityKeyword: commodityMalayKeyword, categoryKeyword: crossTabCategoryKeyword });
  }, [importRows, tradeLoading, tradeError, selectedYear, selectedMonth, commodityMalayKeyword, crossTabCategoryKeyword]);

  const realExportQty = useMemo(() => {
    if (tradeLoading || tradeError || exportRows.length === 0) return null;
    return computeQuantityTotal(exportRows, { year: selectedYear, monthCode: selectedMonth || undefined, commodityKeyword: commodityMalayKeyword, categoryKeyword: crossTabCategoryKeyword });
  }, [exportRows, tradeLoading, tradeError, selectedYear, selectedMonth, commodityMalayKeyword, crossTabCategoryKeyword]);

  // Real per-country stats for the world flow map (MalaysiaFlowMap) —
  // this map used to generate its own fake per-country numbers from a
  // character-code hash, unrelated to the real top-5 country rankings
  // shown elsewhere on this page. This makes the two consistent.
  const realCountryStats = useMemo(() => {
    if (tradeLoading || tradeError || importRows.length === 0) return null;
    return computeCountryTradeStats(
      importRows, exportRows,
      { year: selectedYear, monthCode: selectedMonth || undefined, commodityKeyword: commodityMalayKeyword, categoryKeyword: crossTabCategoryKeyword },
      FLOW_MAP_COUNTRY_KEYWORDS
    );
  }, [importRows, exportRows, tradeLoading, tradeError, selectedYear, selectedMonth, commodityMalayKeyword, crossTabCategoryKeyword]);

  // --- Real top-10 trade partners (GLOBAL_TRADE_FLOW tab, a separate
  // Google Sheet) for whichever country is currently selected on the map
  // (defaults to Malaysia when nothing is selected). Drives the dashed
  // "Rantaian Bekalan Sebenar" fan-out lines: for Trade Type = Export, the
  // anchor country is the exporter and each partner is a destination it
  // sells this commodity to (e.g. Thailand -> China, Malaysia, Myanmar);
  // for Trade Type = Import, the anchor is the importer and each partner
  // is a source it buys this commodity from.
  const flowAnchorCountry = selectedCountry || 'MALAYSIA';
  const flowAnchorTradeName = toTradeCountryName(flowAnchorCountry);

  const realTopImportPartners = useMemo(() => {
    if (globalTradeFlowLoading || globalTradeFlowError || globalTradeFlowRows.length === 0 || !commodityMalayKeyword) return null;
    return computeTopPartners(standardizedGlobalTradeFlowRows, {
      year: selectedYear, commodity: commodityMalayKeyword, reporter: flowAnchorTradeName, tradeType: 'Import', limit: 10,
    });
  }, [standardizedGlobalTradeFlowRows, globalTradeFlowLoading, globalTradeFlowError, selectedYear, commodityMalayKeyword, flowAnchorTradeName]);

  const realTopExportPartners = useMemo(() => {
    if (globalTradeFlowLoading || globalTradeFlowError || globalTradeFlowRows.length === 0 || !commodityMalayKeyword) return null;
    return computeTopPartners(standardizedGlobalTradeFlowRows, {
      year: selectedYear, commodity: commodityMalayKeyword, reporter: flowAnchorTradeName, tradeType: 'Export', limit: 10,
    });
  }, [standardizedGlobalTradeFlowRows, globalTradeFlowLoading, globalTradeFlowError, selectedYear, commodityMalayKeyword, flowAnchorTradeName]);

  // Worldwide flows for the selected commodity, shown as soon as a
  // commodity is picked — independent of whether a country is clicked on
  // the map. Surfaces real third-country flows like Thailand -> Bangladesh
  // that don't touch Malaysia at all, so the map isn't Malaysia-only by
  // default.
  const realTopGlobalExportFlows = useMemo(() => {
    if (globalTradeFlowLoading || globalTradeFlowError || globalTradeFlowRows.length === 0 || !commodityMalayKeyword) return null;
    return computeTopGlobalFlows(standardizedGlobalTradeFlowRows, {
      year: selectedYear, commodity: commodityMalayKeyword, tradeType: 'Export', topReportersLimit: 6, partnersPerReporterLimit: 2,
    });
  }, [standardizedGlobalTradeFlowRows, globalTradeFlowLoading, globalTradeFlowError, selectedYear, commodityMalayKeyword]);

  // --- Map + Top-5 Pengeluaran (PRODUCTION tab) ---
  // Map + top-5 lists show a breakdown ACROSS states/districts, so the
  // Negeri dropdown filter must not be applied to them (it would zero out
  // every state except the one selected, making the map look frozen).
  // It's only applied to the scalar KPI totals below.
  const productionBreakdownFilters = { year: selectedYear, monthCode: selectedMonth || undefined, commodityKeyword: commodityMalayKeyword, categoryKeyword };
  const productionTotalFilters = { ...productionBreakdownFilters, negeriLabel };
  const productionReady = !dashboardLoading && !dashboardError && productionRows.length > 0;

  const realProductionTotal = useMemo(() => {
    if (!productionReady) return null;
    return computeProductionTotal(productionRows, productionTotalFilters);
  }, [productionReady, productionRows, selectedYear, selectedMonth, commodityMalayKeyword, categoryKeyword, negeriLabel]);

  // Real unit ("MT" or "JUTA BIJI") behind the Pengeluaran/Bekalan Tahunan
  // figures, read straight from PRODUCTION's own Unit column instead of
  // assuming MT — falls back to "MT" when nothing matched yet.
  const realProductionUnit = useMemo(() => {
    if (!productionReady) return null;
    return computeProductionUnit(productionRows, productionTotalFilters);
  }, [productionReady, productionRows, selectedYear, selectedMonth, commodityMalayKeyword, categoryKeyword, negeriLabel]);
  const productionUnit = realProductionUnit || 'MT';

  // Unlike productionBreakdownFilters (deliberately negeri-agnostic, for the
  // nationwide map/top-5), the map itself should crop down to just the
  // selected Negeri when that filter is set — so it's scoped with
  // negeriLabel here specifically.
  const productionMapFilters = { ...productionBreakdownFilters, negeriLabel };
  const realMapData = useMemo(() => {
    if (!productionReady) return null;
    return computeMapData(productionRows, productionMapFilters, mapViewMode);
  }, [productionReady, productionRows, selectedYear, selectedMonth, commodityMalayKeyword, categoryKeyword, negeriLabel, mapViewMode]);

  // A Negeri picked from the top filter bar should drill the Pengeluaran/
  // Penggunaan Utama lists into that state's districts exactly like
  // clicking the state on the map does (selectedRegion) — so the two stay
  // in sync with what the now-cropped map is showing. A direct map click
  // still wins if both are set.
  const effectiveRegion = selectedRegion || negeriLabel;

  const realTop5Pengeluaran = useMemo(() => {
    if (!productionReady) return null;
    return computeTop5Pengeluaran(productionRows, productionBreakdownFilters, effectiveRegion);
  }, [productionReady, productionRows, selectedYear, selectedMonth, commodityMalayKeyword, categoryKeyword, effectiveRegion]);

  // --- Top-5 Penggunaan (CONSUMPTION_BY_STATE tab) ---
  const consumptionReady = !dashboardLoading && !dashboardError && consumptionRows.length > 0;
  const consumptionBreakdownFilters = { year: selectedYear, commodityKeyword: commodityMalayKeyword, categoryKeyword };
  const consumptionTotalFilters = { ...consumptionBreakdownFilters, negeriLabel };

  const realConsumptionTotalKg = useMemo(() => {
    if (!consumptionReady) return null;
    return computeConsumptionTotalKg(consumptionRows, consumptionTotalFilters);
  }, [consumptionReady, consumptionRows, selectedYear, commodityMalayKeyword, categoryKeyword, negeriLabel]);

  const realTop5Penggunaan = useMemo(() => {
    if (!consumptionReady) return null;
    return computeTop5Penggunaan(consumptionRows, consumptionBreakdownFilters, effectiveRegion, STATE_DISTRICTS_MAP);
  }, [consumptionReady, consumptionRows, selectedYear, commodityMalayKeyword, categoryKeyword, effectiveRegion]);

  // --- Pie chart / Saluran Pasaran (MARKET_FLOW tab) ---
  const realPieData = useMemo(() => {
    if (dashboardLoading || dashboardError || marketFlowRows.length === 0) return null;
    return computePieData(marketFlowRows, { year: selectedYear, commodityKeyword: commodityMalayKeyword, categoryKeyword: crossTabCategoryKeyword });
  }, [marketFlowRows, dashboardLoading, dashboardError, selectedYear, commodityMalayKeyword, crossTabCategoryKeyword]);

  // --- Route donuts (TRADE_LOGISTIC joined with REF_PORT) ---
  const realRouteSplits = useMemo(() => {
    if (dashboardLoading || dashboardError || tradeLogisticRows.length === 0 || refPortRows.length === 0) {
      return { importRoutes: null, exportRoutes: null };
    }
    return computeRouteSplits(
      standardizedTradeLogisticRows, refPortRows,
      { year: selectedYear, monthCode: selectedMonth || undefined, commodityKeyword: commodityMalayKeyword }
    );
  }, [standardizedTradeLogisticRows, refPortRows, dashboardLoading, dashboardError, selectedYear, selectedMonth, commodityMalayKeyword]);

  // --- FALLBACK ENGINE ---
  // Only two things left here have no real Google Sheet backing them at
  // all yet: the "Pasar Borong" market-stats block (same status as the
  // Insight Pemborongan tab — no PASAR_BORONG sheet connected) and the
  // foreign-country bilateral drill-down (IMPORT/EXPORT only describe
  // Malaysia's own trade, not third countries' totals with each other).
  // Every other KPI/chart/list on this page now has a real data path and
  // no longer falls back to fabricated numbers — when its sheet isn't
  // ready it renders a "Tiada data" placeholder instead (see
  // dashboardData below and the render code further down).
  const fallbackEngine = useMemo(() => {
    // Base values, still needed for marketStats (Pasar Borong) below.
    let baseBekalan = 1500000;
    let basePasaran = 1400000;
    if (isTembikai) { baseBekalan = 165000; basePasaran = 150000; }
    else if (isCili) { baseBekalan = 55000; basePasaran = 75000; }
    else if (isKubis) { baseBekalan = 110000; basePasaran = 105000; }

    const yearMult = selectedYear === "2024" ? 0.85 : 1.0;
    const monthMult = selectedMonth ? 0.085 : 1.0;
    const negeriMult = selectedNegeri ? 0.25 : 1.0;
    const filterMult = yearMult * monthMult * negeriMult;
    baseBekalan *= filterMult; basePasaran *= filterMult;

    // This panel always reflects Malaysia's own real trade, straight from
    // the IMPORT/EXPORT sheets — it does NOT switch to a per-country view
    // when a country is clicked on the map (that's what the map's own
    // dashed-line fan-out is for, driven separately by GLOBAL_TRADE_FLOW).
    // A previous version faked a "foreign country's own trade rankings"
    // view here (hardcoded top-5 lists and a literal rank of 7/9 for every
    // country except Singapura) since no real source existed for
    // third-country bilateral totals — that fabricated data has been
    // removed; this card no longer changes based on selectedCountry.
    const zeroTradeSide = { total: 0, top5: [], others: { value: 0, percent: 0 } };
    const globalTradeStats = tradeReady
      ? (realGlobalTradeStats || { perspective: 'MALAYSIA', countryName: 'Malaysia', import: zeroTradeSide, export: zeroTradeSide })
      : { perspective: 'MALAYSIA', countryName: 'Malaysia', import: zeroTradeSide, export: zeroTradeSide };

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

    return { globalTradeStats, marketStats };
  }, [selectedYear, selectedMonth, selectedNegeri, isCili, isTembikai, isKubis, realGlobalTradeStats, tradeReady]);

  // --- MERGE: real sheet-derived values are used wherever available.
  // Anything without a ready sheet is null/empty (never a fabricated
  // number) — the render code below shows a "Tiada data" placeholder for
  // those instead. globalTradeStats/marketStats still come from
  // fallbackEngine (see its comment for what's still mock and why). ---
  const dashboardData = useMemo(() => {
    const pengeluaran = productionReady ? Math.round(realProductionTotal ?? 0) : null;
    const importQty = tradeReady ? Math.round(realImportQty ?? 0) : null;
    const penggunaanQty = consumptionReady ? Math.round((realConsumptionTotalKg ?? 0) / 1000) : null;
    const eksportQty = tradeReady ? Math.round(realExportQty ?? 0) : null;

    // Supply (bekalan) = production + import; Demand (pasaran) = consumption + export.
    // Recomputed as soon as EITHER feeding sheet is ready, so the
    // surplus/deficit status bar reflects real data (including real zeros)
    // as soon as any of it loads, rather than staying blank until both load.
    const bekalan = (productionReady || tradeReady) ? Math.round((pengeluaran ?? 0) + (importQty ?? 0)) : null;
    const pasaran = (consumptionReady || tradeReady) ? Math.round((penggunaanQty ?? 0) + (eksportQty ?? 0)) : null;

    const top5Pengeluaran = productionReady ? (realTop5Pengeluaran?.list ?? []) : [];
    const top5Penggunaan = consumptionReady ? (realTop5Penggunaan?.list ?? []) : [];
    // Prefer whichever real list actually drilled to district level, so the
    // two lists' headers ("Mengikut Daerah" vs "Mengikut Negeri") stay in sync.
    const top5Level = realTop5Pengeluaran?.top5Level ?? realTop5Penggunaan?.top5Level ?? 'negeri';

    return {
      pengeluaran, importQty, penggunaanQty, eksportQty, bekalan, pasaran,
      mapData: productionReady ? (realMapData ?? []) : [],
      pieData: marketFlowReady ? (realPieData ?? []) : [],
      importRoutes: logisticsReady ? (realRouteSplits.importRoutes ?? []) : [],
      exportRoutes: logisticsReady ? (realRouteSplits.exportRoutes ?? []) : [],
      displayTop5Pengeluaran: top5Pengeluaran,
      displayTop5Penggunaan: top5Penggunaan,
      top5Level,
      globalTradeStats: fallbackEngine.globalTradeStats,
      marketStats: fallbackEngine.marketStats,
      liveFlags: {
        map: productionReady,
        pengeluaran: productionReady,
        penggunaan: consumptionReady,
        pie: marketFlowReady,
        routes: logisticsReady,
        trade: tradeReady,
      },
    };
  }, [
    fallbackEngine, productionReady, tradeReady, consumptionReady, logisticsReady, marketFlowReady,
    realProductionTotal, realImportQty, realConsumptionTotalKg, realExportQty,
    realTop5Pengeluaran, realTop5Penggunaan, realMapData, realPieData, realRouteSplits,
  ]);

  const { 
    bekalan: bekalanSemasa, pasaran: pasaranSemasa, 
    pengeluaran: jumlahPengeluaran, importQty, penggunaanQty, eksportQty, 
    pieData, mapData, importRoutes, exportRoutes, globalTradeStats, marketStats, 
    displayTop5Pengeluaran, displayTop5Penggunaan, top5Level, liveFlags,
  } = dashboardData;

  // "–" for a KPI number that has no real data yet, instead of a
  // fabricated figure or a misleading literal 0.
  const fmtQty = (v) => (v === null || v === undefined) ? '–' : v.toLocaleString();

  const hasSupplyDemandData = bekalanSemasa !== null && pasaranSemasa !== null;
  const isSurplus = hasSupplyDemandData ? bekalanSemasa >= pasaranSemasa : true;
  const isDeficit = hasSupplyDemandData ? pasaranSemasa > bekalanSemasa : false;
  const diffValue = hasSupplyDemandData ? Math.abs(bekalanSemasa - pasaranSemasa) : 0;
  const diffPercent = hasSupplyDemandData && pasaranSemasa > 0 ? Math.round((diffValue / pasaranSemasa) * 100) : 0;
  const StatusIcon = !hasSupplyDemandData ? HelpCircle : isSurplus ? CheckCircle2 : AlertTriangle;
  const statusTitle = !hasSupplyDemandData ? "TIADA DATA" : isSurplus ? "LEBIHAN BEKALAN" : "KEKURANGAN BEKALAN";
  const statusSubtitle = !hasSupplyDemandData ? "Menunggu data bekalan/pasaran sebenar" : isSurplus ? `Bekalan mencukupi sebanyak ${diffPercent}%` : `Keperluan bekalan tambahan sebanyak ${diffPercent}%`;
  const statusColor = !hasSupplyDemandData ? "text-slate-400" : isSurplus ? "text-emerald-500" : "text-red-500";
  const statusBorder = !hasSupplyDemandData ? "border-slate-300/50" : isSurplus ? "border-emerald-500/50" : "border-red-500/50";
  const statusShadow = !hasSupplyDemandData ? "" : isSurplus ? "shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "shadow-[0_0_20px_rgba(239,68,68,0.2)]";
  const bekalanTextColor = !hasSupplyDemandData ? "text-slate-400 dark:text-slate-500" : isSurplus ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-cyan-400";
  const pasaranTextColor = !hasSupplyDemandData ? "text-slate-400 dark:text-slate-500" : isDeficit ? "text-red-600 dark:text-red-500" : "text-orange-600 dark:text-orange-400";

  const isBorongStable = marketStats.borongSupply >= marketStats.borongDemand;
  const borongStatusColor = isBorongStable ? "text-emerald-500" : "text-red-500";
  const borongStatusBorder = isBorongStable ? "border-emerald-500/50" : "border-red-500/50";
  const borongStatusBg = isBorongStable ? "bg-emerald-500/10" : "bg-red-500/10";
  const BorongIcon = isBorongStable ? CheckCircle2 : AlertTriangle;

  const TradeRankingCard = ({ title, data, type, themeClass }) => {
    const isMalaysiaMode = globalTradeStats.perspective === 'MALAYSIA';
    const countryLabel = isMalaysiaMode ? "Malaysia" : globalTradeStats.countryName;
    const shareBarClass = type === 'import' ? 'bg-blue-500 dark:bg-cyan-500' : 'bg-orange-500 dark:bg-orange-400';
    // A zero total in Malaysia-perspective mode covers both "sheet not
    // ready yet" and a genuine real zero-result — either way there's
    // nothing meaningful to rank, so show a placeholder instead of an
    // empty table.
    if (isMalaysiaMode && !data.total) {
      return (
        <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700/50 p-2 md:p-3 flex-1 h-full w-full min-h-0 shadow-sm">
          <h4 className={`text-[9px] md:text-[10px] xl:text-xs uppercase tracking-wider mb-1.5 md:mb-2 font-bold border-b border-slate-200 dark:border-slate-700 pb-1 w-full text-center ${themeClass}`}>{title}</h4>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center">Tiada data dagangan tersedia buat masa ini</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700/50 p-2 md:p-3 flex-1 h-full w-full min-h-0 shadow-sm transition-all">
        <h4 className={`text-[9px] md:text-[10px] xl:text-xs uppercase tracking-wider mb-1.5 md:mb-2 font-bold border-b border-slate-200 dark:border-slate-700 pb-1 ${themeClass}`}>{isMalaysiaMode ? title : `${title} - ${countryLabel}`}</h4>
        <div className="flex flex-col flex-1 min-h-0 text-[9px] md:text-[10px]">
          <div className="flex text-slate-400 font-semibold mb-1 px-1 shrink-0"><span className="w-4 text-center"></span><span className="flex-1">Negara</span><span className="w-14 text-right">Nilai (RM)</span><span className="w-9 text-right">Syer</span></div>
          {/* Each row carries a share bar, and rows spread evenly over the
              card height (justify-evenly) so tall cards are filled without
              looking gappy; gap-1 keeps a minimum spacing on short cards.
              min-h-0 + overflow-y-auto lets the list shrink and scroll
              instead of pushing the Dagangan total row outside the card at
              browser zoom levels where there isn't enough vertical room. */}
          <div className="flex flex-col justify-evenly gap-1 md:gap-1.5 flex-1 min-h-0 overflow-y-auto">
            {data.top5.map((item) => (
              <div key={item.rank} className="flex flex-col gap-0.5 px-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded transition-colors">
                <div className="flex items-center"><span className="w-4 text-center font-bold text-slate-500">{item.rank}</span><span className="flex-1 font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</span><span className="w-14 text-right font-bold text-slate-800 dark:text-slate-200">{formatFixed(item.value, 1)}M</span><span className="w-9 text-right text-slate-500">{item.percent.toFixed(1)}%</span></div>
                <div className="ml-4 h-1 md:h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${shareBarClass}`} style={{ width: `${Math.min(Math.max(item.percent, 0), 100)}%` }} /></div>
              </div>
            ))}
            {!isMalaysiaMode && (
              <div className="flex items-center px-1 py-1 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800/50 shadow-sm"><span className="w-4 text-center font-bold text-blue-600 dark:text-cyan-400">{data.malaysiaStanding.rank}</span><span className="flex-1 font-bold text-blue-700 dark:text-blue-300">Kedudukan Malaysia</span><span className="w-14 text-right font-bold text-blue-700 dark:text-blue-300">{formatFixed(data.malaysiaStanding.value, 1)}M</span><span className="w-9 text-right font-bold text-blue-600 dark:text-cyan-400">{data.malaysiaStanding.percent.toFixed(1)}%</span></div>
            )}
            <div className="flex flex-col gap-0.5 px-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded transition-colors">
              <div className="flex items-center"><span className="w-4 text-center font-bold text-slate-500">6</span><span className="flex-1 font-medium text-slate-700 dark:text-slate-300 truncate">Lain-lain Negara</span><span className="w-14 text-right font-bold text-slate-800 dark:text-slate-200">{formatFixed(data.others.value, 1)}M</span><span className="w-9 text-right text-slate-500">{data.others.percent.toFixed(1)}%</span></div>
              <div className="ml-4 h-1 md:h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full rounded-full bg-slate-400 dark:bg-slate-500" style={{ width: `${Math.min(Math.max(data.others.percent, 0), 100)}%` }} /></div>
            </div>
          </div>
          {/* Always-visible footer, outside the scroll area, so the total
              row can never be pushed off/outside the card. */}
          <div className="shrink-0">
            <div className="flex items-center px-1 pt-2 border-t-2 border-slate-300 dark:border-slate-600 mt-1.5"><span className="w-4 text-center"></span><span className="flex-1 font-black text-[9px] md:text-[10px] text-slate-800 dark:text-white uppercase tracking-wider truncate">Dagangan {countryLabel}</span><span className="w-14 text-right font-black text-[9px] md:text-[10px] text-slate-800 dark:text-white">{formatFixed(data.total, 1)}M</span><span className="w-9 text-right font-black text-[9px] md:text-[10px] text-slate-800 dark:text-white">100%</span></div>
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
                  {tradeLoading && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 animate-pulse">Memuatkan data...</span>}
                  {tradeError && <span className="text-[9px] font-bold uppercase tracking-wider text-red-500" title={tradeError}>Data sheet tidak disambung — lihat sheetsConfig.js</span>}
                  {!tradeLoading && !tradeError && realGlobalTradeStats && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">● Data Langsung</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SearchableSelect searchable={false} value={selectedYear} onChange={setSelectedYear} options={['2025', '2024']} triggerClassName="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors" wrapperClassName="w-20" />
                  <SearchableSelect searchable={false} value={selectedMonth} onChange={setSelectedMonth} options={MONTH_OPTIONS} placeholder="Semua Bulan" triggerClassName="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors" wrapperClassName="w-28" />
                  <SearchableSelect value={selectedNegeri} onChange={setSelectedNegeri} options={NEGERI_OPTIONS} placeholder="Semua Negeri" triggerClassName="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors" wrapperClassName="w-32" />
                  <SearchableSelect value={selectedCategory} onChange={(v) => {setSelectedCategory(v); setSelectedCommodity("");}} options={[{ value: '', label: 'SEMUA KATEGORI' }, ...activeTradeCategoryTree.categories]} placeholder="Semua Kategori" triggerClassName="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors" wrapperClassName="w-52" />
                  <SearchableSelect value={selectedCommodity} onChange={setSelectedCommodity} disabled={!selectedCategory} options={[{ value: '', label: 'SEMUA KOMODITI' }, ...tradeCommodityOptionsForSelectedCategory]} placeholder="Semua Komoditi" triggerClassName="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors disabled:opacity-50" wrapperClassName="w-52" />
                </div>
              </div>
              <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-4">
                <div className="flex-[1.1] w-full bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col relative overflow-hidden min-h-[200px] shadow-sm">
                  <div className="absolute top-2 left-2 z-10 text-[9px] font-bold uppercase tracking-wider">
                    {globalTradeFlowLoading && <span className="text-slate-400 animate-pulse">Memuatkan rantaian bekalan...</span>}
                    {globalTradeFlowError && <span className="text-red-500" title={globalTradeFlowError}>Rantaian bekalan: gagal dimuatkan (lihat konsol)</span>}
                    {!globalTradeFlowLoading && !globalTradeFlowError && globalTradeFlowRows.length > 0 && !selectedCommodity && <span className="text-slate-400">Pilih Komoditi untuk lihat rantaian bekalan sebenar</span>}
                    {!globalTradeFlowLoading && !globalTradeFlowError && globalTradeFlowRows.length > 0 && selectedCommodity && (realTopImportPartners?.length > 0 || realTopExportPartners?.length > 0 || realTopGlobalExportFlows?.length > 0) && <span className="text-emerald-500">● Rantaian Bekalan: Data Langsung {selectedCountry ? `(${selectedCountry})` : '(Malaysia + Aliran Global)'}</span>}
                    {!globalTradeFlowLoading && !globalTradeFlowError && globalTradeFlowRows.length > 0 && selectedCommodity && !(realTopImportPartners?.length > 0 || realTopExportPartners?.length > 0 || realTopGlobalExportFlows?.length > 0) && <span className="text-amber-500">Tiada padanan rantaian bekalan untuk komoditi/tahun ini</span>}
                  </div>
                  <MalaysiaFlowMap selectedCommodity={selectedCommodity} selectedYear={selectedYear} onCountryClick={(country) => setSelectedCountry(country)} onResetMap={() => setSelectedCountry(null)} realCountryStats={realCountryStats} flowAnchorCountry={flowAnchorCountry} realTopImportPartners={realTopImportPartners} realTopExportPartners={realTopExportPartners} realTopGlobalExportFlows={realTopGlobalExportFlows} />
                </div>
                <div className="flex-[0.9] flex flex-col gap-3 min-h-0 h-full">
                  <div className="flex-[1.1] flex gap-3 min-h-0 w-full"><TradeRankingCard title="Sumber Utama (Import)" data={globalTradeStats.import} type="import" themeClass="text-blue-600 dark:text-cyan-400 border-blue-200 dark:border-cyan-800" /><TradeRankingCard title="Pasaran Utama (Eksport)" data={globalTradeStats.export} type="export" themeClass="text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800" /></div>
                  <div className="flex-1 flex gap-3 min-h-0 w-full">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col relative overflow-hidden min-h-[120px] shadow-sm h-full w-full">
                      <h4 className="flex items-center justify-center gap-2 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold shrink-0"><div className="w-3.5 md:w-20 shrink-0" /><span>NILAI IMPORT</span><div className="w-3.5 h-3.5 md:w-5 md:h-5 rounded-full overflow-hidden shrink-0 shadow-sm border border-slate-200 dark:border-slate-700"><img src="https://flagcdn.com/my.svg" alt="Malaysia" className="w-full h-full object-cover scale-125" /></div></h4>
                      <TradeDonutChart isDarkMode={isDarkMode} colors={ROUTE_COLORS} legendPos="left" centerValue={`RM ${formatFixed(globalTradeStats.import.total, 1)}M`} centerLabel="NILAI IMPORT" data={importRoutes} />
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col relative overflow-hidden min-h-[120px] shadow-sm h-full w-full">
                        <h4 className="flex items-center justify-center text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold shrink-0"><div className="flex items-center justify-center gap-2 -translate-x-2 md:-translate-x-10"><span>NILAI EKSPORT</span><div className="w-3.5 h-3.5 md:w-5 md:h-5 rounded-full overflow-hidden shrink-0 shadow-sm border border-slate-200 dark:border-slate-700"><img src="https://flagcdn.com/my.svg" alt="Malaysia" className="w-full h-full object-cover scale-125" /></div></div></h4>
                      <TradeDonutChart isDarkMode={isDarkMode} colors={ROUTE_COLORS} legendPos="right" centerValue={`RM ${formatFixed(globalTradeStats.export.total, 1)}M`} centerLabel="NILAI EKSPORT" data={exportRoutes} emptyMessage="Data pelabuhan tiada untuk rekod eksport" />
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
                  <h3 className="font-bold text-base md:text-lg tracking-wider uppercase text-slate-800 dark:text-emerald-100">Insight Pembekalan {effectiveRegion && <span className="text-emerald-500">({effectiveRegion})</span>}</h3>
                  {dashboardLoading && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 animate-pulse">Memuatkan data...</span>}
                  {dashboardError && <span className="text-[9px] font-bold uppercase tracking-wider text-red-500" title={dashboardError}>Data sheet tidak disambung — lihat sheetsConfig.js</span>}
                  {!dashboardLoading && !dashboardError && (liveFlags.map || liveFlags.pengeluaran || liveFlags.penggunaan || liveFlags.pie) && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">● Data Langsung</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SearchableSelect searchable={false} value={selectedYear} onChange={setSelectedYear} options={['2025', '2024']} triggerClassName="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer shadow-sm" wrapperClassName="w-20" />
                  <SearchableSelect searchable={false} value={selectedMonth} onChange={setSelectedMonth} options={MONTH_OPTIONS} placeholder="Semua Bulan" triggerClassName="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer shadow-sm" wrapperClassName="w-28" />
                  <SearchableSelect value={selectedNegeri} onChange={setSelectedNegeri} options={NEGERI_OPTIONS} placeholder="Semua Negeri" triggerClassName="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer shadow-sm" wrapperClassName="w-32" />
                  <SearchableSelect value={selectedCategory} onChange={(v) => {setSelectedCategory(v); setSelectedCommodity("");}} options={[{ value: '', label: 'SEMUA KATEGORI' }, ...activeCategoryTree.categories]} placeholder="Semua Kategori" triggerClassName="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer shadow-sm" wrapperClassName="w-52" />
                  <SearchableSelect value={selectedCommodity} onChange={setSelectedCommodity} disabled={!selectedCategory} options={[{ value: '', label: 'SEMUA KOMODITI' }, ...commodityOptionsForSelectedCategory]} placeholder="Semua Komoditi" triggerClassName="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer shadow-sm disabled:opacity-50" wrapperClassName="w-52" />
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
                        <p className={`text-xl md:text-3xl font-black tracking-tight leading-none ${bekalanTextColor}`}>{fmtQty(bekalanSemasa)}</p>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{productionUnit}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                         <div className="flex flex-col items-center">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Pengeluaran</span>
                           <span className="text-[11px] md:text-sm font-bold text-emerald-600 dark:text-emerald-500">{fmtQty(jumlahPengeluaran)} <span className="text-[8px] text-emerald-400/70">{productionUnit}</span></span>
                         </div>
                         <div className="w-px h-6 bg-slate-200 dark:border-slate-800"></div>
                         <div className="flex flex-col items-center">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Import</span>
                           <span className="text-[11px] md:text-sm font-bold text-emerald-600 dark:text-emerald-500">{fmtQty(importQty)} <span className="text-[8px] text-emerald-400/70">MT</span></span>
                         </div>
                      </div>
                    </div>
                    
                    {/* Right Side: PASARAN TAHUNAN */}
                    <div className="flex-[0.9] pl-6 flex flex-col justify-center">
                      <div className="flex justify-center mb-1">
                        <span className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-extrabold">Pasaran Tahunan</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1 mb-3">
                        <p className={`text-xl md:text-3xl font-black tracking-tight leading-none ${pasaranTextColor}`}>{fmtQty(pasaranSemasa)}</p>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">MT</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                         <div className="flex flex-col items-center">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Penggunaan (Isi Rumah)</span>
                           <span className="text-[11px] md:text-sm font-bold text-orange-600 dark:text-orange-500">{fmtQty(penggunaanQty)} <span className="text-[8px] text-orange-400/70">MT</span></span>
                         </div>
                         <div className="w-px h-6 bg-slate-200 dark:border-slate-800"></div>
                         <div className="flex flex-col items-center">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Eksport</span>
                           <span className="text-[11px] md:text-sm font-bold text-orange-600 dark:text-orange-500">{fmtQty(eksportQty)} <span className="text-[8px] text-orange-400/70">MT</span></span>
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
                  <div className="flex-[1.2] bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col relative overflow-hidden min-h-[200px] shadow-sm">
                    <MalaysiaChoroplethMap isDarkMode={isDarkMode} mapViewMode={mapViewMode} setMapViewMode={setMapViewMode} mapData={mapData} onRegionClick={(region) => setSelectedRegion(region)} onResetMap={() => setSelectedRegion(null)} selectedRegion={selectedRegion} filterNegeri={negeriLabel} />
                  </div>

                  {/* NEW CENTER: Top 5 Lists */}
                  <div className="flex-[0.7] flex flex-col gap-3 min-h-0">
                    
                    {/* List 1: Pengeluaran */}
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/50 p-3 flex flex-col min-h-0 shadow-sm">
                      <div className="border-b border-slate-200 dark:border-slate-700/50 pb-1 mb-2">
                        <h4 className="text-[10px] md:text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-500">Pengeluaran Utama</h4>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 uppercase">
                            ({top5Level === 'daerah' ? `Mengikut Daerah di ${effectiveRegion}` : 'Mengikut Negeri'})
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1">
                        {displayTop5Pengeluaran.length === 0 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Tiada data tersedia buat masa ini</span>
                        )}
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
                            ({top5Level === 'daerah' ? `Mengikut Daerah di ${effectiveRegion}` : 'Mengikut Negeri'})
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1">
                        {displayTop5Penggunaan.length === 0 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Tiada data tersedia buat masa ini</span>
                        )}
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
                  <div className="flex-[0.9] bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col relative overflow-hidden min-h-[200px] shadow-sm">
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