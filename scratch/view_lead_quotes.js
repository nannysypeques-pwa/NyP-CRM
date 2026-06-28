const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { telefono: { contains: "522223211930" } },
    include: {
      cotizaciones: true,
      conversacion: {
        include: {
          mensajes: {
            orderBy: { creadoEn: "desc" },
            take: 5
          }
        }
      }
    }
  });

  if (!lead) {
    console.log("Lead not found!");
    return;
  }

  console.log("LEAD:", {
    id: lead.id,
    nombre: lead.nombreCompleto,
    ciudad: lead.ciudad,
    diasSolicitados: lead.diasSolicitados,
    horaInicio: lead.horaInicioSolicitada,
    horaFin: lead.horaFinSolicitada,
  });

  console.log("\nCOTIZACIONES:");
  for (const q of lead.cotizaciones) {
    console.log({
      id: q.id,
      total: q.total,
      creadoPor: q.creadoPor,
      creadoEn: q.creadoEn,
      deleted: q.deleted
    });
  }

  console.log("\nRECIENTES MENSAJES:");
  for (const m of lead.conversacion.mensajes) {
    console.log({
      id: m.id,
      direccion: m.direccion,
      contenido: m.contenido.substring(0, 100) + "...",
      urlMultimedia: m.urlMultimedia,
      creadoEn: m.creadoEn
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
