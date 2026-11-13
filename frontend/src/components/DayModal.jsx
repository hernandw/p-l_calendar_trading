import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { formatExactCurrency, getTickerBadgeClass } from '../renderers.jsx';

export default function DayModal({ modalDay, monthNames, onClose, onSaveTrade, onDeleteTrade }) {
  if (!modalDay) return null;

  const { dateKey, pnl, trades, dObj } = modalDay;
  const [editingTrade, setEditingTrade] = useState(null);

  // Formulario del trade
  const [ticker, setTicker] = useState('');
  const [assetType, setAssetType] = useState('CALL'); // CALL, PUT, STK
  const [qty, setQty] = useState('1');
  const [strike, setStrike] = useState('');
  const [dte, setDte] = useState('0DTE');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [manualPnl, setManualPnl] = useState('');
  const [commission, setCommission] = useState('');

  useEffect(() => {
    if (editingTrade) {
      setTicker(editingTrade.ticker || '');
      setAssetType(editingTrade.type || 'CALL');
      setQty(String(editingTrade.qty || 1));
      setStrike(editingTrade.strike || '');
      setDte(editingTrade.dte || '0DTE');
      setBuyPrice(editingTrade.costBasis ? String(editingTrade.costBasis / (editingTrade.qty || 1)) : '');
      setSellPrice(editingTrade.proceeds ? String(editingTrade.proceeds / (editingTrade.qty || 1)) : '');
      setManualPnl(String(editingTrade.pnl || ''));
      setCommission(editingTrade.commission !== undefined ? String(editingTrade.commission) : '');
    } else {
      setTicker('');
      setAssetType('CALL');
      setQty('1');
      setStrike('');
      setDte('0DTE');
      setBuyPrice('');
      setSellPrice('');
      setManualPnl('');
      setCommission('');
    }
  }, [editingTrade]);

  const isStock = assetType === 'STK';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ticker) return;

    const quantity = parseInt(qty, 10) || 1;
    const bPrice = parseFloat(buyPrice) || 0;
    const sPrice = parseFloat(sellPrice) || 0;
    
    // Calcular PnL automáticamente si hay precios de compra/venta o usar manual
    let calculatedPnl = parseFloat(manualPnl);
    if (isNaN(calculatedPnl)) {
      if (isStock) {
        calculatedPnl = (sPrice - bPrice) * quantity;
      } else {
        // Para opciones (cada contrato equivale a 100 acciones típicamente o cálculo unitario)
        calculatedPnl = (sPrice - bPrice) * quantity * 100;
      }
    }

    const costBasisVal = isStock ? (bPrice * quantity) : (bPrice * quantity * 100);
    const proceedsVal = isStock ? (sPrice * quantity) : (sPrice * quantity * 100);

    const tradeData = {
      id: editingTrade ? editingTrade.id : Date.now(),
      ticker: ticker.toUpperCase().trim(),
      type: assetType,
      qty: quantity,
      strike: isStock ? '-' : (strike || '-'),
      dte: isStock ? '-' : (dte || '-'),
      costBasis: costBasisVal,
      proceeds: proceedsVal,
      pnl: calculatedPnl,
      commission: parseFloat(commission) || 0
    };

    onSaveTrade(dateKey, tradeData, editingTrade);
    setEditingTrade(null);
    setTicker('');
    setStrike('');
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
              Detalle del Día: {dateKey}
            </h3>
            <p className="text-[10px] text-slate-400">Registra, edita o revisa las operaciones de esta fecha</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* FORMULARIO DE CREACIÓN / EDICIÓN DE TRADE */}
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-[#0b101d] border border-slate-800 space-y-3">
          <div className="text-xs font-black text-blue-400 uppercase tracking-wide">
            {editingTrade ? 'Modificar Trade Existente' : 'Agregar Nuevo Trade'}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
              <label className="block text-[10px] font-bold text-slate-400 mb-1">TIPO DE ACTIVO</label>
              <select 
                value={assetType} 
                onChange={e => setAssetType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none cursor-pointer"
              >
                <option value="CALL">CALL (Opción)</option>
                <option value="PUT">PUT (Opción)</option>
                <option value="STK">STK (Acción)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">{isStock ? 'CANTIDAD (ACCIONES)' : 'CONTRATOS'}</label>
              <input 
                type="number" 
                min="1" 
                required
                value={qty} 
                onChange={e => setQty(e.target.value)} 
                className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none text-right" 
              />
            </div>
            {!isStock && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">STRIKE</label>
                  <input 
                    type="text" 
                    placeholder="340.00" 
                    value={strike} 
                    onChange={e => setStrike(e.target.value)} 
                    className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none text-right" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">EXPIRACIÓN (DTE)</label>
                  <input 
                    type="text" 
                    placeholder="0DTE" 
                    value={dte} 
                    onChange={e => setDte(e.target.value)} 
                    className="w-full px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none text-center" 
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">PRECIO COMPRA (UNIT.)</label>
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
              <label className="block text-[10px] font-bold text-slate-400 mb-1">PRECIO VENTA (UNIT.)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="41.33" 
                value={sellPrice} 
                onChange={e => setSellPrice(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none text-right" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">P&amp;L NETO (OPCIONAL)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="Auto o manual" 
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

        {/* LISTADO DE OPERACIONES REGISTRADAS */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            DETALLE DE OPERACIONES ({trades.length})
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {trades.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No hay trades registrados para este día.</div>
            ) : (
              trades.map((t, idx) => {
                const isWin = Number(t.pnl || 0) >= 0;
                const isOpt = ['CALL', 'PUT'].includes((t.type || '').toUpperCase());
                const invested = Number(t.costBasis || 0);
                const pnlVal = Number(t.pnl || 0);
                const roi = invested > 0 ? ((pnlVal / invested) * 100).toFixed(1) : '0.0';

                return (
                  <div 
                    key={t.id || idx} 
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${
                      isWin ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-white text-[11px]">
                          {t.qty} {isOpt ? 'ctos' : 'acciones'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg font-black text-xs ${getTickerBadgeClass(t.ticker)}`}>
                          {t.ticker}
                        </span>
                        {!isOpt && <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">STK</span>}
                        {isOpt && (
                          <>
                            {t.strike && t.strike !== '-' && (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                                Strike {t.strike}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.type === 'PUT' ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>
                              {t.type}
                            </span>
                            {t.dte && t.dte !== '-' && (
                              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] font-bold">
                                {t.dte}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 font-medium">
                        Cto Compra: <strong className="text-slate-200">{formatExactCurrency(t.costBasis / (t.qty || 1))}</strong> 
                        <span className="mx-1">&rarr;</span> 
                        Cto Venta: <strong className="text-slate-200">{formatExactCurrency(t.proceeds / (t.qty || 1))}</strong>
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
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Modificar trade"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onDeleteTrade(dateKey, t.id)} 
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 transition"
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