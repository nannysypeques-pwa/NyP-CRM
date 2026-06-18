import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const convs = await prisma.conversacion.findMany({
    include: { lead: true }
  });
  console.log("=== RESUMEN DE CONVERSACIONES ===");
  convs.forEach(c => {
    console.log(`Telefono: ${c.telefono} | IA Activa: ${c.iaActiva} | Lead: ${c.lead?.nombreCompleto || 'SIN LEAD'} | Estado: ${c.lead?.estado || 'SIN ESTADO'}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
