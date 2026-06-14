"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Bot, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  X,
  FileText,
  Send,
  Smile,
  Paperclip,
  ArrowRight,
  TrendingUp,
  User,
  AlertTriangle,
  UserCheck,
  Briefcase,
  DollarSign,
  Save,
  HelpCircle,
  MoreVertical,
  Check
} from "lucide-react";
import confetti from "canvas-confetti";

interface Hijo {
  id: string;
  idLead?: string;
  idCliente?: string;
  nombre: string;
  textoEdad: string;
  necesidades?: string;
  instrucciones?: string;
}

interface NotaLead {
  id: string;
  idLead: string;
  contenido: string;
  nombreAgente: string;
  creadoEn: string;
}

interface Seguimiento {
  id: string;
  idLead: string;
  idUsuarioAsignado?: string;
  titulo: string;
  descripcion?: string;
  fechaVencimiento: string;
  estado: string;
}

interface Cotizacion {
  id: string;
  idLead: string;
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
  hijos?: Hijo[];
  notas?: NotaLead[];
  seguimientos?: Seguimiento[];
  cotizaciones?: Cotizacion[];
}

interface Message {
  id: string;
  idConversacion: string;
  direccion: 'INBOUND' | 'OUTBOUND';
  tipoRemitente: 'CLIENT' | 'AGENT' | 'IA';
  idRemitente?: string;
  contenido: string;
  creadoEn: string;
}

interface Conversation {
  id: string;
  idLead?: string;
  telefono: string;
  estado: string;
  iaActiva: boolean;
  ultimoMensajeEn: string;
}

export default function KanbanPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Scopes & Filters
  const [selectedCity, setSelectedCity] = useState("TODAS");
  const [searchTerm, setSearchTerm] = useState("");
  const agentCity = "Multiciudad"; // Scope dinámico del CRM

  // Drag states
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<string | null>(null);

  // Drawer Overlay states
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("general");
  
  // Drawer Chat States
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [clientSimInput, setClientSimInput] = useState("");
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);
  
  // Drawer note form
  const [newNoteText, setNewNoteText] = useState("");

  // Drawer Quote builder
  const [quoteBuilderOpen, setQuoteBuilderOpen] = useState(false);
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

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Carga inicial y sincronización de cookies de ciudad
  useEffect(() => {
    fetchLeadsAndConversations();
    
    // Obtener la cookie activeCity para sincronizar la UI del Kanban con el menú lateral
    const activeCityCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("activeCity="))
      ?.split("=")[1];

    if (activeCityCookie) {
      const decoded = decodeURIComponent(activeCityCookie);
      // Mapear Querétaro sin tilde al valor con tilde para coincidencia visual
      const finalCity = decoded === "Queretaro" ? "Querétaro" : decoded;
      setSelectedCity(finalCity === "Todas" ? "TODAS" : finalCity);
    } else {
      setSelectedCity("TODAS");
    }
  }, []);

  // Poll chat messages in Drawer if open
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (drawerOpen && activeConv) {
      fetchMessages(activeConv.id);
      interval = setInterval(() => {
        fetchMessages(activeConv.id);
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [drawerOpen, activeConv]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Sync quote builder calculations
  useEffect(() => {
    const hours = quoteForm.horasPorDia;
    const children = quoteForm.cantidadHijos;
    const baseRate = 150; // $150 MXN per hour
    const subtotal = hours * 5 * 4 * children * baseRate; // 5 days a week, 4 weeks
    setQuoteForm(q => ({
      ...q,
      subtotal,
      total: subtotal - q.descuento
    }));
  }, [quoteForm.horasPorDia, quoteForm.cantidadHijos, quoteForm.descuento]);

  const fetchLeadsAndConversations = async () => {
    try {
      const [leadsRes, convsRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/conversations")
      ]);
      
      if (leadsRes.ok && convsRes.ok) {
        const [leadsData, convsData] = await Promise.all([
          leadsRes.json(),
          convsRes.json()
        ]);
        setLeads(leadsData);
        setConversations(convsData);
      }
    } catch (err) {
      console.error("Error loading board data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newStatus }),
      });
      if (res.ok) {
        // Refresh local state
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado: newStatus } : l));
        
        // If won, fire confetti
        if (newStatus === "GANADO") {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    setActiveDropCol(colName);
  };

  const handleDragLeave = () => {
    setActiveDropCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setActiveDropCol(null);
    const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId;
    if (!leadId) return;

    setDraggedLeadId(null);
    await handleUpdateLeadStatus(leadId, targetStatus);
  };

  // Drawer interactions
  const handleCardClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerTab("general");
    
    // Find linked conversation
    const conv = conversations.find(c => c.idLead === lead.id);
    if (conv) {
      setActiveConv(conv);
      fetchMessages(conv.id);
    } else {
      setActiveConv(null);
      setChatMessages([]);
    }

    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedLead(null);
    setActiveConv(null);
    setChatMessages([]);
    // Refresh board to fetch any updates from drawer actions
    fetchLeadsAndConversations();
  };

  // Send message as Agent
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeConv) return;
    const text = chatInput;
    setChatInput("");
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direccion: "OUTBOUND",
          tipoRemitente: "AGENT",
          idRemitente: "agent-laura",
          contenido: text
        }),
      });
      if (res.ok) {
        fetchMessages(activeConv.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Simulate client message
  const handleSimulateClient = async (text: string) => {
    if (!activeConv) return;
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direccion: "INBOUND",
          tipoRemitente: "CLIENT",
          contenido: text
        }),
      });
      if (res.ok) {
        fetchMessages(activeConv.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle AI inside Drawer
  const handleToggleAI = async () => {
    if (!activeConv) return;
    const updatedVal = !activeConv.iaActiva;
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iaActiva: updatedVal }),
      });
      if (res.ok) {
        setActiveConv({ ...activeConv, iaActiva: updatedVal });
        // Sincronizar listado de conversaciones
        setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, iaActiva: updatedVal } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save internal note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedLead) return;
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: newNoteText, nombreAgente: "Laura Méndez" }),
      });
      if (res.ok) {
        setNewNoteText("");
        // Reload details
        const updatedRes = await fetch(`/api/leads/${selectedLead.id}`);
        if (updatedRes.ok) {
          const updatedLead = await updatedRes.json();
          setSelectedLead(updatedLead);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate Quote
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/quotes`, {
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
        setQuoteBuilderOpen(false);
        // Reload details & status to COTIZADO
        const updatedRes = await fetch(`/api/leads/${selectedLead.id}`);
        if (updatedRes.ok) {
          const updatedLead = await updatedRes.json();
          setSelectedLead(updatedLead);
        }
        confetti({
          particleCount: 80,
          spread: 60
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCityChange = (val: string) => {
    setSelectedCity(val);
    // Guardar la cookie activeCity y sincronizar el menú lateral
    const cookieVal = val === "TODAS" ? "Todas" : (val === "Querétaro" ? "Queretaro" : val);
    document.cookie = `activeCity=${cookieVal}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
    router.refresh();
  };

  // Scoped lists of filtered leads according to business rules
  const getLeadsByStatus = (status: string) => {
    return leads.filter(l => {
      const matchesSearch = l.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) || l.telefono.includes(searchTerm);
      if (!matchesSearch) return false;

      // 1. PENDIENTE (NUEVO): Todos los que escribieron pero aún no sabemos de qué ciudad son
      // Se muestran todos los que no tienen ciudad definida ("Por definir" o vacía), sin importar la ciudad seleccionada.
      if (status === "NUEVO") {
        const isPendiente = l.ciudad === "Por definir" || l.ciudad === "" || !l.ciudad;
        return l.estado === "NUEVO" && isPendiente;
      }

      // Para el resto de estados, deben tener una ciudad asignada y coincidir con el filtro
      const hasCity = l.ciudad && l.ciudad !== "Por definir" && l.ciudad !== "";
      if (!hasCity) return false;

      const normSelected = selectedCity.toUpperCase();
      const normLead = l.ciudad.toUpperCase();

      const matchesCity = normSelected === "TODAS" || 
        normLead === normSelected ||
        (normSelected === "QUERÉTARO" && normLead === "QUERETARO") ||
        (normSelected === "QUERETARO" && normLead === "QUERÉTARO");

      return l.estado === status && matchesCity;
    });
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      
      {/* Top Banner and Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-[#026692]">Embudo de Ventas (Kanban)</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestiona el ciclo de vida de los leads. Filtra por ciudad y arrastra las fichas comerciales.
          </p>
        </div>

        {/* City Filter & Scope Indicator */}
        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-2xl border border-[#e2edf6] shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
            <span>Tu Rol:</span>
            <span className="bg-sky-50 text-[#026692] px-2.5 py-1 rounded-full uppercase tracking-wider text-[10px]">
              {agentCity}
            </span>
          </div>
          <div className="h-5 w-px bg-slate-200"></div>
          <select
            value={selectedCity}
            onChange={(e) => handleCityChange(e.target.value)}
            className="border-0 bg-transparent text-sm font-extrabold text-slate-700 focus:outline-none focus:ring-0 cursor-pointer"
          >
            <option value="TODAS">Ver Todas las Ciudades</option>
            <option value="CDMX">CDMX</option>
            <option value="Puebla">Puebla</option>
            <option value="Querétaro">Querétaro</option>
            <option value="Xalapa">Xalapa</option>
          </select>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative w-80 flex-shrink-0">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </span>
        <input 
          type="text" 
          placeholder="Buscar prospecto por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-[#e2edf6] rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] shadow-sm"
        />
      </div>

      {/* Kanban Board Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6 min-h-0 overflow-hidden">
        
        {/* COLUMN 1: PENDIENTES */}
        <div 
          onDragOver={(e) => handleDragOver(e, "NUEVO")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "NUEVO")}
          className={`rounded-3xl p-4 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200 ${
            activeDropCol === "NUEVO" ? "bg-sky-50 border-2 border-dashed border-[#026692]/40" : "bg-[#f8fbfe] border border-[#e2edf6]"
          }`}
        >
          {/* Column Header */}
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="font-extrabold text-[#026692] text-sm uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Pendientes
            </h3>
            <span className="bg-sky-100 text-[#026692] text-xs font-bold px-2 py-0.5 rounded-full">
              {getLeadsByStatus("NUEVO").length}
            </span>
          </div>

          {/* Cards Container */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[150px]">
            {getLeadsByStatus("NUEVO").map((lead) => (
              <div 
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onClick={() => handleCardClick(lead)}
                className="bg-white p-4 rounded-2xl border border-[#e2edf6] shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-[#026692]/30 transition-all space-y-3 group"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-[#026692] transition-colors">{lead.nombreCompleto}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{lead.ciudad.split(' ')[0]}</span>
                </div>
                
                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  {lead.resumenIA || "Nuevo lead de WhatsApp esperando primer contacto."}
                </p>

                <div className="flex justify-between items-center text-[10px] pt-1">
                  <span className="text-slate-400 font-bold uppercase">{lead.origen}</span>
                  <span className="text-[#026692] font-semibold bg-[#e1eff8] px-2 py-0.5 rounded-md">{lead.telefono}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: EN CONVERSACIÓN */}
        <div 
          onDragOver={(e) => handleDragOver(e, "CONTACTADO")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "CONTACTADO")}
          className={`rounded-3xl p-4 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200 ${
            activeDropCol === "CONTACTADO" ? "bg-amber-50/70 border-2 border-dashed border-amber-500/40" : "bg-[#fdfbf7] border border-[#f5ece0]"
          }`}
        >
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="font-extrabold text-amber-700 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span> En conversación
            </h3>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {getLeadsByStatus("CONTACTADO").length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[150px]">
            {getLeadsByStatus("CONTACTADO").map((lead) => (
              <div 
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onClick={() => handleCardClick(lead)}
                className="bg-white p-4 rounded-2xl border border-[#e2edf6] shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-amber-500/30 transition-all space-y-3 group"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-amber-700 transition-colors">{lead.nombreCompleto}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{lead.ciudad.split(' ')[0]}</span>
                </div>
                
                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  {lead.resumenIA || "IA recopilando información sobre niños y horarios."}
                </p>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-0.5 border border-emerald-100">
                    <Bot className="w-3.5 h-3.5" /> IA ACTIVA
                  </span>
                  <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md text-[10px]">{lead.telefono}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 3: EN COTIZACIÓN */}
        <div 
          onDragOver={(e) => handleDragOver(e, "COTIZADO")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "COTIZADO")}
          className={`rounded-3xl p-4 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200 ${
            activeDropCol === "COTIZADO" ? "bg-blue-50 border-2 border-dashed border-blue-500/40" : "bg-[#f6faff] border border-[#e2edf6]"
          }`}
        >
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="font-extrabold text-blue-700 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> En cotización
            </h3>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {getLeadsByStatus("COTIZADO").length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[150px]">
            {getLeadsByStatus("COTIZADO").map((lead) => (
              <div 
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onClick={() => handleCardClick(lead)}
                className="bg-white p-4 rounded-2xl border border-[#e2edf6] shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-blue-500/30 transition-all space-y-3 group"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{lead.nombreCompleto}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{lead.ciudad.split(' ')[0]}</span>
                </div>
                
                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  Presupuesto enviado. Esperando respuesta para concretar condiciones.
                </p>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 border border-blue-100">
                    <FileText className="w-3.5 h-3.5" /> Cotizado
                  </span>
                  <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md text-[10px]">{lead.telefono}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 4: LISTOS PARA EL CIERRE */}
        <div 
          onDragOver={(e) => handleDragOver(e, "GANADO")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "GANADO")}
          className={`rounded-3xl p-4 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200 ${
            activeDropCol === "GANADO" ? "bg-emerald-50 border-2 border-dashed border-emerald-500/40" : "bg-[#f5fbf8] border border-[#e2f3eb]"
          }`}
        >
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="font-extrabold text-emerald-700 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Listos para el Cierre
            </h3>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {getLeadsByStatus("GANADO").length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[150px]">
            {getLeadsByStatus("GANADO").map((lead) => (
              <div 
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onClick={() => handleCardClick(lead)}
                className="bg-white p-4 rounded-2xl border border-[#e2edf6] shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-emerald-500/30 transition-all space-y-3 group"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">{lead.nombreCompleto}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{lead.ciudad.split(' ')[0]}</span>
                </div>
                
                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  Cotización aprobada. Buscando asignación de niñera para el servicio.
                </p>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-0.5 border border-emerald-100">
                    <CheckCircle className="w-3.5 h-3.5" /> Ganado
                  </span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[10px]">{lead.telefono}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 5: ATENCIÓN HUMANA */}
        <div 
          onDragOver={(e) => handleDragOver(e, "ATENCION_HUMANA")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "ATENCION_HUMANA")}
          className={`rounded-3xl p-4 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200 ${
            activeDropCol === "ATENCION_HUMANA" ? "bg-indigo-50 border-2 border-dashed border-indigo-500/40" : "bg-[#faf9fe] border border-[#ebe7f5]"
          }`}
        >
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="font-extrabold text-indigo-700 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Atención Humana
            </h3>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {getLeadsByStatus("ATENCION_HUMANA").length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[150px]">
            {getLeadsByStatus("ATENCION_HUMANA").map((lead) => (
              <div 
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onClick={() => handleCardClick(lead)}
                className="bg-white p-4 rounded-2xl border border-[#e2edf6] shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-indigo-500/30 transition-all space-y-3 group"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{lead.nombreCompleto}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{lead.ciudad.split(' ')[0]}</span>
                </div>
                
                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  {lead.resumenIA || "Requiere intervención manual o resolución de dudas complejas."}
                </p>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-0.5 border border-indigo-100">
                    <User className="w-3.5 h-3.5" /> SOPORTE MANUAL
                  </span>
                  <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md text-[10px]">{lead.telefono}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* DRAWER SIDEBAR OVERLAY WITH REALTIME CHAT */}
      {drawerOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          
          {/* Close drawer backdrop area */}
          <div className="flex-1" onClick={handleCloseDrawer}></div>

          {/* Sliding Content Container */}
          <div className="w-[85%] max-w-6xl bg-[#f4f8fc] h-full flex flex-col shadow-2xl border-l border-[#e2edf6] transform transition-transform duration-300 animate-slide-in relative">
            
            {/* Header of Drawer */}
            <div className="h-16 bg-white border-b border-[#e2edf6] px-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#026692] text-white font-extrabold rounded-full flex items-center justify-center text-lg shadow-sm">
                  {selectedLead.nombreCompleto.split(' ').map(n=>n[0]).join('').slice(0,2)}
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-800 text-base">{selectedLead.nombreCompleto}</h2>
                  <p className="text-slate-400 text-xs">{selectedLead.ciudad} • {selectedLead.telefono}</p>
                </div>
              </div>
              <button 
                onClick={handleCloseDrawer}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inner Grid content */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              
              {/* SECTION A: Expediente Lead (Left Side - 30% width) */}
              <div className="w-80 border-r border-[#e2edf6] bg-white flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-6 flex-shrink-0">
                {/* Tab selector */}
                <div className="flex border-b border-slate-100 pb-2 space-x-3">
                  <button 
                    onClick={() => setDrawerTab("general")}
                    className={`text-xs font-bold uppercase pb-1.5 border-b-2 transition-all ${
                      drawerTab === "general" ? "border-[#026692] text-[#026692]" : "border-transparent text-slate-400"
                    }`}
                  >
                    Detalles
                  </button>
                  <button 
                    onClick={() => setDrawerTab("peques")}
                    className={`text-xs font-bold uppercase pb-1.5 border-b-2 transition-all ${
                      drawerTab === "peques" ? "border-[#026692] text-[#026692]" : "border-transparent text-slate-400"
                    }`}
                  >
                    Niños ({selectedLead.hijos?.length || 0})
                  </button>
                  <button 
                    onClick={() => setDrawerTab("notes")}
                    className={`text-xs font-bold uppercase pb-1.5 border-b-2 transition-all ${
                      drawerTab === "notes" ? "border-[#026692] text-[#026692]" : "border-transparent text-slate-400"
                    }`}
                  >
                    Notas
                  </button>
                </div>

                {/* Tab Content Rendering */}
                {drawerTab === "general" && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-1">Servicio Interés</span>
                      <span className="font-semibold text-slate-700 block bg-[#f4f8fc] p-3 rounded-xl border border-[#e8f2fa]">
                        {selectedLead.interesServicio}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-1">Zona</span>
                        <span className="font-bold text-slate-700">{selectedLead.zona}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-1">Ciudad</span>
                        <span className="font-bold text-slate-700">{selectedLead.ciudad}</span>
                      </div>
                    </div>
                    {selectedLead.resumenIA && (
                      <div className="space-y-1 bg-sky-50/50 p-4 rounded-xl border border-sky-100 mt-2">
                        <span className="text-[#026692] font-extrabold uppercase text-[9px] tracking-wide block">Intención Comercial (IA)</span>
                        <p className="text-slate-600 leading-relaxed italic">"{selectedLead.resumenIA}"</p>
                      </div>
                    )}
                    {selectedLead.datosFaltantes && selectedLead.datosFaltantes.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-rose-500 font-extrabold uppercase text-[9px] tracking-wide block">Datos por recopilar:</span>
                        <ul className="space-y-1.5 pl-3 list-disc text-slate-600">
                          {selectedLead.datosFaltantes.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {drawerTab === "peques" && (
                  <div className="space-y-4">
                    {selectedLead.hijos && selectedLead.hijos.length > 0 ? (
                      selectedLead.hijos.map((child) => (
                        <div key={child.id} className="bg-[#f4f8fc] p-4 rounded-xl border border-[#e8f2fa] space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <h4 className="font-extrabold text-slate-700">👶 {child.nombre}</h4>
                            <span className="bg-[#026692] text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                              {child.textoEdad}
                            </span>
                          </div>
                          {child.necesidades && <p className="text-slate-500 font-medium">Requerimiento: {child.necesidades}</p>}
                          {child.instrucciones && (
                            <div className="bg-amber-50 p-2.5 rounded border border-amber-100 text-amber-800 text-[11px] font-semibold mt-1.5">
                              ⚠️ {child.instrucciones}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">No hay perfiles de peques.</p>
                    )}
                  </div>
                )}

                {drawerTab === "notes" && (
                  <div className="space-y-4 text-xs">
                    {/* Notes List */}
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {selectedLead.notas && selectedLead.notas.length > 0 ? (
                        selectedLead.notas.map((n) => (
                          <div key={n.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold block mb-1">✍️ {n.nombreAgente}</span>
                            <p className="text-slate-600 font-medium italic">"{n.contenido}"</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 text-center py-2">Sin notas guardadas.</p>
                      )}
                    </div>
                    
                    {/* Notes form */}
                    <form onSubmit={handleSaveNote} className="space-y-2 pt-2 border-t border-slate-100">
                      <textarea
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Escribe una nota interna..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none resize-none"
                        rows={2}
                      />
                      <button 
                        type="submit" 
                        disabled={!newNoteText.trim()}
                        className="w-full bg-[#f4f8fc] hover:bg-[#026692] text-[#026692] hover:text-white disabled:opacity-50 py-2 rounded-xl text-xs font-bold transition-all border border-[#c3dfef] hover:border-transparent flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" /> Guardar Nota
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* SECTION B: Real-Time Chat Column (Middle - Flexible width) */}
              <div className="flex-1 flex flex-col h-full bg-[#f4f8fc]">
                
                {/* Chat Column Header bar */}
                <div className="h-12 bg-white border-b border-[#e2edf6] px-6 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
                  <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> WhatsApp Multiagente
                  </span>
                  
                  {/* AI switch inside drawer */}
                  {activeConv && (
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-slate-500">Asistente IA</span>
                      <button 
                        onClick={handleToggleAI}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          activeConv.iaActiva ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <span 
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            activeConv.iaActiva ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className={`text-[9px] font-extrabold uppercase ${activeConv.iaActiva ? "text-emerald-500" : "text-slate-400"}`}>
                        {activeConv.iaActiva ? "ON" : "OFF"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message Stream area */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-8">Cargando conversación de WhatsApp...</p>
                  ) : chatMessages.map((msg) => {
                    const isClient = msg.direccion === "INBOUND";
                    const isIA = msg.tipoRemitente === "IA";
                    
                    return (
                      <div key={msg.id} className={`flex ${isClient ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm relative ${
                          isClient 
                            ? "bg-[#e1eff8] text-slate-800 rounded-tl-none border border-[#cbdfe9]" 
                            : isIA 
                              ? "bg-[#026692] text-white rounded-tr-none shadow-md" 
                              : "bg-white text-slate-800 rounded-tr-none border border-[#e2edf6]"
                        }`}>
                          {isIA && (
                            <span className="text-[8px] font-extrabold uppercase tracking-widest text-sky-200 flex items-center gap-1 mb-1.5">
                              <Sparkles className="w-3 h-3" /> Respuesta IA
                            </span>
                          )}
                          <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
                          <div className={`text-[8px] font-bold text-right mt-1.5 ${
                            isClient ? "text-slate-400" : isIA ? "text-sky-200" : "text-slate-400"
                          }`}>
                            {new Date(msg.creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {!isClient && <span className="ml-1">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Form panel */}
                <div className="p-4 bg-white border-t border-[#e2edf6] flex-shrink-0 z-10">
                  {/* Suggestions bar */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    <button 
                      onClick={() => setChatInput("Nuestras tarifas para medio tiempo son de $450 USD mensuales. ¿Te acomoda?")}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-[#e1eff8] text-[#026692] border border-slate-200 hover:border-transparent rounded-full text-[10px] font-bold transition-all"
                    >
                      Tarifas bilingües
                    </button>
                    <button 
                      onClick={() => setChatInput("Con gusto agendamos una llamada de 10 minutos para definir los detalles de cuidado.")}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-[#e1eff8] text-[#026692] border border-slate-200 hover:border-transparent rounded-full text-[10px] font-bold transition-all"
                    >
                      Agendar Llamada
                    </button>
                  </div>

                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2 bg-[#f0f7fc] border border-[#d4e6f4] rounded-2xl px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Escribe como agente..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-transparent border-0 outline-none text-xs text-slate-800"
                    />
                    <button 
                      type="submit" 
                      disabled={!chatInput.trim()}
                      className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white flex items-center justify-center transition-all flex-shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </form>
                </div>

              </div>

              {/* SECTION C: Pipeline Actions Column (Right Side - 250px width) */}
              <div className="w-64 border-l border-[#e2edf6] bg-white flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-6 flex-shrink-0 justify-between">
                
                {/* Pipeline action buttons */}
                <div className="space-y-4">
                  <h4 className="font-extrabold text-[#026692] uppercase tracking-wider text-[10px] border-b border-slate-100 pb-2">Acciones Comerciales</h4>
                  
                  {/* Quote action trigger */}
                  <button 
                    onClick={() => {
                      setQuoteForm(q => ({ ...q, ciudad: selectedLead.ciudad, tipoServicio: selectedLead.interesServicio }));
                      setQuoteBuilderOpen(true);
                    }}
                    className="w-full bg-[#f4f8fc] hover:bg-[#e8f4fd] border border-[#e2edf6] text-[#026692] py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-slate-400" /> Crear Cotización
                  </button>

                  {/* Close Won trigger */}
                  {selectedLead.estado !== "ATENCION_HUMANA" && selectedLead.estado !== "GANADO" && (
                    <button 
                      onClick={() => handleUpdateLeadStatus(selectedLead.id, "ATENCION_HUMANA")}
                      className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="w-4 h-4 text-indigo-500" /> Derivar a Atención Humana
                    </button>
                  )}

                  {selectedLead.estado === "ATENCION_HUMANA" && (
                    <button 
                      onClick={() => handleUpdateLeadStatus(selectedLead.id, "CONTACTADO")}
                      className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Bot className="w-4 h-4 text-amber-500" /> Devolver a Conversación (IA)
                    </button>
                  )}

                  {selectedLead.estado !== "GANADO" ? (
                    <button 
                      onClick={() => handleUpdateLeadStatus(selectedLead.id, "GANADO")}
                      className="w-full bg-[#026692] hover:bg-[#1d4359] text-white py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      ✓ Cerrar Ganado
                    </button>
                  ) : (
                    <div className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Cliente Ganado
                    </div>
                  )}

                  {selectedLead.estado !== "PERDIDO" && (
                    <button 
                      onClick={() => handleUpdateLeadStatus(selectedLead.id, "PERDIDO")}
                      className="w-full text-slate-400 hover:text-rose-500 py-2 text-xs font-bold text-center transition-all block"
                    >
                      Mover a Perdidos
                    </button>
                  )}
                </div>

                {/* Simulated message triggers for testing the AI */}
                <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl space-y-2.5">
                  <span className="text-[9px] uppercase font-bold text-amber-700 block tracking-wide">Simulador de Cliente</span>
                  <button 
                    onClick={() => handleSimulateClient("Suena bien. ¿Qué incluye el programa?")}
                    className="w-full text-left text-[9px] bg-white hover:bg-amber-50 text-amber-800 p-2 rounded-xl border border-amber-200 font-bold flex items-center justify-between transition-all"
                  >
                    <span>Preguntar: ¿Qué incluye?</span>
                    <ArrowRight className="w-2.5 h-2.5 text-amber-500" />
                  </button>
                  <button 
                    onClick={() => handleSimulateClient("¿Cuál es el costo por mes?")}
                    className="w-full text-left text-[9px] bg-white hover:bg-amber-50 text-amber-800 p-2 rounded-xl border border-amber-200 font-bold flex items-center justify-between transition-all"
                  >
                    <span>Preguntar: Tarifas</span>
                    <ArrowRight className="w-2.5 h-2.5 text-amber-500" />
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* DRAWER MODAL FOR QUOTE BUILDER */}
      {quoteBuilderOpen && selectedLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-[#e2edf6]">
            <div className="bg-[#e8f4fd] px-6 py-4 flex items-center justify-between border-b border-[#d4e6f4]">
              <h3 className="font-extrabold text-[#026692] text-sm uppercase tracking-wider">Generar Cotización</h3>
              <button 
                onClick={() => setQuoteBuilderOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
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
                  <label className="text-xs font-bold text-slate-500 uppercase">Niños</label>
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

                <div className="col-span-2 space-y-1 bg-[#f4f8fc] p-4 rounded-2xl border border-[#e8f2fa]">
                  <div className="flex justify-between text-xs text-slate-500 font-bold">
                    <span>Subtotal:</span>
                    <span>${quoteForm.subtotal.toLocaleString()} MXN</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 font-bold pt-2">
                    <span>Descuento:</span>
                    <input 
                      type="number"
                      value={quoteForm.descuento}
                      onChange={(e) => setQuoteForm({ ...quoteForm, descuento: Number(e.target.value) })}
                      className="w-20 bg-white border border-[#d4e6f4] rounded-lg px-2 py-0.5 text-right font-bold text-slate-700 outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-[#026692] font-extrabold pt-2 border-t border-[#d4e6f4] mt-2">
                    <span>Total Final:</span>
                    <span>${quoteForm.total.toLocaleString()} MXN</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button" 
                  onClick={() => setQuoteBuilderOpen(false)}
                  className="bg-[#f4f8fc] text-slate-600 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-[#026692] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1d4359]"
                >
                  Confirmar y Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
