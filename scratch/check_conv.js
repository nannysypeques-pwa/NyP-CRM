const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const conv = await prisma.conversacion.findFirst({
    where: { id: "a1002764-7380-4e54-9211-bad50d5c98ff" },
    include: { lead: true }
  });
  console.log("=== CONVERSACIÓN ===");
  console.log(JSON.stringify(conv, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
