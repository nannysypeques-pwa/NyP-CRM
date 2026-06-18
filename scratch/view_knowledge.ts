import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.documentoConocimiento.findMany({
    where: { estado: 'ACTIVO' }
  });
  console.log("Cantidad de documentos:", docs.length);
  for (const doc of docs) {
    console.log(`======================`);
    console.log(`ID: ${doc.id}`);
    console.log(`Título: ${doc.titulo}`);
    console.log(`Categoría: ${doc.categoria}`);
    console.log(`Contenido:\n${doc.contenido}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
