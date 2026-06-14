import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { telefono: "+522224552596" },
    include: { hijos: true }
  });
  console.log("=== DETALLE DEL LEAD ===");
  console.log(JSON.stringify(lead, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
