"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Filter, ArrowRight } from "lucide-react";

export default function DashboardDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentRange = searchParams.get("range") || "TODOS";
  const currentStart = searchParams.get("start") || "";
  const currentEnd = searchParams.get("end") || "";

  const [range, setRange] = useState(currentRange);
  const [startDate, setStartDate] = useState(currentStart);
  const [endDate, setEndDate] = useState(currentEnd);
  const [isCustom, setIsCustom] = useState(currentRange === "PERSONALIZADO");

  useEffect(() => {
    setRange(currentRange);
    setIsCustom(currentRange === "PERSONALIZADO");
    setStartDate(currentStart);
    setEndDate(currentEnd);
  }, [currentRange, currentStart, currentEnd]);

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setRange(val);

    if (val === "PERSONALIZADO") {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      // Actualizar URL inmediatamente para rangos preestablecidos
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", val);
      params.delete("start");
      params.delete("end");
      router.push(`/?${params.toString()}`);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "PERSONALIZADO");
    params.set("start", startDate);
    params.set("end", endDate);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
      {/* Rango Select */}
      <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-[#e2edf6] shadow-sm">
        <Filter className="w-4 h-4 text-[#026692]" />
        <select
          value={range}
          onChange={handleRangeChange}
          className="border-0 bg-transparent text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-0 cursor-pointer"
        >
          <option value="TODOS">Todos los tiempos</option>
          <option value="HOY">Hoy</option>
          <option value="AYER">Ayer</option>
          <option value="ESTA_SEMANA">Esta semana</option>
          <option value="LA_SEMANA_PASADA">La semana pasada</option>
          <option value="ESTE_MES">Este mes</option>
          <option value="EL_MES_PASADO">El mes pasado</option>
          <option value="PERSONALIZADO">Rango personalizado</option>
        </select>
      </div>

      {/* Rango de fechas personalizados */}
      {isCustom && (
        <form onSubmit={handleApplyCustom} className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-[#e2edf6] shadow-sm animate-fade-in">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase pl-1">Desde</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#026692] font-semibold"
              required
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#026692] font-semibold"
              required
            />
          </div>

          <button
            type="submit"
            className="bg-[#026692] hover:bg-[#1d4359] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
          >
            <span>Aplicar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
