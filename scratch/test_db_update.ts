import { db } from "../src/lib/db";

async function main() {
  console.log("Probando actualización directa de razonContratacion...");
  const updated = await db.updateLead("7073aa64-7503-4093-86a9-727620a49507", {
    razonContratacion: "Prueba de guardado directo en DB"
  });
  console.log("Lead actualizado:", JSON.stringify(updated, null, 2));
}

main().catch(console.error);
