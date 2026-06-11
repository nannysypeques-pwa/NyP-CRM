import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAIResponse } from "@/lib/openai";

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
    } else {
      console.log("WhatsApp message sent successfully:", data);
    }
  } catch (error) {
    console.error("Network error sending WhatsApp message:", error);
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
    const body = await req.json();
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

    // Guardar mensaje original (INBOUND)
    const newMsg = await db.addMessage({
      idConversacion: conv.id,
      direccion: "INBOUND",
      tipoRemitente: "CLIENT",
      contenido: content
    });

    // Si la IA está activada en la conversación, generamos una respuesta simulada o real
    if (conv.iaActiva) {
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
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
