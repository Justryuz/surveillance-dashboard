import React from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

export default function MarketPieChart({ 
  totalPengeluaran = 712500, 
  unit = "MT", 
  isDarkMode = false,
  pieData = [35, 30, 20, 15]
}) {
  const option = {
    backgroundColor: 'transparent',
    title: { show: false }, 
    
    // Using graphic to precisely position both the center text and the legend title
    graphic: [
      {
        type: 'text',
        left: '0%', 
        top: '32%', // Matches the legend's exact center anchor!
        style: {
          text: 'SALURAN PASARAN',
          fill: isDarkMode ? '#94a3b8' : '#64748b', 
          font: 'bold 12px sans-serif',
          letterSpacing: 1,
          y: -65 // Pushes it exactly 65px above the center line, locking it right above the legend
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
      formatter: '{b}: {c}%',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#3b82f6',
      textStyle: { color: '#f8fafc' }
    },

    legend: {
      orient: 'vertical',
      left: '0%',
      top: 'center', // Sits at exactly 50% height
      itemWidth: 14,
      itemHeight: 14,
      itemGap: 12,
      icon: 'circle',
      textStyle: { color: '#64748b', fontSize: 11, fontWeight: 'bold' }
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

        data: [
          { 
            value: pieData[0], 
            name: 'Dalam Daerah', 
            itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#60a5fa' }, { offset: 1, color: '#1d4ed8' }]) } 
          },
          { 
            value: pieData[1], 
            name: 'Luar Daerah', 
            itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#047857' }]) } 
          },
          { 
            value: pieData[2], 
            name: 'Luar Negeri', 
            itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#fcd34d' }, { offset: 1, color: '#b45309' }]) } 
          },
          { 
            value: pieData[3], 
            name: 'Eksport', 
            itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#fb923c' }, { offset: 1, color: '#c2410c' }]) } 
          }
        ]
      }
    ]
  };

  return (
    <div className="w-full h-full flex flex-col pt-2">
      <div className="flex-1 w-full min-h-0 relative">
        <div className="absolute inset-0">
          <ReactECharts 
            option={option} 
            style={{ height: '100%', width: '100%' }} 
            opts={{ renderer: 'svg' }}
            notMerge={true} 
          />
        </div>
      </div>
    </div>
  );
}