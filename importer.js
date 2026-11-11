/**
 * importer.js - Motor especializado de parsing para Schwab e Interactive Brokers
 */

export function parseFlexibleDate(dateStr) {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().split(';')[0].split(' ')[0].split('T')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const mm = parts[0].padStart(2, '0');
      const dd = parts[1].padStart(2, '0');
      const yyyy = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
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
      let isIbkrCashSummary = false;
      let brokerDetected = 'Schwab';

      for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const rowStr = rows[i].map(c => String(c).trim().toLowerCase());
        
        // Detección Resumen de Caja IBKR (StartingCash, DepositsMTD, etc.)
        if (rowStr.some(c => c === 'startingcash' || c === 'depositsmtd')) {
          headerRowIndex = i;
          isTransactionsFile = true;
          isIbkrCashSummary = true;
          brokerDetected = 'IBKR';
          break;
        }

        // Detección Cash Transactions
        const hasAction = rowStr.some(c => c.includes('action') || c.includes('type'));
        const hasAmount = rowStr.some(c => c.includes('amount') || c.includes('monto'));
        const isIbkrCash = rowStr.some(c => c === 'cashtransaction' || c.includes('cash transactions'));

        if ((hasAction && hasAmount) || isIbkrCash) {
          headerRowIndex = i;
          isTransactionsFile = true;
          brokerDetected = 'IBKR';
          break;
        }

        // Detección Trades
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

      // CASO A: FLUJOS DE CAPITAL (CASH TRANSACTIONS)
      if (isTransactionsFile) {
        const flows = [];
        let minD = null;
        let maxD = null;

        if (isIbkrCashSummary) {
          const fromDateIdx = headers.findIndex(h => /fromdate/i.test(h));
          const startingCashIdx = headers.findIndex(h => /^startingcash$/i.test(h));
          const depositsIdx = headers.findIndex(h => /^deposits$|^depositsmtd$|^depositsytd$/i.test(h));
          const withdrawalsIdx = headers.findIndex(h => /^withdrawals$/i.test(h));

          for (let r = headerRowIndex + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length < 5) continue;

            const dateRaw = fromDateIdx !== -1 ? String(row[fromDateIdx] || '').trim() : '';
            const formattedDate = parseFlexibleDate(dateRaw) || new Date().toISOString().split('T')[0];
            const startCash = startingCashIdx !== -1 ? parseFloat(String(row[startingCashIdx] || '').replace(/[\$\,]/g, '')) : 0;
            const depAmount = depositsIdx !== -1 ? parseFloat(String(row[depositsIdx] || '').replace(/[\$\,]/g, '')) : 0;
            const wthAmount = withdrawalsIdx !== -1 ? parseFloat(String(row[withdrawalsIdx] || '').replace(/[\$\,]/g, '')) : 0;

            const netDeposit = depAmount > 0 ? depAmount : (startCash > 0 ? startCash : 0);

            if (netDeposit > 0) {
              flows.push({
                id: Date.now() + Math.random(),
                type: 'deposit',
                category: 'external',
                date: formattedDate,
                amount: netDeposit,
                note: 'Fondeo de Efectivo IBKR'
              });
              if (!minD || formattedDate < minD) minD = formattedDate;
              if (!maxD || formattedDate > maxD) maxD = formattedDate;
            }
            if (wthAmount > 0) {
              flows.push({
                id: Date.now() + Math.random() + 1,
                type: 'withdrawal',
                category: 'external',
                date: formattedDate,
                amount: wthAmount,
                note: 'Retiro de Efectivo IBKR'
              });
            }
          }
        } else {
          const dateIdx = headers.findIndex(h => /date|settledate|datetime/i.test(h));
          const actionIdx = headers.findIndex(h => /action|type/i.test(h));
          const descIdx = headers.findIndex(h => /description|comment/i.test(h));
          const amountIdx = headers.findIndex(h => /amount|netamount/i.test(h));

          for (let r = headerRowIndex + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length <= Math.max(dateIdx, amountIdx)) continue;

            const dateRaw = String(row[dateIdx] || '').trim();
            const actionRaw = actionIdx !== -1 ? String(row[actionIdx] || '').trim() : '';
            const descRaw = descIdx !== -1 ? String(row[descIdx] || '').trim() : '';
            const amountRaw = String(row[amountIdx] || '').trim();

            if (!dateRaw || !amountRaw) continue;

            const isExplicitNegative = amountRaw.includes('-') || amountRaw.includes('(');
            const cleanAmount = parseFloat(amountRaw.replace(/[\$\,\(\)]/g, '').trim());
            if (isNaN(cleanAmount) || cleanAmount === 0) continue;

            const isWithdrawalText = /withdrawal|disbursement|transfer\s*out|wire\s*out|debit|paid|retiro/i.test(actionRaw) || 
                                     /withdrawal|disbursement|transfer\s*out|wire\s*out|debit|paid|retiro/i.test(descRaw);
            const isDepositText = /deposit|transfer\s*in|wire\s*in|credit|received|ingreso/i.test(actionRaw) || 
                                  /deposit|transfer\s*in|wire\s*in|credit|received|ingreso/i.test(descRaw);

            let isWithdrawal = isExplicitNegative || (isWithdrawalText && !isDepositText);
            const formattedDate = parseFlexibleDate(dateRaw);
            if (!formattedDate) continue;

            flows.push({
              id: Date.now() + Math.random(),
              type: isWithdrawal ? 'withdrawal' : 'deposit',
              category: 'external',
              date: formattedDate,
              amount: Math.abs(cleanAmount),
              note: `${actionRaw} ${descRaw ? '- ' + descRaw : ''}`.substring(0, 45)
            });
            if (!minD || formattedDate < minD) minD = formattedDate;
            if (!maxD || formattedDate > maxD) maxD = formattedDate;
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
      const symbolIdx = headers.findIndex(h => /^symbol$|description|instrument/i.test(h));
      const closedDateIdx = headers.findIndex(h => /closed\s*date|^tradedate$|datetime|^date$/i.test(h));
      const openedDateIdx = headers.findIndex(h => /opened\s*date|opendate/i.test(h));
      const qtyIdx = headers.findIndex(h => /quantity|^qty$/i.test(h));
      const priceIdx = headers.findIndex(h => /tradeprice|price|precio/i.test(h));
      const costBasisIdx = headers.findIndex(h => /cost\s*basis|^cost$|basis/i.test(h));
      const proceedsIdx = headers.findIndex(h => /proceeds|ingresos/i.test(h));
      const gainLossIdx = headers.findIndex(h => /gain\/loss|fifopnlrealized|realized\s*p\/l|realizedpnl/i.test(h));
      const commIdx = headers.findIndex(h => /ibcommission|commission|comisión/i.test(h));
      const assetClassIdx = headers.findIndex(h => /assetclass/i.test(h));
      const strikeIdx = headers.findIndex(h => /^strike$/i.test(h));
      const putCallIdx = headers.findIndex(h => /put\/call/i.test(h));

      // Sumar comisiones de compra si están en filas separadas
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
      let totalNet = 0;
      let totalInvested = 0;
      let minDate = null;
      let maxDate = null;

      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length <= symbolIdx) continue;

        const symbolRaw = String(row[symbolIdx] || '').trim();
        const closedDateRaw = String(row[closedDateIdx] || '').trim();
        const openedDateRaw = (openedDateIdx !== -1 && row[openedDateIdx]) ? String(row[openedDateIdx]).trim() : closedDateRaw;
        const gainLossRaw = String(row[gainLossIdx] || '').trim();

        if (!symbolRaw || !closedDateRaw || !gainLossRaw) continue;

        const rawPnl = parseFloat(gainLossRaw.replace(/\$/g, '').replace(/,/g, '').trim());
        if (isNaN(rawPnl)) continue;

        // En IBKR, ignorar filas de apertura donde el PnL realizado es 0
        if (brokerDetected === 'IBKR' && rawPnl === 0) continue;

        const qty = (qtyIdx !== -1 && row[qtyIdx]) ? Math.abs(parseInt(String(row[qtyIdx]).trim(), 10) || 1) : 1;
        const tradePrice = (priceIdx !== -1 && row[priceIdx]) ? Math.abs(parseFloat(String(row[priceIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;
        let proceedsVal = (proceedsIdx !== -1 && row[proceedsIdx]) ? Math.abs(parseFloat(String(row[proceedsIdx]).replace(/[\$\,]/g, '').trim()) || 0) : (qty * tradePrice);

        let costBasis = (costBasisIdx !== -1 && row[costBasisIdx]) ? Math.abs(parseFloat(String(row[costBasisIdx]).replace(/[\$\,]/g, '').trim()) || 0) : 0;
        if (costBasis === 0 && proceedsVal > 0) {
          costBasis = Math.abs(proceedsVal - rawPnl);
        }

        // Obtener la comisión real
        let realCommission = 0;
        if (commIdx !== -1 && row[commIdx]) {
          realCommission = Math.abs(parseFloat(String(row[commIdx]).replace(/[\$\,]/g, '').trim()) || 0);
          if (buyCommissionsByTicker[symbolRaw]) {
            realCommission += buyCommissionsByTicker[symbolRaw];
            delete buyCommissionsByTicker[symbolRaw]; // aplicar una sola vez
          }
        }

        const dateKey = parseFlexibleDate(closedDateRaw);
        if (!dateKey) continue;

        const assetClass = (assetClassIdx !== -1 && row[assetClassIdx]) ? String(row[assetClassIdx]).trim().toUpperCase() : '';
        const isStock = assetClass === 'STK' || (brokerDetected === 'IBKR' && (!row[putCallIdx] || String(row[putCallIdx]).trim() === ''));

        let ticker = symbolRaw;
        let strike = "-";
        let type = isStock ? "STK" : "CALL";
        let dte = "-";

        if (!isStock) {
          // Lógica de opciones (Schwab o IBKR OPT)
          const schwabMatch = symbolRaw.match(/^([A-Z0-9]+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d\.]+)\s+([CP])$/i);
          if (schwabMatch) {
            ticker = schwabMatch[1];
            strike = cleanStrike(schwabMatch[3]);
            type = schwabMatch[4].toUpperCase() === 'C' ? 'CALL' : 'PUT';
            dte = calculateDte(openedDateRaw, schwabMatch[2]);
          } else if (strikeIdx !== -1 && row[strikeIdx]) {
            strike = cleanStrike(row[strikeIdx]);
            type = String(row[putCallIdx] || '').toUpperCase().startsWith('P') ? 'PUT' : 'CALL';
          }
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
            commission: realCommission // Comisión exacta leída del CSV
          }
        });

        totalNet += rawPnl;
        totalInvested += costBasis;
        if (!minDate || dateKey < minDate) minDate = dateKey;
        if (!maxDate || dateKey > maxDate) maxDate = dateKey;
      }

      callbacks.onSuccess({
        type: 'trades',
        broker: brokerDetected,
        trades,
        totalNet,
        totalInvested,
        minDate,
        maxDate
      });
    },
    error: function (err) {
      callbacks.onError("Error al leer el archivo CSV: " + err.message);
    }
  });
}

function calculateDte(openedStr, expStr) {
  try {
    const pOpen = openedStr.split('/');
    const pExp = expStr.split('/');
    const dOpen = new Date(parseInt(pOpen[2], 10), parseInt(pOpen[0], 10) - 1, parseInt(pOpen[1], 10));
    const dExp = new Date(parseInt(pExp[2], 10), parseInt(pExp[0], 10) - 1, parseInt(pExp[1], 10));
    const diffDays = Math.round((dExp - dOpen) / (1000 * 60 * 60 * 24));
    return diffDays <= 0 ? '0DTE' : `${diffDays}DTE`;
  } catch (e) {
    return '-';
  }
}