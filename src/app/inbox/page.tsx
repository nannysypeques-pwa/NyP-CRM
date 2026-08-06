"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { 
  Search, 
  Plus, 
  Bot, 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  AlertTriangle,
  FileText,
  CheckCircle,
  HelpCircle,
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  UserCheck,
  X,
  Save,
  ArrowLeft,
  Info,
  CornerUpLeft,
  Pencil,
  Reply
} from "lucide-react";
import FormattedIntencionComercial from "@/components/FormattedIntencionComercial";
import { renderNoteContent } from "@/lib/narrative";
import confetti from "canvas-confetti";
import { clientCache } from "@/lib/clientCache";
import { formatPhoneNumber, formatLeadAges } from "@/lib/format";

interface Message {
  id: string;
  idConversacion: string;
  direccion: 'INBOUND' | 'OUTBOUND';
  tipoRemitente: 'CLIENT' | 'AGENT' | 'IA';
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
  lead?: {
    nombreCompleto: string;
  };
  mensajes?: Message[];
}

interface Hijo {
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

function formatLastMessageTime(dateString: string | Date | undefined | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    
    // Check if it is the same calendar day
    const isToday = now.getDate() === date.getDate() && 
                    now.getMonth() === date.getMonth() && 
                    now.getFullYear() === date.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // Check if it was yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.getDate() === date.getDate() && 
                        yesterday.getMonth() === date.getMonth() && 
                        yesterday.getFullYear() === date.getFullYear();

    if (isYesterday) {
      return "Ayer";
    }

    // Check if it is in the last 7 days
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      return days[date.getDay()];
    }

    // Otherwise show date
    return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
  } catch (e) {
    return "";
  }
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
  deleted?: boolean;
}

interface Lead {
  id: string;
  nombreCompleto: string;
  telefono: string;
  ciudad: string;
  zona: string;
  origen: string;
  interesServicio: string;
  edadHijo?: number;
  nivelUrgencia: string;
  estado: string;
  idUsuarioAsignado?: string;
  resumenIA?: string;
  datosFaltantes?: string[];
  notas?: { id: string; contenido: string; nombreAgente: string; creadoEn: string }[];
  hijos?: Hijo[];
  cotizaciones?: Quote[];
  diasSolicitados?: string;
  horaInicioSolicitada?: string;
  horaFinSolicitada?: string;
  linkUbicacion?: string;
  razonContratacion?: string;
  mascotas?: string;
  cantidadHijos?: number;
}

function InboxContent() {
  const searchParams = useSearchParams();
  const paramLeadId = searchParams ? searchParams.get("leadId") : null;
  const paramConvId = searchParams ? searchParams.get("convId") : null;

  const cachedConvs = clientCache.get<Conversation[]>("conversations");
  const [conversations, setConversations] = useState<Conversation[]>(cachedConvs || []);
  const [activeConvId, setActiveConvId] = useState<string>(() => {
    if (cachedConvs && cachedConvs.length > 0) {
      if (paramConvId) {
        const found = cachedConvs.find(c => c.id === paramConvId);
        if (found) return found.id;
      }
      if (paramLeadId) {
        const found = cachedConvs.find(c => c.idLead === paramLeadId);
        if (found) return found.id;
      }
      return cachedConvs[0].id;
    }
    return "";
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  
  // Inputs
  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Loading & interactive UI states
  const [loadingChats, setLoadingChats] = useState(!cachedConvs);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);

  // Mobile view states (lista vs chat vs expediente)
  const [mobileView, setMobileView] = useState<"list" | "chat">(paramLeadId || paramConvId ? "chat" : "list");
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledForActiveConvRef = useRef<boolean>(false);

  // Emojis and files
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  // Quote Modal State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    tipoServicio: "",
    ciudad: "",
    zona: "",
    dias: "",
    horaInicio: "09:00",
    horaFin: "17:00",
    horasPorDia: 8,
    cantidadHijos: 1,
    subtotal: 0,
    descuento: 0,
    total: 0,
    notas: ""
  });

  // Note manual input state
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>(clientCache.get<any[]>("users_list") || []);

  // Global AI switch — afecta TODAS las conversaciones y las que lleguen nuevas
  const [globalIA, setGlobalIA] = useState<boolean>(true);
  const [togglingGlobalIA, setTogglingGlobalIA] = useState(false);

  // Reply & Edit states
  const [replyingToMessage, setReplyingToMessage] = useState<{ id: string; senderName: string; snippet: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // Template states & 24h window calculation
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const is24HourWindowClosed = useMemo(() => {
    if (!messages || messages.length === 0) return true;
    const lastInbound = [...messages]
      .reverse()
      .find(m => m.direccion === "INBOUND");
    if (!lastInbound) return true;
    const lastInboundTime = new Date(lastInbound.creadoEn).getTime();
    const timeDiff = Date.now() - lastInboundTime;
    return timeDiff > 24 * 60 * 60 * 1000;
  }, [messages]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 30000); // Refrescar cada 30 segundos
    return () => clearInterval(timer);
  }, []);

  const remainingTimeText = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    const lastInbound = [...messages]
      .reverse()
      .find(m => m.direccion === "INBOUND");
    if (!lastInbound) return null;
    const lastInboundTime = new Date(lastInbound.creadoEn).getTime();
    const timeDiff = Date.now() - lastInboundTime;
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    const remainingMs = twentyFourHoursInMs - timeDiff;
    
    if (remainingMs <= 0) return null;
    
    const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
    const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    
    if (remainingHours > 0) {
      return `${remainingHours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  }, [messages, tick]);

  const handleDoubleClickMessage = (msg: Message) => {
    const isClient = msg.direccion === "INBOUND";
    const isIA = msg.tipoRemitente === "IA";
    const senderName = isClient ? (activeLead?.nombreCompleto || "Cliente") : (isIA ? "Sofía IA" : "Agente");
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
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  };

  useEffect(() => {
    // Cargar el estado global de IA al montar
    fetch("/api/ia-global")
      .then(res => res.json())
      .then(data => {
        if (typeof data.iaGlobal === "boolean") setGlobalIA(data.iaGlobal);
      })
      .catch(() => {});

    // Cargar lista de usuarios del sistema para mostrar responsable asignado
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsersList(data);
          clientCache.set("users_list", data);
        }
      })
      .catch(err => console.error("Error loading users:", err));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error("Error loading current user:", err));
  }, []);

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

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !activeLead) return;
    setSavingNote(true);
    try {
      const agentName = currentUser?.nombre || "Asesor de ventas";
      const res = await fetch(`/api/leads/${activeLead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: newNoteText, nombreAgente: agentName }),
      });
      if (res.ok) {
        setNewNoteText("");
        fetchLeadDetails(activeLead.id);
      }
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  const openQuoteModal = () => {
    if (!activeLead) return;
    setQuoteForm({
      tipoServicio: activeLead.interesServicio || "FIXA SEMANAL",
      ciudad: activeLead.ciudad || "Puebla",
      zona: activeLead.zona || "",
      dias: activeLead.diasSolicitados || "Lunes a Viernes",
      horaInicio: activeLead.horaInicioSolicitada || "09:00",
      horaFin: activeLead.horaFinSolicitada || "17:00",
      horasPorDia: 8,
      cantidadHijos: activeLead.cantidadHijos || 1,
      subtotal: 0,
      descuento: 0,
      total: 0,
      notas: "(Precotización estimada)"
    });
    setIsQuoteModalOpen(true);
  };

  const handleQuoteFormChange = (field: string, value: any) => {
    setQuoteForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "subtotal" || field === "descuento") {
        const sub = Number(field === "subtotal" ? value : prev.subtotal) || 0;
        const desc = Number(field === "descuento" ? value : prev.descuento) || 0;
        updated.total = Math.max(0, sub - desc);
      }
      return updated;
    });
  };

  const handleSaveQuote = async (sendToClient: boolean) => {
    if (!activeLead) return;
    try {
      const res = await fetch(`/api/leads/${activeLead.id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoServicio: quoteForm.tipoServicio,
          ciudad: quoteForm.ciudad,
          dias: quoteForm.dias,
          horaInicio: quoteForm.horaInicio,
          horaFin: quoteForm.horaFin,
          horasPorDia: Number(quoteForm.horasPorDia),
          cantidadHijos: Number(quoteForm.cantidadHijos),
          subtotal: Number(quoteForm.subtotal),
          descuento: Number(quoteForm.descuento),
          total: Number(quoteForm.total),
          notas: quoteForm.notas,
          creadoPor: "Agente CRM"
        })
      });

      if (!res.ok) {
        alert("Error al guardar la cotización");
        return;
      }

      const createdQuote = await res.json();
      
      // Refresh lead details
      fetchLeadDetails(activeLead.id);
      
      const quoteImageUrl = `/api/cotizaciones/${createdQuote.id}/image`;

      if (sendToClient) {
        const msgRes = await fetch(`/api/conversations/${activeConvId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            direccion: "OUTBOUND",
            tipoRemitente: "AGENT",
            idRemitente: "agent-laura",
            contenido: `Le comparto el detalle de su precotización estimada de servicio. 😊 💛`,
            urlMultimedia: window.location.origin + quoteImageUrl
          })
        });
        
        if (msgRes.ok) {
          fetchMessages(activeConvId);
          fetchConversations();
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        } else {
          alert("Cotización guardada, pero hubo un error al enviar el mensaje de WhatsApp.");
        }
      } else {
        const link = document.createElement("a");
        link.href = quoteImageUrl;
        link.download = `cotizacion_${activeLead.nombreCompleto.replace(/\s+/g, "_")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.6 }
        });
      }

      setIsQuoteModalOpen(false);
    } catch (error) {
      console.error("Error saving quote:", error);
      alert("Error al procesar la cotización");
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

  // Polleo en segundo plano con alta frecuencia (1.5s) + Sincronización instantánea al regresar a la pestaña
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchConversations();
    }, 1500);

    const handleFocus = () => {
      fetchConversations();
      if (activeConvId) fetchMessages(activeConvId);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [activeConvId]);

  // Cambio instantáneo de conversación activa + polleo ultra-rápido de mensajes en pantalla (1.2s)
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      setActiveLead(null);
      return;
    }

    hasScrolledForActiveConvRef.current = false;

    // Resetear estados de edición, respuesta e input al cambiar de conversación
    setReplyingToMessage(null);
    setEditingMessage(null);
    setChatInput("");

    // 1. Cargar mensajes instantáneamente desde caché local
    const cachedMsgs = clientCache.get<Message[]>(`messages_${activeConvId}`);
    if (cachedMsgs) {
      setMessages(cachedMsgs);
    } else {
      setMessages([]);
    }

    // 2. Cargar datos del lead activo instantáneamente desde caché local
    const activeConv = conversations.find(c => c.id === activeConvId);
    if (activeConv?.idLead) {
      const cachedLead = clientCache.get<Lead>(`lead_${activeConv.idLead}`);
      if (cachedLead) {
        setActiveLead(cachedLead);
      } else {
        setActiveLead(null);
      }
      fetchLeadDetails(activeConv.idLead);
    } else {
      setActiveLead(null);
    }

    // 3. Obtener últimos mensajes del servidor
    fetchMessages(activeConvId);

    // Polleo ultra-rápido de mensajes para el chat activo (1.2s)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchMessages(activeConvId);
    }, 1200);

    return () => clearInterval(interval);
  }, [activeConvId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (!messagesEndRef.current || !chatContainerRef.current) return;
    
    if (messages.length > 0) {
      const behavior = !hasScrolledForActiveConvRef.current ? "auto" : "smooth";
      messagesEndRef.current.scrollIntoView({ behavior, block: "nearest" });
      hasScrolledForActiveConvRef.current = true;
    }
  }, [messages]);

  // Sincronizar selección de chat si cambia la URL o se cargan las conversaciones
  useEffect(() => {
    if (!conversations || conversations.length === 0) return;

    if (paramConvId) {
      const matched = conversations.find(c => c.id === paramConvId);
      if (matched && activeConvId !== matched.id) {
        setActiveConvId(matched.id);
      }
    } else if (paramLeadId) {
      const matched = conversations.find(c => c.idLead === paramLeadId);
      if (matched && activeConvId !== matched.id) {
        setActiveConvId(matched.id);
      }
    }
  }, [paramLeadId, paramConvId, conversations]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        // Sort by ultimoMensajeEn descending
        const sorted = data.sort((a: any, b: any) => new Date(b.ultimoMensajeEn).getTime() - new Date(a.ultimoMensajeEn).getTime());
        setConversations(sorted);
        clientCache.set("conversations", sorted);
        
        setActiveConvId(prev => {
          if (prev && sorted.some((c: any) => c.id === prev)) {
            return prev;
          }
          if (paramConvId) {
            const found = sorted.find((c: any) => c.id === paramConvId);
            if (found) return found.id;
          }
          if (paramLeadId) {
            const found = sorted.find((c: any) => c.idLead === paramLeadId);
            if (found) return found.id;
          }
          if (sorted.length > 0) {
            return sorted[0].id;
          }
          return "";
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    if (!convId) return;
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        clientCache.set(`messages_${convId}`, data);
        setMessages(prev => {
          // Preservar mensajes optimistas temporales hasta que se confirmen en el servidor
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

  const fetchLeadDetails = async (leadId: string) => {
    if (!leadId) return;
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        clientCache.set(`lead_${leadId}`, data);
        setActiveLead(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle AI switch para conversación individual
  const handleToggleAI = async (currentVal: boolean) => {
    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iaActiva: !currentVal }),
      });
      if (res.ok) {
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle AI global — aplica a TODOS los leads y nuevos que lleguen
  const handleToggleGlobalIA = async () => {
    if (togglingGlobalIA) return;
    setTogglingGlobalIA(true);
    const newVal = !globalIA;
    try {
      const res = await fetch("/api/ia-global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iaGlobal: newVal }),
      });
      if (res.ok) {
        setGlobalIA(newVal);
        // Refrescar conversaciones para reflejar el nuevo estado en la lista
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingGlobalIA(false);
    }
  };

  // Enviar mensaje como Agente (Optimistic UI 0ms + Turbo Burst 600ms)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeConvId) return;

    const text = chatInput.trim();

    // MODO EDICIÓN DE MENSAJE ENVIADO
    if (editingMessage) {
      const messageIdToEdit = editingMessage.id;
      setEditingMessage(null);
      setChatInput("");

      // Actualización optimista inmediata
      setMessages(prev => prev.map(m => m.id === messageIdToEdit ? { ...m, contenido: text, editado: true } : m));

      try {
        await fetch(`/api/conversations/${activeConvId}/messages/${messageIdToEdit}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contenido: text })
        });
        fetchMessages(activeConvId);
        fetchConversations();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // MODO ENVÍO O RESPUESTA
    const replyData = replyingToMessage;
    setReplyingToMessage(null);
    setChatInput("");

    // 1. OPTIMISTIC UPDATE: Agregar el mensaje a la pantalla de inmediato sin esperar al servidor (0ms)
    const tempMsg: Message = {
      id: `temp_${Date.now()}`,
      idConversacion: activeConvId,
      direccion: "OUTBOUND",
      tipoRemitente: "AGENT",
      contenido: text,
      idMensajeRespondido: replyData?.id || undefined,
      textoCitado: replyData?.snippet || undefined,
      creadoEn: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMsg]);

    // Mover la conversación al inicio de la lista lateral de inmediato
    setConversations(prev => {
      return prev.map(c => {
        if (c.id === activeConvId) {
          return { ...c, ultimoMensajeEn: tempMsg.creadoEn };
        }
        return c;
      }).sort((a, b) => new Date(b.ultimoMensajeEn).getTime() - new Date(a.ultimoMensajeEn).getTime());
    });

    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
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
        fetchMessages(activeConvId);
        fetchConversations();

        // 2. RÁFAGA TURBO: Pollear cada 600ms durante 6s para reflejar respuestas de la IA o cliente de forma ultra-rápida
        let bursts = 0;
        const burstInterval = setInterval(() => {
          bursts++;
          fetchMessages(activeConvId);
          fetchConversations();
          if (bursts >= 10) clearInterval(burstInterval);
        }, 600);
      }
    } catch (err) {
      console.error(err);
    }
  };



  // Close lead as GANADO
  const handleCloseWon = async () => {
    if (!activeLead) return;
    try {
      const res = await fetch(`/api/leads/${activeLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "GANADO" }),
      });
      if (res.ok) {
        fetchLeadDetails(activeLead.id);
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Close lead as PERDIDO
  const handleCloseLost = async () => {
    if (!activeLead) return;
    try {
      const res = await fetch(`/api/leads/${activeLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "PERDIDO" }),
      });
      if (res.ok) {
        fetchLeadDetails(activeLead.id);
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Marcar como Contactado
  const handleMarkContacted = async () => {
    if (!activeLead) return;
    try {
      let agentId: string | undefined = undefined;
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user?.userId) {
          agentId = meData.user.userId;
        }
      }

      const res = await fetch(`/api/leads/${activeLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          estado: "CONTACTADO",
          ...(agentId ? { idUsuarioAsignado: agentId } : {})
        }),
      });
      if (res.ok) {
        fetchLeadDetails(activeLead.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Click quick shortcut to pre-fill input
  const handleQuickInsert = (text: string) => {
    setChatInput(text);
  };

  const getActiveConv = () => conversations.find(c => c.id === activeConvId);

  // Filter conversation list based on search query
  const filteredConversations = conversations.filter(c => {
    const leadName = c.lead?.nombreCompleto || c.telefono;
    return leadName.toLowerCase().includes(searchQuery.toLowerCase()) || c.telefono.includes(searchQuery);
  });

  return (
    <div className="flex h-full bg-white relative overflow-hidden">
      
      {/* COLUMN 1: Conversation List */}
      <div className={`w-full lg:w-80 border-r border-[#e2edf6] ${mobileView === "chat" ? "hidden lg:flex" : "flex"} flex-col flex-shrink-0 bg-[#f8fbfe]`}>
        {/* Messages Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#e2edf6]">
          <h2 className="text-xl font-extrabold text-[#026692]">Mensajes</h2>
          <button className="p-1.5 bg-[#026692] text-white hover:bg-[#1d4359] rounded-xl transition-all shadow-sm">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Global AI Toggle */}
        <div className={`px-4 py-2.5 flex items-center justify-between border-b ${
          globalIA ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-[#e2edf6]"
        } transition-colors`}>
          <div className="flex items-center gap-2">
            <Bot className={`w-3.5 h-3.5 ${globalIA ? "text-blue-600" : "text-slate-400"}`} />
            <span className={`text-[10px] font-extrabold uppercase tracking-wide ${
              globalIA ? "text-blue-700" : "text-slate-400"
            }`}>
              IA Global {globalIA ? "Activa" : "Inactiva"}
            </span>
          </div>
          <button
            onClick={handleToggleGlobalIA}
            disabled={togglingGlobalIA}
            title={globalIA ? "Desactivar IA para todos los leads" : "Activar IA para todos los leads"}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
              globalIA ? "bg-[#026692]" : "bg-slate-300"
            } ${togglingGlobalIA ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
              globalIA ? "translate-x-4.5" : "translate-x-0.5"
            }`} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#e2edf6]">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f0f7fc] border-0 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692]"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#f0f7fc]">
          {loadingChats ? (
            <p className="p-4 text-xs text-slate-400 text-center animate-pulse">Cargando chats...</p>
          ) : filteredConversations.map((conv) => {
            const isActive = conv.id === activeConvId;
            const leadName = conv.lead?.nombreCompleto || conv.telefono;
            const lastMsg = conv.mensajes?.[0]?.contenido || "Mensaje recibido...";
            
            return (
              <button 
                key={conv.id}
                onClick={() => {
                  setActiveConvId(conv.id);
                  setMobileView("chat");
                  if (typeof window !== "undefined" && window.history) {
                    window.history.replaceState({}, "", "/inbox");
                  }
                }}
                className={`w-full text-left p-4 flex items-start space-x-3 transition-all ${
                  isActive ? "bg-[#e8f4fd] border-l-4 border-[#026692]" : "hover:bg-[#f0f7fc]"
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#026692]/10 text-[#026692] flex items-center justify-center font-bold relative flex-shrink-0">
                  {leadName.split(' ').map(n=>n[0]).join('')}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                </div>
                
                {/* Message Snip */}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{leadName}</h4>
                    <span className="text-[10px] text-slate-400">{formatLastMessageTime(conv.ultimoMensajeEn)}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-1">{lastMsg}</p>
                  
                  {/* Badges */}
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="px-1.5 py-0.5 rounded bg-sky-50 text-[#026692] text-[8px] font-bold uppercase">NUEVO</span>
                    {conv.iaActiva && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-extrabold flex items-center gap-0.5">
                        <Bot className="w-2.5 h-2.5" /> IA
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* COLUMN 2: Chat area */}
      <div className={`flex-1 ${mobileView === "list" ? "hidden lg:flex" : "flex"} flex-col h-full bg-[#f4f8fc]`}>
        
        {/* Chat Window Header */}
        <div className="h-16 border-b border-[#e2edf6] bg-white px-4 md:px-6 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center space-x-2.5">
            {/* Back button on Mobile */}
            <button
              onClick={() => setMobileView("list")}
              className="lg:hidden p-1.5 text-[#026692] hover:bg-[#e8f4fd] rounded-xl flex items-center gap-1 font-bold text-xs"
              aria-label="Volver a lista de chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-full bg-[#026692] text-white flex items-center justify-center font-bold flex-shrink-0">
              {getActiveConv() ? (getActiveConv()?.lead?.nombreCompleto || getActiveConv()?.telefono || "NP").split(' ').filter(Boolean).map(n=>n[0]).join('').slice(0,2).toUpperCase() : (activeLead ? activeLead.nombreCompleto.split(' ').map(n=>n[0]).join('') : "NP")}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-sm truncate max-w-[160px] md:max-w-none">
                {getActiveConv() ? (getActiveConv()?.lead?.nombreCompleto || getActiveConv()?.telefono) : (activeLead ? activeLead.nombreCompleto : "Conversación")}
              </h3>
              {(getActiveConv()?.telefono || activeLead?.telefono) && (
                <p className="text-[10px] md:text-[11px] font-semibold text-slate-500 leading-none my-0.5 truncate">
                  📞 {formatPhoneNumber(getActiveConv()?.telefono || activeLead?.telefono)}
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

          {/* AI toggler & Lead details trigger for Mobile */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="flex items-center space-x-1.5 md:space-x-2 bg-[#f4f8fc] px-2.5 py-1.5 rounded-xl border border-[#e8f2fa]">
              <span className="text-[10px] md:text-xs font-bold text-slate-500">IA</span>
              <button 
                onClick={() => handleToggleAI(getActiveConv()?.iaActiva || false)}
                className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  getActiveConv()?.iaActiva ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span 
                  className={`pointer-events-none inline-block h-4 w-4 md:h-5 md:w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    getActiveConv()?.iaActiva ? "translate-x-4 md:translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-[9px] md:text-[10px] font-extrabold uppercase ${getActiveConv()?.iaActiva ? "text-emerald-500" : "text-slate-400"}`}>
                {getActiveConv()?.iaActiva ? "Activo" : "Pausado"}
              </span>
            </div>

            {/* Info button to open Lead Details Modal on Mobile */}
            <button
              onClick={() => setShowMobileDetails(true)}
              className="lg:hidden p-2 text-[#026692] hover:bg-[#e8f4fd] rounded-xl flex items-center justify-center border border-[#d4e6f4]"
              title="Ver Ficha del Lead"
            >
              <Info className="w-5 h-5" />
            </button>

            <button className="hidden lg:block p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div key={activeConvId} ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
          
          {messages.length === 0 ? (
            <p className="text-center text-xs text-slate-400 my-8">Sin mensajes previos en esta conversación.</p>
          ) : messages.map((msg, index) => {
            const isClient = msg.direccion === "INBOUND";
            const isIA = msg.tipoRemitente === "IA";
            
            const currentDateText = getMessageDateDividerText(msg.creadoEn);
            const prevMsg = index > 0 ? messages[index - 1] : null;
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
                  id={`msg-${msg.id}`}
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
                  
                  {/* AI header label */}
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
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
                  )}
                  
                  {/* Time / checkmark / edit indicator */}
                  <div className={`text-[9px] font-bold text-right mt-1.5 flex items-center justify-end gap-1 ${
                    isClient ? "text-slate-400" : isIA ? "text-sky-200" : "text-slate-400"
                  }`}>
                    {msg.editado && <span className="italic opacity-80">(editado)</span>}
                    <span>{new Date(msg.creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {!isClient && <span>✓✓</span>}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input form */}
        <div className="p-4 bg-white border-t border-[#e2edf6] flex-shrink-0 z-10 shadow-inner relative">
          
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
          
          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-4 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 grid grid-cols-7 gap-1 z-30 max-w-[240px]">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg text-sm"
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
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3 bg-[#f0f7fc] border border-[#d4e6f4] rounded-2xl px-4 py-2">
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
                placeholder="Escribe un mensaje..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onFocus={() => setShowEmojiPicker(false)}
                className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-sm text-slate-800"
              />
              <button 
                type="submit"
                disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white flex items-center justify-center transition-all shadow-sm flex-shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          )}
        </div>

      </div>

      {/* COLUMN 3: Lead Details Card on Right (Desktop) */}
      <div key={activeConvId} className="hidden lg:flex w-80 border-l border-[#e2edf6] flex-col flex-shrink-0 bg-white overflow-y-auto custom-scrollbar p-6 space-y-6">
        {activeLead && getActiveConv()?.idLead && activeLead.id === getActiveConv()?.idLead ? (
          <>
            {/* Top Avatar & Name */}
            <div className="text-center space-y-3 pb-6 border-b border-[#f0f7fc]">
              <div className="w-24 h-24 mx-auto rounded-full bg-[#026692]/10 text-[#026692] border border-[#e2edf6] flex items-center justify-center text-3xl font-extrabold shadow-sm">
                {activeLead.nombreCompleto.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-800 text-lg leading-tight">{activeLead.nombreCompleto}</h3>
                {(activeLead.telefono || getActiveConv()?.telefono) && (
                  <p className="text-xs font-extrabold text-[#026692] flex items-center justify-center gap-1 my-1">
                    📞 {formatPhoneNumber(activeLead.telefono || getActiveConv()?.telefono)}
                  </p>
                )}
                {renderStatusBadge(activeLead)}
              </div>
            </div>

            {/* Profile Info fields */}
            <div className="space-y-4 text-xs">
              <h4 className="font-extrabold text-[#026692] uppercase tracking-wider text-[10px]">Información del Lead</h4>
              
              {/* Location */}
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-[#f4f8fc] rounded-xl text-[#026692] mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block">Ciudad y Zona</span>
                  <span className="font-bold text-slate-700">{activeLead.ciudad}, {activeLead.zona}</span>
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
                    {formatLeadAges(activeLead)}
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
                  <span className="font-bold text-slate-700 uppercase leading-snug">{activeLead.interesServicio}</span>
                </div>
              </div>
            </div>

            {/* Intención Comercial */}
            <FormattedIntencionComercial 
              lead={activeLead}
              title={
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#026692] flex items-center gap-1.5 font-extrabold">
                  <Bot className="w-3.5 h-3.5" /> Intención Comercial
                </span>
              }
            />

            {/* Internal Notes card */}
            <div className="bg-[#fcfdfd] border border-[#e2edf6] p-4 rounded-2xl shadow-sm space-y-2">
              <span className="text-[9px] uppercase font-bold tracking-wider text-[#026692] flex items-center gap-1.5 font-extrabold">
                <MessageSquare className="w-3.5 h-3.5" /> Notas del Agente
              </span>
              {activeLead.notas && activeLead.notas.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {activeLead.notas.map(n => (
                    <div key={n.id} className="text-[10px] text-slate-600 leading-relaxed border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                      <p className="italic">"{renderNoteContent(n.contenido, activeLead.nombreCompleto)}"</p>
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
              {activeLead.cotizaciones && activeLead.cotizaciones.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {activeLead.cotizaciones.map((quote) => (
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

            {/* Quick action buttons */}
            <div className="space-y-3 pt-4 border-t border-[#f0f7fc]">
              <button
                onClick={openQuoteModal}
                className="w-full bg-[#026692] hover:bg-[#1d4359] text-white py-3 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-sky-200" /> Generar Cotización
              </button>
              
              {activeLead.estado !== "GANADO" ? (
                <button
                  onClick={handleCloseWon}
                  className="w-full bg-white hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 border-2 border-emerald-500 hover:border-emerald-600 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5"
                >
                  ✓ Cerrar Ganado
                </button>
              ) : (
                <div className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> ¡Deal Ganado! (Cliente)
                </div>
              )}

              {activeLead.estado !== "PERDIDO" ? (
                <button
                  onClick={handleCloseLost}
                  className="w-full bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-300 hover:border-rose-400 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 mt-2"
                >
                  <X className="w-4 h-4 text-rose-500" /> Marcar como Perdido
                </button>
              ) : (
                <div className="w-full bg-rose-50 text-rose-600 border border-rose-200 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 mt-2">
                  <X className="w-4 h-4 text-rose-500" /> Lead Cerrado (Perdido)
                </div>
              )}

              {activeLead.estado !== "CONTACTADO" && (
                <button
                  onClick={handleMarkContacted}
                  className="w-full bg-[#f4f8fc] hover:bg-[#e8f4fd] text-[#026692] border border-[#cbdfe9] py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" /> Contactado
                </button>
              )}
            </div>
          </>
        ) : getActiveConv() ? (
          <div className="text-center space-y-3 py-8 animate-pulse">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#026692]/10 text-[#026692] border border-[#e2edf6] flex items-center justify-center text-2xl font-extrabold shadow-sm">
              {(getActiveConv()?.lead?.nombreCompleto || getActiveConv()?.telefono || "NP").split(' ').filter(Boolean).map(n=>n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-base leading-tight">{getActiveConv()?.lead?.nombreCompleto || getActiveConv()?.telefono}</h3>
              <p className="text-[11px] text-slate-400 font-bold">Sincronizando información...</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-8">Selecciona un chat para ver su ficha comercial.</p>
        )}
      </div>

      {/* MODAL CREAR COTIZACION */}
      {isQuoteModalOpen && activeLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-[#026692]">
                <FileText className="w-5 h-5" />
                <h3 className="font-extrabold text-slate-800 text-lg">Crear Precotización</h3>
              </div>
              <button 
                onClick={() => setIsQuoteModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 custom-scrollbar">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Tipo de Servicio */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Servicio</label>
                  <select 
                    value={quoteForm.tipoServicio}
                    onChange={(e) => handleQuoteFormChange("tipoServicio", e.target.value)}
                    className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  >
                    <option value="FIXA SEMANAL">FIXA SEMANAL</option>
                    <option value="FIXA MENSUAL">FIXA MENSUAL</option>
                    <option value="EVENTUAL">EVENTUAL</option>
                    <option value="NEURONANNY">NEURONANNY</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>

                {/* Ciudad */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ciudad</label>
                  <select 
                    value={quoteForm.ciudad}
                    onChange={(e) => handleQuoteFormChange("ciudad", e.target.value)}
                    className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  >
                    <option value="Puebla">Puebla</option>
                    <option value="CDMX">CDMX</option>
                    <option value="Querétaro">Querétaro</option>
                    <option value="Atlixco">Atlixco</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Zona */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Zona</label>
                  <input 
                    type="text"
                    value={quoteForm.zona}
                    onChange={(e) => handleQuoteFormChange("zona", e.target.value)}
                    placeholder="Ej. Polanco, Angelópolis"
                    className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  />
                </div>

                {/* Días */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Días del Servicio</label>
                  <input 
                    type="text"
                    value={quoteForm.dias}
                    onChange={(e) => handleQuoteFormChange("dias", e.target.value)}
                    placeholder="Ej. Lunes a Viernes"
                    className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Hora Inicio */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hora Inicio</label>
                  <input 
                    type="text"
                    value={quoteForm.horaInicio}
                    onChange={(e) => handleQuoteFormChange("horaInicio", e.target.value)}
                    placeholder="09:00"
                    className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  />
                </div>

                {/* Hora Fin */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hora Fin</label>
                  <input 
                    type="text"
                    value={quoteForm.horaFin}
                    onChange={(e) => handleQuoteFormChange("horaFin", e.target.value)}
                    placeholder="17:00"
                    className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  />
                </div>

                {/* Horas por día */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Horas/Día</label>
                  <input 
                    type="number"
                    value={quoteForm.horasPorDia}
                    onChange={(e) => handleQuoteFormChange("horasPorDia", parseInt(e.target.value, 10))}
                    className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Cantidad de Peques */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peques</label>
                  <input 
                    type="number"
                    value={quoteForm.cantidadHijos}
                    onChange={(e) => handleQuoteFormChange("cantidadHijos", parseInt(e.target.value, 10))}
                    className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  />
                </div>

                {/* Subtotal */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subtotal ($)</label>
                  <input 
                    type="number"
                    value={quoteForm.subtotal || ""}
                    onChange={(e) => handleQuoteFormChange("subtotal", parseFloat(e.target.value))}
                    placeholder="0"
                    className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  />
                </div>

                {/* Descuento */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descuento ($)</label>
                  <input 
                    type="number"
                    value={quoteForm.descuento || ""}
                    onChange={(e) => handleQuoteFormChange("descuento", parseFloat(e.target.value))}
                    placeholder="0"
                    className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                  />
                </div>
              </div>

              {/* Total (read only highlight) */}
              <div className="bg-sky-50 border border-sky-100 p-3 rounded-2xl flex justify-between items-center">
                <span className="text-xs font-bold text-[#026692] uppercase tracking-wider">Total a Cotizar</span>
                <span className="text-xl font-extrabold text-[#D53F8C]">${quoteForm.total.toLocaleString("es-MX")} MXN</span>
              </div>

              {/* Notas (Detalle del precio) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notas (Detalle en Imagen)</label>
                <input 
                  type="text"
                  value={quoteForm.notas}
                  onChange={(e) => handleQuoteFormChange("notas", e.target.value)}
                  placeholder="Ej. (Precotización estimada semanal)"
                  className="w-full bg-[#f8fbfe] border border-[#d4e6f4] rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#026692]"
                />
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex space-x-3">
              <button
                type="button"
                onClick={() => handleSaveQuote(false)}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                Guardar y Descargar
              </button>
              <button
                type="button"
                onClick={() => handleSaveQuote(true)}
                className="flex-1 bg-[#026692] hover:bg-[#1d4359] text-white py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                ✓ Enviar al Cliente
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MOBILE LEAD DETAILS DRAWER MODAL */}
      {showMobileDetails && activeLead && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl overflow-y-auto custom-scrollbar p-6 space-y-6 animate-slide-left">
            <div className="flex items-center justify-between border-b border-[#e2edf6] pb-4 flex-shrink-0">
              <h3 className="font-extrabold text-[#026692] text-sm uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Expediente del Lead
              </h3>
              <button
                onClick={() => setShowMobileDetails(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar & Basic Info */}
            <div className="text-center space-y-3 pb-6 border-b border-[#f0f7fc]">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#026692]/10 text-[#026692] border border-[#e2edf6] flex items-center justify-center text-2xl font-extrabold shadow-sm">
                {activeLead.nombreCompleto.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-800 text-base leading-tight">{activeLead.nombreCompleto}</h3>
                {activeLead.telefono && (
                  <p className="text-xs font-extrabold text-[#026692] flex items-center justify-center gap-1 my-1">
                    📞 {formatPhoneNumber(activeLead.telefono)}
                  </p>
                )}
                {renderStatusBadge(activeLead)}
              </div>
            </div>

            {/* Profile Info fields */}
            <div className="space-y-4 text-xs">
              <h4 className="font-extrabold text-[#026692] uppercase tracking-wider text-[10px]">Información del Lead</h4>
              <div className="space-y-2.5">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#f4f8fc] rounded-xl text-[#026692] mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-bold block">Ciudad y Zona</span>
                    <span className="font-bold text-slate-700">{activeLead.ciudad}, {activeLead.zona}</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#f4f8fc] rounded-xl text-[#026692] mt-0.5">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-bold block">Edad del Niño/a</span>
                    <span className="font-bold text-slate-700">{formatLeadAges(activeLead)}</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#f4f8fc] rounded-xl text-[#026692] mt-0.5">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-bold block">Servicio de interés</span>
                    <span className="font-bold text-slate-700 uppercase leading-snug">{activeLead.interesServicio}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Intención Comercial */}
            <FormattedIntencionComercial 
              lead={activeLead}
              title={
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#026692] flex items-center gap-1.5 font-extrabold">
                  <Bot className="w-3.5 h-3.5" /> Intención Comercial
                </span>
              }
            />

            {/* Action buttons */}
            <div className="space-y-3 pt-4 border-t border-[#f0f7fc]">
              <button
                onClick={() => {
                  setShowMobileDetails(false);
                  openQuoteModal();
                }}
                className="w-full bg-[#026692] hover:bg-[#1d4359] text-white py-3 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-sky-200" /> Generar Cotización
              </button>
              
              {activeLead.estado !== "GANADO" ? (
                <button
                  onClick={() => {
                    handleCloseWon();
                    setShowMobileDetails(false);
                  }}
                  className="w-full bg-white hover:bg-emerald-50 text-emerald-600 border-2 border-emerald-500 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5"
                >
                  ✓ Cerrar Ganado
                </button>
              ) : (
                <div className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> ¡Deal Ganado!
                </div>
              )}

              {activeLead.estado !== "PERDIDO" && (
                <button
                  onClick={() => {
                    handleCloseLost();
                    setShowMobileDetails(false);
                  }}
                  className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 mt-2"
                >
                  <X className="w-4 h-4 text-rose-500" /> Marcar como Perdido
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal 
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          activeConvId={activeConvId}
          activeLead={activeLead}
          currentUser={currentUser}
          fetchMessages={fetchMessages}
          fetchConversations={fetchConversations}
        />
      )}
    </div>
  );
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
            // Filter to show APPROVED or PENDING
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
      // Count variables in body component
      const bodyComp = activeTemplate.components.find((c: any) => c.type === "BODY");
      const bodyText = bodyComp ? bodyComp.text : "";
      
      // Match {{number}} format
      const count = bodyText.match(/\{\{\d+\}\}/g)?.length || 0;
      
      const initialVars = Array(count).fill("");
      if (count > 0 && activeLead) {
        initialVars[0] = activeLead.nombreCompleto;
      }
      setTemplateVariables(initialVars);

      // Check if has image header
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
        {/* Header */}
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

        {/* Body */}
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
              {/* Select template */}
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
                  {/* Status Warning if Pending */}
                  {activeTemplate.status === "PENDING" && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-800 leading-normal font-medium">
                        Esta plantilla está <strong>En revisión</strong> por Meta. WhatsApp podría rechazar su envío hasta que el estado cambie oficialmente a "Aprobada".
                      </p>
                    </div>
                  )}

                  {/* Header Image field */}
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

                  {/* Body Variables fields */}
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

                  {/* Live Preview */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide block">
                      Vista previa del mensaje
                    </label>
                    <div className="bg-[#f0f2f5] rounded-2xl p-4 border border-slate-200">
                      {/* WhatsApp Bubble representation */}
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

                        {/* Buttons inside bubble */}
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

                  {/* Error display */}
                  {templateSendError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-600 font-semibold leading-normal animate-in shake-100 duration-200">
                      ❌ Error: {templateSendError}
                    </div>
                  )}

                  {/* Footer Actions */}
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

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full bg-[#f3f8fc]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#026692] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-[#026692]">Cargando Inbox...</p>
        </div>
      </div>
    }>
      <InboxContent />
    </Suspense>
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
