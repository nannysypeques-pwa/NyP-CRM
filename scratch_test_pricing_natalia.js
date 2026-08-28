const { PrismaClient } = require('@prisma/client');
const { parseNumDias, parseHoursFromText, calculatePrecotizacion } = require('./src/lib/openai'); // Wait, calculatePrecotizacion is in pricing

// Let's import directly from pricing.ts
const pricing = require('./src/lib/pricing');

async function main() {
  const prisma = new PrismaClient();
  const leadId = "123b2f21-97f1-4c75-b19a-55f8499f2159";
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  
  console.log("LEAD DATA IN DB:");
  console.log("diasSolicitados:", lead.diasSolicitados);
  console.log("horaInicioSolicitada:", lead.horaInicioSolicitada);
  console.log("horaFinSolicitada:", lead.horaFinSolicitada);
  console.log("ciudad:", lead.ciudad);
  
  // Replicating parseNumDias
  const parseNumDiasFn = require('./src/lib/openai').parseNumDias;
  const numDias = parseNumDiasFn(lead.diasSolicitados);
  console.log("\nCalculated numDias:", numDias);

  // Replicating horasDiarias calculation
  let horasDiarias = 0;
  if (lead.horaInicioSolicitada && lead.horaFinSolicitada) {
    try {
      const [h1, m1] = lead.horaInicioSolicitada.split(":").map(Number);
      const [h2, m2] = lead.horaFinSolicitada.split(":").map(Number);
      const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (mins > 0) {
        const hrs = Math.round((mins / 60) * 10) / 10;
        const hrsRounded = Math.ceil(hrs);
        horasDiarias = hrsRounded;
        console.log(`Calculated horasDiarias: ${horasDiarias} (hrs = ${hrs}, mins = ${mins})`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const calculatedPrice = pricing.calculatePrecotizacion(lead.ciudad, numDias, horasDiarias);
  console.log("\nCalculated Price:", calculatedPrice);

  await prisma.$disconnect();
}

main().catch(console.error);
