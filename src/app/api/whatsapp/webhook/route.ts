import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAIResponse, detectCityFromText, detectLocationFromText, detectAgeFromText, detectMultipleAgesFromText, detectServiceFromText, extractLeadInfo, parseNumDias, detectHumanAttentionRequest, hasBuyingIntent, parseHoursFromText } from "@/lib/openai";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { buildNarrativeSummary } from "@/lib/narrative";
import { calculatePrecotizacion, verificarYCorregirCotizacion } from "@/lib/pricing";
import { generateAndSaveQuoteImage } from "@/lib/generate-quote-image";

function validateSignature(payload: string, signatureHeader: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || secret === "mock-app-secret") {
    if (process.env.NODE_ENV === "production") {
      console.error("CRITICAL SECURITY ERROR: META_APP_SECRET environment variable is NOT configured in production! Signature validation required.");
      return false;
    }
    console.warn("META_APP_SECRET not configured or mock. Skipping signature validation in development.");
    return true;
  }
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    return false;
  }

  const expectedSignature = parts[1];
  const computedSignature = createHmac("sha256", secret).update(payload).digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const computedBuffer = Buffer.from(computedSignature, "hex");

  if (expectedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, computedBuffer);
}

// Helper to normalize phone numbers
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("521") && digits.length === 13) {
    return "52" + digits.slice(3);
  }
  return digits;
}

// WhatsApp API Sender Helper
async function sendWhatsAppMessage(to: string, text: string): Promise<string | null> {
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
        type: "text",
        text: {
          body: text,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Error sending WhatsApp message:", data);
      // Registrar incidente en la base de datos
      await db.crearIncidente(
        "WHATSAPP",
        `Falla al enviar mensaje de WhatsApp. API de Meta retornó status ${response.status}`,
        JSON.stringify(data)
      ).catch(dbErr => console.error("Error al registrar incidente de WhatsApp en DB:", dbErr));
      return null;
    } else {
      console.log("WhatsApp message sent successfully:", data);
      return data?.messages?.[0]?.id || null;
    }
  } catch (error: any) {
    console.error("Network error sending WhatsApp message:", error);
    // Registrar incidente en la base de datos ante error de red
    await db.crearIncidente(
      "WHATSAPP",
      `Error de red al intentar conectar con la API de WhatsApp de Meta`,
      error instanceof Error ? error.stack : JSON.stringify(error)
    ).catch(dbErr => console.error("Error al registrar incidente de WhatsApp en DB:", dbErr));
    return null;
  }
}

async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string): Promise<string | null> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId || token === "mock-whatsapp-token" || phoneId === "mock-phone-id") {
    console.log("WhatsApp credentials not set or mock. Skipping image API call.");
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
          caption: caption || undefined
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Error sending WhatsApp image:", data);
      await db.crearIncidente(
        "WHATSAPP",
        `Falla al enviar imagen de WhatsApp. API de Meta retornó status ${response.status}`,
        JSON.stringify(data)
      ).catch(dbErr => console.error("Error al registrar incidente de WhatsApp en DB:", dbErr));
      return null;
    } else {
      console.log("WhatsApp image sent successfully:", data);
      return data?.messages?.[0]?.id || null;
    }
  } catch (error: any) {
    console.error("Network error sending WhatsApp image:", error);
    await db.crearIncidente(
      "WHATSAPP",
      `Error de red al intentar enviar imagen de WhatsApp`,
      error instanceof Error ? error.stack : JSON.stringify(error)
    ).catch(dbErr => console.error("Error al registrar incidente de WhatsApp en DB:", dbErr));
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verified successfully!");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!validateSignature(rawBody, signature)) {
      console.error("Invalid signature on WhatsApp webhook payload.");
      return new NextResponse("Unauthorized Signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("Webhook received body:", JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    // If it's a message status update or not a message field, ignore
    if (!message || change?.field !== "messages") {
      return NextResponse.json({ status: "ignored" });
    }

    const rawPhone = message.from;
    const clientName = contact?.profile?.name || `Cliente WhatsApp (${rawPhone})`;

    // Convert raw Meta timestamp (in seconds) to Date
    const timestampStr = message.timestamp;
    let creadoEn: Date | undefined = undefined;
    if (timestampStr) {
      const seconds = parseInt(timestampStr, 10);
      if (!isNaN(seconds)) {
        creadoEn = new Date(seconds * 1000);
      }
    }

    // Get or create conversation in db (fetched once at the top)
    const conv = await db.getOrCreateConversationByPhone(rawPhone, clientName);

    // Si un lead en estado CONTACTADO, PERDIDO, está marcado como contactado o con agente asignado se vuelve a comunicar, reactivar la IA y regresarlo a la columna correspondiente en el embudo
    if (conv.idLead) {
      const currentLead = await db.getLeadById(conv.idLead);
      if (currentLead) {
        if (currentLead.estado === "ATENCION_HUMANA") {
          // Si está en ATENCION_HUMANA, no reactivamos la IA automáticamente para dejar que el humano atienda.
          // Tampoco modificamos el estado del lead.
        } else if (currentLead.contactado || currentLead.estado === "CONTACTADO" || currentLead.estado === "PERDIDO" || !conv.iaActiva || currentLead.idUsuarioAsignado) {
          if (currentLead.estado === "GANADO") {
            // Si ya está en GANADO (Listo para el Cierre), no alteramos su estado ni agente asignado.
            // Solo reactivamos la IA si estaba inactiva.
            if (!conv.iaActiva) {
              await db.updateConversation(conv.id, { iaActiva: true });
              conv.iaActiva = true;
            }
          } else {
            const hasCity = currentLead.ciudad && currentLead.ciudad !== "Por definir" && currentLead.ciudad !== "";
            const targetStatus = currentLead.estado === "PERDIDO" ? (hasCity ? "CONTACTADO" : "NUEVO") : currentLead.estado;
            console.log(`[RE-ACTIVACIÓN KANBAN] Lead ${conv.idLead} (Estado: ${currentLead.estado}, Contactado: ${currentLead.contactado}) volvió a escribir. Re-activando IA y regresando a '${targetStatus}' en el Embudo.`);
            
            await db.updateConversation(conv.id, { iaActiva: true });
            conv.iaActiva = true;

            await db.updateLead(conv.idLead, { 
              estado: targetStatus,
              idUsuarioAsignado: null,
              contactado: false
            });
          }
        }
      }
    }

    // Process non-text messages by logging them and responding if IA is active
    if (message.type !== "text") {
      let label = `[Archivo / Multimedia (${message.type})]`;
      if (message.type === "image") label = "[Imagen / Foto]";
      if (message.type === "audio" || message.type === "voice") label = "[Nota de voz / Audio]";
      if (message.type === "document") label = "[Documento]";
      if (message.type === "video") label = "[Video]";

      // Guardar el mensaje inbound
      await db.addMessage({
        idConversacion: conv.id,
        direccion: "INBOUND",
        tipoRemitente: "CLIENT",
        contenido: label,
        creadoEn: creadoEn
      });

      // Si la IA está activa, enviar respuesta automática aclarando que no puede leer multimedia
      if (conv.iaActiva) {
        const responseText = "¡Hola! 😊 En este momento por este medio automático solo puedo leer mensajes de texto. Si me envió un audio, imagen o documento, le pido de favor que me lo escriba en texto para poder ayudarle a resolver sus dudas. ¡Muchas gracias! 💛✨";
        await sendWhatsAppMessage(rawPhone, responseText);
        
        await db.addMessage({
          idConversacion: conv.id,
          direccion: "OUTBOUND",
          tipoRemitente: "IA",
          contenido: responseText,
          creadoEn: creadoEn ? new Date(creadoEn.getTime() + 1000) : undefined
        });
      }

      return NextResponse.json({ status: "handled_non_text_type", type: message.type });
    }

    const content = message.text?.body;

    if (!content) {
      return NextResponse.json({ status: "empty_content" });
    }

    // Auto-detect location (city & zone), service of interest, and age from text and update lead deterministically
    if (conv.idLead) {
      const loc = detectLocationFromText(content);
      const multipleAges = detectMultipleAgesFromText(content);
      const detectedService = detectServiceFromText(content);
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
        console.log(`[EXTRACTOR DETERMINISTA] Actualizando Lead ${conv.idLead} con:`, detUpdates);
        await db.updateLead(conv.idLead, detUpdates);
      }

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

    // Buscar si el cliente está respondiendo a un mensaje específico en WhatsApp (message.context.id)
    let idMensajeRespondido: string | null = null;
    let textoCitado: string | null = null;

    if (message.context?.id) {
      try {
        const parentMsgs: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id", "contenido" FROM "Mensaje" WHERE "idMensajeWhatsapp" = $1 LIMIT 1`,
          message.context.id
        );
        if (parentMsgs.length > 0) {
          idMensajeRespondido = parentMsgs[0].id;
          textoCitado = parentMsgs[0].contenido;
          console.log(`[CITA DETECTADA EN WEBHOOK] El cliente respondió al mensaje ${idMensajeRespondido} con texto: "${textoCitado}"`);
        }
      } catch (e) {
        console.error("Error al buscar mensaje respondido en webhook:", e);
      }
    }

    // Guardar mensaje original (INBOUND)
    const newMsg = await db.addMessage({
      idConversacion: conv.id,
      direccion: "INBOUND",
      tipoRemitente: "CLIENT",
      idMensajeWhatsapp: message.id,
      idMensajeRespondido: idMensajeRespondido,
      textoCitado: textoCitado,
      contenido: content,
      creadoEn: creadoEn
    } as any);

    // Extraer y guardar información del Lead en la base de datos si aplica
    let extractedData: any = null;
    if (conv.idLead) {
      try {
        const chatHistoryForExtraction = await db.getMessagesByConversationId(conv.id);
        const recentHistoryText = chatHistoryForExtraction.slice(-8).map(m => `${m.direccion === "INBOUND" ? "Cliente" : "Asistente"}: ${m.contenido}`).join("\n");
        
        extractedData = await extractLeadInfo(content, recentHistoryText);
        if (extractedData) {
          const updates: any = {};
          const currentLead = await db.getLeadById(conv.idLead);
          
          if (extractedData.nombreCompleto && extractedData.nombreCompleto !== "Gerardo Pineda") {
            updates.nombreCompleto = extractedData.nombreCompleto;
          }
          // Solo actualizar ciudad si el lead aún no tiene una ciudad válida registrada
          // Evita que una colonia mencionada después sobreescriba la ciudad dicha al inicio
          const ciudadesValidas = ["Puebla", "CDMX", "Atlixco", "Querétaro", "Xalapa"];
          const ciudadActualValida = currentLead?.ciudad && ciudadesValidas.includes(currentLead.ciudad);
          if (extractedData.ciudad && !ciudadActualValida) updates.ciudad = extractedData.ciudad;
          if (extractedData.zona) updates.zona = extractedData.zona;
          if (extractedData.interesServicio) updates.interesServicio = extractedData.interesServicio;
          if (extractedData.edadHijo !== undefined && extractedData.edadHijo !== null) {
            updates.edadHijo = Number(extractedData.edadHijo);
          }
          if (extractedData.cantidadHijos !== undefined && extractedData.cantidadHijos !== null) {
            updates.cantidadHijos = Number(extractedData.cantidadHijos);
          }
          if (extractedData.diasSolicitados) updates.diasSolicitados = extractedData.diasSolicitados;
          if (extractedData.esHorarioVariable) {
            updates.diasSolicitados = "Horario variable";
            updates.horaInicioSolicitada = "Variable";
            updates.horaFinSolicitada = "Variable";
          }
          // Guardar horario solo si el valor es un formato HH:MM válido o una duración como "8 horas"
          // y no sobreescribir un valor ya válido con uno nuevo que sea null o malformado
          const esHoraValida = (v: string | null | undefined) => 
            v && (/^\d{1,2}:\d{2}$/.test(v) || /\d+\s*h(ora|r)/i.test(v));
          if (extractedData.horaInicioSolicitada && esHoraValida(extractedData.horaInicioSolicitada)) {
            if (!currentLead?.horaInicioSolicitada || !esHoraValida(currentLead.horaInicioSolicitada)) {
              updates.horaInicioSolicitada = extractedData.horaInicioSolicitada;
            }
          }
          if (extractedData.horaFinSolicitada && esHoraValida(extractedData.horaFinSolicitada)) {
            if (!currentLead?.horaFinSolicitada || !esHoraValida(currentLead.horaFinSolicitada)) {
              updates.horaFinSolicitada = extractedData.horaFinSolicitada;
            }
          }
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

          // Generar la nota narrativa del Asistente IA con todas las preguntas y datos capturados
          const summaryNote = buildNarrativeSummary(currentLead, updates, extractedData.nuevosHijos);

          // Filtrar campos que no pertenecen a la tabla Prisma Lead antes de db.updateLead
          const dbUpdates = { ...updates };
          delete dbUpdates.preguntasMencionadas;

          if (Object.keys(dbUpdates).length > 0) {
            console.log(`[EXTRACTOR IA] Actualizando Lead ${conv.idLead} con:`, dbUpdates);
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
        console.error("Error al extraer información del Lead:", err);
      }
    }

    // Si la IA está activada en la conversación, generamos la respuesta de forma síncrona en el request
    if (conv.iaActiva) {
      try {
        const lowerText = content.toLowerCase();
        const aiResponseText = await generateAIResponse(conv.id, content);

        // Guardar mensaje de IA en la DB
        let quoteCreated = null;
        let finalResponseText = aiResponseText;
        let imageUrl = "";

        if (conv.idLead) {
          const tagRegex = /\[[\s\*]*COTIZACION:[\s\*]*(\d+(?:\.\d+)?|CALCULAR)[\s\*]*\]/i;
          const match = aiResponseText.match(tagRegex);
          const hasCurrency = /\$\s*[\d,]+/i.test(aiResponseText);
          if (match || hasCurrency) {
            let proposedPrice = match ? (match[1] !== "CALCULAR" ? parseFloat(match[1]) : undefined) : undefined;
            if (!proposedPrice && hasCurrency) {
              const currencyMatch = aiResponseText.match(/\$\s*([0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]+)?)/);
              if (currencyMatch) {
                proposedPrice = parseFloat(currencyMatch[1].replace(/,/g, ""));
              }
            }
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
                  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
                  // Manejar cruce de medianoche (ej. 16:00 a 02:00 = 10 horas)
                  if (mins < 0) mins += 24 * 60;
                  // Servicio de 24 horas: misma hora inicio y fin ("de X hasta X del siguiente día")
                  if (mins === 0 || mins === 24 * 60) {
                    horasDiarias = 24;
                  } else if (mins > 0) {
                    horasDiarias = Math.ceil(mins / 60);
                  }
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
                proposedPrice,
                lead
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
          idConversacion: conv.id,
          direccion: "OUTBOUND",
          tipoRemitente: "IA",
          contenido: finalResponseText,
          urlMultimedia: imageUrl || null,
          creadoEn: creadoEn ? new Date(creadoEn.getTime() + 1000) : undefined
        } as any);

        // Enviar el mensaje generado de forma real por WhatsApp al número del cliente
        if (conv) {
          let sentWamid: string | null = null;
          if (imageUrl) {
            sentWamid = await sendWhatsAppImage(rawPhone, imageUrl, finalResponseText);
          } else {
            sentWamid = await sendWhatsAppMessage(rawPhone, finalResponseText);
          }

          if (sentWamid && newAiMsg?.id) {
            try {
              await prisma.$executeRawUnsafe(
                `UPDATE "Mensaje" SET "idMensajeWhatsapp" = $1 WHERE "id" = $2`,
                sentWamid, newAiMsg.id
              );
            } catch (e) {
              console.error("Error updating IA outbound webhook wamid:", e);
            }
          }
        }

        // Actualizar datos de lead si aplica
        if (conv.idLead) {
          const lead = await db.getLeadById(conv.idLead);
          if (lead) {
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
                                  (lowerAiResponse.includes("asesor") && (lowerAiResponse.includes("contacto") || lowerAiResponse.includes("comunic") || lowerAiResponse.includes("canaliz") || lowerAiResponse.includes("llamar") || lowerAiResponse.includes("revis") || lowerAiResponse.includes("envi") || lowerAiResponse.includes("escrib") || lowerAiResponse.includes("atend") || lowerAiResponse.includes("tom"))) ||
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
            const expresoInteresEnContratar = Boolean(extractedData?.listoParaCierre) || hasBuyingIntent(content, recentHistoryStr);

            // Solo es Listo para Cierre si se cumplen los 3 requisitos al mismo tiempo
            const isClosingIntent = tieneInfoCompletaParaCotizar && yaFueCotizado && expresoInteresEnContratar;

            const isHumanRequested = detectHumanAttentionRequest(content) || 
                                     Boolean(extractedData?.requiereAtencionHumana) || 
                                     esHandoffText;
            
            let nuevoEstado = lead.estado;

            // 1. Priorizar Handoff/Atención Humana si se detecta traspaso (ya sea por texto de la IA o por el extractor)
            if (isHumanRequested) {
              nuevoEstado = "ATENCION_HUMANA";
              await db.updateConversation(conv.id, { iaActiva: false });
              console.log(`[ATENCIÓN HUMANA DETECTADA] Lead ${conv.idLead} cambió a estado ATENCION_HUMANA e IA fue pausada.`);
            }
            // 2. Priorizar intención de cierre automática -> GANADO ("Listos para el Cierre")
            else if (isClosingIntent) {
              nuevoEstado = "GANADO";
              console.log(`[INTENCIÓN DE CIERRE VÁLIDA] Lead ${conv.idLead} cumple los 3 requisitos -> GANADO (Listo para cierre).`);
            }
            // 3. Fallback a la decisión contextual de la IA si está disponible en extractedData
            else if (extractedData?.estadoEmbudo && ["CONTACTADO", "COTIZADO", "GANADO", "ATENCION_HUMANA"].includes(extractedData.estadoEmbudo)) {
              const esDegradacion = (lead.estado === "COTIZADO" || quoteCreated) && (extractedData.estadoEmbudo === "CONTACTADO" || extractedData.estadoEmbudo === "NUEVO");
              nuevoEstado = esDegradacion ? "COTIZADO" : extractedData.estadoEmbudo;
              console.log(`[DECISIÓN CONTEXTUAL IA] Lead ${conv.idLead} cambia a estado: ${nuevoEstado}`);
              if (nuevoEstado === "ATENCION_HUMANA") {
                await db.updateConversation(conv.id, { iaActiva: false });
                console.log(`[IA DESACTIVADA] Conversación pausada automáticamente al transferir a ${nuevoEstado}.`);
              }
            } 
            // 4. Fallback a detección de cotización estándar
            else {
              const tieneCotizacionText = lowerAiResponse.includes("precotización") || 
                                          lowerAiResponse.includes("cotización") || 
                                          /\$\d+/.test(aiResponseText);
              
              if ((tieneCotizacionText || quoteCreated) && lead.estado !== "COTIZADO" && lead.estado !== "GANADO" && lead.estado !== "PERDIDO" && lead.estado !== "ATENCION_HUMANA") {
                nuevoEstado = "COTIZADO";
              }
            }

            // Si el cliente ya está en estado GANADO (Listo para el Cierre), no permitimos degradarlo a estados anteriores por automatización
            if (lead.estado === "GANADO" && nuevoEstado !== "ATENCION_HUMANA") {
              nuevoEstado = "GANADO";
            }
            if (lead.estado === "ATENCION_HUMANA" && nuevoEstado !== "GANADO") {
              nuevoEstado = "ATENCION_HUMANA";
            }

            await db.updateLead(conv.idLead, {
              estado: nuevoEstado,
              datosFaltantes: updatedMissing,
              resumenIA: updatedAiSummary ? updatedAiSummary + " Actualización: Cliente comunicó su intención vía WhatsApp." : "Cliente interesado en servicios de cuidado infantil."
            });
          }
        }
      } catch (error) {
        console.error("Error al procesar respuesta de la IA en el webhook:", error);
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
