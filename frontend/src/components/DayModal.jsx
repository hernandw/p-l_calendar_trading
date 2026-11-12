import React, { useState } from 'react';
import { X, Edit2, Trash2, Plus } from 'lucide-react';
import { formatExactCurrency, getTickerBadgeClass, formatMoney } from '../renderers.jsx';

export default function DayModal({ modalDay, monthNames, onClose, onSaveTrade, onDeleteTrade }) {
  const [editingTrade, setEditingTrade] = useState(null);

  if (!modalDay) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#131B2E] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-white">
            Sesión: {modalDay.dObj.getDate()} {monthNames[modalDay.dObj.getMonth()]} {modalDay.dObj.getFullYear()}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
        </div>
        
        <div className="p-5 border-b border-slate-700 bg-[#0b101d] shrink-0">
          <TradeEditor 
            tradeToEdit={editingTrade} 
            onSave={(tradeData) => {
              onSaveTrade(modalDay.dateKey, tradeData, editingTrade);
              setEditingTrade(null);
            }} 
            onCancel={() => setEditingTrade(null)} 
          />
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <h4 className="text-sm font-bold text-slate-300">Detalle de Operaciones</h4>
          {modalDay.trades.length === 0 && <p className="text-center text-slate-500 text-xs py-4">No hay trades registrados para este día.</p>}
          {modalDay.trades.map(t => {
            const isWin = t.pnl >= 0;
            const isOption = t.type === 'CALL' || t.type === 'PUT';
            const ctoText = `${t.qty} ${isOption ? 'ctos' : 'shares'}`;
            const tickerDisplay = isOption ? `${t.ticker} ${t.type} ${t.strike}` : t.ticker;

            return (
              <div key={t.id} className={`p-3.5 rounded-2xl border ${isWin ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'}`}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded-lg font-black ${getTickerBadgeClass(t.ticker)} text-sm`}>{tickerDisplay}</span>
                    <span className="text-slate-200 font-bold">{ctoText}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className={`font-extrabold text-sm ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>{formatExactCurrency(t.pnl)}</span>
                    <button onClick={() => setEditingTrade(t)} className="text-slate-500 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDeleteTrade(modalDay.dateKey, t.id)} className="text-rose-600 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TradeEditor({ tradeToEdit, onSave, onCancel }) {
  const [ticker, setTicker] = useState(tradeToEdit ? tradeToEdit.ticker : 'SPY');
  const [qty, setQty] = useState(tradeToEdit ? tradeToEdit.qty : 1);
  const [strike, setStrike] = useState(tradeToEdit ? tradeToEdit.strike : 550);
  const [type, setType] = useState(tradeToEdit ? tradeToEdit.type : 'CALL');
  const [pnl, setPnl] = useState(tradeToEdit ? tradeToEdit.pnl : 0);
  const [commission, setCommission] = useState(tradeToEdit ? tradeToEdit.commission : 1.30);
  
  const isOption = type === 'CALL' || type === 'PUT';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: tradeToEdit ? tradeToEdit.id : undefined,
      ticker: ticker.toUpperCase(),
      qty: parseInt(qty, 10),
      strike: isOption ? parseFloat(strike) : null,
      type: isOption ? type : 'STK',
      pnl: parseFloat(pnl),
      commission: parseFloat(commission),
      costBasis: 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
      <div className='col-span-2 md:col-span-1'>
        <label className="block font-bold text-slate-400 mb-1">Ticker</label>
        <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white uppercase" placeholder="SPY" />
      </div>
      <div>
        <label className="block font-bold text-slate-400 mb-1">{isOption ? 'Contratos' : 'Acciones'}</label>
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white text-right" />
      </div>
      <div>
        <label className="block font-bold text-slate-400 mb-1">P&amp;L Neto</label>
        <input type="number" step="0.01" value={pnl} onChange={e => setPnl(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white text-right" />
      </div>
      <div>
        <label className="block font-bold text-slate-400 mb-1">Comisión Total</label>
        <input type="number" step="0.01" value={commission} onChange={e => setCommission(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white text-right" />
      </div>
      
      {isOption && (
        <>
          <div>
            <label className="block font-bold text-slate-400 mb-1">Strike</label>
            <input type="number" step="0.01" value={strike} onChange={e => setStrike(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white text-right" />
          </div>
          <div>
            <label className="block font-bold text-slate-400 mb-1">Tipo</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white">
              <option value="CALL">CALL</option>
              <option value="PUT">PUT</option>
              <option value="STK">Acción (STK)</option>
            </select>
          </div>
        </>
      )}

      <div className="col-span-2 flex items-center gap-2 justify-end mt-2">
        {tradeToEdit && <button type="button" onClick={onCancel} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs">Cancelar</button>}
        <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md transition">
          <Plus className="w-3.5 h-3.5" /> {tradeToEdit ? 'Actualizar Trade' : 'Agregar Trade'}
        </button>
      </div>
    </form>
  );
}