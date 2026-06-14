import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.documentoConocimiento.findMany({
    where: { estado: 'ACTIVO' }
  });
  console.log("=== DOCUMENTOS DE CONOCIMIENTO ===");
  console.log(`Total: ${docs.length}`);
  docs.forEach(doc => {
    console.log(`\n--- [${doc.categoria}] ${doc.titulo} ---`);
    console.log(doc.contenido);
  });
}

main().catch(console.error);
