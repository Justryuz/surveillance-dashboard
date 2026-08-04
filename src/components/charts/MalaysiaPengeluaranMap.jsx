import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

export default function MalaysiaPengeluaranMap({ 
  selectedCommodity = "", 
  selectedYear = "2025"
}) {
  const chartRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Koordinat Rujukan
  const locs = {
    // Koordinat Negeri di Malaysia
    selangor: [101.5264, 3.0738],
    johor: [103.3256, 2.0301],
    pahang: [102.5000, 3.8000],
    kelantan: [102.2386, 6.1254],
    kedah: [100.3685, 6.1210],
    melaka: [102.2501, 2.1896],
    sabah: [116.0753, 5.9788],
    sarawak: [113.9213, 2.5574],
    // Koordinat Negara Luar
    thailand: [100.9925, 15.8700],
    indonesia: [101.4498, 0.5093], 
    vietnam: [108.2772, 14.0583],
  };

  useEffect(() => {
    const loadMaps = async () => {
      try {
        // 1. Muat turun peta dunia
        const worldRes = await fetch('https://unpkg.com/echarts@4.9.0/map/json/world.json');
        const worldGeo = await worldRes.json();

        // 2. Cuba muat turun peta sempadan negeri Malaysia
        let myGeo = null;
        try {
          const myRes = await fetch('/malaysia_state.geojson');
          if (myRes.ok) {
            const contentType = myRes.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              myGeo = await myRes.json();
            }
          }
        } catch (err) {
          console.warn("Fail malaysia_state.geojson tidak dijumpai. Menggunakan peta dunia sahaja.");
        }

        // 3. Gabungkan peta jika fail geojson negeri wujud
        if (myGeo && myGeo.features) {
          const filteredWorld = worldGeo.features.filter(f => f.properties.name !== 'Malaysia');
          const states = myGeo.features.map(f => {
            if (!f.properties.name) {
              f.properties.name = f.properties.Name || f.properties.NEGERI || f.properties.state || 'Unknown';
            }
            return f;
          });
          
          const combinedGeo = {
            type: 'FeatureCollection',
            features: [...filteredWorld, ...states]
          };
          echarts.registerMap('merged_map', combinedGeo);
        } else {
          echarts.registerMap('merged_map', worldGeo); // Fallback
        }
        
        setMapLoaded(true);
      } catch (error) {
        console.error("Ralat kritikal memuatkan peta:", error);
      }
    };

    loadMaps();
  }, []);

  const chartData = useMemo(() => {
    const yearMult = selectedYear === '2024' ? 0.85 : 1.0;

    // 1. Data Pengeluaran (Buih / Bubble) beserta 'Bekalan Luar'
    const stateProduction = [
      { name: 'Pahang', value: 348330 * yearMult, bekalanLuar: 45000 * yearMult, coords: locs.pahang },
      { name: 'Johor', value: 244200 * yearMult, bekalanLuar: 35000 * yearMult, coords: locs.johor },
      { name: 'Selangor', value: 141662 * yearMult, bekalanLuar: 85000 * yearMult, coords: locs.selangor },
      { name: 'Kelantan', value: 95000 * yearMult, bekalanLuar: 12000 * yearMult, coords: locs.kelantan },
      { name: 'Kedah', value: 85000 * yearMult, bekalanLuar: 10000 * yearMult, coords: locs.kedah },
      { name: 'Melaka', value: 45000 * yearMult, bekalanLuar: 18000 * yearMult, coords: locs.melaka },
      { name: 'Sabah', value: 180000 * yearMult, bekalanLuar: 25000 * yearMult, coords: locs.sabah },
      { name: 'Sarawak', value: 160000 * yearMult, bekalanLuar: 22000 * yearMult, coords: locs.sarawak }
    ];

    const bubbleData = stateProduction.map(state => ({
      name: state.name,
      // Array data: [Longitude, Latitude, Pengeluaran(MT), BekalanLuar(MT)]
      value: [...state.coords, state.value, state.bekalanLuar]
    }));

    // 2. Aliran (Flow) Negeri & Luar Negara
    const flows = [
      { coords: [locs.pahang, locs.selangor], from: 'Pahang', to: 'Selangor', type: 'domestik', lineStyle: { color: '#fcd34d', width: 2.5, opacity: 0.9, curveness: 0.2 } },
      { coords: [locs.johor, locs.melaka], from: 'Johor', to: 'Melaka', type: 'domestik', lineStyle: { color: '#fcd34d', width: 2, opacity: 0.9, curveness: -0.2 } },
      { coords: [locs.kedah, locs.selangor], from: 'Kedah', to: 'Selangor', type: 'domestik', lineStyle: { color: '#fcd34d', width: 1.5, opacity: 0.9, curveness: 0.15 } },
      { coords: [locs.sabah, locs.selangor], from: 'Sabah', to: 'Selangor', type: 'domestik', lineStyle: { color: '#fcd34d', width: 1.5, opacity: 0.8, curveness: 0.3 } },
      
      { coords: [locs.thailand, locs.kelantan], from: 'Thailand', to: 'Kelantan', type: 'import', lineStyle: { color: '#0ea5e9', width: 2, opacity: 0.8, curveness: 0.2 } },
      { coords: [locs.thailand, locs.kedah], from: 'Thailand', to: 'Kedah', type: 'import', lineStyle: { color: '#0ea5e9', width: 2, opacity: 0.8, curveness: -0.1 } },
      { coords: [locs.indonesia, locs.johor], from: 'Indonesia', to: 'Johor', type: 'import', lineStyle: { color: '#0ea5e9', width: 2, opacity: 0.8, curveness: 0.1 } },
      { coords: [locs.vietnam, locs.pahang], from: 'Vietnam', to: 'Pahang', type: 'import', lineStyle: { color: '#0ea5e9', width: 1.5, opacity: 0.6, curveness: 0.2 } }
    ];

    const foreignPoints = [
      { name: 'Thailand', value: locs.thailand },
      { name: 'Indonesia', value: locs.indonesia },
      { name: 'Vietnam', value: locs.vietnam }
    ];

    return { bubbleData, flows, foreignPoints };
  }, [selectedCommodity, selectedYear]);

  const option = mapLoaded ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#38bdf8',
      borderWidth: 1,
      textStyle: { color: '#f8fafc', fontSize: 11 },
      formatter: function (params) {
        if (params.seriesName === 'Pengeluaran Negeri') {
          // params.value[2] = Pengeluaran, params.value[3] = Bekalan Luar
          const pengeluaran = params.value[2] ? params.value[2].toLocaleString(undefined, {maximumFractionDigits: 0}) : "0";
          const bekalanLuar = params.value[3] ? params.value[3].toLocaleString(undefined, {maximumFractionDigits: 0}) : "0";
          
          return `<div style="font-weight:bold; border-bottom:1px solid rgba(56,189,248,0.3); padding-bottom:4px; margin-bottom:4px; text-transform:uppercase;">${params.name}</div>
                  <div style="display:flex; justify-content:space-between; gap:20px; margin-bottom:2px;">
                    <span style="color:#94a3b8;">Pengeluaran:</span> 
                    <span style="color:#4ade80; font-weight:bold;">${pengeluaran} MT</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; gap:20px;">
                    <span style="color:#94a3b8;">Bekalan Luar:</span> 
                    <span style="color:#38bdf8; font-weight:bold;">${bekalanLuar} MT</span>
                  </div>`;
        }
        if (params.seriesType === 'lines') {
          const isImport = params.data.type === 'import';
          const typeColor = isImport ? '#0ea5e9' : '#fcd34d';
          const typeName = isImport ? 'IMPORT' : 'DOMESTIK';
          return `<div style="font-weight:bold; color:${typeColor}; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:4px; margin-bottom:4px; font-size:10px;">ALIRAN ${typeName}</div>
                  <b>${params.data.from}</b> &rarr; <b>${params.data.to}</b>`;
        }
        return params.name;
      }
    },
    visualMap: {
      left: 'right',
      bottom: '5%',
      min: 0,
      max: 400000,
      text: ['Tinggi', 'Rendah'],
      calculable: true,
      inRange: {
        color: ['#4ade80', '#22c55e', '#15803d'], // Neon green bubbles
        symbolSize: [8, 24] // Saiz akan berubah ikut volume pengeluaran
      },
      textStyle: { color: '#cbd5e1', fontSize: 10, fontWeight: 'bold' }
    },
    geo: {
      map: 'merged_map',
      roam: true,
      zoom: 6.5, // Fokus ke Malaysia
      center: [109.0, 4.0],
      itemStyle: {
        areaColor: '#0f172a', // Tema gelap 
        borderColor: '#38bdf8', // Neon blue border
        borderWidth: 1.2,
        shadowColor: '#38bdf8',
        shadowBlur: 4 // Kesan neon glow
      },
      emphasis: {
        itemStyle: { areaColor: '#1e293b', borderColor: '#7dd3fc', borderWidth: 2 },
        label: { show: false }
      }
    },
    series: [
      {
        name: 'Pengeluaran Negeri',
        type: 'effectScatter', // <-- Ditukar dari 'scatter' ke 'effectScatter'
        coordinateSystem: 'geo',
        zlevel: 3,
        rippleEffect: { 
          brushType: 'stroke', 
          scale: 3.5, // Besarkan kesan gelombang
          period: 4   // Kelajuan kelipan
        },
        label: { show: true, position: 'right', formatter: '{b}', fontSize: 10, fontWeight: 'bold', color: '#f8fafc' },
        itemStyle: { shadowBlur: 8, shadowColor: '#000' },
        data: chartData.bubbleData
      },
      {
        name: 'Aliran Bekalan',
        type: 'lines',
        zlevel: 2,
        effect: { show: true, period: 4, trailLength: 0.4, symbol: 'arrow', symbolSize: 5 },
        data: chartData.flows
      },
      {
        name: 'Lokasi Luar',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        rippleEffect: { brushType: 'stroke', scale: 2.5 },
        label: { show: true, position: 'right', formatter: '{b}', fontSize: 9, fontWeight: 'bold', color: '#94a3b8' },
        itemStyle: { color: '#94a3b8' },
        data: chartData.foreignPoints
      }
    ]
  } : {};

  if (!mapLoaded) {
    return <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs animate-pulse">Memuatkan Peta Pengeluaran...</div>;
  }

  return (
    <div className="w-full h-full relative">
      <ReactECharts ref={chartRef} echarts={echarts} option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
    </div>
  );
}