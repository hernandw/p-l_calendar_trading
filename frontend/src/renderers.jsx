export function formatMoney(val) {
  const num = Number(val || 0);
  return num >= 0 ? `+$${num.toFixed(2)}` : `-$${Math.abs(num).toFixed(2)}`;
}

export function formatExactCurrency(val) {
  const num = Number(val || 0);
  const formatted = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return num >= 0 ? `+$${formatted}` : `-$${formatted}`;
}

export function getSystemTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function cleanStrike(val) {
  if (!val || val === '-') return '-';
  return String(val).replace(/\$/g, '').trim();
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
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

// Cálculo del P&L acumulado por día de operaciones
export function getDayPnL(activeAccount, dateKey) {
  const trades = activeAccount?.appData?.[dateKey] || [];
  if (trades.length === 0) return null;
  return trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
}