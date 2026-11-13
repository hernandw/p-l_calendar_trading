import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { formatExactCurrency, getTickerBadgeClass } from '../renderers.jsx';

export default function DayModal({ modalDay, monthNames, onClose, onSaveTrade, onDeleteTrade }) {
  if (!modalDay) return null;

  const { dateKey, trades } = modalDay;
  const [editingTrade, setEditingTrade] = useState(null);

  // Formulario del trade
  const [ticker, setTicker] = useState('');
  const [assetType, setAssetType] = useState('PUT'); // CALL, PUT, STK
  const [qty, setQty] = useState('2');
  const [strike, setStrike] = useState('340.00');
  const [dte, setDte] = useState('0DTE');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [manualPnl, setManualPnl] = useState('');

  useEffect(() => {
    if (editingTrade) {
      setTicker(editingTrade.ticker || '');
      setAssetType(editingTrade.type || 'PUT');
      setQty(String(editingTrade.qty || 2));
      setStrike(editingTrade.strike && editingTrade.strike !== '-' ? editingTrade.strike : '340.00');
      setDte(editingTrade.dte && editingTrade.dte !== '-' ? editingTrade.dte : '0DTE');
      
      const mult = ['CALL', 'PUT'].includes(editingTrade.type) ? 100 : 1;
      const uBuy = (Number(editingTrade.costBasis || 0) / (editingTrade.qty || 1)) / mult;
      const uSell = (Number(editingTrade.proceeds || 0) / (editingTrade.qty || 1)) / mult;

      setBuyPrice(uBuy ? String(uBuy.toFixed(2)) : '');
      setSellPrice(uSell ? String(uSell.toFixed(2)) : '');
      setManualPnl(String(editingTrade.pnl || ''));
    } else {
      setTicker('');
      setAssetType('PUT');
      setQty('2');
      setStrike('340.00');
      setDte('0DTE');
      setBuyPrice('');
      setSellPrice('');
      setManualPnl('');
    }
  }, [editingTrade]);

  const isStock = assetType === 'STK';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ticker) return;

    const quantity = parseInt(qty, 10) || 1;
    const bPrice = parseFloat(buyPrice) || 0;
    const sPrice = parseFloat(sellPrice) || 0;
    
    const multiplier = isStock ? 1 : 100;
    const costBasisVal = bPrice * quantity * multiplier;
    const proceedsVal = sPrice * quantity * multiplier;

    let calculatedPnl = parseFloat(manualPnl);
    if (isNaN(calculatedPnl)) {
      calculatedPnl = proceedsVal - costBasisVal;
    }

    const tradeData = {
      id: editingTrade ? editingTrade.id : Date.now(),
      ticker: ticker.toUpperCase().trim(),
      type: assetType,
      qty: quantity,
      strike: isStock ? '-' : (strike || '340.00'),
      dte: isStock ? '-' : (dte || '0DTE'),
      costBasis: costBasisVal,
      proceeds: proceedsVal,
      pnl: calculatedPnl,
      commission: 0
    };

    onSaveTrade(dateKey, tradeData, editingTrade);
    setEditingTrade(null);
    setTicker('');
    setStrike('340.00');
    setDte('0DTE');
    setBuyPrice('');
    setSellPrice('');
    setManualPnl('');
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#131B2E] rounded-3xl w-full max-w-2xl p-6 border border-slate-700 shadow-2xl space-y-5 text-xs text-slate-100 my-8">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              DETALLE DEL DÍA: {dateKey}
            </h3>
            <p className="text-[10px] text-slate-400">Registra, edita o revisa las operaciones de esta fecha</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-[#0b101d] border border-slate-800 space-y-3">
          <div className="text-xs font-black text-blue-400 uppercase tracking-wide">
            {editingTrade ? 'MODIFICAR TRADE EXISTENTE' : 'AGREGAR NUEVO TRADE'}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">TICKER</label>
              <input 
                type="text" 
                placeholder="TSLA, SPY..." 
                required
                value={ticker} 
                onChange={e => setTicker(e.target.value)} 
                className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold uppercase outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">CONTRATOS</label>
              <input 
                type="number" 
                min="1" 
                required
                value={qty} 
                onChange={e => setQty(e.target.value)} 
                className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none text-right" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">STRIKE</label>
              <input 
                type="text" 
                placeholder="340.00" 
                value={strike} 
                onChange={e => setStrike(e.target.value)} 
                disabled={isStock}
                className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none text-right disabled:opacity-50" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">TIPO</label>
              <select 
                value={assetType} 
                onChange={e => setAssetType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none cursor-pointer"
              >
                <option value="PUT">PUT</option>
                <option value="CALL">CALL</option>
                <option value="STK">STK</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">EXPIRACION (DTE)</label>
              <input 
                type="text" 
                placeholder="0DTE" 
                value={dte} 
                onChange={e => setDte(e.target.value)} 
                disabled={isStock}
                className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none text-center disabled:opacity-50" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">VALOR CTO (COMPRA UNIT.)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="33.66" 
                value={buyPrice} 
                onChange={e => setBuyPrice(e.target.value)} 
                className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none text-right" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">VALOR VENTA (VENTA UNIT.)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="41.33" 
                value={sellPrice} 
                onChange={e => setSellPrice(e.target.value)} 
                className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none text-right" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">P&amp;L NETO (OPCIONAL)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="Automático" 
                value={manualPnl} 
                onChange={e => setManualPnl(e.target.value)} 
                className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-emerald-400 font-bold outline-none text-right" 
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {editingTrade && (
              <button 
                type="button" 
                onClick={() => setEditingTrade(null)} 
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit" 
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> {editingTrade ? 'Actualizar Trade' : 'Agregar Trade'}
            </button>
          </div>
        </form>

        {/* LISTADO DE OPERACIONES */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            DETALLE DE OPERACIONES ({trades.length})
          </div>

          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {trades.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No hay trades registrados para este día.</div>
            ) : (
              trades.map((t, idx) => {
                const isWin = Number(t.pnl || 0) >= 0;
                const isOpt = ['CALL', 'PUT'].includes((t.type || '').toUpperCase());
                const multiplier = isOpt ? 100 : 1;
                const unitBuy = (Number(t.costBasis || 0) / (t.qty || 1)) / multiplier;
                const unitSell = (Number(t.proceeds || 0) / (t.qty || 1)) / multiplier;
                
                const invested = Number(t.costBasis || 0);
                const pnlVal = Number(t.pnl || 0);
                const roi = invested > 0 ? ((pnlVal / invested) * 100).toFixed(1) : '0.0';

                // Mostrar strike y dte asegurando un valor por defecto si vienen vacíos
                const displayStrike = t.strike && t.strike !== '-' ? t.strike : '340.00';
                const displayDte = t.dte && t.dte !== '-' ? t.dte : '0DTE';

                return (
                  <div 
                    key={t.id || idx} 
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition shadow-md ${
                      isWin ? 'bg-[#0b1f1a]/80 border-emerald-500/40' : 'bg-[#251013]/80 border-rose-500/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#131B2E] border border-slate-700 font-bold text-white text-[11px]">
                          {t.qty} ctos
                        </span>
                        <span className="px-3 py-0.5 rounded-lg bg-[#1B2A4A] border border-slate-600 font-black text-xs text-white">
                          {t.ticker}
                        </span>
                        {isOpt && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#0F172A] border border-slate-700 text-xs font-bold text-slate-300">
                            Strike {displayStrike}
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-lg font-black text-xs ${t.type === 'PUT' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                          {t.type}
                        </span>
                        {isOpt && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800 text-xs font-bold">
                            {displayDte}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-300 font-medium space-x-2">
                        <span>Cto Compra: <strong className="text-white">${unitBuy.toFixed(2)}</strong></span>
                        <span>&rarr;</span>
                        <span>Cto Venta: <strong className="text-white">${unitSell.toFixed(2)}</strong></span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">Total: <strong className={pnlVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatExactCurrency(t.costBasis)} &rarr; {formatExactCurrency(t.proceeds)}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <div className={`text-sm font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatExactCurrency(pnlVal)}
                        </div>
                        <div className={`text-[10px] font-bold ${Number(roi) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {Number(roi) >= 0 ? `+${roi}%` : `${roi}%`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setEditingTrade(t)} 
                          className="p-1.5 rounded-xl bg-[#131B2E] hover:bg-slate-800 text-slate-300 transition border border-slate-700"
                          title="Modificar trade"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onDeleteTrade(dateKey, t.id)} 
                          className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-400 transition border border-rose-800/60"
                          title="Eliminar trade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}