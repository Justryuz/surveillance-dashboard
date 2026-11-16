import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { districtKey } from '../../lib/consumptionAggregation';

// malaysia_district.geojson tags each district feature with its parent
// state as a 3-letter CODE (properties.state), e.g. "JHR" — not a full
// name — so cropping to a selected Negeri has to match against this code
// (same table used by MalaysiaChoroplethMap.jsx), not a loose name
// comparison against properties.NAME_1/state, which never matched
// anything and silently fell back to showing the whole country.
const STATE_LABEL_TO_DISTRICT_CODE = {
  'Johor': 'JHR', 'Kedah': 'KDH', 'Kelantan': 'KTN', 'Melaka': 'MLK',
  'Negeri Sembilan': 'NSN', 'Pahang': 'PHG', 'Perak': 'PRK', 'Perlis': 'PLS',
  'Pulau Pinang': 'PNG', 'Sabah': 'SBH', 'Sarawak': 'SWK', 'Selangor': 'SGR',
  'Terengganu': 'TRG', 'W.P. Kuala Lumpur': 'KUL',
};

export default function MalaysiaPenggunaanMap({
  selectedCommodity = "", 
  selectedYear = "All", 
  selectedNegeri = "All",
  isDarkMode = false,
  filterMultiplier = 1.0,
  realConsumptionByState = null, // [{name, value}] MT, from CONSUMPTION_BY_STATE
  realConsumptionByStateDistrict = null, // [{negeri, daerah, value}] MT, Isi Rumah, from CONSUMPTION_BY_STATE's district column — used as-is when present
  realProductionByStateDistrict = null, // [{negeri, daerah, value}] from PRODUCTION — used to weight the state total across real districts
}) {
  const [fullGeoJson, setFullGeoJson] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentDistricts, setCurrentDistricts] = useState([]);
  // district name -> parent state label (from each feature's state code), so
  // a district can be matched to the right state's rows even when two states
  // share a district name.
  const [stateByDistrict, setStateByDistrict] = useState({});

  // 1. Fetch GeoJSON
  useEffect(() => {
    fetch('/malaysia_district.geojson')
      .then((r) => r.json())
      .then((data) => {
        setFullGeoJson(data);
      })
      .catch((e) => console.error('Ralat memuatkan peta daerah Malaysia:', e));
  }, []);

  // 2. Filter GeoJSON based on selected Negeri safely
  useEffect(() => {
    if (!fullGeoJson) return;

    let filteredFeatures = fullGeoJson.features;

    // Filter logic
    if (selectedNegeri !== "All") {
      const districtCode = STATE_LABEL_TO_DISTRICT_CODE[selectedNegeri];
      if (districtCode) {
        filteredFeatures = fullGeoJson.features.filter(f => f.properties?.state === districtCode);
      } else {
        // Fallback loose name match, in case a differently-shaped geojson
        // (with a full NAME_1 string instead of a 3-letter code) is ever
        // swapped in, or the negeri isn't in the lookup table above.
        const searchState = selectedNegeri.toLowerCase().replace('w.p. ', '');
        filteredFeatures = fullGeoJson.features.filter(f => {
          const stateName = (f.properties.NAME_1 || f.properties.state || "").toLowerCase();
          return stateName.includes(searchState) || searchState.includes(stateName);
        });
      }

      // SAFETY NET: If the filter matched nothing (e.g., naming mismatch in GeoJSON),
      // fallback to the full map so ECharts doesn't crash from empty coordinates.
      if (filteredFeatures.length === 0) {
        console.warn(`Negeri "${selectedNegeri}" tiada padanan dalam GeoJSON. Memaparkan peta penuh.`);
        filteredFeatures = fullGeoJson.features;
      }
    }

    const activeGeoJson = { ...fullGeoJson, features: filteredFeatures };
    
    // Register the dynamic map
    echarts.registerMap('malaysia_dynamic', activeGeoJson);

    const districtNames = filteredFeatures.map(f => f.properties.name || f.properties.NAME_2 || f.properties.Daerah || "Unknown");
    setCurrentDistricts(districtNames);
    const codeToLabel = Object.fromEntries(Object.entries(STATE_LABEL_TO_DISTRICT_CODE).map(([label, code]) => [code, label]));
    const stateMap = {};
    filteredFeatures.forEach((f) => {
      const name = f.properties.name || f.properties.NAME_2 || f.properties.Daerah || "Unknown";
      stateMap[name] = codeToLabel[f.properties?.state] || '';
    });
    setStateByDistrict(stateMap);
    setMapReady(true);

  }, [fullGeoJson, selectedNegeri]);

  // 3. Build map data — real data only, empty when unavailable
  const data = useMemo(() => {
    if (!currentDistricts.length) return [];

    // Real district rows from CONSUMPTION_BY_STATE (Isi Rumah only): the
    // sheet's district column gives each district's own consumption, so
    // these figures are used as-is — no estimation.
    const realDistricts = realConsumptionByStateDistrict || [];
    const statesWithDistrictRows = new Set(realDistricts.map((d) => d.negeri));

    // State totals (CONSUMPTION_BY_STATE, Isi Rumah) and real per-district
    // production (PRODUCTION). Production is only used for "Bekalan
    // Tempatan" / "Bekalan Luar", and — for a state whose rows carry no
    // district at all — as the weighting that spreads the state total
    // across its districts (the old estimate, kept as a fallback).
    const stateTotals = new Map((realConsumptionByState || []).map((s) => [s.name, s.value]));
    const prodList = realProductionByStateDistrict || [];
    const stateProdTotals = new Map();
    for (const { negeri, value } of prodList) {
      stateProdTotals.set(negeri, (stateProdTotals.get(negeri) || 0) + value);
    }

    const results = currentDistricts.map((district) => {
      const key = districtKey(district);
      const geoState = stateByDistrict[district] || '';

      // Production for this district (prefer the same state; fall back to a
      // name-only match if the geojson state code couldn't be resolved).
      const prodHit =
        prodList.find((d) => districtKey(d.daerah) === key && d.negeri === geoState) ||
        (geoState ? null : prodList.find((d) => districtKey(d.daerah) === key)) ||
        null;
      const matchedProd = prodHit ? prodHit.value : 0;
      const state = geoState || (prodHit ? prodHit.negeri : '');

      let consumption;
      if (state && statesWithDistrictRows.has(state)) {
        // Real figure straight from the sheet (0 if this district has no rows).
        const hit = realDistricts.find((d) => d.negeri === state && districtKey(d.daerah) === key);
        consumption = (hit ? hit.value : 0) * filterMultiplier;
      } else if (!geoState && !state) {
        // State unknown: try a name-only match against the real district rows.
        const hit = realDistricts.find((d) => districtKey(d.daerah) === key);
        consumption = (hit ? hit.value : 0) * filterMultiplier;
      } else {
        // Fallback estimate: this state has no district rows in the sheet,
        // so spread its Isi Rumah total by the district's production share.
        const stateProdTotal = stateProdTotals.get(state) || 0;
        const share = stateProdTotal > 0 ? matchedProd / stateProdTotal : 0;
        consumption = (stateTotals.get(state) || 0) * share * filterMultiplier;
      }

      const bekalanTempatan = Math.min(matchedProd * filterMultiplier, consumption);
      const bekalanLuar = Math.max(0, consumption - bekalanTempatan);
      return { name: district, value: consumption, bekalanTempatan, bekalanLuar };
    });

    // If nothing came out above zero there is no usable data — show the
    // explicit empty (all-zero) map rather than a fabricated number.
    if (results.some((r) => r.value > 0)) return results;
    return currentDistricts.map((district) => ({
      name: district, value: 0, bekalanTempatan: 0, bekalanLuar: 0,
    }));
  }, [currentDistricts, stateByDistrict, filterMultiplier, realConsumptionByState, realConsumptionByStateDistrict, realProductionByStateDistrict]);

  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 100000;

  const option = mapReady ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: '#10b981',
      borderWidth: 1,
      padding: [10, 14],
      formatter: function (params) {
        if (!params.data) return params.name;
        const { value, bekalanTempatan, bekalanLuar } = params.data;
        
        const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
        const textColor = isDarkMode ? '#f8fafc' : '#1e293b';
        const labelColor = isDarkMode ? '#cbd5e1' : '#64748b';
        const borderColor = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';

        return `
          <div style="font-family: sans-serif; min-width: 180px;">
            <div style="font-weight: bold; font-size: 12px; color: ${textColor}; border-bottom: 1px solid ${borderColor}; padding-bottom: 6px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${params.name}</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: ${labelColor};">Penggunaan:</span> <span style="font-weight: bold; color: #10b981;">${(value || 0).toLocaleString(undefined, fmt2)} MT</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: ${labelColor};">Bekalan Tempatan:</span> <span style="font-weight: bold; color: #3b82f6;">${(bekalanTempatan || 0).toLocaleString(undefined, fmt2)} MT</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: ${labelColor};">Bekalan Luar:</span> <span style="font-weight: bold; color: #f97316;">${(bekalanLuar || 0).toLocaleString(undefined, fmt2)} MT</span></div>
          </div>`;
      }
    },
    visualMap: {
      min: 0,
      max: maxValue || 100000,
      left: 'right',
      bottom: '10%', 
      calculable: true,
      text: ['Tinggi', 'Rendah'], 
      inRange: { color: ['#dcfce7', '#86efac', '#22c55e', '#15803d', '#052e16'] },
      textStyle: { color: isDarkMode ? '#cbd5e1' : '#475569', fontSize: 10, fontWeight: 'bold' },
      show: true 
    },
    series: [
      {
        name: 'Penggunaan',
        type: 'map',
        map: 'malaysia_dynamic', 
        roam: true,
        zoom: selectedNegeri === "All" ? 1.2 : 1.1, 
        itemStyle: {
          borderColor: isDarkMode ? '#1e293b' : '#cbd5e1', 
          borderWidth: 0.5
        },
        emphasis: {
          itemStyle: {
            areaColor: '#fcd34d',
            borderColor: '#f59e0b',
            borderWidth: 1
          },
          label: { show: false } 
        },
        data: data
      }
    ]
  } : {};

  return (
    <div className="w-full h-full flex flex-col relative">
      {!mapReady && <div className="flex-1 flex items-center justify-center text-slate-400 text-xs animate-pulse">Memuatkan Pemetaan Pintar...</div>}
      {mapReady && <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />}
    </div>
  );
}