"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Users, 
  Inbox, 
  Clock, 
  TrendingUp, 
  ChevronRight, 
  MessageSquare, 
  CheckCircle,
  FileText,
  UserCheck,
  MapPin,
  Calendar,
  Filter,
  Check,
  ChevronDown,
  Sparkles,
  Loader2,
  ArrowRight,
  Bot
} from "lucide-react";
import { clientCache } from "@/lib/clientCache";

interface Lead {
  id: string;
  nombreCompleto: string;
  telefono: string;
  ciudad: string;
  zona?: string;
  origen: string;
  estado: string;
  idUsuarioAsignado?: string;
  creadoEn: string;
  resumenIA?: string;
  cotizaciones?: any[];
  seguimientos?: any[];
}

interface Conversation {
  id: string;
  idLead?: string;
  telefono: string;
  estado: string;
  ultimoMensajeEn: string;
  lead?: Lead;
  mensajes?: any[];
}

interface SessionUser {
  userId: string;
  email: string;
  nombre: string;
  rol: "GERENTE" | "COORDINADORA" | "VENDEDORA";
  ciudad?: string;
}

interface ActivityItem {
  id: string;
  type: 'MESSAGE' | 'LEAD' | 'QUOTE';
  title: string;
  description: string;
  timestamp: Date;
}

const ALL_CITIES = ["Puebla", "CDMX", "Querétaro", "Xalapa"];

const RANGE_OPTIONS = [
  { id: "TODOS", label: "Todos los tiempos" },
  { id: "HOY", label: "Hoy" },
  { id: "AYER", label: "Ayer" },
  { id: "ESTA_SEMANA", label: "Esta semana" },
  { id: "LA_SEMANA_PASADA", label: "La semana pasada" },
  { id: "ESTE_MES", label: "Este mes" },
  { id: "EL_MES_PASADO", label: "El mes pasado" },
  { id: "PERSONALIZADO", label: "Rango personalizado" },
];

function getDateRange(range: string, startStr?: string, endStr?: string) {
  const now = new Date();
  
  if (!range || range.toUpperCase() === "TODOS") {
    return { startDate: new Date(0), endDate: new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000) };
  }

  let startDate = new Date();
  let endDate = new Date();

  switch (range.toUpperCase()) {
    case "HOY": {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "AYER": {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      startDate = new Date(yesterday);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "ESTA_SEMANA": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "LA_SEMANA_PASADA": {
      const day = now.getDay();
      const diffLunes = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      startDate.setDate(diffLunes);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "ESTE_MES": {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "EL_MES_PASADO": {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case "PERSONALIZADO": {
      if (startStr) {
        startDate = new Date(startStr);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setHours(0, 0, 0, 0);
      }
      if (endStr) {
        endDate = new Date(endStr);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate.setHours(23, 59, 59, 999);
      }
      break;
    }
    default: {
      startDate = new Date(0);
      endDate = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
      break;
    }
  }

  return { startDate, endDate };
}

function matchesCity(leadCity?: string, selectedCity?: string): boolean {
  if (!selectedCity || selectedCity === "TODAS") return true;
  if (!leadCity) return false;
  
  const lc = leadCity.toLowerCase();
  const sc = selectedCity.toLowerCase();
  
  if (sc === "puebla") return lc.includes("puebla");
  if (sc === "cdmx") return lc.includes("cdmx") || lc.includes("ciudad de méxico") || lc.includes("mexico");
  if (sc === "querétaro" || sc === "queretaro") return lc.includes("querétaro") || lc.includes("queretaro");
  if (sc === "xalapa") return lc.includes("xalapa");
  
  return lc.includes(sc);
}

export default function DashboardClient() {
  const cachedLeads = clientCache.get<Lead[]>("dashboard_leads");
  const cachedConvs = clientCache.get<Conversation[]>("dashboard_convs");
  const cachedUser = clientCache.get<SessionUser>("current_user");

  const [user, setUser] = useState<SessionUser | null>(cachedUser || null);
  const [leads, setLeads] = useState<Lead[]>(cachedLeads || []);
  const [conversations, setConversations] = useState<Conversation[]>(cachedConvs || []);
  const [loading, setLoading] = useState(!cachedLeads || !cachedConvs);

  // Filters State
  const [selectedCity, setSelectedCity] = useState<string>("TODAS");
  const [selectedRange, setSelectedRange] = useState<string>("TODOS");
  const [startDateStr, setStartDateStr] = useState<string>("");
  const [endDateStr, setEndDateStr] = useState<string>("");
  const [isCustomRange, setIsCustomRange] = useState(false);

  // Dropdown Popovers State
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);

  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const rangeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
      if (rangeDropdownRef.current && !rangeDropdownRef.current.contains(e.target as Node)) {
        setRangeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch session & initial data
  useEffect(() => {
    async function initData() {
      try {
        if (!cachedLeads || !cachedConvs) setLoading(true);

        const [userRes, leadsRes, convsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/leads"),
          fetch("/api/conversations")
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.user) {
            setUser(userData.user);
            clientCache.set("current_user", userData.user);
          }
        }

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          setLeads(leadsData);
          clientCache.set("dashboard_leads", leadsData);
        }

        if (convsRes.ok) {
          const convsData = await convsRes.json();
          setConversations(convsData);
          clientCache.set("dashboard_convs", convsData);
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  // Allowed Cities Calculation based on User Role & Assigned Cities
  const availableCityOptions = (() => {
    if (!user) return [{ id: "TODAS", name: "Todas las ciudades" }];
    
    const isGerente = user.rol === "GERENTE";
    const userCityStr = user.ciudad || "";
    
    if (isGerente || !userCityStr || userCityStr.toLowerCase().includes("todas")) {
      return [
        { id: "TODAS", name: "Todas las ciudades" },
        { id: "Puebla", name: "Puebla" },
        { id: "CDMX", name: "CDMX" },
        { id: "Querétaro", name: "Querétaro" },
        { id: "Xalapa", name: "Xalapa" },
      ];
    }
    
    // User has assigned cities (e.g. "Puebla, CDMX")
    const assigned = userCityStr.split(",").map(c => c.trim()).filter(Boolean);
    const matched = ALL_CITIES.filter(c => assigned.some(a => a.toLowerCase().includes(c.toLowerCase())));
    
    const options: { id: string; name: string }[] = [];
    if (matched.length > 1) {
      options.push({ id: "TODAS", name: "Todas mis ciudades" });
    }
    matched.forEach(c => options.push({ id: c, name: c }));
    
    return options.length > 0 ? options : [{ id: "TODAS", name: "Todas las ciudades" }];
  })();

  // Ensure selectedCity is valid for current user
  useEffect(() => {
    if (availableCityOptions.length > 0) {
      const isValid = availableCityOptions.some(o => o.id === selectedCity);
      if (!isValid) {
        setSelectedCity(availableCityOptions[0].id);
      }
    }
  }, [user, availableCityOptions]);

  // Filter calculations
  const { startDate, endDate } = getDateRange(selectedRange, startDateStr, endDateStr);

  const filteredLeads = leads.filter(l => {
    const d = new Date(l.creadoEn);
    const inRange = d >= startDate && d <= endDate;
    const inCity = matchesCity(l.ciudad, selectedCity);
    return inRange && inCity;
  });

  const filteredConversations = conversations.filter(c => {
    const d = new Date(c.ultimoMensajeEn);
    const inRange = d >= startDate && d <= endDate;
    const inCity = matchesCity(c.lead?.ciudad, selectedCity);
    return inRange && inCity;
  });

  // KPI Calculations
  const totalLeadsCount = filteredLeads.length;
  const wonLeadsCount = filteredLeads.filter(l => l.estado === "GANADO").length;
  const contactedLeadsCount = filteredLeads.filter(l => l.estado === "CONTACTADO" && !!l.idUsuarioAsignado && l.idUsuarioAsignado !== "").length;
  const quotedLeadsCount = filteredLeads.filter(l => l.estado === "COTIZADO").length;
  const newLeadsCount = filteredLeads.filter(l => l.estado === "NUEVO").length;
  const humanAttentionLeadsCount = filteredLeads.filter(l => l.estado === "ATENCION_HUMANA").length;

  const conversionRate = totalLeadsCount > 0 
    ? ((wonLeadsCount / totalLeadsCount) * 100).toFixed(1) + '%' 
    : '0.0%';

  const contactedPercent = totalLeadsCount > 0 ? Math.round((contactedLeadsCount / totalLeadsCount) * 100) : 0;
  const quotedPercent = totalLeadsCount > 0 ? Math.round((quotedLeadsCount / totalLeadsCount) * 100) : 0;
  const wonPercent = totalLeadsCount > 0 ? Math.round((wonLeadsCount / totalLeadsCount) * 100) : 0;
  const humanAttentionPercent = totalLeadsCount > 0 ? Math.round((humanAttentionLeadsCount / totalLeadsCount) * 100) : 0;

  // Activities Stream
  const recentLeads = filteredLeads
    .slice()
    .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
    .slice(0, 5);

  const recentQuotes = filteredLeads
    .flatMap(l => (l.cotizaciones || []).map(q => ({ ...q, lead: l })))
    .sort((a, b) => new Date(b.lead.creadoEn).getTime() - new Date(a.lead.creadoEn).getTime())
    .slice(0, 5);

  const recentMessages = filteredConversations
    .flatMap(c => (c.mensajes || []).map(m => ({ ...m, conversacion: c })))
    .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
    .slice(0, 5);

  const activities: ActivityItem[] = [];

  recentLeads.forEach(l => {
    activities.push({
      id: `lead-${l.id}`,
      type: 'LEAD',
      title: l.nombreCompleto,
      description: `Nuevo Lead capturado vía ${l.origen}.`,
      timestamp: new Date(l.creadoEn)
    });
  });

  recentMessages.forEach(m => {
    if (m.direccion === 'INBOUND') {
      const senderName = m.conversacion.lead?.nombreCompleto || m.conversacion.telefono;
      activities.push({
        id: `msg-${m.id}`,
        type: 'MESSAGE',
        title: senderName,
        description: `Envió un WhatsApp: "${m.contenido}"`,
        timestamp: new Date(m.creadoEn)
      });
    }
  });

  recentQuotes.forEach(q => {
    activities.push({
      id: `quote-${q.id}`,
      type: 'QUOTE',
      title: q.lead.nombreCompleto,
      description: `Cotización de ${q.tipoServicio} generada por $${q.total} MXN.`,
      timestamp: new Date(q.lead.creadoEn)
    });
  });

  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const displayActivities = activities.slice(0, 5);

  const selectedCityLabel = availableCityOptions.find(o => o.id === selectedCity)?.name || "Todas las ciudades";
  const selectedRangeLabel = RANGE_OPTIONS.find(o => o.id === selectedRange)?.label || "Todos los tiempos";

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar bg-[#f3f8fc]">
      
      {/* Top Header & Ultra-Premium Dual Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#026692] tracking-tight">Panel de Control</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Bienvenido a NyP CRM. Visualiza el rendimiento comercial por ciudad y período.
          </p>
        </div>

        {/* ULTRA-PREMIUM DUAL FILTERS */}
        <div className="flex flex-wrap items-center gap-3 z-30">
          
          {/* FILTER 1: CIUDAD */}
          <div ref={cityDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setCityDropdownOpen(!cityDropdownOpen);
                setRangeDropdownOpen(false);
              }}
              className="bg-white hover:bg-[#fcfdfd] border border-[#e2edf6] hover:border-[#026692]/40 text-slate-800 px-4 py-2.5 rounded-2xl shadow-sm transition-all flex items-center gap-2.5 text-xs font-extrabold cursor-pointer group"
            >
              <div className="p-1.5 bg-sky-50 text-[#026692] rounded-xl group-hover:bg-[#026692] group-hover:text-white transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block leading-none">Ciudad</span>
                <span className="text-slate-800 font-extrabold block text-xs mt-0.5">{selectedCityLabel}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 ml-1 transition-transform duration-200 ${cityDropdownOpen ? "rotate-180 text-[#026692]" : ""}`} />
            </button>

            {/* Floating Popover Menu - City */}
            {cityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e2edf6] rounded-2xl shadow-xl p-2 z-50 animate-scaleIn space-y-1">
                <div className="px-3 py-1.5 border-b border-[#f0f7fc] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Seleccionar Cobertura
                </div>
                {availableCityOptions.map((opt) => {
                  const isSelected = selectedCity === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedCity(opt.id);
                        setCityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-[#026692] text-white shadow-sm"
                          : "text-slate-700 hover:bg-[#f4f8fc] hover:text-[#026692]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{opt.id === "TODAS" ? "🌎" : "📍"}</span>
                        <span>{opt.name}</span>
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* FILTER 2: FECHA / PERÍODO */}
          <div ref={rangeDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setRangeDropdownOpen(!rangeDropdownOpen);
                setCityDropdownOpen(false);
              }}
              className="bg-white hover:bg-[#fcfdfd] border border-[#e2edf6] hover:border-[#026692]/40 text-slate-800 px-4 py-2.5 rounded-2xl shadow-sm transition-all flex items-center gap-2.5 text-xs font-extrabold cursor-pointer group"
            >
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block leading-none">Período</span>
                <span className="text-slate-800 font-extrabold block text-xs mt-0.5">{selectedRangeLabel}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 ml-1 transition-transform duration-200 ${rangeDropdownOpen ? "rotate-180 text-amber-500" : ""}`} />
            </button>

            {/* Floating Popover Menu - Date Range */}
            {rangeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-[#e2edf6] rounded-2xl shadow-xl p-2 z-50 animate-scaleIn space-y-1">
                <div className="px-3 py-1.5 border-b border-[#f0f7fc] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Rango de Fechas
                </div>
                {RANGE_OPTIONS.map((opt) => {
                  const isSelected = selectedRange === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedRange(opt.id);
                        if (opt.id === "PERSONALIZADO") {
                          setIsCustomRange(true);
                        } else {
                          setIsCustomRange(false);
                        }
                        setRangeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-[#026692] text-white shadow-sm"
                          : "text-slate-700 hover:bg-[#f4f8fc] hover:text-[#026692]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Custom Date Form (If Rango Personalizado is active) */}
      {isCustomRange && (
        <div className="bg-white p-4 rounded-2xl border border-[#e2edf6] shadow-sm flex flex-wrap items-center gap-3 animate-fadeIn z-10">
          <span className="text-xs font-extrabold text-[#026692] flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> Rango Personalizado:
          </span>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Desde</span>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="bg-[#f4f8fc] border border-[#cbdfe9] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#026692]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta</span>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="bg-[#f4f8fc] border border-[#cbdfe9] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#026692]"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCustomRange(false)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* SKELETON ANIMATION LOADING OR REAL STATS CARDS GRID */}
       {loading ? (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${user?.rol === "GERENTE" ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-6 animate-pulse`}>
          {[1, 2, 3, 4, ...(user?.rol === "GERENTE" ? [5] : [])].map((i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-4">
              <div className="h-4 bg-slate-200 rounded-md w-1/2"></div>
              <div className="h-8 bg-slate-300 rounded-lg w-1/3"></div>
              <div className="h-3 bg-slate-100 rounded-md w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${user?.rol === "GERENTE" ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-6`}>
          
          {/* CARD 1: TOTAL LEADS */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 group">
            <div className="space-y-1.5">
              <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Total Leads</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-800 tracking-tight">{totalLeadsCount}</span>
              </div>
              <span className="text-[10px] font-bold text-[#026692] bg-sky-50 px-2 py-0.5 rounded-full inline-block">
                Recibidos en el período
              </span>
            </div>
            <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-[#026692] border border-sky-100 group-hover:scale-105 transition-transform">
              <Users className="w-7 h-7" />
            </div>
          </div>

          {/* CARD 2: LISTOS PARA CIERRE (GANADOS) */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 group">
            <div className="space-y-1.5">
              <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Listos para Cierre</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-800 tracking-tight">{wonLeadsCount}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                Prospectos cerrados
              </span>
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:scale-105 transition-transform">
              <CheckCircle className="w-7 h-7" />
            </div>
          </div>

          {/* CARD 3: MARCADOS COMO CONTACTADOS */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 group">
            <div className="space-y-1.5">
              <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Contactados</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-800 tracking-tight">{contactedLeadsCount}</span>
              </div>
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block">
                Marcados como contactados
              </span>
            </div>
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 group-hover:scale-105 transition-transform">
              <UserCheck className="w-7 h-7" />
            </div>
          </div>

          {/* CARD 4: TASA DE CONVERSIÓN */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 group">
            <div className="space-y-1.5">
              <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Conversión de Cierre</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-800 tracking-tight">{conversionRate}</span>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block">
                Listos para Cierre vs Total
              </span>
            </div>
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-7 h-7" />
            </div>
          </div>

          {/* CARD 5: OPENAI API BALANCE (ONLY FOR GERENTE) */}
          {user?.rol === "GERENTE" && (
            <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-white to-sky-50/20">
              <div className="space-y-1.5 flex-1 min-w-0">
                <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Saldo API ChatGPT</span>
                <span className="text-xs font-bold text-slate-700 block leading-tight">Consulta manual</span>
                <a 
                  href="https://platform.openai.com/settings/organization/billing/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-extrabold text-[#026692] hover:text-[#014d6f] bg-sky-100/50 hover:bg-sky-100 px-3 py-1 rounded-lg inline-flex items-center gap-1 mt-2.5 transition-all w-fit"
                >
                  Ver Facturación ↗
                </a>
              </div>
              <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-[#026692] border border-sky-100 group-hover:scale-105 transition-transform flex-shrink-0 ml-3">
                <Bot className="w-7 h-7" />
              </div>
            </div>
          )}

        </div>
      )}

      {/* Main Grid: Funnel & Recent Leads on Left, Activity Timeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Funnel + Recent Leads */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Conversion Funnel */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Embudo de Conversión</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Progreso y avance por etapas comercial</p>
              </div>
              <span className="text-xs font-semibold text-[#026692] bg-[#e1eff8] px-3 py-1 rounded-full">
                {selectedCityLabel}
              </span>
            </div>
            
            {/* Funnel chart */}
            <div className="space-y-4 pt-2">
              {/* Step 1: Leads */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>LEADS NUEVOS</span>
                  <span>{newLeadsCount}</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-[#b2d4e7] rounded-xl transition-all" style={{ width: totalLeadsCount > 0 ? '100%' : '0%' }}></div>
                  <span className="relative text-xs font-bold text-[#026692] z-10">{totalLeadsCount > 0 ? '100% de prospección' : 'Sin leads'}</span>
                </div>
              </div>

              {/* Step 2: Contacted */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>CONTACTADOS</span>
                  <span>{contactedLeadsCount}</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-[#83b8d7] rounded-xl transition-all" style={{ width: `${contactedPercent}%` }}></div>
                  <span className="relative text-xs font-bold text-[#026692] z-10">{contactedPercent}% contactabilidad</span>
                </div>
              </div>

              {/* Step 3: Quoted */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>COTIZADOS</span>
                  <span>{quotedLeadsCount}</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-[#4c97c1] rounded-xl transition-all" style={{ width: `${quotedPercent}%` }}></div>
                  <span className="relative text-xs font-bold text-slate-700 z-10">{quotedPercent}% cotización</span>
                </div>
              </div>

              {/* Step 4: Won */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>GANADOS (LISTOS PARA CIERRE)</span>
                  <span>{wonLeadsCount}</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-xl transition-all" style={{ width: `${wonPercent}%` }}></div>
                  <span className="relative text-xs font-bold text-slate-700 z-10">{wonPercent}% conversión final</span>
                </div>
              </div>

              {/* Step 5: Atención Humana */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>ATENCIÓN HUMANA</span>
                  <span>{humanAttentionLeadsCount}</span>
                </div>
                <div className="w-full bg-[#f4f3ff] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-indigo-500 rounded-xl transition-all" style={{ width: `${humanAttentionPercent}%` }}></div>
                  <span className="relative text-xs font-bold text-indigo-700 z-10">{humanAttentionPercent}% atención humana</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Leads Table */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-sky-500 rounded-full animate-ping"></span>
                Leads Recientes
              </h2>
              <Link href="/leads" className="text-xs font-semibold text-[#026692] hover:underline flex items-center gap-1">
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              {filteredLeads.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No hay prospectos registrados para este filtro.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#f0f7fc] text-slate-400 text-xs font-bold uppercase tracking-wider pb-3">
                      <th className="pb-3">Nombre / Contacto</th>
                      <th className="pb-3">Origen</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3">Creado El</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f7fc] text-sm">
                    {filteredLeads.slice(0, 4).map((lead) => (
                      <tr key={lead.id} className="hover:bg-[#f8fbfe] transition-all">
                        <td className="py-3 font-semibold text-slate-800">
                          <Link href={`/leads`} className="hover:text-[#026692] block">
                            {lead.nombreCompleto}
                            <span className="text-xs text-slate-400 font-normal block">{lead.telefono}</span>
                          </Link>
                        </td>
                        <td className="py-3 text-slate-500">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e1eff8] text-[#026692]">
                            {lead.origen}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            lead.estado === "NUEVO" ? "bg-sky-50 text-[#026692]" :
                            lead.estado === "CONTACTADO" ? "bg-amber-50 text-amber-600" :
                            lead.estado === "COTIZADO" ? "bg-blue-50 text-blue-600" :
                            lead.estado === "GANADO" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          }`}>
                            {lead.estado}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 text-xs">
                          {new Date(lead.creadoEn).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Activity Timeline */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm h-full flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-6">Actividad Reciente</h2>
              
              {displayActivities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">No hay actividad registrada para esta combinación de filtros.</p>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-slate-100">
                  {displayActivities.map((act) => (
                    <div key={act.id} className="flex space-x-4 relative">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center relative z-10 border-4 border-white shadow-sm ${
                        act.type === 'MESSAGE' ? 'bg-sky-100 text-[#026692]' :
                        act.type === 'QUOTE' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {act.type === 'MESSAGE' ? <MessageSquare className="w-3 h-3" /> :
                         act.type === 'QUOTE' ? <FileText className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">{act.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-xs text-slate-600 ${act.type === 'MESSAGE' ? 'bg-[#f4f8fc] p-3 rounded-2xl italic border border-[#e8f2fa]' : ''}`}>
                          {act.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Call to Action card */}
            <div className="mt-8 bg-gradient-to-r from-[#026692] to-[#388dbb] text-white p-5 rounded-2xl relative overflow-hidden shadow-md">
              <div className="relative z-10 space-y-2">
                <h3 className="font-bold text-sm">¿Nuevos mensajes en WhatsApp?</h3>
                <p className="text-xs text-sky-100">Accede a la bandeja multiagente interactiva para responder y gestionar conversaciones.</p>
                <Link href="/inbox" className="inline-block bg-white text-[#026692] text-xs font-extrabold px-4 py-2 rounded-xl hover:bg-sky-50 transition-all shadow-sm">
                  Ir al Inbox
                </Link>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                <Inbox className="w-32 h-32" />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
