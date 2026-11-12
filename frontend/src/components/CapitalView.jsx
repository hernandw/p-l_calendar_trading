import React, { useState } from 'react';
import { Wallet, Plus, ArrowLeftRight, Trash2, Edit2, X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatExactCurrency } from '../renderers.jsx';

export default function CapitalView({ activeAccount, allAccounts = [], onSaveCapitalFlow, onDeleteCapitalFlow, onUpdateCapitalFlow }) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null); // Estado para editar movimiento
  
  // Formulario de movimiento externo
  const [flowType, setFlowType] = useState('deposit');
  const [flowDate, setFlowDate] = useState(new Date().toISOString().split('T')[0]);
  const [flowAmount, setFlowAmount] = useState('');
  const [flowConcept, setFlowConcept] = useState('Aporte bancario');

  // Formulario de transferencia entre cuentas
  const otherAccounts = (allAccounts || []).filter(a => a.id !== activeAccount.id);
  const [targetAccountId, setTargetAccountId] = useState(otherAccounts[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  // Cálculos financieros
  let dep = 0, wth = 0;
  (activeAccount.capitalFlows || []).forEach(f => {
    const amt = Number(f.amount || 0);
    if (f.type === 'deposit' || f.type === 'transfer_in') dep += amt;
    else if (f.type === 'withdrawal' || f.type === 'transfer_out') wth += amt;
  });
  const netInflow = dep - wth;

  let cumulativePnl = 0;
  let peakBalance = 0;
  let runningBal = netInflow;
  
  Object.keys(activeAccount.appData || {}).sort().forEach(k => {
    (activeAccount.appData[k] || []).forEach(t => {
      const p = Number(t.pnl || 0);
      cumulativePnl += p;
      runningBal += p;
      if (runningBal > peakBalance) peakBalance = runningBal;
    });
  });

  const currentBal = netInflow + cumulativePnl;
  const initialCapital = netInflow > 0 ? netInflow : 1;
  const roiPct = ((cumulativePnl / initialCapital) * 100).toFixed(1);

  const handleAddExternalFlow = (e) => {
    e.preventDefault();
    if (!flowAmount || isNaN(flowAmount)) return;

    if (editingFlow) {
      // Actualizar movimiento existente
      const updated = {
        ...editingFlow,
        type: flowType,
        date: flowDate,
        amount: parseFloat(flowAmount),
        description: flowConcept
      };
      onUpdateCapitalFlow(updated);
      setEditingFlow(null);
    } else {
      // Crear nuevo movimiento
      const newFlow = {
        id: `flow_${Date.now()}`,
        type: flowType,
        date: flowDate,
        amount: parseFloat(flowAmount),
        description: flowConcept || (flowType === 'deposit' ? 'Depósito Bancario' : 'Retiro Bancario')
      };
      onSaveCapitalFlow(newFlow);
    }

    setFlowAmount('');
    setFlowConcept('Aporte bancario');
  };

  const handleStartEdit = (f) => {
    setEditingFlow(f);
    setFlowType(f.type === 'transfer_in' || f.type === 'transfer_out' ? 'deposit' : f.type);
    setFlowDate(f.date);
    setFlowAmount(f.amount);
    setFlowConcept(f.description);
  };

  const handleExecuteTransfer = (e) => {
    e.preventDefault();
    if (!transferAmount || isNaN(transferAmount) || !targetAccountId) return;

    const amount = parseFloat(transferAmount);
    const transferId = `tr_${Date.now()}`;
    const targetAcc = (allAccounts || []).find(a => a.id === targetAccountId);

    const outFlow = {
      id: `flow_out_${Date.now()}`,
      type: 'transfer_out',
      date: transferDate,
      amount: amount,
      transferId: transferId,
      description: `Transferencia a ${targetAcc ? targetAcc.broker : 'otra cuenta'} (${targetAcc ? targetAcc.number : ''}) - Transferencia de Capital entre broker`
    };

    const inFlow = {
      id: `flow_in_${Date.now()}`,
      type: 'transfer_in',
      date: transferDate,
      amount: amount,
      transferId: transferId,
      description: `Transferencia desde ${activeAccount.broker} (${activeAccount.number}) - Transferencia de Capital entre broker`
    };

    onSaveCapitalFlow(outFlow, { targetAccountId, inFlow });
    setShowTransferModal(false);
    setTransferAmount('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <h2 className="text-sm font-black tracking-wide text-slate-200 uppercase">BALANCE DE CUENTA &amp; FLUJO DE CAPITAL</h2>
        <p className="text-[10px] text-slate-500">Control de depósitos, retiros a banco y transferencias entre brokers</p>
      </div>

      {/* TARJETA PRINCIPAL DE SALDO REAL */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Wallet className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">SALDO REAL ACTUAL EN BROKER</span>
          </div>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${Number(roiPct) >= 0 ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' : 'bg-rose-950/40 text-rose-400 border-rose-500/30'}`}>
            {Number(roiPct) >= 0 ? `+${roiPct}%` : `${roiPct}%`} ROI
          </span>
        </div>

        <div className="text-3xl font-black text-white">
          {formatExactCurrency(currentBal)}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800/80 font-semibold">
          <span>Depósitos: <strong className="text-emerald-400">+{formatExactCurrency(dep)}</strong></span>
          <span>&bull;</span>
          <span>Retiros/Salidas: <strong className="text-rose-400">-{formatExactCurrency(wth)}</strong></span>
          <span>&bull;</span>
          <span>Capital Neto: <strong className="text-slate-200">{formatExactCurrency(netInflow)}</strong></span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-[#131B2E] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">P&amp;L NETO DE TRADING:</span>
            <span className={`text-sm font-black ${cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatExactCurrency(cumulativePnl)}</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#131B2E] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">PICO HISTÓRICO (PEAK):</span>
            <span className="text-sm font-black text-white">{formatExactCurrency(peakBalance)}</span>
          </div>
        </div>
      </div>

      {/* BOTÓN DE TRANSFERENCIA ENTRE CUENTAS */}
      <button 
        onClick={() => setShowTransferModal(true)}
        className="w-full py-3 bg-[#131B2E] hover:bg-slate-800 text-blue-400 border border-blue-500/30 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition"
      >
        <ArrowLeftRight className="w-4 h-4" /> Transferir Capital entre Cuentas
      </button>

      {/* FORMULARIO PARA REGISTRAR / EDITAR MOVIMIENTO EXTERNO */}
      <div className="p-5 rounded-3xl border border-slate-800 bg-[#0b101d] space-y-4">
        <div className="flex items-center justify-between text-xs font-black text-white">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" /> {editingFlow ? 'Editar Movimiento' : 'Registrar Movimiento Externo (Banco / Fondeo)'}
          </div>
          {editingFlow && (
            <button onClick={() => { setEditingFlow(null); setFlowAmount(''); }} className="text-slate-400 hover:text-white flex items-center gap-1">
              <X className="w-4 h-4" /> Cancelar Edición
            </button>
          )}
        </div>
        <form onSubmit={handleAddExternalFlow} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-400 mb-1">TIPO</label>
            <select 
              value={flowType} 
              onChange={e => setFlowType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none cursor-pointer"
            >
              <option value="deposit">Depósito Bancario</option>
              <option value="withdrawal">Retiro Bancario</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-400 mb-1">FECHA</label>
            <input 
              type="date" 
              value={flowDate} 
              onChange={e => setFlowDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none" 
            />
          </div>
          <div>
            <label className="block font-bold text-slate-400 mb-1">MONTO ($)</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="1000.00" 
              required
              value={flowAmount} 
              onChange={e => setFlowAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none text-right" 
            />
          </div>
          <div>
            <label className="block font-bold text-slate-400 mb-1">CONCEPTO</label>
            <input 
              type="text" 
              placeholder="Aporte bancario..." 
              value={flowConcept} 
              onChange={e => setFlowConcept(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-white font-bold outline-none" 
            />
          </div>
          <div className="md:col-span-4 pt-1">
            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> {editingFlow ? 'Actualizar Movimiento' : 'Agregar Movimiento Externo'}
            </button>
          </div>
        </form>
      </div>

      {/* MOVIMIENTOS REGISTRADOS */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1 uppercase tracking-wider">
          <span>MOVIMIENTOS REGISTRADOS (DEPÓSITOS, RETIROS Y TRANSFERENCIAS)</span>
          <span>{(activeAccount.capitalFlows || []).length} movimientos</span>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {(!activeAccount.capitalFlows || activeAccount.capitalFlows.length === 0) ? (
            <div className="text-center py-8 text-slate-500 text-xs">No hay movimientos de capital registrados.</div>
          ) : (
            activeAccount.capitalFlows.map(f => {
              const isPositive = f.type === 'deposit' || f.type === 'transfer_in';
              const isTransfer = f.type === 'transfer_in' || f.type === 'transfer_out';

              let titleText = 'Depósito Bancario';
              if (f.type === 'withdrawal') titleText = 'Retiro a Cuenta Bancaria (Externo)';
              else if (f.type === 'transfer_out') titleText = 'Transferencia de Fondos (Salida)';
              else if (f.type === 'transfer_in') titleText = 'Transferencia de Fondos (Entrada)';

              return (
                <div key={f.id} className="p-3.5 rounded-2xl border border-slate-800 bg-[#0b101d] flex items-center justify-between text-xs hover:border-slate-700 transition">
                  <div className="flex items-center gap-3">
                    <span className={`p-2 rounded-xl border ${isPositive ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' : 'bg-rose-950/40 text-rose-400 border-rose-500/30'}`}>
                      {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{titleText}</span>
                        {isTransfer && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800">Transferencia</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{f.date} &bull; {f.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`font-black text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? `+${formatExactCurrency(f.amount)}` : `-${formatExactCurrency(f.amount)}`}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isTransfer && (
                        <button onClick={() => handleStartEdit(f)} className="text-slate-500 hover:text-blue-400 transition" title="Editar movimiento">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => onDeleteCapitalFlow(f.id, f.transferId)} className="text-slate-500 hover:text-rose-400 transition" title="Eliminar movimiento">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL DE TRANSFERENCIA ENTRE CUENTAS */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleExecuteTransfer} className="bg-[#131B2E] rounded-3xl w-full max-w-md p-6 border border-slate-700 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-400" /> Transferir Capital entre Brokers
              </h3>
              <button type="button" onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">CUENTA DESTINO</label>
              <select 
                value={targetAccountId} 
                onChange={e => setTargetAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white font-bold outline-none"
              >
                {otherAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.broker} ({acc.number})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">FECHA</label>
              <input 
                type="date" 
                value={transferDate} 
                onChange={e => setTransferDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white font-bold outline-none" 
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">MONTO A TRANSFERIR ($)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="500.00" 
                required
                value={transferAmount} 
                onChange={e => setTransferAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white font-bold outline-none text-right" 
              />
            </div>
            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition">
              Confirmar Transferencia
            </button>
          </form>
        </div>
      )}
    </div>
  );
}