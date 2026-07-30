"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Filter, 
  Download, 
  Phone, 
  MapPin, 
  UserCheck, 
  HelpCircle,
  Shield,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Building,
  RotateCcw,
  X
} from "lucide-react";
import { clientCache } from "@/lib/clientCache";
import { formatPhoneNumber } from "@/lib/format";

interface Lead {
  id: string;
  nombreCompleto: string;
  telefono: string;
  email?: string;
  ciudad: string;
  zona: string;
  origen: string;
  interesServicio: string;
  edadHijo?: number;
  nivelUrgencia: string;
  estado: string;
  idUsuarioAsignado?: string;
  ultimoContactoEn: string;
  creadoEn: string;
  motivoPerdida?: string;
}

interface User {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  ciudad: string | null;
}

interface SessionUser {
  userId: string;
  email: string;
  nombre: string;
  rol: "GERENTE" | "COORDINADORA" | "VENDEDORA";
  ciudad?: string;
}

// Estados del embudo con los nombres exactos y en el orden solicitado
const FUNNEL_STATUSES = [
  { id: "TODOS", label: "Todos los estados" },
  { id: "PENDIENTES", label: "pendientes" },
  { id: "EN_CONVERSACION", label: "en conversación" },
  { id: "EN_COTIZACION", label: "en cotización" },
  { id: "LISTOS_PARA_EL_CIERRE", label: "listos para el cierre" },
  { id: "ATENCION_HUMANA", label: "atención humana" },
  { id: "CONTACTADOS", label: "contactados" },
  { id: "PERDIDOS", label: "perdidos" },
];

export default function LeadsPage() {
  const cachedLeads = clientCache.get<Lead[]>("leads");
  const cachedUsers = clientCache.get<User[]>("users_list");
  const cachedUser = clientCache.get<SessionUser>("current_user");

  const [leads, setLeads] = useState<Lead[]>(cachedLeads || []);
  const [users, setUsers] = useState<User[]>(cachedUsers || []);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(cachedUser || null);
  const [loading, setLoading] = useState(!cachedLeads);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("TODAS");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [agentFilter, setAgentFilter] = useState("TODOS");

  // Fetch Session, Leads & Users
  useEffect(() => {
    async function loadAllData() {
      try {
        if (!cachedLeads) setLoading(true);

        const [meRes, leadsRes, usersRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/leads"),
          fetch("/api/users")
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            setCurrentUser(meData.user);
            clientCache.set("current_user", meData.user);
          }
        }

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          setLeads(leadsData);
          clientCache.set("leads", leadsData);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
          clientCache.set("users_list", usersData);
        }
      } catch (err) {
        console.error("Error loading leads page data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, []);

  const getAgentName = (id?: string) => {
    if (!id) return "Sin asignar";
    const found = users.find(u => u.id === id);
    if (found) return found.nombre;
    if (id === "agent-laura") return "Laura Méndez";
    if (id === "agent-carlos") return "Carlos Ruiz";
    if (id === "agent-ana") return "Ana Beltrán";
    if (id === "gerente-gerardo") return "Gerardo Pineda";
    return "Sin asignar";
  };

  const handleMarkLost = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "PERDIDO" }),
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado: "PERDIDO" } : l));
      }
    } catch (err) {
      console.error("Error marking lead as lost:", err);
    }
  };

  const clearFilters = () => {
    setCityFilter("TODAS");
    setStatusFilter("TODOS");
    setAgentFilter("TODOS");
    setSearchTerm("");
  };

  // Filter logic
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) || 
      lead.telefono.includes(searchTerm) || 
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const normalizedCity = lead.ciudad ? lead.ciudad.trim().toUpperCase() : "";
    let matchesCity = true;
    if (cityFilter === "TODAS") {
      matchesCity = true;
    } else if (cityFilter === "OTRAS") {
      const mainCities = ["PUEBLA", "XALAPA", "QUERÉTARO", "QUERETARO", "CDMX", "CIUDAD DE MÉXICO", "CIUDAD DE MEXICO"];
      matchesCity = !mainCities.includes(normalizedCity);
    } else if (cityFilter.toUpperCase() === "CDMX") {
      matchesCity = normalizedCity === "CDMX" || normalizedCity === "CIUDAD DE MÉXICO" || normalizedCity === "CIUDAD DE MEXICO";
    } else if (cityFilter.toUpperCase() === "QUERÉTARO") {
      matchesCity = normalizedCity === "QUERÉTARO" || normalizedCity === "QUERETARO";
    } else {
      matchesCity = normalizedCity === cityFilter.toUpperCase();
    }
    
    let matchesStatus = true;
    if (statusFilter === "TODOS") {
      matchesStatus = true;
    } else if (statusFilter === "PENDIENTES") {
      matchesStatus = lead.estado === "NUEVO";
    } else if (statusFilter === "EN_CONVERSACION") {
      matchesStatus = lead.estado === "CONTACTADO" && (!lead.idUsuarioAsignado || lead.idUsuarioAsignado === "");
    } else if (statusFilter === "EN_COTIZACION") {
      matchesStatus = lead.estado === "COTIZADO";
    } else if (statusFilter === "LISTOS_PARA_EL_CIERRE") {
      matchesStatus = lead.estado === "GANADO";
    } else if (statusFilter === "ATENCION_HUMANA") {
      matchesStatus = lead.estado === "ATENCION_HUMANA";
    } else if (statusFilter === "CONTACTADOS") {
      matchesStatus = lead.estado === "CONTACTADO" && !!lead.idUsuarioAsignado && lead.idUsuarioAsignado !== "";
    } else if (statusFilter === "PERDIDOS") {
      matchesStatus = lead.estado === "PERDIDO";
    }

    const matchesAgent = agentFilter === "TODOS" 
      ? true 
      : agentFilter === "SIN_ASIGNAR" 
        ? (!lead.idUsuarioAsignado || lead.idUsuarioAsignado === "") 
        : lead.idUsuarioAsignado === agentFilter;

    return matchesSearch && matchesCity && matchesStatus && matchesAgent;
  });

  // Render badge helper for exact names
  const getStatusBadge = (lead: Lead) => {
    switch (lead.estado) {
      case "NUEVO":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-sky-50 text-[#026692]">pendientes</span>;
      case "COTIZADO":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-600">en cotización</span>;
      case "GANADO":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-600">listos para el cierre</span>;
      case "ATENCION_HUMANA":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-600">atención humana</span>;
      case "PERDIDO":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-600">perdidos</span>;
      case "CONTACTADO":
      default:
        if (lead.idUsuarioAsignado && lead.idUsuarioAsignado !== "") {
          return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-purple-50 text-purple-600">contactados</span>;
        }
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-600">en conversación</span>;
    }
  };

  // Export to Excel / CSV (Gerente Only)
  const handleExport = () => {
    if (!currentUser || currentUser.rol !== "GERENTE") return;

    const headers = [
      "ID Lead",
      "Nombre Completo",
      "WhatsApp / Teléfono",
      "Email",
      "Ciudad",
      "Zona / Colonia",
      "Origen",
      "Servicio de Interés",
      "Urgencia",
      "Estado",
      "Agente Responsable",
      "Fecha de Creación"
    ];

    const rows = filteredLeads.map(l => [
      `"${l.id}"`,
      `"${l.nombreCompleto.replace(/"/g, '""')}"`,
      `"${formatPhoneNumber(l.telefono)}"`,
      `"${l.email || ''}"`,
      `"${l.ciudad}"`,
      `"${l.zona || ''}"`,
      `"${l.origen}"`,
      `"${l.interesServicio}"`,
      `"${l.nivelUrgencia}"`,
      `"${l.estado}"`,
      `"${getAgentName(l.idUsuarioAsignado)}"`,
      `"${new Date(l.creadoEn).toLocaleDateString()}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Prospectos_NyP_CRM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isGerente = currentUser?.rol === "GERENTE";

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto custom-scrollbar bg-[#f3f8fc]">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#026692] tracking-tight">Prospectos (Leads)</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Gestiona la lista completa de oportunidades y prospectos capturados en el CRM.
          </p>
        </div>

        {/* Action Controls: Export button strictly for GERENTE */}
        <div className="flex items-center space-x-3">
          {isGerente && (
            <button 
              onClick={handleExport}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all duration-200 shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* ULTRA-PREMIUM FILTERS BAR */}
      <div className="bg-white p-5 rounded-3xl border border-[#e2edf6] shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          
          {/* Search bar (4 cols) */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block pl-1">Búsqueda rápida</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4 text-[#026692]" />
              </span>
              <input 
                type="text" 
                placeholder="Buscar por nombre, celular o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#f4f8fc] border border-[#cbdfe9] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all font-medium"
              />
            </div>
          </div>

          {/* City filter (2 cols) */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1 pl-1">
              <MapPin className="w-3 h-3 text-[#026692]" /> Ciudad
            </label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full bg-[#f4f8fc] border border-[#cbdfe9] rounded-2xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all cursor-pointer"
            >
              <option value="TODAS">Todas las ciudades</option>
              <option value="Puebla">Puebla</option>
              <option value="Xalapa">Xalapa</option>
              <option value="Querétaro">Querétaro</option>
              <option value="CDMX">CDMX</option>
              <option value="OTRAS">Otras</option>
            </select>
          </div>

          {/* Status filter in exact Funnel Order requested (3 cols) */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1 pl-1">
              <Filter className="w-3 h-3 text-amber-500" /> Estado en Embudo
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#f4f8fc] border border-[#cbdfe9] rounded-2xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all cursor-pointer"
            >
              {FUNNEL_STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Agent filter dynamically bound to users (3 cols) */}
          <div className="md:col-span-3 space-y-1">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-purple-600" /> Agente Responsable
              </label>
              {(cityFilter !== "TODAS" || statusFilter !== "TODOS" || agentFilter !== "TODOS" || searchTerm !== "") && (
                <button 
                  onClick={clearFilters}
                  className="text-[10px] font-extrabold text-[#026692] hover:underline flex items-center gap-0.5"
                >
                  <RotateCcw className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full bg-[#f4f8fc] border border-[#cbdfe9] rounded-2xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all cursor-pointer"
            >
              <option value="TODOS">Todos los agentes</option>
              <option value="SIN_ASIGNAR">Sin asignar</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.rol === "GERENTE" ? "Gerente" : u.rol === "COORDINADORA" ? "Coordinadora" : "Vendedora"})
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Leads Table Card */}
      <div className="bg-white rounded-3xl border border-[#e2edf6] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <div className="w-8 h-8 mx-auto border-4 border-[#026692] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-400">Consultando prospectos...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <HelpCircle className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-extrabold text-slate-700 text-sm">No se encontraron prospectos</p>
            <p className="text-xs text-slate-400">Prueba modificando la búsqueda o los filtros superiores.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2edf6] bg-[#f8fbfe] text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                  <th className="px-6 py-4">Nombre del Lead</th>
                  <th className="px-6 py-4">WhatsApp / Teléfono</th>
                  <th className="px-6 py-4">Ciudad / Zona</th>
                  <th className="px-6 py-4">Servicio de interés</th>
                  <th className="px-6 py-4">Estado en Embudo</th>
                  <th className="px-6 py-4">Agente Responsable</th>
                  <th className="px-6 py-4">Fecha Creación</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f7fc] text-xs">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#f8fbfe] transition-all group font-medium text-slate-700">
                    {/* Name */}
                    <td className="px-6 py-4 font-extrabold text-slate-800">
                      <Link href={`/inbox?leadId=${lead.id}`} className="hover:text-[#026692] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#026692]"></span>
                        <span>{lead.nombreCompleto}</span>
                      </Link>
                    </td>

                    {/* WhatsApp formatted */}
                    <td className="px-6 py-4 text-[#026692] font-bold">
                      <div className="flex items-center space-x-1.5">
                        <span>📞</span>
                        <span>{formatPhoneNumber(lead.telefono)}</span>
                      </div>
                    </td>

                    {/* City & Zone */}
                    <td className="px-6 py-4 text-slate-600 font-semibold">
                      <span>{lead.ciudad}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">{lead.zona || "Por definir"}</span>
                    </td>

                    {/* Service */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold bg-[#e1eff8] text-[#026692] uppercase">
                        {lead.interesServicio || "Por definir"}
                      </span>
                    </td>

                    {/* Status badge with exact names */}
                    <td className="px-6 py-4">
                      {getStatusBadge(lead)}
                    </td>

                    {/* Responsible Agent */}
                    <td className="px-6 py-4 font-bold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        <span>{getAgentName(lead.idUsuarioAsignado)}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-slate-400 text-[11px]">
                      {new Date(lead.creadoEn).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/inbox?leadId=${lead.id}`}
                        className="bg-[#f4f8fc] hover:bg-[#e8f4fd] text-[#026692] px-3 py-1.5 rounded-xl transition-all text-xs font-bold inline-flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
