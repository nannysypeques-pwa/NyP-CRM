import { db } from "./db";

const SYSTEM_PROMPT = `Eres el Asistente Comercial Inteligente de "Nannys y Peques", una agencia premium de cuidado infantil en México.
Tu objetivo es responder de manera amable, profesional y concisa a los padres de familia interesados en contratar nuestros servicios vía WhatsApp.

Información Clave de la Empresa:
1. Servicios:
   - Nanny: Enfocadas en cuidado básico, alimentación, higiene y asistencia diaria.
   - Miss Nanny: Cuidadoras profesionales con carrera en educación, pedagogía o psicología infantil. Se enfocan en estimulación oportuna, apoyo escolar y desarrollo cognitivo.
2. Precios sugeridos:
   - Medio tiempo (4 hrs diarias de lunes a viernes): aprox $12,400 MXN mensuales ($450 USD).
   - Tiempo completo (8 hrs diarias de lunes a viernes): aprox $22,000 MXN mensuales.
3. Cobertura:
   - Ciudad de México (Polanco, Lomas, Condesa, Santa Fe).
   - Monterrey (San Pedro Garza García, Carretera Nacional).
   - Guadalajara (Zapopan, Providencia).
4. Políticas de cancelación:
   - Servicios eventuales cancelados con menos de 24 horas de anticipación generan cargo del 50%.
   - Servicios mensuales fijos requieren 15 días de preaviso para cancelación.
5. Certificación:
   - Todas nuestras Nannys cuentan con certificación activa en Primeros Auxilios Pediátricos.

Pautas de comportamiento en el Chat:
- Sé empático, cálido y conciso (máximo 2-3 párrafos cortos por respuesta).
- Si el cliente pregunta por costos, coberturas o servicios, proporciónale la información relevante con base en los datos anteriores.
- Si falta información del prospecto (como la edad del niño, el horario deseado o la zona), intenta preguntarle de forma natural para calificar el lead, pero prioriza responder su duda actual.
- Mantén un tono sumamente profesional y educado, usando emojis de manera moderada.
- No inventes precios o servicios fuera de los descritos.`;

// Rule-based fallback response for mock mode or API errors
function getFallbackResponse(userInput: string): string {
  const lowerText = userInput.toLowerCase();
  
  if (lowerText.includes("incluye") || lowerText.includes("programa")) {
    return "Nuestro programa de Cuidado Premium incluye: 1) Actividades de estimulación oportuna adaptadas a la edad del peque, 2) Bitácora digital de alimentación y sueño, 3) Reportes de progreso semanales y 4) Acompañamiento por una cuidadora profesional con background en pedagogía/psicología. ¿Te gustaría agendar una llamada de 10 minutos para platicarlo?";
  } else if (lowerText.includes("precio") || lowerText.includes("costo") || lowerText.includes("tarifa") || lowerText.includes("cuánto")) {
    return "Para el Cuidado Premium de Medio Tiempo (4 horas diarias de Lunes a Viernes) el costo mensual aproximado es de $12,400 MXN ($450 USD). La tarifa para tiempo completo (8 horas) es de $22,000 MXN. ¿Qué horario te acomodaría mejor?";
  } else if (lowerText.includes("horario") || lowerText.includes("días") || lowerText.includes("hora")) {
    return "Brindamos servicio en horarios muy flexibles. El turno matutino sugerido es de 9:00 AM a 1:00 PM y el vespertino de 2:00 PM a 6:00 PM. Sin embargo, nos adaptamos a la agenda de tu familia. ¿Prefieres matutino o vespertino?";
  } else if (lowerText.includes("ubicación") || lowerText.includes("dónde") || lowerText.includes("dirección")) {
    return "Contamos con cobertura completa de cuidadoras en Ciudad de México (Polanco, Lomas, Condesa, Santa Fe), Monterrey (San Pedro, Carretera Nacional) y Guadalajara (Zapopan, Providencia). ¿En qué zona te encuentras?";
  } else if (lowerText.includes("gracias") || lowerText.includes("ok") || lowerText.includes("enterado")) {
    return "¡Con mucho gusto! Estoy aquí para resolver cualquier duda. Si deseas concretar una cotización formal, solo dime y la preparamos de inmediato.";
  }
  
  return "Entiendo perfectamente. He guardado esta información en tu perfil. ¿Hay algún otro requerimiento específico que deba saber sobre el cuidado de tu peque para sugerirte el mejor servicio?";
}

export function detectCityFromText(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("puebla")) return "Puebla";
  if (lower.includes("atlixco")) return "Atlixco";
  if (lower.includes("xalapa") || lower.includes("jalapa")) return "Xalapa";
  if (lower.includes("queretaro") || lower.includes("querétaro") || lower.includes("qro")) return "Querétaro";
  if (lower.includes("cdmx") || lower.includes("ciudad de mexico") || lower.includes("ciudad de méxico") || lower.includes("df") || lower.includes("distrito federal")) return "CDMX";
  return null;
}

export async function generateAIResponse(idConversacion: string, lastMessageContent: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  // If using the default development key or no key, skip automatic response by throwing an error
  if (!apiKey || apiKey === "sk-mock-key-for-development") {
    throw new Error("OpenAI API Key is not configured or is set to development mock key. Skipping automatic response.");
  }

  try {
    // Fetch lead details for dynamic context
    const conv = await db.getConversationById(idConversacion);
    const lead = conv?.idLead ? await db.getLeadById(conv.idLead) : null;
    const leadCity = lead?.ciudad || "Por definir";

    const dynamicPrompt = `${SYSTEM_PROMPT}

[CONTEXTO DEL LEAD ACTUAL]
- Nombre: ${lead?.nombreCompleto || "Prospecto"}
- Ciudad solicitada: ${leadCity}

INSTRUCCIÓN CRÍTICA DE NEGOCIO:
Si la ciudad solicitada es "Por definir", DEBES preguntar amablemente al cliente al inicio o en el transcurso de tu mensaje en cuál de nuestras ciudades de cobertura (CDMX, Puebla, Atlixco, Querétaro o Xalapa) requiere el servicio. Esto es obligatorio para calificar al cliente.`;

    // Fetch last 10 messages from the conversation history to give full context
    const chatHistory = await db.getMessagesByConversationId(idConversacion);
    const recentMessages = chatHistory.slice(-10);

    const formattedMessages = [
      { role: "system", content: dynamicPrompt },
      ...recentMessages.map((m) => ({
        role: m.direccion === "INBOUND" ? "user" : "assistant",
        content: m.contenido,
      })),
    ];

    // If the latest message is not in history yet, add it
    if (recentMessages.length === 0 || recentMessages[recentMessages.length - 1].contenido !== lastMessageContent) {
      formattedMessages.push({ role: "user", content: lastMessageContent });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API call failed (likely credit limit or quota): ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    
    if (reply) {
      return reply.trim();
    }
    
    throw new Error("OpenAI returned an empty response text.");
  } catch (err) {
    console.error("Error communicating with OpenAI:", err);
    throw err;
  }
}
