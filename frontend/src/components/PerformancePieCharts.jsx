import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function PerformancePieCharts({ activeAccount, activeTab, currentYear, currentMonth }) {
  let grossGains = 0;
  let grossLosses = 0;
  let winCount = 0;
  let lossCount = 0;

  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  Object.keys(activeAccount.appData || {}).forEach(k => {
    const matchesPeriod = activeTab === 'Month' ? k.startsWith(monthPrefix) : k.startsWith(`${currentYear}`);
    if (matchesPeriod) {
      (activeAccount.appData[k] || []).forEach(t => {
        const p = Number(t.pnl || 0);
        if (p > 0) {
          grossGains += p;
          winCount++;
        } else if (p < 0) {
          grossLosses += Math.abs(p);
          lossCount++;
        }
      });
    }
  });

  // Cálculo Neto exacto
  const netPnL = grossGains - grossLosses;
  const isNetProfit = netPnL >= 0;
  const absNet = Math.abs(netPnL);

  // Datos netos puros para el gráfico y la leyenda
  const netChartData = isNetProfit ? [
    { name: 'Ganancia Neta', value: netPnL }
  ] : [
    { name: 'Pérdida Neta', value: absNet }
  ];

  const NET_COLORS = [isNetProfit ? '#10b981' : '#ef4444'];

  // Cálculos para Win Rate (Trades)
  const totalTradesCount = winCount + lossCount;
  const winRatePct = totalTradesCount > 0 ? ((winCount / totalTradesCount) * 100).toFixed(2) : '0.00';
  const lossRatePct = totalTradesCount > 0 ? ((lossCount / totalTradesCount) * 100).toFixed(2) : '0.00';

  const winRateData = [
    { name: 'Ganadores', value: winCount },
    { name: 'Perdedores', value: lossCount }
  ];

  const WIN_COLORS = ['#10b981', '#ef4444'];
  const hasData = absNet > 0;
  const hasWinData = totalTradesCount > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      
      {/* 1. Gráfico exclusivo de Ganancia Neta o Pérdida Neta */}
      <div className="p-4 rounded-3xl border border-slate-800 bg-[#090D16] flex flex-col justify-between space-y-3 shadow-inner">
        <div className="w-full flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            {isNetProfit ? 'Ganancia Neta' : 'Pérdida Neta'} ({activeTab === 'Month' ? `Mes ${currentMonth + 1}` : `Año ${currentYear}`})
          </span>
        </div>

        <div className="flex items-center justify-between w-full h-32">
          <div className="w-1/2 h-full flex items-center justify-center">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={netChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={50}
                    dataKey="value"
                  >
                    {netChartData.map((entry, index) => (
                      <Cell key={`cell-net-${index}`} fill={NET_COLORS[index % NET_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#131b2e', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                    formatter={(value) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-500">Sin datos netos</span>
            )}
          </div>

          {/* Leyenda limpia y directa exclusivamente con el resultado neto */}
          <div className="w-1/2 flex flex-col justify-center space-y-2 pl-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${isNetProfit ? 'bg-[#10b981]' : 'bg-[#ef4444]'} flex-shrink-0`}></span>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-bold">
                  {isNetProfit ? 'Ganancia Neta' : 'Pérdida Neta'}
                </span>
                <span className={`font-black text-sm ${isNetProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isNetProfit ? `+$${netPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `-$${absNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Torta de Win Rate / Efectividad (Trades) */}
      <div className="p-4 rounded-3xl border border-slate-800 bg-[#090D16] flex flex-col justify-between space-y-3 shadow-inner">
        <div className="w-full flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Win Rate / Efectividad (Trades)
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
            {totalTradesCount} Trades Totales
          </span>
        </div>

        <div className="flex items-center justify-between w-full h-32">
          <div className="w-1/2 h-full flex items-center justify-center">
            {hasWinData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winRateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={50}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {winRateData.map((entry, index) => (
                      <Cell key={`cell-win-${index}`} fill={WIN_COLORS[index % WIN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#131b2e', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                    formatter={(value, name) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-500">Sin trades</span>
            )}
          </div>

          <div className="w-1/2 flex flex-col justify-center space-y-2 pl-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] flex-shrink-0"></span>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase font-bold">Ganadores</span>
                <span className="text-white font-extrabold text-xs">{winRatePct}%</span>
                <span className="text-[9px] text-emerald-400">{winCount} trades</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] flex-shrink-0"></span>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase font-bold">Perdedores</span>
                <span className="text-white font-extrabold text-xs">{lossRatePct}%</span>
                <span className="text-[9px] text-rose-400">{lossCount} trades</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}