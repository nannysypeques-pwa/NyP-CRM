import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const convs = await prisma.conversacion.findMany({
    include: { lead: true }
  });
  console.log("=== TODAS LAS CONVERSACIONES ===");
  console.log(JSON.stringify(convs, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
