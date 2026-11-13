import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatExactCurrency } from '../renderers.jsx';

export default function PerformanceCharts({ activeAccount, currentYear }) {
  // Procesar datos cronológicamente para los gráficos
  const chartData = [];
  let cumulativePnl = 0;
  
  // Calcular capital neto inicial de flujos
  let baseCapital = 0;
  (activeAccount.capitalFlows || []).forEach(f => {
    const amt = Number(f.amount || 0);
    if (f.type === 'deposit' || f.type === 'transfer_in') baseCapital += amt;
    else if (f.type === 'withdrawal' || f.type === 'transfer_out') baseCapital -= amt;
  });

  let runningCapital = baseCapital;

  // Ordenar todas las fechas con trades en orden cronológico
  const sortedDates = Object.keys(activeAccount.appData || {}).sort((a, b) => new Date(a) - new Date(b));

  sortedDates.forEach(dateKey => {
    if (dateKey.startsWith(`${currentYear}`)) {
      let dayPnl = 0;
      (activeAccount.appData[dateKey] || []).forEach(t => {
        dayPnl += Number(t.pnl || 0);
      });

      cumulativePnl += dayPnl;
      runningCapital += dayPnl;

      // Formato corto de fecha para el eje X (ej. Nov 10)
      const dateFormatted = new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      chartData.push({
        date: dateFormatted,
        fullDate: dateKey,
        pnlAcumulado: cumulativePnl,
        capitalReal: runningCapital
      });
    }
  });

  if (chartData.length === 0) {
    return (
      <div className="p-6 rounded-3xl border border-slate-800 bg-[#0b101d] text-center text-slate-500 text-xs">
        No hay suficientes datos de operaciones en {currentYear} para mostrar los gráficos de evolución.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      {/* GRÁFICO 1: EVOLUCIÓN DEL P&L ACUMULADO */}
      <div className="p-5 rounded-3xl border border-slate-800 bg-[#0b101d] space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Evolución P&amp;L Acumulado ({currentYear})</span>
          <span className={`text-xs font-black ${cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatExactCurrency(cumulativePnl)}
          </span>
        </div>
        
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cumulativePnl >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={cumulativePnl >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#131B2E', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                formatter={(value) => [formatExactCurrency(value), 'P&L Acumulado']}
              />
              <Area type="monotone" dataKey="pnlAcumulado" stroke={cumulativePnl >= 0 ? '#10b981' : '#f43f5e'} strokeWidth={2} fillOpacity={1} fill="url(#colorPnl)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 2: EVOLUCIÓN DEL CAPITAL REAL EN EL BROKER */}
      <div className="p-5 rounded-3xl border border-slate-800 bg-[#0b101d] space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Evolución del Capital Total en Broker</span>
          <span className="text-xs font-black text-white">
            {formatExactCurrency(runningCapital)}
          </span>
        </div>
        
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCap" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#131B2E', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                formatter={(value) => [formatExactCurrency(value), 'Capital Total']}
              />
              <Area type="monotone" dataKey="capitalReal" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCap)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}