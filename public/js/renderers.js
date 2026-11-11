/**
 * public/js/renderers.js - Funciones de Renderizado Visual
 */
import { state, getActiveAccount, getDayPnL, formatMoney, formatExactCurrency, getSystemTodayKey, cleanStrike } from './state.js';

export function safeIcons() {
  try {
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (e) {
    console.warn('Lucide:', e);
  }
}

export function applyTheme() {
  const htmlEl = document.documentElement;
  const themeIcon = document.getElementById('themeIcon');
  if (state.isDarkMode) {
    htmlEl.classList.add('dark');
    if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
  } else {
    htmlEl.classList.remove('dark');
    if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
  }
  safeIcons();
}

export function getTickerBadgeClass(ticker) {
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

export function renderAccountSelector() {
  const select = document.getElementById('accountSelect');
  if (!select) return;
  select.innerHTML = '';
  state.accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = `${acc.broker} (${acc.number}) - ${acc.type}`;
    if (acc.id === state.activeAccountId) opt.selected = true;
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
    transferBtnCont.classList.toggle('hidden', state.accounts.length < 2);
  }
}

export function updateTotalTradesHeader() {
  const active = getActiveAccount();
  let count = 0;
  Object.keys(active.appData || {}).forEach(k => {
    if (k.startsWith(`${state.currentYear}`)) {
      count += (active.appData[k] || []).length;
    }
  });
  const pill = document.getElementById('totalTradesPill');
  if (pill) pill.textContent = `${count} trades en total`;
}

export function updateSchwabMetrics() {
  const active = getActiveAccount();
  let gains = 0, losses = 0, wins = 0, total = 0;
  const prefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}`;

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

  const isMonth = (state.currentView === 'Month');
  const mTitle = document.getElementById('metricTotalTitle');
  const mVal = document.getElementById('metricTotalVal');
  const mGains = document.getElementById('metricGrossGains');
  const mLosses = document.getElementById('metricGrossLosses');
  const mRatio = document.getElementById('metricSchwabRatio');
  const mPct = document.getElementById('metricTradesPct');
  const mCount = document.getElementById('metricTradesCount');

  if (mTitle) mTitle.textContent = isMonth ? "Ganancia Neta Mes" : "Ganancia Neta Año";
  if (mVal) mVal.textContent = formatExactCurrency(gains - losses);
  if (mGains) mGains.textContent = formatExactCurrency(gains);
  if (mLosses) mLosses.textContent = formatExactCurrency(-losses);
  
  const vol = gains + losses;
  if (mRatio) mRatio.textContent = vol > 0 ? `${((gains / vol) * 100).toFixed(1)}%` : '0.00%';
  if (mPct) mPct.textContent = total > 0 ? `${Math.round((wins / total) * 100)}%` : '0%';
  if (mCount) mCount.textContent = `(${wins} / ${total} ops)`;
}

export function renderMonthView() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const subTitle = document.getElementById('sectionSubTitle');
  if (subTitle) subTitle.textContent = `Mes: ${monthNames[state.currentMonth]} ${state.currentYear}`;

  const firstOfMonth = new Date(state.currentYear, state.currentMonth, 1);
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
    cell.onclick = () => window.openDayModal(dateKey);
    grid.appendChild(cell);
  });

  updateSchwabMetrics();
}

export function renderYearView() {
  const grid = document.getElementById('yearMonthsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const monthsShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const active = getActiveAccount();

  for (let m = 0; m < 12; m++) {
    const monthPrefix = `${state.currentYear}-${String(m + 1).padStart(2, '0')}`;
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
      state.currentMonth = m;
      window.switchView('Month');
    };
    grid.appendChild(card);
  }
}

export function renderTickersView() {
  const grid = document.getElementById('tickersGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const active = getActiveAccount();
  const searchVal = (document.getElementById('tickerSearchInput')?.value || '').toUpperCase().trim();
  const sortBy = document.getElementById('tickerSortSelect')?.value || 'pnl-desc';
  const tickerStats = {};

  Object.keys(active.appData || {}).forEach(k => {
    if (k.startsWith(`${state.currentYear}`)) {
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
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 text-xs">No hay operaciones registradas en ${state.currentYear}.</div>`;
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
          <span class="font-bold text-slate-100 block">${formatExactCurrency(data.cost)}</span>
          <span class="font-bold text-[10px] ${isNetWin ? 'text-emerald-400' : 'text-rose-400'}">${isNetWin ? '+' : ''}${roi}% ROI</span>
        </div>
      </div>
    `;
    card.onclick = () => window.openTickerDetailsModal(data);
    grid.appendChild(card);
  });
}

// CORRECCIÓN EXACTA DE COMISIONES IBKR VS SCHWAB
export function renderCommissionsView() {
  const tbody = document.getElementById('commissionsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const active = getActiveAccount();
  const fallbackRate = parseFloat(document.getElementById('feePerContractInput')?.value) || 1.30;
  const tickerStats = {};
  let totalComms = 0, totalContracts = 0, totalNet = 0;

  Object.keys(active.appData || {}).forEach(dKey => {
    if (dKey.startsWith(`${state.currentYear}`)) {
      (active.appData[dKey] || []).forEach(t => {
        const sym = (t.ticker || 'OTHER').split(' ')[0].toUpperCase().trim();
        const qty = parseInt(t.qty, 10) || 1;
        const pnl = Number(t.pnl || 0);

        let comm = 0;
        // Si trae la comisión explícita del CSV (IBCommission), se usa directa
        if (t.commission !== undefined && t.commission > 0) {
          comm = t.commission;
        } else if (t.type === 'STK') {
          // Si son acciones sin comisión explícita, no se cobra tarifa de opciones
          comm = 0;
        } else {
          // Si son opciones de Schwab, se cobra $1.30 por contrato round-trip
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

  if (cCtos) cCtos.textContent = `${totalContracts} ops`;
  if (cFees) cFees.textContent = `-${formatExactCurrency(totalComms).replace('-', '').replace('+', '')}`;
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
      <td class="py-2.5 px-2 text-center font-bold text-slate-300">${s.contracts} ops</td>
      <td class="py-2.5 px-2 text-right font-bold text-rose-400">-${formatExactCurrency(s.commission).replace('-', '').replace('+', '')}</td>
      <td class="py-2.5 px-2 text-right font-bold text-slate-200">${formatExactCurrency(s.netPnl + s.commission)}</td>
      <td class="py-2.5 px-3 text-right font-black ${s.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatExactCurrency(s.netPnl)}</td>
    `;
    tbody.appendChild(tr);
  });
}

export function renderCapitalView() {
  const active = getActiveAccount();
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

  const currentBal = netInflow + cumulativePnl;

  const curBalEl = document.getElementById('accountCurrentBalance');
  const depEl = document.getElementById('accountTotalDeposits');
  const wthEl = document.getElementById('accountTotalWithdrawals');
  const netInfEl = document.getElementById('accountNetCapitalInflow');
  const pnlEl = document.getElementById('accountNetOperatingPnl');
  const peakEl = document.getElementById('accountPeakBalance');
  const roiBadge = document.getElementById('accountRoiBadge');

  if (curBalEl) curBalEl.textContent = formatExactCurrency(currentBal);
  if (depEl) depEl.textContent = formatExactCurrency(dep);
  if (wthEl) wthEl.textContent = `-${formatExactCurrency(wth).replace('-', '').replace('+', '')}`;
  if (netInfEl) netInfEl.textContent = formatExactCurrency(netInflow);

  if (pnlEl) {
    pnlEl.textContent = formatExactCurrency(cumulativePnl);
    pnlEl.className = `font-extrabold text-sm ${cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
  }

  if (peakEl) peakEl.textContent = formatExactCurrency(Math.max(currentBal, netInflow));

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

    const item = document.createElement('div');
    item.className = "p-2.5 rounded-xl border border-slate-800 bg-[#0d1424] text-white flex items-center justify-between text-xs hover:border-blue-500 transition";
    item.innerHTML = `
      <div class="flex items-center space-x-2.5 cursor-pointer">
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
          ${isDep ? '+' : '-'}${formatExactCurrency(f.amount).replace('-', '').replace('+', '')}
        </span>
      </div>
    `;
    list.appendChild(item);
  });
  safeIcons();
}