import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAIResponse, detectCityFromText, detectLocationFromText, detectAgeFromText, detectMultipleAgesFromText, detectServiceFromText, extractLeadInfo, parseNumDias, detectHumanAttentionRequest, hasBuyingIntent, parseHoursFromText } from "@/lib/openai";
import prisma from "@/lib/prisma";
import { buildNarrativeSummary } from "@/lib/narrative";
import { calculatePrecotizacion, verificarYCorregirCotizacion } from "@/lib/pricing";
import { generateAndSaveQuoteImage } from "@/lib/generate-quote-image";


// Helper para enviar mensajes de WhatsApp a través de la API oficial
async function sendWhatsAppMessage(to: string, text: string, contextMessageId?: string | null, textoCitado?: string | null): Promise<string | null> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId || token === "mock-whatsapp-token" || phoneId === "mock-phone-id") {
    console.log("WhatsApp credentials not set or mock. Skipping API call.");
    return null;
  }

  const cleanPhone = to.replace(/\D/g, "");

  let finalBody = text;
  if (textoCitado) {
    finalBody = `> ↩️ *Respuesta a:* "${textoCitado}"\n\n${text}`;
  }

  const payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "text",
    text: {
      body: finalBody,
    },
  };

  if (contextMessageId) {
    payload.context = {
      message_id: contextMessageId
    };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Error sending WhatsApp message:", data);
      return null;
    } else {
      console.log("WhatsApp message sent successfully with context:", data);
      return data?.messages?.[0]?.id || null;
    }
  } catch (error) {
    console.error("Network error sending WhatsApp message:", error);
    return null;
  }
}

async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string): Promise<string | null> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId || token === "mock-whatsapp-token" || phoneId === "mock-phone-id") {
    console.log("WhatsApp credentials not set or mock. Skipping API call.");
    return null;
  }

  const cleanPhone = to.replace(/\D/g, "");

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "image",
        image: {
          link: imageUrl,
          caption: caption || ""
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Error sending WhatsApp image:", data);
      return null;
    } else {
      console.log("WhatsApp image sent successfully:", data);
      return data?.messages?.[0]?.id || null;
    }
  } catch (error) {
    console.error("Network error sending WhatsApp image:", error);
    return null;
  }
}

async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyVariables: string[],
  headerImageUrl?: string
): Promise<string | null> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId || token === "mock-whatsapp-token" || phoneId === "mock-phone-id") {
    console.log("WhatsApp credentials not set or mock. Skipping API call.");
    return null;
  }

  const cleanPhone = to.replace(/\D/g, "");

  const components: any[] = [];

  if (headerImageUrl) {
    components.push({
      type: "header",
      parameters: [
        {
          type: "image",
          image: {
            link: headerImageUrl
          }
        }
      ]
    });
  }

  if (bodyVariables && bodyVariables.length > 0) {
    components.push({
      type: "body",
      parameters: bodyVariables.map(v => ({
        type: "text",
        text: v
      }))
    });
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: components
    }
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Error sending WhatsApp template:", data);
      return null;
    } else {
      console.log("WhatsApp template sent successfully:", data);
      return data?.messages?.[0]?.id || null;
    }
  } catch (error) {
    console.error("Network error sending WhatsApp template:", error);
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messages = await db.getMessagesByConversationId(params.id);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { direccion, tipoRemitente, idRemitente, contenido, urlMultimedia, idMensajeRespondido, textoCitado, template } = body;

    if (!direccion || !tipoRemitente || !contenido) {
      return NextResponse.json({ error: "Faltan campos obligatorios (direccion, tipoRemitente o contenido)" }, { status: 400 });
    }

    // Guardar mensaje original
    const newMsg = await db.addMessage({
      idConversacion: params.id,
      direccion,
      tipoRemitente,
      idRemitente,
      contenido,
      urlMultimedia: urlMultimedia || null,
      idMensajeRespondido: idMensajeRespondido || null,
      textoCitado: textoCitado || null
    } as any);

    const conv = await db.getConversationById(params.id);

    // Si el agente responde desde el CRM, enviamos la respuesta de forma real por WhatsApp
    if (direccion === "OUTBOUND" && tipoRemitente === "AGENT" && conv) {
      let sentWamid: string | null = null;

      if (template) {
        // Enviar plantilla de WhatsApp
        sentWamid = await sendWhatsAppTemplate(
          conv.telefono,
          template.name,
          template.languageCode || "es",
          template.bodyVariables || [],
          template.headerImage || undefined
        );
      } else {
        let contextMessageId: string | undefined = undefined;
        if (idMensajeRespondido) {
          try {
            const rawMsgs: any[] = await prisma.$queryRawUnsafe(
              `SELECT "idMensajeWhatsapp" FROM "Mensaje" WHERE "id" = $1 LIMIT 1`,
              idMensajeRespondido
            );
            if (rawMsgs.length > 0 && rawMsgs[0].idMensajeWhatsapp) {
              contextMessageId = rawMsgs[0].idMensajeWhatsapp;
            }
          } catch (e) {
            console.error("Error fetching quoted wamid:", e);
          }
        }

        if (urlMultimedia) {
          sentWamid = await sendWhatsAppImage(conv.telefono, urlMultimedia, contenido);
        } else {
          sentWamid = await sendWhatsAppMessage(conv.telefono, contenido, contextMessageId, textoCitado);
        }
      }

      if (sentWamid && newMsg?.id) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "Mensaje" SET "idMensajeWhatsapp" = $1 WHERE "id" = $2`,
            sentWamid, newMsg.id
          );
        } catch (e) {
          console.error("Error updating outbound wamid:", e);
        }
      }
    }

    // Si llega un mensaje de cliente (INBOUND) y el lead está en CONTACTADO, PERDIDO o con agente asignado, reactivar la IA y regresarlo a la columna "EN CONVERSACIÓN" en el embudo
    if (direccion === "INBOUND" && conv?.idLead) {
      const currentLead = await db.getLeadById(conv.idLead);
      if (currentLead) {
        if (currentLead.estado === "CONTACTADO" || currentLead.estado === "PERDIDO" || !conv.iaActiva || currentLead.idUsuarioAsignado) {
          const hasCity = currentLead.ciudad && currentLead.ciudad !== "Por definir" && currentLead.ciudad !== "";
          const targetStatus = currentLead.estado === "GANADO" ? "GANADO" : (hasCity ? "CONTACTADO" : "NUEVO");
          console.log(`[RE-ACTIVACIÓN KANBAN - CRM] Lead ${conv.idLead} (Estado: ${currentLead.estado}) volvió a escribir. Re-activando IA y regresando a 'EN CONVERSACIÓN' en el Embudo.`);
          
          await db.updateConversation(conv.id, { iaActiva: true });
          await db.updateLead(conv.idLead, { 
            estado: targetStatus,
            idUsuarioAsignado: undefined
          });
        }
      }

      // Extraer ubicación (ciudad y municipio), servicio y edad(es) del/los peque(s) determinísticamente
      const loc = detectLocationFromText(contenido);
      const multipleAges = detectMultipleAgesFromText(contenido);
      const detectedService = detectServiceFromText(contenido);
      const detUpdates: any = {};

      if (loc.ciudad) {
        detUpdates.ciudad = loc.ciudad;
        detUpdates.estado = "CONTACTADO";
      }
      if (loc.zona) detUpdates.zona = loc.zona;
      if (detectedService) detUpdates.interesServicio = detectedService;
      if (multipleAges.length > 0) {
        detUpdates.cantidadHijos = multipleAges.length;
        detUpdates.edadHijo = Math.round(multipleAges[0].numAnios);
      }

      if (Object.keys(detUpdates).length > 0) {
        console.log(`[EXTRACTOR DETERMINISTA - CRM] Actualizando Lead ${conv.idLead} con:`, detUpdates);
        await db.updateLead(conv.idLead, detUpdates);
        if (multipleAges.length > 0) {
          const leadCurrent = await db.getLeadById(conv.idLead);
          for (let i = 0; i < multipleAges.length; i++) {
            const item = multipleAges[i];
            const nombrePeque = `Peque ${i + 1}`;
            const existingHijo = leadCurrent?.hijos?.find((h: any) => h.nombre === nombrePeque);
            if (existingHijo) {
              await db.actualizarHijo(existingHijo.id, {
                textoEdad: item.textoEdad
              });
            } else {
              await db.crearHijo({
                idLead: conv.idLead,
                nombre: nombrePeque,
                textoEdad: item.textoEdad,
              });
            }
          }
        }
      }
    }

    // Si el mensaje viene del cliente (INBOUND) y la IA está activada en la conversación,
    // generamos una respuesta inteligente con OpenAI.
    if (direccion === "INBOUND" && conv?.iaActiva) {
      const lowerText = contenido.toLowerCase();
      let extractedData: any = null;

      // Intentar extraer información relevante del mensaje del lead
      if (conv.idLead) {
        try {
          const chatHistoryForExtraction = await db.getMessagesByConversationId(conv.id);
          const recentHistoryText = chatHistoryForExtraction.slice(-4).map(m => `${m.direccion === "INBOUND" ? "Cliente" : "Asistente"}: ${m.contenido}`).join("\n");
          
          extractedData = await extractLeadInfo(contenido, recentHistoryText);
          if (extractedData && conv.idLead) {
            const updates: any = {};
            const currentLead = await db.getLeadById(conv.idLead);

            if (extractedData.nombreCompleto && extractedData.nombreCompleto !== "Gerardo Pineda") {
              updates.nombreCompleto = extractedData.nombreCompleto;
            }
            if (extractedData.ciudad) updates.ciudad = extractedData.ciudad;
            if (extractedData.zona) updates.zona = extractedData.zona;
            
            if (extractedData.interesServicio) updates.interesServicio = extractedData.interesServicio;
            if (extractedData.edadHijo !== undefined && extractedData.edadHijo !== null) {
              updates.edadHijo = Number(extractedData.edadHijo);
            }
            if (extractedData.cantidadHijos !== undefined && extractedData.cantidadHijos !== null) {
              updates.cantidadHijos = Number(extractedData.cantidadHijos);
            }
            if (extractedData.diasSolicitados) updates.diasSolicitados = extractedData.diasSolicitados;
            if (extractedData.horaInicioSolicitada) updates.horaInicioSolicitada = extractedData.horaInicioSolicitada;
            if (extractedData.horaFinSolicitada) updates.horaFinSolicitada = extractedData.horaFinSolicitada;
            if (extractedData.fechaInicioDeseada) updates.fechaInicioDeseada = extractedData.fechaInicioDeseada;
            if (extractedData.linkUbicacion) updates.linkUbicacion = extractedData.linkUbicacion;
            if (extractedData.razonContratacion) updates.razonContratacion = extractedData.razonContratacion;
            if (extractedData.mascotas) updates.mascotas = extractedData.mascotas;
            if (extractedData.indicacionesIngreso) updates.indicacionesIngreso = extractedData.indicacionesIngreso;
            if (extractedData.listoParaCierre) {
              updates.estado = "GANADO";
            }

            // Regla de Negocio: Si es un servicio eventual y no se especificó un día, pero tenemos horario, cotizar para 1 día por defecto
            const interesServicioFinal = updates.interesServicio || currentLead?.interesServicio;
            const esEventual = interesServicioFinal === "Servicio Eventual" || interesServicioFinal === "Nanny Express";
            const diasFinal = updates.diasSolicitados || currentLead?.diasSolicitados;
            const tieneHoras = (updates.horaInicioSolicitada || currentLead?.horaInicioSolicitada) && 
                               ((updates.horaFinSolicitada || currentLead?.horaFinSolicitada) || 
                                (updates.horaInicioSolicitada || currentLead?.horaInicioSolicitada)?.toLowerCase().includes("hora"));

            if (esEventual && (!diasFinal || diasFinal === "Por definir" || diasFinal === "No especificados") && tieneHoras) {
              updates.diasSolicitados = "1 día (por definir)";
              console.log(`[DEFAULT 1 DÍA EVENTUAL] Lead ${conv.idLead} no tiene días especificados para servicio eventual, asumiendo 1 día.`);
            }

            // Si se detecta nuevos hijos
            if (extractedData.nuevosHijos && Array.isArray(extractedData.nuevosHijos) && extractedData.nuevosHijos.length > 0) {
              if (!updates.cantidadHijos && (!currentLead || !currentLead.cantidadHijos)) {
                updates.cantidadHijos = extractedData.nuevosHijos.length;
              }
              if (!updates.edadHijo && (!currentLead || !currentLead.edadHijo)) {
                const firstChild = extractedData.nuevosHijos[0];
                if (firstChild && firstChild.textoEdad) {
                  const matches = firstChild.textoEdad.match(/\d+/);
                  if (matches) {
                    updates.edadHijo = parseInt(matches[0], 10);
                  }
                }
              }
            }

            if (extractedData.preguntasMencionadas && Array.isArray(extractedData.preguntasMencionadas)) {
              const prevQuestions = Array.isArray((currentLead as any)?.preguntasMencionadas) ? (currentLead as any).preguntasMencionadas : [];
              const newQuestions = extractedData.preguntasMencionadas.filter((q: string) => !prevQuestions.includes(q));
              updates.preguntasMencionadas = [...prevQuestions, ...newQuestions];
            }

            const summaryNote = buildNarrativeSummary(currentLead, updates, extractedData.nuevosHijos);

            const dbUpdates = { ...updates };
            delete dbUpdates.preguntasMencionadas;

            if (Object.keys(dbUpdates).length > 0) {
              await db.updateLead(conv.idLead, dbUpdates);
            }

            if (summaryNote) {
              await db.upsertNotaIA(conv.idLead, summaryNote);
            }

            if (extractedData.nuevosHijos && Array.isArray(extractedData.nuevosHijos)) {
              const currentLeadForChild = await db.getLeadById(conv.idLead);
              for (const hijo of extractedData.nuevosHijos) {
                if (!hijo.nombre) continue;
                
                const existingHijo = currentLeadForChild?.hijos?.find(
                  h => h.nombre.toLowerCase().trim() === hijo.nombre.toLowerCase().trim()
                );
                
                if (!existingHijo) {
                  // Intentar buscar si hay un "Peque X" con la misma edad para renombrarlo
                  const matchesNueva = hijo.textoEdad ? hijo.textoEdad.match(/\d+/) : null;
                  const edadNueva = matchesNueva ? parseInt(matchesNueva[0], 10) : null;
                  
                  let placeholderHijo = null;
                  if (edadNueva !== null && hijo.nombre && !hijo.nombre.toLowerCase().startsWith("peque")) {
                    placeholderHijo = currentLeadForChild?.hijos?.find(h => {
                      if (!h.nombre.toLowerCase().startsWith("peque")) return false;
                      const matchesPlaceholder = h.textoEdad ? h.textoEdad.match(/\d+/) : null;
                      const edadPlaceholder = matchesPlaceholder ? parseInt(matchesPlaceholder[0], 10) : null;
                      return edadPlaceholder === edadNueva;
                    });
                  }
                  
                  if (placeholderHijo) {
                    console.log(`[EXTRACTOR IA] Renombrando placeholder hijo ${placeholderHijo.nombre} a ${hijo.nombre}`);
                    await db.actualizarHijo(placeholderHijo.id, {
                      nombre: hijo.nombre,
                      textoEdad: hijo.textoEdad || placeholderHijo.textoEdad,
                      alergias: hijo.alergias || placeholderHijo.alergias || "",
                      condicionMedica: hijo.condicionMedica || placeholderHijo.condicionMedica || "",
                      estadoSalud: hijo.estadoSalud || placeholderHijo.estadoSalud || "",
                      preferencias: hijo.preferencias || placeholderHijo.preferencias || "",
                      indicacionesNanny: hijo.indicacionesNanny || placeholderHijo.indicacionesNanny || "",
                      necesidades: hijo.necesidades || placeholderHijo.necesidades || ""
                    });
                  } else {
                    console.log(`[EXTRACTOR IA] Creando nuevo hijo para Lead ${conv.idLead}:`, hijo);
                    await db.crearHijo({
                      idLead: conv.idLead,
                      nombre: hijo.nombre,
                      textoEdad: hijo.textoEdad || "",
                      alergias: hijo.alergias || "",
                      condicionMedica: hijo.condicionMedica || "",
                      estadoSalud: hijo.estadoSalud || "",
                      preferencias: hijo.preferencias || "",
                      indicacionesNanny: hijo.indicacionesNanny || "",
                      necesidades: hijo.necesidades || ""
                    });
                  }
                } else if (hijo.textoEdad && hijo.textoEdad !== existingHijo.textoEdad) {
                  console.log(`[EXTRACTOR IA] Actualizando textoEdad de hijo existente ${existingHijo.nombre} a ${hijo.textoEdad}`);
                  await db.actualizarHijo(existingHijo.id, {
                    textoEdad: hijo.textoEdad || existingHijo.textoEdad,
                    alergias: hijo.alergias || existingHijo.alergias || "",
                    condicionMedica: hijo.condicionMedica || existingHijo.condicionMedica || "",
                    estadoSalud: hijo.estadoSalud || existingHijo.estadoSalud || "",
                    preferencias: hijo.preferencias || existingHijo.preferencias || "",
                    indicacionesNanny: hijo.indicacionesNanny || existingHijo.indicacionesNanny || "",
                    necesidades: hijo.necesidades || existingHijo.necesidades || ""
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error("Error al extraer información del Lead en chat CRM:", err);
        }
      }

      try {
        const aiResponseText = await generateAIResponse(params.id, contenido);

      // Guardar el mensaje generado por la IA en la base de datos
      let quoteCreated = null;
      let finalResponseText = aiResponseText;
      let imageUrl = "";

      if (conv.idLead) {
        const tagRegex = /\[[\s\*]*COTIZACION:[\s\*]*(\d+(?:\.\d+)?|CALCULAR)[\s\*]*\]/i;
        const match = aiResponseText.match(tagRegex);
        if (match) {
          const proposedPrice = match[1] !== "CALCULAR" ? parseFloat(match[1]) : undefined;
          const rawLead = await db.getLeadById(conv.idLead);
          if (rawLead) {
            let lead: any = { ...rawLead };
            // 1. Sincronizar datos conversacionales faltantes directamente del historial del chat si aún no están en la BD
            const chatHistory = await db.getMessagesByConversationId(conv.id);
            const fullTextHistory = chatHistory.map(m => m.contenido).join("\n");
            const updatesSync: any = {};

            if (!lead.horaInicioSolicitada || !lead.horaFinSolicitada) {
              const parsedH = parseHoursFromText(fullTextHistory);
              if (parsedH?.horaInicio && parsedH?.horaFin) {
                updatesSync.horaInicioSolicitada = parsedH.horaInicio;
                updatesSync.horaFinSolicitada = parsedH.horaFin;
              }
            }

            if (!lead.diasSolicitados || lead.diasSolicitados === "Por definir") {
              if (/martes|miercoles|jueves|viernes|sabado|domingo|lunes|1 dia|un dia|solo un dia/i.test(fullTextHistory)) {
                const matchDia = fullTextHistory.match(/(?:este\s+)?(martes|miércoles|jueves|viernes|sábado|domingo|lunes)(?:\s+\d+(?:\s+de\s+\w+)?)?/i);
                updatesSync.diasSolicitados = matchDia ? matchDia[0] : "1 día";
              }
            }

            if (!lead.interesServicio || lead.interesServicio === "Por definir") {
              const detectedSvc = detectServiceFromText(fullTextHistory);
              if (detectedSvc) {
                updatesSync.interesServicio = detectedSvc;
              }
            }

            if (Object.keys(updatesSync).length > 0) {
              await db.updateLead(lead.id, updatesSync);
              lead = { ...lead, ...updatesSync };
            }

            let numDias = 0;
            if (lead.diasSolicitados) {
              numDias = parseNumDias(lead.diasSolicitados);
            }
            if (numDias <= 0) numDias = 1;

            // Extract horasDiarias
            let horasDiarias = 0;
            if (lead.horaInicioSolicitada && lead.horaFinSolicitada) {
              try {
                const [h1, m1] = lead.horaInicioSolicitada.split(":").map(Number);
                const [h2, m2] = lead.horaFinSolicitada.split(":").map(Number);
                const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
                if (mins > 0) horasDiarias = Math.ceil(mins / 60);
              } catch (e) {}
            }

            if (horasDiarias <= 0) {
              const parsedH = parseHoursFromText(fullTextHistory);
              if (parsedH?.horasPorDia) horasDiarias = parsedH.horasPorDia;
            }

            // SEGUNDA REVISIÓN Y SANITIZACIÓN DOBLE MOTOR
            const verificacion = verificarYCorregirCotizacion(
              aiResponseText,
              lead.ciudad,
              numDias,
              horasDiarias,
              proposedPrice
            );

            if (!verificacion.esValida || !verificacion.precioOficial) {
              console.warn(`[COTIZACION RECHAZADA EN SEGUNDA REVISIÓN] Razon: ${verificacion.razon}`);
              finalResponseText = verificacion.textoCorregido;
            } else {
              const price = verificacion.precioOficial;
              finalResponseText = verificacion.textoCorregido;

              // Reuse an existing quote if it was created recently by AI and has the same total
              const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
              const existingQuote = await prisma.cotizacion.findFirst({
                where: {
                  idLead: conv.idLead,
                  total: price,
                  creadoPor: "Asistente IA",
                  creadoEn: { gte: fiveMinutesAgo },
                  deleted: false
                },
                orderBy: { creadoEn: "desc" }
              });

              if (existingQuote) {
                quoteCreated = existingQuote;
              } else {
                let snapshotEdad = "";
                if (lead.hijos && lead.hijos.length > 0) {
                  const h = lead.hijos.find((x: any) => x.textoEdad && x.textoEdad.trim() !== "");
                  if (h) snapshotEdad = h.textoEdad;
                }
                if (!snapshotEdad && lead.edadHijo !== null && lead.edadHijo !== undefined) {
                  snapshotEdad = lead.edadHijo === 0 ? "Menor a 1 año" : `${lead.edadHijo} ${lead.edadHijo === 1 ? "año" : "años"}`;
                }
                if (!snapshotEdad) snapshotEdad = "Por definir";

                const quoteTipoServicio = lead.interesServicio && lead.interesServicio !== "Por definir" ? lead.interesServicio : "Servicio Eventual";

                // Create a new Quote in the database
                quoteCreated = await prisma.cotizacion.create({
                  data: {
                    idLead: conv.idLead,
                    nombreCliente: lead.nombreCompleto || "Por definir",
                    edadPeque: snapshotEdad,
                    zona: lead.zona || "Por definir",
                    tipoServicio: quoteTipoServicio,
                    ciudad: lead.ciudad,
                    dias: lead.diasSolicitados || `${numDias} día(s)`,
                    horaInicio: lead.horaInicioSolicitada || "Por definir",
                    horaFin: lead.horaFinSolicitada || "Por definir",
                    horasPorDia: horasDiarias,
                    cantidadHijos: lead.cantidadHijos || 1,
                    subtotal: price,
                    descuento: 0,
                    total: price,
                    estado: "ENVIADA",
                    validoHasta: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días
                    creadoPor: "Asistente IA",
                    notas: `${numDias} días, ${horasDiarias} horas por día.`
                  }
                });

                // INMUTABILIDAD: Generar y guardar la imagen PNG congelada
                const savedImageUrl = await generateAndSaveQuoteImage({
                  id: quoteCreated.id,
                  creadoEn: quoteCreated.creadoEn,
                  nombreCliente: lead.nombreCompleto || "Por definir",
                  edadPeque: snapshotEdad,
                  dias: lead.diasSolicitados || `${numDias} día(s)`,
                  horaInicio: lead.horaInicioSolicitada || "Por definir",
                  horaFin: lead.horaFinSolicitada || "Por definir",
                  horasPorDia: horasDiarias,
                  zona: lead.zona || "Por definir",
                  total: price,
                  notas: `${numDias} días, ${horasDiarias} horas por día.`,
                  tipoServicio: quoteTipoServicio
                });

                  if (savedImageUrl) {
                    await prisma.cotizacion.update({
                      where: { id: quoteCreated.id },
                      data: { imagenUrl: savedImageUrl }
                    });
                    quoteCreated = { ...quoteCreated, imagenUrl: savedImageUrl };
                  }
                }
              }
            }
          }
        }

      if (quoteCreated) {
        const host = req.headers.get("host") || "localhost:3000";
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const appUrl = `${protocol}://${host}`;

        // Preferir la imagen estática congelada; fallback al endpoint dinámico para cotizaciones antiguas
        if ((quoteCreated as any).imagenUrl) {
          imageUrl = `${appUrl}${(quoteCreated as any).imagenUrl}`;
        } else {
          imageUrl = `${appUrl}/api/cotizaciones/${quoteCreated.id}/image`;
        }
      }

      const newAiMsg = await db.addMessage({
        idConversacion: params.id,
        direccion: "OUTBOUND",
        tipoRemitente: "IA",
        contenido: finalResponseText,
        urlMultimedia: imageUrl || null
      } as any);

      // Si es un canal de comunicación real/simulado, enviar el mensaje generado por WhatsApp
      if (conv) {
        let sentWamid: string | null = null;
        if (imageUrl) {
          sentWamid = await sendWhatsAppImage(conv.telefono, imageUrl, finalResponseText);
        } else {
          sentWamid = await sendWhatsAppMessage(conv.telefono, finalResponseText);
        }

        if (sentWamid && newAiMsg?.id) {
          try {
            await prisma.$executeRawUnsafe(
              `UPDATE "Mensaje" SET "idMensajeWhatsapp" = $1 WHERE "id" = $2`,
              sentWamid, newAiMsg.id
            );
          } catch (e) {
            console.error("Error updating IA outbound wamid:", e);
          }
        }
      }
      
      // Actualizar datos faltantes y resumen de IA al final
      if (conv.idLead) {
        const lead: any = await db.getLeadById(conv.idLead);
        if (lead) {
          const lowerText = contenido.toLowerCase();
          let updatedMissing = [...(lead.datosFaltantes || [])];
          let updatedAiSummary = lead.resumenIA;

          if (lowerText.includes("viernes") || lowerText.includes("horario")) {
            updatedMissing = updatedMissing.filter(item => !item.toLowerCase().includes("horario"));
          }
          if (lowerText.includes("hijo") || lowerText.includes("edad") || lowerText.includes("niño")) {
            updatedMissing = updatedMissing.filter(item => !item.toLowerCase().includes("edad"));
          }

          // Evaluar la intención del cliente basándose en el análisis del contexto de la conversación
          const lowerAiResponse = aiResponseText.toLowerCase();
          const esHandoffText = lowerAiResponse.includes("te he canalizado") || 
                                lowerAiResponse.includes("te canalizo con") || 
                                lowerAiResponse.includes("te paso con un asesor") || 
                                lowerAiResponse.includes("te transfiero") || 
                                lowerAiResponse.includes("un asesor tomará tu solicitud") ||
                                (lowerAiResponse.includes("asesor") && (lowerAiResponse.includes("contacto") || lowerAiResponse.includes("comunic") || lowerAiResponse.includes("canaliz") || lowerAiResponse.includes("llamar"))) ||
                                (lowerAiResponse.includes("reclutamiento") && (lowerAiResponse.includes("contacto") || lowerAiResponse.includes("comunic") || lowerAiResponse.includes("canaliz")));

          // Requisitos estrictos para "Listo para Cierre" (GANADO):
          // 1. Contar con toda la información necesaria para cotizar
          const tieneInfoCompletaParaCotizar = Boolean(
            lead.ciudad && lead.ciudad !== "Por definir" && lead.ciudad !== "" &&
            ((lead.hijos && lead.hijos.length > 0) || (lead.edadHijo !== undefined && lead.edadHijo !== null && lead.edadHijo !== 0)) &&
            lead.diasSolicitados && lead.diasSolicitados !== "No especificados" && lead.diasSolicitados !== "" &&
            lead.horaInicioSolicitada && lead.horaFinSolicitada
          );

          // 2. Ya debió haber cotizado por lo menos una vez
          const yaFueCotizado = Boolean(
            lead.estado === "COTIZADO" || (lead.cotizaciones && lead.cotizaciones.length > 0)
          );

          // 3. El cliente muestra interés en contratar o acepta avanzar con el asesor
          const chatHistoryForCheck = await db.getMessagesByConversationId(conv.id);
          const recentHistoryStr = chatHistoryForCheck.slice(-4).map(m => `${m.direccion === "INBOUND" ? "Cliente" : "Asistente"}: ${m.contenido}`).join("\n");
          const expresoInteresEnContratar = hasBuyingIntent(contenido, recentHistoryStr);

          // Solo es Listo para Cierre si se cumplen los 3 requisitos al mismo tiempo
          const isClosingIntent = tieneInfoCompletaParaCotizar && yaFueCotizado && expresoInteresEnContratar;

          const isHumanRequested = detectHumanAttentionRequest(contenido) || 
                                   esHandoffText;
          
          let nuevoEstado = lead.estado;

          // Prioridad 1: Si se cumplen los 3 requisitos estrictos de cierre -> GANADO ("Listos para el Cierre")
          if (isClosingIntent) {
            nuevoEstado = "GANADO";
            console.log(`[INTENCIÓN DE CIERRE VÁLIDA] Lead ${conv.idLead} cumple los 3 requisitos -> GANADO (Listo para cierre).`);
          }
          // Prioridad 2: Si la INTENCIÓN PRINCIPAL es atención humana por dudas/soporte sin intención directa de pago/cierre -> ATENCION_HUMANA
          else if (isHumanRequested) {
            nuevoEstado = "ATENCION_HUMANA";
            await db.updateConversation(conv.id, { iaActiva: false });
            console.log(`[ATENCIÓN HUMANA DETECTADA] Lead ${conv.idLead} cambió a estado ATENCION_HUMANA e IA fue pausada.`);
          }
          // Prioridad 3: Cotización enviada -> COTIZADO
          else {
            const tieneCotizacionText = lowerAiResponse.includes("precotización") || 
                                        lowerAiResponse.includes("cotización") || 
                                        /\$\d+/.test(aiResponseText);
            
            if (tieneCotizacionText && lead.estado !== "COTIZADO" && lead.estado !== "GANADO" && lead.estado !== "PERDIDO" && lead.estado !== "ATENCION_HUMANA") {
              nuevoEstado = "COTIZADO";
            }
          }

          await db.updateLead(conv.idLead, {
            estado: nuevoEstado,
            datosFaltantes: updatedMissing,
            resumenIA: updatedAiSummary ? updatedAiSummary + " Actualización: Cliente comunicó su intención en el chat." : "Cliente interesado en servicios de cuidado infantil."
          });
        }
      }
    } catch (error) {
      console.error("Error al procesar respuesta de la IA en POST /messages:", error);
    }
  }

    return NextResponse.json(newMsg, { status: 201 });
  } catch (error) {
    console.error("Error posting message:", error);
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
  }
}
