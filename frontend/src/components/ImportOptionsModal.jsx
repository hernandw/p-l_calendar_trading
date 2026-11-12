import React from 'react';
import { Upload, X } from 'lucide-react';

export default function ImportOptionsModal({ isOpen, fileName, onClose, onSelectOption }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#131B2E] rounded-3xl w-full max-w-md p-6 border border-slate-700 shadow-2xl space-y-5 text-xs text-slate-100">
        <div className="flex justify-between items-center pb-2 border-b border-slate-700">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-400" /> Opciones de Importación CSV
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <p className="text-slate-300">
          Has seleccionado el archivo: <strong className="text-blue-400">{fileName}</strong>. ¿Cómo deseas proceder con los datos de este archivo?
        </p>

        <div className="space-y-2.5">
          <button 
            onClick={() => onSelectOption('merge')} 
            className="w-full text-left p-3.5 rounded-2xl border border-slate-700 bg-[#0b101d] hover:border-blue-500 transition space-y-1">
            <div className="font-bold text-white">Agregar solo lo no existente (Recomendado)</div>
            <div className="text-[11px] text-slate-400">Compara los trades e importa únicamente los que no estén registrados para evitar duplicados.</div>
          </button>

          <button 
            onClick={() => onSelectOption('replace')} 
            className="w-full text-left p-3.5 rounded-2xl border border-slate-700 bg-[#0b101d] hover:border-rose-500/50 transition space-y-1">
            <div className="font-bold text-rose-400">Reemplazar / Comenzar desde 0</div>
            <div className="text-[11px] text-slate-400">Elimina los trades anteriores de las fechas contenidas en el CSV y coloca los nuevos.</div>
          </button>

          <button 
            onClick={() => onSelectOption('new_account')} 
            className="w-full text-left p-3.5 rounded-2xl border border-slate-700 bg-[#0b101d] hover:border-purple-500 transition space-y-1">
            <div className="font-bold text-purple-400">Crear como cuenta nueva</div>
            <div className="text-[11px] text-slate-400">Crea una nueva cuenta independiente con los datos de este archivo CSV.</div>
          </button>
        </div>
      </div>
    </div>
  );
}