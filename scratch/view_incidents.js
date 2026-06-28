const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const incidents = await prisma.incidente.findMany({
    orderBy: { creadoEn: "desc" },
    take: 10
  });

  console.log("INCIDENTS:");
  for (const inc of incidents) {
    console.log({
      id: inc.id,
      servicio: inc.servicio,
      mensaje: inc.mensaje,
      detalles: inc.detalles,
      creadoEn: inc.creadoEn
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
