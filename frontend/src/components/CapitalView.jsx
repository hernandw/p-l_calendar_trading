{activeTab === 'Capital' && (
  <CapitalView 
    activeAccount={activeAccount} 
    allAccounts={data.accounts}
    onSaveCapitalFlow={(flow, transferData) => {
      const newAppData = JSON.parse(JSON.stringify(data));
      const activeAccIdx = newAppData.accounts.findIndex(a => a.id === activeAccount.id);
      
      if (!newAppData.accounts[activeAccIdx].capitalFlows) {
        newAppData.accounts[activeAccIdx].capitalFlows = [];
      }
      newAppData.accounts[activeAccIdx].capitalFlows.push(flow);

      if (transferData) {
        const targetAccIdx = newAppData.accounts.findIndex(a => a.id === transferData.targetAccountId);
        if (targetAccIdx !== -1) {
          if (!newAppData.accounts[targetAccIdx].capitalFlows) {
            newAppData.accounts[targetAccIdx].capitalFlows = [];
          }
          newAppData.accounts[targetAccIdx].capitalFlows.push(transferData.inFlow);
        }
      }

      saveData(newAppData);
    }}
    onUpdateCapitalFlow={(updatedFlow) => {
      const newAppData = JSON.parse(JSON.stringify(data));
      const activeAccIdx = newAppData.accounts.findIndex(a => a.id === activeAccount.id);
      
      const flows = newAppData.accounts[activeAccIdx].capitalFlows || [];
      const idx = flows.findIndex(f => f.id === updatedFlow.id);
      if (idx !== -1) {
        flows[idx] = updatedFlow;
        saveData(newAppData);
      }
    }}
    onDeleteCapitalFlow={(flowId, transferId) => {
      if (!window.confirm("¿Estás seguro de borrar este movimiento?")) return;
      const newAppData = JSON.parse(JSON.stringify(data));

      if (transferId) {
        newAppData.accounts.forEach(acc => {
          if (acc.capitalFlows) {
            acc.capitalFlows = acc.capitalFlows.filter(f => f.transferId !== transferId);
          }
        });
      } else {
        const activeAccIdx = newAppData.accounts.findIndex(a => a.id === activeAccount.id);
        if (newAppData.accounts[activeAccIdx].capitalFlows) {
          newAppData.accounts[activeAccIdx].capitalFlows = newAppData.accounts[activeAccIdx].capitalFlows.filter(f => f.id !== flowId);
        }
      }

      saveData(newAppData);
    }} 
  />
)}