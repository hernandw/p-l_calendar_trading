import React from 'react';

export default function GainLossGauge({ activeAccount, activeTab, currentYear, currentMonth }) {
  let grossGains = 0;
  let grossLosses = 0;
  let winCount = 0;
  let totalTradesCount = 0;

  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  // Recorrer los trades según el filtro activo (Mes o Año)
  Object.keys(activeAccount.appData || {}).forEach(k => {
    const matchesPeriod = activeTab === 'Month' ? k.startsWith(monthPrefix) : k.startsWith(`${currentYear}`);
    if (matchesPeriod) {
      (activeAccount.appData[k] || []).forEach(t => {
        const p = Number(t.pnl || 0);
        totalTradesCount++;
        if (p > 0) { 
          grossGains += p; 
          winCount++; 
        } else if (p < 0) { 
          grossLosses += Math.abs(p); 
        }
      });
    }
  });

  // Cálculo del Win Rate / Efectividad
  const winRate = totalTradesCount > 0 ? ((winCount / totalTradesCount) * 100).toFixed(2) : '0.00';
  const numericRatio = parseFloat(winRate);

  // Dimensiones geométricas del semicírculo SVG
  const R = 60;
  const stroke = 12;
  const cx = 70;
  const cy = 70;
  
  const pathData = `M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`;
  const semiCircumference = Math.PI * R; 

  // Longitud del arco verde proporcional al porcentaje de aciertos
  const greenLength = (numericRatio / 100) * semiCircumference;

  return (
    <div className="p-5 rounded-3xl border border-slate-800 bg-[#0b101d] flex flex-col items-center justify-between space-y-3 shadow-xl">
      <div className="w-full flex items-center justify-between">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
          Win Rate / Efectividad ({activeTab === 'Month' ? 'Mensual' : 'Anual'})
        </span>
        <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
          {activeTab === 'Month' ? `Mes ${currentMonth + 1}` : `Año ${currentYear}`}
        </span>
      </div>

      {/* TACÓMETRO */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <svg width="140" height="85" viewBox="0 0 140 85" className="overflow-visible">
          {/* Fondo rojo (Trades perdedores / Pérdidas) */}
          <path
            d={pathData}
            fill="none"
            stroke="#ef4444"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Arco verde proporcional al porcentaje real de aciertos */}
          <path
            d={pathData}
            fill="none"
            stroke="#10b981"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${greenLength} ${semiCircumference}`}
            style={{ transition: 'stroke-dasharray 0.6s ease-in-out' }}
          />
        </svg>

        <div className="absolute bottom-0 flex flex-col items-center">
          <span className="text-xl font-black text-white tracking-tight">{numericRatio}%</span>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
        <div className="text-left">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Trades Ganadores:</span>
          <span className="font-black text-emerald-400">{winCount} de {totalTradesCount}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Efectividad:</span>
          <span className="font-black text-white">{numericRatio}%</span>
        </div>
      </div>
    </div>
  );
}