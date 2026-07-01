"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

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
  Save
} from "lucide-react";
import FormattedIntencionComercial from "@/components/FormattedIntencionComercial";
import { renderNoteContent } from "@/lib/narrative";
import confetti from "canvas-confetti";

interface Message {
  id: string;
  idConversacion: string;
  direccion: 'INBOUND' | 'OUTBOUND';
  tipoRemitente: 'CLIENT' | 'AGENT' | 'IA';
  contenido: string;
  urlMultimedia?: string;
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

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  
  // Inputs
  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Loading & interactive UI states
  const [loadingChats, setLoadingChats] = useState(true);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledForActiveConvRef = useRef<boolean>(false);

  // Emojis and files
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Poll messages and conversations every 1.5 seconds for real-time updates
  useEffect(() => {
    fetchConversations();
    if (activeConvId) {
      fetchMessages(activeConvId);
    }
    
    const interval = setInterval(() => {
      fetchConversations();
      if (activeConvId) {
        fetchMessages(activeConvId);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeConvId]);

  // Load active lead and reset scroll ref when active conversation changes
  useEffect(() => {
    hasScrolledForActiveConvRef.current = false;
    setMessages([]); // Clear messages immediately for immediate screen transition

    const activeConv = conversations.find(c => c.id === activeConvId);
    if (activeConv?.idLead) {
      fetchLeadDetails(activeConv.idLead);
    } else {
      setActiveLead(null);
    }
  }, [activeConvId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (!messagesEndRef.current || !chatContainerRef.current) return;
    
    const container = chatContainerRef.current;
    
    // Check if the user is already scrolled to the bottom (within a threshold of 150px)
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    
    if (!hasScrolledForActiveConvRef.current) {
      if (messages.length > 0) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "nearest" });
        hasScrolledForActiveConvRef.current = true;
      }
    } else if (isAtBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        // Sort by ultimoMensajeEn descending
        const sorted = data.sort((a: any, b: any) => new Date(b.ultimoMensajeEn).getTime() - new Date(a.ultimoMensajeEn).getTime());
        setConversations(sorted);
        
        // Auto select first conversation if none is active
        setActiveConvId(prev => {
          if (sorted.length > 0 && !prev) {
            return sorted[0].id;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => {
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
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveLead(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle AI switch
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

  // Send message as Agent
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput;
    setChatInput("");

    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
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
        fetchMessages(activeConvId);
        fetchConversations();
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

  // Mover a perdidos
  const handleCloseLost = async () => {
    if (!activeLead) return;
    try {
      const res = await fetch(`/api/leads/${activeLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "PERDIDO", motivoPerdida: "Tarifa no autorizada" }),
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
      <div className="w-80 border-r border-[#e2edf6] flex flex-col flex-shrink-0 bg-[#f8fbfe]">
        {/* Messages Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#e2edf6]">
          <h2 className="text-xl font-extrabold text-[#026692]">Mensajes</h2>
          <button className="p-1.5 bg-[#026692] text-white hover:bg-[#1d4359] rounded-xl transition-all shadow-sm">
            <Plus className="w-4 h-4" />
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
                onClick={() => setActiveConvId(conv.id)}
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
      <div className="flex-1 flex flex-col h-full bg-[#f4f8fc]">
        
        {/* Chat Window Header */}
        <div className="h-16 border-b border-[#e2edf6] bg-white px-6 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#026692] text-white flex items-center justify-center font-bold">
              {activeLead ? activeLead.nombreCompleto.split(' ').map(n=>n[0]).join('') : "NP"}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{activeLead ? activeLead.nombreCompleto : "Conversación"}</h3>
              <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> En línea
              </span>
            </div>
          </div>

          {/* AI toggler */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-[#f4f8fc] px-3 py-1.5 rounded-xl border border-[#e8f2fa]">
              <span className="text-xs font-bold text-slate-500">Asistente IA</span>
              <button 
                onClick={() => handleToggleAI(getActiveConv()?.iaActiva || false)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  getActiveConv()?.iaActiva ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span 
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    getActiveConv()?.iaActiva ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-[10px] font-extrabold uppercase ${getActiveConv()?.iaActiva ? "text-emerald-500" : "text-slate-400"}`}>
                {getActiveConv()?.iaActiva ? "Activo" : "Pausado"}
              </span>
            </div>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
          
          {messages.length === 0 ? (
            <p className="text-center text-xs text-slate-400 my-8">Sin mensajes previos en esta conversación.</p>
          ) : messages.map((msg) => {
            const isClient = msg.direccion === "INBOUND";
            const isIA = msg.tipoRemitente === "IA";
            
            return (
              <div 
                key={msg.id}
                className={`flex ${isClient ? "justify-start" : "justify-end"}`}
              >
                {/* Bubble Container */}
                <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm relative ${
                  isClient 
                    ? "bg-[#e1eff8] text-slate-800 rounded-tl-none border border-[#cbdfe9]" 
                    : isIA 
                      ? "bg-[#026692] text-white rounded-tr-none shadow-md" 
                      : "bg-white text-slate-800 rounded-tr-none border border-[#e2edf6]"
                }`}>
                  
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
                  
                  {/* Time / checkmark indicator */}
                  <div className={`text-[9px] font-bold text-right mt-1.5 ${
                    isClient ? "text-slate-400" : isIA ? "text-sky-200" : "text-slate-400"
                  }`}>
                    {new Date(msg.creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {!isClient && <span className="ml-1">✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input form */}
        <div className="p-4 bg-white border-t border-[#e2edf6] flex-shrink-0 z-10 shadow-inner relative">
          
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
        </div>

      </div>

      {/* COLUMN 3: Lead Details Card on Right */}
      <div className="w-80 border-l border-[#e2edf6] flex flex-col flex-shrink-0 bg-white overflow-y-auto custom-scrollbar p-6 space-y-6">
        {activeLead ? (
          <>
            {/* Top Avatar & Name */}
            <div className="text-center space-y-3 pb-6 border-b border-[#f0f7fc]">
              <div className="w-24 h-24 mx-auto rounded-full bg-[#026692]/10 text-[#026692] border border-[#e2edf6] flex items-center justify-center text-3xl font-extrabold shadow-sm">
                {activeLead.nombreCompleto.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-800 text-lg leading-tight">{activeLead.nombreCompleto}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-block ${
                  activeLead.estado === "NUEVO" ? "bg-sky-50 text-[#026692]" :
                  activeLead.estado === "CONTACTADO" ? "bg-amber-50 text-amber-600" :
                  activeLead.estado === "COTIZADO" ? "bg-blue-50 text-blue-600" :
                  activeLead.estado === "GANADO" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                }`}>
                  {activeLead.estado === "GANADO" ? "CLIENTE CERRADO" : "POTENCIAL " + activeLead.estado}
                </span>
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
                    {activeLead.edadHijo ? `${activeLead.edadHijo} años` : "Por definir"}
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

              {activeLead.estado !== "GANADO" && activeLead.estado !== "PERDIDO" && (
                <button
                  onClick={handleCloseLost}
                  className="w-full text-slate-400 hover:text-rose-500 text-xs font-bold text-center transition-all block mt-2"
                >
                  Mover a Perdidos
                </button>
              )}
            </div>
          </>
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
    </div>
  );
}
