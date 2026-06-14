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
  estado: 'NUEVO' | 'CONTACTADO' | 'COTIZADO' | 'GANADO' | 'PERDIDO';
  idUsuarioAsignado?: string;
  ultimoContactoEn: string;
  siguienteSeguimientoEn?: string;
  motivoPerdida?: string;
  resumenIA?: string;
  datosFaltantes?: string[];
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
    let whereClause: any = { deleted: false };

    if (filter) {
      let cityTarget: any = null;
      if (filter.rol === "VENDEDOR") {
        cityTarget = filter.ciudad || "Puebla";
      } else {
        const city = filter.selectedCity;
        if (city && city.toUpperCase() !== "TODAS" && city.toUpperCase() !== "TODAS LAS CIUDADES") {
          cityTarget = city;
        }
      }

      if (cityTarget) {
        let cityCondition: any;
        if (cityTarget.toUpperCase() === "PUEBLA" || cityTarget.toUpperCase() === "ATLIXCO") {
          cityCondition = { in: ["Puebla", "Atlixco", "puebla", "atlixco", "PUEBLA", "ATLIXCO"] };
        } else if (cityTarget.toUpperCase() === "CDMX") {
          cityCondition = { in: ["CDMX", "Ciudad de México", "Ciudad de Mexico", "cdmx", "CIUDAD DE MEXICO", "CIUDAD DE MÉXICO"] };
        } else if (cityTarget.toUpperCase() === "QUERETARO" || cityTarget.toUpperCase() === "QUERÉTARO") {
          cityCondition = { in: ["Querétaro", "Queretaro", "querétaro", "queretaro", "QUERÉTARO", "QUERETARO"] };
        } else {
          cityCondition = { mode: "insensitive", equals: cityTarget };
        }

        whereClause.OR = [
          { ciudad: cityCondition },
          { ciudad: "Por definir" },
          { ciudad: "" }
        ];
      }
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        hijos: true,
        notas: { orderBy: { creadoEn: 'desc' } },
        seguimientos: { orderBy: { fechaVencimiento: 'asc' } },
        cotizaciones: { orderBy: { creadoEn: 'desc' } }
      },
      orderBy: {
        ultimoContactoEn: 'desc'
      }
    });

    return leads.map(l => ({
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
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const filter = getRequestFilter();
    let whereClause: any = { id, deleted: false };

    if (filter) {
      if (filter.rol === "VENDEDOR") {
        const city = filter.ciudad || "Puebla";
        let cityCondition: any;
        if (city.toUpperCase() === "PUEBLA" || city.toUpperCase() === "ATLIXCO") {
          cityCondition = { in: ["Puebla", "Atlixco", "puebla", "atlixco", "PUEBLA", "ATLIXCO"] };
        } else if (city.toUpperCase() === "CDMX") {
          cityCondition = { in: ["CDMX", "Ciudad de México", "Ciudad de Mexico", "cdmx", "CIUDAD DE MEXICO", "CIUDAD DE MÉXICO"] };
        } else if (city.toUpperCase() === "QUERETARO" || city.toUpperCase() === "QUERÉTARO") {
          cityCondition = { in: ["Querétaro", "Queretaro", "querétaro", "queretaro", "QUERÉTARO", "QUERETARO"] };
        } else {
          cityCondition = { mode: "insensitive", equals: city };
        }

        whereClause.OR = [
          { ciudad: cityCondition },
          { ciudad: "Por definir" },
          { ciudad: "" }
        ];
      }
    }

    const lead = await prisma.lead.findFirst({
      where: whereClause,
      include: {
        hijos: true,
        notas: { orderBy: { creadoEn: 'desc' } },
        seguimientos: { orderBy: { fechaVencimiento: 'asc' } },
        cotizaciones: { orderBy: { creadoEn: 'desc' } }
      }
    });

    if (!lead) return undefined;

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
    await prisma.lead.update({
      where: { id },
      data: { deleted: true }
    });
  }

  async getConversations(): Promise<Conversacion[]> {
    const filter = getRequestFilter();
    let whereClause: any = { deleted: false };

    if (filter) {
      let cityTarget: any = null;
      if (filter.rol === "VENDEDOR") {
        cityTarget = filter.ciudad || "Puebla";
      } else {
        const city = filter.selectedCity;
        if (city && city.toUpperCase() !== "TODAS" && city.toUpperCase() !== "TODAS LAS CIUDADES") {
          cityTarget = city;
        }
      }

      if (cityTarget) {
        let cityCondition: any;
        if (cityTarget.toUpperCase() === "PUEBLA" || cityTarget.toUpperCase() === "ATLIXCO") {
          cityCondition = { in: ["Puebla", "Atlixco", "puebla", "atlixco", "PUEBLA", "ATLIXCO"] };
        } else if (cityTarget.toUpperCase() === "CDMX") {
          cityCondition = { in: ["CDMX", "Ciudad de México", "Ciudad de Mexico", "cdmx", "CIUDAD DE MEXICO", "CIUDAD DE MÉXICO"] };
        } else if (cityTarget.toUpperCase() === "QUERETARO" || cityTarget.toUpperCase() === "QUERÉTARO") {
          cityCondition = { in: ["Querétaro", "Queretaro", "querétaro", "queretaro", "QUERÉTARO", "QUERETARO"] };
        } else {
          cityCondition = { mode: "insensitive", equals: cityTarget };
        }

        whereClause.lead = {
          OR: [
            { ciudad: cityCondition },
            { ciudad: "Por definir" },
            { ciudad: "" }
          ]
        };
      }
    }

    const conversations = await prisma.conversacion.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            nombreCompleto: true
          }
        }
      },
      orderBy: {
        ultimoMensajeEn: 'desc'
      }
    });
    return conversations.map(c => ({
      ...c,
      ultimoMensajeEn: c.ultimoMensajeEn.toISOString()
    })) as unknown as Conversacion[];
  }

  async getConversationById(id: string): Promise<Conversacion | undefined> {
    const filter = getRequestFilter();
    let whereClause: any = { id, deleted: false };

    if (filter && filter.rol === "VENDEDOR") {
      const city = filter.ciudad || "Puebla";
      let cityCondition: any;
      if (city.toUpperCase() === "PUEBLA" || city.toUpperCase() === "ATLIXCO") {
        cityCondition = { in: ["Puebla", "Atlixco", "puebla", "atlixco", "PUEBLA", "ATLIXCO"] };
      } else if (city.toUpperCase() === "CDMX") {
        cityCondition = { in: ["CDMX", "Ciudad de México", "Ciudad de Mexico", "cdmx", "CIUDAD DE MEXICO", "CIUDAD DE MÉXICO"] };
      } else if (city.toUpperCase() === "QUERETARO" || city.toUpperCase() === "QUERÉTARO") {
        cityCondition = { in: ["Querétaro", "Queretaro", "querétaro", "queretaro", "QUERÉTARO", "QUERETARO"] };
      } else {
        cityCondition = { mode: "insensitive", equals: city };
      }

      whereClause.lead = {
        OR: [
          { ciudad: cityCondition },
          { ciudad: "Por definir" },
          { ciudad: "" }
        ]
      };
    }

    const conv = await prisma.conversacion.findFirst({
      where: whereClause
    });
    if (!conv) return undefined;
    return {
      ...conv,
      ultimoMensajeEn: conv.ultimoMensajeEn.toISOString()
    } as unknown as Conversacion;
  }

  async getConversationByPhone(phone: string): Promise<Conversacion | undefined> {
    const filter = getRequestFilter();
    let whereClause: any = { telefono: phone, deleted: false };

    if (filter && filter.rol === "VENDEDOR") {
      const city = filter.ciudad || "Puebla";
      let cityCondition: any;
      if (city.toUpperCase() === "PUEBLA" || city.toUpperCase() === "ATLIXCO") {
        cityCondition = { in: ["Puebla", "Atlixco", "puebla", "atlixco", "PUEBLA", "ATLIXCO"] };
      } else if (city.toUpperCase() === "CDMX") {
        cityCondition = { in: ["CDMX", "Ciudad de México", "Ciudad de Mexico", "cdmx", "CIUDAD DE MEXICO", "CIUDAD DE MÉXICO"] };
      } else if (city.toUpperCase() === "QUERETARO" || city.toUpperCase() === "QUERÉTARO") {
        cityCondition = { in: ["Querétaro", "Queretaro", "querétaro", "queretaro", "QUERÉTARO", "QUERETARO"] };
      } else {
        cityCondition = { mode: "insensitive", equals: city };
      }

      whereClause.lead = {
        OR: [
          { ciudad: cityCondition },
          { ciudad: "Por definir" },
          { ciudad: "" }
        ]
      };
    }

    const conv = await prisma.conversacion.findFirst({
      where: whereClause
    });
    if (!conv) return undefined;
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

    const conversations = await prisma.conversacion.findMany({
      where: { deleted: false }
    });
    const matchedConv = conversations.find(c => {
      const cleanC = normalize(c.telefono);
      const cleanCMex = (cleanC.startsWith("521") && cleanC.length === 13)
        ? "52" + cleanC.slice(3)
        : cleanC;
      return cleanCMex === cleanIncomingMex;
    });

    if (matchedConv) {
      return {
        ...matchedConv,
        ultimoMensajeEn: matchedConv.ultimoMensajeEn.toISOString()
      } as unknown as Conversacion;
    }

    const leads = await prisma.lead.findMany({
      where: { deleted: false }
    });
    const matchedLead = leads.find(l => {
      const cleanL = normalize(l.telefono);
      const cleanLMex = (cleanL.startsWith("521") && cleanL.length === 13)
        ? "52" + cleanL.slice(3)
        : cleanL;
      return cleanLMex === cleanIncomingMex;
    });

    if (matchedLead) {
      const newConv = await prisma.conversacion.create({
        data: {
          idLead: matchedLead.id,
          telefono: matchedLead.telefono,
          iaActiva: true,
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

    const newConv = await prisma.conversacion.create({
      data: {
        idLead: newLead.id,
        telefono: newLead.telefono,
        iaActiva: true,
        estado: "NUEVA"
      }
    });

    return {
      ...newConv,
      ultimoMensajeEn: newConv.ultimoMensajeEn.toISOString()
    } as unknown as Conversacion;
  }


  async getMessagesByConversationId(conversationId: string): Promise<Mensaje[]> {
    const messages = await prisma.mensaje.findMany({
      where: { idConversacion: conversationId },
      orderBy: { creadoEn: 'asc' }
    });
    return messages.map(m => ({
      ...m,
      creadoEn: m.creadoEn.toISOString()
    })) as unknown as Mensaje[];
  }

  async addMessage(messageData: Omit<Mensaje, 'id' | 'creadoEn'>): Promise<Mensaje> {
    const msg = await prisma.mensaje.create({
      data: {
        idConversacion: messageData.idConversacion,
        direccion: messageData.direccion,
        tipoRemitente: messageData.tipoRemitente,
        idRemitente: messageData.idRemitente,
        contenido: messageData.contenido
      }
    });

    // Update conversation ultimoMensajeEn and lead ultimoContactoEn
    const conv = await prisma.conversacion.update({
      where: { id: messageData.idConversacion },
      data: { ultimoMensajeEn: msg.creadoEn }
    });

    if (conv.idLead) {
      await prisma.lead.update({
        where: { id: conv.idLead },
        data: { ultimoContactoEn: msg.creadoEn }
      });
    }

    return {
      ...msg,
      creadoEn: msg.creadoEn.toISOString()
    } as unknown as Mensaje;
  }

  async updateConversation(id: string, updates: Partial<Conversacion>): Promise<Conversacion> {
    const conv = await prisma.conversacion.update({
      where: { id },
      data: updates
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
    const fetchDocs = cacheFn(
      async () => {
        return prisma.documentoConocimiento.findMany({
          where: { estado: 'ACTIVO' }
        });
      },
      ["documentos-conocimiento"],
      { revalidate: 1800, tags: ["documentos-conocimiento"] }
    );
    const docs = await fetchDocs();
    return docs as unknown as DocumentoConocimiento[];
  }

  async addNota(leadId: string, contenido: string, nombreAgente: string): Promise<NotaLead> {
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
}

export const db = new BaseDeDatos();
export default db;
