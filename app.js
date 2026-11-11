/**
 * app.js - Lógica de la aplicación y renderizado modular
 */
import { parseCsvFile } from './importer.js';

const STORAGE_KEY_MULTI = 'TRADING_MULTI_ACCOUNTS_V20';
const ACTIVE_ACCOUNT_KEY = 'TRADING_ACTIVE_ACCOUNT_ID_V20';
const THEME_KEY = 'TRADING_PNL_THEME_MODE_V20';

let isDarkMode = localStorage.getItem(THEME_KEY) === 'dark';
let accounts = [];
let activeAccountId = null;
let currentView = 'Month';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDateKey = null;

let parsedCsvTrades = null;
let parsedCsvFlows = null;
let csvFileType = 'trades';
let csvMinDate = null;
let csvMaxDate = null;

export function initApp() {
  applyTheme();
  loadAccountsData();
  setupEventListeners();
  renderAccountSelector();
  switchView('Month');
  safeIcons();
}

function safeIcons() {
  try {
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (e) {
    console.warn('Lucide:', e);
  }
}

function applyTheme() {
  const htmlEl = document.documentElement;
  const themeIcon = document.getElementById('themeIcon');
  if (isDarkMode) {
    htmlEl.classList.add('dark');
    if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
  } else {
    htmlEl.classList.remove('dark');
    if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
  }
}

function loadAccountsData() {
  const saved = localStorage.getItem(STORAGE_KEY_MULTI);
  if (saved) {
    try {
      accounts = JSON.parse(saved);
    } catch (e) {
      accounts = getDefaultAccounts();
    }
  } else {
    accounts = getDefaultAccounts();
  }

  const savedActive = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (savedActive && accounts.some(a => a.id === savedActive)) {
    activeAccountId = savedActive;
  } else {
    activeAccountId = accounts[0].id;
  }
}

function getDefaultAccounts() {
  return [{
    id: 'acc_ibkr_main',
    broker: 'Interactive Brokers',
    number: 'U24279702',
    type: 'Margin',
    currency: 'USD',
    appData: {},
    capitalFlows: []
  }];
}

function saveAccountsData() {
  localStorage.setItem(STORAGE_KEY_MULTI, JSON.stringify(accounts));
}

function getActiveAccount() {
  return accounts.find(a => a.id === activeAccountId) || accounts[0];
}

function formatExactCurrency(val) {
  if (val === undefined || isNaN(val)) return '$0.00';
  const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
  return `${sign}$${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMoney(val) {
  if (val === undefined || isNaN(val)) return '$0.00';
  const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
  const absVal = Math.abs(val);
  if (absVal >= 1000) return `${sign}${(absVal / 1000).toFixed(2)}K`;
  return `${sign}${absVal.toFixed(2)}`;
}

function getDayPnL(dateKey) {
  const active = getActiveAccount();
  const trades = active.appData?.[dateKey] || [];
  if (trades.length === 0) return null;
  return trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
}

function getAccountBalance(accountId, excludeFlowId = null, excludeTransferId = null) {
  const acc = accounts.find(a => a.id === accountId);
  if (!acc) return 0;

  let totalDeposited = 0;
  let totalWithdrawn = 0;

  (acc.capitalFlows || []).forEach(f => {
    if (excludeTransferId && f.transferId && String(f.transferId) === String(excludeTransferId)) return;
    if (excludeFlowId && (f.id === excludeFlowId || String(f.id) === String(excludeFlowId))) return;
    const amt = Number(f.amount || 0);
    if (f.type === 'deposit') totalDeposited += amt;
    else if (f.type === 'withdrawal') totalWithdrawn += amt;
  });

  let cumulativePnl = 0;
  Object.keys(acc.appData || {}).forEach(k => {
    (acc.appData[k] || []).forEach(t => {
      cumulativePnl += Number(t.pnl || 0);
    });
  });

  return (totalDeposited - totalWithdrawn) + cumulativePnl;
}

function renderAccountSelector() {
  const select = document.getElementById('accountSelect');
  if (!select) return;
  select.innerHTML = '';
  accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = `${acc.broker} (${acc.number}) - ${acc.type}`;
    if (acc.id === activeAccountId) opt.selected = true;
    select.appendChild(opt);
  });

  const active = getActiveAccount();
  document.getElementById('badgeBrokerName').textContent = active.broker;
  document.getElementById('badgeAccountType').textContent = active.type;
  document.getElementById('badgeAccountNumber').textContent = `Nro: ${active.number}`;
}

function switchView(view) {
  currentView = view;
  const sections = ['Month', 'Year', 'Tickers', 'Commissions', 'Capital'];
  sections.forEach(s => {
    const secEl = document.getElementById(s.toLowerCase() + 'View');
    const btnEl = document.getElementById('view' + s + 'Btn');
    if (secEl) secEl.classList.toggle('hidden', s !== view);
    if (btnEl) {
      if (s === view) {
        btnEl.className = "px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm transition font-bold whitespace-nowrap flex items-center justify-center gap-1.5";
      } else {
        btnEl.className = "px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition font-semibold whitespace-nowrap flex items-center justify-center gap-1.5";
      }
    }
  });

  if (view === 'Month') renderMonthView();
  else if (view === 'Year') renderYearView();
  else if (view === 'Tickers') renderTickersView();
  else if (view === 'Commissions') renderCommissionsView();
  else if (view === 'Capital') renderCapitalView();
  safeIcons();
}

function renderMonthView() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  document.getElementById('sectionSubTitle').textContent = `Mes: ${monthNames[currentMonth]} ${currentYear}`;

  const firstOfMonth = new Date(currentYear, currentMonth, 1);
  const startDay = new Date(firstOfMonth);
  let dow = startDay.getDay();
  let diff = (dow === 0 ? 1 : (dow === 6 ? 2 : 1 - dow));
  startDay.setDate(startDay.getDate() + diff);

  const days = [];
  const cursor = new Date(startDay);
  while (days.length < 25) {
    if (cursor.getDay() >= 1 && cursor.getDay() <= 5) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const active = getActiveAccount();

  days.forEach(dObj => {
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    const pnl = getDayPnL(dateKey);
    const trades = active.appData?.[dateKey] || [];
    const isToday = dateKey === todayStr;

    let bg = "bg-slate-50/40 dark:bg-darkSubtle/40 border border-slate-200/80 dark:border-darkBorder";
    let textCls = "text-slate-400";
    let pnlDisplay = "0.00";

    if (pnl !== null) {
      if (pnl > 0) {
        bg = "bg-pnlGreen-bg dark:bg-pnlGreen-darkBg border border-pnlGreen-border dark:border-pnlGreen-darkBorder";
        textCls = "text-pnlGreen-text dark:text-pnlGreen-darkText";
        pnlDisplay = formatMoney(pnl);
      } else if (pnl < 0) {
        bg = "bg-pnlRed-bg dark:bg-pnlRed-darkBg border border-pnlRed-border dark:border-pnlRed-darkBorder";
        textCls = "text-pnlRed-text dark:text-pnlRed-darkText";
        pnlDisplay = formatMoney(pnl);
      }
    }

    const cell = document.createElement('div');
    cell.className = `min-h-[74px] p-2.5 rounded-2xl flex flex-col justify-between cursor-pointer select-none ${bg}`;
    cell.innerHTML = `
      <div class="flex items-center justify-between w-full">
        <span class="text-xs font-bold ${isToday ? 'text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 rounded' : 'text-slate-700 dark:text-slate-300'}">${isToday ? 'Today' : dObj.getDate()}</span>
        ${trades.length > 0 ? `<span class="px-1 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-800">${trades.length}t</span>` : ''}
      </div>
      <div class="text-right text-xs font-extrabold ${textCls}">${pnl !== null ? pnlDisplay : '-'}</div>
    `;
    cell.onclick = () => openDayModal(dateKey, dObj);
    grid.appendChild(cell);
  });

  updateSchwabMetrics();
}

// CÁLCULO PRECISO DE COMISIONES (REALES DEL ARCHIVO IBKR O ESTIMADAS DE SCHWAB)
function renderCommissionsView() {
  const tbody = document.getElementById('commissionsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const active = getActiveAccount();
  const fallbackRate = parseFloat(document.getElementById('feePerContractInput')?.value) || 1.30;
  const tickerStats = {};
  let totalComms = 0;
  let totalOps = 0;
  let totalNet = 0;

  Object.keys(active.appData || {}).forEach(dKey => {
    if (dKey.startsWith(`${currentYear}`)) {
      (active.appData[dKey] || []).forEach(t => {
        const sym = (t.ticker || 'OTHER').toUpperCase().trim();
        const qty = parseInt(t.qty, 10) || 1;
        const pnl = Number(t.pnl || 0);

        // Si el trade tiene comisión real guardada (como en IBKR), usarla. Si no, estimar.
        const comm = (t.commission !== undefined && t.commission > 0) ? t.commission : (t.type === 'STK' ? 1.00 : fallbackRate);

        if (!tickerStats[sym]) {
          tickerStats[sym] = { ticker: sym, ops: 0, netPnl: 0, commission: 0 };
        }

        tickerStats[sym].ops += qty;
        tickerStats[sym].netPnl += pnl;
        tickerStats[sym].commission += comm;

        totalOps += qty;
        totalNet += pnl;
        totalComms += comm;
      });
    }
  });

  document.getElementById('commTotalContracts').textContent = `${totalOps} ops`;
  document.getElementById('commTotalFees').textContent = `-${formatExactCurrency(totalComms)}`;
  const gross = totalNet + totalComms;
  const impact = gross > 0 ? ((totalComms / gross) * 100).toFixed(1) : 0;
  document.getElementById('commTotalImpact').textContent = `${impact}% de ganancia bruta`;

  Object.values(tickerStats).forEach(s => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 dark:hover:bg-darkSubtle transition text-xs";
    tr.innerHTML = `
      <td class="py-2.5 px-3 font-bold">${s.ticker}</td>
      <td class="py-2.5 px-2 text-center font-semibold">${s.ops}</td>
      <td class="py-2.5 px-2 text-right text-rose-500 font-bold">-${formatExactCurrency(s.commission)}</td>
      <td class="py-2.5 px-2 text-right font-medium">${formatExactCurrency(s.netPnl + s.commission)}</td>
      <td class="py-2.5 px-3 text-right font-bold ${s.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${formatExactCurrency(s.netPnl)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCapitalView() {
  const active = getActiveAccount();
  const currentBal = getAccountBalance(active.id);
  let dep = 0, wth = 0;
  (active.capitalFlows || []).forEach(f => {
    if (f.type === 'deposit') dep += Number(f.amount || 0);
    else wth += Number(f.amount || 0);
  });

  document.getElementById('accountCurrentBalance').textContent = formatExactCurrency(currentBal);
  document.getElementById('accountTotalDeposits').textContent = formatExactCurrency(dep);
  document.getElementById('accountTotalWithdrawals').textContent = formatExactCurrency(wth);
  document.getElementById('accountNetCapitalInflow').textContent = formatExactCurrency(dep - wth);

  let pnl = 0;
  Object.keys(active.appData || {}).forEach(k => {
    (active.appData[k] || []).forEach(t => pnl += Number(t.pnl || 0));
  });
  document.getElementById('accountNetOperatingPnl').textContent = formatExactCurrency(pnl);

  const list = document.getElementById('capitalFlowsList');
  if (!list) return;
  list.innerHTML = '';
  (active.capitalFlows || []).forEach(f => {
    const item = document.createElement('div');
    item.className = "p-2.5 rounded-xl border border-slate-200 dark:border-darkBorder bg-white dark:bg-darkSubtle/60 flex items-center justify-between text-xs";
    item.innerHTML = `
      <div>
        <span class="font-bold text-slate-800 dark:text-slate-200">${f.note}</span>
        <span class="text-[10px] text-blue-500 block">${f.date}</span>
      </div>
      <span class="font-bold ${f.type === 'deposit' ? 'text-emerald-500' : 'text-rose-500'}">${f.type === 'deposit' ? '+' : '-'}${formatExactCurrency(f.amount)}</span>
    `;
    list.appendChild(item);
  });
}

function updateSchwabMetrics() {
  const active = getActiveAccount();
  let gains = 0, losses = 0, wins = 0, total = 0;
  const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  Object.keys(active.appData || {}).forEach(k => {
    if (k.startsWith(prefix)) {
      (active.appData[k] || []).forEach(t => {
        const p = Number(t.pnl || 0);
        total++;
        if (p > 0) { gains += p; wins++; }
        else if (p < 0) { losses += Math.abs(p); }
      });
    }
  });

  document.getElementById('metricTotalVal').textContent = formatExactCurrency(gains - losses);
  document.getElementById('metricGrossGains').textContent = `+${formatExactCurrency(gains)}`;
  document.getElementById('metricGrossLosses').textContent = `-${formatExactCurrency(losses)}`;
  const vol = gains + losses;
  document.getElementById('metricSchwabRatio').textContent = vol > 0 ? `${((gains / vol) * 100).toFixed(1)}%` : '0.00%';
  document.getElementById('metricTradesPct').textContent = total > 0 ? `${Math.round((wins / total) * 100)}%` : '0%';
  document.getElementById('metricTradesCount').textContent = `(${wins} / ${total} ops)`;
}

function renderYearView() {}
function renderTickersView() {}

function openDayModal(dateKey, dObj) {
  selectedDateKey = dateKey;
  document.getElementById('modalDateTitle').textContent = dateKey;
  const modal = document.getElementById('dayModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  renderDayTradesList();
}

function renderDayTradesList() {
  const container = document.getElementById('tradesListContainer');
  if (!container) return;
  container.innerHTML = '';
  const active = getActiveAccount();
  const trades = active.appData?.[selectedDateKey] || [];

  trades.forEach(t => {
    const item = document.createElement('div');
    item.className = "p-2.5 rounded-xl border border-slate-200 dark:border-darkBorder flex items-center justify-between text-xs";
    item.innerHTML = `
      <div>
        <span class="font-bold">${t.ticker}</span>
        <span class="text-slate-400 text-[10px] ml-1">(${t.qty} ${t.type})</span>
        ${t.commission ? `<span class="text-rose-400 text-[9px] block">Comisión IBKR: -$${t.commission.toFixed(2)}</span>` : ''}
      </div>
      <div class="font-black ${t.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${formatExactCurrency(t.pnl)}</div>
    `;
    container.appendChild(item);
  });
}

function setupEventListeners() {
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
    applyTheme();
    refreshActiveView();
  });

  ['Month', 'Year', 'Tickers', 'Commissions', 'Capital'].forEach(v => {
    document.getElementById('view' + v + 'Btn')?.addEventListener('click', () => switchView(v));
  });

  document.getElementById('helpBtn')?.addEventListener('click', () => {
    const m = document.getElementById('infoModal');
    m.classList.remove('hidden');
    m.classList.add('flex');
  });

  document.getElementById('closeInfoModalBtn')?.addEventListener('click', () => {
    document.getElementById('infoModal').classList.add('hidden');
    document.getElementById('infoModal').classList.remove('flex');
  });

  document.getElementById('closeModalBtn')?.addEventListener('click', () => {
    document.getElementById('dayModal').classList.add('hidden');
    document.getElementById('dayModal').classList.remove('flex');
  });

  document.getElementById('openCsvModalBtn')?.addEventListener('click', () => {
    const m = document.getElementById('csvModal');
    m.classList.remove('hidden');
    m.classList.add('flex');
  });

  document.getElementById('closeCsvModalBtn')?.addEventListener('click', () => {
    document.getElementById('csvModal').classList.add('hidden');
    document.getElementById('csvModal').classList.remove('flex');
  });

  document.getElementById('csvFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    parseCsvFile(file, {
      onSuccess: (data) => {
        csvFileType = data.type;
        csvMinDate = data.minDate;
        csvMaxDate = data.maxDate;
        if (data.type === 'transactions') parsedCsvFlows = data.flows;
        else parsedCsvTrades = data.trades;

        document.getElementById('csvFileName').textContent = file.name;
        document.getElementById('csvTradesFound').textContent = `${data.type === 'transactions' ? data.flows.length : data.trades.length} registros (${data.broker})`;
        document.getElementById('csvPreviewBox').classList.remove('hidden');
        document.getElementById('csvModeSelection').classList.remove('hidden');
        document.getElementById('processCsvBtn').disabled = false;
      },
      onError: (msg) => alert(msg)
    });
  });

  document.getElementById('processCsvBtn')?.addEventListener('click', () => {
    const mode = document.querySelector('input[name="csvImportMode"]:checked')?.value || 'merge';
    const active = getActiveAccount();

    if (csvFileType === 'transactions' && parsedCsvFlows) {
      if (mode === 'replace') active.capitalFlows = [];
      parsedCsvFlows.forEach(f => {
        const isDup = (active.capitalFlows || []).some(cf => cf.date === f.date && Math.abs(cf.amount - f.amount) < 0.05);
        if (!isDup) {
          if (!active.capitalFlows) active.capitalFlows = [];
          active.capitalFlows.push(f);
        }
      });
      saveAccountsData();
      document.getElementById('csvModal').classList.add('hidden');
      switchView('Capital');
      return;
    }

    if (csvFileType === 'trades' && parsedCsvTrades) {
      if (!active.appData) active.appData = {};
      parsedCsvTrades.forEach(item => {
        if (!active.appData[item.dateKey]) active.appData[item.dateKey] = [];
        const isDup = active.appData[item.dateKey].some(ex => ex.ticker === item.trade.ticker && Math.abs(ex.pnl - item.trade.pnl) < 0.05);
        if (!isDup) active.appData[item.dateKey].push(item.trade);
      });
      saveAccountsData();
      document.getElementById('csvModal').classList.add('hidden');
      refreshActiveView();
    }
  });
}