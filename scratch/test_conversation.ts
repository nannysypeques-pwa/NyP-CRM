import { db } from "../src/lib/db";
import { generateAIResponse } from "../src/lib/openai";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Iniciando prueba del flujo de conversación de la IA...");

  // Buscar un lead de prueba o el principal de Gerardo
  const leads = await db.getLeads();
  let lead = leads.find(l => l.nombreCompleto.includes("Gerardo")) || leads[0];
  if (!lead) {
    console.error("No se encontró ningún lead para realizar la prueba.");
    return;
  }

  console.log(`Usando Lead: ${lead.nombreCompleto} (ID: ${lead.id})`);

  // Buscar conversación asociada
  const conversations = await db.getConversations();
  const conv = conversations.find(c => c.idLead === lead.id);
  if (!conv) {
    console.error("No se encontró una conversación asociada al lead.");
    return;
  }

  // PASO 1: Limpiar zona y razón de contratación
  console.log("\n--- PASO 1: Limpiando zona y razón de contratación para simular cliente nuevo ---");
  await db.updateLead(lead.id, {
    zona: "",
    razonContratacion: "",
    ciudad: "Puebla",
    interesServicio: "Fijo",
    diasSolicitados: "Lunes a Viernes",
    horaInicioSolicitada: "15:00",
    horaFinSolicitada: "18:00"
  });

  // Limpiar historial de mensajes previo
  await prisma.mensaje.deleteMany({
    where: { idConversacion: conv.id }
  });

  // Guardar mensaje de pregunta de precio en la conversación
  await db.addMessage({
    idConversacion: conv.id,
    direccion: "INBOUND",
    tipoRemitente: "CLIENT",
    contenido: "Hola, me gustaría saber cuánto cuesta el servicio de lunes a viernes de 3pm a 6pm para mi hijo"
  });

  // Generar respuesta
  console.log("Generando respuesta de la IA (debería negar precio y pedir zona y razón)...");
  const response1 = await generateAIResponse(conv.id, "Hola, me gustaría saber cuánto cuesta el servicio de lunes a viernes de 3pm a 6pm para mi hijo");
  console.log("\nRespuesta de la IA:");
  console.log(response1);

  // PASO 2: Actualizar zona y razón de contratación (simulando que el cliente responde)
  console.log("\n--- PASO 2: Registrando zona y razón de contratación ---");
  await db.updateLead(lead.id, {
    zona: "Colonia Anzures",
    razonContratacion: "Trabajo por las tardes y requiero apoyo para el regreso de la escuela"
  });

  // Guardar mensaje del cliente con estos datos
  await db.addMessage({
    idConversacion: conv.id,
    direccion: "INBOUND",
    tipoRemitente: "CLIENT",
    contenido: "Vivo en la colonia Anzures y lo requiero porque trabajo por las tardes y necesito apoyo cuando regrese de la escuela"
  });

  // Generar respuesta con datos completos
  console.log("Generando respuesta de la IA (debería dar el precio de $1,610 con labor de venta previa)...");
  const response2 = await generateAIResponse(conv.id, "Cuánto me costaría entonces?");
  console.log("\nRespuesta de la IA con datos completos:");
  console.log(response2);
}

main().catch(err => {
  console.error("Error en la prueba:", err);
});
