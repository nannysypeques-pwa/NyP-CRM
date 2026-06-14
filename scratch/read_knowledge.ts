import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.documentoConocimiento.findMany();
  console.log("=== DOCUMENTOS DE CONOCIMIENTO ===");
  docs.forEach(doc => {
    console.log(`\nID: ${doc.id}\nCategoría: ${doc.categoria}\nTítulo: ${doc.titulo}\nContenido:\n${doc.contenido}\n------------------------`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
