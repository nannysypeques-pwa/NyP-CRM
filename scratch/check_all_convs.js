const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const convs = await prisma.conversacion.findMany({
    where: { deleted: false },
    include: { lead: true }
  });
  console.log("=== TODAS LAS CONVERSACIONES ===");
  convs.forEach(c => {
    console.log(`ID: ${c.id}, Phone: ${c.telefono}, Lead Name: ${c.lead?.nombreCompleto}, Lead City: ${c.lead?.ciudad}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
