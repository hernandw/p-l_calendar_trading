import Papa from 'papaparse';

export function parseFlexibleDate(dateStr) {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().split(';')[0].split(' ')[0].split('T')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  if (/^\d{8}$/.test(clean)) {
    return `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}`;
  }
  return null;
}

export function cleanStrike(val) {
  if (!val || val === '-') return '-';
  return String(val).replace(/\$/g, '').trim();
}

export function parseCsvFile(file, callbacks) {
  Papa.parse(file, {
    header: false,
    skipEmptyLines: true,
    complete: function (results) {
      const rows = results.data;
      if (!rows || rows.length === 0) {
        callbacks.onError("El archivo CSV está vacío.");
        return;
      }

      let headerRowIndex = -1;
      let isTransactionsFile = false;
      let brokerDetected = 'Schwab';

      for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const rowStr = rows[i].map(c => String(c).trim().toLowerCase());
        const hasAction = rowStr.some(c => c.includes('action') || c.includes('type'));
        const hasAmount = rowStr.some(c => c.includes('amount') || c.includes('monto'));
        if (hasAction && hasAmount) {
          headerRowIndex = i;
          isTransactionsFile = true;
          brokerDetected = 'IBKR';
          break;
        }

        const hasSymbol = rowStr.some(c => c === 'symbol' || c === 'description');
        const hasPnl = rowStr.some(c => c.includes('gain/loss') || c.includes('fifopnlrealized'));
        const hasIbkrCols = rowStr.some(c => c.includes('fifopnlrealized') || c.includes('tradedate'));

        if ((hasSymbol && hasPnl) || hasIbkrCols) {
          headerRowIndex = i;
          isTransactionsFile = false;
          if (hasIbkrCols || rowStr.some(c => c === 'assetclass')) brokerDetected = 'IBKR';
          break;
        }
      }

      if (headerRowIndex === -1) {
        callbacks.onError("No se reconoció el formato de Schwab ni de Interactive Brokers.");
        return;
      }

      const headers = rows[headerRowIndex].map(h => String(h).trim());

      if (isTransactionsFile) {
        const flows = [];
        callbacks.onSuccess({ type: 'transactions', broker: brokerDetected, flows });
        return;
      }

      const symbolIdx = headers.findIndex(h => /^symbol$|description/i.test(h));
      const closedDateIdx = headers.findIndex(h => /closed\s*date|^tradedate$|datetime|^date$/i.test(h));
      const qtyIdx = headers.findIndex(h => /quantity|^qty$/i.test(h));
      const priceIdx = headers.findIndex(h => /tradeprice|price/i.test(h));
      const costBasisIdx = headers.findIndex(h => /cost\s*basis|^cost$|basis/i.test(h));
      const proceedsIdx = headers.findIndex(h => /proceeds/i.test(h));
      const gainLossIdx = headers.findIndex(h => /gain\/loss|fifopnlrealized/i.test(h));
      const commIdx = headers.findIndex(h => /ibcommission|commission/i.test(h));
      const assetClassIdx = headers.findIndex(h => /assetclass/i.test(h));

      const trades = [];
      let totalNet = 0, totalInvested = 0, minD = null, maxD = null;

      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length <= symbolIdx) continue;

        const symbolRaw = String(row[symbolIdx] || '').trim();
        const closedDateRaw = String(row[closedDateIdx] || '').trim();
        const gainLossRaw = String(row[gainLossIdx] || '').trim();
        if (!symbolRaw || !closedDateRaw || !gainLossRaw) continue;

        const rawPnl = parseFloat(gainLossRaw.replace(/\$/g, '').replace(/,/g, '').trim());
        if (isNaN(rawPnl)) continue;

        if (brokerDetected === 'IBKR' && rawPnl === 0) continue;

        const qty = (qtyIdx !== -1 && row[qtyIdx]) ? Math.abs(parseInt(String(row[qtyIdx]).trim(), 10) || 1) : 1;
        const tradePrice = (priceIdx !== -1 && row[priceIdx]) ? Math.abs(parseFloat(String(row[priceIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;
        let proceedsVal = (proceedsIdx !== -1 && row[proceedsIdx]) ? Math.abs(parseFloat(String(row[proceedsIdx]).replace(/[\$\,]/g, '').trim()) || 0) : (qty * tradePrice);

        let costBasis = (costBasisIdx !== -1 && row[costBasisIdx]) ? Math.abs(parseFloat(String(row[costBasisIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;
        if (costBasis === 0 && proceedsVal > 0) costBasis = Math.abs(proceedsVal - rawPnl);

        let realCommission = commIdx !== -1 && row[commIdx] ? Math.abs(parseFloat(String(row[commIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;
        const dateKey = parseFlexibleDate(closedDateRaw);
        if (!dateKey) continue;

        const assetClass = (assetClassIdx !== -1 && row[assetClassIdx]) ? String(row[assetClassIdx]).trim().toUpperCase() : '';
        const isStock = assetClass === 'STK' || brokerDetected === 'IBKR';

        let ticker = symbolRaw.split(' ')[0].toUpperCase().trim();
        let strike = "-";
        let type = isStock ? "STK" : "CALL";
        let dte = "-";

        trades.push({
          dateKey,
          trade: { ticker, qty, strike, type, dte, costBasis, proceeds: proceedsVal, pnl: rawPnl, commission: realCommission }
        });

        totalNet += rawPnl;
        totalInvested += costBasis;
        if (!minD || dateKey < minD) minD = dateKey;
        if (!maxD || dateKey > maxD) maxD = dateKey;
      }

      callbacks.onSuccess({ type: 'trades', broker: brokerDetected, trades, totalNet, totalInvested, minDate: minD, maxDate: maxD });
    },
    error: function (err) {
      callbacks.onError("Error al leer el CSV: " + err.message);
    }
  });
}