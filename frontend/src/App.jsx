import React, { useState, useEffect, useRef } from 'react';
import ImportOptionsModal from './components/ImportOptionsModal.jsx';
import PerformanceCharts from './components/PerformanceCharts.jsx';
import GainLossGauge from './components/GainLossGauge.jsx';

import { 
  TrendingUp, Moon, Sun, LogOut, CalendarDays, CalendarRange, 
  BarChart2, Receipt, Wallet, ChevronLeft, ChevronRight, Settings, Plus, X 
} from 'lucide-react';
import { formatExactCurrency, getSystemTodayKey, getDayPnL, formatMoney } from './renderers.jsx';
import { parseCsvFile } from './importer.js';

// Importación de componentes modulares
import AccountSection from './components/AccountSection.jsx';
import MetricsFooter from './components/MetricsFooter.jsx';
import DayModal from './components/DayModal.jsx';
import TickersView from './components/TickersView.jsx';
import CommissionsView from './components/CommissionsView.jsx';
import CapitalView from './components/CapitalView.jsx';
import YearView from './components/YearView.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false); // <--- Correctamente dentro del componente
  
  const [backendLoading, setBackendLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('Month');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [modalDay, setModalDay] = useState(null); 
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({ broker: 'Interactive Brokers', number: '', type: 'Margin' });
  const [editAccountForm, setEditAccountForm] = useState({ broker: '', number: '', type: 'Margin' });

  const [pendingCsvResult, setPendingCsvResult] = useState(null);
  const [pendingFileName, setPendingFileName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  
  const fileInputRef = useRef(null);

  // Temporizador de sesión de 5 minutos por inactividad real (mouse, teclado, clics)
  useEffect(() => {
    if (!token) return;
    
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      localStorage.setItem('loginTime', Date.now().toString());
      inactivityTimer = setTimeout(() => {
        handleLogout();
        alert("Su sesión ha expirado (5 minutos de inactividad). Inicie sesión nuevamente.");
      }, 5 * 60 * 1000); // 5 minutos
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [token]);

  // Al cargar el componente, recuperar usuario guardado si existe
  useEffect(() => {
    const savedUser = localStorage.getItem('rememberedUsername');
    if (savedUser) {
      setAuthForm(prev => ({ ...prev, username: savedUser }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    setBackendLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Sesión expirada o inválida');
      const json = await res.json();
      setData(json);
      setIsDarkMode(json.isDarkMode ?? true);
    } catch (err) {
      handleLogout();
    } finally {
      setBackendLoading(false);
    }
  };

  const saveData = async (newData) => {
    setData(newData);
    try {
      await fetch(`${API_URL}/api/data`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newData)
      });
    } catch (err) {
      console.error("Error guardando datos:", err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setBackendLoading(true);
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error de autenticación');

      if (authMode === 'login') {
        localStorage.setItem('token', json.token);
        localStorage.setItem('username', authForm.username);
        localStorage.setItem('loginTime', Date.now().toString());
        
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', authForm.username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }

        setToken(json.token);
        setUsername(authForm.username);
      } else {
        alert("¡Registro exitoso! Ahora inicie sesión.");
        setAuthMode('login');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBackendLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('loginTime');
    setToken(null);
    setUsername('');
    setData(null);
  };

  const toggleDarkMode = () => {
    const updated = {...data, isDarkMode: !isDarkMode};
    saveData(updated);
    setIsDarkMode(!isDarkMode);
  };

  const handleCreateAccount = (e) => {
    e.preventDefault();
    const newAcc = {
      id: `acc_${Date.now()}`,
      broker: newAccountForm.broker,
      number: newAccountForm.number || `U${Math.floor(Math.random() * 1000000)}`,
      type: newAccountForm.type || 'Margin',
      appData: {},
      capitalFlows: []
    };
    const updated = {
      ...data,
      activeAccountId: newAcc.id,
      accounts: [...data.accounts, newAcc]
    };
    saveData(updated);
    setShowNewAccountModal(false);
    setNewAccountForm({ broker: 'Interactive Brokers', number: '', type: 'Margin' });
  };

  const handleUpdateActiveAccount = (e) => {
    e.preventDefault();
    const activeAccount = data.accounts.find(a => a.id === data.activeAccountId);
    if (!activeAccount) return;

    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === activeAccount.id) {
        return {
          ...acc,
          broker: editAccountForm.broker || acc.broker,
          number: editAccountForm.number || acc.number,
          type: editAccountForm.type || acc.type
        };
      }
      return acc;
    });

    saveData({ ...data, accounts: updatedAccounts });
    setShowSettingsModal(false);
    alert("¡Cuenta actualizada con éxito!");
  };

  const handleDeleteActiveAccount = () => {
    if (data.accounts.length <= 1) {
      alert("No puedes eliminar la única cuenta activa.");
      return;
    }
    if (!window.confirm("¿Estás seguro de eliminar esta cuenta y todos sus trades?")) return;
    const remaining = data.accounts.filter(a => a.id !== data.activeAccountId);
    const updated = {
      ...data,
      activeAccountId: remaining[0].id,
      accounts: remaining
    };
    saveData(updated);
    setShowSettingsModal(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFileName(file.name);

    parseCsvFile(file, {
      onSuccess: (result) => {
        setPendingCsvResult(result);
        setShowImportModal(true);
      },
      onError: (err) => {
        alert("Error al procesar el archivo: " + err);
      }
    });
  };

  const handleExecuteImport = (strategy) => {
    if (!pendingCsvResult) return;
    const activeAccount = data.accounts.find(a => a.id === data.activeAccountId) || data.accounts[0];
    let newAppData = strategy === 'replace' ? {} : { ...(activeAccount.appData || {}) };

    if (pendingCsvResult.type === 'trades') {
      pendingCsvResult.trades.forEach(item => {
        if (!newAppData[item.dateKey]) newAppData[item.dateKey] = [];
        
        if (strategy === 'merge') {
          const existing = newAppData[item.dateKey];
          const isDuplicate = existing.some(e => 
            e.ticker === item.trade.ticker && 
            Number(e.pnl) === Number(item.trade.pnl) && 
            Number(e.costBasis) === Number(item.trade.costBasis)
          );
          if (!isDuplicate) {
            newAppData[item.dateKey].push({ id: Date.now() + Math.random(), ...item.trade });
          }
        } else {
          newAppData[item.dateKey].push({ id: Date.now() + Math.random(), ...item.trade });
        }
      });

      if (strategy === 'new_account') {
        const newAcc = {
          id: `acc_${Date.now()}`,
          broker: pendingCsvResult.broker || 'Interactive Brokers',
          number: `U${Math.floor(Math.random() * 1000000)}`,
          type: 'Margin',
          appData: newAppData,
          capitalFlows: []
        };
        saveData({
          ...data,
          activeAccountId: newAcc.id,
          accounts: [...data.accounts, newAcc]
        });
        alert(`¡Cuenta nueva creada con éxito desde el CSV de ${pendingCsvResult.broker}!`);
      } else {
        const updatedAccounts = data.accounts.map(acc => {
          if (acc.id === activeAccount.id) {
            return { ...acc, broker: pendingCsvResult.broker || acc.broker, appData: newAppData };
          }
          return acc;
        });
        saveData({ ...data, accounts: updatedAccounts });
        alert(`¡Importación exitosa (${strategy === 'merge' ? 'fusionado sin duplicados' : 'reemplazado'})!`);
      }
    } else if (pendingCsvResult.type === 'transactions') {
      // Si es archivo de transacciones / cash_balanced.csv de IBKR
      if (!activeAccount.capitalFlows) activeAccount.capitalFlows = [];
      pendingCsvResult.flows.forEach(f => {
        const exists = activeAccount.capitalFlows.some(cf => cf.date === f.date && Math.abs(cf.amount - f.amount) < 0.01);
        if (!exists) activeAccount.capitalFlows.push(f);
      });
      saveData({ ...data });
      alert("¡Movimientos de capital importados desde el archivo de IBKR con éxito!");
    }

    setShowImportModal(false);
    setPendingCsvResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading_journal_backup_${username}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        if (backupData && backupData.accounts) {
          saveData(backupData);
          alert("¡Backup restaurado con éxito!");
        } else {
          alert("El archivo de backup no es válido.");
        }
      } catch (err) {
        alert("Error al leer el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveTradeInDay = (dateKey, tradeData, editingTrade) => {
    const accountId = activeAccount.id;
    const newAccountData = JSON.parse(JSON.stringify(data));
    const accountIdx = newAccountData.accounts.findIndex(a => a.id === accountId);
    
    if (!newAccountData.accounts[accountIdx].appData) newAccountData.accounts[accountIdx].appData = {};
    if (!newAccountData.accounts[accountIdx].appData[dateKey]) newAccountData.accounts[accountIdx].appData[dateKey] = [];
    
    if (editingTrade) {
      const tradeIdx = newAccountData.accounts[accountIdx].appData[dateKey].findIndex(t => t.id === editingTrade.id);
      newAccountData.accounts[accountIdx].appData[dateKey][tradeIdx] = tradeData;
    } else {
      tradeData.id = Date.now();
      newAccountData.accounts[accountIdx].appData[dateKey].push(tradeData);
    }
    
    saveData(newAccountData);
    const updatedTrades = newAccountData.accounts[accountIdx].appData[dateKey];
    const updatedPnl = updatedTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    setModalDay(prev => prev ? { ...prev, trades: updatedTrades, pnl: updatedPnl } : null);
  };

  const handleDeleteTradeInDay = (dateKey, tradeId) => {
    if (!window.confirm("¿Estás seguro de borrar este trade?")) return;
    const accountId = activeAccount.id;
    const newAccountData = JSON.parse(JSON.stringify(data));
    const accountIdx = newAccountData.accounts.findIndex(a => a.id === accountId);
    
    newAccountData.accounts[accountIdx].appData[dateKey] = newAccountData.accounts[accountIdx].appData[dateKey].filter(t => t.id !== tradeId);
    saveData(newAccountData);

    const updatedTrades = newAccountData.accounts[accountIdx].appData[dateKey];
    const updatedPnl = updatedTrades.length > 0 ? updatedTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0) : null;
    setModalDay(prev => prev ? { ...prev, trades: updatedTrades, pnl: updatedPnl } : null);
  };

  if (backendLoading && !data && token) {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wider text-slate-400">Conectando con el servidor...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex items-center justify-center p-4">
        <div className="bg-[#131B2E] p-8 rounded-3xl border border-[#1E293B] w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black">P&amp;L Trading Journal</h1>
            <p className="text-xs text-slate-400">Gestión multicuenta y rendimiento profesional</p>
          </div>
          <div className="flex bg-[#0F172A] p-1 rounded-xl text-xs font-bold">
            <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 rounded-lg transition ${authMode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Iniciar Sesión</button>
            <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 rounded-lg transition ${authMode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Registrarse</button>
          </div>
          <form onSubmit={handleAuth} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Usuario</label>
              <input type="text" required value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white focus:outline-none" />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Contraseña</label>
              <input type="password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 py-1">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe} 
                onChange={e => setRememberMe(e.target.checked)} 
                className="rounded bg-[#090D16] border-slate-700 cursor-pointer"
              />
              <label htmlFor="remember" className="text-slate-400 cursor-pointer">Recordar mis datos</label>
            </div>
            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition">
              {authMode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activeAccount = data.accounts.find(a => a.id === data.activeAccountId) || data.accounts[0];

  let netGains = 0, grossGains = 0, grossLosses = 0, winCount = 0, totalTradesCount = 0;
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  Object.keys(activeAccount.appData || {}).forEach(k => {
    const matchesPeriod = activeTab === 'Month' ? k.startsWith(monthPrefix) : k.startsWith(`${currentYear}`);
    if (matchesPeriod) {
      (activeAccount.appData[k] || []).forEach(t => {
        const p = Number(t.pnl || 0);
        totalTradesCount++;
        if (p > 0) { grossGains += p; winCount++; }
        else if (p < 0) { grossLosses += Math.abs(p); }
      });
    }
  });
  netGains = grossGains - grossLosses;
  const totalVolume = grossGains + grossLosses;
  const schwabRatio = totalVolume > 0 ? ((grossGains / totalVolume) * 100).toFixed(2) : '0.00';
  const winRatePct = totalTradesCount > 0 ? Math.round((winCount / totalTradesCount) * 100) : 0;

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
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

  return (
    <div className={`min-h-screen py-8 px-4 flex flex-col items-center justify-start ${isDarkMode ? 'dark bg-[#090D16] text-slate-100' : 'bg-[#EBF1F6] text-slate-800'}`}>
      
      {/* BARRA SUPERIOR */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-3 px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Journal ({username})</span>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
          <button onClick={() => fileInputRef.current.click()} className="px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-blue-600/30">
            Cargar CSV
          </button>
          <button onClick={handleExportBackup} className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-bold">
            Backup
          </button>
          <label className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-bold cursor-pointer">
            Restaurar
            <input type="file" onChange={handleImportBackup} accept=".json" className="hidden" />
          </label>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleDarkMode} className="p-1.5 bg-white dark:bg-[#131B2E] text-slate-600 dark:text-amber-400 border border-slate-200 dark:border-[#1E293B] rounded-xl shadow-sm">
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleLogout} title="Cerrar sesión" className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800 rounded-xl">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <main className="w-full max-w-4xl bg-white dark:bg-[#131B2E] rounded-3xl shadow-xl border border-slate-100 dark:border-[#1E293B] p-6 md:p-8 flex flex-col space-y-6">
        
        {/* COMPONENTE CUENTA ACTIVA */}
        <AccountSection 
          activeAccount={activeAccount} 
          accounts={data.accounts}
          onSelectAccount={(accId) => saveData({...data, activeAccountId: accId})}
          onOpenNewAccount={() => setShowNewAccountModal(true)}
          onOpenSettings={() => {
            setEditAccountForm({ broker: activeAccount.broker, number: activeAccount.number, type: activeAccount.type || 'Margin' });
            setShowSettingsModal(true);
          }}
        />

        {/* ENCABEZADO */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h1 className="text-xl font-black tracking-tight text-white">P&amp;L Calendar</h1>
          <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            {totalTradesCount} trades en total
          </div>
        </div>

        {/* NAVEGACIÓN Y AÑO */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <select value={currentYear} onChange={e => setCurrentYear(parseInt(e.target.value, 10))} className="bg-[#0f172a] border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <div className="flex bg-[#0F172A] p-1 rounded-2xl gap-1 text-xs font-bold w-full md:w-auto overflow-x-auto">
            <button onClick={() => setActiveTab('Month')} className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'Month' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400'}`}>
              <CalendarDays className="w-3.5 h-3.5" /> Month
            </button>
            <button onClick={() => setActiveTab('Year')} className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'Year' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400'}`}>
              <CalendarRange className="w-3.5 h-3.5" /> Year
            </button>
            <button onClick={() => setActiveTab('Tickers')} className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'Tickers' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400'}`}>
              <BarChart2 className="w-3.5 h-3.5" /> Tickers
            </button>
            <button onClick={() => setActiveTab('Commissions')} className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'Commissions' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400'}`}>
              <Receipt className="w-3.5 h-3.5" /> Comisiones
            </button>
            <button onClick={() => setActiveTab('Capital')} className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'Capital' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400'}`}>
              <Wallet className="w-3.5 h-3.5" /> Capital
            </button>
          </div>
        </div>

        {/* VISTAS CONDICIONALES */}
        {activeTab === 'Month' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MES: {monthNames[currentMonth]} {currentYear}</span>
                <p className="text-[10px] text-slate-500">Haz clic en un día para registrar o modificar trades</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setCurrentMonth(prev => prev === 0 ? 11 : prev - 1); if(currentMonth === 0) setCurrentYear(y => y - 1); }} className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => { setCurrentMonth(prev => prev === 11 ? 0 : prev + 1); if(currentMonth === 11) setCurrentYear(y => y + 1); }} className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="w-full">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }} className="gap-2 mb-2">
                {['MON', 'TUE', 'WED', 'THU', 'FRI'].map(d => (
                  <div key={d} className="text-center text-[11px] font-bold text-slate-500 uppercase">{d}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }} className="gap-2">
                {days.map((dObj, idx) => {
                  const y = dObj.getFullYear();
                  const m = String(dObj.getMonth() + 1).padStart(2, '0');
                  const d = String(dObj.getDate()).padStart(2, '0');
                  const dateKey = `${y}-${m}-${d}`;
                  const pnl = getDayPnL(activeAccount, dateKey);
                  const trades = activeAccount.appData?.[dateKey] || [];
                  const isToday = (dateKey === todayStr);

                  let bg = "bg-slate-900/40 border-slate-800";
                  let textCls = "text-slate-500";
                  let pnlDisplay = "0.00";

                  if (pnl !== null) {
                    if (pnl > 0) {
                      bg = "bg-emerald-950/40 border-emerald-500/30";
                      textCls = "text-emerald-400";
                      pnlDisplay = formatMoney(pnl);
                    } else if (pnl < 0) {
                      bg = "bg-rose-950/40 border-rose-500/30";
                      textCls = "text-rose-400";
                      pnlDisplay = formatMoney(pnl);
                    }
                  }

                  return (
                    <div key={idx} onClick={() => setModalDay({dateKey, pnl, trades, dObj})} className={`min-h-[85px] p-2.5 rounded-2xl border cursor-pointer hover:border-blue-500 flex flex-col justify-between ${bg}`}>
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold ${isToday ? 'text-blue-400 bg-blue-950 px-1.5 rounded' : 'text-slate-400'}`}>
                          {isToday ? 'Today' : dObj.getDate()}
                        </span>
                        {trades.length > 0 && <span className="px-1.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300">{trades.length}t</span>}
                      </div>
                      <div className={`text-right text-xs font-extrabold ${textCls}`}>{pnl !== null ? pnlDisplay : '-'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Year' && (
          <YearView 
            activeAccount={activeAccount} 
            currentYear={currentYear} 
            setCurrentMonth={setCurrentMonth} 
            setActiveTab={setActiveTab} 
          />
        )}

        {activeTab === 'Tickers' && <TickersView activeAccount={activeAccount} currentYear={currentYear} />}
        {activeTab === 'Commissions' && <CommissionsView activeAccount={activeAccount} currentYear={currentYear} />}
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

        {/* TARJETAS DE MÉTRICAS INFERIORES */}
        {(activeTab === 'Month' || activeTab === 'Year') && (
          <div className="space-y-4">
            <MetricsFooter 
              activeTab={activeTab}
              netGains={netGains}
              grossGains={grossGains}
              grossLosses={grossLosses}
              schwabRatio={schwabRatio}
              winRatePct={winRatePct}
              winCount={winCount}
              totalTradesCount={totalTradesCount}
            />

            {/* GRÁFICO TIPO GAUGE DE GANANCIA / PÉRDIDA */}
            <GainLossGauge 
              activeAccount={activeAccount}
              activeTab={activeTab}
              currentYear={currentYear}
              currentMonth={currentMonth}
            />
          </div>
        )}
      </main>

      {/* MODAL NUEVA CUENTA */}
      {showNewAccountModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateAccount} className="bg-[#131B2E] rounded-3xl w-full max-w-md p-6 border border-slate-700 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <h3 className="text-sm font-black text-white">Crear Nueva Cuenta</h3>
              <button type="button" onClick={() => setShowNewAccountModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Broker</label>
              <select value={newAccountForm.broker} onChange={e => setNewAccountForm({...newAccountForm, broker: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white">
                <option value="Interactive Brokers">Interactive Brokers</option>
                <option value="Charles Schwab">Charles Schwab</option>
                <option value="Thinkorswim">Thinkorswim</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Número de Cuenta</label>
              <input type="text" placeholder="Ej. U1234567" value={newAccountForm.number} onChange={e => setNewAccountForm({...newAccountForm, number: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white" />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Tipo de Cuenta</label>
              <select value={newAccountForm.type} onChange={e => setNewAccountForm({...newAccountForm, type: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white">
                <option value="Margin">Margin</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition">Crear Cuenta</button>
          </form>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN / EDICIÓN DE CUENTA */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleUpdateActiveAccount} className="bg-[#131B2E] rounded-3xl w-full max-w-md p-6 border border-slate-700 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <h3 className="text-sm font-black text-white">Configuración y Edición de Cuenta</h3>
              <button type="button" onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Broker</label>
              <select value={editAccountForm.broker} onChange={e => setEditAccountForm({...editAccountForm, broker: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white">
                <option value="Interactive Brokers">Interactive Brokers</option>
                <option value="Charles Schwab">Charles Schwab</option>
                <option value="Thinkorswim">Thinkorswim</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Número de Cuenta</label>
              <input type="text" value={editAccountForm.number} onChange={e => setEditAccountForm({...editAccountForm, number: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white" />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Tipo de Cuenta</label>
              <select value={editAccountForm.type} onChange={e => setEditAccountForm({...editAccountForm, type: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white">
                <option value="Margin">Margin</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div className="pt-2 flex gap-2">
              <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition">Guardar Cambios</button>
              <button type="button" onClick={handleDeleteActiveAccount} className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition">Eliminar Cuenta</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DETALLE DIARIO */}
      <DayModal 
        modalDay={modalDay} 
        monthNames={monthNames} 
        onClose={() => setModalDay(null)} 
        onSaveTrade={handleSaveTradeInDay}
        onDeleteTrade={handleDeleteTradeInDay}
      />

      {/* MODAL DE OPCIONES DE IMPORTACIÓN CSV */}
      <ImportOptionsModal 
        isOpen={showImportModal} 
        fileName={pendingFileName}
        onClose={() => setShowImportModal(false)}
        onSelectOption={handleExecuteImport}
      />
    </div>
  );
}