import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

export default function MalaysiaPenggunaanMap({ 
  selectedCommodity = "", 
  selectedYear = "All", 
  selectedNegeri = "All",
  isDarkMode = false,
  filterMultiplier = 1.0 
}) {
  const [fullGeoJson, setFullGeoJson] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentDistricts, setCurrentDistricts] = useState([]);

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
      const searchState = selectedNegeri.toLowerCase().replace('w.p. ', ''); 
      filteredFeatures = fullGeoJson.features.filter(f => {
        const stateName = (f.properties.NAME_1 || f.properties.state || "").toLowerCase();
        return stateName.includes(searchState) || searchState.includes(stateName);
      });

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
    setMapReady(true);

  }, [fullGeoJson, selectedNegeri]);

  // 3. Generate deterministic mock data
  const data = useMemo(() => {
    if (!currentDistricts.length) return [];

    return currentDistricts.map(district => {
      const charVal = district.charCodeAt(0) + district.charCodeAt(district.length - 1);
      const baseValue = ((charVal * 2345) % 80000) + 5000; 
      
      const value = baseValue * filterMultiplier;
      const pctTempatan = (((charVal * 11) % 50) + 30) / 100; 

      return {
        name: district,
        value: value, 
        bekalanTempatan: Math.floor(value * pctTempatan),
        bekalanLuar: Math.floor(value * (1 - pctTempatan))
      };
    });
  }, [currentDistricts, filterMultiplier]);

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
        
        const textColor = isDarkMode ? '#f8fafc' : '#1e293b';
        const labelColor = isDarkMode ? '#cbd5e1' : '#64748b';
        const borderColor = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';

        return `
          <div style="font-family: sans-serif; min-width: 180px;">
            <div style="font-weight: bold; font-size: 12px; color: ${textColor}; border-bottom: 1px solid ${borderColor}; padding-bottom: 6px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${params.name}</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: ${labelColor};">Penggunaan:</span> <span style="font-weight: bold; color: #10b981;">${value.toLocaleString(undefined, {maximumFractionDigits: 2})} MT</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: ${labelColor};">Bekalan Tempatan:</span> <span style="font-weight: bold; color: #3b82f6;">${bekalanTempatan.toLocaleString(undefined, {maximumFractionDigits: 2})} MT</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;"><span style="color: ${labelColor};">Bekalan Luar:</span> <span style="font-weight: bold; color: #f97316;">${bekalanLuar.toLocaleString(undefined, {maximumFractionDigits: 2})} MT</span></div>
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