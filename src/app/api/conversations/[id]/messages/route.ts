import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAIResponse, extractLeadInfo } from "@/lib/openai";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messages = await db.getMessagesByConversationId(params.id);
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// Helper para enviar mensajes de WhatsApp a través de la API oficial
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
    } else {
      console.log("WhatsApp message sent successfully:", data);
    }
  } catch (error) {
    console.error("Network error sending WhatsApp message:", error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { direccion, tipoRemitente, idRemitente, contenido } = body;

    if (!direccion || !tipoRemitente || !contenido) {
      return NextResponse.json({ error: "Faltan campos obligatorios (direccion, tipoRemitente o contenido)" }, { status: 400 });
    }

    // Guardar mensaje original
    const newMsg = await db.addMessage({
      idConversacion: params.id,
      direccion,
      tipoRemitente,
      idRemitente,
      contenido
    });

    const conv = await db.getConversationById(params.id);

    // Si el agente responde desde el CRM, enviamos la respuesta de forma real por WhatsApp
    if (direccion === "OUTBOUND" && tipoRemitente === "AGENT" && conv) {
      await sendWhatsAppMessage(conv.telefono, contenido);
    }

    // Si el mensaje viene del cliente (INBOUND) y la IA está activada en la conversación,
    // generamos una respuesta inteligente con OpenAI.
    if (direccion === "INBOUND" && conv?.iaActiva) {
      const lowerText = contenido.toLowerCase();

      // Extraer y guardar información del Lead en la base de datos si aplica
      if (conv.idLead) {
        try {
          const chatHistoryForExtraction = await db.getMessagesByConversationId(conv.id);
          const recentHistoryText = chatHistoryForExtraction.slice(-4).map(m => `${m.direccion === "INBOUND" ? "Cliente" : "Asistente"}: ${m.contenido}`).join("\n");
          
          const extractedData = await extractLeadInfo(contenido, recentHistoryText);
          if (extractedData) {
            const updates: any = {};
            
            if (extractedData.nombreCompleto && extractedData.nombreCompleto !== "Gerardo Pineda") {
              updates.nombreCompleto = extractedData.nombreCompleto;
            }
            if (extractedData.ciudad) updates.ciudad = extractedData.ciudad;
            if (extractedData.zona) updates.zona = extractedData.zona;
            const currentLead = await db.getLeadById(conv.idLead);

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

            // Si se detecta un nuevo hijo con edad y el lead no tiene edad registrada, intentamos extraerla
            if (extractedData.nuevoHijo && extractedData.nuevoHijo.nombre && extractedData.nuevoHijo.textoEdad) {
              if (!updates.edadHijo && (!currentLead || !currentLead.edadHijo)) {
                const matches = extractedData.nuevoHijo.textoEdad.match(/\d+/);
                if (matches) {
                  updates.edadHijo = parseInt(matches[0], 10);
                }
              }
            }

            if (Object.keys(updates).length > 0) {
              console.log(`[EXTRACTOR IA - CRM] Actualizando Lead ${conv.idLead} con:`, updates);
              await db.updateLead(conv.idLead, updates);
              
              const fieldsText = Object.entries(updates)
                .map(([k, v]) => `${k} = "${v}"`)
                .join(", ");
              await db.addNota(conv.idLead, `[Extractor IA] Datos calificados (chat CRM): ${fieldsText}`, "Asistente IA");
            }

            if (extractedData.nuevoHijo && extractedData.nuevoHijo.nombre) {
              const existeHijo = currentLead?.hijos?.some(
                h => h.nombre.toLowerCase().trim() === extractedData.nuevoHijo.nombre.toLowerCase().trim()
              );
              if (!existeHijo) {
                console.log(`[EXTRACTOR IA - CRM] Creando nuevo hijo para Lead ${conv.idLead}:`, extractedData.nuevoHijo);
                await db.crearHijo({
                  idLead: conv.idLead,
                  nombre: extractedData.nuevoHijo.nombre,
                  textoEdad: extractedData.nuevoHijo.textoEdad,
                  alergias: extractedData.nuevoHijo.alergias || "",
                  condicionMedica: extractedData.nuevoHijo.condicionMedica || "",
                  estadoSalud: extractedData.nuevoHijo.estadoSalud || "",
                  preferencias: extractedData.nuevoHijo.preferencias || "",
                  indicacionesNanny: extractedData.nuevoHijo.indicacionesNanny || "",
                  necesidades: extractedData.nuevoHijo.necesidades || ""
                });

                const hijoNota = `[Extractor IA] Peque calificado (chat CRM): ${extractedData.nuevoHijo.nombre} (${extractedData.nuevoHijo.textoEdad || "edad no especificada"})${extractedData.nuevoHijo.alergias ? `, Alergias: ${extractedData.nuevoHijo.alergias}` : ""}${extractedData.nuevoHijo.condicionMedica ? `, Condición: ${extractedData.nuevoHijo.condicionMedica}` : ""}`;
                await db.addNota(conv.idLead, hijoNota, "Asistente IA");
              }
            }
          }
        } catch (err) {
          console.error("Error al extraer información del Lead en chat CRM:", err);
        }
      }

      const aiResponseText = await generateAIResponse(params.id, contenido);

      // Guardar el mensaje generado por la IA en la base de datos
      await db.addMessage({
        idConversacion: params.id,
        direccion: "OUTBOUND",
        tipoRemitente: "IA",
        contenido: aiResponseText
      });
      
      // Actualizar datos faltantes y resumen de IA al final
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

          await db.updateLead(conv.idLead, {
            datosFaltantes: updatedMissing,
            resumenIA: updatedAiSummary ? updatedAiSummary + " Actualización: Cliente proporcionó más detalles en el chat." : "Cliente interesado en servicios de cuidado infantil."
          });
        }
      }
    }

    return NextResponse.json(newMsg, { status: 201 });
  } catch (error) {
    console.error("Error posting message:", error);
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
  }
}
