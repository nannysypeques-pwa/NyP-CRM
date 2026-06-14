import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const incs = await prisma.incidente.findMany({
    orderBy: { creadoEn: 'desc' },
    take: 10
  });
  console.log("=== ÚLTIMOS INCIDENTES ===");
  console.log(JSON.stringify(incs, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
