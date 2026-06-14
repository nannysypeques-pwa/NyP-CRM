import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const conv = await prisma.conversacion.findFirst({
    where: { telefono: "+522224552596" },
    include: { mensajes: { orderBy: { creadoEn: 'asc' } } }
  });
  console.log("=== ÚLTIMOS MENSAJES ===");
  console.log(JSON.stringify(conv, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
