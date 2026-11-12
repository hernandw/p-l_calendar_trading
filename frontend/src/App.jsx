import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Moon, Sun, LogOut, CalendarDays, CalendarRange, 
  BarChart2, Receipt, Wallet, ChevronLeft, ChevronRight, Plus, Settings, Edit2, Trash2, X
} from 'lucide-react';
import { 
  formatMoney, formatExactCurrency, getSystemTodayKey, 
  getDayPnL, cleanStrike, getTickerBadgeClass 
} from './renderers.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  
  const [backendLoading, setBackendLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('Month');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Estado para el modal de detalle diario
  const [modalDay, setModalDay] = useState(null); 
  // Estado para el formulario de edición de trade (si se edita)
  const [editingTrade, setEditingTrade] = useState(null);
  // Estado para la comisión estimada (Input)
  const [commissionPerContract, setCommissionPerContract] = useState(1.30);

  // Temporizador de sesión de 3 minutos
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      const loginTime = localStorage.getItem('loginTime');
      if (loginTime && Date.now() - parseInt(loginTime, 10) > 3 * 60 * 1000) {
        handleLogout();
        alert("Su sesión ha expirado (3 minutos de inactividad). Inicie sesión nuevamente.");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

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

  // Funciones de utilidad para la interfaz
  const toggleDarkMode = () => {
    saveData({...data, isDarkMode: !isDarkMode});
    setIsDarkMode(!isDarkMode);
  };
  const handleAccountAction = (action) => alert(`Función ${action} en desarrollo.`);
  
  const handleManualTradeSave = (tradeData) => {
    const dateKey = modalDay.dateKey;
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
    setEditingTrade(null);
  };

  const handleDeleteTrade = (dateKey, tradeId) => {
    if (!window.confirm("¿Estás seguro de borrar este trade?")) return;
    const accountId = activeAccount.id;
    const newAccountData = JSON.parse(JSON.stringify(data));
    const accountIdx = newAccountData.accounts.findIndex(a => a.id === accountId);
    
    newAccountData.accounts[accountIdx].appData[dateKey] = newAccountData.accounts[accountIdx].appData[dateKey].filter(t => t.id !== tradeId);
    
    saveData(newAccountData);
  };
  
  const handleDeleteCapitalFlow = (flowId) => {
    if (!window.confirm("¿Estás seguro de borrar este movimiento?")) return;
    const accountId = activeAccount.id;
    const newAccountData = JSON.parse(JSON.stringify(data));
    const accountIdx = newAccountData.accounts.findIndex(a => a.id === accountId);
    
    newAccountData.accounts[accountIdx].capitalFlows = newAccountData.accounts[accountIdx].capitalFlows.filter(f => f.id !== flowId);
    
    saveData(newAccountData);
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
            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition">Entrar al Diario</button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activeAccount = data.accounts.find(a => a.id === data.activeAccountId) || data.accounts[0];

  // Cálculos de métricas (Smart: adaptado al periodo seleccionado)
  let netGains = 0, grossGains = 0, grossLosses = 0, winCount = 0, totalTradesCount = 0;
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  Object.keys(activeAccount.appData || {}).forEach(k => {
    if (activeTab === 'Month' ? k.startsWith(monthPrefix) : k.startsWith(`${currentYear}`)) {
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

  // Días del mes (Lunes a Viernes)
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
      
      {/* BARRA SUPERIOR DE SESIÓN */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-3 px-1">
        <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-bold tracking-wider uppercase">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span>Journal ({username})</span>
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
        
        {/* SECCIÓN DE CUENTA ACTIVA */}
        <div className="bg-[#0b101d] p-4 rounded-2xl border border-slate-800 flex flex-col space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Cuenta Activa</span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-black text-sm text-white">{activeAccount.broker} ({activeAccount.number}) - {activeAccount.type || 'Margin'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleAccountAction('New')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md transition">
                <Plus className="w-3.5 h-3.5" /> Nueva
              </button>
              <button onClick={() => handleAccountAction('Settings')} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-semibold">{activeAccount.broker}</span>
            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 font-semibold">{activeAccount.type || 'Margin'}</span>
            <span>Nro: {activeAccount.number}</span>
          </div>
        </div>

        {/* ENCABEZADO P&L CALENDAR Y CONTADOR DE TRADES */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-white">P&amp;L Calendar</h1>
          </div>
          <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            {totalTradesCount} trades en total
          </div>
        </div>

        {/* SELECTOR DE AÑO Y PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select value={currentYear} onChange={e => setCurrentYear(parseInt(e.target.value, 10))} className="bg-[#0f172a] border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

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
            <button onClick={() => setActiveTab('Wallet')} className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'Capital' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400'}`}>
              <Wallet className="w-3.5 h-3.5" /> Capital
            </button>
          </div>
        </div>

        {/* VISTAS */}
        {activeTab === 'Month' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MES: {monthNames[currentMonth]} {currentYear}</span>
                <p className="text-[10px] text-slate-500">Haz clic en un día para registrar o modificar trades</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setCurrentMonth(prev => prev === 0 ? 11 : prev - 1); if(currentMonth === 0) setCurrentYear(y => y - 1); }} className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => { setCurrentMonth(prev => prev === 11 ? 0 : prev + 1); if(currentMonth === 11) setCurrentYear(y => y + 1); }} className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300">
                  <ChevronRight className="w-4 h-4" />
                </button>
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
                        {trades.length > 0 && (
                          <span className="px-1.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300">{trades.length}t</span>
                        )}
                      </div>
                      <div className={`text-right text-xs font-extrabold ${textCls}`}>
                        {pnl !== null ? pnlDisplay : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TARJETAS DE MÉTRICAS OFICIALES AL PIE DEL CALENDARIO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">GANANCIA NETA ({activeTab === 'Month' ? 'MES' : 'AÑO'})</span>
                <span className={`text-base font-black mt-3 ${netGains >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatExactCurrency(netGains)}
                </span>
              </div>
              <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">RELACIÓN G/P</span>
                <span className="text-base font-black text-rose-400 mt-3">{schwabRatio}%</span>
              </div>
              <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TOTALES G / P</span>
                <div className="mt-2 text-xs font-bold space-y-0.5">
                  <div className="text-emerald-400">+{formatExactCurrency(grossGains)}</div>
                  <div className="text-rose-400">-{formatExactCurrency(grossLosses)}</div>
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101d] flex flex-col justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ACIERTO TRADES</span>
                <div className="mt-2">
                  <span className="text-base font-black text-white">{winRatePct}%</span>
                  <span className="text-[10px] text-slate-400 block">({winCount} / {totalTradesCount} trades)</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'Year' && (
            <div className="space-y-4">
                <h2 className="text-sm font-black tracking-wide text-slate-200">Resumen Anual: {currentYear}</h2>
                <div className="grid grid-cols-3 gap-2.5">
                    {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map((mName, mIdx) => {
                        const monthPrefix = `${currentYear}-${String(mIdx + 1).padStart(2, '0')}`;
                        let mPnl = 0, mTrades = 0;
                        Object.keys(activeAccount.appData || {}).forEach(k => {
                            if (k.startsWith(monthPrefix)) {
                                (activeAccount.appData[k] || []).forEach(t => {
                                    mPnl += Number(t.pnl || 0);
                                    mTrades++;
                                });
                            }
                        });
                        return (
                            <div key={mName} onClick={() => { setCurrentMonth(mIdx); setActiveTab('Month'); }} className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424] cursor-pointer hover:border-blue-500 transition">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-300">{mName}</span>
                                    <span className="text-slate-400 text-[10px]">{mTrades} trades</span>
                                </div>
                                <div className={`text-sm font-black mt-2 ${mPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatExactCurrency(mPnl)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {activeTab === 'Tickers' && (
            <div className="space-y-4">
                <h2 className="text-sm font-black tracking-wide text-slate-200">Activos Operados ({currentYear})</h2>
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {(() => {
                        const tickerStats = {};
                        Object.keys(activeAccount.appData || {}).forEach(k => {
                            if (k.startsWith(`${currentYear}`)) {
                                (activeAccount.appData[k] || []).forEach(t => {
                                    const sym = (t.ticker || 'OTHER').split(' ')[0].toUpperCase().trim();
                                    if (!tickerStats[sym]) tickerStats[sym] = { ticker: sym, total: 0, pnl: 0, wins: 0, losses: 0, cost: 0, invested: 0 };
                                    const p = Number(t.pnl || 0);
                                    const costBasis = Number(t.costBasis || 0);
                                    tickerStats[sym].total++;
                                    tickerStats[sym].pnl += p;
                                    tickerStats[sym].invested += costBasis;
                                    if (p > 0) tickerStats[sym].wins++;
                                    else if (p < 0) tickerStats[sym].losses++;
                                });
                            }
                        });
                        const list = Object.values(tickerStats);
                        if (list.length === 0) return <div className="text-center py-8 text-slate-500 text-xs">No hay operaciones en este año.</div>;
                        return list.map(data => {
                            const decided = data.wins + data.losses;
                            const winRate = decided > 0 ? Math.round((data.wins / decided) * 100) : 100;
                            const roi = data.invested > 0 ? ((data.pnl / data.invested) * 100).toFixed(1) : '0.0';
                            return (
                                <div key={data.ticker} className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424] grid grid-cols-3 gap-3 text-xs">
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-0.5 rounded-lg font-black ${getTickerBadgeClass(data.ticker)}`}>{data.ticker}</span>
                                        <span className="font-black text-sm text-white">{winRate}% Win</span>
                                    </div>
                                    <div className='text-center text-slate-400'>
                                        <span className='block text-slate-300 font-bold'>{data.total} trades</span>
                                        ( {data.wins}W / {data.losses}L )
                                    </div>
                                    <div className='text-right'>
                                        <span className={`font-extrabold text-sm block ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatExactCurrency(data.pnl)}</span>
                                        <span className='text-slate-400 font-semibold'>Inv. Total: {formatExactCurrency(data.invested)} <br/>ROI: {roi}%</span>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        )}

        {activeTab === 'Commissions' && (
            <div className="space-y-4">
                <h2 className="text-sm font-black tracking-wide text-slate-200">Desglose de Comisiones y Costos</h2>
                {(() => {
                    let totalComms = 0, totalCtoRoundtrip = 0, totalSharesRoundtrip = 0;
                    Object.keys(activeAccount.appData || {}).forEach(k => {
                        if (k.startsWith(`${currentYear}`)) {
                            (activeAccount.appData[k] || []).forEach(t => {
                                const comm = Number(t.commission || 0);
                                totalComms += comm;
                                if(t.type === 'CALL' || t.type === 'PUT') {
                                    totalCtoRoundtrip += (parseInt(t.qty, 10) || 0);
                                } else {
                                    totalSharesRoundtrip += (parseInt(t.qty, 10) || 0);
                                }
                            });
                        }
                    });
                    const isIbkr = activeAccount.broker === 'IBKR';
                    const commPerContractConfig = isIbkr ? 0 : commissionPerContract;
                    const ctoComm = isIbkr ? totalComms : (totalCtoRoundtrip * commPerContractConfig);

                    return (
                        <div className='space-y-3'>
                            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl border border-slate-800 bg-[#0b101d]">
                                <div className='col-span-2 flex items-center justify-between text-xs text-slate-400'>
                                    Comisión Estimada (Round-trip): 
                                    {isIbkr ? <span className='text-blue-400 font-bold'>Calculada por IBKR</span> : <div className='flex items-center gap-1'>$ <input type='number' step='0.05' value={commissionPerContract} onChange={e => setCommissionPerContract(parseFloat(e.target.value))} className='w-20 p-1 text-right rounded bg-slate-900 border border-slate-700 text-white' /></div>}
                                </div>
                                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">TOTAL CONTRATOS (Opcs)</span>
                                    <span className="text-base font-black text-slate-200">{totalCtoRoundtrip} ctos</span>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">VOLUMEN ACCIONES</span>
                                    <span className="text-base font-black text-slate-200">{totalSharesRoundtrip} shares</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/20">
                                <span className="text-[10px] text-blue-400 uppercase font-bold block">Impacto en P&amp;L (Comisiones)</span>
                                <span className="text-xl font-black text-rose-400">-{formatExactCurrency(totalComms)}</span>
                            </div>
                        </div>
                    );
                })()}
            </div>
        )}

        {activeTab === 'Capital' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black tracking-wide text-slate-200">Control de Capital y Balance</h2>
            {(() => {
              let dep = 0, wth = 0;
              (activeAccount.capitalFlows || []).forEach(f => {
                if (f.type === 'deposit') dep += Number(f.amount || 0);
                else wth += Number(f.amount || 0);
              });
              const netInflow = dep - wth;
              let cumulativePnl = 0;
              Object.keys(activeAccount.appData || {}).forEach(k => {
                (activeAccount.appData[k] || []).forEach(t => cumulativePnl += Number(t.pnl || 0));
              });
              const currentBal = netInflow + cumulativePnl;

              return (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/20">
                    <span className="text-[10px] text-blue-400 uppercase font-bold block">Balance Actual de Cuenta</span>
                    <span className="text-xl font-black text-white">{formatExactCurrency(currentBal)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Depósitos Netos</span>
                      <span className="text-sm font-bold text-emerald-400">{formatExactCurrency(netInflow)}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">P&amp;L Operativo</span>
                      <span className={`text-sm font-bold ${cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatExactCurrency(cumulativePnl)}</span>
                    </div>
                  </div>
                  {/* MOVIMIENTOS DE CAPITAL EDITABLES */}
                  <div className='pt-4'>
                    <h3 className='text-xs text-slate-400 font-bold mb-2'>Movimientos de Capital</h3>
                    <div className='space-y-1.5 max-h-[200px] overflow-y-auto'>
                        {(activeAccount.capitalFlows || []).map(f => (
                            <div key={f.id} className='flex items-center justify-between bg-[#0d1424] p-2.5 rounded-lg border border-slate-800 text-xs'>
                                <div className='flex items-center gap-2'>
                                    {f.type === 'deposit' ? <Plus className='w-4 h-4 text-emerald-400'/> : <X className='w-4 h-4 text-rose-400'/>}
                                    <span className='text-slate-300 font-semibold'>{f.date}</span>
                                    <span className='text-slate-400'>{f.description}</span>
                                </div>
                                <div className='flex items-center gap-3'>
                                    <span className={`font-bold ${f.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {f.type === 'deposit' ? '+' : '-'}{formatExactCurrency(f.amount)}
                                    </span>
                                    <button onClick={() => handleDeleteCapitalFlow(f.id)} className='text-rose-600'><Trash2 className='w-3.5 h-3.5'/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* MODAL DE DETALLE DIARIO (IMAGEN 4) */}
      {modalDay && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#131B2E] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-black text-white">Sesión: {modalDay.dObj.getDate()} {monthNames[modalDay.dObj.getMonth()]} {modalDay.dObj.getFullYear()}</h3>
                <button onClick={() => setModalDay(null)} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
            </div>
            
            {/* FORMULARIO DE EDICIÓN MANUAL DE TRADE */}
            <div className="p-5 border-b border-slate-700 bg-[#0b101d] shrink-0">
                <TradeEditor tradeToEdit={editingTrade} onSave={handleManualTradeSave} onCancel={() => setEditingTrade(null)} />
            </div>

            {/* LISTA DE OPERACIONES DEL DÍA */}
            <div className="p-5 space-y-3 overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-300">Detalle de Operaciones</h4>
              {modalDay.trades.length === 0 && <p className="text-center text-slate-500 text-xs py-4">No hay trades registrados para este día.</p>}
              {modalDay.trades.map(t => {
                  const isWin = t.pnl >= 0;
                  const isOption = t.type === 'CALL' || t.type === 'PUT';
                  const ctoText = `${t.qty} ${isOption ? 'ctos' : 'shares'}`;
                  const tickerDisplay = isOption ? `${t.ticker} ${t.type} ${t.strike}` : t.ticker;

                  return (
                    <div key={t.id} className={`p-3.5 rounded-2xl border ${isWin ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'}`}>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                            <span className={`px-2.5 py-0.5 rounded-lg font-black ${getTickerBadgeClass(t.ticker)} text-sm`}>{tickerDisplay}</span>
                            <span className="text-slate-200 font-bold">{ctoText}</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span className={`font-extrabold text-sm ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>{formatExactCurrency(t.pnl)}</span>
                          <button onClick={() => setEditingTrade(t)} className="text-slate-500 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteTrade(modalDay.dateKey, t.id)} className="text-rose-600 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className='text-[10px] text-slate-400 pt-1.5 font-medium'>
                        Compra Unit: {formatExactCurrency(t.costBasis)} | Venta Unit: {formatExactCurrency(t.proceeds || 0)} | Comisión: {formatExactCurrency(t.commission)}
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPONENTE FORMULARIO DE TRADE
function TradeEditor({ tradeToEdit, onSave, onCancel }) {
    const [ticker, setTicker] = useState(tradeToEdit ? tradeToEdit.ticker : 'SPY');
    const [qty, setQty] = useState(tradeToEdit ? tradeToEdit.qty : 1);
    const [strike, setStrike] = useState(tradeToEdit ? tradeToEdit.strike : 550);
    const [type, setType] = useState(tradeToEdit ? tradeToEdit.type : 'CALL');
    const [pnl, setPnl] = useState(tradeToEdit ? tradeToEdit.pnl : 0);
    const [commission, setCommission] = useState(tradeToEdit ? tradeToEdit.commission : 1.30);
    
    const isOption = type === 'CALL' || type === 'PUT';

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            id: tradeToEdit ? tradeToEdit.id : undefined,
            ticker: ticker.toUpperCase(),
            qty: parseInt(qty, 10),
            strike: isOption ? parseFloat(strike) : null,
            type: isOption ? type : 'STK',
            pnl: parseFloat(pnl),
            commission: parseFloat(commission),
            costBasis: 0 // Opcional: puedes agregar campos extra aquí
        });
        // Reset form
        if(!tradeToEdit) {
            setTicker('SPY'); setQty(1); setStrike(550); setType('CALL'); setPnl(0); setCommission(1.30);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className='col-span-2 md:col-span-1'>
                <label className="block font-bold text-slate-400 mb-1">Ticker</label>
                <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white uppercase" placeholder="SPY" />
            </div>
            <div>
                <label className="block font-bold text-slate-400 mb-1">{isOption ? 'Contratos' : 'Acciones'}</label>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white text-right" />
            </div>
            <div>
                <label className="block font-bold text-slate-400 mb-1">P&amp;L Neto</label>
                <input type="number" step="0.01" value={pnl} onChange={e => setPnl(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white text-right" />
            </div>
            <div>
                <label className="block font-bold text-slate-400 mb-1">Comisión Total</label>
                <input type="number" step="0.01" value={commission} onChange={e => setCommission(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white text-right" />
            </div>
            
            {isOption && (
                <>
                    <div>
                        <label className="block font-bold text-slate-400 mb-1">Strike</label>
                        <input type="number" step="0.01" value={strike} onChange={e => setStrike(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white text-right" />
                    </div>
                    <div>
                        <label className="block font-bold text-slate-400 mb-1">Tipo</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-700 text-white">
                            <option value="CALL">CALL</option>
                            <option value="PUT">PUT</option>
                        </select>
                    </div>
                </>
            )}

            <div className="col-span-2 flex items-center gap-2 justify-end mt-2">
                {tradeToEdit && <button type="button" onClick={onCancel} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs">Cancelar</button>}
                <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md transition">
                    <Plus className="w-3.5 h-3.5" /> {tradeToEdit ? 'Actualizar Trade' : 'Agregar Trade'}
                </button>
            </div>
        </form>
    );
}