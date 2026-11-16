import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { MALAYSIA_STATE_COORDINATES } from '../../config/malaysiaStateCoordinates';
import { getCountryCoords } from '../../config/countryCoordinates';
 
export default function MalaysiaPengeluaranMap({
  selectedCommodity = "",
  selectedYear = "2025",
  variant = 'production', // 'production' (default: bubbles=production, lines=import flows) or 'pasaran' (bubbles/points=where it's marketed, no flow lines)
  realProductionByState = null, // [{name, value}] from PRODUCTION — real per-state production (MT)
  realImportByState = null, // [{name, value, qty}] from TRADE_LOGISTIC+REF_PORT — real import reaching ports in each state
  realCountryStateFlows = null, // [{country, state, value}] real top origin-country -> entry-state import flows
  realPasaranByState = null, // [{lokasi, qty, pct}] from MARKET_FLOW (computeTopMarketStates) — full list, not capped at 5
  realPasaranCountries = null, // [{lokasi, qty, pct}] from MARKET_FLOW (computeTopMarketCountries) — full list, not capped at 5
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

    // --- "pasaran" variant: bubbles/points show ONLY where the commodity is
    // actually marketed (MARKET_FLOW data, the same source as the "5 LOKASI
    // UTAMA DIPASARKAN" table, but the full list rather than capped at 5) —
    // no production bubbles, no import/domestic flow lines, since those
    // represent different data than "where is this sold". ---
    if (variant === 'pasaran') {
      const bubbleData = (realPasaranByState || [])
        .map((state) => {
          const coords = MALAYSIA_STATE_COORDINATES[state.lokasi];
          if (!coords) return null;
          return { name: state.lokasi, value: [...coords, state.qty] };
        })
        .filter(Boolean);

      const foreignPoints = (realPasaranCountries || [])
        .map((c) => {
          const coords = getCountryCoords(c.lokasi);
          if (!coords) return null;
          return { name: c.lokasi, value: [...coords, c.qty] };
        })
        .filter(Boolean);

      return { bubbleData, flows: [], foreignPoints };
    }

    // --- Real production bubbles (PRODUCTION tab) only. realImportByState
    // gives each state's real "external supply" (import reaching ports
    // located in that state) to pair with production; a state with no
    // real import figure gets 0 (not a fabricated number) for that
    // dimension. No real data at all means no bubbles, rather than a
    // fixed hardcoded state list. ---
    let bubbleData, foreignPoints, flows;

    if (realProductionByState && realProductionByState.length > 0) {
      const importByStateMap = new Map((realImportByState || []).map((s) => [s.name, s.qty]));

      bubbleData = realProductionByState
        .map((state) => {
          const coords = MALAYSIA_STATE_COORDINATES[state.name];
          if (!coords) return null;
          const bekalanLuar = importByStateMap.get(state.name) || 0;
          return { name: state.name, value: [...coords, state.value, bekalanLuar] };
        })
        .filter(Boolean);
    } else {
      bubbleData = [];
    }

    // --- Real import flow lines (country -> entry state) only. No real
    // data means no lines, rather than fixed decorative flows. ---
    if (realCountryStateFlows && realCountryStateFlows.length > 0) {
      const seenCountries = new Map();
      flows = [];
      for (const { country, state, value } of realCountryStateFlows) {
        const stateCoords = MALAYSIA_STATE_COORDINATES[state];
        const countryCoords = getCountryCoords(country);
        if (!stateCoords || !countryCoords) continue;
        seenCountries.set(country, countryCoords);
        flows.push({
          coords: [countryCoords, stateCoords], from: country, to: state, type: 'import',
          lineStyle: { color: '#0ea5e9', width: 2, opacity: 0.8, curveness: 0.15 },
        });
      }
      foreignPoints = [...seenCountries.entries()].map(([name, coords]) => ({ name, value: coords }));
    } else {
      flows = [];
      foreignPoints = [];
    }
 
    // Domestic inter-state flows (Pahang -> Selangor, etc.) stay decorative
    // — no tab in the sheet tracks actual interstate shipment movements,
    // so this remains illustrative rather than real.
    const domesticFlows = [
      { coords: [locs.pahang, locs.selangor], from: 'Pahang', to: 'Selangor', type: 'domestik', lineStyle: { color: '#fcd34d', width: 2.5, opacity: 0.9, curveness: 0.2 } },
      { coords: [locs.johor, locs.melaka], from: 'Johor', to: 'Melaka', type: 'domestik', lineStyle: { color: '#fcd34d', width: 2, opacity: 0.9, curveness: -0.2 } },
      { coords: [locs.kedah, locs.selangor], from: 'Kedah', to: 'Selangor', type: 'domestik', lineStyle: { color: '#fcd34d', width: 1.5, opacity: 0.9, curveness: 0.15 } },
      { coords: [locs.sabah, locs.selangor], from: 'Sabah', to: 'Selangor', type: 'domestik', lineStyle: { color: '#fcd34d', width: 1.5, opacity: 0.8, curveness: 0.3 } },
    ];
 
    return { bubbleData, flows: [...domesticFlows, ...flows], foreignPoints };
  }, [selectedCommodity, selectedYear, variant, realProductionByState, realImportByState, realCountryStateFlows, realPasaranByState, realPasaranCountries]);
 
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
          const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
          const pengeluaran = (params.value[2] || 0).toLocaleString(undefined, fmt2);
          const bekalanLuar = (params.value[3] || 0).toLocaleString(undefined, fmt2);
          
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
        if (params.seriesName === 'Pasaran Negeri' || params.seriesName === 'Pasaran Luar Negara') {
          const qty = params.value[2] ? params.value[2].toLocaleString(undefined, {maximumFractionDigits: 0}) : "0";
          const accent = params.seriesName === 'Pasaran Negeri' ? '#4ade80' : '#38bdf8';
          return `<div style="font-weight:bold; border-bottom:1px solid rgba(56,189,248,0.3); padding-bottom:4px; margin-bottom:4px; text-transform:uppercase;">${params.name}</div>
                  <div style="display:flex; justify-content:space-between; gap:20px;">
                    <span style="color:#94a3b8;">Pasaran:</span>
                    <span style="color:${accent}; font-weight:bold;">${qty} MT</span>
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
      max: variant === 'pasaran'
        ? Math.max(1, ...chartData.bubbleData.map((b) => b.value[2] || 0))
        : Math.max(400000, ...chartData.bubbleData.map((b) => b.value[2] || 0)),
      // Only size/color the main negeri bubble series — the foreign-point
      // series carries its own fixed styling below and shouldn't be
      // recolored by this scale.
      seriesIndex: 0,
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
        name: variant === 'pasaran' ? 'Pasaran Negeri' : 'Pengeluaran Negeri',
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
        name: variant === 'pasaran' ? 'Pasaran Luar Negara' : 'Lokasi Luar',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        rippleEffect: { brushType: 'stroke', scale: 2.5 },
        label: { show: true, position: 'right', formatter: '{b}', fontSize: variant === 'pasaran' ? 10 : 9, fontWeight: 'bold', color: variant === 'pasaran' ? '#f8fafc' : '#94a3b8' },
        itemStyle: { color: variant === 'pasaran' ? '#38bdf8' : '#94a3b8' },
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