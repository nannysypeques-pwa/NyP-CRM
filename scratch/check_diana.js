const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const conv = await prisma.conversacion.findFirst({
    where: { lead: { nombreCompleto: "Diana" } },
    include: {
      mensajes: {
        orderBy: { creadoEn: 'asc' }
      }
    }
  });
  if (!conv) {
    console.log("Diana not found!");
    return;
  }
  console.log("Diana Conv ID:", conv.id);
  console.log("Lead Name:", conv.leadId);
  console.log("UltimoMensajeEn:", conv.ultimoMensajeEn);
  console.log("Mensajes:");
  for (const m of conv.mensajes) {
    console.log(`- [${m.direccion}] [${m.tipoRemitente}] creadoEn: ${m.creadoEn.toISOString()} - content: ${m.contenido}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
