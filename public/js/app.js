/**
 * public/js/app.js - Inicializador y Eventos de la Interfaz
 */
import { state, getActiveAccount, loadAccountsData, saveAccountsData, deduplicateAccountData, formatExactCurrency, cleanStrike } from './state.js';
import { applyTheme, safeIcons, renderAccountSelector, updateTotalTradesHeader, renderMonthView, renderYearView, renderTickersView, renderCommissionsView, renderCapitalView } from './renderers.js';
import { parseCsvFile } from './importer.js';

export function refreshActiveView() {
  renderAccountSelector();
  updateTotalTradesHeader();
  if (state.currentView === 'Month') renderMonthView();
  else if (state.currentView === 'Year') renderYearView();
  else if (state.currentView === 'Tickers') renderTickersView();
  else if (state.currentView === 'Commissions') renderCommissionsView();
  else renderCapitalView();
  safeIcons();
}

window.switchView = function(view) {
  state.currentView = view;
  ['Month', 'Year', 'Tickers', 'Commissions', 'Capital'].forEach(s => {
    document.getElementById(s.toLowerCase() + 'View')?.classList.toggle('hidden', s !== view);
    const btn = document.getElementById('view' + s + 'Btn');
    if (btn) {
      btn.className = s === view
        ? "px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm transition font-bold whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer"
        : "px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer";
    }
  });

  if (view === 'Month') renderMonthView();
  else if (view === 'Year') renderYearView();
  else if (view === 'Tickers') renderTickersView();
  else if (view === 'Commissions') renderCommissionsView();
  else if (view === 'Capital') renderCapitalView();
  safeIcons();
};

// GESTIÓN DEL MODAL DEL DÍA Y TRADES MANUALES
window.openDayModal = function(dateKey) {
  state.selectedDateKey = dateKey;
  const title = document.getElementById('modalDateTitle');
  const modal = document.getElementById('dayModal');
  if (title) title.textContent = `Operaciones de ${dateKey}`;
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  resetTradeForm();
  renderDayTradesList();
  safeIcons();
};

function resetTradeForm() {
  const eIdx = document.getElementById('editTradeIndex');
  const ticker = document.getElementById('tradeTicker');
  const qty = document.getElementById('tradeQty');
  const strike = document.getElementById('tradeStrike');
  const type = document.getElementById('tradeType');
  const dte = document.getElementById('tradeDteInput');
  const uCost = document.getElementById('tradeUnitCost');
  const uProceeds = document.getElementById('tradeUnitProceeds');
  const sText = document.getElementById('tradeSubmitText');

  if (eIdx) eIdx.value = '';
  if (ticker) ticker.value = '';
  if (qty) qty.value = '10';
  if (strike) strike.value = '340.00';
  if (type) type.value = 'PUT';
  if (dte) dte.value = '0DTE';
  if (uCost) uCost.value = '';
  if (uProceeds) uProceeds.value = '';
  if (sText) sText.textContent = 'Agregar Trade';
}

function renderDayTradesList() {
  const container = document.getElementById('tradesListContainer');
  if (!container) return;
  container.innerHTML = '';
  const active = getActiveAccount();
  const trades = active.appData?.[state.selectedDateKey] || [];

  let dailyTotal = 0, dailyInvested = 0;

  trades.forEach((t, idx) => {
    const isWin = Number(t.pnl) >= 0;
    const qty = t.qty || 1;
    const cost = Number(t.costBasis || 0);
    const proceeds = Number(t.proceeds || (cost + Number(t.pnl || 0)));
    const pnl = Number(t.pnl || 0);
    const roi = cost > 0 ? ((pnl / cost) * 100).toFixed(1) : 0;

    dailyTotal += pnl;
    dailyInvested += cost;

    const unitCost = qty > 0 ? (cost / qty).toFixed(2) : '0.00';
    const unitProceeds = qty > 0 ? (proceeds / qty).toFixed(2) : '0.00';
    const cardBorder = isWin ? 'border-emerald-500/30 bg-[#0d2218]/50' : 'border-rose-500/30 bg-[#251016]/50';

    const item = document.createElement('div');
    item.className = `p-3 rounded-2xl border ${cardBorder} flex items-center justify-between text-xs transition`;
    item.innerHTML = `
      <div class="flex flex-col space-y-1">
        <div class="flex items-center space-x-1.5 flex-wrap">
          <span class="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-black">${qty} ${t.type === 'STK' ? 'acc' : 'ctos'}</span>
          <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-800">${t.ticker}</span>
          ${t.type !== 'STK' ? `<span class="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold">Strike ${cleanStrike(t.strike)}</span>` : ''}
          <span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold ${t.type === 'CALL' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}">${t.type}</span>
          ${t.type !== 'STK' ? `<span class="px-1.5 py-0.5 rounded-md bg-amber-950/80 text-amber-400 border border-amber-800 text-[9px] font-black">${t.dte || '0DTE'}</span>` : ''}
        </div>
        <div class="text-[11px] text-slate-400">
          Compra: <strong class="text-white">$${unitCost}</strong> &rarr; Venta: <strong class="text-white">$${unitProceeds}</strong> | 
          <span class="text-[10px]">Total: <span class="text-slate-300">${formatExactCurrency(cost)}</span> &rarr; <span class="text-slate-300">${formatExactCurrency(proceeds)}</span></span>
        </div>
      </div>
      <div class="flex items-center space-x-2 text-right">
        <div>
          <span class="font-extrabold text-sm block ${isWin ? 'text-emerald-400' : 'text-rose-400'}">${formatExactCurrency(pnl)}</span>
          <span class="text-[10px] font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}">${isWin ? '+' : ''}${roi}%</span>
        </div>
        <button onclick="window.editTrade(${idx})" class="p-1 text-slate-400 hover:text-blue-400 cursor-pointer" title="Editar trade"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
        <button onclick="window.removeTrade(${idx})" class="p-1 text-slate-400 hover:text-rose-400 cursor-pointer" title="Eliminar trade"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      </div>
    `;
    container.appendChild(item);
  });

  const totEl = document.getElementById('modalDailyTotal');
  const invEl = document.getElementById('modalDailyInvested');
  if (totEl) totEl.textContent = `P&L Neto: ${formatExactCurrency(dailyTotal)}`;
  if (invEl) invEl.textContent = `Inversión: ${formatExactCurrency(dailyInvested)}`;
  safeIcons();
}

window.editTrade = function(idx) {
  const active = getActiveAccount();
  const t = active.appData?.[state.selectedDateKey]?.[idx];
  if (!t) return;
  const qty = t.qty || 1;
  const cost = Number(t.costBasis || 0);
  const proceeds = Number(t.proceeds || (cost + Number(t.pnl || 0)));

  const eIdx = document.getElementById('editTradeIndex'); if (eIdx) eIdx.value = String(idx);
  const ticker = document.getElementById('tradeTicker'); if (ticker) ticker.value = t.ticker;
  const qEl = document.getElementById('tradeQty'); if (qEl) qEl.value = qty;
  const sEl = document.getElementById('tradeStrike'); if (sEl) sEl.value = cleanStrike(t.strike);
  const typEl = document.getElementById('tradeType'); if (typEl) typEl.value = t.type;
  const dteEl = document.getElementById('tradeDteInput'); if (dteEl) dteEl.value = t.dte || '0DTE';
  const cEl = document.getElementById('tradeUnitCost'); if (cEl) cEl.value = (cost / qty).toFixed(2);
  const pEl = document.getElementById('tradeUnitProceeds'); if (pEl) pEl.value = (proceeds / qty).toFixed(2);
  const sText = document.getElementById('tradeSubmitText'); if (sText) sText.textContent = 'Guardar Cambios';
};

window.removeTrade = async function(idx) {
  const active = getActiveAccount();
  if (active.appData?.[state.selectedDateKey]) {
    active.appData[state.selectedDateKey].splice(idx, 1);
    if (active.appData[state.selectedDateKey].length === 0) delete active.appData[state.selectedDateKey];
    await saveAccountsData();
    renderDayTradesList();
    refreshActiveView();
  }
};

// GESTIÓN DE CAPITAL (EDITAR Y ELIMINAR)
window.editCapitalFlow = function(id) {
  const active = getActiveAccount();
  const flow = (active.capitalFlows || []).find(f => f.id === id);
  if (!flow) return;

  const editId = document.getElementById('capitalEditId');
  const type = document.getElementById('capitalFlowType');
  const date = document.getElementById('capitalFlowDate');
  const amount = document.getElementById('capitalFlowAmount');
  const note = document.getElementById('capitalFlowNote');
  const label = document.getElementById('capitalFormActionLabel');
  const submitText = document.getElementById('capitalSubmitText');

  if (editId) editId.value = flow.id;
  if (type) type.value = flow.type;
  if (date) date.value = flow.date;
  if (amount) amount.value = flow.amount;
  if (note) note.value = flow.note || '';

  if (label) label.textContent = 'Editar Movimiento Externo';
  if (submitText) submitText.textContent = 'Guardar Cambios';
  document.getElementById('cancelCapitalEditBtn')?.classList.remove('hidden');
  document.getElementById('capitalFlowForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.removeCapitalFlow = async function(id) {
  const active = getActiveAccount();
  const flow = (active.capitalFlows || []).find(f => f.id === id);
  if (!flow) return;

  if (flow.transferId || flow.category === 'transfer') {
    if (confirm("Esta es una transferencia entre cuentas. ¿Deseas anularla en ambas cuentas?")) {
      state.accounts.forEach(acc => {
        acc.capitalFlows = (acc.capitalFlows || []).filter(f => String(f.transferId) !== String(flow.transferId));
      });
      await saveAccountsData();
      renderCapitalView();
    }
    return;
  }

  if (confirm("¿Deseas eliminar este movimiento de capital?")) {
    active.capitalFlows = active.capitalFlows.filter(f => f.id !== id);
    await saveAccountsData();
    renderCapitalView();
  }
};

// MODAL DE TRANSFERENCIA ENTRE CUENTAS
window.openTransferModal = function() {
  const tModal = document.getElementById('transferModal');
  if (!tModal) return;
  const fromSelect = document.getElementById('transferFromAccount');
  const toSelect = document.getElementById('transferToAccount');
  if (fromSelect && toSelect) {
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';
    state.accounts.forEach(acc => {
      const opt1 = document.createElement('option');
      opt1.value = acc.id;
      opt1.textContent = `${acc.broker} (${acc.number})`;
      fromSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = acc.id;
      opt2.textContent = `${acc.broker} (${acc.number})`;
      toSelect.appendChild(opt2);
    });
    fromSelect.value = state.activeAccountId;
    const other = state.accounts.find(a => a.id !== state.activeAccountId);
    if (other) toSelect.value = other.id;
  }
  document.getElementById('editTransferId').value = '';
  document.getElementById('transferAmount').value = '';
  document.getElementById('transferNote').value = '';
  document.getElementById('deleteTransferBtn')?.classList.add('hidden');
  document.getElementById('submitTransferText').textContent = 'Confirmar Transferencia';
  tModal.classList.remove('hidden');
  tModal.classList.add('flex');
  safeIcons();
};

window.openEditTransferModal = function(transferId, flowId) {
  const tModal = document.getElementById('transferModal');
  if (!tModal) return;
  window.openTransferModal();
  document.getElementById('editTransferId').value = transferId;
  const active = getActiveAccount();
  const f = active.capitalFlows.find(flow => flow.id === flowId || String(flow.transferId) === String(transferId));
  if (f) {
    document.getElementById('transferDate').value = f.date;
    document.getElementById('transferAmount').value = f.amount;
    document.getElementById('transferNote').value = f.note || '';
  }
  document.getElementById('deleteTransferBtn')?.classList.remove('hidden');
  document.getElementById('submitTransferText').textContent = 'Guardar Cambios';
};

window.openTickerDetailsModal = function(data) {
  const modalTitle = document.getElementById('tickerDetailsModalTitle');
  const modalSub = document.getElementById('tickerDetailsModalSub');
  const listContainer = document.getElementById('tickerDetailsModalList');
  const modalEl = document.getElementById('tickerDetailsModal');

  if (modalTitle) modalTitle.textContent = `Auditoría: ${data.ticker} (${state.currentYear})`;
  if (modalSub) modalSub.textContent = `${data.total} trades registrados | Inversión: ${formatExactCurrency(data.cost)} | Balance: ${formatExactCurrency(data.pnl)}`;
  
  if (!listContainer || !modalEl) return;
  listContainer.innerHTML = '';

  data.tradesList.forEach(t => {
    const isWin = Number(t.pnl) >= 0;
    const item = document.createElement('div');
    item.className = `p-2.5 rounded-xl border border-slate-800 bg-[#0d1424] flex items-center justify-between text-xs`;
    item.innerHTML = `
      <div>
        <span class="font-bold text-white">${t.dateKey}</span>
        <span class="text-slate-400 text-[10px] ml-1">(${t.qty} ${t.type} ${t.type !== 'STK' ? 'Strike ' + cleanStrike(t.strike) : ''})</span>
        <div class="text-[10px] text-slate-500">Inversión: ${formatExactCurrency(t.costBasis)} &bull; Venta: ${formatExactCurrency(t.proceeds)}</div>
      </div>
      <span class="font-extrabold text-sm ${isWin ? 'text-emerald-400' : 'text-rose-400'}">${formatExactCurrency(t.pnl)}</span>
    `;
    listContainer.appendChild(item);
  });

  modalEl.classList.remove('hidden');
  modalEl.classList.add('flex');
  safeIcons();
};

function setupEventListeners() {
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    state.isDarkMode = !state.isDarkMode;
    applyTheme();
    saveAccountsData();
    refreshActiveView();
  });

  ['Month', 'Year', 'Tickers', 'Commissions', 'Capital'].forEach(v => {
    document.getElementById('view' + v + 'Btn')?.addEventListener('click', () => window.switchView(v));
  });

  document.getElementById('accountSelect')?.addEventListener('change', (e) => {
    state.activeAccountId = e.target.value;
    saveAccountsData();
    const active = getActiveAccount();
    const dates = Object.keys(active.appData || {}).sort();
    if (dates.length > 0) {
      const parts = dates[dates.length - 1].split('-');
      state.currentYear = parseInt(parts[0], 10);
      state.currentMonth = parseInt(parts[1], 10) - 1;
      const pYear = document.getElementById('periodYearSelect');
      if (pYear) pYear.value = String(state.currentYear);
    }
    renderAccountSelector();
    refreshActiveView(); // Refresca calendarios, métricas y contadores al instante
  });

  // GESTIÓN DE CUENTAS
  const accountModal = document.getElementById('accountModal');
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');

  document.getElementById('openNewAccountBtn')?.addEventListener('click', () => {
    document.getElementById('editAccountId').value = '';
    document.getElementById('accountModalTitle').textContent = 'Nueva Cuenta de Broker';
    document.getElementById('accBrokerInput').value = '';
    document.getElementById('accNumberInput').value = '';
    document.getElementById('accTypeInput').value = 'Margin';
    deleteAccountBtn?.classList.add('hidden');
    if (accountModal) accountModal.style.display = 'flex';
    safeIcons();
  });

  document.getElementById('editActiveAccountBtn')?.addEventListener('click', () => {
    const active = getActiveAccount();
    document.getElementById('editAccountId').value = active.id;
    document.getElementById('accountModalTitle').textContent = 'Editar Cuenta Activa';
    document.getElementById('accBrokerInput').value = active.broker;
    document.getElementById('accNumberInput').value = active.number;
    document.getElementById('accTypeInput').value = active.type;
    deleteAccountBtn?.classList.toggle('hidden', state.accounts.length <= 1);
    if (accountModal) accountModal.style.display = 'flex';
    safeIcons();
  });

  document.getElementById('closeAccountModalBtn')?.addEventListener('click', () => { if (accountModal) accountModal.style.display = 'none'; });
  document.getElementById('cancelAccountBtn')?.addEventListener('click', () => { if (accountModal) accountModal.style.display = 'none'; });

  document.getElementById('accountForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editAccountId').value;
    const broker = document.getElementById('accBrokerInput').value.trim();
    const number = document.getElementById('accNumberInput').value.trim();
    const type = document.getElementById('accTypeInput').value;

    if (!broker || !number) return;

    if (editId) {
      const acc = state.accounts.find(a => a.id === editId);
      if (acc) {
        acc.broker = broker;
        acc.number = number;
        acc.type = type;
      }
    } else {
      const newAcc = {
        id: 'acc_' + Date.now(),
        broker,
        number,
        type,
        currency: 'USD',
        appData: {},
        capitalFlows: []
      };
      state.accounts.push(newAcc);
      state.activeAccountId = newAcc.id;
    }

    await saveAccountsData();
    if (accountModal) accountModal.style.display = 'none';
    renderAccountSelector();
    refreshActiveView();
  });

  deleteAccountBtn?.addEventListener('click', async () => {
    const active = getActiveAccount();
    if (confirm(`¿Eliminar la cuenta "${active.broker} (${active.number})"?`)) {
      state.accounts = state.accounts.filter(a => a.id !== active.id);
      state.activeAccountId = state.accounts[0].id;
      await saveAccountsData();
      if (accountModal) accountModal.style.display = 'none';
      renderAccountSelector();
      refreshActiveView();
    }
  });

  // TRANSFERENCIAS ENTRE CUENTAS
  document.getElementById('openTransferModalBtn')?.addEventListener('click', () => window.openTransferModal());
  document.getElementById('closeTransferModalBtn')?.addEventListener('click', () => {
    document.getElementById('transferModal')?.classList.add('hidden');
    document.getElementById('transferModal')?.classList.remove('flex');
  });
  document.getElementById('cancelTransferBtn')?.addEventListener('click', () => {
    document.getElementById('transferModal')?.classList.add('hidden');
    document.getElementById('transferModal')?.classList.remove('flex');
  });

  document.getElementById('transferForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fromId = document.getElementById('transferFromAccount').value;
    const toId = document.getElementById('transferToAccount').value;
    const date = document.getElementById('transferDate').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const note = document.getElementById('transferNote').value.trim() || 'Traspaso de fondos';
    const editTId = document.getElementById('editTransferId').value;

    if (fromId === toId) return alert("La cuenta origen y destino deben ser diferentes.");
    if (isNaN(amount) || amount <= 0 || !date) return;

    const fromAcc = state.accounts.find(a => a.id === fromId);
    const toAcc = state.accounts.find(a => a.id === toId);
    if (!fromAcc || !toAcc) return;

    if (editTId) {
      state.accounts.forEach(acc => {
        acc.capitalFlows = (acc.capitalFlows || []).filter(f => String(f.transferId) !== String(editTId));
      });
    }

    const tId = editTId || 'tr_' + Date.now();
    if (!fromAcc.capitalFlows) fromAcc.capitalFlows = [];
    if (!toAcc.capitalFlows) toAcc.capitalFlows = [];

    fromAcc.capitalFlows.push({
      id: Date.now(),
      transferId: tId,
      type: 'withdrawal',
      category: 'transfer',
      date,
      amount,
      note: `${note} (Hacia ${toAcc.broker})`
    });

    toAcc.capitalFlows.push({
      id: Date.now() + 1,
      transferId: tId,
      type: 'deposit',
      category: 'transfer',
      date,
      amount,
      note: `${note} (Desde ${fromAcc.broker})`
    });

    await saveAccountsData();
    document.getElementById('transferModal')?.classList.add('hidden');
    document.getElementById('transferModal')?.classList.remove('flex');
    renderCapitalView();
  });

  // REGISTRO Y EDICIÓN MANUAL DE TRADES
  document.getElementById('tradeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const active = getActiveAccount();
    if (!active.appData) active.appData = {};
    if (!active.appData[state.selectedDateKey]) active.appData[state.selectedDateKey] = [];

    const idxStr = document.getElementById('editTradeIndex').value;
    const ticker = (document.getElementById('tradeTicker').value || '').split(' ')[0].toUpperCase().trim();
    const qty = parseInt(document.getElementById('tradeQty').value, 10) || 1;
    const strike = cleanStrike(document.getElementById('tradeStrike').value.trim());
    const type = document.getElementById('tradeType').value;
    const dte = document.getElementById('tradeDteInput').value.trim().toUpperCase() || '0DTE';
    const uCost = parseFloat(document.getElementById('tradeUnitCost').value) || 0;
    const uProceeds = parseFloat(document.getElementById('tradeUnitProceeds').value) || 0;

    const costBasis = uCost * qty;
    const proceeds = uProceeds * qty;
    const pnl = proceeds - costBasis;

    const tradeObj = { ticker, qty, strike, type, dte, costBasis, proceeds, pnl };

    if (idxStr !== '') {
      active.appData[state.selectedDateKey][parseInt(idxStr, 10)] = tradeObj;
    } else {
      active.appData[state.selectedDateKey].push(tradeObj);
    }

    await saveAccountsData();
    resetTradeForm();
    renderDayTradesList();
    refreshActiveView();
  });

  // RESTAURACIÓN DE BACKUP DESDE ARCHIVO
  const restoreInput = document.getElementById('restoreBackupInput');
  restoreInput?.addEventListener('click', (e) => { e.target.value = ''; });
  restoreInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(event) {
      try {
        const rawData = JSON.parse(event.target.result);
        let importedAccounts = Array.isArray(rawData) ? rawData : (rawData && rawData.accounts);
        if (!importedAccounts || importedAccounts.length === 0) return alert("Archivo de respaldo inválido.");

        state.accounts = importedAccounts;
        state.activeAccountId = rawData.activeAccountId || importedAccounts[0].id;
        state.isDarkMode = rawData.isDarkMode ?? true;
        state.accounts.forEach(acc => deduplicateAccountData(acc));

        await saveAccountsData();
        applyTheme();
        renderAccountSelector();
        refreshActiveView();
        alert(`¡Respaldo restaurado con éxito con ${importedAccounts.length} cuenta(s)!`);
      } catch (err) {
        alert("Error al procesar el archivo JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  });

  // FORMULARIO DE CAPITAL
  document.getElementById('capitalFlowForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const active = getActiveAccount();
    const editId = document.getElementById('capitalEditId').value;
    const type = document.getElementById('capitalFlowType').value;
    const date = document.getElementById('capitalFlowDate').value;
    const amount = parseFloat(document.getElementById('capitalFlowAmount').value);
    const note = document.getElementById('capitalFlowNote').value.trim() || (type === 'deposit' ? 'Depósito' : 'Retiro');

    if (isNaN(amount) || amount <= 0 || !date) return;
    if (!active.capitalFlows) active.capitalFlows = [];

    if (editId) {
      const target = active.capitalFlows.find(f => f.id == editId);
      if (target) {
        target.type = type;
        target.date = date;
        target.amount = amount;
        target.note = note;
      }
    } else {
      active.capitalFlows.push({
        id: Date.now(),
        type,
        category: 'external',
        date,
        amount,
        note
      });
    }

    await saveAccountsData();
    document.getElementById('capitalEditId').value = '';
    document.getElementById('capitalFlowAmount').value = '';
    document.getElementById('capitalFlowNote').value = '';
    document.getElementById('cancelCapitalEditBtn')?.classList.add('hidden');
    document.getElementById('capitalFormActionLabel').textContent = 'Registrar Movimiento Externo (Banco / Fondeo)';
    document.getElementById('capitalSubmitText').textContent = 'Agregar Movimiento Externo';
    renderCapitalView();
  });

  document.getElementById('cancelCapitalEditBtn')?.addEventListener('click', () => {
    document.getElementById('capitalEditId').value = '';
    document.getElementById('capitalFlowAmount').value = '';
    document.getElementById('capitalFlowNote').value = '';
    document.getElementById('cancelCapitalEditBtn')?.classList.add('hidden');
    document.getElementById('capitalFormActionLabel').textContent = 'Registrar Movimiento Externo (Banco / Fondeo)';
    document.getElementById('capitalSubmitText').textContent = 'Agregar Movimiento Externo';
  });

  // MODAL CSV
  const csvModal = document.getElementById('csvModal');
  document.getElementById('openCsvModalBtn')?.addEventListener('click', () => {
    if (csvModal) { csvModal.classList.remove('hidden'); csvModal.classList.add('flex'); }
    const pBtn = document.getElementById('processCsvBtn'); if (pBtn) pBtn.disabled = true;
    document.getElementById('csvPreviewBox')?.classList.add('hidden');
    document.getElementById('csvModeSelection')?.classList.add('hidden');
    safeIcons();
  });

  document.getElementById('closeCsvModalBtn')?.addEventListener('click', () => { if (csvModal) { csvModal.classList.add('hidden'); csvModal.classList.remove('flex'); } });
  document.getElementById('cancelCsvBtn')?.addEventListener('click', () => { if (csvModal) { csvModal.classList.add('hidden'); csvModal.classList.remove('flex'); } });

  const csvInput = document.getElementById('csvFileInput');
  csvInput?.addEventListener('click', (e) => { e.target.value = ''; });
  csvInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    parseCsvFile(file, {
      onSuccess: (data) => {
        state.csvFileType = data.type;
        if (data.type === 'transactions') {
          state.parsedCsvFlows = data.flows;
          state.parsedCsvTrades = null;
        } else {
          state.parsedCsvTrades = data.trades;
          state.parsedCsvFlows = null;
        }

        const fName = document.getElementById('csvFileName');
        const fFound = document.getElementById('csvTradesFound');
        const sText = document.getElementById('csvSummaryText');
        const pBtn = document.getElementById('processCsvBtn');

        if (fName) fName.textContent = file.name;
        if (fFound) {
          fFound.textContent = data.type === 'transactions' 
            ? `${data.flows.length} movimiento(s) de capital (${data.broker})` 
            : `${data.trades.length} operaciones (${data.broker})`;
        }
        if (sText) {
          sText.textContent = `Rango: ${data.minDate || '-'} al ${data.maxDate || '-'}`;
        }

        document.getElementById('csvPreviewBox')?.classList.remove('hidden');
        document.getElementById('csvModeSelection')?.classList.remove('hidden');
        if (pBtn) pBtn.disabled = false;
      },
      onError: (msg) => alert("Error CSV: " + msg)
    });
  });

  document.getElementById('processCsvBtn')?.addEventListener('click', async () => {
    const mode = document.querySelector('input[name="csvImportMode"]:checked')?.value || 'merge';
    const active = getActiveAccount();

    if (state.csvFileType === 'transactions' && state.parsedCsvFlows) {
      if (mode === 'replace') active.capitalFlows = [];
      if (!active.capitalFlows) active.capitalFlows = [];

      let agregados = 0;
      state.parsedCsvFlows.forEach(f => {
        const isDup = active.capitalFlows.some(cf => cf.date === f.date && Math.abs(cf.amount - f.amount) < 0.05 && cf.type === f.type);
        if (!isDup) { active.capitalFlows.push(f); agregados++; }
      });

      await saveAccountsData();
      if (csvModal) { csvModal.classList.add('hidden'); csvModal.classList.remove('flex'); }
      window.switchView('Capital');
      alert(`¡Éxito! Se sincronizaron ${agregados} movimientos de capital en "${active.broker}".`);
      return;
    }

    if (state.csvFileType === 'trades' && state.parsedCsvTrades) {
      if (mode === 'replace') active.appData = {};
      if (!active.appData) active.appData = {};

      let agregados = 0;
      state.parsedCsvTrades.forEach(item => {
        if (!active.appData[item.dateKey]) active.appData[item.dateKey] = [];

        // Comparador de duplicados que preserva lotes independientes
        const isDup = active.appData[item.dateKey].some(ex => {
          const sameTicker = (ex.ticker || '').split(' ')[0].toUpperCase().trim() === (item.trade.ticker || '').split(' ')[0].toUpperCase().trim();
          const samePnl = Math.abs(Number(ex.pnl || 0) - Number(item.trade.pnl || 0)) < 0.001;
          const sameQty = parseInt(ex.qty, 10) === parseInt(item.trade.qty, 10);
          const sameType = (ex.type || '').toUpperCase() === (item.trade.type || '').toUpperCase();
          const sameStrike = cleanStrike(ex.strike) === cleanStrike(item.trade.strike);
          const sameCost = Math.abs(Number(ex.costBasis || 0) - Number(item.trade.costBasis || 0)) < 0.05;
          return sameTicker && samePnl && sameQty && sameType && sameStrike && sameCost;
        });

        if (!isDup) {
          active.appData[item.dateKey].push(item.trade);
          agregados++;
        }
      });

      await saveAccountsData();

      if (csvModal) { csvModal.classList.add('hidden'); csvModal.classList.remove('flex'); }

      if (state.parsedCsvTrades.length > 0) {
        const lastDate = state.parsedCsvTrades[state.parsedCsvTrades.length - 1].dateKey;
        const parts = lastDate.split('-');
        state.currentYear = parseInt(parts[0], 10);
        state.currentMonth = parseInt(parts[1], 10) - 1;
        const pYear = document.getElementById('periodYearSelect');
        if (pYear) pYear.value = String(state.currentYear);
      }

      window.switchView('Month');
      alert(`¡Carga completada! Se registraron ${agregados} operaciones nuevas para ${active.broker}.`);
    }
  });

  // BOTÓN BACKUP EXPRESS
  document.getElementById('downloadBackupBtn')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();
      alert(`¡Copia de seguridad guardada en el servidor en: ${data.backupPath}!`);
    } catch (e) {
      alert('Error al generar backup en disco: ' + e.message);
    }
  });

  // CIERRE DE MODALES
  document.getElementById('closeModalBtn')?.addEventListener('click', () => {
    const dModal = document.getElementById('dayModal');
    if (dModal) { dModal.classList.add('hidden'); dModal.classList.remove('flex'); }
  });
  document.getElementById('helpBtn')?.addEventListener('click', () => {
    const iModal = document.getElementById('infoModal');
    if (iModal) { iModal.classList.remove('hidden'); iModal.classList.add('flex'); }
  });
  document.getElementById('closeInfoModalBtn')?.addEventListener('click', () => {
    const iModal = document.getElementById('infoModal');
    if (iModal) { iModal.classList.add('hidden'); iModal.classList.remove('flex'); }
  });
  document.getElementById('closeTickerDetailsModalBtn')?.addEventListener('click', () => {
    const tModal = document.getElementById('tickerDetailsModal');
    if (tModal) { tModal.classList.add('hidden'); tModal.classList.remove('flex'); }
  });

  // NAVEGACIÓN DE MESES
  document.getElementById('prevPeriodBtn')?.addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    const pYear = document.getElementById('periodYearSelect');
    if (pYear) pYear.value = String(state.currentYear);
    refreshActiveView();
  });
  document.getElementById('nextPeriodBtn')?.addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    const pYear = document.getElementById('periodYearSelect');
    if (pYear) pYear.value = String(state.currentYear);
    refreshActiveView();
  });
  document.getElementById('periodYearSelect')?.addEventListener('change', (e) => {
    state.currentYear = parseInt(e.target.value, 10);
    refreshActiveView();
  });

  // VACIAR CUENTA
  document.getElementById('clearAllBtn')?.addEventListener('click', async () => {
    const active = getActiveAccount();
    if (confirm(`¿Vaciar todas las operaciones y movimientos de la cuenta "${active.broker} (${active.number})"?`)) {
      active.appData = {};
      active.capitalFlows = [];
      await saveAccountsData();
      refreshActiveView();
    }
  });
}

export async function initApp() {
  await loadAccountsData();
  setupEventListeners();
  applyTheme();
  const pYear = document.getElementById('periodYearSelect');
  if (pYear) pYear.value = String(state.currentYear);
  renderAccountSelector();
  window.switchView('Month');
}