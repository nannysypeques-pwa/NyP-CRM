const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkIncidentes() {
  const incidentes = await prisma.incidente.findMany({
    orderBy: { creadoEn: "desc" },
    take: 10
  });
  console.log("=== ÚLTIMOS INCIDENTES ===");
  console.log(JSON.stringify(incidentes, null, 2));

  const ultimosMensajes = await prisma.mensaje.findMany({
    orderBy: { creadoEn: "desc" },
    take: 5
  });
  console.log("=== ÚLTIMOS MENSAJES ===");
  console.log(JSON.stringify(ultimosMensajes, null, 2));
}

checkIncidentes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
