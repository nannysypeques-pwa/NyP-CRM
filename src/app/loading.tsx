import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-4 animate-fadeIn">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#026692]/10 border border-[#026692]/20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#026692] animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-bold text-slate-700">Cargando sección...</p>
        <p className="text-[10px] text-slate-400">Sincronizando información de NyP CRM</p>
      </div>
    </div>
  );
}
