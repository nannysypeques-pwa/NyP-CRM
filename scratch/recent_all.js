const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const msgs = await prisma.mensaje.findMany({
    where: {
      creadoEn: { gte: oneHourAgo }
    },
    orderBy: { creadoEn: "desc" }
  });
  console.log("=== MENSAJES DE LA ÚLTIMA HORA ===");
  console.log(JSON.stringify(msgs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
