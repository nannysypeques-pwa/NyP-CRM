const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const outboundAgentMsgs = await prisma.mensaje.findMany({
    where: {
      direccion: "OUTBOUND",
      tipoRemitente: "AGENT"
    },
    orderBy: { creadoEn: "desc" },
    take: 50
  });

  console.log(`Encontrados ${outboundAgentMsgs.length} mensajes OUTBOUND AGENT recientes.`);
  
  let nullWamidCount = 0;
  let nonNullWamidCount = 0;
  
  for (const m of outboundAgentMsgs) {
    if (m.idMensajeWhatsapp === null) {
      nullWamidCount++;
      console.log(`[NULL WAMID] ID: ${m.id}, Contenido: "${m.contenido}", Creado: ${m.creadoEn.toISOString()}, Respondido a: ${m.idMensajeRespondido}`);
    } else {
      nonNullWamidCount++;
      console.log(`[OK WAMID]   ID: ${m.id}, Contenido: "${m.contenido}", Creado: ${m.creadoEn.toISOString()}, Wamid: ${m.idMensajeWhatsapp}`);
    }
  }
  
  console.log(`Resumen: Con Wamid: ${nonNullWamidCount}, Sin Wamid: ${nullWamidCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
