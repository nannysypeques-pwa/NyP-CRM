"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, X } from "lucide-react";

interface Incidente {
  id: string;
  servicio: "OPENAI" | "WHATSAPP";
  mensaje: string;
  detalles?: string;
  resuelto: boolean;
  creadoEn: string;
}

export default function AlertsBanner() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchIncidentes = async () => {
    try {
      const res = await fetch("/api/incidentes");
      if (res.ok) {
        const data = await res.json();
        setIncidentes(data);
      }
    } catch (error) {
      console.error("Error al obtener incidentes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentes();
    // Consultar incidentes cada 60 segundos
    const interval = setInterval(fetchIncidentes, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleResolver = async (id: string) => {
    try {
      setResolvingId(id);
      const res = await fetch("/api/incidentes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        // Remover el incidente resuelto del estado
        setIncidentes(prev => prev.filter(inc => inc.id !== id));
      }
    } catch (error) {
      console.error("Error al resolver incidente:", error);
    } finally {
      setResolvingId(null);
    }
  };

  if (loading || incidentes.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-red-500 via-rose-600 to-red-600 text-white px-6 py-3.5 shadow-lg border-b border-red-700 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top duration-300 relative z-50">
      <div className="flex items-start space-x-3.5">
        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
        </div>
        <div>
          <h4 className="font-extrabold text-sm tracking-wide uppercase">
            ⚠️ Alerta del Sistema: Incidencia en las APIs comerciales
          </h4>
          <div className="mt-1 space-y-1">
            {incidentes.map((inc) => (
              <div key={inc.id} className="text-xs text-red-100 flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                <span className="font-bold bg-white/10 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase border border-white/5">
                  {inc.servicio}
                </span>
                <span className="font-medium">{inc.mensaje}</span>
                <span className="text-[10px] text-white/60">
                  ({new Date(inc.creadoEn).toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 flex-shrink-0 self-end md:self-auto">
        <button
          onClick={fetchIncidentes}
          className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 rounded-xl transition-all text-xs flex items-center gap-1.5"
          title="Actualizar estado"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        {incidentes.map((inc) => (
          <button
            key={`btn-res-${inc.id}`}
            onClick={() => handleResolver(inc.id)}
            disabled={resolvingId === inc.id}
            className="px-4 py-2 bg-white text-red-700 font-extrabold text-xs tracking-wider rounded-xl shadow-md hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {resolvingId === inc.id ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
            Resolver {inc.servicio}
          </button>
        ))}
      </div>
    </div>
  );
}
