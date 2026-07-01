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
  MessageSquare,
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
import FormattedIntencionComercial from "@/components/FormattedIntencionComercial";
import { renderNoteContent } from "@/lib/narrative";
import confetti from "canvas-confetti";

interface Hijo {
  id: string;
  idLead?: string;
  idCliente?: string;
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
  const [savingNote, setSavingNote] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Emojis and files
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleEmojiClick = (emoji: string) => {
    setChatInput(prev => prev + emoji);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Archivo "${file.name}" seleccionado.`);
    }
  };

  const EMOJIS = ["😀", "😊", "😍", "👍", "🙌", "❤️", "✨", "👋", "👶", "👩", "📅", "⏰", "📍", "💲"];

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
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledForActiveConvRef = useRef<boolean>(false);

  // Carga inicial y sincronización de cookies de ciudad
  useEffect(() => {
    fetchLeadsAndConversations();

    // Fetch logged in user details for agent notes audit
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error("Error loading current user:", err));

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

  // Poll leads and conversations every 3 seconds to keep Kanban board up to date, unless dragging a card
  useEffect(() => {
    if (draggedLeadId !== null) return;

    const interval = setInterval(() => {
      fetchLeadsAndConversations();
    }, 3000);

    return () => clearInterval(interval);
  }, [draggedLeadId]);

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

  // Reset scroll ref and clear old messages when active conversation changes
  useEffect(() => {
    hasScrolledForActiveConvRef.current = false;
    setChatMessages([]);
  }, [activeConv?.id]);

  // Scroll chat to bottom
  useEffect(() => {
    if (!chatEndRef.current || !chatContainerRef.current) return;
    
    const container = chatContainerRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    
    if (!hasScrolledForActiveConvRef.current) {
      if (chatMessages.length > 0) {
        chatEndRef.current.scrollIntoView({ behavior: "auto" });
        hasScrolledForActiveConvRef.current = true;
      }
    } else if (isAtBottom) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
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

        // Sincronizar selectedLead si el drawer está abierto
        setSelectedLead(current => {
          if (current) {
            const freshLead = leadsData.find((l: any) => l.id === current.id);
            return freshLead || current;
          }
          return current;
        });

        // Sincronizar activeConv si el drawer está abierto
        setActiveConv(current => {
          if (current) {
            const freshConv = convsData.find((c: any) => c.id === current.id);
            return freshConv || current;
          }
          return current;
        });
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
        setChatMessages(prev => {
          if (
            prev.length === data.length &&
            prev.every((msg, idx) => msg.id === data[idx].id && msg.contenido === data[idx].contenido)
          ) {
            return prev;
          }
          return data;
        });
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
    if (colName === "NUEVO") return; // block dragover for PENDIENTES
    e.preventDefault();
    setActiveDropCol(colName);
  };

  const handleDragLeave = () => {
    setActiveDropCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setActiveDropCol(null);
    if (targetStatus === "NUEVO") return; // block drops into PENDIENTES
    
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
    setSavingNote(true);
    try {
      const agentName = currentUser?.nombre || "Asesor de ventas";
      const res = await fetch(`/api/leads/${selectedLead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: newNoteText, nombreAgente: agentName }),
      });
      if (res.ok) {
        setNewNoteText("");
        // Reload details
        const updatedRes = await fetch(`/api/leads/${selectedLead.id}`);
        if (updatedRes.ok) {
          const updatedLead = await updatedRes.json();
          setSelectedLead(updatedLead);
        }
        // Also refresh board to update notes list/status
        fetchLeadsAndConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
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

      if (status === "COTIZADO") {
        const hasQuotes = l.cotizaciones && l.cotizaciones.length > 0;
        const isActuallyCotizado = l.estado === "COTIZADO" || (hasQuotes && l.estado !== "GANADO" && l.estado !== "PERDIDO");
        return isActuallyCotizado && matchesCity;
      }

      if (status === "CONTACTADO") {
        const hasQuotes = l.cotizaciones && l.cotizaciones.length > 0;
        const isActuallyContactado = l.estado === "CONTACTADO" && !hasQuotes;
        return isActuallyContactado && matchesCity;
      }

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
                draggable={false}
                onClick={() => handleCardClick(lead)}
                className="bg-white p-4 rounded-2xl border border-[#e2edf6] shadow-sm hover:shadow-md cursor-pointer hover:border-[#026692]/30 transition-all space-y-3 group"
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
            <div className="h-16 bg-white border-b border-[#e2edf6] px-6 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#026692] text-white font-extrabold rounded-full flex items-center justify-center text-lg shadow-sm">
                  {selectedLead.nombreCompleto.split(' ').map(n=>n[0]).join('').slice(0,2)}
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-800 text-sm leading-tight">{selectedLead.nombreCompleto}</h2>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> En línea
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* AI toggler */}
                {activeConv && (
                  <div className="flex items-center space-x-2 bg-[#f4f8fc] px-3 py-1.5 rounded-xl border border-[#e8f2fa]">
                    <span className="text-xs font-bold text-slate-500">Asistente IA</span>
                    <button 
                      type="button"
                      onClick={handleToggleAI}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        activeConv.iaActiva ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span 
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          activeConv.iaActiva ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className={`text-[10px] font-extrabold uppercase ${activeConv.iaActiva ? "text-emerald-500" : "text-slate-400"}`}>
                      {activeConv.iaActiva ? "Activo" : "Pausado"}
                    </span>
                  </div>
                )}
                
                <button 
                  onClick={handleCloseDrawer}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Inner Grid content */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              
              {/* COLUMN 1 (Center): Real-Time Chat Column (Middle - Flexible width) */}
              <div className="flex-1 flex flex-col h-full bg-[#f4f8fc]">
                
                {/* Message Stream area */}
                <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
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
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
                          <span className={`text-[8px] block mt-1.5 text-right ${isIA || !isClient ? "text-sky-100" : "text-slate-400"}`}>
                            {new Date(msg.creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick replies bar if open */}
                {isQuickRepliesOpen && (
                  <div className="p-4 bg-white border-t border-[#e2edf6] flex flex-wrap gap-2 z-10 shadow-lg">
                    <button 
                      onClick={() => {
                        setChatInput("¡Hola! Me comunico de Nannys y Peques. Con gusto te ayudamos con tu solicitud.");
                        setIsQuickRepliesOpen(false);
                      }}
                      className="px-3 py-1.5 bg-[#f4f8fc] border border-[#e2edf6] rounded-xl text-xs font-semibold text-[#026692] hover:bg-[#e8f4fd] transition-all"
                    >
                      Saludo Inicial
                    </button>
                    <button 
                      onClick={() => {
                        setChatInput("Para brindarte una cotización formal y verificar disponibilidad de nannys, ¿podrías indicarme tu zona o colonia en la ciudad?");
                        setIsQuickRepliesOpen(false);
                      }}
                      className="px-3 py-1.5 bg-[#f4f8fc] border border-[#e2edf6] rounded-xl text-xs font-semibold text-[#026692] hover:bg-[#e8f4fd] transition-all"
                    >
                      Preguntar Zona
                    </button>
                    <button 
                      onClick={() => {
                        setChatInput("Claro que sí, con gusto un asesor comercial te validará los detalles finales y te enviará la propuesta en un archivo PDF formal.");
                        setIsQuickRepliesOpen(false);
                      }}
                      className="px-3 py-1.5 bg-[#f4f8fc] border border-[#e2edf6] rounded-xl text-xs font-semibold text-[#026692] hover:bg-[#e8f4fd] transition-all"
                    >
                      Ofrecer PDF
                    </button>
                  </div>
                )}

                {/* Formulario de envío de mensajes en el chat */}
                <div className="p-4 bg-white border-t border-[#e2edf6] flex-shrink-0 relative">
                  {showEmojiPicker && (
                    <div className="absolute bottom-16 left-4 bg-white border border-[#e2edf6] rounded-2xl p-3 shadow-xl grid grid-cols-7 gap-1 z-30">
                      {EMOJIS.map((emoji) => (
                        <button 
                          key={emoji} 
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-lg transition-all"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-center space-x-3 bg-[#f4f8fc] border border-[#cbdfe9] rounded-2xl px-4 py-2">
                    <button 
                      type="button" 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-slate-400 hover:text-[#026692] transition-colors"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-slate-400 hover:text-[#026692] transition-colors"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <input 
                      type="text" 
                      placeholder="Escribe como agente..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onFocus={() => setShowEmojiPicker(false)}
                      className="flex-1 bg-transparent border-0 outline-none text-xs text-slate-800 focus:ring-0"
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

              {/* COLUMN 2 (Right): Lead Details Sidebar */}
              <div className="w-80 border-l border-[#e2edf6] bg-white flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-6 flex-shrink-0">
                
                {/* Top Avatar & Name & Status */}
                <div className="text-center space-y-3 pb-6 border-b border-[#f0f7fc]">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[#026692]/10 text-[#026692] border border-[#e2edf6] flex items-center justify-center text-2xl font-extrabold shadow-sm">
                    {selectedLead.nombreCompleto.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-800 text-base leading-tight">{selectedLead.nombreCompleto}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide inline-block ${
                      selectedLead.estado === "NUEVO" ? "bg-sky-50 text-[#026692]" :
                      selectedLead.estado === "CONTACTADO" ? "bg-amber-50 text-amber-600" :
                      selectedLead.estado === "COTIZADO" ? "bg-blue-50 text-blue-600" :
                      selectedLead.estado === "GANADO" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}>
                      {selectedLead.estado === "GANADO" ? "CLIENTE CERRADO" : "POTENCIAL " + selectedLead.estado}
                    </span>
                  </div>
                </div>

                {/* Profile Info fields */}
                <div className="space-y-4 text-xs pb-4 border-b border-[#f0f7fc]">
                  <h4 className="font-extrabold text-[#026692] uppercase tracking-wider text-[10px]">Información del Lead</h4>
                  
                  {/* Location */}
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#f4f8fc] rounded-xl text-[#026692] mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-bold block">Ciudad y Zona</span>
                      <span className="font-bold text-slate-700">{selectedLead.ciudad || "Por definir"}, {selectedLead.zona || "Por definir"}</span>
                    </div>
                  </div>

                  {/* Age */}
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#f4f8fc] rounded-xl text-[#026692] mt-0.5">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-bold block">Edad del Niño/a</span>
                      <span className="font-bold text-slate-700">
                        {selectedLead.edadHijo ? `${selectedLead.edadHijo} años` : "Por definir"}
                      </span>
                    </div>
                  </div>

                  {/* Service interest */}
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#f4f8fc] rounded-xl text-[#026692] mt-0.5">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-bold block">Servicio de interés</span>
                      <span className="font-bold text-slate-700 uppercase leading-snug">{selectedLead.interesServicio || "Por definir"}</span>
                    </div>
                  </div>
                </div>

                {/* Intención Comercial */}
                <FormattedIntencionComercial 
                  lead={selectedLead}
                  title={
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#026692] flex items-center gap-1.5 font-extrabold">
                      <Bot className="w-3.5 h-3.5" /> Intención Comercial
                    </span>
                  }
                />

                {/* Niños/as detail section */}
                {selectedLead.hijos && selectedLead.hijos.length > 0 && (
                  <div className="bg-[#fcfdfd] border border-[#e2edf6] p-4 rounded-2xl shadow-sm space-y-3">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#026692] flex items-center gap-1.5 font-extrabold">
                      👶 Niños ({selectedLead.hijos.length})
                    </span>
                    <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {selectedLead.hijos.map((child) => (
                        <div key={child.id} className="bg-[#f4f8fc] p-3 rounded-xl border border-[#e8f2fa] space-y-1.5 text-[10px]">
                          <div className="flex justify-between items-center font-bold text-slate-700 border-b border-slate-100 pb-1">
                            <span>{child.nombre}</span>
                            <span className="bg-[#026692] text-white px-1.5 py-0.2 rounded-full text-[8px] font-bold">
                              {child.textoEdad}
                            </span>
                          </div>
                          {child.alergias && (
                            <p className="text-slate-600"><span className="text-rose-500 font-bold">Alergias:</span> {child.alergias}</p>
                          )}
                          {child.condicionMedica && (
                            <p className="text-slate-600"><span className="text-slate-500 font-bold">Condición:</span> {child.condicionMedica}</p>
                          )}
                          {child.indicacionesNanny && (
                            <p className="text-slate-600"><span className="text-amber-600 font-bold">Indicaciones:</span> {child.indicacionesNanny || child.instrucciones}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas del Agente */}
                <div className="bg-[#fcfdfd] border border-[#e2edf6] p-4 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-[#026692] flex items-center gap-1.5 font-extrabold">
                    <MessageSquare className="w-3.5 h-3.5" /> Notas del Agente
                  </span>
                  {selectedLead.notas && selectedLead.notas.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {selectedLead.notas.map(n => (
                        <div key={n.id} className="text-[10px] text-slate-600 leading-relaxed border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                          <p className="italic">"{renderNoteContent(n.contenido, selectedLead.nombreCompleto)}"</p>
                          <span className="text-[8px] text-slate-400 block mt-0.5">— {n.nombreAgente}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay notas registradas para este prospecto.</p>
                  )}
                  
                  {/* Formulario para agregar nota manual */}
                  <form onSubmit={handleSaveNote} className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <textarea
                      placeholder="Escribe una nota interna sobre este lead..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full text-[10px] p-2 bg-[#f8fbfe] border border-[#e2edf6] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#026692] resize-none h-14"
                    />
                    <button
                      type="submit"
                      disabled={!newNoteText.trim() || savingNote}
                      className="w-full py-1.5 bg-[#026692] hover:bg-[#1d4359] text-white rounded-xl text-[10px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" /> Guardar Nota
                    </button>
                  </form>
                </div>

                {/* Cotizaciones Enviadas */}
                <div className="bg-[#fcfdfd] border border-[#e2edf6] p-4 rounded-2xl shadow-sm space-y-3">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-[#026692] flex items-center gap-1.5 font-extrabold">
                    <FileText className="w-3.5 h-3.5" /> Cotizaciones Enviadas
                  </span>
                  {selectedLead.cotizaciones && selectedLead.cotizaciones.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {selectedLead.cotizaciones.map((quote) => (
                        <div key={quote.id} className="relative group border border-slate-100 rounded-xl overflow-hidden bg-slate-50 hover:border-[#026692]/30 transition-all shadow-sm">
                          <img 
                            src={`/api/cotizaciones/${quote.id}/image`} 
                            alt={`Cotización ${quote.total}`} 
                            className="w-full h-20 object-cover object-top cursor-pointer group-hover:scale-105 transition-all"
                            onClick={() => window.open(`/api/cotizaciones/${quote.id}/image`, "_blank")}
                          />
                          <div className="p-1 text-[9px] font-bold text-center bg-white text-slate-700 border-t border-slate-100 flex justify-between items-center">
                            <span>${quote.total.toLocaleString("es-MX")}</span>
                            <a 
                              href={`/api/cotizaciones/${quote.id}/image`} 
                              download={`cotizacion_${quote.id}.png`}
                              className="text-[#026692] hover:text-[#1d4359] font-extrabold px-1 rounded hover:bg-slate-100"
                              title="Descargar"
                            >
                              ↓
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No hay cotizaciones enviadas.</p>
                  )}
                </div>

                {/* Acciones Comerciales */}
                <div className="space-y-3 pt-4 border-t border-[#f0f7fc]">
                  <h4 className="font-extrabold text-[#026692] uppercase tracking-wider text-[10px]">Acciones Comerciales</h4>
                  
                  {selectedLead.ciudad === "Por definir" || selectedLead.ciudad === "" || !selectedLead.ciudad ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-left">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Falta Asignar Ciudad</span>
                      </div>
                      <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                        Este lead aún no tiene una ciudad asignada. El chatbot la detectará o puedes actualizarla en Leads.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Quote action trigger */}
                      <button 
                        type="button"
                        onClick={() => {
                          setQuoteForm(q => ({ ...q, ciudad: selectedLead.ciudad, tipoServicio: selectedLead.interesServicio }));
                          setQuoteBuilderOpen(true);
                        }}
                        className="w-full bg-[#f4f8fc] hover:bg-[#e8f4fd] border border-[#e2edf6] text-[#026692] py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <FileText className="w-4 h-4 text-[#026692]" /> Crear Cotización
                      </button>

                      {/* Close Won trigger */}
                      {selectedLead.estado !== "ATENCION_HUMANA" && selectedLead.estado !== "GANADO" && (
                        <button 
                          type="button"
                          onClick={() => handleUpdateLeadStatus(selectedLead.id, "ATENCION_HUMANA")}
                          className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <UserCheck className="w-4 h-4 text-indigo-500" /> Derivar a Atención Humana
                        </button>
                      )}

                      {selectedLead.estado === "ATENCION_HUMANA" && (
                        <button 
                          type="button"
                          onClick={() => handleUpdateLeadStatus(selectedLead.id, "CONTACTADO")}
                          className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Bot className="w-4 h-4 text-amber-500" /> Devolver a Conversación (IA)
                        </button>
                      )}

                      {selectedLead.estado !== "GANADO" ? (
                        <button 
                          type="button"
                          onClick={() => handleUpdateLeadStatus(selectedLead.id, "GANADO")}
                          className="w-full bg-[#026692] hover:bg-[#1d4359] text-white py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-md"
                        >
                          ✓ Cerrar Ganado
                        </button>
                      ) : (
                        <div className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle className="w-4 h-4" /> Cliente Ganado
                        </div>
                      )}

                      {selectedLead.estado !== "PERDIDO" && (
                        <button 
                          type="button"
                          onClick={() => handleUpdateLeadStatus(selectedLead.id, "PERDIDO")}
                          className="w-full text-slate-400 hover:text-rose-500 py-2 text-xs font-bold text-center transition-all block"
                        >
                          Mover a Perdidos
                        </button>
                      )}
                    </div>
                  )}
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
