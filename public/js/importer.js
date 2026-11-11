/**
 * public/js/importer.js - Analizador CSV especializado para Schwab e IBKR
 */

ex/**
 * public/js/importer.js - Analizador CSV con soporte nativo de Acciones y Opciones
 */

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
  if (!val || val === '-' || val === 'NaN') return '-';
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
      let isIbkrCashSummary = false;
      let brokerDetected = 'Schwab';

      for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const rowStr = rows[i].map(c => String(c).trim().toLowerCase());
        
        if (rowStr.some(c => c === 'startingcash' || c === 'depositsmtd')) {
          headerRowIndex = i;
          isTransactionsFile = true;
          isIbkrCashSummary = true;
          brokerDetected = 'IBKR';
          break;
        }

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

      // CASO A: FLUJOS DE EFECTIVO
      if (isTransactionsFile) {
        const flows = [];
        let minD = null, maxD = null;

        if (isIbkrCashSummary) {
          const fromDateIdx = headers.findIndex(h => /fromdate/i.test(h));
          const startingCashIdx = headers.findIndex(h => /^startingcash$/i.test(h));
          const depositsIdx = headers.findIndex(h => /^deposits$|^depositsmtd$/i.test(h));

          for (let r = headerRowIndex + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length < 5) continue;
            const dateRaw = fromDateIdx !== -1 ? String(row[fromDateIdx] || '').trim() : '';
            const formattedDate = parseFlexibleDate(dateRaw) || new Date().toISOString().split('T')[0];

            const startCash = startingCashIdx !== -1 ? parseFloat(String(row[startingCashIdx] || '').replace(/[\$\,]/g, '')) : 0;
            const depAmount = depositsIdx !== -1 ? parseFloat(String(row[depositsIdx] || '').replace(/[\$\,]/g, '')) : 0;
            const netDeposit = depAmount > 0 ? depAmount : (startCash > 0 ? startCash : 0);

            if (netDeposit > 0) {
              flows.push({
                id: Date.now() + Math.random(),
                type: 'deposit',
                category: 'external',
                date: formattedDate,
                amount: netDeposit,
                note: 'Fondeo de Efectivo IBKR (Starting/Deposited Cash)'
              });
              if (!minD || formattedDate < minD) minD = formattedDate;
              if (!maxD || formattedDate > maxD) maxD = formattedDate;
            }
          }
        }

        callbacks.onSuccess({
          type: 'transactions',
          broker: brokerDetected,
          flows,
          minDate: minD,
          maxDate: maxD
        });
        return;
      }

      // CASO B: TRADES (OPCIONES Y ACCIONES)
      const symbolIdx = headers.findIndex(h => /^symbol$|description/i.test(h));
      const closedDateIdx = headers.findIndex(h => /closed\s*date|^tradedate$|datetime|^date$/i.test(h));
      const qtyIdx = headers.findIndex(h => /quantity|^qty$/i.test(h));
      const priceIdx = headers.findIndex(h => /tradeprice|price/i.test(h));
      const costBasisIdx = headers.findIndex(h => /cost\s*basis|^cost$|basis/i.test(h));
      const proceedsIdx = headers.findIndex(h => /proceeds/i.test(h));
      const gainLossIdx = headers.findIndex(h => /gain\/loss|fifopnlrealized/i.test(h));
      const commIdx = headers.findIndex(h => /ibcommission|commission/i.test(h));
      const assetClassIdx = headers.findIndex(h => /assetclass/i.test(h));

      // Sumar comisiones de compra si están separadas
      const buyCommissionsByTicker = {};
      if (brokerDetected === 'IBKR' && commIdx !== -1) {
        for (let r = headerRowIndex + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;
          const rawPnl = parseFloat(String(row[gainLossIdx] || '').replace(/[\$\,]/g, ''));
          const sym = String(row[symbolIdx] || '').trim();
          const comm = Math.abs(parseFloat(String(row[commIdx] || '').replace(/[\$\,]/g, '')) || 0);
          if (rawPnl === 0 && comm > 0) {
            buyCommissionsByTicker[sym] = (buyCommissionsByTicker[sym] || 0) + comm;
          }
        }
      }

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

        // En IBKR, las aperturas tienen PnL 0; se omiten
        if (brokerDetected === 'IBKR' && rawPnl === 0) continue;

        const qty = (qtyIdx !== -1 && row[qtyIdx]) ? Math.abs(parseInt(String(row[qtyIdx]).trim(), 10) || 1) : 1;
        const tradePrice = (priceIdx !== -1 && row[priceIdx]) ? Math.abs(parseFloat(String(row[priceIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;
        let proceedsVal = (proceedsIdx !== -1 && row[proceedsIdx]) ? Math.abs(parseFloat(String(row[proceedsIdx]).replace(/[\$\,]/g, '').trim()) || 0) : (qty * tradePrice);

        let costBasis = (costBasisIdx !== -1 && row[costBasisIdx]) ? Math.abs(parseFloat(String(row[costBasisIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;
        if (costBasis === 0 && proceedsVal > 0) costBasis = Math.abs(proceedsVal - rawPnl);

        let realCommission = 0;
        if (commIdx !== -1 && row[commIdx]) {
          realCommission = Math.abs(parseFloat(String(row[commIdx]).replace(/[\$\,]/g, '').trim()) || 0);
          if (buyCommissionsByTicker[symbolRaw]) {
            realCommission += buyCommissionsByTicker[symbolRaw];
            delete buyCommissionsByTicker[symbolRaw];
          }
        }

        const dateKey = parseFlexibleDate(closedDateRaw);
        if (!dateKey) continue;

        const assetClass = (assetClassIdx !== -1 && row[assetClassIdx]) ? String(row[assetClassIdx]).trim().toUpperCase() : '';
        const isStock = assetClass === 'STK' || brokerDetected === 'IBKR';

        let ticker = symbolRaw.split(' ')[0].toUpperCase().trim();
        let strike = "-";
        let type = isStock ? "STK" : "CALL";
        let dte = "-";

        const schwabMatch = symbolRaw.match(/^([A-Z0-9]+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d\.]+)\s+([CP])$/i);
        if (schwabMatch) {
          ticker = schwabMatch[1].toUpperCase().trim();
          strike = cleanStrike(schwabMatch[3]);
          type = schwabMatch[4].toUpperCase() === 'C' ? 'CALL' : 'PUT';
          dte = '0DTE';
        }

        trades.push({
          dateKey,
          trade: {
            ticker,
            qty,
            strike,
            type,
            dte,
            costBasis,
            proceeds: proceedsVal,
            pnl: rawPnl,
            commission: realCommission
          }
        });

        totalNet += rawPnl;
        totalInvested += costBasis;
        if (!minD || dateKey < minD) minD = dateKey;
        if (!maxD || dateKey > maxD) maxD = dateKey;
      }

      callbacks.onSuccess({
        type: 'trades',
        broker: brokerDetected,
        trades,
        totalNet,
        totalInvested,
        minDate: minD,
        maxDate: maxD
      });
    },
    error: function (err) {
      callbacks.onError("Error al leer el archivo CSV: " + err.message);
    }
  });
}