const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get OpenAI API Key from environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function extractKidsFromChat(historyText) {
  if (!OPENAI_API_KEY) {
    console.error("Falta la variable de entorno OPENAI_API_KEY");
    return null;
  }

  const prompt = `Analiza la siguiente conversación de WhatsApp entre un cliente (tutor/padre) y un asistente de cuidado infantil.
Tu tarea es extraer a todos los niños (peques) mencionados en la conversación.

Devuelve UNICAMENTE un objeto JSON válido con la siguiente estructura:
{
  "nuevosHijos": [
    {
      "nombre": "Nombre del peque (si no se menciona su nombre real, genera secuencialmente 'Peque 1', 'Peque 2', etc.)",
      "textoEdad": "Edad de forma descriptiva (ej: '3 años', '1 año y medio', '6 meses')",
      "alergias": "Alergias del peque si se mencionan",
      "condicionMedica": "Condición médica si se menciona",
      "estadoSalud": "Estado de salud si se menciona",
      "preferencias": "Preferencias o gustos si se mencionan",
      "indicacionesNanny": "Indicaciones para la nanny si se mencionan",
      "necesidades": "Necesidades específicas si se mencionan"
    }
  ]
}

No incluyas delimitadores como \`\`\`json ni texto explicativo adicional. Solo devuelve el objeto JSON.

Conversación:
${historyText}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un extractor de datos estructurados de alta precisión." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.error(`OpenAI error: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices[0].message.content.trim();
    
    // Clean potential markdown blocks
    const cleanedJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error("Error llamando a OpenAI:", error);
    return null;
  }
}

async function main() {
  console.log("Iniciando migración de información de niños para leads existentes...");

  const leads = await prisma.lead.findMany({
    where: {
      deleted: false
    },
    include: {
      hijos: true,
      conversacion: {
        include: {
          mensajes: {
            orderBy: { creadoEn: 'asc' }
          }
        }
      }
    }
  });

  console.log(`Encontrados ${leads.length} leads en total.`);

  for (const lead of leads) {
    console.log(`-----------------------------------------------`);
    console.log(`Procesando Lead: ${lead.nombreCompleto} (ID: ${lead.id})`);
    
    if (lead.hijos.length > 0) {
      console.log(`El lead ya tiene ${lead.hijos.length} niños registrados. Omitiendo.`);
      continue;
    }

    // Get conversation history
    const conversation = lead.conversacion;
    if (!conversation || conversation.mensajes.length === 0) {
      console.log("No tiene historial de mensajes en WhatsApp. Intentando usar datos del Lead como fallback.");
      
      if (lead.edadHijo) {
        console.log(`Creando Peque genérico para Lead con edadHijo: ${lead.edadHijo}`);
        await prisma.hijo.create({
          data: {
            idLead: lead.id,
            nombre: "Peque 1",
            textoEdad: `${lead.edadHijo} años`,
            alergias: "",
            condicionMedica: "",
            estadoSalud: "",
            preferencias: "",
            indicacionesNanny: "",
            necesidades: ""
          }
        });
        
        await prisma.lead.update({
          where: { id: lead.id },
          data: { cantidadHijos: 1 }
        });
        console.log("Hijo genérico creado con éxito.");
      } else {
        console.log("El lead no tiene edadHijo ni historial de mensajes. Omitiendo.");
      }
      continue;
    }

    // Build chat transcript
    const historyText = conversation.mensajes
      .map(m => `${m.direccion === "INBOUND" ? "Cliente" : "Asistente"}: ${m.contenido}`)
      .join("\n");

    console.log(`Extrayendo niños del historial de chat (${conversation.mensajes.length} mensajes)...`);
    const result = await extractKidsFromChat(historyText);

    if (result && result.nuevosHijos && Array.isArray(result.nuevosHijos) && result.nuevosHijos.length > 0) {
      console.log(`Se extrajeron ${result.nuevosHijos.length} niños:`);
      for (const hijo of result.nuevosHijos) {
        console.log(`- ${hijo.nombre} (${hijo.textoEdad})`);
        
        await prisma.hijo.create({
          data: {
            idLead: lead.id,
            nombre: hijo.nombre,
            textoEdad: hijo.textoEdad || "",
            alergias: hijo.alergias || "",
            condicionMedica: hijo.condicionMedica || "",
            estadoSalud: hijo.estadoSalud || "",
            preferencias: hijo.preferencias || "",
            indicacionesNanny: hijo.indicacionesNanny || "",
            necesidades: hijo.necesidades || ""
          }
        });
      }

      // Update lead child count and main child age
      const firstChild = result.nuevosHijos[0];
      let firstAge = lead.edadHijo;
      if (firstChild && firstChild.textoEdad) {
        const matches = firstChild.textoEdad.match(/\d+/);
        if (matches) {
          firstAge = parseInt(matches[0], 10);
        }
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          cantidadHijos: result.nuevosHijos.length,
          edadHijo: firstAge
        }
      });
      console.log(`Leads e hijos actualizados con éxito.`);
    } else {
      console.log("No se pudieron extraer niños del historial de chat.");
      // Fallback to edadHijo if exists
      if (lead.edadHijo) {
        console.log(`Usando edadHijo fallback: ${lead.edadHijo}`);
        await prisma.hijo.create({
          data: {
            idLead: lead.id,
            nombre: "Peque 1",
            textoEdad: `${lead.edadHijo} años`,
            alergias: "",
            condicionMedica: "",
            estadoSalud: "",
            preferencias: "",
            indicacionesNanny: "",
            necesidades: ""
          }
        });
        await prisma.lead.update({
          where: { id: lead.id },
          data: { cantidadHijos: 1 }
        });
      }
    }
  }

  console.log("Migración finalizada con éxito.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
