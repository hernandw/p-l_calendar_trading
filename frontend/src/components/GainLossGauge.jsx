import React from 'react';

export default function GainLossGauge({ activeAccount, activeTab, currentYear, currentMonth }) {
  let grossGains = 0;
  let grossLosses = 0;

  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  Object.keys(activeAccount.appData || {}).forEach(k => {
    const matchesPeriod = activeTab === 'Month' ? k.startsWith(monthPrefix) : k.startsWith(`${currentYear}`);
    if (matchesPeriod) {
      (activeAccount.appData[k] || []).forEach(t => {
        const p = Number(t.pnl || 0);
        if (p > 0) grossGains += p;
        else if (p < 0) grossLosses += Math.abs(p);
      });
    }
  });

  const totalVolume = grossGains + grossLosses;
  const ratio = totalVolume > 0 ? ((grossGains / totalVolume) * 100).toFixed(2) : '0.00';
  const numericRatio = parseFloat(ratio);

  // Coeficiente del semicírculo (180 grados -> longitud de arco aprox 220)
  const radius = 70;
  const stroke = 14;
  const normalizedRadius = radius - stroke * 2;
  const circumference = Math.PI * normalizedRadius; 

  // Longitudes proporcionales para el verde (ganancias) y rojo (pérdidas)
  const greenLength = (numericRatio / 100) * circumference;
  const redLength = circumference - greenLength;

  return (
    <div className="p-5 rounded-3xl border border-slate-800 bg-[#0b101d] flex flex-col items-center justify-between space-y-3 shadow-xl">
      <div className="w-full flex items-center justify-between">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
          Gain/Loss Ratio ({activeTab === 'Month' ? 'Mensual' : 'Anual'})
        </span>
        <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
          {activeTab === 'Month' ? `Mes ${currentMonth + 1}` : `Año ${currentYear}`}
        </span>
      </div>

      {/* TACÓMETRO LIMPIO Y CONTINUO */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <svg height={radius * 1.3} width={radius * 2.2} className="overflow-visible">
          {/* Fondo / Segmento de Pérdidas (Rojo) */}
          <path
            d={`M ${stroke},${radius} A ${normalizedRadius},${normalizedRadius} 0 0,1 ${radius * 2 - stroke},${radius}`}
            fill="none"
            stroke="#ef4444"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Segmento Proporcional de Ganancias (Verde sólido a un lado) */}
          <path
            d={`M ${stroke},${radius} A ${normalizedRadius},${normalizedRadius} 0 0,1 ${radius * 2 - stroke},${radius}`}
            fill="none"
            stroke="#10b981"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${greenLength} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.6s ease-in-out' }}
          />
        </svg>

        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-xl font-black text-white tracking-tight">{numericRatio}%</span>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
        <div className="text-left">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Ganancias:</span>
          <span className="font-black text-emerald-400">+${grossGains.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Pérdidas:</span>
          <span className="font-black text-rose-400">-${grossLosses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}