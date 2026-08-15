import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const phonePart = "9806";
  console.log(`Searching for lead with phone containing ${phonePart}...`);
  const leads = await prisma.lead.findMany({
    where: {
      telefono: {
        contains: phonePart
      }
    },
    include: {
      hijos: true,
      cotizaciones: true,
      conversacion: {
        include: {
          mensajes: {
            orderBy: { creadoEn: "asc" }
          }
        }
      }
    }
  });

  console.log("Found leads count:", leads.length);
  for (const lead of leads) {
    console.log("-----------------------------------------");
    console.log("LEAD DATA:");
    console.log(JSON.stringify({
      id: lead.id,
      nombreCompleto: lead.nombreCompleto,
      telefono: lead.telefono,
      ciudad: lead.ciudad,
      zona: lead.zona,
      interesServicio: lead.interesServicio,
      edadHijo: lead.edadHijo,
      cantidadHijos: lead.cantidadHijos,
      diasSolicitados: lead.diasSolicitados,
      horaInicioSolicitada: lead.horaInicioSolicitada,
      horaFinSolicitada: lead.horaFinSolicitada,
      fechaInicioDeseada: lead.fechaInicioDeseada,
      estado: lead.estado,
      razonContratacion: lead.razonContratacion,
      cotizaciones: lead.cotizaciones,
      hijos: lead.hijos
    }, null, 2));

    console.log("\nCONVERSATION HISTORY:");
    if (lead.conversacion?.mensajes) {
      lead.conversacion.mensajes.forEach(m => {
        console.log(`[${m.creadoEn.toISOString()}] ${m.direccion} (${m.tipoRemitente}): ${m.contenido}`);
      });
    }
  }
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
