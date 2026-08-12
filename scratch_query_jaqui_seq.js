const { extractLeadInfo } = require("./src/lib/openai");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const envLocalPath = path.join(process.cwd(), ".env.local");
  let envFile = "";
  if (fs.existsSync(envLocalPath)) {
    envFile = fs.readFileSync(envLocalPath, "utf8");
  } else if (fs.existsSync(envPath)) {
    envFile = fs.readFileSync(envPath, "utf8");
  }
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.substring(0, idx).trim();
    const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    process.env[key] = val;
  }
}

async function main() {
  loadEnv();

  const messages = [
    { content: "Hola, busco una niñera en Querétaro", assistant: "¡Hola Jaqui! ✨🌷 Qué gusto saludarle. Soy Sofía, agente IA de Nannys y Peques. Con mucho gusto le ayudaré a resolver cualquier duda que tenga sobre nuestros servicios de cuidado infantil en Querétaro. Para orientarle mejor, ¿el servicio lo busca de forma fija o eventual para alguna fecha en particular? 👶💖" },
    { content: "Fija, 3 días a la semana, 4 horas", assistant: "Perfecto, Jaqui ✨🌿 Para poder ayudarle mejor, ¿me podría compartir la edad de su peque? Esto nos ayudará a encontrar la nanny ideal para su familia. 👶✨" },
    { content: "20 meses", assistant: "¡Gracias, Jaqui! 💛 Para su peque de 20 meses, el servicio de Neuronanny sería una excelente opción. Este servicio no solo brinda cuidado, sino que también incluye actividades adecuadas a su edad, como el desarrollo de motricidad gruesa y fina, así como estimulación socioemocional a través del juego. Ahora, para avanzar, ¿podría indicarme en qué zona o colonia de Querétaro requeriría el servicio? 😊📍" },
    { content: "Colonia El Mirador", assistant: "¡Gracias por la información, Jaqui! ✨🌿 Ahora, para finalizar la recopilación de datos, ¿qué horario tiene en mente para el servicio de 4 horas? Esto nos ayudará a coordinar mejor la atención para su peque. 🕗✨" },
    { content: "9am a 1pm", assistant: "¡Excelente, Jaqui! 💫 Entonces, para su servicio de Neuronanny en la Colonia El Mirador, Querétaro, con un horario de 9 am a 1 pm..." }
  ];

  let history = "";
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`\n--- Message ${i+1}: "${msg.content}" ---`);
    const result = await extractLeadInfo(msg.content, history);
    console.log(JSON.stringify(result, null, 2));

    // Update history for next iteration
    history += `Cliente: ${msg.content}\nAsistente: ${msg.assistant}\n`;
  }
}

main().catch(console.error);
