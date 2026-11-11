/**
 * public/js/app.js - Cliente modular conectado a la API de Express
 */
import { parseCsvFile, cleanStrike } from './importer.js';

let isDarkMode = true;
let accounts = [];
let activeAccountId = null;
let currentView = 'Month';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDateKey = null;

let parsedCsvTrades = null;
let parsedCsvFlows = null;
let csvFileType = 'trades';

// 1. UTILIDADES Y TEMA (Declaradas con function para hoisting seguro)
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
  safeIcons();
}

function getSystemTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMoney(val) {
  if (val === undefined || isNaN(val)) return '$0.00';
  const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
  const absVal = Math.abs(val);
  if (absVal >= 1000) return `${sign}${(absVal / 1000).toFixed(2)}K`;
  return `${sign}${absVal.toFixed(2)}`;
}

function formatExactCurrency(val) {
  if (val === undefined || isNaN(val)) return '$0.00';
  const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
  return `${sign}$${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getTickerBadgeClass(ticker) {
  const sym = (ticker || '').split(' ')[0].toUpperCase().trim();
  switch(sym) {
    case 'NVDA': return 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40';
    case 'SPY': return 'bg-blue-950/80 text-blue-400 border border-blue-500/40';
    case 'TSLA': return 'bg-rose-950/80 text-rose-400 border border-rose-500/40';
    case 'AAPL': return 'bg-slate-800 text-slate-200 border border-slate-600';
    case 'AMD': return 'bg-amber-950/80 text-amber-400 border border-amber-500/40';
    case 'QQQ': return 'bg-purple-950/80 text-purple-400 border border-purple-500/40';
    case 'PXLW': return 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/40';
    case 'SMX': return 'bg-indigo-950/80 text-indigo-400 border border-indigo-500/40';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

function getActiveAccount() {
  return accounts.find(a => a.id === activeAccountId) || accounts[0] || { appData: {}, capitalFlows: [] };
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

  const netCapitalInflow = totalDeposited - totalWithdrawn;
  let cumulativePnl = 0;
  Object.keys(acc.appData || {}).forEach(k => {
    (acc.appData[k] || []).forEach(t => {
      cumulativePnl += Number(t.pnl || 0);
    });
  });

  return netCapitalInflow + cumulativePnl;
}

function calculatePeakBalance(acc) {
  if (!acc) return 0;
  let runningBalance = 0;
  let peak = 0;

  const events = [];
  (acc.capitalFlows || []).forEach(f => {
    events.push({ date: f.date, amount: f.type === 'deposit' ? Number(f.amount) : -Number(f.amount) });
  });

  Object.keys(acc.appData || {}).forEach(dKey => {
    (acc.appData[dKey] || []).forEach(t => {
      events.push({ date: dKey, amount: Number(t.pnl || 0) });
    });
  });

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  events.forEach(e => {
    runningBalance += e.amount;
    if (runningBalance > peak) peak = runningBalance;
  });

  return peak;
}

// 2. DESDUPLICADOR Y PERSISTENCIA (EXPRESS API)
function deduplicateAccountData(acc) {
  if (!acc || !acc.appData) return;
  Object.keys(acc.appData).forEach(dKey => {
    const trades = acc.appData[dKey] || [];
    const seen = new Map();
    const cleanTrades = [];

    trades.forEach(t => {
      const cleanTicker = (t.ticker || 'OTHER').split(' ')[0].toUpperCase().trim();
      t.ticker = cleanTicker;
      const strk = cleanStrike(t.strike);
      const pnlVal = Number(t.pnl || 0).toFixed(2);
      const qtyVal = parseInt(t.qty, 10) || 1;

      const sig = `${cleanTicker}_${t.type}_${qtyVal}_${strk}_${pnlVal}`;

      if (!seen.has(sig)) {
        seen.set(sig, t);
        cleanTrades.push(t);
      } else {
        const existing = seen.get(sig);
        if (Number(t.costBasis || 0) > Number(existing.costBasis || 0)) {
          existing.costBasis = t.costBasis;
          existing.proceeds = t.proceeds;
        }
      }
    });

    acc.appData[dKey] = cleanTrades;
    if (cleanTrades.length === 0) delete acc.appData[dKey];
  });
}

async function loadAccountsData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    accounts = data.accounts || [];
    activeAccountId = data.activeAccountId || accounts[0]?.id;
    isDarkMode = data.isDarkMode ?? true;

    accounts.forEach(acc => deduplicateAccountData(acc));

    applyTheme();

    const periodYearSelect = document.getElementById('periodYearSelect');
    if (periodYearSelect) {
      periodYearSelect.value = String(currentYear);
    }

    renderAccountSelector();
    switchView('Month');
  } catch (err) {
    console.error('Error al conectar con la API de Express:', err);
  }
}

async function saveAccountsData() {
  try {
    const payload = { activeAccountId, isDarkMode, accounts };
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Error al guardar datos en el servidor:', err);
  }
}

// 3. RENDERIZADO DE VISTAS
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
  const badgeBroker = document.getElementById('badgeBrokerName');
  const badgeType = document.getElementById('badgeAccountType');
  const badgeNum = document.getElementById('badgeAccountNumber');
  const csvLabel = document.getElementById('csvTargetAccountLabel');

  if (badgeBroker) badgeBroker.textContent = active.broker || 'Broker';
  if (badgeType) badgeType.textContent = active.type || 'Margin';
  if (badgeNum) badgeNum.textContent = `Nro: ${active.number || '-'}`;
  if (csvLabel) csvLabel.textContent = `${active.broker} (${active.number})`;

  const transferBtnCont = document.getElementById('transferButtonContainer');
  if (transferBtnCont) {
    transferBtnCont.classList.toggle('hidden', accounts.length < 2);
  }
}

function updateTotalTradesHeader() {
  const active = getActiveAccount();
  let count = 0;
  Object.keys(active.appData || {}).forEach(k => {
    if (k.startsWith(`${currentYear}`)) {
      count += (active.appData[k] || []).length;
    }
  });
  const pill = document.getElementById('totalTradesPill');
  if (pill) pill.textContent = `${count} trades en total`;
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

  const isMonth = (currentView === 'Month');
  const mTitle = document.getElementById('metricTotalTitle');
  const mVal = document.getElementById('metricTotalVal');
  const mGains = document.getElementById('metricGrossGains');
  const mLosses = document.getElementById('metricGrossLosses');
  const mRatio = document.getElementById('metricSchwabRatio');
  const mPct = document.getElementById('metricTradesPct');
  const mCount = document.getElementById('metricTradesCount');

  if (mTitle) mTitle.textContent = isMonth ? "Ganancia Neta Mes" : "Ganancia Neta Año";
  if (mVal) mVal.textContent = formatExactCurrency(gains - losses);
  if (mGains) mGains.textContent = `+${formatExactCurrency(gains)}`;
  if (mLosses) mLosses.textContent = `-${formatExactCurrency(losses)}`;
  
  const vol = gains + losses;
  if (mRatio) mRatio.textContent = vol > 0 ? `${((gains / vol) * 100).toFixed(1)}%` : '0.00%';
  if (mPct) mPct.textContent = total > 0 ? `${Math.round((wins / total) * 100)}%` : '0%';
  if (mCount) mCount.textContent = `(${wins} / ${total} ops)`;
}

function renderMonthView() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const subTitle = document.getElementById('sectionSubTitle');
  if (subTitle) subTitle.textContent = `Mes: ${monthNames[currentMonth]} ${currentYear}`;

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

  const todayStr = getSystemTodayKey();
  const active = getActiveAccount();

  days.forEach(dObj => {
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    const pnl = getDayPnL(dateKey);
    const trades = active.appData?.[dateKey] || [];
    const isToday = (dateKey === todayStr);

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
    cell.onclick = () => openDayModal(dateKey);
    grid.appendChild(cell);
  });

  updateSchwabMetrics();
}

function renderYearView() {
  const grid = document.getElementById('yearMonthsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const monthsShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const active = getActiveAccount();

  for (let m = 0; m < 12; m++) {
    const monthPrefix = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
    let mPnl = 0, mTrades = 0;
    Object.keys(active.appData || {}).forEach(k => {
      if (k.startsWith(monthPrefix)) {
        (active.appData[k] || []).forEach(t => {
          mPnl += Number(t.pnl || 0);
          mTrades++;
        });
      }
    });

    const card = document.createElement('div');
    card.className = "p-3.5 rounded-2xl border border-slate-200 dark:border-darkBorder bg-white dark:bg-darkSubtle/50 flex flex-col justify-between cursor-pointer hover:border-blue-400 transition";
    card.innerHTML = `
      <div class="flex justify-between text-xs font-bold">
        <span>${monthsShort[m]}</span>
        <span class="text-slate-400 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">${mTrades} trades</span>
      </div>
      <div class="text-sm font-black my-2 ${mPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${formatExactCurrency(mPnl)}</div>
    `;
    card.onclick = () => {
      currentMonth = m;
      switchView('Month');
    };
    grid.appendChild(card);
  }
}

function renderTickersView() {
  const grid = document.getElementById('tickersGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const active = getActiveAccount();
  const searchVal = (document.getElementById('tickerSearchInput')?.value || '').toUpperCase().trim();
  const sortBy = document.getElementById('tickerSortSelect')?.value || 'pnl-desc';
  const tickerStats = {};

  Object.keys(active.appData || {}).forEach(k => {
    if (k.startsWith(`${currentYear}`)) {
      (active.appData[k] || []).forEach(t => {
        const sym = (t.ticker || 'OTHER').split(' ')[0].toUpperCase().trim();
        if (!tickerStats[sym]) {
          tickerStats[sym] = { ticker: sym, total: 0, pnl: 0, wins: 0, losses: 0, cost: 0, tradesList: [] };
        }

        const p = Number(t.pnl || 0);
        const cost = Number(t.costBasis || 0);

        tickerStats[sym].total++;
        tickerStats[sym].pnl += p;
        tickerStats[sym].cost += cost;
        tickerStats[sym].tradesList.push({ ...t, dateKey: k });

        if (p > 0.005) tickerStats[sym].wins++;
        else if (p < -0.005) tickerStats[sym].losses++;
      });
    }
  });

  let list = Object.values(tickerStats);
  if (searchVal) list = list.filter(i => i.ticker.includes(searchVal));

  list.sort((a, b) => {
    if (sortBy === 'pnl-desc') return b.pnl - a.pnl;
    if (sortBy === 'pnl-asc') return a.pnl - b.pnl;
    if (sortBy === 'trades-desc') return b.total - a.total;
    if (sortBy === 'winrate-desc') {
      const wrA = (a.wins + a.losses) > 0 ? (a.wins / (a.wins + a.losses)) : 0;
      const wrB = (b.wins + b.losses) > 0 ? (b.wins / (b.wins + b.losses)) : 0;
      return wrB - wrA;
    }
    return 0;
  });

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 text-xs">No hay operaciones registradas en ${currentYear}.</div>`;
    return;
  }

  list.forEach(data => {
    const decidedTrades = data.wins + data.losses;
    const winRate = decidedTrades > 0 ? Math.round((data.wins / decidedTrades) * 100) : (data.total > 0 ? 100 : 0);
    const isNetWin = data.pnl >= 0;
    const roi = data.cost > 0 ? ((data.pnl / data.cost) * 100).toFixed(1) : 0;
    const tickerBadgeStyle = getTickerBadgeClass(data.ticker);

    const winPillStyle = winRate >= 50 
      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' 
      : 'bg-rose-950/80 text-rose-400 border border-rose-500/40';

    const card = document.createElement('div');
    card.className = "p-4 rounded-2xl border border-slate-800 bg-[#0d1424] text-white flex flex-col justify-between shadow-md hover:border-blue-500 transition cursor-pointer";
    card.innerHTML = `
      <div class="flex items-center justify-between pb-3">
        <div class="flex items-center space-x-2">
          <span class="px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wide ${tickerBadgeStyle}">${data.ticker}</span>
          <span class="px-2 py-0.5 rounded-md text-[10px] font-black ${winPillStyle}">${winRate}% Win</span>
        </div>
        <span class="text-base font-extrabold tracking-tight ${isNetWin ? 'text-emerald-400' : 'text-rose-400'}">
          ${formatExactCurrency(data.pnl)}
        </span>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
        <div>
          <span class="text-slate-400 block text-[10px]">Trades:</span>
          <span class="font-bold text-slate-100">${data.total} <span class="text-slate-400 font-medium">(${data.wins}W / ${data.losses}L)</span></span>
        </div>
        <div class="text-right">
          <span class="text-slate-400 block text-[10px]">Inversión Total:</span>
          <span class="font-bold text-slate-100 block">+${formatExactCurrency(data.cost).replace('$', '$')}</span>
          <span class="font-bold text-[10px] ${isNetWin ? 'text-emerald-400' : 'text-rose-400'}">${isNetWin ? '+' : ''}${roi}% ROI</span>
        </div>
      </div>
    `;
    card.onclick = () => openTickerDetailsModal(data);
    grid.appendChild(card);
  });
}

function openTickerDetailsModal(data) {
  const modalTitle = document.getElementById('tickerDetailsModalTitle');
  const modalSub = document.getElementById('tickerDetailsModalSub');
  const listContainer = document.getElementById('tickerDetailsModalList');
  const modalEl = document.getElementById('tickerDetailsModal');

  if (modalTitle) modalTitle.textContent = `Auditoría: ${data.ticker} (${currentYear})`;
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
        <span class="text-slate-400 text-[10px] ml-1">(${t.qty} ${t.type} Strike ${cleanStrike(t.strike)})</span>
        <div class="text-[10px] text-slate-500">Inversión: ${formatExactCurrency(t.costBasis)} &bull; Venta: ${formatExactCurrency(t.proceeds)}</div>
      </div>
      <span class="font-extrabold text-sm ${isWin ? 'text-emerald-400' : 'text-rose-400'}">${formatExactCurrency(t.pnl)}</span>
    `;
    listContainer.appendChild(item);
  });

  modalEl.classList.remove('hidden');
  modalEl.classList.add('flex');
  safeIcons();
}

function renderCommissionsView() {
  const tbody = document.getElementById('commissionsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const active = getActiveAccount();
  const fallbackRate = parseFloat(document.getElementById('feePerContractInput')?.value) || 1.30;
  const tickerStats = {};
  let totalComms = 0, totalContracts = 0, totalNet = 0;

  Object.keys(active.appData || {}).forEach(dKey => {
    if (dKey.startsWith(`${currentYear}`)) {
      (active.appData[dKey] || []).forEach(t => {
        const sym = (t.ticker || 'OTHER').split(' ')[0].toUpperCase().trim();
        const qty = parseInt(t.qty, 10) || 1;
        const pnl = Number(t.pnl || 0);

        let comm = 0;
        if (t.commission !== undefined && t.commission > 0) {
          comm = t.commission;
        } else {
          comm = qty * fallbackRate;
        }

        if (!tickerStats[sym]) {
          tickerStats[sym] = { ticker: sym, contracts: 0, netPnl: 0, commission: 0 };
        }
        tickerStats[sym].contracts += qty;
        tickerStats[sym].netPnl += pnl;
        tickerStats[sym].commission += comm;

        totalContracts += qty;
        totalNet += pnl;
        totalComms += comm;
      });
    }
  });

  const cCtos = document.getElementById('commTotalContracts');
  const cFees = document.getElementById('commTotalFees');
  const cImp = document.getElementById('commTotalImpact');

  if (cCtos) cCtos.textContent = `${totalContracts} ctos`;
  if (cFees) cFees.textContent = `-${formatExactCurrency(totalComms)}`;
  const gross = totalNet + totalComms;
  const impact = gross > 0 ? ((totalComms / gross) * 100).toFixed(1) : 0;
  if (cImp) cImp.textContent = `${impact}% de ganancia bruta`;

  Object.values(tickerStats).forEach(s => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-900/60 transition text-xs";
    tr.innerHTML = `
      <td class="py-2.5 px-3">
        <span class="px-2 py-0.5 rounded-lg font-black ${getTickerBadgeClass(s.ticker)}">${s.ticker}</span>
      </td>
      <td class="py-2.5 px-2 text-center font-bold text-slate-300">${s.contracts} ctos</td>
      <td class="py-2.5 px-2 text-right font-bold text-rose-400">-${formatExactCurrency(s.commission)}</td>
      <td class="py-2.5 px-2 text-right font-bold text-slate-200">+${formatExactCurrency(s.netPnl + s.commission).replace('$', '$')}</td>
      <td class="py-2.5 px-3 text-right font-black ${s.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">+${formatExactCurrency(s.netPnl).replace('$', '$')}</td>
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

  const netInflow = dep - wth;
  let cumulativePnl = 0;
  Object.keys(active.appData || {}).forEach(k => {
    (active.appData[k] || []).forEach(t => cumulativePnl += Number(t.pnl || 0));
  });

  const peakBalance = calculatePeakBalance(active);

  const curBalEl = document.getElementById('accountCurrentBalance');
  const depEl = document.getElementById('accountTotalDeposits');
  const wthEl = document.getElementById('accountTotalWithdrawals');
  const netInfEl = document.getElementById('accountNetCapitalInflow');
  const pnlEl = document.getElementById('accountNetOperatingPnl');
  const peakEl = document.getElementById('accountPeakBalance');
  const roiBadge = document.getElementById('accountRoiBadge');

  if (curBalEl) curBalEl.textContent = `+${formatExactCurrency(currentBal).replace('$', '$')}`;
  if (depEl) depEl.textContent = `+${formatExactCurrency(dep).replace('$', '$')}`;
  if (wthEl) wthEl.textContent = `-${formatExactCurrency(wth).replace('$', '$')}`;
  if (netInfEl) netInfEl.textContent = `+${formatExactCurrency(netInflow).replace('$', '$')}`;

  if (pnlEl) {
    pnlEl.textContent = `${cumulativePnl >= 0 ? '+' : '-'}${formatExactCurrency(Math.abs(cumulativePnl)).replace('$', '$')}`;
    pnlEl.className = `font-extrabold text-sm ${cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
  }

  if (peakEl) peakEl.textContent = `+${formatExactCurrency(peakBalance).replace('$', '$')}`;

  const roi = netInflow > 0 ? ((cumulativePnl / netInflow) * 100).toFixed(1) : 0;
  if (roiBadge) {
    roiBadge.textContent = `${cumulativePnl >= 0 ? '+' : ''}${roi}% ROI`;
    roiBadge.className = `px-2.5 py-0.5 rounded-full text-[10px] font-black ${cumulativePnl >= 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'}`;
  }

  const list = document.getElementById('capitalFlowsList');
  if (!list) return;
  list.innerHTML = '';

  const flows = active.capitalFlows || [];
  const cCountLabel = document.getElementById('capitalCountLabel');
  if (cCountLabel) cCountLabel.textContent = `${flows.length} movimientos`;

  if (flows.length === 0) {
    list.innerHTML = `<div class="text-center py-6 text-slate-500 text-xs">No hay movimientos registrados.</div>`;
    return;
  }

  const sortedFlows = [...flows].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedFlows.forEach(f => {
    const isTransfer = Boolean(f.transferId || f.category === 'transfer');
    const isDep = f.type === 'deposit';

    let icon = isTransfer ? 'arrow-left-right' : (isDep ? 'arrow-down-left' : 'arrow-up-right');
    let iconColor = isTransfer ? 'bg-cyan-500/15 text-cyan-400' : (isDep ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400');
    let title = isTransfer ? (isDep ? 'Transferencia (Entrada)' : 'Transferencia (Salida)') : (isDep ? 'Depósito Bancario' : 'Retiro a Banco');

    const editCall = isTransfer ? `window.openEditTransferModal('${f.transferId}', ${f.id})` : `window.editCapitalFlow(${f.id})`;

    const item = document.createElement('div');
    item.className = "p-2.5 rounded-xl border border-slate-800 bg-[#0d1424] text-white flex items-center justify-between text-xs hover:border-blue-500 transition";
    item.innerHTML = `
      <div class="flex items-center space-x-2.5 cursor-pointer" onclick="${editCall}">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center ${iconColor}">
          <i data-lucide="${icon}" class="w-4 h-4"></i>
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-100">${title}</span>
            ${isTransfer ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-950 text-cyan-300">Traspaso</span>` : ''}
          </div>
          <span class="text-[10px] text-blue-400 font-semibold block">${f.date} &bull; ${f.note}</span>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <span class="font-black text-xs ${isDep ? 'text-emerald-400' : 'text-rose-400'}">
          ${isDep ? '+' : '-'}${formatExactCurrency(f.amount)}
        </span>
        <button onclick="${editCall}" type="button" class="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800" title="Editar">
          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
        </button>
        <button onclick="window.removeCapitalFlow(${f.id})" type="button" class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800" title="Eliminar">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
    list.appendChild(item);
  });
  safeIcons();
}

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
      accounts.forEach(acc => {
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

function openDayModal(dateKey) {
  selectedDateKey = dateKey;
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
}

function resetTradeForm() {
  const editIdx = document.getElementById('editTradeIndex');
  const ticker = document.getElementById('tradeTicker');
  const qty = document.getElementById('tradeQty');
  const strike = document.getElementById('tradeStrike');
  const type = document.getElementById('tradeType');
  const dte = document.getElementById('tradeDteInput');
  const uCost = document.getElementById('tradeUnitCost');
  const uProceeds = document.getElementById('tradeUnitProceeds');
  const sText = document.getElementById('tradeSubmitText');

  if (editIdx) editIdx.value = '';
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
  const trades = active.appData?.[selectedDateKey] || [];

  let dailyTotal = 0;
  let dailyInvested = 0;

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

    const cardBorder = isWin 
      ? 'border-emerald-500/30 bg-[#0d2218]/50' 
      : 'border-rose-500/30 bg-[#251016]/50';

    const item = document.createElement('div');
    item.className = `p-3 rounded-2xl border ${cardBorder} flex items-center justify-between text-xs transition`;
    item.innerHTML = `
      <div class="flex flex-col space-y-1">
        <div class="flex items-center space-x-1.5 flex-wrap">
          <span class="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-black">${qty} ctos</span>
          <span class="px-2 py-0.5 rounded-md text-[10px] font-black ${getTickerBadgeClass(t.ticker)}">${t.ticker}</span>
          <span class="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold">Strike ${cleanStrike(t.strike)}</span>
          <span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold ${t.type === 'CALL' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}">${t.type}</span>
          <span class="px-1.5 py-0.5 rounded-md bg-amber-950/80 text-amber-400 border border-amber-800 text-[9px] font-black">${t.dte || '0DTE'}</span>
        </div>
        <div class="text-[11px] text-slate-400">
          Cto Compra: <strong class="text-white">$${unitCost}</strong> &rarr; Cto Venta: <strong class="text-white">$${unitProceeds}</strong> | 
          <span class="text-[10px]">Total: <span class="text-slate-300">${formatExactCurrency(cost)}</span> &rarr; <span class="text-slate-300">${formatExactCurrency(proceeds)}</span></span>
        </div>
      </div>

      <div class="flex items-center space-x-2 text-right">
        <div>
          <span class="font-extrabold text-sm block ${isWin ? 'text-emerald-400' : 'text-rose-400'}">
            ${formatExactCurrency(pnl)}
          </span>
          <span class="text-[10px] font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}">${isWin ? '+' : ''}${roi}%</span>
        </div>
        <button onclick="window.editTrade(${idx})" class="p-1 text-slate-400 hover:text-white" title="Editar"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
        <button onclick="window.removeTrade(${idx})" class="p-1 text-slate-400 hover:text-rose-400" title="Eliminar"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
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
  const t = active.appData?.[selectedDateKey]?.[idx];
  if (!t) return;
  const qty = t.qty || 1;
  const cost = Number(t.costBasis || 0);
  const proceeds = Number(t.proceeds || (cost + Number(t.pnl || 0)));

  const eIdx = document.getElementById('editTradeIndex');
  const ticker = document.getElementById('tradeTicker');
  const qEl = document.getElementById('tradeQty');
  const sEl = document.getElementById('tradeStrike');
  const typEl = document.getElementById('tradeType');
  const dteEl = document.getElementById('tradeDteInput');
  const cEl = document.getElementById('tradeUnitCost');
  const pEl = document.getElementById('tradeUnitProceeds');
  const sText = document.getElementById('tradeSubmitText');

  if (eIdx) eIdx.value = String(idx);
  if (ticker) ticker.value = t.ticker;
  if (qEl) qEl.value = qty;
  if (sEl) sEl.value = cleanStrike(t.strike);
  if (typEl) typEl.value = t.type;
  if (dteEl) dteEl.value = t.dte || '0DTE';
  if (cEl) cEl.value = (cost / qty).toFixed(2);
  if (pEl) pEl.value = (proceeds / qty).toFixed(2);
  if (sText) sText.textContent = 'Guardar Cambios';
};

window.removeTrade = async function(idx) {
  const active = getActiveAccount();
  if (active.appData?.[selectedDateKey]) {
    active.appData[selectedDateKey].splice(idx, 1);
    if (active.appData[selectedDateKey].length === 0) delete active.appData[selectedDateKey];
    await saveAccountsData();
    renderDayTradesList();
    refreshActiveView();
  }
};

function switchView(view) {
  currentView = view;
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
}

function refreshActiveView() {
  renderAccountSelector();
  updateTotalTradesHeader();
  if (currentView === 'Month') renderMonthView();
  else if (currentView === 'Year') renderYearView();
  else if (currentView === 'Tickers') renderTickersView();
  else if (currentView === 'Commissions') renderCommissionsView();
  else renderCapitalView();
  safeIcons();
}

// 4. CONTROLADORES DE EVENTOS
function setupEventListeners() {
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    applyTheme();
    saveAccountsData();
    refreshActiveView();
  });

  ['Month', 'Year', 'Tickers', 'Commissions', 'Capital'].forEach(v => {
    document.getElementById('view' + v + 'Btn')?.addEventListener('click', () => switchView(v));
  });

  document.getElementById('accountSelect')?.addEventListener('change', (e) => {
    activeAccountId = e.target.value;
    saveAccountsData();

    const active = getActiveAccount();
    const dates = Object.keys(active.appData || {}).sort();
    if (dates.length > 0) {
      const lastDate = dates[dates.length - 1];
      const parts = lastDate.split('-');
      currentYear = parseInt(parts[0], 10);
      currentMonth = parseInt(parts[1], 10) - 1;
      const pYear = document.getElementById('periodYearSelect');
      if (pYear) pYear.value = String(currentYear);
    }

    renderAccountSelector();
    refreshActiveView();
  });

  // Modal Cuentas
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
    deleteAccountBtn?.classList.toggle('hidden', accounts.length <= 1);
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
      const acc = accounts.find(a => a.id === editId);
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
      accounts.push(newAcc);
      activeAccountId = newAcc.id;
    }

    await saveAccountsData();
    if (accountModal) accountModal.style.display = 'none';
    renderAccountSelector();
    refreshActiveView();
  });

  deleteAccountBtn?.addEventListener('click', async () => {
    const active = getActiveAccount();
    if (confirm(`¿Eliminar la cuenta "${active.broker} (${active.number})"?`)) {
      accounts = accounts.filter(a => a.id !== active.id);
      activeAccountId = accounts[0].id;
      await saveAccountsData();
      if (accountModal) accountModal.style.display = 'none';
      renderAccountSelector();
      refreshActiveView();
    }
  });

  // Modal de Trade
  document.getElementById('tradeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const active = getActiveAccount();
    if (!active.appData) active.appData = {};
    if (!active.appData[selectedDateKey]) active.appData[selectedDateKey] = [];

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
      active.appData[selectedDateKey][parseInt(idxStr, 10)] = tradeObj;
    } else {
      active.appData[selectedDateKey].push(tradeObj);
    }

    await saveAccountsData();
    resetTradeForm();
    renderDayTradesList();
    refreshActiveView();
  });

  // Modal CSV
  const csvModal = document.getElementById('csvModal');
  document.getElementById('openCsvModalBtn')?.addEventListener('click', () => {
    if (csvModal) {
      csvModal.classList.remove('hidden');
      csvModal.classList.add('flex');
    }
    const procBtn = document.getElementById('processCsvBtn');
    if (procBtn) procBtn.disabled = true;
    document.getElementById('csvPreviewBox')?.classList.add('hidden');
    document.getElementById('csvModeSelection')?.classList.add('hidden');
    safeIcons();
  });

  document.getElementById('closeCsvModalBtn')?.addEventListener('click', () => {
    if (csvModal) {
      csvModal.classList.add('hidden');
      csvModal.classList.remove('flex');
    }
  });
  document.getElementById('cancelCsvBtn')?.addEventListener('click', () => {
    if (csvModal) {
      csvModal.classList.add('hidden');
      csvModal.classList.remove('flex');
    }
  });

  document.getElementById('csvFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    parseCsvFile(file, {
      onSuccess: (data) => {
        csvFileType = data.type;
        if (data.type === 'transactions') parsedCsvFlows = data.flows;
        else parsedCsvTrades = data.trades;

        const fName = document.getElementById('csvFileName');
        const fFound = document.getElementById('csvTradesFound');
        const sText = document.getElementById('csvSummaryText');
        const pBtn = document.getElementById('processCsvBtn');

        if (fName) fName.textContent = file.name;
        if (fFound) fFound.textContent = `${data.type === 'transactions' ? data.flows.length : data.trades.length} registros (${data.broker})`;
        if (sText) sText.textContent = `Período: ${data.minDate || '-'} al ${data.maxDate || '-'}`;
        document.getElementById('csvPreviewBox')?.classList.remove('hidden');
        document.getElementById('csvModeSelection')?.classList.remove('hidden');
        if (pBtn) pBtn.disabled = false;
      },
      onError: (msg) => alert(msg)
    });
  });

  document.getElementById('processCsvBtn')?.addEventListener('click', async () => {
    const mode = document.querySelector('input[name="csvImportMode"]:checked')?.value || 'merge';
    const active = getActiveAccount();

    if (csvFileType === 'transactions' && parsedCsvFlows) {
      if (mode === 'replace') active.capitalFlows = [];
      if (!active.capitalFlows) active.capitalFlows = [];

      parsedCsvFlows.forEach(f => {
        const isDup = active.capitalFlows.some(cf => cf.date === f.date && Math.abs(cf.amount - f.amount) < 0.05 && cf.type === f.type);
        if (!isDup) active.capitalFlows.push(f);
      });

      await saveAccountsData();
      if (csvModal) {
        csvModal.classList.add('hidden');
        csvModal.classList.remove('flex');
      }
      switchView('Capital');
      return;
    }

    if (csvFileType === 'trades' && parsedCsvTrades) {
      if (mode === 'replace') active.appData = {};
      if (!active.appData) active.appData = {};

      parsedCsvTrades.forEach(item => {
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
        } else {
          const existing = active.appData[item.dateKey].find(ex =>
            (ex.ticker || '').split(' ')[0].toUpperCase().trim() === (item.trade.ticker || '').split(' ')[0].toUpperCase().trim() &&
            Math.abs(Number(ex.pnl || 0) - Number(item.trade.pnl || 0)) < 0.20
          );
          if (existing && Number(item.trade.costBasis || 0) > Number(existing.costBasis || 0)) {
            existing.costBasis = item.trade.costBasis;
            existing.proceeds = item.trade.proceeds;
          }
        }
      });

      deduplicateAccountData(active);
      await saveAccountsData();

      if (csvModal) {
        csvModal.classList.add('hidden');
        csvModal.classList.remove('flex');
      }

      if (parsedCsvTrades.length > 0) {
        const lastDate = parsedCsvTrades[parsedCsvTrades.length - 1].dateKey;
        const parts = lastDate.split('-');
        currentYear = parseInt(parts[0], 10);
        currentMonth = parseInt(parts[1], 10) - 1;
        const pYear = document.getElementById('periodYearSelect');
        if (pYear) pYear.value = String(currentYear);
      }

      refreshActiveView();
    }
  });

  // Backup Express
  document.getElementById('downloadBackupBtn')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();
      alert(`¡Copia de seguridad guardada en el servidor en: ${data.backupPath}!`);
    } catch (e) {
      alert('Error al generar backup en disco: ' + e.message);
    }
  });

  document.getElementById('closeModalBtn')?.addEventListener('click', () => {
    const dModal = document.getElementById('dayModal');
    if (dModal) {
      dModal.classList.add('hidden');
      dModal.classList.remove('flex');
    }
  });

  document.getElementById('helpBtn')?.addEventListener('click', () => {
    const iModal = document.getElementById('infoModal');
    if (iModal) {
      iModal.classList.remove('hidden');
      iModal.classList.add('flex');
    }
  });

  document.getElementById('closeInfoModalBtn')?.addEventListener('click', () => {
    const iModal = document.getElementById('infoModal');
    if (iModal) {
      iModal.classList.add('hidden');
      iModal.classList.remove('flex');
    }
  });

  document.getElementById('closeTickerDetailsModalBtn')?.addEventListener('click', () => {
    const tModal = document.getElementById('tickerDetailsModal');
    if (tModal) {
      tModal.classList.add('hidden');
      tModal.classList.remove('flex');
    }
  });

  document.getElementById('prevPeriodBtn')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    const pYear = document.getElementById('periodYearSelect');
    if (pYear) pYear.value = String(currentYear);
    refreshActiveView();
  });

  document.getElementById('nextPeriodBtn')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    const pYear = document.getElementById('periodYearSelect');
    if (pYear) pYear.value = String(currentYear);
    refreshActiveView();
  });

  document.getElementById('periodYearSelect')?.addEventListener('change', (e) => {
    currentYear = parseInt(e.target.value, 10);
    refreshActiveView();
  });

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

// 5. INICIALIZADOR SEGURO
export function initApp() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupEventListeners();
      loadAccountsData();
    });
  } else {
    setupEventListeners();
    loadAccountsData();
  }
}