import { extractLeadInfo } from "../src/lib/openai";

async function test() {
  const historyText = `Asistente: Perfecto, Gerardo! 😊💛 Ahora, para finalizar la recopilación de información, ¿cuál sería la razón principal por la que requiere el servicio? Esto nos ayudará a entender mejor sus necesidades. ✨
Cliente: Principalmente porque trabajo por las tardes y necesito apoyo para cuidar a Mateo después de la escuela, darle su merienda y acompañarlo con actividades en casa.`;
  const messageContent = `Principalmente porque trabajo por las tardes y necesito apoyo para cuidar a Mateo después de la escuela, darle su merienda y acompañarlo con actividades en casa.`;

  console.log("Iniciando prueba de extracción...");
  const data = await extractLeadInfo(messageContent, historyText);
  console.log("Datos extraídos:", JSON.stringify(data, null, 2));
}

test().catch(console.error);
