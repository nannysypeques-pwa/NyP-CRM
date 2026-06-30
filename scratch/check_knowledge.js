const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.documentoConocimiento.findMany({});
  const keywords = ["salida", "evento", "viaje", "acompaña", "eventual"];
  console.log("Searching for keywords:", keywords);
  for (const doc of docs) {
    const text = doc.contenido.toLowerCase() + " " + doc.titulo.toLowerCase();
    const found = keywords.filter(kw => text.includes(kw));
    if (found.length > 0) {
      console.log("--------------------------------------");
      console.log("TITULO:", doc.titulo);
      console.log("CATEGORIA:", doc.categoria);
      console.log("MATCHED:", found);
      // find lines with the keywords
      const lines = doc.contenido.split("\n");
      for (const line of lines) {
        if (keywords.some(kw => line.toLowerCase().includes(kw))) {
          console.log("  >", line.trim());
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
