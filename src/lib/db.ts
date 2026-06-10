import prisma from "./prisma";

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
    const leads = await prisma.lead.findMany({
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
      cotizaciones: l.cotizaciones.map(q => ({ ...q, validoHasta: q.validoHasta.toISOString() })) || []
    })) as unknown as Lead[];
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const lead = await prisma.lead.findUnique({
      where: { id },
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
      notas: lead.notas.map(n => ({ ...n, creadoEn: n.creadoEn.toISOString() })) || [], // Fix typo map notes/notas
      seguimientos: lead.seguimientos.map(f => ({ 
        ...f, 
        fechaVencimiento: f.fechaVencimiento.toISOString(), 
        completadoEn: f.completadoEn?.toISOString() || undefined 
      })) || [],
      cotizaciones: lead.cotizaciones.map(q => ({ ...q, validoHasta: q.validoHasta.toISOString() })) || []
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
      cotizaciones: []
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
      cotizaciones: lead.cotizaciones.map(q => ({ ...q, validoHasta: q.validoHasta.toISOString() })) || []
    } as unknown as Lead;
  }

  async deleteLead(id: string): Promise<void> {
    await prisma.lead.delete({
      where: { id }
    });
  }

  async getConversations(): Promise<Conversacion[]> {
    const conversations = await prisma.conversacion.findMany({
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
    const conv = await prisma.conversacion.findUnique({
      where: { id }
    });
    if (!conv) return undefined;
    return {
      ...conv,
      ultimoMensajeEn: conv.ultimoMensajeEn.toISOString()
    } as unknown as Conversacion;
  }

  async getConversationByPhone(phone: string): Promise<Conversacion | undefined> {
    const conv = await prisma.conversacion.findUnique({
      where: { telefono: phone }
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

    const conversations = await prisma.conversacion.findMany();
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

    const leads = await prisma.lead.findMany();
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
    const replies = await prisma.respuestaRapida.findMany({
      where: { activo: true }
    });
    return replies as unknown as RespuestaRapida[];
  }

  async getDocumentosConocimiento(): Promise<DocumentoConocimiento[]> {
    const docs = await prisma.documentoConocimiento.findMany({
      where: { estado: 'ACTIVO' }
    });
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
}

export const db = new BaseDeDatos();
export default db;
