"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Download, 
  X,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  MoreVertical,
  CheckCircle,
  HelpCircle
} from "lucide-react";

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
  motivoPerdida?: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("TODAS");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [agentFilter, setAgentFilter] = useState("TODOS");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    nombreCompleto: "",
    telefono: "",
    email: "",
    ciudad: "Ciudad de México",
    zona: "",
    origen: "WhatsApp Directo",
    interesServicio: "Cuidado Premium Medio Tiempo",
    edadHijo: 3,
    cantidadHijos: 1,
    nivelUrgencia: "MEDIA",
    estado: "NUEVO",
    idUsuarioAsignado: "agent-laura",
  });

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLead),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewLead({
          nombreCompleto: "",
          telefono: "",
          email: "",
          ciudad: "Ciudad de México",
          zona: "",
          origen: "WhatsApp Directo",
          interesServicio: "Cuidado Premium Medio Tiempo",
          edadHijo: 3,
          cantidadHijos: 1,
          nivelUrgencia: "MEDIA",
          estado: "NUEVO",
          idUsuarioAsignado: "agent-laura",
        });
        fetchLeads();
      }
    } catch (err) {
      console.error("Error creating lead:", err);
    }
  };

  const getAgentName = (id?: string) => {
    if (id === "agent-laura") return "Laura M.";
    if (id === "agent-carlos") return "Carlos R.";
    if (id === "agent-ana") return "Ana B.";
    return "Sin asignar";
  };

  const clearFilters = () => {
    setCityFilter("TODAS");
    setStatusFilter("TODOS");
    setAgentFilter("TODOS");
    setSearchTerm("");
  };

  // Filter logic
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.telefono.includes(searchTerm) || 
                          (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCity = cityFilter === "TODAS" || lead.ciudad.toUpperCase() === cityFilter.toUpperCase();
    const matchesStatus = statusFilter === "TODOS" || lead.estado === statusFilter;
    const matchesAgent = agentFilter === "TODOS" || lead.idUsuarioAsignado === agentFilter;

    return matchesSearch && matchesCity && matchesStatus && matchesAgent;
  });

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto custom-scrollbar">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#026692]">Prospectos (Leads)</h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona tus contactos y oportunidades de cuidado premium.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 bg-white text-slate-700 border border-[#e2edf6] hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm">
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-[#026692] text-white hover:bg-[#1d4359] px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Lead</span>
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Buscar por nombre o celular..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#f4f8fc] border-0 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all"
            />
          </div>

          {/* City filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Ciudad</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all cursor-pointer"
            >
              <option value="TODAS">Todas las ciudades</option>
              <option value="Ciudad de México">Ciudad de México</option>
              <option value="Monterrey">Monterrey</option>
              <option value="Guadalajara">Guadalajara</option>
              <option value="Madrid">Madrid</option>
              <option value="Barcelona">Barcelona</option>
              <option value="Valencia">Valencia</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all cursor-pointer"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="NUEVO">Nuevo</option>
              <option value="CONTACTADO">Contactado</option>
              <option value="COTIZADO">Cotizado</option>
              <option value="GANADO">Ganado</option>
              <option value="PERDIDO">Perdido</option>
            </select>
          </div>

          {/* Agent filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Agente Responsable</label>
            <div className="flex items-center space-x-2">
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="flex-1 bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all cursor-pointer"
              >
                <option value="TODOS">Cualquier agente</option>
                <option value="agent-laura">Laura M.</option>
                <option value="agent-carlos">Carlos R.</option>
                <option value="agent-ana">Ana B.</option>
              </select>
              {(cityFilter !== "TODAS" || statusFilter !== "TODOS" || agentFilter !== "TODOS" || searchTerm !== "") && (
                <button 
                  onClick={clearFilters}
                  className="text-xs font-bold text-slate-400 hover:text-rose-500 underline transition-all"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table Card */}
      <div className="bg-white rounded-3xl border border-[#e2edf6] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <p className="animate-pulse">Cargando prospectos...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-bold">No se encontraron prospectos</p>
            <p className="text-xs">Prueba cambiando los filtros o agrega un nuevo prospecto.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#f0f7fc] bg-[#f8fbfe] text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">WhatsApp</th>
                  <th className="px-6 py-4">Ciudad / Zona</th>
                  <th className="px-6 py-4">Servicio de interés</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Responsable</th>
                  <th className="px-6 py-4">Último Contacto</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f7fc] text-sm">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#f8fbfe] transition-all group">
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      <Link href={`/leads/${lead.id}`} className="hover:text-[#026692]">
                        {lead.nombreCompleto}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-emerald-600 font-bold flex items-center space-x-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{lead.telefono}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {lead.ciudad}
                      <span className="text-xs text-slate-400 block">{lead.zona}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e1eff8] text-[#026692] uppercase">
                        {lead.interesServicio}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        lead.estado === "NUEVO" ? "bg-sky-50 text-[#026692]" :
                        lead.estado === "CONTACTADO" ? "bg-amber-50 text-amber-600" :
                        lead.estado === "COTIZADO" ? "bg-blue-50 text-blue-600" :
                        lead.estado === "GANADO" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      }`}>
                        {lead.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {getAgentName(lead.idUsuarioAsignado)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(lead.ultimoContactoEn).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                      {new Date(lead.ultimoContactoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Link 
                          href={`/leads/${lead.id}`}
                          className="text-[#026692] hover:bg-[#e1eff8] p-1.5 rounded-lg transition-all text-xs font-bold"
                        >
                          Ver ficha
                        </Link>
                        <Link 
                          href="/inbox"
                          className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-all text-xs font-bold"
                        >
                          Chat
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-[#e2edf6] transform transition-all">
            {/* Modal Header */}
            <div className="bg-[#e8f4fd] px-6 py-4 flex items-center justify-between border-b border-[#d4e6f4]">
              <h3 className="font-extrabold text-[#026692] text-lg">Registrar Nuevo Prospecto (Lead)</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Full name */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={newLead.nombreCompleto}
                    onChange={(e) => setNewLead({ ...newLead, nombreCompleto: e.target.value })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none"
                    placeholder="Ej. María Alarcón"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp / Celular *</label>
                  <input
                    type="text"
                    required
                    value={newLead.telefono}
                    onChange={(e) => setNewLead({ ...newLead, telefono: e.target.value })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none"
                    placeholder="Ej. +34 600 000 000"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email (Opcional)</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none"
                    placeholder="Ej. maria@email.com"
                  />
                </div>

                {/* City */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Ciudad *</label>
                  <select
                    value={newLead.ciudad}
                    onChange={(e) => setNewLead({ ...newLead, ciudad: e.target.value })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none cursor-pointer"
                  >
                    <option value="Ciudad de México">Ciudad de México</option>
                    <option value="Monterrey">Monterrey</option>
                    <option value="Guadalajara">Guadalajara</option>
                    <option value="Madrid">Madrid</option>
                    <option value="Barcelona">Barcelona</option>
                    <option value="Valencia">Valencia</option>
                  </select>
                </div>

                {/* Zone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Zona / Colonia *</label>
                  <input
                    type="text"
                    required
                    value={newLead.zona}
                    onChange={(e) => setNewLead({ ...newLead, zona: e.target.value })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none"
                    placeholder="Ej. Polanco o Salamanca"
                  />
                </div>

                {/* Source */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Origen de Prospección</label>
                  <select
                    value={newLead.origen}
                    onChange={(e) => setNewLead({ ...newLead, origen: e.target.value })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none cursor-pointer"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="WhatsApp Directo">WhatsApp Directo</option>
                    <option value="FB Ads">FB Ads</option>
                    <option value="Recomendación">Recomendación</option>
                  </select>
                </div>

                {/* Urgency */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Urgencia</label>
                  <select
                    value={newLead.nivelUrgencia}
                    onChange={(e) => setNewLead({ ...newLead, nivelUrgencia: e.target.value })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none cursor-pointer"
                  >
                    <option value="BAJA">Baja</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>

                {/* Service Interest */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Servicio de interés</label>
                  <select
                    value={newLead.interesServicio}
                    onChange={(e) => setNewLead({ ...newLead, interesServicio: e.target.value })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none cursor-pointer"
                  >
                    <option value="Cuidado Premium Medio Tiempo">Cuidado Premium Medio Tiempo</option>
                    <option value="FIXA SEMANAL">FIXA SEMANAL</option>
                    <option value="NANNY EVENTUAL">Nanny Eventual</option>
                    <option value="FIXA NOCTURNA">FIXA NOCTURNA</option>
                    <option value="FIXA INTERNA">FIXA INTERNA</option>
                  </select>
                </div>

                {/* Assigned Agent */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Asignar a Agente</label>
                  <select
                    value={newLead.idUsuarioAsignado}
                    onChange={(e) => setNewLead({ ...newLead, idUsuarioAsignado: e.target.value })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none cursor-pointer"
                  >
                    <option value="agent-laura">Laura Méndez</option>
                    <option value="agent-carlos">Carlos Ruiz</option>
                    <option value="agent-ana">Ana Beltrán</option>
                  </select>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#f4f8fc] text-slate-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#026692] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1d4359] transition-all shadow-md"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
