import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatExactCurrency } from '../renderers.jsx';

export default function YearView({ activeAccount, currentYear, setCurrentMonth, setActiveTab }) {
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  // Preparar datos cronológicos para los gráficos de la vista anual
  const chartData = [];
  let cumulativePnl = 0;
  
  let baseCapital = 0;
  (activeAccount.capitalFlows || []).forEach(f => {
    const amt = Number(f.amount || 0);
    if (f.type === 'deposit' || f.type === 'transfer_in') baseCapital += amt;
    else if (f.type === 'withdrawal' || f.type === 'transfer_out') baseCapital -= amt;
  });

  let runningCapital = baseCapital;
  const sortedDates = Object.keys(activeAccount.appData || {}).sort((a, b) => new Date(a) - new Date(b));

  sortedDates.forEach(dateKey => {
    if (dateKey.startsWith(`${currentYear}`)) {
      let dayPnl = 0;
      (activeAccount.appData[dateKey] || []).forEach(t => {
        dayPnl += Number(t.pnl || 0);
      });

      cumulativePnl += dayPnl;
      runningCapital += dayPnl;

      const dateFormatted = new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      chartData.push({
        date: dateFormatted,
        pnlAcumulado: cumulativePnl,
        capitalReal: runningCapital
      });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black tracking-wide text-slate-200 uppercase">Resumen Anual y Evolución: {currentYear}</h2>
      </div>

      {/* CUADRÍCULA DE LOS 12 MESES */}
      <div className="grid grid-cols-3 gap-2.5">
        {monthNames.map((mName, mIdx) => {
          const monthPrefix = `${currentYear}-${String(mIdx + 1).padStart(2, '0')}`;
          let mPnl = 0, mTrades = 0;
          
          Object.keys(activeAccount.appData || {}).forEach(k => {
            if (k.startsWith(monthPrefix)) {
              (activeAccount.appData[k] || []).forEach(t => {
                mPnl += Number(t.pnl || 0);
                mTrades++;
              });
            }
          });

          return (
            <div 
              key={mName} 
              onClick={() => { 
                setCurrentMonth(mIdx); 
                setActiveTab('Month'); 
              }} 
              className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424] cursor-pointer hover:border-blue-500 transition shadow-md"
            >
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">{mName}</span>
                <span className="text-slate-400 text-[10px]">{mTrades} trades</span>
              </div>
              <div className={`text-sm font-black mt-2 ${mPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatExactCurrency(mPnl)}
              </div>
            </div>
          );
        })}
      </div>

      {/* GRÁFICOS DE EVOLUCIÓN (P&L ACUMULADO Y CAPITAL REAL) */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          
          {/* Gráfico de P&L Acumulado */}
          <div className="p-5 rounded-3xl border border-slate-800 bg-[#0b101d] space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Curva de P&amp;L Acumulado</span>
              <span className={`text-xs font-black ${cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatExactCurrency(cumulativePnl)}
              </span>
            </div>
            
            <div className="h-[180px] w-full">
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

          {/* Gráfico de Capital Real en el Broker */}
          <div className="p-5 rounded-3xl border border-slate-800 bg-[#0b101d] space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Evolución del Capital Total</span>
              <span className="text-xs font-black text-white">
                {formatExactCurrency(runningCapital)}
              </span>
            </div>
            
            <div className="h-[180px] w-full">
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
      )}
    </div>
  );
}