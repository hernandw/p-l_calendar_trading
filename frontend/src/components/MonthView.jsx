import React from 'react';
import { formatExactCurrency, getTickerBadgeClass, formatMoney } from '../renderers.jsx';

export default function TickersView({ activeAccount, currentYear }) {
  const tickerStats = {};
  Object.keys(activeAccount.appData || {}).forEach(k => {
    if (k.startsWith(`${currentYear}`)) {
      (activeAccount.appData[k] || []).forEach(t => {
        const sym = (t.ticker || 'OTHER').split(' ')[0].toUpperCase().trim();
        if (!tickerStats[sym]) tickerStats[sym] = { ticker: sym, total: 0, pnl: 0, wins: 0, losses: 0, invested: 0 };
        const p = Number(t.pnl || 0);
        tickerStats[sym].total++;
        tickerStats[sym].pnl += p;
        tickerStats[sym].invested += Number(t.costBasis || 0);
        if (p > 0) tickerStats[sym].wins++;
        else if (p < 0) tickerStats[sym].losses++;
      });
    }
  });

  const list = Object.values(tickerStats);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-black tracking-wide text-slate-200">Activos Operados ({currentYear})</h2>
      <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
        {list.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">No hay operaciones en este año.</div>
        ) : (
          list.map(data => {
            const decided = data.wins + data.losses;
            const winRate = decided > 0 ? Math.round((data.wins / decided) * 100) : 100;
            const roi = data.invested > 0 ? ((data.pnl / data.invested) * 100).toFixed(1) : '0.0';
            return (
              <div key={data.ticker} className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424] grid grid-cols-3 gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-lg font-black ${getTickerBadgeClass(data.ticker)}`}>{data.ticker}</span>
                  <span className="font-black text-sm text-white">{winRate}% Win</span>
                </div>
                <div className='text-center text-slate-400'>
                  <span className='block text-slate-300 font-bold'>{data.total} trades</span>
                  ( {data.wins}W / {data.losses}L )
                </div>
                <div className='text-right'>
                  <span className={`font-extrabold text-sm block ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatExactCurrency(data.pnl)}</span>
                  <span className='text-slate-400 font-semibold'>Inv: {formatExactCurrency(data.invested)} | ROI: {roi}%</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}