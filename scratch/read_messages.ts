import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const conv = await prisma.conversacion.findFirst({
    where: { telefono: "+522213458308" },
    include: { mensajes: { orderBy: { creadoEn: 'desc' }, take: 10 } }
  });
  console.log("=== ÚLTIMOS MENSAJES DIANA ARELY ===");
  if (conv) {
    conv.mensajes.reverse().forEach(m => {
      console.log(`[${m.creadoEn.toISOString()}] ${m.direccion} (${m.tipoRemitente}): ${m.contenido}`);
    });
  } else {
    console.log("Conversación no encontrada.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
