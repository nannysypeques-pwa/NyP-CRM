const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.documentoConocimiento.findMany();
  for (const doc of docs) {
    console.log(`=========================================`);
    console.log(`ID: ${doc.id}`);
    console.log(`TITULO: ${doc.titulo}`);
    console.log(`CATEGORIA: ${doc.categoria}`);
    console.log(`CONTENT LENGTH: ${doc.contenido.length}`);
    console.log(`CONTENT PREVIEW:`);
    console.log(doc.contenido.substring(0, 1000));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
