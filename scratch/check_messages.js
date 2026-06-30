const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const conversations = await prisma.conversacion.findMany({
    include: {
      lead: true,
      mensajes: {
        orderBy: { creadoEn: 'asc' }
      }
    }
  });
  console.log("Conversations count:", conversations.length);
  for (const c of conversations) {
    console.log("======================================");
    console.log("Telefono:", c.telefono);
    console.log("Lead Name:", c.lead ? c.lead.nombreCompleto : "N/A");
    console.log("UltimoMensajeEn:", c.ultimoMensajeEn);
    console.log("Mensajes:");
    for (const m of c.mensajes) {
      console.log(`- [${m.direccion}] [${m.tipoRemitente}] creadoEn: ${m.creadoEn.toISOString()} - contenido: ${m.contenido.substring(0, 50)}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
