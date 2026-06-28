const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const doc = await prisma.documentoConocimiento.findUnique({
    where: { id: "d8b8079d-cd7f-4cab-b8b8-4836de1965b7" }
  });
  const startIdx = doc.contenido.indexOf("TABULADOR PUEBLA");
  const endIdx = doc.contenido.indexOf("TABULADOR XALAPA");
  console.log(doc.contenido.substring(startIdx, endIdx));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
