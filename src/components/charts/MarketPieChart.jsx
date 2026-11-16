import React from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

// One gradient pair per Lokasi_Saluran_Pasaran category actually seen in the
// sheet. Keyed by name (case-insensitive lookup below) so however many of
// these are present in a given filter, each gets a stable, distinct color —
// with a neutral slate fallback for any future/unlisted value.
const COLOR_MAP = {
  'dalam daerah': ['#60a5fa', '#1d4ed8'],
  'luar daerah': ['#34d399', '#047857'],
  'dalam negeri': ['#22d3ee', '#0e7490'],
  'luar negeri': ['#fcd34d', '#b45309'],
  'luar negara': ['#fb923c', '#c2410c'],
};
const FALLBACK_COLORS = ['#94a3b8', '#475569'];

function colorFor(name) {
  const pair = COLOR_MAP[String(name || '').toLowerCase()] || FALLBACK_COLORS;
  return new echarts.graphic.LinearGradient(0, 0, 1, 1, [
    { offset: 0, color: pair[0] },
    { offset: 1, color: pair[1] },
  ]);
}

export default function MarketPieChart({
  totalPengeluaran = 712500,
  unit = "MT",
  isDarkMode = false,
  pieData = [],
}) {
  const hasData = Array.isArray(pieData) && pieData.length > 0;

  const option = hasData ? {
    backgroundColor: 'transparent',
    title: { show: false },

    // Using graphic to precisely position both the center text and the legend title
    graphic: [
      {
        type: 'text',
        left: '0%',
        // Plain percentage-based position (no extra pixel offset) so it
        // scales with the chart's actual rendered height and stays clear
        // of the legend at any browser zoom level — a fixed pixel offset
        // combined with a percentage top only lined up at one specific
        // container height, causing the title to overlap the legend's
        // first item at normal (100%) zoom.
        top: '18%',
        style: {
          text: 'SALURAN PASARAN',
          fill: isDarkMode ? '#94a3b8' : '#64748b',
          font: 'bold 12px sans-serif',
          letterSpacing: 1,
        }
      },
      {
        type: 'group',
        left: '65%',
        top: '50%',
        bounding: 'raw',
        children: [
          {
            type: 'text',
            style: {
              text: totalPengeluaran.toLocaleString(),
              fill: isDarkMode ? '#f8fafc' : '#1e293b',
              font: 'bold 20px sans-serif',
              textAlign: 'center',
              y: -22
            }
          },
          {
            type: 'text',
            style: {
              text: unit,
              fill: isDarkMode ? '#22d3ee' : '#2563eb',
              font: 'bold 11px sans-serif',
              textAlign: 'center',
              y: 2
            }
          },
          {
            type: 'text',
            style: {
              text: 'JUMLAH PENGELUARAN',
              fill: isDarkMode ? '#94a3b8' : '#64748b',
              font: 'bold 9px sans-serif',
              textAlign: 'center',
              y: 18,
              letterSpacing: 1
            }
          }
        ]
      }
    ],

    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.name}: ${Number(p.value || 0).toFixed(2)}%`,
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#3b82f6',
      textStyle: { color: '#f8fafc' }
    },

    legend: {
      type: 'scroll',
      orient: 'vertical',
      left: '0%',
      // Fixed percentage (not 'center') so the gap below the title stays
      // proportional to the chart's actual height at any zoom level.
      top: '32%',
      bottom: '4%',
      itemWidth: 14,
      itemHeight: 14,
      itemGap: 10,
      icon: 'circle',
      textStyle: { color: '#64748b', fontSize: 10, fontWeight: 'bold' },
      // Up to 7 categories can be present now (vs. the old fixed 4), so the
      // legend needs to be able to scroll rather than overflow the card.
      pageIconSize: 10,
      pageTextStyle: { color: '#64748b', fontSize: 9 },
    },

    series: [
      {
        name: 'Saluran Pasaran',
        type: 'pie',
        radius: ['55%', '85%'],
        center: ['65%', '50%'],

        itemStyle: {
          borderColor: '#0f172a',
          borderWidth: 1,
          borderRadius: 4,
          shadowBlur: 15,
          shadowOffsetX: 5,
          shadowOffsetY: 8,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },

        label: {
          show: true,
          position: 'inner',
          formatter: '{c}%',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 'bold',
          textShadowBlur: 4,
          textShadowColor: 'rgba(0,0,0,0.8)'
        },

        labelLine: { show: false },

        data: pieData.map((slice) => ({
          value: slice.value,
          name: slice.name,
          itemStyle: { color: colorFor(slice.name) },
        })),
      }
    ]
  } : {};

  return (
    <div className="w-full h-full flex flex-col pt-2">
      <div className="flex-1 w-full min-h-0 relative">
        {/* absolute inset-0 prevents unbounded height in iframes */}
        {hasData ? (
          <div className="absolute inset-0">
            <ReactECharts
              option={option}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
              notMerge={true}
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
            <span className="text-2xl font-bold text-slate-300 dark:text-slate-600">{unit === 'MT' ? '0' : '—'}</span>
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mt-1">Saluran Pasaran</span>
            <span className="text-[10px] italic text-slate-400 dark:text-slate-500 mt-2">Tiada data saluran pasaran tersedia buat masa ini</span>
          </div>
        )}
      </div>
    </div>
  );
}
