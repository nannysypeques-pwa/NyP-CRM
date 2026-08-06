const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const failedMsgs = await prisma.mensaje.findMany({
    where: { estado: "FAILED" },
    orderBy: { creadoEn: "desc" },
    take: 10
  });
  console.log("=== MENSAJES FALLIDOS ===");
  console.log(JSON.stringify(failedMsgs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
