
import { formatExactCurrency } from '../renderers.jsx';

export default function MetricsFooter({ activeTab, netGains, grossGains, grossLosses, schwabRatio, winRatePct, winCount, totalTradesCount }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
      <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
  {netGains >= 0 ? 'Ganancia Neta (Mes)' : 'Pérdida Neta (Mes)'}
</span>
        <span className={`text-base font-black mt-3 ${netGains >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatExactCurrency(netGains)}
        </span>
      </div>
      <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">RELACIÓN G/P</span>
        <span className="text-base font-black text-rose-400 mt-3">{schwabRatio}%</span>
      </div>
      <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TOTALES G / P</span>
        <div className="mt-2 text-xs font-bold space-y-0.5">
          <div className="text-emerald-400">{formatExactCurrency(grossGains)}</div>
          <div className="text-rose-400">{formatExactCurrency(grossLosses)}</div>
        </div>
      </div>
      <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ACIERTO TRADES</span>
        <div className="mt-2">
          <span className="text-base font-black text-white">{winRatePct}%</span>
          <span className="text-[10px] text-slate-400 block">({winCount} / {totalTradesCount} trades)</span>
        </div>
      </div>
    </div>
  );
}