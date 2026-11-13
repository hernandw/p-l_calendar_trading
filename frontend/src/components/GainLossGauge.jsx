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

  // Dimensiones geométricas exactas del semicírculo
  const R = 60; // Radio
  const stroke = 12;
  const cx = 70;
  const cy = 70;
  
  // Semicírculo superior perfecto
  const pathData = `M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`;
  const semiCircumference = Math.PI * R; // Longitud exacta del arco

  // Longitud proporcional para el segmento verde (desde la izquierda)
  const greenLength = (numericRatio / 100) * semiCircumference;

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

      {/* TACÓMETRO CONTINUO Y EXACTO */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <svg width="140" height="85" viewBox="0 0 140 85" className="overflow-visible">
          {/* Fondo / Segmento de Pérdidas (Rojo completo) */}
          <path
            d={pathData}
            fill="none"
            stroke="#ef4444"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Segmento de Ganancias (Verde sólido desde el inicio izquierdo) */}
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
}import React from 'react';

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

  // Dimensiones geométricas exactas del semicírculo
  const R = 60; // Radio
  const stroke = 12;
  const cx = 70;
  const cy = 70;
  
  // Semicírculo superior perfecto
  const pathData = `M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`;
  const semiCircumference = Math.PI * R; // Longitud exacta del arco

  // Longitud proporcional para el segmento verde (desde la izquierda)
  const greenLength = (numericRatio / 100) * semiCircumference;

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

      {/* TACÓMETRO CONTINUO Y EXACTO */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <svg width="140" height="85" viewBox="0 0 140 85" className="overflow-visible">
          {/* Fondo / Segmento de Pérdidas (Rojo completo) */}
          <path
            d={pathData}
            fill="none"
            stroke="#ef4444"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Segmento de Ganancias (Verde sólido desde el inicio izquierdo) */}
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