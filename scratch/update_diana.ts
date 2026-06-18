import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { telefono: "+522213458308" }
  });
  if (lead) {
    console.log("Antes:", lead.nombreCompleto, "Estado:", lead.estado);
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: { estado: "GANADO" }
    });
    console.log("Después:", updated.nombreCompleto, "Estado:", updated.estado);
  } else {
    console.log("Lead Diana Arely no encontrado.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
