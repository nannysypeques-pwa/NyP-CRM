import { db } from "./db";

// Helper para normalizar números de teléfono
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("521") && digits.length === 13) {
    return "52" + digits.slice(3);
  }
  return digits;
}

// WhatsApp API Sender Helper para mensajes de texto
export async function sendWhatsAppMessage(to: string, text: string) {
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
    await db.crearIncidente(
      "WHATSAPP",
      `Error de red al intentar conectar con la API de WhatsApp de Meta`,
      error instanceof Error ? error.stack : JSON.stringify(error)
    ).catch(dbErr => console.error("Error al registrar incidente de WhatsApp en DB:", dbErr));
  }
}
