const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const convId = "a1002764-7380-4e54-9211-bad50d5c98ff";
  const msgs = await prisma.mensaje.findMany({
    where: { idConversacion: convId },
    orderBy: { creadoEn: "desc" },
    take: 10
  });
  console.log("=== RECENT MESSAGES FOR CONV ===");
  console.log(JSON.stringify(msgs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
