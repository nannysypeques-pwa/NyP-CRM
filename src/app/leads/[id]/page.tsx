"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Plus, 
  Save, 
  Bot, 
  Users, 
  FileText, 
  Clock, 
  Check, 
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Briefcase
} from "lucide-react";
import confetti from "canvas-confetti";

interface Child {
  id: string;
  nombre: string;
  textoEdad: string;
  alergias?: string;
  condicionMedica?: string;
  estadoSalud?: string;
  preferencias?: string;
  indicacionesNanny?: string;
  necesidades?: string;
  instrucciones?: string;
}

interface LeadNote {
  id: string;
  contenido: string;
  nombreAgente: string;
  creadoEn: string;
}

interface FollowUp {
  id: string;
  titulo: string;
  descripcion?: string;
  fechaVencimiento: string;
  estado: string;
}

interface Quote {
  id: string;
  tipoServicio: string;
  ciudad: string;
  dias: string;
  horaInicio: string;
  horaFin: string;
  horasPorDia: number;
  cantidadHijos: number;
  subtotal: number;
  descuento: number;
  total: number;
  estado: string;
  validoHasta: string;
}

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
  cantidadHijos: number;
  diasSolicitados?: string;
  horaInicioSolicitada?: string;
  horaFinSolicitada?: string;
  fechaInicioDeseada?: string;
  nivelUrgencia: string;
  estado: string;
  idUsuarioAsignado?: string;
  ultimoContactoEn: string;
  resumenIA?: string;
  datosFaltantes?: string[];
  linkUbicacion?: string;
  razonContratacion?: string;
  mascotas?: string;
  indicacionesIngreso?: string;
  hijos?: Child[];
  notas?: LeadNote[];
  seguimientos?: FollowUp[];
  cotizaciones?: Quote[];
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");
  
  // Note form
  const [noteContent, setNoteContent] = useState("");
  
  // Follow-up form
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDue, setFollowUpDue] = useState("");
  const [followUpDesc, setFollowUpDesc] = useState("");

  // Quote form
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    tipoServicio: "Cuidado Premium Medio Tiempo",
    ciudad: "Ciudad de México",
    dias: "Lunes a Viernes",
    horaInicio: "09:00",
    horaFin: "13:00",
    horasPorDia: 4,
    cantidadHijos: 1,
    subtotal: 12400,
    descuento: 0,
    total: 12400,
  });

  const fetchLeadDetails = async () => {
    try {
      const res = await fetch(`/api/leads/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setLead(data);
        // Sync quote form city
        setQuoteForm(q => ({ ...q, ciudad: data.ciudad, tipoServicio: data.interesServicio }));
      }
    } catch (err) {
      console.error("Error loading lead details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
  }, [params.id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newStatus }),
      });
      if (res.ok) {
        setLead({ ...lead, estado: newStatus });
        if (newStatus === "GANADO") {
          // Fire premium success confetti
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAgentChange = async (agentId: string) => {
    if (!lead) return;
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idUsuarioAsignado: agentId }),
      });
      if (res.ok) {
        setLead({ ...lead, idUsuarioAsignado: agentId });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !lead) return;
    try {
      const res = await fetch(`/api/leads/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: noteContent, nombreAgente: "Laura Méndez" }),
      });
      if (res.ok) {
        setNoteContent("");
        fetchLeadDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTitle || !followUpDue) return;
    try {
      const res = await fetch(`/api/leads/${params.id}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: followUpTitle, descripcion: followUpDesc, fechaVencimiento: new Date(followUpDue).toISOString() }),
      });
      if (res.ok) {
        setFollowUpTitle("");
        setFollowUpDue("");
        setFollowUpDesc("");
        setIsFollowUpModalOpen(false);
        fetchLeadDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/leads/${params.id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quoteForm,
          subtotal: Number(quoteForm.subtotal),
          descuento: Number(quoteForm.descuento),
          total: Number(quoteForm.subtotal) - Number(quoteForm.descuento),
          creadoPor: "Laura Méndez"
        }),
      });
      if (res.ok) {
        setIsQuoteModalOpen(false);
        fetchLeadDetails();
        // Fire confetti for sending quote
        confetti({
          particleCount: 80,
          spread: 60,
          colors: ['#026692', '#388dbb', '#ffffff']
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Auto calculate total for quote form
  useEffect(() => {
    const hours = quoteForm.horasPorDia;
    const days = 5; // e.g. Lunes a Viernes
    const children = quoteForm.cantidadHijos;
    // Simple math: $150 MXN per hour base
    const baseRate = 150;
    const subtotal = hours * days * 4 * children * baseRate; // 4 weeks
    setQuoteForm(q => ({
      ...q,
      subtotal,
      total: subtotal - q.descuento
    }));
  }, [quoteForm.horasPorDia, quoteForm.cantidadHijos, quoteForm.descuento]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 h-full flex items-center justify-center">
        <p className="animate-pulse text-lg font-bold">Cargando detalles de prospecto...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center text-rose-500 h-full flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-rose-400" />
        <h2 className="text-xl font-bold">Prospecto no encontrado</h2>
        <Link href="/leads" className="text-[#026692] hover:underline flex items-center gap-1.5 font-bold">
          <ArrowLeft className="w-4 h-4" /> Volver a leads
        </Link>
      </div>
    );
  }

  const upcomingFollowUp = lead.seguimientos?.find(f => f.estado === "PENDIENTE");

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar">
      
      {/* Breadcrumb back */}
      <div className="flex items-center justify-between">
        <Link href="/leads" className="text-slate-500 hover:text-[#026692] flex items-center gap-1.5 text-sm font-semibold transition-all">
          <ArrowLeft className="w-4 h-4" /> Volver a la lista de Leads
        </Link>
        <span className="text-xs text-slate-400 font-semibold">ID: {lead.id.slice(0,8)}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        {/* User identification */}
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-[#026692]/10 rounded-full flex items-center justify-center text-[#026692] font-extrabold text-2xl border border-[#e2edf6]">
            {lead.nombreCompleto.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-extrabold text-slate-800">{lead.nombreCompleto}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                lead.estado === "NUEVO" ? "bg-sky-50 text-[#026692]" :
                lead.estado === "CONTACTADO" ? "bg-amber-50 text-amber-600" :
                lead.estado === "COTIZADO" ? "bg-blue-50 text-blue-600" :
                lead.estado === "GANADO" ? "bg-emerald-50 text-emerald-600 animate-bounce" : "bg-rose-50 text-rose-600"
              }`}>
                {lead.estado === "GANADO" ? "CLIENTE GANADO" : lead.estado === "PERDIDO" ? "CERRADO PERDIDO" : lead.estado}
              </span>
            </div>
            <p className="text-slate-500 text-sm flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" /> {lead.zona}, {lead.ciudad}
            </p>
          </div>
        </div>

        {/* Quick action details */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="bg-[#f4f8fc] px-4 py-3 rounded-2xl border border-[#e8f2fa] text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Valor Estimado</span>
            <span className="text-base font-extrabold text-[#026692] flex items-center justify-center">
              <DollarSign className="w-4 h-4" /> 12,400.00 MXN
            </span>
          </div>
          <div className="bg-[#f4f8fc] px-4 py-3 rounded-2xl border border-[#e8f2fa] text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Último Contacto</span>
            <span className="text-sm font-semibold text-slate-700">Hace 2 horas</span>
          </div>

          <div className="flex space-x-2">
            <Link 
              href="/inbox" 
              className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 text-xs font-bold"
            >
              <Phone className="w-4 h-4" /> WhatsApp
            </Link>
          </div>
        </div>

      </div>

      {/* Main Grid: Detail columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* AI Intent & Missing data summary */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[#026692]">
            <div className="flex items-center space-x-2 text-[#026692] mb-4">
              <Bot className="w-5 h-5" />
              <h2 className="font-extrabold text-sm uppercase tracking-wide">Resumen del Asistente IA</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Intención del Cliente</span>
                <p className="text-xs text-slate-600 bg-[#f4f8fc] p-4 rounded-2xl border border-[#e8f2fa] leading-relaxed">
                  {lead.resumenIA || "Analizando intención comercial del cliente..."}
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Datos Faltantes por Recopilar</span>
                {lead.datosFaltantes && lead.datosFaltantes.length > 0 ? (
                  <ul className="space-y-2">
                    {lead.datosFaltantes.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs font-bold">
                    <Check className="w-4 h-4" />
                    <span>¡Todos los datos comerciales recopilados con éxito!</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="bg-white rounded-3xl border border-[#e2edf6] shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-[#f0f7fc] bg-[#f8fbfe] overflow-x-auto">
              <button 
                onClick={() => setActiveTab("general")}
                className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "general" ? "border-[#026692] text-[#026692] bg-white" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Información General
              </button>
              <button 
                onClick={() => setActiveTab("peques")}
                className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "peques" ? "border-[#026692] text-[#026692] bg-white" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Niños ({lead.hijos?.length || 0})
              </button>
              <button 
                onClick={() => setActiveTab("notes")}
                className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "notes" ? "border-[#026692] text-[#026692] bg-white" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Notas ({lead.notas?.length || 0})
              </button>
              <button 
                onClick={() => setActiveTab("quotes")}
                className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "quotes" ? "border-[#026692] text-[#026692] bg-white" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Cotizaciones ({lead.cotizaciones?.length || 0})
              </button>
            </div>

            {/* Tab content */}
            <div className="p-6">
              
              {/* General Info */}
              {activeTab === "general" && (
                <div className="space-y-8 text-sm">
                  {/* Grid de 2 columnas para información básica */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">Celular / WhatsApp</span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-4 h-4 text-emerald-500" /> {lead.telefono}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">Correo electrónico</span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-4 h-4 text-sky-500" /> {lead.email || "No registrado"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">Origen del Lead</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#e1eff8] text-[#026692] inline-block mt-1">
                          {lead.origen}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">Razón de Contratación</span>
                        <span className="font-semibold text-slate-700 block mt-0.5 italic">
                          {lead.razonContratacion ? `"${lead.razonContratacion}"` : "No especificada"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">Servicio Solicitado</span>
                        <span className="font-semibold text-slate-700 block mt-0.5">{lead.interesServicio}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase block">Horas Estimadas</span>
                          <span className="font-semibold text-slate-700 block mt-0.5">{lead.horaInicioSolicitada && lead.horaFinSolicitada ? `${lead.horaInicioSolicitada} a ${lead.horaFinSolicitada}` : "Por definir"}</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase block">Días Requeridos</span>
                          <span className="font-semibold text-slate-700 block mt-0.5">{lead.diasSolicitados || "Por definir"}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">Fecha Tentativa de Inicio</span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-4 h-4 text-slate-400" /> {lead.fechaInicioDeseada || "Inmediato"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">Mascotas en el Hogar</span>
                        <span className="font-semibold text-slate-700 block mt-0.5">
                          {lead.mascotas || "Ninguna registrada"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sección a ancho completo para Ubicación e indicaciones de ingreso */}
                  <div className="border-t border-[#f0f7fc] pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#f4f8fc] p-4 rounded-2xl border border-[#e8f2fa] space-y-1">
                      <span className="text-xs font-bold text-[#026692] uppercase block">Ubicación y Mapa</span>
                      <p className="text-xs text-slate-600 font-semibold">{lead.zona ? `${lead.zona}, ` : ""}{lead.ciudad}</p>
                      {lead.linkUbicacion ? (
                        <a 
                          href={lead.linkUbicacion} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 text-xs text-[#026692] hover:underline font-bold mt-2"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Abrir enlace de ubicación
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 block mt-2">Enlace de mapa no compartido aún</span>
                      )}
                    </div>

                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-1">
                      <span className="text-xs font-bold text-amber-700 uppercase block">Indicaciones de Ingreso al Hogar</span>
                      <p className="text-xs text-amber-800 font-medium leading-relaxed">
                        {lead.indicacionesIngreso || "No se han registrado indicaciones o claves de ingreso para este hogar."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Children Profile */}
              {activeTab === "peques" && (
                <div className="space-y-6">
                  {lead.hijos && lead.hijos.length > 0 ? (
                    lead.hijos.map((child) => (
                      <div key={child.id} className="bg-[#f4f8fc] p-6 rounded-3xl border border-[#e8f2fa] space-y-5">
                        {/* Cabecera del peque */}
                        <div className="flex justify-between items-center border-b border-[#e8f2fa] pb-3">
                          <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                            👶 {child.nombre}
                          </h4>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#026692] text-white">
                            {child.textoEdad}
                          </span>
                        </div>

                        {/* Grid de detalles de salud y gustos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Columna Izquierda: Salud y Seguridad */}
                          <div className="space-y-3">
                            <div className="bg-[#fff1f5] p-4 rounded-2xl border border-[#ffe1e8] space-y-1">
                              <span className="text-[10px] font-bold text-rose-600 uppercase block tracking-wider">Alergias</span>
                              <p className="text-xs text-rose-800 font-bold">
                                {child.alergias || "Ninguna registrada"}
                              </p>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Condición Médica</span>
                              <p className="text-xs text-slate-700 font-semibold">
                                {child.condicionMedica || "Sin condiciones especiales"}
                              </p>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Estado de Salud Actual</span>
                              <p className="text-xs text-slate-700 font-semibold">
                                {child.estadoSalud || "Bueno / No especificado"}
                              </p>
                            </div>
                          </div>

                          {/* Columna Derecha: Preferencias y Cuidado */}
                          <div className="space-y-3">
                            <div className="bg-[#e8f4fd] p-4 rounded-2xl border border-[#d4e6f4] space-y-1">
                              <span className="text-[10px] font-bold text-[#026692] uppercase block tracking-wider">Actividades Favoritas y Gustos</span>
                              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                                {child.preferencias || "No especificadas aún"}
                              </p>
                            </div>

                            <div className="bg-[#fcf8e3] p-4 rounded-2xl border border-[#faf2cc] space-y-1">
                              <span className="text-[10px] font-bold text-[#8a6d3b] uppercase block tracking-wider">Indicaciones Especiales para Nanny</span>
                              <p className="text-xs text-[#8a6d3b] font-bold leading-relaxed">
                                {child.indicacionesNanny || child.instrucciones || "Sin indicaciones específicas"}
                              </p>
                            </div>

                            {child.necesidades && (
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Necesidades del Cuidado</span>
                                <p className="text-xs text-slate-700 font-semibold">{child.necesidades}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      <p className="font-bold">No se han registrado perfiles de niños.</p>
                      <p className="text-xs">Los perfiles se crean automáticamente al calificar al prospecto.</p>
                    </div>
                  )}
                </div>
              )}

              {/* internal notes */}
              {activeTab === "notes" && (
                <div className="space-y-6">
                  {/* Notes List */}
                  <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {lead.notas && lead.notas.length > 0 ? (
                      lead.notas.map((note) => (
                        <div key={note.id} className="bg-[#f8fbfe] p-4 rounded-2xl border border-[#f0f7fc] space-y-1">
                          <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                            <span>✍️ {note.nombreAgente}</span>
                            <span>{new Date(note.creadoEn).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">"{note.contenido}"</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">No hay notas registradas para este lead.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Quotes list */}
              {activeTab === "quotes" && (
                <div className="space-y-6">
                  {lead.cotizaciones && lead.cotizaciones.length > 0 ? (
                    <div className="space-y-4">
                      {lead.cotizaciones.map((quote) => (
                        <div key={quote.id} className="bg-white p-5 rounded-2xl border border-[#e2edf6] shadow-sm flex justify-between items-center gap-4">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 text-sm">{quote.tipoServicio}</h4>
                            <p className="text-xs text-slate-400">
                              {quote.dias} • {quote.horasPorDia} hrs/día • {quote.cantidadHijos} niño(s)
                            </p>
                            <span className="text-[10px] text-slate-400 font-semibold block">Vence: {new Date(quote.validoHasta).toLocaleDateString()}</span>
                          </div>
                          <div className="text-right space-y-2">
                            <span className="text-lg font-extrabold text-[#026692] block">${quote.total.toLocaleString()} MXN</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              quote.estado === "BORRADOR" ? "bg-slate-100 text-slate-500" :
                              quote.estado === "ENVIADA" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                            }`}>
                              {quote.estado}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl space-y-2">
                      <p className="font-bold">No hay cotizaciones enviadas.</p>
                      <button 
                        onClick={() => setIsQuoteModalOpen(true)}
                        className="bg-[#e1eff8] text-[#026692] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#c3dfef] transition-all"
                      >
                        Crear primera cotización
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Right Column (1 col): Actions & Upcoming task */}
        <div className="space-y-8">
          
          {/* Quick Actions Card */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-6">
            <h3 className="font-extrabold text-slate-800 text-base">Acciones Rápidas</h3>
            
            {/* Status change */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Estado del Lead</label>
              <select
                value={lead.estado}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2.5 text-sm text-slate-700 font-bold focus:ring-2 focus:ring-[#026692] outline-none cursor-pointer"
              >
                <option value="NUEVO">Nuevo</option>
                <option value="CONTACTADO">Contactado</option>
                <option value="COTIZADO">Cotizado</option>
                <option value="GANADO">Ganado (Convertir a Cliente)</option>
                <option value="PERDIDO">Perdido</option>
              </select>
            </div>

            {/* Agent Assign */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Asignar a Agente</label>
              <select
                value={lead.idUsuarioAsignado || ""}
                onChange={(e) => handleAgentChange(e.target.value)}
                className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2.5 text-sm text-slate-700 font-bold focus:ring-2 focus:ring-[#026692] outline-none cursor-pointer"
              >
                <option value="agent-laura">Laura Méndez</option>
                <option value="agent-carlos">Carlos Ruiz</option>
                <option value="agent-ana">Ana Beltrán</option>
              </select>
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => setIsFollowUpModalOpen(true)}
                className="flex flex-col items-center justify-center bg-[#f4f8fc] hover:bg-[#e8f4fd] border border-[#e2edf6] text-[#026692] p-4 rounded-2xl transition-all shadow-sm group"
              >
                <Clock className="w-5 h-5 text-slate-400 group-hover:text-[#026692] transition-colors mb-1" />
                <span className="text-[10px] font-extrabold uppercase tracking-wide">Agendar Cita</span>
              </button>
              
              <button 
                onClick={() => setIsQuoteModalOpen(true)}
                className="flex flex-col items-center justify-center bg-[#026692] hover:bg-[#1d4359] text-white p-4 rounded-2xl transition-all shadow-sm"
              >
                <FileText className="w-5 h-5 text-sky-200 mb-1" />
                <span className="text-[10px] font-extrabold uppercase tracking-wide">Crear Cotización</span>
              </button>
            </div>

            {/* Quick notes form */}
            <form onSubmit={handleSaveNote} className="space-y-3 pt-2 border-t border-[#f0f7fc]">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Nota Rápida Interna</label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
                placeholder="Escribe algo importante sobre este lead..."
                className="w-full bg-[#f4f8fc] border-0 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none resize-none"
              />
              <button 
                type="submit"
                disabled={!noteContent.trim()}
                className="w-full bg-[#f4f8fc] hover:bg-[#026692] text-slate-600 hover:text-white disabled:hover:bg-[#f4f8fc] disabled:hover:text-slate-400 disabled:opacity-50 py-2 rounded-xl text-xs font-bold transition-all border border-[#e2edf6] hover:border-transparent flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Guardar Nota
              </button>
            </form>
          </div>

          {/* Upcoming task Card */}
          <div className="bg-[#fff1f5] p-6 rounded-3xl border border-[#ffe1e8] shadow-sm space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500">Próxima Tarea</span>
            {upcomingFollowUp ? (
              <div className="space-y-3">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{upcomingFollowUp.titulo}</h4>
                  <p className="text-xs text-slate-500 mt-1">{upcomingFollowUp.descripcion}</p>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-rose-500 font-bold bg-white/60 py-1.5 px-3 rounded-lg border border-[#ffd0d9] w-fit">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {new Date(upcomingFollowUp.fechaVencimiento).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })} a las{" "}
                    {new Date(upcomingFollowUp.fechaVencimiento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-rose-600">No hay llamadas o tareas programadas de seguimiento.</p>
                <button 
                  onClick={() => setIsFollowUpModalOpen(true)}
                  className="bg-white text-rose-500 hover:bg-rose-50 text-xs font-bold px-3 py-1.5 rounded-lg border border-[#ffd0d9] transition-all w-fit block"
                >
                  Programar ahora
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* CREATE FOLLOWUP MODAL */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-[#e2edf6] transform transition-all">
            <div className="bg-[#e8f4fd] px-6 py-4 flex items-center justify-between border-b border-[#d4e6f4]">
              <h3 className="font-extrabold text-[#026692] text-sm uppercase tracking-wider">Agendar Cita / Llamada</h3>
              <button onClick={() => setIsFollowUpModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <Plus className="w-5 h-5 transform rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateFollowUp} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Título de la actividad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Llamada de Calificación, Visita guiada"
                  value={followUpTitle}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha y Hora de vencimiento *</label>
                <input
                  type="datetime-local"
                  required
                  value={followUpDue}
                  onChange={(e) => setFollowUpDue(e.target.value)}
                  className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Descripción adicional</label>
                <textarea
                  placeholder="Instrucciones adicionales para el agente..."
                  value={followUpDesc}
                  onChange={(e) => setFollowUpDesc(e.target.value)}
                  className="w-full bg-[#f4f8fc] border-0 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none resize-none"
                  rows={3}
                />
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFollowUpModalOpen(false)}
                  className="bg-[#f4f8fc] text-slate-600 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#026692] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1d4359]"
                >
                  Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE QUOTE MODAL */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-[#e2edf6] transform transition-all">
            <div className="bg-[#e8f4fd] px-6 py-4 flex items-center justify-between border-b border-[#d4e6f4]">
              <h3 className="font-extrabold text-[#026692] text-sm uppercase tracking-wider">Generar Cotización Comercial</h3>
              <button onClick={() => setIsQuoteModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <Plus className="w-5 h-5 transform rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateQuote} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipo de servicio</label>
                  <select
                    value={quoteForm.tipoServicio}
                    onChange={(e) => setQuoteForm({ ...quoteForm, tipoServicio: e.target.value })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none"
                  >
                    <option value="Cuidado Premium Medio Tiempo">Cuidado Premium Medio Tiempo</option>
                    <option value="FIXA SEMANAL">FIXA SEMANAL</option>
                    <option value="NANNY EVENTUAL">Nanny Eventual</option>
                    <option value="FIXA NOCTURNA">FIXA NOCTURNA</option>
                    <option value="FIXA INTERNA">FIXA INTERNA</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Horas por día</label>
                  <select
                    value={quoteForm.horasPorDia}
                    onChange={(e) => setQuoteForm({ ...quoteForm, horasPorDia: Number(e.target.value) })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none"
                  >
                    <option value={4}>4 horas (Medio Tiempo)</option>
                    <option value={6}>6 horas</option>
                    <option value={8}>8 horas (Tiempo Completo)</option>
                    <option value={10}>10 horas</option>
                    <option value={12}>12 horas</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Número de niños</label>
                  <select
                    value={quoteForm.cantidadHijos}
                    onChange={(e) => setQuoteForm({ ...quoteForm, cantidadHijos: Number(e.target.value) })}
                    className="w-full bg-[#f4f8fc] border-0 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#026692] outline-none"
                  >
                    <option value={1}>1 niño</option>
                    <option value={2}>2 niños</option>
                    <option value={3}>3 niños</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1 bg-[#f4f8fc] p-4 rounded-2xl border border-[#e8f2fa] mt-2">
                  <div className="flex justify-between text-xs text-slate-500 font-bold">
                    <span>Subtotal Estimado:</span>
                    <span>${quoteForm.subtotal.toLocaleString()} MXN</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 font-bold pt-2">
                    <span>Descuento Comercial:</span>
                    <input 
                      type="number"
                      value={quoteForm.descuento}
                      onChange={(e) => setQuoteForm({ ...quoteForm, descuento: Number(e.target.value) })}
                      className="w-20 bg-white border border-[#d4e6f4] rounded-lg px-2 py-0.5 text-right font-bold text-slate-700 focus:ring-2 focus:ring-[#026692] outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-[#026692] font-extrabold pt-2 border-t border-[#d4e6f4] mt-2">
                    <span>Total de Cotización:</span>
                    <span>${quoteForm.total.toLocaleString()} MXN</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="bg-[#f4f8fc] text-slate-600 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#026692] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1d4359]"
                >
                  Generar y Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
