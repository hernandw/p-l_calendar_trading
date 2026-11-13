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
      let isSummaryCashFile = false;
      let brokerDetected = 'Schwab';

      for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const rowStr = rows[i].map(c => String(c).trim().toLowerCase());
        
        // Detectar si es reporte de resumen de efectivo / cash balance de IBKR
        const hasSummaryCols = rowStr.some(c => c.includes('basesummary') || c.includes('startingcash') || c.includes('endingcash'));
        if (hasSummaryCols) {
          headerRowIndex = i;
          isSummaryCashFile = true;
          brokerDetected = 'IBKR';
          break;
        }

        const hasAction = rowStr.some(c => c.includes('action') || c.includes('type') || c.includes('description'));
        const hasAmount = rowStr.some(c => c.includes('amount') || c.includes('monto') || c.includes('balance'));
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
        headerRowIndex = 0;
        isTransactionsFile = true;
        brokerDetected = 'IBKR';
      }

      const headers = rows[headerRowIndex].map(h => String(h).trim());

      // CASO A: Archivo de Resumen de Caja / Balance (`cash_balanced.csv`)
      if (isSummaryCashFile) {
        const flows = [];
        const dataRow = rows[headerRowIndex + 1];
        
        if (dataRow) {
          const toDateIdx = headers.findIndex(h => /todate/i.test(h));
          const depositsIdx = headers.findIndex(h => /^deposits$/i.test(h));
          const withdrawalsIdx = headers.findIndex(h => /^withdrawals$/i.test(h));
          const startingCashIdx = headers.findIndex(h => /startingcash/i.test(h));

          const dateRaw = toDateIdx !== -1 ? dataRow[toDateIdx] : new Date().toISOString().split('T')[0];
          const parsedDate = parseFlexibleDate(dateRaw) || new Date().toISOString().split('T')[0];

          const depositsVal = depositsIdx !== -1 ? parseFloat(String(dataRow[depositsIdx]).replace(/[\$,]/g, '')) || 0 : 0;
          const withdrawalsVal = withdrawalsIdx !== -1 ? parseFloat(String(dataRow[withdrawalsIdx]).replace(/[\$,]/g, '')) || 0 : 0;
          const startingVal = startingCashIdx !== -1 ? parseFloat(String(dataRow[startingCashIdx]).replace(/[\$,]/g, '')) || 0 : 0;

          if (depositsVal > 0) {
            flows.push({
              id: `flow_sum_dep_${Date.now()}`,
              type: 'deposit',
              date: parsedDate,
              amount: depositsVal,
              description: 'Depósito reportado en Balance IBKR'
            });
          }

          if (withdrawalsVal > 0) {
            flows.push({
              id: `flow_sum_wth_${Date.now()}`,
              type: 'withdrawal',
              date: parsedDate,
              amount: withdrawalsVal,
              description: 'Retiro reportado en Balance IBKR'
            });
          }

          if (depositsVal === 0 && withdrawalsVal === 0 && startingVal > 0) {
            flows.push({
              id: `flow_sum_start_${Date.now()}`,
              type: 'deposit',
              date: parsedDate,
              amount: startingVal,
              description: 'Capital inicial / Caja IBKR'
            });
          }
        }

        callbacks.onSuccess({ type: 'transactions', broker: brokerDetected, flows });
        return;
      }

      // CASO B: Archivo de Transacciones Estándar
      if (isTransactionsFile) {
        const flows = [];
        for (let r = headerRowIndex + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length <= 1) continue;
          
          const rowText = row.join(' ').toLowerCase();
          const dateStr = row.find(c => /^\d{4}[-/]\d{2}[-/]\d{2}|\d{8}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(String(c).trim()));
          const parsedDate = parseFlexibleDate(dateStr);
          
          if (!parsedDate) continue;

          const amountCell = row.find(c => !isNaN(parseFloat(String(c).replace(/[\$,]/g, ''))) && Math.abs(parseFloat(String(c).replace(/[\$,]/g, ''))) > 0);
          if (!amountCell) continue;

          const rawAmt = parseFloat(String(amountCell).replace(/[\$,]/g, '').trim());
          const isDeposit = rowText.includes('deposit') || rowText.includes('contrib') || rowText.includes('aporte') || rowText.includes('cash receipt') || rawAmt > 0;
          
          flows.push({
            id: `flow_csv_${Date.now()}_${Math.random()}`,
            type: isDeposit ? 'deposit' : 'withdrawal',
            date: parsedDate,
            amount: Math.abs(rawAmt),
            description: row.slice(0, 4).join(' - ') || 'Transacción IBKR'
          });
        }

        callbacks.onSuccess({ type: 'transactions', broker: brokerDetected, flows });
        return;
      }

      // CASO C: Trades
      const symbolIdx = headers.findIndex(h => /^symbol$|description/i.test(h));
      const closedDateIdx = headers.findIndex(h => /closed\s*date|^tradedate$|datetime|^date$/i.test(h));
      const qtyIdx = headers.findIndex(h => /quantity|^qty$/i.test(h));
      const priceIdx = headers.findIndex(h => /tradeprice|price/i.test(h));
      const costBasisIdx = headers.findIndex(h => /cost\s*basis|^cost$|basis/i.test(h));
      const proceedsIdx = headers.findIndex(h => /proceeds/i.test(h));
      const gainLossIdx = headers.findIndex(h => /gain\/loss|fifopnlrealized/i.test(h));
      const commIdx = headers.findIndex(h => /ibcommission|commission/i.test(h));
      const assetClassIdx = headers.findIndex(h => /assetclass/i.test(h));

      // PRIMERA PASADA: Acumular comisiones de apertura (filas donde PnL es 0) por símbolo
      const buyCommissionsByTicker = {};
      if (brokerDetected === 'IBKR') {
        for (let r = headerRowIndex + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length <= symbolIdx) continue;
          const symbolRaw = String(row[symbolIdx] || '').trim().toUpperCase();
          const gainLossRaw = String(row[gainLossIdx] || '').trim();
          const rawPnl = parseFloat(gainLossRaw.replace(/\$/g, '').replace(/,/g, '').trim()) || 0;
          const commVal = (commIdx !== -1 && row[commIdx]) ? Math.abs(parseFloat(String(row[commIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;

          if (rawPnl === 0 && commVal > 0 && symbolRaw) {
            buyCommissionsByTicker[symbolRaw] = (buyCommissionsByTicker[symbolRaw] || 0) + commVal;
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

        // Si es IBKR y la fila es de apertura (PnL = 0), la omitimos como trade cerrado individual pero su comisión ya fue acumulada
        if (brokerDetected === 'IBKR' && rawPnl === 0) continue;

        const qty = (qtyIdx !== -1 && row[qtyIdx]) ? Math.abs(parseInt(String(row[qtyIdx]).trim(), 10) || 1) : 1;
        const tradePrice = (priceIdx !== -1 && row[priceIdx]) ? Math.abs(parseFloat(String(row[priceIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;
        let proceedsVal = (proceedsIdx !== -1 && row[proceedsIdx]) ? Math.abs(parseFloat(String(row[proceedsIdx]).replace(/[\$\,]/g, '').trim()) || 0) : (qty * tradePrice);

        let costBasis = (costBasisIdx !== -1 && row[costBasisIdx]) ? Math.abs(parseFloat(String(row[costBasisIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;
        if (costBasis === 0 && proceedsVal > 0) costBasis = Math.abs(proceedsVal - rawPnl);

        let realCommission = (commIdx !== -1 && row[commIdx]) ? Math.abs(parseFloat(String(row[commIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;
        
        let ticker = symbolRaw.split(' ')[0].toUpperCase().trim();

        // Sumar la comisión de apertura acumulada para este símbolo si existe
        if (brokerDetected === 'IBKR' && buyCommissionsByTicker[ticker]) {
          realCommission += buyCommissionsByTicker[ticker];
          delete buyCommissionsByTicker[ticker]; // Evitar duplicar si hay varios trades del mismo ticker
        }

        const dateKey = parseFlexibleDate(closedDateRaw);
        if (!dateKey) continue;

        const assetClass = (assetClassIdx !== -1 && row[assetClassIdx]) ? String(row[assetClassIdx]).trim().toUpperCase() : '';
        const isStock = assetClass === 'STK' || brokerDetected === 'IBKR';

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