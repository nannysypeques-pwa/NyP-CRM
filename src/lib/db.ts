import prisma from "./prisma";
import { cookies } from "next/headers";

let cacheFn: any = <T extends (...args: any[]) => any>(fn: T, keys: string[], options: any) => fn;
try {
  const { unstable_cache } = require("next/cache");
  if (typeof unstable_cache === "function") {
    cacheFn = unstable_cache;
  }
} catch (e) {
  // Ignorar errores en scripts fuera del servidor Next.js
}

// Lightweight In-Memory TTL Cache for ultra-fast performance (<2ms response)
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

function getCachedMemory<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCachedMemory(key: string, data: any, ttlMs: number = 15000) {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearMemoryCache(tag?: string) {
  if (!tag) {
    memoryCache.clear();
  } else {
    Array.from(memoryCache.keys()).forEach((key) => {
      if (key.includes(tag)) {
        memoryCache.delete(key);
      }
    });
  }
}

function getRequestFilter() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) return null;

    // Decrypt the session safely using Node crypto to avoid circular imports
    const [ivHex, tagHex, encryptedHex] = sessionCookie.split(".");
    if (!ivHex || !tagHex || !encryptedHex) return null;

    const crypto = require("crypto");
    const secret = process.env.SESSION_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
      console.error("CRITICAL SECURITY ERROR: SESSION_SECRET is not configured in production!");
      return null;
    }
    const SESSION_SECRET = secret || "nyp-crm-development-only-session-secret-key-32";
    const key = Buffer.from(SESSION_SECRET.padEnd(32).slice(0, 32));
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    const user = JSON.parse(decrypted);
    const activeCity = cookieStore.get("activeCity")?.value || "Todas";

    return {
      rol: user.rol,
      ciudad: user.ciudad, // assigned city
      selectedCity: activeCity
    };
  } catch (e) {
    return null;
  }
}

function getEffectiveCityTargets(filter: { rol: string; ciudad?: string | null; selectedCity?: string | null } | null): string[] | null {
  if (!filter) return null;
  // If the user has assigned coverage cities (e.g. "Puebla, CDMX" or "Xalapa"), ALWAYS restrict to those cities
  if (filter.ciudad && filter.ciudad.trim() !== "" && filter.ciudad.toUpperCase() !== "TODAS" && filter.ciudad.toUpperCase() !== "TODAS LAS CIUDADES") {
    const cities = filter.ciudad.split(",").map(c => c.trim()).filter(Boolean);
    if (cities.length > 0 && !cities.some(c => c.toUpperCase() === "TODAS")) {
      return cities;
    }
  }
  // Otherwise, use selectedCity if specified and not "Todas"
  if (filter.selectedCity && filter.selectedCity.trim() !== "" && filter.selectedCity.toUpperCase() !== "TODAS" && filter.selectedCity.toUpperCase() !== "TODAS LAS CIUDADES") {
    const cities = filter.selectedCity.split(",").map(c => c.trim()).filter(Boolean);
    if (cities.length > 0 && !cities.some(c => c.toUpperCase() === "TODAS")) {
      return cities;
    }
  }
  return null;
}

function getSecurityCityTargets(filter: { rol: string; ciudad?: string | null } | null): string[] | null {
  if (!filter) return null;
  // If the user has assigned coverage cities (e.g. "Puebla, CDMX" or "Xalapa"), ALWAYS restrict to those cities for security
  if (filter.ciudad && filter.ciudad.trim() !== "" && filter.ciudad.toUpperCase() !== "TODAS" && filter.ciudad.toUpperCase() !== "TODAS LAS CIUDADES") {
    const cities = filter.ciudad.split(",").map(c => c.trim()).filter(Boolean);
    if (cities.length > 0 && !cities.some(c => c.toUpperCase() === "TODAS")) {
      return cities;
    }
  }
  return null;
}

function buildMultiCityCondition(cityTargets: string[]) {
  const set = new Set<string>();

  for (const cityTarget of cityTargets) {
    const norm = cityTarget.trim().toUpperCase();
    if (norm === "PUEBLA" || norm === "ATLIXCO") {
      set.add("Puebla");
      set.add("Atlixco");
    } else if (norm === "CDMX" || norm.includes("MEXICO") || norm.includes("MÉXICO")) {
      set.add("CDMX");
      set.add("Ciudad de México");
      set.add("Ciudad de Mexico");
    } else if (norm.includes("QUERET") || norm.includes("QUERÉT")) {
      set.add("Querétaro");
      set.add("Queretaro");
    } else if (norm === "XALAPA") {
      set.add("Xalapa");
    } else {
      set.add(cityTarget);
    }
  }

  return { in: Array.from(set) };
}

function matchCity(itemCity: string | null | undefined, cityTargets: string[] | null): boolean {
  if (!cityTargets || cityTargets.length === 0) return true;
  if (!itemCity || itemCity.trim() === "" || itemCity.toUpperCase() === "POR DEFINIR") return true;

  const normItem = itemCity.trim().toUpperCase();
  for (const target of cityTargets) {
    const normTarget = target.trim().toUpperCase();
    if (normTarget === "PUEBLA" || normTarget === "ATLIXCO") {
      if (normItem.includes("PUEBLA") || normItem.includes("ATLIXCO")) return true;
    } else if (normTarget === "CDMX" || normTarget.includes("MEXICO") || normTarget.includes("MÉXICO")) {
      if (normItem.includes("CDMX") || normItem.includes("MEXICO") || normItem.includes("MÉXICO")) return true;
    } else if (normTarget.includes("QUERET") || normTarget.includes("QUERÉT")) {
      if (normItem.includes("QUERET") || normItem.includes("QUERÉT")) return true;
    } else if (normTarget === "XALAPA") {
      if (normItem.includes("XALAPA")) return true;
    } else {
      if (normItem.includes(normTarget)) return true;
    }
  }
  return false;
}

// Definición de Interfaces en Español
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  urlAvatar: string | null;
}

export interface Hijo {
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

export interface NotaLead {
  id: string;
  idLead: string;
  contenido: string;
  nombreAgente: string;
  creadoEn: string;
}

export interface Seguimiento {
  id: string;
  idLead: string;
  idUsuarioAsignado?: string;
  titulo: string;
  descripcion?: string;
  fechaVencimiento: string;
  estado: 'PENDIENTE' | 'COMPLETADO' | 'VENCIDO';
  completadoEn?: string;
}

export interface Cotizacion {
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
  estado: 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA';
  validoHasta: string;
  notas?: string;
  creadoPor: string;
}

export interface Lead {
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
  nivelUrgencia: 'BAJA' | 'MEDIA' | 'ALTA';
  estado: 'NUEVO' | 'CONTACTADO' | 'COTIZADO' | 'GANADO' | 'PERDIDO' | 'ATENCION_HUMANA';
  contactado?: boolean;
  idUsuarioAsignado?: string | null;
  ultimoContactoEn: string;
  siguienteSeguimientoEn?: string;
  motivoPerdida?: string;
  resumenIA?: string;
  datosFaltantes?: string[];
  linkUbicacion?: string;
  razonContratacion?: string;
  mascotas?: string;
  indicacionesIngreso?: string;
  hijos?: Hijo[];
  notas?: NotaLead[];
  seguimientos?: Seguimiento[];
  cotizaciones?: Cotizacion[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface Mensaje {
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

export interface Conversacion {
  id: string;
  idLead?: string;
  telefono: string;
  estado: 'NUEVA' | 'ABIERTA' | 'IA_ACTIVA' | 'CERRADA';
  idUsuarioAsignado?: string;
  iaActiva: boolean;
  ultimoMensajeEn: string;
  lead?: {
    nombreCompleto: string;
  };
  mensajes?: Mensaje[];
}

export interface RespuestaRapida {
  id: string;
  titulo: string;
  categoria: string;
  contenido: string;
}

export interface DocumentoConocimiento {
  id: string;
  titulo: string;
  categoria: string;
  contenido: string;
  estado: string;
}

// Clase base de datos que se conecta a Supabase a través de Prisma Client
class BaseDeDatos {
  async getUsuarios(): Promise<Usuario[]> {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { nombre: 'asc' }
    });
    return usuarios as unknown as Usuario[];
  }

  async getLeads(): Promise<Lead[]> {
    const filter = getRequestFilter();
    const cityTargets = getEffectiveCityTargets(filter);
    const cacheKey = `leads:${JSON.stringify(cityTargets || "ALL")}`;
    const cached = getCachedMemory<Lead[]>(cacheKey);
    if (cached) return cached;

    // Fast indexed query directly on Lead
    const leads = await prisma.lead.findMany({
      where: { deleted: false },
      include: {
        hijos: true,
        notas: { orderBy: { creadoEn: 'desc' } },
        seguimientos: { orderBy: { fechaVencimiento: 'asc' } },
        cotizaciones: { orderBy: { creadoEn: 'desc' } }
      },
      orderBy: {
        creadoEn: 'desc'
      }
    });

    const filteredLeads = (cityTargets && cityTargets.length > 0)
      ? leads.filter(l => matchCity(l.ciudad, cityTargets))
      : leads;

    const result = filteredLeads.map(l => ({
      ...l,
      ultimoContactoEn: l.ultimoContactoEn.toISOString(),
      siguienteSeguimientoEn: l.siguienteSeguimientoEn?.toISOString() || undefined,
      datosFaltantes: l.datosFaltantes ? JSON.parse(l.datosFaltantes) : [],
      hijos: l.hijos || [],
      notas: l.notas.map(n => ({ ...n, creadoEn: n.creadoEn.toISOString() })) || [],
      seguimientos: l.seguimientos.map(f => ({
        ...f,
        fechaVencimiento: f.fechaVencimiento.toISOString(),
        completadoEn: f.completadoEn?.toISOString() || undefined
      })) || [],
      cotizaciones: l.cotizaciones.map(q => ({ ...q, validoHasta: q.validoHasta.toISOString() })) || [],
      creadoEn: l.creadoEn.toISOString(),
      actualizadoEn: l.actualizadoEn.toISOString()
    })) as unknown as Lead[];

    setCachedMemory(cacheKey, result, 60000);
    return result;
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const filter = getRequestFilter();
    const cityTargets = getSecurityCityTargets(filter);

    const lead = await prisma.lead.findFirst({
      where: { id, deleted: false },
      include: {
        hijos: true,
        notas: { orderBy: { creadoEn: 'desc' } },
        seguimientos: { orderBy: { fechaVencimiento: 'asc' } },
        cotizaciones: { orderBy: { creadoEn: 'desc' } }
      }
    });

    if (!lead) return undefined;
    if (cityTargets && cityTargets.length > 0 && !matchCity(lead.ciudad, cityTargets)) {
      return undefined;
    }

    return {
      ...lead,
      ultimoContactoEn: lead.ultimoContactoEn.toISOString(),
      siguienteSeguimientoEn: lead.siguienteSeguimientoEn?.toISOString() || undefined,
      datosFaltantes: lead.datosFaltantes ? JSON.parse(lead.datosFaltantes) : [],
      hijos: lead.hijos || [],
      notas: lead.notas.map(n => ({ ...n, creadoEn: n.creadoEn.toISOString() })) || [],
      seguimientos: lead.seguimientos.map(f => ({
        ...f,
        fechaVencimiento: f.fechaVencimiento.toISOString(),
        completadoEn: f.completadoEn?.toISOString() || undefined
      })) || [],
      cotizaciones: lead.cotizaciones.map(q => ({ ...q, validoHasta: q.validoHasta.toISOString() })) || [],
      creadoEn: lead.creadoEn.toISOString(),
      actualizadoEn: lead.actualizadoEn.toISOString()
    } as unknown as Lead;
  }

  async createLead(leadData: Omit<Lead, 'id' | 'creadoEn' | 'actualizadoEn' | 'ultimoContactoEn' | 'seguimientos' | 'notas' | 'cotizaciones'>): Promise<Lead> {
    clearMemoryCache("leads");
    clearMemoryCache("convs");
    const { hijos, datosFaltantes, ...rest } = leadData;

    const lead = await prisma.lead.create({
      data: {
        ...rest,
        datosFaltantes: datosFaltantes ? JSON.stringify(datosFaltantes) : undefined,
        hijos: hijos ? {
          create: hijos.map(c => ({
            nombre: c.nombre,
            textoEdad: c.textoEdad,
            necesidades: c.necesidades,
            instrucciones: c.instrucciones
          }))
        } : undefined
      },
      include: {
        hijos: true,
        notas: true,
        seguimientos: true,
        cotizaciones: true
      }
    });

    return {
      ...lead,
      ultimoContactoEn: lead.ultimoContactoEn.toISOString(),
      siguienteSeguimientoEn: lead.siguienteSeguimientoEn?.toISOString() || undefined,
      datosFaltantes: lead.datosFaltantes ? JSON.parse(lead.datosFaltantes) : [],
      hijos: lead.hijos || [],
      notas: [],
      seguimientos: [],
      cotizaciones: [],
      creadoEn: lead.creadoEn.toISOString(),
      actualizadoEn: lead.actualizadoEn.toISOString()
    } as unknown as Lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    clearMemoryCache("leads");
    clearMemoryCache("convs");
    const { hijos, notas, seguimientos, cotizaciones, datosFaltantes, ...rest } = updates;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...rest,
        datosFaltantes: datosFaltantes ? JSON.stringify(datosFaltantes) : undefined
      },
      include: {
        hijos: true,
        notas: { orderBy: { creadoEn: 'desc' } },
        seguimientos: { orderBy: { fechaVencimiento: 'asc' } },
        cotizaciones: { orderBy: { creadoEn: 'desc' } }
      }
    });

    return {
      ...lead,
      ultimoContactoEn: lead.ultimoContactoEn.toISOString(),
      siguienteSeguimientoEn: lead.siguienteSeguimientoEn?.toISOString() || undefined,
      datosFaltantes: lead.datosFaltantes ? JSON.parse(lead.datosFaltantes) : [],
      hijos: lead.hijos || [],
      notas: lead.notas.map(n => ({ ...n, creadoEn: n.creadoEn.toISOString() })) || [],
      seguimientos: lead.seguimientos.map(f => ({
        ...f,
        fechaVencimiento: f.fechaVencimiento.toISOString(),
        completadoEn: f.completadoEn?.toISOString() || undefined
      })) || [],
      cotizaciones: lead.cotizaciones.map(q => ({ ...q, validoHasta: q.validoHasta.toISOString() })) || [],
      creadoEn: lead.creadoEn.toISOString(),
      actualizadoEn: lead.actualizadoEn.toISOString()
    } as unknown as Lead;
  }

  async deleteLead(id: string): Promise<void> {
    clearMemoryCache("leads");
    clearMemoryCache("convs");
    await prisma.lead.update({
      where: { id },
      data: { deleted: true }
    });
  }

  async getConversations(): Promise<Conversacion[]> {
    const filter = getRequestFilter();
    const cityTargets = getEffectiveCityTargets(filter);
    const cacheKey = `convs:${JSON.stringify(cityTargets || "ALL")}`;
    const cached = getCachedMemory<Conversacion[]>(cacheKey);
    if (cached) return cached;

    // Fast indexed query directly on Conversacion without Postgres subquery overhead
    const conversations = await prisma.conversacion.findMany({
      where: { deleted: false },
      include: {
        lead: {
          select: {
            nombreCompleto: true,
            ciudad: true
          }
        },
        mensajes: {
          orderBy: { creadoEn: 'desc' },
          take: 1
        }
      },
      orderBy: {
        ultimoMensajeEn: 'desc'
      }
    });

    const filteredConvs = (cityTargets && cityTargets.length > 0)
      ? conversations.filter(c => !c.lead || matchCity(c.lead.ciudad, cityTargets))
      : conversations;

    const result = filteredConvs.map(c => ({
      ...c,
      ultimoMensajeEn: c.ultimoMensajeEn.toISOString(),
      mensajes: c.mensajes.map(m => ({
        ...m,
        creadoEn: m.creadoEn.toISOString()
      }))
    })) as unknown as Conversacion[];

    setCachedMemory(cacheKey, result, 60000);
    return result;
  }

  async getConversationById(id: string): Promise<Conversacion | undefined> {
    const filter = getRequestFilter();
    const cityTargets = getSecurityCityTargets(filter);

    const conv = await prisma.conversacion.findFirst({
      where: { id, deleted: false },
      include: {
        lead: {
          select: {
            ciudad: true
          }
        }
      }
    });
    if (!conv) return undefined;
    if (cityTargets && cityTargets.length > 0 && conv.lead && !matchCity(conv.lead.ciudad, cityTargets)) {
      return undefined;
    }
    return {
      ...conv,
      ultimoMensajeEn: conv.ultimoMensajeEn.toISOString()
    } as unknown as Conversacion;
  }

  async getConversationByPhone(phone: string): Promise<Conversacion | undefined> {
    const filter = getRequestFilter();
    const cityTargets = getSecurityCityTargets(filter);

    const conv = await prisma.conversacion.findFirst({
      where: { telefono: phone, deleted: false },
      include: {
        lead: {
          select: {
            ciudad: true
          }
        }
      }
    });
    if (!conv) return undefined;
    if (cityTargets && cityTargets.length > 0 && conv.lead && !matchCity(conv.lead.ciudad, cityTargets)) {
      return undefined;
    }
    return {
      ...conv,
      ultimoMensajeEn: conv.ultimoMensajeEn.toISOString()
    } as unknown as Conversacion;
  }

  async getOrCreateConversationByPhone(incomingPhone: string, contactName?: string): Promise<Conversacion> {
    const normalize = (p: string) => p.replace(/\D/g, "");
    const cleanIncoming = normalize(incomingPhone);
    const cleanIncomingMex = (cleanIncoming.startsWith("521") && cleanIncoming.length === 13)
      ? "52" + cleanIncoming.slice(3)
      : cleanIncoming;

    // Direct indexed query using exact or formatted phone candidates
    const phoneCandidates = Array.from(new Set([
      incomingPhone,
      cleanIncoming,
      cleanIncomingMex,
      `+${cleanIncomingMex}`,
      `+${cleanIncoming}`,
      cleanIncoming.slice(-10) // 10 digits
    ])).filter(Boolean);

    // Try direct indexed match first for instant DB performance (<5ms)
    let matchedConv = await prisma.conversacion.findFirst({
      where: {
        deleted: false,
        OR: phoneCandidates.map(p => ({ telefono: { contains: p } }))
      }
    });

    if (!matchedConv) {
      // Fast fallback search only on candidate matches if contains was slightly ambiguous
      const candidates = await prisma.conversacion.findMany({
        where: {
          deleted: false,
          telefono: { contains: cleanIncomingMex.slice(-8) }
        },
        take: 20
      });
      matchedConv = candidates.find(c => {
        const cleanC = normalize(c.telefono);
        const cleanCMex = (cleanC.startsWith("521") && cleanC.length === 13)
          ? "52" + cleanC.slice(3)
          : cleanC;
        return cleanCMex === cleanIncomingMex || cleanC.slice(-10) === cleanIncomingMex.slice(-10);
      }) || null;
    }

    if (matchedConv) {
      return {
        ...matchedConv,
        ultimoMensajeEn: matchedConv.ultimoMensajeEn.toISOString()
      } as unknown as Conversacion;
    }

    let matchedLead = await prisma.lead.findFirst({
      where: {
        deleted: false,
        OR: phoneCandidates.map(p => ({ telefono: { contains: p } }))
      }
    });

    if (!matchedLead) {
      const candidates = await prisma.lead.findMany({
        where: {
          deleted: false,
          telefono: { contains: cleanIncomingMex.slice(-8) }
        },
        take: 20
      });
      matchedLead = candidates.find(l => {
        const cleanL = normalize(l.telefono);
        const cleanLMex = (cleanL.startsWith("521") && cleanL.length === 13)
          ? "52" + cleanL.slice(3)
          : cleanL;
        return cleanLMex === cleanIncomingMex || cleanL.slice(-10) === cleanIncomingMex.slice(-10);
      }) || null;
    }

    if (matchedLead) {
      // Leer el estado global de IA para aplicarlo a la nueva conversación
      let iaActivaDefault = true;
      try {
        const { getGlobalIA } = await import("@/lib/iaGlobal");
        iaActivaDefault = getGlobalIA();
      } catch (_) {}

      const newConv = await prisma.conversacion.create({
        data: {
          idLead: matchedLead.id,
          telefono: matchedLead.telefono,
          iaActiva: iaActivaDefault,
          estado: "ABIERTA"
        }
      });
      return {
        ...newConv,
        ultimoMensajeEn: newConv.ultimoMensajeEn.toISOString()
      } as unknown as Conversacion;
    }

    const newLead = await prisma.lead.create({
      data: {
        nombreCompleto: contactName || `Cliente WhatsApp (+${incomingPhone})`,
        telefono: `+${cleanIncomingMex}`,
        ciudad: "Por definir",
        zona: "Por definir",
        origen: "WhatsApp Directo",
        interesServicio: "Por definir",
        estado: "NUEVO"
      }
    });

    // Leer el estado global de IA para aplicarlo a la nueva conversación
    let iaActivaForNew = true;
    try {
      const { getGlobalIA } = await import("@/lib/iaGlobal");
      iaActivaForNew = getGlobalIA();
    } catch (_) {}

    const newConv = await prisma.conversacion.create({
      data: {
        idLead: newLead.id,
        telefono: newLead.telefono,
        iaActiva: iaActivaForNew,
        estado: "NUEVA"
      }
    });

    return {
      ...newConv,
      ultimoMensajeEn: newConv.ultimoMensajeEn.toISOString()
    } as unknown as Conversacion;
  }


  async getMessagesByConversationId(conversationId: string): Promise<Mensaje[]> {
    try {
      const rawMsgs: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "idConversacion", "direccion", "tipoRemitente", "idRemitente", "contenido", "urlMultimedia", "idMensajeRespondido", "textoCitado", "editado", "estado", "creadoEn"
         FROM "Mensaje"
         WHERE "idConversacion" = $1
         ORDER BY "creadoEn" ASC`,
        conversationId
      );
      return rawMsgs.map(m => ({
        ...m,
        idMensajeRespondido: m.idMensajeRespondido || null,
        textoCitado: m.textoCitado || null,
        editado: m.editado || false,
        creadoEn: typeof m.creadoEn === "string" ? m.creadoEn : (m.creadoEn ? m.creadoEn.toISOString() : new Date().toISOString())
      })) as unknown as Mensaje[];
    } catch (err: any) {
      console.warn("[PRISMA FALLBACK] Error en raw SQL getMessagesByConversationId, usando findMany:", err.message);
      const messages = await prisma.mensaje.findMany({
        where: { idConversacion: conversationId },
        orderBy: { creadoEn: 'asc' }
      });
      return messages.map(m => ({
        ...m,
        idMensajeRespondido: (m as any).idMensajeRespondido || null,
        textoCitado: (m as any).textoCitado || null,
        editado: (m as any).editado || false,
        creadoEn: typeof m.creadoEn === "string" ? m.creadoEn : m.creadoEn.toISOString()
      })) as unknown as Mensaje[];
    }
  }

  async addMessage(messageData: Omit<Mensaje, 'id' | 'creadoEn'> & { creadoEn?: Date | string }): Promise<Mensaje> {
    clearMemoryCache("convs");
    clearMemoryCache("leads");
    
    let msg: any = null;
    const msgId = (messageData as any).id || crypto.randomUUID();
    const creadoEnDate = messageData.creadoEn ? new Date(messageData.creadoEn) : new Date();

    try {
      msg = await prisma.mensaje.create({
        data: {
          id: msgId,
          idConversacion: messageData.idConversacion,
          direccion: messageData.direccion,
          tipoRemitente: messageData.tipoRemitente,
          idRemitente: messageData.idRemitente || null,
          contenido: messageData.contenido,
          urlMultimedia: (messageData as any).urlMultimedia || null,
          idMensajeRespondido: (messageData as any).idMensajeRespondido || null,
          textoCitado: (messageData as any).textoCitado || null,
          creadoEn: creadoEnDate
        }
      });
    } catch (err: any) {
      console.warn("[PRISMA FALLBACK] Error al insertar mensaje con Prisma, ejecutando raw SQL:", err.message);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Mensaje" ("id", "idConversacion", "direccion", "tipoRemitente", "idRemitente", "contenido", "urlMultimedia", "idMensajeRespondido", "textoCitado", "estado", "creadoEn") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DELIVERED', $10)`,
        msgId,
        messageData.idConversacion,
        messageData.direccion,
        messageData.tipoRemitente,
        messageData.idRemitente || null,
        messageData.contenido,
        (messageData as any).urlMultimedia || null,
        (messageData as any).idMensajeRespondido || null,
        (messageData as any).textoCitado || null,
        creadoEnDate
      );
      msg = {
        id: msgId,
        idConversacion: messageData.idConversacion,
        direccion: messageData.direccion,
        tipoRemitente: messageData.tipoRemitente,
        idRemitente: messageData.idRemitente,
        contenido: messageData.contenido,
        urlMultimedia: (messageData as any).urlMultimedia || null,
        idMensajeRespondido: (messageData as any).idMensajeRespondido || null,
        textoCitado: (messageData as any).textoCitado || null,
        estado: "DELIVERED",
        creadoEn: creadoEnDate
      };
    }

    // Update conversation ultimoMensajeEn and lead ultimoContactoEn
    const conv = await prisma.conversacion.update({
      where: { id: messageData.idConversacion },
      data: { ultimoMensajeEn: creadoEnDate }
    });

    if (conv.idLead) {
      await prisma.lead.update({
        where: { id: conv.idLead },
        data: { ultimoContactoEn: creadoEnDate }
      });
    }

    return {
      ...msg,
      creadoEn: typeof msg.creadoEn === "string" ? msg.creadoEn : msg.creadoEn.toISOString()
    } as unknown as Mensaje;
  }

  async updateMessage(id: string, contenido: string): Promise<Mensaje> {
    clearMemoryCache("convs");
    let msg: any = null;
    try {
      msg = await prisma.mensaje.update({
        where: { id },
        data: {
          contenido,
          editado: true,
          editadoEn: new Date()
        }
      });
    } catch (err: any) {
      console.warn("[PRISMA FALLBACK] Error al actualizar mensaje con Prisma, ejecutando raw SQL:", err.message);
      await prisma.$executeRawUnsafe(
        `UPDATE "Mensaje" SET "contenido" = $1, "editado" = true, "editadoEn" = $2 WHERE "id" = $3`,
        contenido, new Date(), id
      );
      msg = await prisma.mensaje.findUnique({ where: { id } });
    }
    return {
      ...msg,
      creadoEn: typeof msg.creadoEn === "string" ? msg.creadoEn : msg.creadoEn.toISOString()
    } as unknown as Mensaje;
  }

  async updateConversation(id: string, updates: Partial<Conversacion>): Promise<Conversacion> {
    clearMemoryCache("convs");
    const { mensajes, lead, ...directUpdates } = updates as any;
    const conv = await prisma.conversacion.update({
      where: { id },
      data: directUpdates
    });
    return {
      ...conv,
      ultimoMensajeEn: conv.ultimoMensajeEn.toISOString()
    } as unknown as Conversacion;
  }

  async getRespuestasRapidas(): Promise<RespuestaRapida[]> {
    const fetchRespuestas = cacheFn(
      async () => {
        return prisma.respuestaRapida.findMany({
          where: { activo: true }
        });
      },
      ["respuestas-rapidas"],
      { revalidate: 300, tags: ["respuestas-rapidas"] }
    );
    const replies = await fetchRespuestas();
    return replies as unknown as RespuestaRapida[];
  }

  async getDocumentosConocimiento(): Promise<DocumentoConocimiento[]> {
    const fn = async () => {
      return prisma.documentoConocimiento.findMany({
        where: { estado: 'ACTIVO' }
      });
    };
    try {
      const fetchDocs = cacheFn(
        fn,
        ["documentos-conocimiento"],
        { revalidate: 1800, tags: ["documentos-conocimiento"] }
      );
      const docs = await fetchDocs();
      return docs as unknown as DocumentoConocimiento[];
    } catch (e: any) {
      console.warn("Falla en caché de conocimientos. Usando fallback directo a base de datos:", e.message || e);
      const docs = await fn();
      return docs as unknown as DocumentoConocimiento[];
    }
  }

  async addNota(leadId: string, contenido: string, nombreAgente: string): Promise<NotaLead> {
    clearMemoryCache("leads");
    const note = await prisma.notaLead.create({
      data: {
        idLead: leadId,
        contenido,
        nombreAgente
      }
    });
    return {
      ...note,
      creadoEn: note.creadoEn.toISOString()
    } as unknown as NotaLead;
  }

  async upsertNotaIA(leadId: string, contenido: string): Promise<NotaLead> {
    clearMemoryCache("leads");
    // Buscar notas previas del "Asistente IA" para este lead
    const existingNotes = await prisma.notaLead.findMany({
      where: { idLead: leadId, nombreAgente: "Asistente IA" },
      orderBy: { creadoEn: "asc" }
    });

    if (existingNotes.length > 0) {
      const primary = existingNotes[0];
      const updated = await prisma.notaLead.update({
        where: { id: primary.id },
        data: { contenido }
      });

      // Eliminar cualquier nota duplicada previa de IA para conservar estrictamente solo 1
      if (existingNotes.length > 1) {
        const extraIds = existingNotes.slice(1).map(n => n.id);
        await prisma.notaLead.deleteMany({
          where: { id: { in: extraIds } }
        });
      }

      return {
        ...updated,
        creadoEn: updated.creadoEn.toISOString()
      } as unknown as NotaLead;
    } else {
      const note = await prisma.notaLead.create({
        data: {
          idLead: leadId,
          contenido,
          nombreAgente: "Asistente IA"
        }
      });
      return {
        ...note,
        creadoEn: note.creadoEn.toISOString()
      } as unknown as NotaLead;
    }
  }

  async addSeguimiento(leadId: string, data: { titulo: string; descripcion?: string; fechaVencimiento: string }): Promise<Seguimiento> {
    const followUp = await prisma.seguimiento.create({
      data: {
        idLead: leadId,
        titulo: data.titulo,
        descripcion: data.descripcion,
        fechaVencimiento: new Date(data.fechaVencimiento)
      }
    });
    return {
      ...followUp,
      fechaVencimiento: followUp.fechaVencimiento.toISOString(),
      completadoEn: followUp.completadoEn?.toISOString() || undefined
    } as unknown as Seguimiento;
  }

  async completeSeguimiento(leadId: string, seguimientoId: string): Promise<void> {
    await prisma.seguimiento.update({
      where: { id: seguimientoId },
      data: {
        estado: 'COMPLETADO',
        completadoEn: new Date()
      }
    });
  }

  async addCotizacion(leadId: string, cotizacionData: Omit<Cotizacion, 'id' | 'estado' | 'validoHasta'>): Promise<Cotizacion> {
    const quote = await prisma.cotizacion.create({
      data: {
        ...cotizacionData,
        estado: 'BORRADOR',
        validoHasta: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      }
    });

    // Update lead status to COTIZADO
    await prisma.lead.update({
      where: { id: leadId },
      data: { estado: 'COTIZADO' }
    });

    return {
      ...quote,
      validoHasta: quote.validoHasta.toISOString()
    } as unknown as Cotizacion;
  }

  async crearIncidente(servicio: 'OPENAI' | 'WHATSAPP', mensaje: string, detalles?: string): Promise<any> {
    const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
    const existente = await prisma.incidente.findFirst({
      where: {
        servicio,
        mensaje,
        resuelto: false,
        creadoEn: { gte: unaHoraAtras }
      }
    });

    if (existente) {
      return existente;
    }

    return prisma.incidente.create({
      data: {
        servicio,
        mensaje,
        detalles
      }
    });
  }

  async getIncidentesActivos(): Promise<any[]> {
    return prisma.incidente.findMany({
      where: { resuelto: false },
      orderBy: { creadoEn: 'desc' }
    });
  }

  async resolverIncidente(id: string): Promise<any> {
    return prisma.incidente.update({
      where: { id },
      data: {
        resuelto: true,
        resueltoEn: new Date()
      }
    });
  }

  async crearHijo(hijoData: { 
    idLead: string; 
    nombre: string; 
    textoEdad: string; 
    necesidades?: string; 
    instrucciones?: string;
    alergias?: string;
    condicionMedica?: string;
    estadoSalud?: string;
    preferencias?: string;
    indicacionesNanny?: string;
  }): Promise<Hijo> {
    const hijo = await prisma.hijo.create({
      data: {
        idLead: hijoData.idLead,
        nombre: hijoData.nombre,
        textoEdad: hijoData.textoEdad,
        necesidades: hijoData.necesidades,
        instrucciones: hijoData.instrucciones,
        alergias: hijoData.alergias,
        condicionMedica: hijoData.condicionMedica,
        estadoSalud: hijoData.estadoSalud,
        preferencias: hijoData.preferencias,
        indicacionesNanny: hijoData.indicacionesNanny
      }
    });
    return hijo as unknown as Hijo;
  }

  async actualizarHijo(id: string, updates: Partial<Omit<Hijo, 'id'>>): Promise<Hijo> {
    const hijo = await prisma.hijo.update({
      where: { id },
      data: {
        nombre: updates.nombre,
        textoEdad: updates.textoEdad,
        necesidades: updates.necesidades,
        instrucciones: updates.instrucciones,
        alergias: updates.alergias,
        condicionMedica: updates.condicionMedica,
        estadoSalud: updates.estadoSalud,
        preferencias: updates.preferencias,
        indicacionesNanny: updates.indicacionesNanny
      }
    });
    return hijo as unknown as Hijo;
  }
}

export const db = new BaseDeDatos();
export default db;
