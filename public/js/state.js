/**
 * public/js/state.js - Estado global y persistencia con Express
 */
import { cleanStrike } from './importer.js';

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

export function getActiveAccount() {
  return state.accounts.find(a => a.id === state.activeAccountId) || state.accounts[0] || { appData: {}, capitalFlows: [] };
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

export function getDayPnL(dateKey) {
  const active = getActiveAccount();
  const trades = active.appData?.[dateKey] || [];
  if (trades.length === 0) return null;
  return trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
}

export function getAccountBalance(accountId, excludeFlowId = null, excludeTransferId = null) {
  const acc = state.accounts.find(a => a.id === accountId);
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

export function calculatePeakBalance(acc) {
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
        // Actualizar datos si el nuevo trae costo o comisión real de IBKR
        if (Number(t.costBasis || 0) > Number(existing.costBasis || 0)) {
          existing.costBasis = t.costBasis;
          existing.proceeds = t.proceeds;
        }
        if (t.commission !== undefined && t.commission > 0) {
          existing.commission = t.commission;
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