import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { telefono: { contains: "636" } },
        { telefono: { contains: "5794" } }
      ]
    },
    include: { hijos: true, conversacion: true }
  });
  console.log("=== DETALLE DE LEADS ENCONTRADOS POR TEL ===");
  console.log(JSON.stringify(leads, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
