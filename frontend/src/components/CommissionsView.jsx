import React, { useState } from 'react';
import { Receipt } from 'lucide-react';
import { formatExactCurrency, getTickerBadgeClass } from '../renderers.jsx';

export default function CommissionsView({ activeAccount, currentYear }) {
  const [commissionPerContract, setCommissionPerContract] = useState(1.30);

  const brokerName = (activeAccount.broker || '').toUpperCase();
  const isIbkr = brokerName.includes('IBKR') || brokerName.includes('INTERACTIVE');

  let totalComms = 0;
  let totalContracts = 0;
  let totalShares = 0;
  let grossPnlTotal = 0;
  const tickerStats = {};

  Object.keys(activeAccount.appData || {}).forEach(k => {
    if (k.startsWith(`${currentYear}`)) {
      (activeAccount.appData[k] || []).forEach(t => {
        const sym = (t.ticker || 'OTHER').split(' ')[0].toUpperCase().trim();
        const qty = parseInt(t.qty, 10) || 0;
        const pnlNet = Number(t.pnl || 0);
        const tType = (t.type || '').toUpperCase();
        const isOption = ['CALL', 'PUT'].includes(tType);

        // Comisión real o estimada
        let comm = Number(t.commission || 0);
        if (!isIbkr && comm === 0 && isOption) {
          comm = qty * commissionPerContract;
        }

        const pnlBruto = pnlNet + comm;

        totalComms += comm;
        if (isOption) totalContracts += qty;
        else totalShares += qty;

        grossPnlTotal += pnlBruto;

        if (!tickerStats[sym]) {
          tickerStats[sym] = { ticker: sym, contracts: 0, shares: 0, commission: 0, pnlBruto: 0, pnlNet: 0, isOptionTicker: isOption };
        }
        if (isOption) tickerStats[sym].contracts += qty;
        else tickerStats[sym].shares += qty;

        tickerStats[sym].commission += comm;
        tickerStats[sym].pnlBruto += pnlBruto;
        tickerStats[sym].pnlNet += pnlNet;
      });
    }
  });

  const list = Object.values(tickerStats).sort((a, b) => b.pnlNet - a.pnlNet);
  
  // Cálculo seguro del impacto considerando pérdidas o ganancias
  const baseDenominator = Math.abs(grossPnlTotal) > 0 ? Math.abs(grossPnlTotal) : Math.abs(totalNet);
  const impactPct = baseDenominator > 0 ? ((totalComms / baseDenominator) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-black tracking-wide text-slate-200 uppercase">COMISIONES Y RENDIMIENTO NETO ({currentYear})</h2>
      <p className="text-[10px] text-slate-500">Desglose de comisiones y volumen operado por activo</p>

      {/* INPUT DE COMISIÓN ESTIMADA (SOLO SI NO ES IBKR) */}
      {!isIbkr && (
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-bold">
            <span className="p-1 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Receipt className="w-4 h-4" />
            </span>
            Comisión estimada por contrato (Round-trip):
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">$</span>
            <input 
              type="number" 
              step="0.05" 
              value={commissionPerContract} 
              onChange={e => setCommissionPerContract(parseFloat(e.target.value) || 0)} 
              className="w-24 px-3 py-1.5 text-right font-bold rounded-xl bg-[#131B2E] border border-slate-700 text-white outline-none focus:border-blue-500" 
            />
            <span className="text-[10px] text-slate-500">(ej. $0.65 x 2)</span>
          </div>
        </div>
      )}

      {/* TARJETAS DE RESUMEN SUPERIOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">VOLUMEN OPERADO</span>
          <span className="text-sm font-black text-white mt-2">
            {totalContracts > 0 ? `${totalContracts} ctos` : ''} 
            {totalContracts > 0 && totalShares > 0 ? ' / ' : ''} 
            {totalShares > 0 ? `${totalShares} acciones` : ''}
            {totalContracts === 0 && totalShares === 0 ? '0 ops' : ''}
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TOTAL COMISIONES</span>
          <span className="text-lg font-black text-rose-400 mt-2">{formatExactCurrency(totalComms)}</span>
        </div>
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">IMPACTO EN P&amp;L</span>
          <span className="text-base font-black text-slate-200 mt-2">{impactPct}% de ganancia bruta</span>
        </div>
      </div>

      {/* TABLA DETALLADA DE COMISIONES POR TICKER */}
      <div className="rounded-2xl border border-slate-800 bg-[#0b101d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131B2E] text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Ticker</th>
                <th className="py-3 px-3 text-center">Volumen / Unidades</th>
                <th className="py-3 px-3 text-right">{isIbkr ? 'Comisión Real' : 'Comisión Est.'}</th>
                <th className="py-3 px-3 text-right">P&amp;L Bruto</th>
                <th className="py-3 px-4 text-right">P&amp;L Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {list.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-500">No hay operaciones registradas para calcular comisiones.</td>
                </tr>
              ) : (
                list.map(s => {
                  const volDisplay = s.contracts > 0 ? `${s.contracts} ctos` : `${s.shares} acciones`;
                  return (
                    <tr key={s.ticker} className="hover:bg-[#131B2E]/50 transition">
                      <td className="py-3 px-4 font-bold">
                        <span className={`px-2 py-0.5 rounded-lg font-black ${getTickerBadgeClass(s.ticker)}`}>
                          {s.ticker}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-300">{volDisplay}</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-400">{formatExactCurrency(s.commission)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-300">{formatExactCurrency(s.pnlBruto)}</td>
                      <td className={`py-3 px-4 text-right font-black ${s.pnlNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatExactCurrency(s.pnlNet)}
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