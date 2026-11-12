import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Moon, Sun, LogOut 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [authMode, setAuthMode] = useState('login'); // 'login' o 'register'
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  
  const [backendLoading, setBackendLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('Month');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Temporizador de sesión de 3 minutos por seguridad
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

  // Cargar datos de usuario del backend
  useEffect(() => {
    if (token) {
      fetchData();
    }
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

  // LOADER SI EL BACKEND ESTÁ DESPERTANDO EN RENDER O AUTENTICANDO
  if (backendLoading && !data && token) {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wider text-slate-400">Conectando con el servidor en Render (despertando backend)...</p>
      </div>
    );
  }

  // PANTALLA DE LOGIN / REGISTRO
  if (!token) {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex items-center justify-center p-4">
        <div className="bg-[#131B2E] p-8 rounded-3xl border border-[#1E293B] w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black">P&amp;L Trading Journal</h1>
            <p className="text-xs text-slate-400">Gestión multicuenta y rendimiento profesional</p>
          </div>

          <div className="flex bg-[#0F172A] p-1 rounded-xl text-xs font-bold">
            <button 
              onClick={() => setAuthMode('login')} 
              className={`flex-1 py-2 rounded-lg transition ${authMode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
              Iniciar Sesión
            </button>
            <button 
              onClick={() => setAuthMode('register')} 
              className={`flex-1 py-2 rounded-lg transition ${authMode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
              Registrarse
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Usuario</label>
              <input 
                type="text" 
                required 
                value={authForm.username} 
                onChange={e => setAuthForm({...authForm, username: e.target.value})}
                className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Contraseña</label>
              <input 
                type="password" 
                required 
                value={authForm.password} 
                onChange={e => setAuthForm({...authForm, password: e.target.value})}
                className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              />
            </div>
            <button 
              type="submit" 
              disabled={backendLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition">
              {backendLoading ? 'Procesando...' : (authMode === 'login' ? 'Entrar al Diario' : 'Crear Cuenta')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activeAccount = data.accounts.find(a => a.id === data.activeAccountId) || data.accounts[0];

  return (
    <div className={`min-h-screen py-8 px-4 flex flex-col items-center justify-start ${isDarkMode ? 'dark bg-[#090D16] text-slate-100' : 'bg-[#EBF1F6] text-slate-800'}`}>
      
      {/* BARRA SUPERIOR */}
      <div className="w-full max-w-xl flex items-center justify-between mb-3 px-1">
        <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-bold tracking-wider uppercase">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span>Journal ({username})</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button onClick={() => saveData({...data, isDarkMode: !isDarkMode})} className="p-1.5 bg-white dark:bg-[#131B2E] text-slate-600 dark:text-amber-400 border border-slate-200 dark:border-[#1E293B] rounded-xl shadow-sm">
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleLogout} title="Cerrar sesión" className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800 rounded-xl">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <main className="w-full max-w-xl bg-white dark:bg-[#131B2E] rounded-3xl shadow-xl border border-slate-100 dark:border-[#1E293B] p-6 md:p-8 flex flex-col">
        <div className="text-center py-12 text-slate-400 text-xs">
          Diario cargado correctamente para la cuenta: <strong className="text-white">{activeAccount?.broker}</strong>
        </div>
      </main>
    </div>
  );
}