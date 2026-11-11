/**
 * public/js/state.js - Estado Global y Persistencia en Disco vía Express
 */

export const state = {
  isDarkMode: true,
  accounts: [],
  activeAccountId: null,
  currentView: 'Month',
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedDateKey: null,
  parsedCsvTrades: null,
  parsedCsvFlows: null,
  csvFileType: 'trades'
};

export function cleanStrike(val) {
  if (!val || val === '-') return '-';
  return String(val).replace(/\$/g, '').trim();
}

export function formatExactCurrency(val) {
  if (val === undefined || isNaN(val)) return '$0.00';
  const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
  return `${sign}$${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMoney(val) {
  if (val === undefined || isNaN(val)) return '$0.00';
  const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
  const absVal = Math.abs(val);
  if (absVal >= 1000) return `${sign}${(absVal / 1000).toFixed(2)}K`;
  return `${sign}${absVal.toFixed(2)}`;
}

export function getActiveAccount() {
  return state.accounts.find(a => a.id === state.activeAccountId) || state.accounts[0] || { appData: {}, capitalFlows: [] };
}

export function getSystemTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function deduplicateAccountData(acc) {
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
        if (t.commission !== undefined && t.commission > 0) existing.commission = t.commission;
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

export async function loadAccountsData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    state.accounts = data.accounts || [];
    state.activeAccountId = data.activeAccountId || state.accounts[0]?.id;
    state.isDarkMode = data.isDarkMode ?? true;
    state.accounts.forEach(acc => deduplicateAccountData(acc));
  } catch (err) {
    console.error('Error al conectar con la API de Express:', err);
  }
}

export async function saveAccountsData() {
  try {
    const payload = {
      activeAccountId: state.activeAccountId,
      isDarkMode: state.isDarkMode,
      accounts: state.accounts
    };
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Error al guardar datos en el servidor:', err);
  }
}