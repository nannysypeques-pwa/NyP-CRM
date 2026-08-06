"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Check,
  CornerUpLeft,
  Pencil,
  Reply
} from "lucide-react";
import FormattedIntencionComercial from "@/components/FormattedIntencionComercial";
import { renderNoteContent } from "@/lib/narrative";
import confetti from "canvas-confetti";
import { formatPhoneNumber, formatLeadAges } from "@/lib/format";

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
  urlMultimedia?: string;
  idMensajeRespondido?: string;
  textoCitado?: string;
  editado?: boolean;
  editadoEn?: string;
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

import { clientCache } from "@/lib/clientCache";

export default function KanbanPage() {
  const router = useRouter();
  const cachedLeads = clientCache.get<Lead[]>("leads");
  const cachedConvs = clientCache.get<Conversation[]>("conversations");
  const [leads, setLeads] = useState<Lead[]>(cachedLeads || []);
  const [conversations, setConversations] = useState<Conversation[]>(cachedConvs || []);
  const [loading, setLoading] = useState(!cachedLeads);
  
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
  
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>(clientCache.get<any[]>("users_list") || []);

  const renderStatusBadge = (lead: Lead) => {
    let text = "";
    let style = "";

    switch (lead.estado) {
      case "NUEVO":
        text = "NUEVO";
        style = "bg-sky-50 text-[#026692] border border-sky-200/60";
        break;
      case "CONTACTADO":
        const agent = usersList.find(u => u.id === lead.idUsuarioAsignado);
        const agentName = agent ? agent.nombre : (lead.idUsuarioAsignado ? "Asignado" : "");
        text = agentName ? `CONTACTADO POR ${agentName.toUpperCase()}` : "CONTACTADO";
        style = "bg-amber-50 text-amber-700 border border-amber-200/60";
        break;
      case "COTIZADO":
        text = "EN COTIZACIÓN";
        style = "bg-blue-50 text-blue-700 border border-blue-200/60";
        break;
      case "GANADO":
        text = "CLIENTE GANADO";
        style = "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
        break;
      case "ATENCION_HUMANA":
        text = "ATENCIÓN HUMANA";
        style = "bg-indigo-50 text-indigo-700 border border-indigo-200/60";
        break;
      case "PERDIDO":
        text = "PERDIDO";
        style = "bg-rose-50 text-rose-700 border border-rose-200/60";
        break;
      default:
        text = lead.estado;
        style = "bg-slate-50 text-slate-700 border border-slate-200";
        break;
    }

    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-block shadow-xs ${style}`}>
        {text}
      </span>
    );
  };

  // Emojis and files
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Reply & Edit states in Embudo
  const [replyingToMessage, setReplyingToMessage] = useState<{ id: string; senderName: string; snippet: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // 24 Hour Window and Templates states
  const [tick, setTick] = useState(0);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const is24HourWindowClosed = useMemo(() => {
    if (!chatMessages || chatMessages.length === 0) return false;
    
    // Find the last message sent by the customer (INBOUND)
    const lastClientMsg = [...chatMessages]
      .reverse()
      .find(m => m.direccion === "INBOUND");
      
    if (!lastClientMsg) return true; // No client message, so window is closed
    
    const lastMsgTime = new Date(lastClientMsg.creadoEn).getTime();
    const now = Date.now();
    const diff = now - lastMsgTime;
    
    return diff > 24 * 60 * 60 * 1000; // 24 hours in ms
  }, [chatMessages]);

  const remainingTimeText = useMemo(() => {
    if (!chatMessages || chatMessages.length === 0) return "";
    
    const lastClientMsg = [...chatMessages]
      .reverse()
      .find(m => m.direccion === "INBOUND");
      
    if (!lastClientMsg) return "";
    
    const lastMsgTime = new Date(lastClientMsg.creadoEn).getTime();
    const now = Date.now();
    const remainingMs = (24 * 60 * 60 * 1000) - (now - lastMsgTime);
    
    if (remainingMs <= 0) return "";
    
    const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
    const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    
    if (remainingHours > 0) {
      return `${remainingHours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  }, [chatMessages, tick]);

  const handleDoubleClickMessage = (msg: Message) => {
    const isClient = msg.direccion === "INBOUND";
    const isIA = msg.tipoRemitente === "IA";
    const senderName = isClient ? (selectedLead?.nombreCompleto || "Cliente") : (isIA ? "Sofía IA" : "Agente");
    setReplyingToMessage({
      id: msg.id,
      senderName,
      snippet: msg.contenido
    });
    setEditingMessage(null);

    // Auto-focus input
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 50);
  };

  const handleStartEditMessage = (msg: Message) => {
    setEditingMessage({
      id: msg.id,
      content: msg.contenido
    });
    setChatInput(msg.contenido);
    setReplyingToMessage(null);

    // Auto-focus input
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 50);
  };

  const scrollToMessage = (msgId?: string | null) => {
    if (!msgId) return;
    const el = document.getElementById(`msg-embudo-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  };
  
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

  const [isExecutingRemarketing, setIsExecutingRemarketing] = useState(false);

  const handleTriggerRemarketing = async () => {
    setIsExecutingRemarketing(true);
    try {
      const res = await fetch("/api/cron/remarketing", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`✨ Remarketing IA ejecutado con éxito. Se enviaron ${data.processedLeadsCount} mensajes de seguimiento por WhatsApp.`);
        fetchLeadsAndConversations();
      } else {
        alert(`Error al ejecutar remarketing: ${data.error || "Ocurrió un error inesperado."}`);
      }
    } catch (err) {
      alert("Error de conexión al ejecutar el seguimiento de remarketing.");
    } finally {
      setIsExecutingRemarketing(false);
    }
  };

  // Carga inicial y sincronización de cookies de ciudad
  useEffect(() => {
    fetchLeadsAndConversations();

    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsersList(data);
          clientCache.set("users_list", data);
        }
      })
      .catch(err => console.error("Error loading users:", err));

    // Fetch logged in user details for agent notes audit
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data && data.user) {
          setCurrentUser(data.user);
          if (data.user.ciudad && data.user.ciudad.toUpperCase() !== "TODAS") {
            const finalCity = data.user.ciudad === "Queretaro" ? "Querétaro" : data.user.ciudad;
            setSelectedCity(finalCity);
          }
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

  // Poll leads and conversations to keep Kanban board up to date (pauses when tab is hidden)
  useEffect(() => {
    if (draggedLeadId !== null) return;

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchLeadsAndConversations();
    }, 6000);

    return () => clearInterval(interval);
  }, [draggedLeadId]);

  // Poll chat messages in Drawer if open (pauses when tab is hidden)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (drawerOpen && activeConv) {
      fetchMessages(activeConv.id);
      interval = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        fetchMessages(activeConv.id);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [drawerOpen, activeConv]);

  // Reset scroll ref and load cached messages when active conversation changes
  useEffect(() => {
    hasScrolledForActiveConvRef.current = false;
    if (activeConv?.id) {
      const cached = clientCache.get<any[]>(`messages_${activeConv.id}`);
      if (cached) {
        setChatMessages(cached);
      } else {
        setChatMessages([]);
      }
    } else {
      setChatMessages([]);
    }
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
        clientCache.set("leads", leadsData);
        clientCache.set("conversations", convsData);

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
    if (!convId) return;
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        clientCache.set(`messages_${convId}`, data);
        setChatMessages(prev => {
          const temps = prev.filter(m => m.id.startsWith("temp_"));
          if (temps.length > 0) {
            const pendingTemps = temps.filter(t => !data.some((d: any) => d.contenido === t.contenido));
            if (pendingTemps.length > 0) {
              return [...data, ...pendingTemps];
            }
          }
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
      let agentId: string | undefined = undefined;
      if (newStatus === "CONTACTADO") {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user?.userId) {
            agentId = meData.user.userId;
          }
        }
      }

      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          estado: newStatus,
          ...(agentId ? { idUsuarioAsignado: agentId } : {})
        }),
      });
      if (res.ok) {
        // Refresh local state
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado: newStatus, ...(agentId ? { idUsuarioAsignado: agentId } : {}) } : l));
        
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(prev => prev ? { ...prev, estado: newStatus, ...(agentId ? { idUsuarioAsignado: agentId } : {}) } : null);
        }

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

  const handleDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    setActiveDropCol(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    if (lead.estado === targetCol) return;

    handleUpdateLeadStatus(leadId, targetCol);
    setDraggedLeadId(null);
  };

  // Drawer interactions
  const handleCardClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerTab("general");
    setReplyingToMessage(null);
    setEditingMessage(null);
    setChatInput("");
    
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
    setReplyingToMessage(null);
    setEditingMessage(null);
    // Refresh board to fetch any updates from drawer actions
    fetchLeadsAndConversations();
  };

  // Send message as Agent
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeConv) return;

    const text = chatInput.trim();

    // MODO EDICIÓN DE MENSAJE ENVIADO
    if (editingMessage) {
      const messageIdToEdit = editingMessage.id;
      setEditingMessage(null);
      setChatInput("");

      // Actualización optimista
      setChatMessages(prev => prev.map(m => m.id === messageIdToEdit ? { ...m, contenido: text, editado: true } : m));

      try {
        await fetch(`/api/conversations/${activeConv.id}/messages/${messageIdToEdit}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contenido: text })
        });
        fetchMessages(activeConv.id);
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // MODO ENVÍO O RESPUESTA
    const replyData = replyingToMessage;
    setReplyingToMessage(null);
    setChatInput("");

    // Optimistic Update
    const tempMsg: Message = {
      id: `temp_${Date.now()}`,
      idConversacion: activeConv.id,
      direccion: "OUTBOUND",
      tipoRemitente: "AGENT",
      contenido: text,
      idMensajeRespondido: replyData?.id || undefined,
      textoCitado: replyData?.snippet || undefined,
      creadoEn: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direccion: "OUTBOUND",
          tipoRemitente: "AGENT",
          idRemitente: currentUser?.userId || "agent-laura",
          contenido: text,
          idMensajeRespondido: replyData?.id || null,
          textoCitado: replyData?.snippet || null
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

      // 1. Únicamente los leads marcados como PERDIDO se ocultan del Embudo
      if (l.estado === "PERDIDO") {
        return false;
      }

      // 2. PENDIENTE (NUEVO sin ciudad): Prospectos que escribieron pero no tienen ciudad asignada
      if (status === "NUEVO") {
        const isPendiente = l.ciudad === "Por definir" || l.ciudad === "" || !l.ciudad;
        return l.estado === "NUEVO" && isPendiente;
      }

      // Para las demás columnas del embudo, deben tener una ciudad asignada y coincidir con el filtro de ciudad
      const hasCity = l.ciudad && l.ciudad !== "Por definir" && l.ciudad !== "";
      if (!hasCity) return false;

      const normSelected = selectedCity.toUpperCase();
      const normLead = l.ciudad.toUpperCase();

      const matchesCity = normSelected === "TODAS" || 
        normLead === normSelected ||
        (normSelected === "QUERÉTARO" && normLead === "QUERETARO") ||
        (normSelected === "QUERETARO" && normLead === "QUERÉTARO");

      if (!matchesCity) return false;

      // 3. EN CONVERSACIÓN: Prospectos en conversación que tienen ciudad (sin agente asignado aún)
      if (status === "CONTACTADO") {
        const isAssignedContacted = l.estado === "CONTACTADO" && !!l.idUsuarioAsignado && l.idUsuarioAsignado !== "";
        if (isAssignedContacted) return false; // Si ya fue asignado a un agente responsable, está en la pestaña Leads (Contactados)
        return (l.estado === "CONTACTADO" || l.estado === "NUEVO");
      }

      // 4. EN COTIZACIÓN: Únicamente prospectos en estado COTIZADO
      if (status === "COTIZADO") {
        return l.estado === "COTIZADO";
      }

      // 5. LISTOS PARA EL CIERRE: Únicamente prospectos en estado GANADO
      if (status === "GANADO") {
        return l.estado === "GANADO";
      }

      // 6. ATENCIÓN HUMANA: Únicamente prospectos en estado ATENCION_HUMANA
      if (status === "ATENCION_HUMANA") {
        return l.estado === "ATENCION_HUMANA";
      }

      return l.estado === status;
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
      <div className="flex-1 flex lg:grid lg:grid-cols-5 overflow-x-auto lg:overflow-hidden gap-4 lg:gap-6 min-h-0 pb-2 custom-scrollbar snap-x">
        
        {/* COLUMN 1: PENDIENTES */}
        <div 
          onDragOver={(e) => handleDragOver(e, "NUEVO")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "NUEVO")}
          className={`w-[82vw] sm:w-80 lg:w-auto flex-shrink-0 snap-center rounded-3xl p-4 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200 ${
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
                  <span className="text-[#026692] font-semibold bg-[#e1eff8] px-2 py-0.5 rounded-md">{formatPhoneNumber(lead.telefono)}</span>
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
          className={`w-[82vw] sm:w-80 lg:w-auto flex-shrink-0 snap-center rounded-3xl p-4 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200 ${
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
                  <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md text-[10px]">{formatPhoneNumber(lead.telefono)}</span>
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
          className={`w-[82vw] sm:w-80 lg:w-auto flex-shrink-0 snap-center rounded-3xl p-4 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200 ${
            activeDropCol === "COTIZADO" ? "bg-blue-50 border-2 border-dashed border-blue-500/40" : "bg-[#f6faff] border border-[#e2edf6]"
          }`}
        >
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="font-extrabold text-blue-700 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> En cotización
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerRemarketing}
                disabled={isExecutingRemarketing}
                title="Enviar seguimiento automático por WhatsApp con IA a leads en cotización sin respuesta"
                className="text-[10px] font-extrabold bg-[#026692] hover:bg-[#024d6e] text-white px-2.5 py-1 rounded-full flex items-center gap-1 transition-all shadow-sm disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                {isExecutingRemarketing ? "Enviando..." : "Remarketing IA"}
              </button>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {getLeadsByStatus("COTIZADO").length}
              </span>
            </div>
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
                  <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md text-[10px]">{formatPhoneNumber(lead.telefono)}</span>
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
          className={`w-[82vw] sm:w-80 lg:w-auto flex-shrink-0 snap-center rounded-3xl p-4 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200 ${
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
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[10px]">{formatPhoneNumber(lead.telefono)}</span>
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
          className={`w-[82vw] sm:w-80 lg:w-auto flex-shrink-0 snap-center rounded-3xl p-4 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200 ${
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
                  <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md text-[10px]">{formatPhoneNumber(lead.telefono)}</span>
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
                  {selectedLead.telefono && (
                    <p className="text-[11px] font-semibold text-slate-500 leading-none my-0.5">
                      📞 {formatPhoneNumber(selectedLead.telefono)}
                    </p>
                  )}
                  {is24HourWindowClosed ? (
                    <span className="text-[9px] md:text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1 border border-amber-200 mt-1 w-max">
                      ⚠️ Ventana de 24h cerrada
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] md:text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> En línea
                      </span>
                      {remainingTimeText && (
                        <span className="text-[9px] md:text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-md font-extrabold border border-sky-200 flex items-center gap-1">
                          ⏱️ {remainingTimeText} restantes
                        </span>
                      )}
                    </div>
                  )}
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
                  ) : chatMessages.map((msg, index) => {
                    const isClient = msg.direccion === "INBOUND";
                    const isIA = msg.tipoRemitente === "IA";
                    
                    const currentDateText = getMessageDateDividerText(msg.creadoEn);
                    const prevMsg = index > 0 ? chatMessages[index - 1] : null;
                    const prevDateText = prevMsg ? getMessageDateDividerText(prevMsg.creadoEn) : "";
                    const showDivider = currentDateText !== prevDateText;

                    return (
                      <React.Fragment key={msg.id}>
                        {showDivider && (
                          <div className="flex justify-center my-4 w-full">
                            <span className="bg-slate-200/60 backdrop-blur-xs text-slate-600 border border-[#e2edf6] rounded-xl px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                              {currentDateText}
                            </span>
                          </div>
                        )}
                        <div 
                          id={`msg-embudo-${msg.id}`}
                          onDoubleClick={() => handleDoubleClickMessage(msg)}
                          className={`flex group relative ${isClient ? "justify-start" : "justify-end"} items-center gap-2`}
                        >
                        {/* Hover Action buttons (Reply / Edit) */}
                        <div className={`hidden group-hover:flex items-center space-x-1 bg-white/90 backdrop-blur-xs border border-slate-200 rounded-full px-2 py-0.5 shadow-sm text-slate-600 ${
                          isClient ? "order-2" : "order-1"
                        }`}>
                          <button 
                            type="button"
                            title="Responder (Doble Clic)"
                            onClick={() => handleDoubleClickMessage(msg)}
                            className="p-1 hover:text-[#026692] transition-colors rounded-full"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                          </button>
                          {!isClient && (
                            <button 
                              type="button"
                              title="Editar mensaje enviado"
                              onClick={() => handleStartEditMessage(msg)}
                              className="p-1 hover:text-amber-600 transition-colors rounded-full"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Bubble Container */}
                        <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm relative transition-all cursor-pointer ${
                          isClient ? "order-1" : "order-2"
                        } ${
                          highlightedMsgId === msg.id ? "ring-2 ring-[#026692] scale-[1.01]" : ""
                        } ${
                          isClient 
                            ? "bg-[#e1eff8] text-slate-800 rounded-tl-none border border-[#cbdfe9]" 
                            : isIA 
                              ? "bg-[#026692] text-white rounded-tr-none shadow-md" 
                              : "bg-white text-slate-800 rounded-tr-none border border-[#e2edf6]"
                        }`}>

                          {/* Quoted Box Preview if replying */}
                          {msg.textoCitado && (
                            <div 
                              onClick={(e) => { e.stopPropagation(); scrollToMessage(msg.idMensajeRespondido); }}
                              className={`mb-2.5 p-2 rounded-xl border-l-4 text-xs cursor-pointer transition-all hover:opacity-90 ${
                                isClient 
                                  ? "bg-[#cbe3f3] border-[#026692] text-slate-800" 
                                  : isIA 
                                    ? "bg-[#014d6e] border-sky-300 text-sky-100" 
                                    : "bg-slate-100 border-[#026692] text-slate-700"
                              }`}
                            >
                              <div className="font-bold text-[10px] uppercase opacity-80 flex items-center gap-1 mb-0.5">
                                <CornerUpLeft className="w-3 h-3" /> Respuesta
                              </div>
                              <div className="truncate font-medium italic">{msg.textoCitado}</div>
                            </div>
                          )}

                          {isIA && (
                            <span className="text-[8px] font-extrabold uppercase tracking-widest text-sky-200 flex items-center gap-1 mb-1.5">
                              <Sparkles className="w-3 h-3" /> Respuesta IA
                            </span>
                          )}

                          {msg.urlMultimedia ? (
                            <div className="space-y-2">
                              <img 
                                src={msg.urlMultimedia} 
                                alt="Cotización" 
                                className="max-w-[280px] md:max-w-[340px] h-auto rounded-lg border border-[#cbdfe9]/50 shadow-sm cursor-pointer hover:opacity-90 transition-all"
                                onClick={() => window.open(msg.urlMultimedia, "_blank")}
                              />
                              {msg.contenido && (
                                <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
                          )}

                          <span className={`text-[8px] flex items-center justify-end gap-1 mt-1.5 ${isIA || !isClient ? "text-sky-100" : "text-slate-400"}`}>
                            {msg.editado && <span className="italic opacity-80">(editado)</span>}
                            <span>{new Date(msg.creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {!isClient && <span>✓✓</span>}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
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
                  
                  {/* Reply Banner */}
                  {replyingToMessage && (
                    <div className="mb-2 px-3 py-2 bg-[#eaf4fa] border border-[#cbdfe9] rounded-xl flex items-center justify-between z-20 text-xs shadow-xs animate-in fade-in duration-200">
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <div className="w-1 h-7 bg-[#026692] rounded-full flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-[#026692] block text-[10px] uppercase tracking-wide">
                            Respondiendo a {replyingToMessage.senderName}
                          </span>
                          <span className="text-slate-600 truncate block text-[11px] font-medium">
                            {replyingToMessage.snippet}
                          </span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setReplyingToMessage(null)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors ml-2 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Edit Mode Banner */}
                  {editingMessage && (
                    <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between z-20 text-xs shadow-xs animate-in fade-in duration-200">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <Pencil className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-amber-800 block text-[10px] uppercase tracking-wide">
                            Editar mensaje enviado
                          </span>
                          <span className="text-slate-600 truncate block text-[11px] font-medium">
                            {editingMessage.content}
                          </span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setEditingMessage(null); setChatInput(""); }}
                        className="p-1 text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-full transition-colors ml-2 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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

                  {is24HourWindowClosed ? (
                    <div className="flex flex-col md:flex-row items-center justify-between bg-amber-50/70 border border-amber-200 rounded-2xl p-4 gap-4 animate-in fade-in duration-200">
                      <div className="flex items-start space-x-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-extrabold text-amber-800 text-xs uppercase tracking-wide">Ventana de 24 horas cerrada</h4>
                          <p className="text-[11px] text-slate-600 font-medium leading-normal mt-0.5">
                            Meta no permite enviar mensajes libres una vez transcurrido este tiempo. Debes reactivar el chat enviando una plantilla autorizada.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTemplateModal(true)}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 flex-shrink-0"
                      >
                        <MessageSquare className="w-4 h-4" /> Reactivar con Plantilla
                      </button>
                    </div>
                  ) : (
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
                        ref={chatInputRef}
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
                  )}
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
                    {selectedLead.telefono && (
                      <p className="text-xs font-extrabold text-[#026692] flex items-center justify-center gap-1 my-1">
                        📞 {formatPhoneNumber(selectedLead.telefono)}
                      </p>
                    )}
                    {renderStatusBadge(selectedLead)}
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
                        {formatLeadAges(selectedLead)}
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
                    
                    {(selectedLead.ciudad === "Por definir" || selectedLead.ciudad === "" || !selectedLead.ciudad) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-left mb-3">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Falta Asignar Ciudad</span>
                        </div>
                        <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                          Este lead aún no tiene una ciudad asignada. El chatbot la detectará o puedes actualizarla en Leads.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Quote action trigger */}
                      {selectedLead.ciudad && selectedLead.ciudad !== "Por definir" && (
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
                      )}

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

                      {selectedLead.estado !== "PERDIDO" ? (
                        <button 
                          type="button"
                          onClick={() => handleUpdateLeadStatus(selectedLead.id, "PERDIDO")}
                          className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm mt-2"
                        >
                          <X className="w-4 h-4 text-rose-500" /> Marcar como Perdido
                        </button>
                      ) : (
                        <div className="w-full bg-rose-50 text-rose-600 border border-rose-200 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 mt-2">
                          <X className="w-4 h-4 text-rose-500" /> Lead Cerrado (Perdido)
                        </div>
                      )}

                      {selectedLead.estado !== "CONTACTADO" && (
                        <button 
                          type="button"
                          onClick={() => handleUpdateLeadStatus(selectedLead.id, "CONTACTADO")}
                          className="w-full bg-[#f4f8fc] hover:bg-[#e8f4fd] text-[#026692] border border-[#cbdfe9] py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                        >
                          <UserCheck className="w-4 h-4" /> Contactado
                        </button>
                      )}
                    </div>
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

      {showTemplateModal && (
        <TemplateModal 
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          activeConvId={activeConv ? activeConv.id : null}
          activeLead={selectedLead}
          currentUser={currentUser}
          fetchMessages={fetchMessages}
          fetchConversations={fetchLeadsAndConversations}
        />
      )}

    </div>
  );
}

function getMessageDateDividerText(dateString: string | Date): string {
  const d = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(d, today)) {
    return "Hoy";
  } else if (isSameDay(d, yesterday)) {
    return "Ayer";
  } else {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }
}

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConvId: string | null;
  activeLead: any | null;
  currentUser: any | null;
  fetchMessages: (convId: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
}

function TemplateModal({
  isOpen,
  onClose,
  activeConvId,
  activeLead,
  currentUser,
  fetchMessages,
  fetchConversations
}: TemplateModalProps) {
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [templateHeaderImage, setTemplateHeaderImage] = useState<string>("");
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [templateSendError, setTemplateSendError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingTemplates(true);
      fetch("/api/whatsapp/templates")
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            const approvedOrPending = data.data.filter(
              (t: any) => t.status === "APPROVED" || t.status === "PENDING"
            );
            setMetaTemplates(approvedOrPending);
          }
          setLoadingTemplates(false);
        })
        .catch(err => {
          console.error("Error loading templates", err);
          setLoadingTemplates(false);
        });
    }
  }, [isOpen]);

  const activeTemplate = useMemo(() => {
    return metaTemplates.find(t => t.name === selectedTemplateName);
  }, [metaTemplates, selectedTemplateName]);

  useEffect(() => {
    if (activeTemplate) {
      const bodyComp = activeTemplate.components.find((c: any) => c.type === "BODY");
      const bodyText = bodyComp ? bodyComp.text : "";
      const count = bodyText.match(/\{\{\d+\}\}/g)?.length || 0;
      const initialVars = Array(count).fill("");
      if (count > 0 && activeLead) {
        initialVars[0] = activeLead.nombreCompleto;
      }
      setTemplateVariables(initialVars);

      const headerComp = activeTemplate.components.find((c: any) => c.type === "HEADER");
      if (headerComp && headerComp.format === "IMAGE") {
        setTemplateHeaderImage("https://nyp-crm.vercel.app/images/cotizacion_base.png");
      } else {
        setTemplateHeaderImage("");
      }
      setTemplateSendError(null);
    } else {
      setTemplateVariables([]);
      setTemplateHeaderImage("");
    }
  }, [activeTemplate, activeLead]);

  const templatePreviewText = useMemo(() => {
    if (!activeTemplate) return "";
    const bodyComp = activeTemplate.components.find((c: any) => c.type === "BODY");
    if (!bodyComp) return "";
    let text = bodyComp.text;
    
    templateVariables.forEach((val, idx) => {
      const placeholder = `{{${idx + 1}}}`;
      text = text.replaceAll(placeholder, val || placeholder);
    });
    return text;
  }, [activeTemplate, templateVariables]);

  const handleSendTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate || !activeConvId) return;

    setSendingTemplate(true);
    setTemplateSendError(null);

    const bodyComp = activeTemplate.components.find((c: any) => c.type === "BODY");
    const footerComp = activeTemplate.components.find((c: any) => c.type === "FOOTER");
    
    let finalContent = templatePreviewText;
    if (footerComp) {
      finalContent += `\n\n_${footerComp.text}_`;
    }

    const hasImageHeader = activeTemplate.components.some((c: any) => c.type === "HEADER" && c.format === "IMAGE");

    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          direccion: "OUTBOUND",
          tipoRemitente: "AGENT",
          idRemitente: currentUser?.id || "agente",
          contenido: finalContent,
          urlMultimedia: hasImageHeader ? templateHeaderImage : null,
          template: {
            name: activeTemplate.name,
            languageCode: activeTemplate.language || "es",
            headerImage: hasImageHeader ? templateHeaderImage : null,
            bodyVariables: templateVariables
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al enviar la plantilla");
      }

      onClose();
      await fetchMessages(activeConvId);
      await fetchConversations();
    } catch (err: any) {
      console.error("Error sending template:", err);
      setTemplateSendError(err.message || "Error desconocido al enviar la plantilla");
    } finally {
      setSendingTemplate(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#026692]" /> Reactivar con Plantilla
          </h3>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {loadingTemplates ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-3 border-[#026692] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-[#026692]">Consultando plantillas de Meta...</p>
            </div>
          ) : metaTemplates.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Sin plantillas disponibles</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-normal">
                No se encontraron plantillas aprobadas o pendientes en tu cuenta comercial de Meta. Por favor configúralas y apruébalas en tu Administrador de WhatsApp de Meta Developers.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendTemplateSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide">
                  Seleccionar Plantilla de WhatsApp
                </label>
                <select
                  value={selectedTemplateName}
                  onChange={e => setSelectedTemplateName(e.target.value)}
                  className="w-full bg-[#f4f8fc] border border-[#d4e6f4] rounded-2xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#026692] font-semibold transition-all"
                  required
                >
                  <option value="">-- Elige una plantilla autorizada --</option>
                  {metaTemplates.map((t: any) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.status === "APPROVED" ? "Aprobada" : "En revisión"})
                    </option>
                  ))}
                </select>
              </div>

              {activeTemplate && (
                <>
                  {activeTemplate.status === "PENDING" && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-800 leading-normal font-medium">
                        Esta plantilla está <strong>En revisión</strong> por Meta. WhatsApp podría rechazar su envío hasta que el estado cambie oficialmente a "Aprobada".
                      </p>
                    </div>
                  )}

                  {activeTemplate.components.some((c: any) => c.type === "HEADER" && c.format === "IMAGE") && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide">
                        Imagen de Cabecera (URL Pública)
                      </label>
                      <input
                        type="url"
                        value={templateHeaderImage}
                        onChange={e => setTemplateHeaderImage(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#f4f8fc] border border-[#d4e6f4] rounded-2xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#026692] transition-all"
                        required
                      />
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        Meta requiere una dirección de imagen pública (ej. subida a un servidor o Imgur) para mostrarla en el celular del cliente.
                      </span>
                    </div>
                  )}

                  {templateVariables.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide block">
                        Variables de la Plantilla
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {templateVariables.map((val, idx) => (
                          <div key={idx} className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400">
                              Variable {`{{${idx + 1}}}`}
                            </span>
                            <input
                              type="text"
                              value={val}
                              onChange={e => {
                                const newVars = [...templateVariables];
                                newVars[idx] = e.target.value;
                                setTemplateVariables(newVars);
                              }}
                              placeholder={`Valor para {{${idx + 1}}}`}
                              className="w-full bg-[#f4f8fc] border border-[#d4e6f4] rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#026692] transition-all"
                              required
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide block">
                      Vista previa del mensaje
                    </label>
                    <div className="bg-[#f0f2f5] rounded-2xl p-4 border border-slate-200">
                      <div className="bg-[#e2f4dd] border border-[#cbe4c5] rounded-2xl p-3 text-xs max-w-[90%] ml-auto text-slate-800 space-y-2 relative shadow-xs">
                        {activeTemplate.components.some((c: any) => c.type === "HEADER" && c.format === "IMAGE") && templateHeaderImage && (
                          <img 
                            src={templateHeaderImage} 
                            alt="Header preview" 
                            className="w-full h-32 object-cover rounded-xl mb-1.5"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://placehold.co/600x314?text=Error+cargando+imagen";
                            }}
                          />
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed font-normal">{templatePreviewText}</p>
                        
                        {activeTemplate.components.some((c: any) => c.type === "FOOTER") && (
                          <p className="text-[10px] text-slate-400 italic">
                            {activeTemplate.components.find((c: any) => c.type === "FOOTER")?.text}
                          </p>
                        )}

                        {activeTemplate.components.find((c: any) => c.type === "BUTTONS")?.buttons?.map((btn: any, i: number) => (
                          <div key={i} className="mt-2 pt-2 border-t border-slate-200/40 flex justify-center">
                            <span className="text-[#026692] font-bold text-[10px] flex items-center gap-1">
                              🔗 {btn.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {templateSendError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-600 font-semibold leading-normal animate-in shake-100 duration-200">
                      ❌ Error: {templateSendError}
                    </div>
                  )}

                  <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={sendingTemplate}
                      className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={sendingTemplate}
                      className="flex-1 py-3 bg-[#026692] hover:bg-[#1d4359] text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {sendingTemplate ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Enviando plantilla...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Enviar Plantilla
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
