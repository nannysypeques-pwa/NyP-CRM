import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    // simulamos una respuesta inteligente instantánea.
    if (direccion === "INBOUND" && conv?.iaActiva) {
      // Determinar respuesta simulada
      let aiResponseText = "";
      const lowerText = contenido.toLowerCase();

      if (lowerText.includes("incluye") || lowerText.includes("programa")) {
        aiResponseText = "Nuestro programa de Cuidado Premium incluye: 1) Actividades de estimulación oportuna adaptadas a la edad del peque, 2) Bitácora digital de alimentación y sueño, 3) Reportes de progreso semanales y 4) Cuidado y acompañamiento por una cuidadora profesional con background en pedagogía/psicología. ¿Te gustaría agendar una llamada de 10 minutos para platicarlo?";
      } else if (lowerText.includes("precio") || lowerText.includes("costo") || lowerText.includes("tarifa") || lowerText.includes("cuánto")) {
        aiResponseText = "Para el Cuidado Premium de Medio Tiempo (4 horas diarias de Lunes a Viernes) el costo mensual aproximado es de $12,400 MXN ($450 USD). La tarifa para tiempo completo (8 horas) es de $22,000 MXN. ¿Qué horario te acomodaría mejor?";
      } else if (lowerText.includes("horario") || lowerText.includes("días") || lowerText.includes("hora")) {
        aiResponseText = "Brindamos servicio en horarios muy flexibles. El turno matutino sugerido es de 9:00 AM a 1:00 PM y el vespertino de 2:00 PM a 6:00 PM. Sin embargo, nos adaptamos a la agenda de tu familia. ¿Prefieres matutino o vespertino?";
      } else if (lowerText.includes("ubicación") || lowerText.includes("dónde") || lowerText.includes("dirección")) {
        aiResponseText = "Contamos con cobertura completa de cuidadoras en Ciudad de México (Polanco, Lomas, Condesa, Santa Fe), Monterrey (San Pedro, Carretera Nacional) y Guadalajara (Zapopan, Providencia). ¿En qué zona te encuentras?";
      } else if (lowerText.includes("gracias") || lowerText.includes("ok") || lowerText.includes("enterado")) {
        aiResponseText = "¡Con mucho gusto! Estoy aquí para resolver cualquier duda. Si deseas concretar una cotización formal, solo dime y la preparamos de inmediato.";
      } else {
        aiResponseText = "Entiendo. Guardé esa información en tu perfil. ¿Hay algún otro requerimiento específico que deba saber sobre el cuidado del peque para poder sugerirte el mejor servicio?";
      }

      // Guardar el mensaje generado por la IA en la base de datos
      await db.addMessage({
        idConversacion: params.id,
        direccion: "OUTBOUND",
        tipoRemitente: "IA",
        contenido: aiResponseText
      });
      
      // Actualizar los datos faltantes o intención si procede (Simulación de Extracción por IA)
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
