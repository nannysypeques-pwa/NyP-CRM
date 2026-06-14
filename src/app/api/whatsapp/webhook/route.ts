import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAIResponse, detectCityFromText, extractLeadInfo } from "@/lib/openai";
import { createHmac, timingSafeEqual } from "crypto";

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

    // Process only text messages for now
    if (message.type !== "text") {
      return NextResponse.json({ status: "ignored_non_text_type" });
    }

    const rawPhone = message.from;
    const clientName = contact?.profile?.name || `Cliente WhatsApp (${rawPhone})`;
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
      contenido: content
    });

    // Extraer y guardar información del Lead en la base de datos si aplica
    if (conv.idLead) {
      try {
        const chatHistoryForExtraction = await db.getMessagesByConversationId(conv.id);
        const recentHistoryText = chatHistoryForExtraction.slice(-4).map(m => `${m.direccion === "INBOUND" ? "Cliente" : "Asistente"}: ${m.contenido}`).join("\n");
        
        const extractedData = await extractLeadInfo(content, recentHistoryText);
        if (extractedData) {
          const updates: any = {};
          
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

          if (Object.keys(updates).length > 0) {
            console.log(`[EXTRACTOR IA] Actualizando Lead ${conv.idLead} con:`, updates);
            await db.updateLead(conv.idLead, updates);
          }

          if (extractedData.nuevoHijo && extractedData.nuevoHijo.nombre) {
            const currentLead = await db.getLeadById(conv.idLead);
            const existeHijo = currentLead?.hijos?.some(
              h => h.nombre.toLowerCase().trim() === extractedData.nuevoHijo.nombre.toLowerCase().trim()
            );
            if (!existeHijo) {
              console.log(`[EXTRACTOR IA] Creando nuevo hijo para Lead ${conv.idLead}:`, extractedData.nuevoHijo);
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
        await db.addMessage({
          idConversacion: conv.id,
          direccion: "OUTBOUND",
          tipoRemitente: "IA",
          contenido: aiResponseText
        });

        // Enviar el mensaje generado de forma real por WhatsApp al número del cliente
        await sendWhatsAppMessage(rawPhone, aiResponseText);

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

            await db.updateLead(conv.idLead, {
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
