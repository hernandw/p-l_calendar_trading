import React from 'react';
import { Plus, Settings } from 'lucide-react';

export default function AccountSection({ activeAccount, accounts, onSelectAccount, onOpenNewAccount, onOpenSettings }) {
  return (
    <div className="bg-[#0b101d] p-4 rounded-2xl border border-slate-800 flex flex-col space-y-2">
      <span className="text-[10px] uppercase font-bold text-slate-400">Cuenta Activa</span>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select 
            value={activeAccount.id} 
            onChange={e => onSelectAccount(e.target.value)}
            className="bg-[#131B2E] border border-slate-700 text-white font-black text-sm rounded-xl px-3 py-1.5 outline-none cursor-pointer">
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.broker} ({acc.number}) - {acc.type || 'Margin'}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenNewAccount} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md transition">
            <Plus className="w-3.5 h-3.5" /> Nueva
          </button>
          <button onClick={onOpenSettings} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}