import React from 'react';
import { formatExactCurrency } from '../renderers.jsx';

export default function YearView({ activeAccount, currentYear, setCurrentMonth, setActiveTab }) {
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-black tracking-wide text-slate-200">Resumen Anual: {currentYear}</h2>
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
              className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424] cursor-pointer hover:border-blue-500 transition"
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
    </div>
  );
}