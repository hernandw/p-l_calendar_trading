import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Moon,
  Sun,
  LogOut,
  CalendarDays,
  CalendarRange,
  BarChart2,
  Receipt,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  formatMoney,
  formatExactCurrency,
  getSystemTodayKey,
  getDayPnL,
  cleanStrike,
  getTickerBadgeClass,
} from "./renderers.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [username, setUsername] = useState(
    localStorage.getItem("username") || "",
  );
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });

  const [backendLoading, setBackendLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Month");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Temporizador de sesión de 3 minutos
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      const loginTime = localStorage.getItem("loginTime");
      if (loginTime && Date.now() - parseInt(loginTime, 10) > 3 * 60 * 1000) {
        handleLogout();
        alert(
          "Su sesión ha expirado (3 minutos de inactividad). Inicie sesión nuevamente.",
        );
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Sesión expirada o inválida");
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newData),
      });
    } catch (err) {
      console.error("Error guardando datos:", err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setBackendLoading(true);
    const endpoint = authMode === "login" ? "/api/login" : "/api/register";
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error de autenticación");

      if (authMode === "login") {
        localStorage.setItem("token", json.token);
        localStorage.setItem("username", authForm.username);
        localStorage.setItem("loginTime", Date.now().toString());
        setToken(json.token);
        setUsername(authForm.username);
      } else {
        alert("¡Registro exitoso! Ahora inicie sesión.");
        setAuthMode("login");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBackendLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("loginTime");
    setToken(null);
    setUsername("");
    setData(null);
  };

  if (backendLoading && !data && token) {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wider text-slate-400">
          Conectando con el servidor en Render...
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex items-center justify-center p-4">
        <div className="bg-[#131B2E] p-8 rounded-3xl border border-[#1E293B] w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black">P&amp;L Trading Journal</h1>
            <p className="text-xs text-slate-400">
              Gestión multicuenta y rendimiento profesional
            </p>
          </div>
          <div className="flex bg-[#0F172A] p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 rounded-lg transition ${authMode === "login" ? "bg-blue-600 text-white" : "text-slate-400"}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`flex-1 py-2 rounded-lg transition ${authMode === "register" ? "bg-blue-600 text-white" : "text-slate-400"}`}
            >
              Registrarse
            </button>
          </div>
          <form onSubmit={handleAuth} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">
                Usuario
              </label>
              <input
                type="text"
                required
                value={authForm.username}
                onChange={(e) =>
                  setAuthForm({ ...authForm, username: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition"
            >
              Entrar al Diario
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activeAccount =
    data.accounts.find((a) => a.id === data.activeAccountId) ||
    data.accounts[0];

  // Cálculo de días del mes (Lunes a Viernes)
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const firstOfMonth = new Date(currentYear, currentMonth, 1);
  const startDay = new Date(firstOfMonth);
  let dow = startDay.getDay();
  let diff = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow;
  startDay.setDate(startDay.getDate() + diff);

  const days = [];
  const cursor = new Date(startDay);
  while (days.length < 25) {
    if (cursor.getDay() >= 1 && cursor.getDay() <= 5)
      days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const todayStr = getSystemTodayKey();

  return (
    <div
      className={`min-h-screen py-8 px-4 flex flex-col items-center justify-start ${isDarkMode ? "dark bg-[#090D16] text-slate-100" : "bg-[#EBF1F6] text-slate-800"}`}
    >
      {/* BARRA SUPERIOR */}
      <div className="w-full max-w-xl flex items-center justify-between mb-3 px-1">
        <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-bold tracking-wider uppercase">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span>
            Journal ({username}) &bull; {activeAccount?.broker}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => saveData({ ...data, isDarkMode: !isDarkMode })}
            className="p-1.5 bg-white dark:bg-[#131B2E] text-slate-600 dark:text-amber-400 border border-slate-200 dark:border-[#1E293B] rounded-xl shadow-sm"
          >
            {isDarkMode ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800 rounded-xl"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <main className="w-full max-w-4xl bg-white dark:bg-[#131B2E] rounded-3xl shadow-xl border border-slate-100 dark:border-[#1E293B] p-6 md:p-8 flex flex-col space-y-6">
        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex bg-slate-100 dark:bg-[#0F172A] p-1 rounded-2xl gap-1 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab("Month")}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === "Month" ? "bg-white dark:bg-slate-800 text-blue-500 shadow-sm" : "text-slate-400"}`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Mes
          </button>
          <button
            onClick={() => setActiveTab("Year")}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === "Year" ? "bg-white dark:bg-slate-800 text-blue-500 shadow-sm" : "text-slate-400"}`}
          >
            <CalendarRange className="w-3.5 h-3.5" /> Año
          </button>
          <button
            onClick={() => setActiveTab("Tickers")}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === "Tickers" ? "bg-white dark:bg-slate-800 text-blue-500 shadow-sm" : "text-slate-400"}`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Tickers
          </button>
          <button
            onClick={() => setActiveTab("Commissions")}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === "Commissions" ? "bg-white dark:bg-slate-800 text-blue-500 shadow-sm" : "text-slate-400"}`}
          >
            <Receipt className="w-3.5 h-3.5" /> Comisiones
          </button>
          <button
            onClick={() => setActiveTab("Capital")}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === "Capital" ? "bg-white dark:bg-slate-800 text-blue-500 shadow-sm" : "text-slate-400"}`}
          >
            <Wallet className="w-3.5 h-3.5" /> Capital
          </button>
        </div>

        {/* 1. VISTA MENSUAL (CALENDARIO P&L) */}
        {activeTab === "Month" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black tracking-wide text-slate-200">
                Calendario: {monthNames[currentMonth]} {currentYear}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setCurrentMonth((prev) => (prev === 0 ? 11 : prev - 1));
                    if (currentMonth === 0) setCurrentYear((y) => y - 1);
                  }}
                  className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCurrentMonth((prev) => (prev === 11 ? 0 : prev + 1));
                    if (currentMonth === 11) setCurrentYear((y) => y + 1);
                  }}
                  className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="w-full">
  {/* Cabecera de días */}
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }} className="gap-2 mb-2">
    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map(d => (
      <div key={d} className="text-center text-xs font-bold text-slate-500 uppercase">{d}</div>
    ))}
  </div>

  {/* Celdas del calendario en 5 columnas fijas */}
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
        <div key={idx} className={`min-h-[85px] p-2.5 rounded-2xl border flex flex-col justify-between ${bg}`}>
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
          </div>
        )}

        {/* 2. VISTA ANUAL */}
        {activeTab === "Year" && (
          <div className="space-y-4">
            <h2 className="text-sm font-black tracking-wide text-slate-200">
              Resumen Anual: {currentYear}
            </h2>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                "JAN",
                "FEB",
                "MAR",
                "APR",
                "MAY",
                "JUN",
                "JUL",
                "AUG",
                "SEP",
                "OCT",
                "NOV",
                "DEC",
              ].map((mName, mIdx) => {
                const monthPrefix = `${currentYear}-${String(mIdx + 1).padStart(2, "0")}`;
                let mPnl = 0,
                  mTrades = 0;
                Object.keys(activeAccount.appData || {}).forEach((k) => {
                  if (k.startsWith(monthPrefix)) {
                    (activeAccount.appData[k] || []).forEach((t) => {
                      mPnl += Number(t.pnl || 0);
                      mTrades++;
                    });
                  }
                });

                return (
                  <div
                    key={mName}
                    onClick={() => {
                      setCurrentMonth(mIdx);
                      setActiveTab("Month");
                    }}
                    className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424] cursor-pointer hover:border-blue-500 transition"
                  >
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">{mName}</span>
                      <span className="text-slate-400 text-[10px]">
                        {mTrades} trades
                      </span>
                    </div>
                    <div
                      className={`text-sm font-black mt-2 ${mPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {formatExactCurrency(mPnl)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. VISTA TICKERS */}
        {activeTab === "Tickers" && (
          <div className="space-y-4">
            <h2 className="text-sm font-black tracking-wide text-slate-200">
              Activos Operados ({currentYear})
            </h2>
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {(() => {
                const tickerStats = {};
                Object.keys(activeAccount.appData || {}).forEach((k) => {
                  if (k.startsWith(`${currentYear}`)) {
                    (activeAccount.appData[k] || []).forEach((t) => {
                      const sym = (t.ticker || "OTHER")
                        .split(" ")[0]
                        .toUpperCase()
                        .trim();
                      if (!tickerStats[sym])
                        tickerStats[sym] = {
                          ticker: sym,
                          total: 0,
                          pnl: 0,
                          wins: 0,
                          losses: 0,
                          cost: 0,
                        };
                      const p = Number(t.pnl || 0);
                      tickerStats[sym].total++;
                      tickerStats[sym].pnl += p;
                      tickerStats[sym].cost += Number(t.costBasis || 0);
                      if (p > 0) tickerStats[sym].wins++;
                      else if (p < 0) tickerStats[sym].losses++;
                    });
                  }
                });

                const list = Object.values(tickerStats);
                if (list.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No hay operaciones registradas en este año.
                    </div>
                  );
                }

                return list.map((data) => {
                  const decided = data.wins + data.losses;
                  const winRate =
                    decided > 0 ? Math.round((data.wins / decided) * 100) : 100;
                  const isWin = data.pnl >= 0;
                  return (
                    <div
                      key={data.ticker}
                      className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded-lg font-black ${getTickerBadgeClass(data.ticker)}`}
                        >
                          {data.ticker}
                        </span>
                        <span className="text-slate-400 font-semibold">
                          {data.total} ops &bull; {winRate}% Win
                        </span>
                      </div>
                      <span
                        className={`font-extrabold text-sm ${isWin ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {formatExactCurrency(data.pnl)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* 4. VISTA COMISIONES */}
        {activeTab === "Commissions" && (
          <div className="space-y-4">
            <h2 className="text-sm font-black tracking-wide text-slate-200">
              Desglose de Comisiones y Costos
            </h2>
            <div className="space-y-2.5">
              {(() => {
                let totalComms = 0,
                  totalUnits = 0;
                Object.keys(activeAccount.appData || {}).forEach((k) => {
                  if (k.startsWith(`${currentYear}`)) {
                    (activeAccount.appData[k] || []).forEach((t) => {
                      totalUnits += parseInt(t.qty, 10) || 1;
                      totalComms += Number(t.commission || 0);
                    });
                  }
                });

                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl border border-slate-800 bg-[#0d1424]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Total Comisiones
                      </span>
                      <span className="text-base font-black text-rose-400">
                        -{formatExactCurrency(totalComms)}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-800 bg-[#0d1424]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Volumen Operado
                      </span>
                      <span className="text-base font-black text-slate-200">
                        {totalUnits} ctos / acc
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 5. VISTA CAPITAL */}
        {activeTab === "Capital" && (
          <div className="space-y-4">
            <h2 className="text-sm font-black tracking-wide text-slate-200">
              Control de Capital y Balance
            </h2>
            {(() => {
              let dep = 0,
                wth = 0;
              (activeAccount.capitalFlows || []).forEach((f) => {
                if (f.type === "deposit") dep += Number(f.amount || 0);
                else wth += Number(f.amount || 0);
              });
              const netInflow = dep - wth;
              let cumulativePnl = 0;
              Object.keys(activeAccount.appData || {}).forEach((k) => {
                (activeAccount.appData[k] || []).forEach(
                  (t) => (cumulativePnl += Number(t.pnl || 0)),
                );
              });
              const currentBal = netInflow + cumulativePnl;

              return (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/20">
                    <span className="text-[10px] text-blue-400 uppercase font-bold block">
                      Balance Actual de Cuenta
                    </span>
                    <span className="text-xl font-black text-white">
                      {formatExactCurrency(currentBal)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Depósitos Netos
                      </span>
                      <span className="text-sm font-bold text-emerald-400">
                        {formatExactCurrency(netInflow)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        P&amp;L Operativo
                      </span>
                      <span
                        className={`text-sm font-bold ${cumulativePnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {formatExactCurrency(cumulativePnl)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
