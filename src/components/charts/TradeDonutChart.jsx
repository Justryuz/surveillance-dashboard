import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function TradeDonutChart({ 
  data, 
  colors, 
  legendPos = 'left', 
  centerValue = '0', 
  centerLabel = 'Jumlah', 
  isDarkMode = false 
}) {
  // Push the donut to the opposite side of the legend
  const centerX = legendPos === 'left' ? '65%' : '35%';

  // Inject SVG Icons into the Legend
  const legendData = data.map(item => {
    let icon = 'circle';
    if (item.name === 'Laut') {
      icon = 'path://M20,21C16.6,21 13.4,19.8 11.1,18C8.8,19.8 5.6,21 2,21V19C4.9,19 7.6,18.1 9.9,16.5L11.1,15.6L12.3,16.5C14.6,18.1 17.3,19 20,19V21ZM22,17C21.3,17 20.6,16.9 20,16.8L18,8H17V6C17,4.9 16.1,4 15,4H9C7.9,4 7,4.9 7,6V8H6L4,16.8C3.4,16.9 2.7,17 2,17V15L3.4,8.2C3.6,7.5 4.3,7 5,7H19C19.7,7 20.4,7.5 20.6,8.2L22,15V17Z';
    } else if (item.name === 'Darat') {
      icon = 'path://M20,8H17V4H3C1.89,4 1,4.89 1,6V17H3C3,18.66 4.34,20 6,20C7.66,20 9,18.66 9,17H15C15,18.66 16.34,20 18,20C19.66,20 21,18.66 21,17H23V12L20,8ZM6,18.5C5.17,18.5 4.5,17.83 4.5,17C4.5,16.17 5.17,15.5 6,15.5C6.83,15.5 7.5,16.17 7.5,17C7.5,17.83 6.83,18.5 6,18.5ZM18,18.5C17.17,18.5 16.5,17.83 16.5,17C16.5,16.17 17.17,15.5 18,15.5C18.83,15.5 19.5,16.17 19.5,17C19.5,17.83 18.83,18.5 18,18.5ZM17,12V9.5H19.5L21.47,12H17Z';
    } else if (item.name === 'Udara') {
      icon = 'path://M21,16V14L13,9V3.5C13,2.67 12.33,2 11.5,2C10.67,2 10,2.67 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z';
    }
    return { name: item.name, icon: icon };
  });

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}%',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: colors[0], 
      borderWidth: 1,
      textStyle: { color: '#f8fafc', fontSize: 10 }
    },
    // We removed the static graphic setting entirely!
    legend: {
      orient: 'vertical',
      top: 'center',
      left: legendPos === 'left' ? '5%' : undefined,
      right: legendPos === 'right' ? '5%' : undefined,
      itemWidth: 16,
      itemHeight: 16,
      itemGap: 15,
      itemStyle: {
        borderWidth: 0 // Removes the border from the SVG icons completely
      },
      textStyle: { color: isDarkMode ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: 'bold' },
      data: legendData
    },
    color: colors,
    series: [
      {
        type: 'pie',
        radius: ['58%', '85%'], 
        center: [centerX, '50%'], 
        itemStyle: {
          borderWidth: 0, 
          borderRadius: 3,
          shadowBlur: 10, 
          shadowColor: 'rgba(0, 0, 0, 0.4)',
          shadowOffsetX: 2,
          shadowOffsetY: 3
        },
        label: {
          show: true, 
          position: 'inner', 
          formatter: '{c}%',
          color: '#fff',
          fontSize: 10,
          fontWeight: 'bold',
          textShadowBlur: 3,
          textShadowColor: 'rgba(0,0,0,0.6)'
        },
        labelLine: {
          show: false
        },
        data: data
      }
    ]
  };

  return (
    <div className="w-full h-full flex-1 relative flex flex-col justify-center min-h-0">
      
      {/* Chart fills container via absolute positioning — prevents unbounded height in iframes */}
      <div className="absolute inset-0">
        <ReactECharts 
          option={option} 
          style={{ height: '100%', width: '100%' }} 
          opts={{ renderer: 'svg' }}
          notMerge={true}
        />
      </div>

      {/* HTML Overlay Layer for center label */}
      <div 
        className="absolute top-1/2 flex flex-col items-center justify-center pointer-events-none"
        style={{ 
          left: centerX, 
          transform: 'translate(-50%, -50%)',
          width: '50%'
        }}
      >
        <span className={`font-black text-sm md:text-base leading-none tracking-tight mb-1 ${isDarkMode ? 'text-slate-50' : 'text-slate-800'}`}>
          {centerValue}
        </span>
        <span className={`font-bold text-[8px] md:text-[9px] uppercase tracking-wider leading-none text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {centerLabel}
        </span>
      </div>

    </div>
  );
}