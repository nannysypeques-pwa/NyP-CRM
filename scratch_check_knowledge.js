const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkKnowledgeDocs() {
  const docs = await prisma.documentoConocimiento.findMany();
  console.log("Documentos de conocimiento en DB:");
  docs.forEach(doc => {
    console.log("-----------------------------------------");
    console.log("ID:", doc.id);
    console.log("Título:", doc.titulo);
    console.log("Categoría:", doc.categoria);
    console.log("Contenido:\n", doc.contenido);
  });
}

checkKnowledgeDocs().catch(console.error).finally(() => prisma.$disconnect());
