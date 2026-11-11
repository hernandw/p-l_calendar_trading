/**
 * public/js/app.js - Inicializador y Controladores de Eventos
 */
import { state, getActiveAccount, loadAccountsData, saveAccountsData, deduplicateAccountData, formatExactCurrency } from './state.js';
import { applyTheme, safeIcons, renderAccountSelector, updateTotalTradesHeader, renderMonthView, renderYearView, renderTickersView, renderCommissionsView, renderCapitalView } from './renderers.js';
import { parseCsvFile, cleanStrike } from './importer.js';

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
        ? "px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm transition font-bold whitespace-nowrap flex items-center justify-center gap-1.5"
        : "px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition font-semibold whitespace-nowrap flex items-center justify-center gap-1.5";
    }
  });

  if (view === 'Month') renderMonthView();
  else if (view === 'Year') renderYearView();
  else if (view === 'Tickers') renderTickersView();
  else if (view === 'Commissions') renderCommissionsView();
  else if (view === 'Capital') renderCapitalView();
  safeIcons();
};

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
  const fields = ['editTradeIndex', 'tradeTicker', 'tradeUnitCost', 'tradeUnitProceeds'];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const q = document.getElementById('tradeQty'); if (q) q.value = '10';
  const s = document.getElementById('tradeStrike'); if (s) s.value = '340.00';
  const t = document.getElementById('tradeType'); if (t) t.value = 'PUT';
  const d = document.getElementById('tradeDteInput'); if (d) d.value = '0DTE';
  const btn = document.getElementById('tradeSubmitText'); if (btn) btn.textContent = 'Agregar Trade';
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
        <button onclick="window.editTrade(${idx})" class="p-1 text-slate-400 hover:text-white"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
        <button onclick="window.removeTrade(${idx})" class="p-1 text-slate-400 hover:text-rose-400"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
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

  // MODAL CSV (COMPATIBLE IBKR Y SCHWAB)
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
        if (fFound) fFound.textContent = `${data.type === 'transactions' ? data.flows.length : data.trades.length} registros (${data.broker})`;
        if (sText) sText.textContent = `Rango: ${data.minDate || '-'} al ${data.maxDate || '-'}`;
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

        const isDup = active.appData[item.dateKey].some(ex => {
          const sameTicker = (ex.ticker || '').split(' ')[0].toUpperCase().trim() === (item.trade.ticker || '').split(' ')[0].toUpperCase().trim();
          const samePnl = Math.abs(Number(ex.pnl || 0) - Number(item.trade.pnl || 0)) < 0.20;
          const sameQty = parseInt(ex.qty, 10) === parseInt(item.trade.qty, 10);
          const sameType = (ex.type || '').toUpperCase() === (item.trade.type || '').toUpperCase();
          const sameStrike = cleanStrike(ex.strike) === cleanStrike(item.trade.strike);
          return sameTicker && samePnl && sameQty && sameType && sameStrike;
        });

        if (!isDup) {
          active.appData[item.dateKey].push(item.trade);
          agregados++;
        } else {
          // ACTUALIZAR COMISIONES SI VIENEN DEL CSV IBKR
          const existing = active.appData[item.dateKey].find(ex =>
            (ex.ticker || '').split(' ')[0].toUpperCase().trim() === (item.trade.ticker || '').split(' ')[0].toUpperCase().trim() &&
            Math.abs(Number(ex.pnl || 0) - Number(item.trade.pnl || 0)) < 0.20
          );
          if (existing) {
            if (item.trade.commission !== undefined && item.trade.commission > 0) {
              existing.commission = item.trade.commission;
            }
            if (Number(item.trade.costBasis || 0) > Number(existing.costBasis || 0)) {
              existing.costBasis = item.trade.costBasis;
              existing.proceeds = item.trade.proceeds;
            }
          }
        }
      });

      deduplicateAccountData(active);
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