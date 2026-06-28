const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const doc = await prisma.documentoConocimiento.findUnique({
    where: { id: "d8b8079d-cd7f-4cab-b8b8-4836de1965b7" }
  });
  
  // Print in chunks to avoid stdout truncation
  const lines = doc.contenido.split("\n");
  for (let i = 0; i < lines.length; i += 50) {
    console.log(lines.slice(i, i + 50).join("\n"));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
