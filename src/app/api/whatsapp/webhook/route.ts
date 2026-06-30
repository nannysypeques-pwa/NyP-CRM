import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAIResponse, detectCityFromText, extractLeadInfo, parseNumDias } from "@/lib/openai";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";

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
async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId || token === "mock-whatsapp-token" || phoneId === "mock-phone-id") {
    console.log("WhatsApp credentials not set or mock. Skipping API call.");
    return;
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
    } else {
      console.log("WhatsApp message sent successfully:", data);
    }
  } catch (error: any) {
    console.error("Network error sending WhatsApp message:", error);
    // Registrar incidente en la base de datos ante error de red
    await db.crearIncidente(
      "WHATSAPP",
      `Error de red al intentar conectar con la API de WhatsApp de Meta`,
      error instanceof Error ? error.stack : JSON.stringify(error)
    ).catch(dbErr => console.error("Error al registrar incidente de WhatsApp en DB:", dbErr));
  }
}

async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId || token === "mock-whatsapp-token" || phoneId === "mock-phone-id") {
    console.log("WhatsApp credentials not set or mock. Skipping image API call.");
    return;
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
    } else {
      console.log("WhatsApp image sent successfully:", data);
    }
  } catch (error: any) {
    console.error("Network error sending WhatsApp image:", error);
    await db.crearIncidente(
      "WHATSAPP",
      `Error de red al intentar enviar imagen de WhatsApp`,
      error instanceof Error ? error.stack : JSON.stringify(error)
    ).catch(dbErr => console.error("Error al registrar incidente de WhatsApp en DB:", dbErr));
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

    // Process non-text messages by logging them and responding if IA is active
    if (message.type !== "text") {
      const conv = await db.getOrCreateConversationByPhone(rawPhone, clientName);
      
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

    // Get or create conversation in db
    const conv = await db.getOrCreateConversationByPhone(rawPhone, clientName);

    // Auto-detect city and update lead
    if (conv.idLead) {
      const detectedCity = detectCityFromText(content);
      if (detectedCity) {
        const lead = await db.getLeadById(conv.idLead);
          console.log(`Detected city "${detectedCity}" from WhatsApp message, updating Lead ${conv.idLead} to CONTACTADO`);
          await db.updateLead(conv.idLead, { 
            ciudad: detectedCity,
            estado: "CONTACTADO"
          });
      }
    }

    // Guardar mensaje original (INBOUND)
    const newMsg = await db.addMessage({
      idConversacion: conv.id,
      direccion: "INBOUND",
      tipoRemitente: "CLIENT",
      contenido: content,
      creadoEn: creadoEn
    });

    // Extraer y guardar información del Lead en la base de datos si aplica
    let extractedData: any = null;
    if (conv.idLead) {
      try {
        const chatHistoryForExtraction = await db.getMessagesByConversationId(conv.id);
        const recentHistoryText = chatHistoryForExtraction.slice(-4).map(m => `${m.direccion === "INBOUND" ? "Cliente" : "Asistente"}: ${m.contenido}`).join("\n");
        
        extractedData = await extractLeadInfo(content, recentHistoryText);
        if (extractedData) {
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

          if (Object.keys(updates).length > 0) {
            console.log(`[EXTRACTOR IA] Actualizando Lead ${conv.idLead} con:`, updates);
            await db.updateLead(conv.idLead, updates);
            
            // Agregar una nota de seguimiento interna en el Lead para auditar los datos extraídos
            const fieldsText = Object.entries(updates)
              .map(([k, v]) => `${k} = "${v}"`)
              .join(", ");
            await db.addNota(conv.idLead, `[Extractor IA] Datos calificados: ${fieldsText}`, "Asistente IA");
          }

          if (extractedData.nuevosHijos && Array.isArray(extractedData.nuevosHijos)) {
            const currentLeadForChild = await db.getLeadById(conv.idLead);
            for (const hijo of extractedData.nuevosHijos) {
              if (!hijo.nombre) continue;
              
              const existeHijo = currentLeadForChild?.hijos?.some(
                h => h.nombre.toLowerCase().trim() === hijo.nombre.toLowerCase().trim()
              );
              
              if (!existeHijo) {
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
                  
                  const renameNota = `[Extractor IA] Peque renombrado: ${placeholderHijo.nombre} ahora es ${hijo.nombre} (${hijo.textoEdad})`;
                  await db.addNota(conv.idLead, renameNota, "Asistente IA");
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

                  // Agregar nota de seguimiento para el peque calificado
                  const hijoNota = `[Extractor IA] Peque calificado: ${hijo.nombre} (${hijo.textoEdad || "edad no especificada"})${hijo.alergias ? `, Alergias: ${hijo.alergias}` : ""}${hijo.condicionMedica ? `, Condición: ${hijo.condicionMedica}` : ""}`;
                  await db.addNota(conv.idLead, hijoNota, "Asistente IA");
                }
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
          const tagRegex = /\[COTIZACION:(\d+)\]/;
          const match = aiResponseText.match(tagRegex);
          if (match) {
            const price = parseFloat(match[1]);
            finalResponseText = aiResponseText.replace(tagRegex, "").trim();

            const lead = await db.getLeadById(conv.idLead);
            if (lead) {
              let numDias = 0;
              if (lead.diasSolicitados) {
                numDias = parseNumDias(lead.diasSolicitados);
              }

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
                // Create a new Quote in the database
                quoteCreated = await prisma.cotizacion.create({
                  data: {
                    idLead: conv.idLead,
                    tipoServicio: lead.interesServicio || "Por horas",
                    ciudad: lead.ciudad,
                    dias: lead.diasSolicitados || "Por definir",
                    horaInicio: lead.horaInicioSolicitada || "09:00",
                    horaFin: lead.horaFinSolicitada || "17:00",
                    horasPorDia: horasDiarias || 8,
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
              }
            }
          }
        }

        if (quoteCreated) {
          const host = req.headers.get("host") || "localhost:3000";
          const protocol = req.headers.get("x-forwarded-proto") || "http";
          const appUrl = `${protocol}://${host}`;
          imageUrl = `${appUrl}/api/cotizaciones/${quoteCreated.id}/image`;
        }

        await db.addMessage({
          idConversacion: conv.id,
          direccion: "OUTBOUND",
          tipoRemitente: "IA",
          contenido: finalResponseText,
          urlMultimedia: imageUrl || null,
          creadoEn: creadoEn ? new Date(creadoEn.getTime() + 1000) : undefined
        } as any);

        // Enviar el mensaje generado de forma real por WhatsApp al número del cliente
        if (imageUrl) {
          await sendWhatsAppImage(rawPhone, imageUrl, finalResponseText);
        } else {
          await sendWhatsAppMessage(rawPhone, finalResponseText);
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

            // Detectar si el cliente está listo para el cierre / contratación o handoff de la IA
            const lowerAiResponse = aiResponseText.toLowerCase();
            const esHandoffText = lowerAiResponse.includes("canalizar") || 
                                  lowerAiResponse.includes("canalizaré") || 
                                  lowerAiResponse.includes("pasar con un asesor") || 
                                  lowerAiResponse.includes("paso con un asesor") || 
                                  lowerAiResponse.includes("transferir") || 
                                  lowerAiResponse.includes("equipo de asesoría");
            
            let nuevoEstado = lead.estado;
            if (esHandoffText || (extractedData && extractedData.listoParaCierre)) {
              nuevoEstado = "GANADO";
            } else {
              const tieneCotizacionText = lowerAiResponse.includes("precotización") || 
                                          lowerAiResponse.includes("cotización") || 
                                          /\$\d+/.test(aiResponseText);
              
              if (tieneCotizacionText && lead.estado !== "COTIZADO" && lead.estado !== "GANADO" && lead.estado !== "PERDIDO") {
                nuevoEstado = "COTIZADO";
              }
            }

            await db.updateLead(conv.idLead, {
              estado: nuevoEstado,
              datosFaltantes: updatedMissing,
              resumenIA: updatedAiSummary ? updatedAiSummary + " Actualización: Cliente proporcionó más detalles vía WhatsApp." : "Cliente interesado en servicios de cuidado infantil."
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
