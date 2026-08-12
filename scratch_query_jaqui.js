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

  const history = `Cliente: Hola, busco una niñera en Querétaro
Asistente: ¡Hola Jaqui! ... ¿el servicio lo busca de forma fija o eventual...?`;
  const msg = "Fija, 3 días a la semana, 4 horas";

  console.log("Calling extractLeadInfo...");
  const result = await extractLeadInfo(msg, history);
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
