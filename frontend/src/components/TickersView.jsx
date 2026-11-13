import React, { useState } from 'react';
import { Search, ArrowLeft, Calendar, TrendingUp } from 'lucide-react';
import { formatExactCurrency, getTickerBadgeClass } from '../renderers.jsx';

export default function TickersView({ activeAccount, currentYear }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('pnl_desc');
  const [selectedTicker, setSelectedTicker] = useState(null); // Estado para ver el detalle de un ticker

  const tickerStats = {};
  const tickerTradesMap = {};

  Object.keys(activeAccount.appData || {}).forEach(dateKey => {
    if (dateKey.startsWith(`${currentYear}`)) {
      (activeAccount.appData[dateKey] || []).forEach(t => {
        const sym = (t.ticker || 'OTHER').split(' ')[0].toUpperCase().trim();
        
        if (!tickerStats[sym]) {
          tickerStats[sym] = { ticker: sym, total: 0, pnl: 0, wins: 0, losses: 0, invested: 0 };
          tickerTradesMap[sym] = [];
        }

        const p = Number(t.pnl || 0);
        tickerStats[sym].total++;
        tickerStats[sym].pnl += p;
        tickerStats[sym].invested += Number(t.costBasis || 0);
        if (p > 0) tickerStats[sym].wins++;
        else if (p < 0) tickerStats[sym].losses++;

        tickerTradesMap[sym].push({ ...t, dateKey });
      });
    }
  });

  // Si hay un ticker seleccionado, mostramos su detalle de transacciones
  if (selectedTicker) {
    const tradesList = tickerTradesMap[selectedTicker] || [];
    tradesList.sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey)); // Más nuevo arriba

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <button 
            onClick={() => setSelectedTicker(null)}
            className="px-3 py-1.5 rounded-xl bg-[#131B2E] text-blue-400 hover:bg-slate-800 transition text-xs font-bold flex items-center gap-1.5 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Tickers
          </button>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-xl font-black text-xs ${getTickerBadgeClass(selectedTicker)}`}>
              {selectedTicker}
            </span>
            <span className="text-xs text-slate-400 font-bold">({tradesList.length} operaciones en {currentYear})</span>
          </div>
        </div>

        {/* TABLA DE TRANSACCIONES DEL TICKER */}
        <div className="rounded-2xl border border-slate-800 bg-[#0b101d] overflow-hidden">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#131B2E] text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-3 text-center">Tipo / Contratos</th>
                  <th className="py-3 px-3 text-center">Strike / DTE</th>
                  <th className="py-3 px-3 text-right">Inversión</th>
                  <th className="py-3 px-4 text-right">P&amp;L Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tradesList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-500">No hay transacciones registradas para este activo.</td>
                  </tr>
                ) : (
                  tradesList.map((t, idx) => {
                    const isWin = Number(t.pnl || 0) >= 0;
                    const isOpt = ['CALL', 'PUT'].includes((t.type || '').toUpperCase());

                    return (
                      <tr key={t.id || idx} className="hover:bg-[#131B2E]/50 transition">
                        <td className="py-3 px-4 font-bold text-slate-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" /> {t.dateKey}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-300">
                          {t.qty} {isOpt ? 'ctos' : 'acc'} ({t.type})
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-400">
                          {isOpt ? `${t.strike || '-'} (${t.dte || '-'})` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-300">
                          {formatExactCurrency(t.costBasis)}
                        </td>
                        <td className={`py-3 px-4 text-right font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatExactCurrency(t.pnl)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Vista general de tarjetas de tickers
  let list = Object.values(tickerStats).filter(item => 
    item.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  list.sort((a, b) => {
    if (sortBy === 'pnl_desc') return b.pnl - a.pnl;
    if (sortBy === 'pnl_asc') return a.pnl - b.pnl;
    if (sortBy === 'trades') return b.total - a.total;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-black tracking-wide text-slate-200 uppercase">COMPAÑÍAS &amp; ACTIVOS ({currentYear})</h2>
          <p className="text-[10px] text-slate-500">Haz clic en una empresa para ver sus trades detallados</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            placeholder="Buscar por ticker (SPY, TSLA, AMD...)" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0b101d] border border-slate-800 text-white text-xs outline-none focus:border-blue-500 transition"
          />
        </div>
        <select 
          value={sortBy} 
          onChange={e => setSortBy(e.target.value)}
          className="w-full sm:w-auto bg-[#0b101d] border border-slate-800 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer"
        >
          <option value="pnl_desc">Mayor P&amp;L</option>
          <option value="pnl_asc">Menor P&amp;L</option>
          <option value="trades">Más Operaciones</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[450px] overflow-y-auto pr-1">
        {list.length === 0 ? (
          <div className="col-span-2 text-center py-10 text-slate-500 text-xs">No se encontraron activos operados en este periodo.</div>
        ) : (
          list.map(data => {
            const decided = data.wins + data.losses;
            const winRate = decided > 0 ? Math.round((data.wins / decided) * 100) : 100;
            const roi = data.invested > 0 ? ((data.pnl / data.invested) * 100).toFixed(1) : '0.0';
            const isWin = data.pnl >= 0;

            return (
              <div 
                key={data.ticker} 
                onClick={() => setSelectedTicker(data.ticker)}
                className="p-4 rounded-3xl border border-slate-800 bg-[#0d1424] flex flex-col justify-between space-y-4 hover:border-blue-500/50 cursor-pointer transition shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-3 py-1 rounded-xl font-black text-xs ${getTickerBadgeClass(data.ticker)}`}>
                      {data.ticker}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                      {winRate}% Win
                    </span>
                  </div>
                  <span className={`text-base font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatExactCurrency(data.pnl)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Trades:</span>
                    <span className="font-bold text-slate-200">{data.total} <span className="text-[10px] text-slate-400 font-normal">({data.wins}W / {data.losses}L)</span></span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Inversión Total:</span>
                    <span className="font-bold text-slate-200 block">{formatExactCurrency(data.invested)}</span>
                    <span className={`font-extrabold text-[11px] ${Number(roi) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {Number(roi) >= 0 ? `+${roi}%` : `${roi}%`} ROI
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}